const mongoose = require("mongoose")

const driverDocumentSchema = new mongoose.Schema({
  driverId: {
    type: String,
    required: true,
    index: true,
  },
  documentType: {
    type: String,
    required: true,
    enum: ["license", "insurance", "registration", "profile", "vehicle_photo", "other"],
  },
  documentUrl: {
    type: String,
    required: true,
  },
  expiryDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AdminUser",
  },
  reviewedAt: {
    type: Date,
  },
  reviewNotes: {
    type: String,
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
driverDocumentSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Create indexes for common queries
driverDocumentSchema.index({ driverId: 1, documentType: 1 })
driverDocumentSchema.index({ status: 1 })
driverDocumentSchema.index({ createdAt: -1 })

module.exports = mongoose.model("DriverDocument", driverDocumentSchema)
