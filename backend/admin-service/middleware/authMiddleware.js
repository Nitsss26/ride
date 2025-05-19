const jwt = require("jsonwebtoken")
const AdminUser = require("../models/AdminUser")
const { logError } = require("../logger")

const JWT_SECRET = process.env.JWT_SECRET || "YourSuperSecretKeyForJWT"
const SERVICE_NAME = "admin-service"

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1]

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET)

      // Get admin user from token
      const admin = await AdminUser.findById(decoded.id).select("-password")

      if (!admin) {
        return res.status(401).json({ message: "Not authorized, admin not found" })
      }

      if (!admin.isActive) {
        return res.status(401).json({ message: "Account is disabled" })
      }

      // Set user in request
      req.user = {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        email: admin.email,
      }

      next()
    } catch (error) {
      logError(SERVICE_NAME, error, "Auth Middleware - Token Verification")
      res.status(401).json({ message: "Not authorized, invalid token" })
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token provided" })
  }
}

// Authorize by role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, no user found" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Role ${req.user.role} is not authorized to access this resource`,
      })
    }

    next()
  }
}

module.exports = { protect, authorize }
