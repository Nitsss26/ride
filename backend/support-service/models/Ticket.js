const mongoose = require("mongoose")

const responderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["rider", "driver", "admin", "system"],
    required: true,
  },
})

const responseSchema = new mongoose.Schema({
  responder: {
    type: responderSchema,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

const ticketSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ["rider", "driver"],
    required: true,
  },
  rideId: {
    type: String,
    index: true,
  },
  issueType: {
    type: String,
    enum: ["ride_issue", "payment_dispute", "driver_behavior", "app_bug", "lost_item", "emergency", "other"],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "in-progress", "resolved", "closed"],
    default: "open",
    index: true,
  },
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
  },
  responses: [responseSchema],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
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
ticketSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

// Create indexes for common queries
ticketSchema.index({ createdAt: -1 })
ticketSchema.index({ updatedAt: -1 })
ticketSchema.index({ userId: 1, status: 1 })
ticketSchema.index({ issueType: 1, status: 1 })

module.exports = mongoose.model("Ticket", ticketSchema)
