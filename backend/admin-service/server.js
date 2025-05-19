require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { connectKafkaProducer, publishAdminActionEvent } = require("./kafkaClient")
const { protect, authorize } = require("./middleware/authMiddleware")
const AdminUser = require("./models/AdminUser")
const DriverDocument = require("./models/DriverDocument") // For document management
const { logError } = require("./logger")
const { getFetch } = require("./fetchHelper") // Use fetch helper

const app = express()

// Middleware
app.use(cors()) // Enable CORS for all origins (adjust for production)
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const MONGODB_URI = process.env.ADMIN_SERVICE_MONGODB_URI || "mongodb://localhost:27017/admin_service"
const JWT_SECRET = process.env.JWT_SECRET || "YourSuperSecretKeyForJWT"
const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || "http://localhost:3000"
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://localhost:3001"
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3006"
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://localhost:3004"
const SUPPORT_SERVICE_URL = process.env.SUPPORT_SERVICE_URL || "http://localhost:3007"
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:3008"
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3002"

let isKafkaProducerConnected = false
const SERVICE_NAME = "admin-service"

// --- Database Connection ---
mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("AdminService MongoDB connected")
    // Ensure default admin user exists on startup
    await ensureDefaultAdmin()
  })
  .catch((err) => {
    console.error("AdminService MongoDB connection error:", err)
    logError(SERVICE_NAME, err, "MongoDB Connection")
    process.exit(1)
  })

// --- Kafka Connection ---
connectKafkaProducer()
  .then((connected) => {
    isKafkaProducerConnected = connected
    if (connected) console.log("AdminService Kafka Producer connected")
    else console.warn("AdminService Kafka Producer connection failed. Events will not be published.")
  })
  .catch((err) => logError(SERVICE_NAME, err, "Kafka Producer Connection"))

// --- Helper Functions ---
async function ensureDefaultAdmin() {
  const defaultUsername = process.env.ADMIN_DEFAULT_USER || "admin"
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "password"

  try {
    const existingAdmin = await AdminUser.findOne({ username: defaultUsername })
    if (!existingAdmin) {
      const admin = new AdminUser({
        username: defaultUsername,
        password: defaultPassword, // Hashing is done by pre-save hook
        role: "superadmin", // Default admin is superadmin
        name: "Default Admin",
        isActive: true,
      })
      await admin.save()
      console.log(`Default admin user '${defaultUsername}' created.`)
    } else {
      // console.log(`Default admin user '${defaultUsername}' already exists.`);
    }
  } catch (error) {
    logError(SERVICE_NAME, error, "Ensure Default Admin User")
    console.error("Error ensuring default admin user:", error)
  }
}

async function makeServiceRequest(url, method = "GET", body = null, token = null) {
  try {
    const fetch = await getFetch()
    const headers = { "Content-Type": "application/json" }
    if (token) {
      headers["Authorization"] = `Bearer ${token}` // Forward token if needed
    }
    const options = { method, headers }
    if (body) {
      options.body = JSON.stringify(body)
    }
    const response = await fetch(url, options)
    const data = await response.json() // Attempt to parse JSON regardless of status
    if (!response.ok) {
      const error = new Error(data.message || `Request to ${url} failed with status ${response.status}`)
      error.status = response.status
      error.data = data
      throw error
    }
    return data
  } catch (error) {
    logError(SERVICE_NAME, error, `Service Request to ${url}`)
    // Rethrow the error so the caller can handle it
    throw error
  }
}

// --- Admin Authentication Routes ---
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ message: "Please provide username and password" })
  }

  try {
    // Find admin user by username
    const admin = await AdminUser.findOne({ username })

    if (!admin) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(401).json({ message: "Account is disabled. Please contact super admin." })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }

    // Generate JWT token
    const token = jwt.sign({ id: admin._id, username: admin.username, role: admin.role }, JWT_SECRET, {
      expiresIn: "1d",
    })

    // Log login event
    publishAdminActionEvent("admin_login", { adminId: admin._id, username: admin.username })

    res.status(200).json({
      token,
      user: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        email: admin.email,
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Admin Login")
    res.status(500).json({ message: "Server error during login" })
  }
})

// Create new admin user (superadmin only)
app.post("/admins", protect, authorize("superadmin"), async (req, res) => {
  const { username, password, name, email, role } = req.body

  if (!username || !password || !name || !role) {
    return res.status(400).json({ message: "Please provide all required fields" })
  }

  try {
    // Check if username already exists
    const existingAdmin = await AdminUser.findOne({ username })
    if (existingAdmin) {
      return res.status(400).json({ message: "Username already exists" })
    }

    // Create new admin user
    const admin = new AdminUser({
      username,
      password, // Will be hashed by pre-save hook
      name,
      email,
      role: role || "admin", // Default to admin if not specified
      isActive: true,
    })

    await admin.save()

    // Log admin creation event
    publishAdminActionEvent("admin_created", {
      adminId: admin._id,
      username: admin.username,
      createdBy: req.user.id,
    })

    res.status(201).json({
      message: "Admin user created successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        email: admin.email,
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Create Admin User")
    res.status(500).json({ message: "Server error creating admin user" })
  }
})

// Get all admin users (superadmin only)
app.get("/admins", protect, authorize("superadmin"), async (req, res) => {
  try {
    const admins = await AdminUser.find().select("-password")
    res.status(200).json(admins)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Admin Users")
    res.status(500).json({ message: "Server error fetching admin users" })
  }
})

// Update admin user (superadmin or self)
app.put("/admins/:id", protect, async (req, res) => {
  const { id } = req.params
  const { name, email, role, isActive, password } = req.body

  try {
    const admin = await AdminUser.findById(id)

    if (!admin) {
      return res.status(404).json({ message: "Admin user not found" })
    }

    // Only superadmin can update other admins' roles or active status
    // Regular admins can only update their own name and email
    if (req.user.role !== "superadmin" && req.user.id !== id) {
      return res.status(403).json({ message: "Not authorized to update this admin user" })
    }

    // Update fields
    if (name) admin.name = name
    if (email) admin.email = email

    // Only superadmin can update these fields
    if (req.user.role === "superadmin") {
      if (role) admin.role = role
      if (isActive !== undefined) admin.isActive = isActive
    }

    // Update password if provided
    if (password) {
      admin.password = password // Will be hashed by pre-save hook
    }

    await admin.save()

    // Log admin update event
    publishAdminActionEvent("admin_updated", {
      adminId: admin._id,
      updatedBy: req.user.id,
    })

    res.status(200).json({
      message: "Admin user updated successfully",
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        email: admin.email,
        isActive: admin.isActive,
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Update Admin User")
    res.status(500).json({ message: "Server error updating admin user" })
  }
})

// --- Driver Document Management Routes ---

// Get all pending driver documents
app.get("/drivers/documents/pending", protect, async (req, res) => {
  try {
    const pendingDocuments = await DriverDocument.find({ status: "pending" }).sort({ createdAt: -1 })

    res.status(200).json(pendingDocuments)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Pending Driver Documents")
    res.status(500).json({ message: "Server error fetching pending documents" })
  }
})

// Get documents for a specific driver
app.get("/drivers/:driverId/documents", protect, async (req, res) => {
  const { driverId } = req.params

  try {
    const documents = await DriverDocument.find({ driverId }).sort({ createdAt: -1 })

    res.status(200).json(documents)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Driver Documents")
    res.status(500).json({ message: "Server error fetching driver documents" })
  }
})

// Add a document for a driver
app.post("/drivers/:driverId/documents", protect, async (req, res) => {
  const { driverId } = req.params
  const { documentType, documentUrl, expiryDate } = req.body

  if (!documentType || !documentUrl) {
    return res.status(400).json({ message: "Please provide document type and URL" })
  }

  try {
    const document = new DriverDocument({
      driverId,
      documentType,
      documentUrl,
      expiryDate,
      status: "pending",
      reviewedBy: null,
      reviewNotes: null,
    })

    await document.save()

    res.status(201).json({
      message: "Document added successfully",
      document,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Add Driver Document")
    res.status(500).json({ message: "Server error adding driver document" })
  }
})

// Approve or reject a driver document
app.put("/drivers/documents/:documentId", protect, async (req, res) => {
  const { documentId } = req.params
  const { status, reviewNotes } = req.body

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Please provide valid status (approved or rejected)" })
  }

  try {
    const document = await DriverDocument.findById(documentId)

    if (!document) {
      return res.status(404).json({ message: "Document not found" })
    }

    // Update document status
    document.status = status
    document.reviewedBy = req.user.id
    document.reviewedAt = new Date()
    document.reviewNotes = reviewNotes || null

    await document.save()

    // If all documents are approved, update user status to active
    if (status === "approved") {
      const allDocuments = await DriverDocument.find({ driverId: document.driverId })
      const allApproved = allDocuments.every((doc) => doc.status === "approved")

      if (allApproved) {
        // Update user status to active
        try {
          await makeServiceRequest(`${USER_SERVICE_URL}/users/${document.driverId}/status`, "PUT", {
            accountStatus: "active",
          })

          // Send notification to driver
          await makeServiceRequest(`${NOTIFICATION_SERVICE_URL}/notifications`, "POST", {
            userId: document.driverId,
            type: "driver_approved",
            title: "Account Approved",
            message: "Your driver account has been approved! You can now go online and start accepting rides.",
            data: {},
          })

          // Log driver approval event
          publishAdminActionEvent("driver_approved", {
            driverId: document.driverId,
            approvedBy: req.user.id,
          })
        } catch (error) {
          console.error("Error updating user status:", error)
          // Continue with document approval even if user status update fails
        }
      }
    } else if (status === "rejected") {
      // Send notification to driver about rejected document
      try {
        await makeServiceRequest(`${NOTIFICATION_SERVICE_URL}/notifications`, "POST", {
          userId: document.driverId,
          type: "driver_doc_rejected",
          title: "Document Rejected",
          message: `Your ${document.documentType} was rejected. Reason: ${reviewNotes || "Not specified"}`,
          data: {
            documentType: document.documentType,
            reason: reviewNotes || "Not specified",
          },
        })

        // Log document rejection event
        publishAdminActionEvent("driver_doc_rejected", {
          driverId: document.driverId,
          documentType: document.documentType,
          rejectedBy: req.user.id,
          reason: reviewNotes,
        })
      } catch (error) {
        console.error("Error sending notification:", error)
        // Continue with document rejection even if notification fails
      }
    }

    res.status(200).json({
      message: `Document ${status}`,
      document,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Update Driver Document Status")
    res.status(500).json({ message: "Server error updating document status" })
  }
})

// --- User Management Routes ---

// Get all users with pagination and filters
app.get("/users", protect, async (req, res) => {
  const { role, status, search, page = 1, limit = 20 } = req.query

  try {
    // Build filter object for user service
    const filter = {}
    if (role) filter.role = role
    if (status) filter.accountStatus = status
    if (search) filter.search = search

    // Make request to user service
    const users = await makeServiceRequest(
      `${USER_SERVICE_URL}/users?${new URLSearchParams({
        ...filter,
        page,
        limit,
      }).toString()}`,
    )

    res.status(200).json(users)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Users")
    res.status(500).json({ message: "Server error fetching users" })
  }
})

// Get user details
app.get("/users/:userId", protect, async (req, res) => {
  const { userId } = req.params

  try {
    const user = await makeServiceRequest(`${USER_SERVICE_URL}/users/${userId}`)
    res.status(200).json(user)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get User Details")
    res.status(500).json({ message: "Server error fetching user details" })
  }
})

// Update user status (active, suspended, banned)
app.put("/users/:userId/status", protect, async (req, res) => {
  const { userId } = req.params
  const { accountStatus } = req.body

  if (!accountStatus || !["active", "suspended", "banned"].includes(accountStatus)) {
    return res.status(400).json({ message: "Please provide valid account status" })
  }

  try {
    const result = await makeServiceRequest(`${USER_SERVICE_URL}/users/${userId}/status`, "PUT", { accountStatus })

    // Log user status update event
    publishAdminActionEvent("user_status_updated", {
      userId,
      status: accountStatus,
      updatedBy: req.user.id,
    })

    res.status(200).json(result)
  } catch (error) {
    logError(SERVICE_NAME, error, "Update User Status")
    res.status(500).json({ message: "Server error updating user status" })
  }
})

// --- Ride Management Routes ---

// Get all rides with pagination and filters
app.get("/rides", protect, async (req, res) => {
  const { status, driverId, riderId, fromDate, toDate, page = 1, limit = 20 } = req.query

  try {
    // Build filter object for ride service
    const filter = {}
    if (status) filter.status = status
    if (driverId) filter.driverId = driverId
    if (riderId) filter.riderId = riderId
    if (fromDate) filter.fromDate = fromDate
    if (toDate) filter.toDate = toDate

    // Make request to ride service
    const rides = await makeServiceRequest(
      `${RIDE_SERVICE_URL}/rides?${new URLSearchParams({
        ...filter,
        page,
        limit,
      }).toString()}`,
    )

    res.status(200).json(rides)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Rides")
    res.status(500).json({ message: "Server error fetching rides" })
  }
})

// Get ride details
app.get("/rides/:rideId", protect, async (req, res) => {
  const { rideId } = req.params

  try {
    const ride = await makeServiceRequest(`${RIDE_SERVICE_URL}/rides/${rideId}`)
    res.status(200).json(ride)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Ride Details")
    res.status(500).json({ message: "Server error fetching ride details" })
  }
})

// --- Support Ticket Management Routes ---

// Get all support tickets with pagination and filters
app.get("/support/tickets", protect, async (req, res) => {
  const { status, userId, issueType, page = 1, limit = 20 } = req.query

  try {
    // Build filter object for support service
    const filter = {}
    if (status) filter.status = status
    if (userId) filter.userId = userId
    if (issueType) filter.issueType = issueType

    // Make request to support service
    const tickets = await makeServiceRequest(
      `${SUPPORT_SERVICE_URL}/tickets?${new URLSearchParams({
        ...filter,
        page,
        limit,
      }).toString()}`,
    )

    res.status(200).json(tickets)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Support Tickets")
    res.status(500).json({ message: "Server error fetching support tickets" })
  }
})

// Get ticket details
app.get("/support/tickets/:ticketId", protect, async (req, res) => {
  const { ticketId } = req.params

  try {
    const ticket = await makeServiceRequest(`${SUPPORT_SERVICE_URL}/tickets/${ticketId}`)
    res.status(200).json(ticket)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Ticket Details")
    res.status(500).json({ message: "Server error fetching ticket details" })
  }
})

// Update ticket status and add response
app.put("/support/tickets/:ticketId", protect, async (req, res) => {
  const { ticketId } = req.params
  const { status, response } = req.body

  if (!status || !["in-progress", "resolved", "closed"].includes(status)) {
    return res.status(400).json({ message: "Please provide valid ticket status" })
  }

  try {
    const result = await makeServiceRequest(`${SUPPORT_SERVICE_URL}/tickets/${ticketId}`, "PUT", {
      status,
      response,
      adminId: req.user.id,
      adminName: req.user.name || req.user.username,
    })

    // Log ticket update event
    publishAdminActionEvent("support_ticket_updated", {
      ticketId,
      status,
      updatedBy: req.user.id,
    })

    res.status(200).json(result)
  } catch (error) {
    logError(SERVICE_NAME, error, "Update Support Ticket")
    res.status(500).json({ message: "Server error updating support ticket" })
  }
})

// --- Dashboard and Analytics Routes ---

// Get system overview stats
app.get("/dashboard/overview", protect, async (req, res) => {
  try {
    // Get counts from various services
    const [users, drivers, rides, activeDrivers, pendingDrivers, supportTickets] = await Promise.allSettled([
      makeServiceRequest(`${USER_SERVICE_URL}/users/count?role=rider`),
      makeServiceRequest(`${USER_SERVICE_URL}/users/count?role=driver`),
      makeServiceRequest(`${RIDE_SERVICE_URL}/rides/count`),
      makeServiceRequest(`${DRIVER_SERVICE_URL}/drivers/count?status=online`),
      makeServiceRequest(`${USER_SERVICE_URL}/users/count?role=driver&accountStatus=pending_approval`),
      makeServiceRequest(`${SUPPORT_SERVICE_URL}/tickets/count?status=open`),
    ])

    // Compile stats
    const stats = {
      totalUsers: users.status === "fulfilled" ? users.value.count : 0,
      totalDrivers: drivers.status === "fulfilled" ? drivers.value.count : 0,
      totalRides: rides.status === "fulfilled" ? rides.value.count : 0,
      activeDrivers: activeDrivers.status === "fulfilled" ? activeDrivers.value.count : 0,
      pendingDriverApprovals: pendingDrivers.status === "fulfilled" ? pendingDrivers.value.count : 0,
      openSupportTickets: supportTickets.status === "fulfilled" ? supportTickets.value.count : 0,
    }

    res.status(200).json(stats)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Dashboard Overview")
    res.status(500).json({ message: "Server error fetching dashboard overview" })
  }
})

// Get recent activities for dashboard
app.get("/dashboard/recent-activity", protect, async (req, res) => {
  try {
    // Get recent data from various services
    const [recentRides, recentUsers, recentTickets] = await Promise.allSettled([
      makeServiceRequest(`${RIDE_SERVICE_URL}/rides?limit=5&sort=-createdAt`),
      makeServiceRequest(`${USER_SERVICE_URL}/users?limit=5&sort=-createdAt`),
      makeServiceRequest(`${SUPPORT_SERVICE_URL}/tickets?limit=5&sort=-createdAt`),
    ])

    // Compile recent activity
    const recentActivity = {
      rides: recentRides.status === "fulfilled" ? recentRides.value : [],
      users: recentUsers.status === "fulfilled" ? recentUsers.value : [],
      supportTickets: recentTickets.status === "fulfilled" ? recentTickets.value : [],
    }

    res.status(200).json(recentActivity)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Recent Activity")
    res.status(500).json({ message: "Server error fetching recent activity" })
  }
})

// Get revenue stats
app.get("/dashboard/revenue", protect, async (req, res) => {
  const { period = "week" } = req.query // day, week, month, year

  try {
    const revenueData = await makeServiceRequest(`${PAYMENT_SERVICE_URL}/analytics/revenue?period=${period}`)

    res.status(200).json(revenueData)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Revenue Stats")
    res.status(500).json({ message: "Server error fetching revenue stats" })
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
const PORT = process.env.ADMIN_SERVICE_PORT || 3009
app.listen(PORT, () => {
  console.log(`Admin Service listening on port ${PORT}`)
})
