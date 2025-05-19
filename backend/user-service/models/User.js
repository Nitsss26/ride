const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allow null/undefined values without enforcing uniqueness
  },
  role: {
    type: String,
    enum: ["rider", "driver", "admin"],
    default: "rider",
  },
  accountStatus: {
    type: String,
    enum: ["pending_verification", "active", "suspended", "banned", "pending_approval"],
    default: "pending_verification",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
    default: null,
  },
  address: {
    type: String,
    trim: true,
  },
  emergencyContact: {
    type: String,
    trim: true,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  // For drivers only
  driverDetails: {
    vehicleInfo: {
      make: String,
      model: String,
      year: Number,
      color: String,
      licensePlate: String,
      type: String, // sedan, suv, etc.
    },
    licenseNumber: String,
    documentsVerified: {
      type: Boolean,
      default: false,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update timestamps on save
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Update timestamps on update
userSchema.pre("findOneAndUpdate", function (next) {
  this.set({ updatedAt: Date.now() })
  next()
})

// Indexes for common queries
userSchema.index({ phone: 1 })
userSchema.index({ role: 1, accountStatus: 1 })
userSchema.index({ email: 1 }, { sparse: true })

module.exports = mongoose.model("User", userSchema)
