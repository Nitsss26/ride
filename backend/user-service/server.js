require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const User = require("./models/User")
const { connectKafkaProducer, publishUserEvent } = require("./kafkaClient")
const { logError } = require("./logger")

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

const MONGODB_URI = process.env.USER_SERVICE_MONGODB_URI || "mongodb://localhost:27017/user_service"
const JWT_SECRET = process.env.JWT_SECRET || "YourSuperSecretKeyForJWT"
const SERVICE_NAME = "user-service"

let isKafkaProducerConnected = false

// --- Database Connection ---
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("UserService MongoDB connected"))
  .catch((err) => {
    console.error("UserService MongoDB connection error:", err)
    logError(SERVICE_NAME, err, "MongoDB Connection")
    process.exit(1)
  })

// --- Kafka Connection ---
connectKafkaProducer()
  .then((connected) => {
    isKafkaProducerConnected = connected
    if (connected) console.log("UserService Kafka Producer connected")
    else console.warn("UserService Kafka Producer connection failed. Events will not be published.")
  })
  .catch((err) => logError(SERVICE_NAME, err, "Kafka Producer Connection"))

// --- API Endpoints ---

// Register a new user with phone verification
app.post("/users/register", async (req, res) => {
  const { name, phone } = req.body

  if (!phone || !name) {
    return res.status(400).json({ message: "Name and phone number are required" })
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ phone })
    if (existingUser) {
      return res.status(400).json({ message: "User with this phone number already exists" })
    }

    // Create new user with pending verification status
    const user = new User({
      name,
      phone,
      role: "rider", // Default role is rider
      accountStatus: "pending_verification",
      verificationCode: "654321", // Hardcoded OTP as requested
    })

    await user.save()

    // In a real system, we would send SMS with OTP here
    console.log(`User registered with phone ${phone}. Verification code: 654321`)

    // Publish user_registered event
    publishUserEvent("user_registered", { userId: user._id, phone }).catch((err) =>
      logError(SERVICE_NAME, err, "Kafka Publish user_registered"),
    )

    res.status(201).json({
      message: "User registered successfully. Please verify your phone number.",
      userId: user._id,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "User Registration")
    res.status(500).json({ message: "Failed to register user" })
  }
})

// Verify OTP
app.post("/users/verify-otp", async (req, res) => {
  const { userId, otp } = req.body

  if (!userId || !otp) {
    return res.status(400).json({ message: "User ID and OTP are required" })
  }

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if OTP matches (hardcoded as 654321 per requirements)
    if (otp !== user.verificationCode && otp !== "654321") {
      return res.status(400).json({ message: "Invalid OTP" })
    }

    // Update user status to active
    user.accountStatus = "active"
    user.verificationCode = null // Clear OTP after verification
    user.isVerified = true
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "30d" })

    // Publish user_verified event
    publishUserEvent("user_verified", { userId: user._id }).catch((err) =>
      logError(SERVICE_NAME, err, "Kafka Publish user_verified"),
    )

    res.status(200).json({
      message: "Phone number verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "OTP Verification")
    res.status(500).json({ message: "Failed to verify OTP" })
  }
})

// Complete user profile
app.put("/users/:userId/profile", async (req, res) => {
  const { userId } = req.params
  const { email, address, emergencyContact } = req.body

  try {
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Update profile fields if provided
    if (email) user.email = email
    if (address) user.address = address
    if (emergencyContact) user.emergencyContact = emergencyContact

    // Set profile completion flag if all fields are filled
    if (user.email && user.address && user.emergencyContact) {
      user.isProfileComplete = true
    }

    await user.save()

    // Publish profile_updated event
    publishUserEvent("profile_updated", { userId }).catch((err) =>
      logError(SERVICE_NAME, err, "Kafka Publish profile_updated"),
    )

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        isProfileComplete: user.isProfileComplete,
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Profile Update")
    res.status(500).json({ message: "Failed to update profile" })
  }
})

// Login with phone
app.post("/users/login", async (req, res) => {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" })
  }

  try {
    const user = await User.findOne({ phone })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Generate new OTP for login
    user.verificationCode = "654321" // Hardcoded OTP as requested
    await user.save()

    // In a real system, we would send SMS with OTP here
    console.log(`Login OTP for ${phone}: 654321`)

    res.status(200).json({
      message: "OTP sent to your phone",
      userId: user._id,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "User Login")
    res.status(500).json({ message: "Failed to login" })
  }
})

// Get user by ID
app.get("/users/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-verificationCode")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }
    res.status(200).json(user)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get User")
    res.status(500).json({ message: "Failed to get user" })
  }
})

// Get all users (with optional filters)
app.get("/users", async (req, res) => {
  try {
    const { role, accountStatus, search } = req.query
    const filter = {}

    if (role) filter.role = role
    if (accountStatus) filter.accountStatus = accountStatus
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }

    const users = await User.find(filter).select("-verificationCode")
    res.status(200).json(users)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Users")
    res.status(500).json({ message: "Failed to get users" })
  }
})

// Update user status (for admin use)
app.put("/users/:userId/status", async (req, res) => {
  const { userId } = req.params
  const { accountStatus } = req.body

  if (!accountStatus || !["active", "suspended", "banned"].includes(accountStatus)) {
    return res.status(400).json({ message: "Valid account status is required" })
  }

  try {
    const user = await User.findByIdAndUpdate(userId, { accountStatus }, { new: true })

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Publish status_updated event
    publishUserEvent("status_updated", { userId, accountStatus }).catch((err) =>
      logError(SERVICE_NAME, err, "Kafka Publish status_updated"),
    )

    res.status(200).json({
      message: `User status updated to ${accountStatus}`,
      user,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Update User Status")
    res.status(500).json({ message: "Failed to update user status" })
  }
})

// --- Health Check ---
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    mongo: mongoose.connection.readyState === 1,
    kafkaProducer: isKafkaProducerConnected,
  })
})

// --- Server Start ---
const PORT = process.env.USER_SERVICE_PORT || 3006
app.listen(PORT, () => {
  console.log(`User Service listening on port ${PORT}`)
})
