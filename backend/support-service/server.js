require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const { connectKafkaProducer, publishSupportEvent } = require("./kafkaClient")
const Ticket = require("./models/Ticket")
const { logError } = require("./logger")
const { getFetch } = require("./fetchHelper") // Use fetch helper

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

const MONGODB_URI = process.env.SUPPORT_SERVICE_MONGODB_URI || "mongodb://localhost:27017/support_service"
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || "http://localhost:3002"
const SERVICE_NAME = "support-service"

let isKafkaProducerConnected = false

// --- Database Connection ---
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("SupportService MongoDB connected"))
  .catch((err) => {
    console.error("SupportService MongoDB connection error:", err)
    logError(SERVICE_NAME, err, "MongoDB Connection")
    process.exit(1)
  })

// --- Kafka Connection ---
connectKafkaProducer()
  .then((connected) => {
    isKafkaProducerConnected = connected
    if (connected) console.log("SupportService Kafka Producer connected")
    else console.warn("SupportService Kafka Producer connection failed. Events will not be published.")
  })
  .catch((err) => logError(SERVICE_NAME, err, "Kafka Producer Connection"))

// --- Helper Functions ---
async function makeServiceRequest(url, method = "GET", body = null) {
  try {
    const fetch = await getFetch()
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    }
    if (body) {
      options.body = JSON.stringify(body)
    }
    const response = await fetch(url, options)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }))
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || "Unknown error"}`)
    }
    return await response.json()
  } catch (error) {
    logError(SERVICE_NAME, error, `Service Request to ${url}`)
    throw error
  }
}

// --- API Endpoints ---

// Create a new support ticket
app.post("/tickets", async (req, res) => {
  const { userId, userRole, rideId, issueType, description } = req.body

  if (!userId || !userRole || !issueType || !description) {
    return res.status(400).json({ message: "Missing required fields" })
  }

  try {
    const ticket = new Ticket({
      userId,
      userRole,
      rideId,
      issueType,
      description,
      status: "open",
      responses: [],
    })

    await ticket.save()

    // Publish ticket created event
    publishSupportEvent("ticket_created", {
      ticketId: ticket._id,
      userId,
      userRole,
      issueType,
    }).catch((err) => logError(SERVICE_NAME, err, "Kafka Publish ticket_created"))

    // Send notification to user
    try {
      await makeServiceRequest(`${NOTIFICATION_SERVICE_URL}/notifications`, "POST", {
        userId,
        type: "support_ticket_created",
        title: "Support Ticket Created",
        message: `Your support ticket #${ticket._id} has been created and is being reviewed.`,
        data: {
          ticketId: ticket._id,
          issueType,
        },
      })
    } catch (error) {
      console.error("Failed to send notification:", error)
      // Continue even if notification fails
    }

    res.status(201).json({
      message: "Support ticket created successfully",
      ticket,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Create Support Ticket")
    res.status(500).json({ message: "Failed to create support ticket" })
  }
})

// Get all tickets (with optional filters)
app.get("/tickets", async (req, res) => {
  const { userId, userRole, status, issueType, page = 1, limit = 20, sort = "-createdAt" } = req.query

  try {
    const filter = {}
    if (userId) filter.userId = userId
    if (userRole) filter.userRole = userRole
    if (status) filter.status = status
    if (issueType) filter.issueType = issueType

    const options = {
      sort: sort,
      skip: (Number.parseInt(page) - 1) * Number.parseInt(limit),
      limit: Number.parseInt(limit),
    }

    const tickets = await Ticket.find(filter, null, options)
    const total = await Ticket.countDocuments(filter)

    res.status(200).json({
      tickets,
      pagination: {
        total,
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        pages: Math.ceil(total / Number.parseInt(limit)),
      },
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Support Tickets")
    res.status(500).json({ message: "Failed to get support tickets" })
  }
})

// Get ticket count
app.get("/tickets/count", async (req, res) => {
  const { status } = req.query

  try {
    const filter = {}
    if (status) filter.status = status

    const count = await Ticket.countDocuments(filter)
    res.status(200).json({ count })
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Ticket Count")
    res.status(500).json({ message: "Failed to get ticket count" })
  }
})

// Get a specific ticket
app.get("/tickets/:ticketId", async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.ticketId)
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }
    res.status(200).json(ticket)
  } catch (error) {
    logError(SERVICE_NAME, error, "Get Support Ticket")
    res.status(500).json({ message: "Failed to get support ticket" })
  }
})

// Update a ticket (add response or change status)
app.put("/tickets/:ticketId", async (req, res) => {
  const { status, response, adminId, adminName } = req.body

  if (!status || !["open", "in-progress", "resolved", "closed"].includes(status)) {
    return res.status(400).json({ message: "Valid status is required" })
  }

  try {
    const ticket = await Ticket.findById(req.params.ticketId)
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    // Update status
    ticket.status = status
    ticket.updatedAt = new Date()

    // Add response if provided
    if (response) {
      ticket.responses.push({
        responder: {
          id: adminId || "system",
          name: adminName || "System",
          role: adminId ? "admin" : "system",
        },
        message: response,
        createdAt: new Date(),
      })
    }

    await ticket.save()

    // Publish ticket updated event
    publishSupportEvent("ticket_updated", {
      ticketId: ticket._id,
      userId: ticket.userId,
      status,
      adminId: adminId || "system",
    }).catch((err) => logError(SERVICE_NAME, err, "Kafka Publish ticket_updated"))

    // Send notification to user
    try {
      await makeServiceRequest(`${NOTIFICATION_SERVICE_URL}/notifications`, "POST", {
        userId: ticket.userId,
        type: "support_ticket_updated",
        title: `Support Ticket ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message: `Your support ticket #${ticket._id} has been updated to ${status}${
          response ? " with a new response" : ""
        }.`,
        data: {
          ticketId: ticket._id,
          status,
          hasResponse: !!response,
        },
      })
    } catch (error) {
      console.error("Failed to send notification:", error)
      // Continue even if notification fails
    }

    res.status(200).json({
      message: "Support ticket updated successfully",
      ticket,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Update Support Ticket")
    res.status(500).json({ message: "Failed to update support ticket" })
  }
})

// Add user response to a ticket
app.post("/tickets/:ticketId/responses", async (req, res) => {
  const { userId, userName, message } = req.body

  if (!userId || !message) {
    return res.status(400).json({ message: "User ID and message are required" })
  }

  try {
    const ticket = await Ticket.findById(req.params.ticketId)
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" })
    }

    // Verify user owns the ticket
    if (ticket.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to respond to this ticket" })
    }

    // Add response
    ticket.responses.push({
      responder: {
        id: userId,
        name: userName || "User",
        role: ticket.userRole,
      },
      message,
      createdAt: new Date(),
    })

    // If ticket was closed, reopen it
    if (ticket.status === "closed") {
      ticket.status = "open"
    }

    ticket.updatedAt = new Date()
    await ticket.save()

    // Publish ticket response event
    publishSupportEvent("ticket_response_added", {
      ticketId: ticket._id,
      userId,
      userRole: ticket.userRole,
    }).catch((err) => logError(SERVICE_NAME, err, "Kafka Publish ticket_response_added"))

    res.status(200).json({
      message: "Response added successfully",
      ticket,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Add Ticket Response")
    res.status(500).json({ message: "Failed to add response" })
  }
})

// Handle emergency alerts
app.post("/emergency", async (req, res) => {
  const { userId, userRole, rideId, location } = req.body

  if (!userId || !userRole) {
    return res.status(400).json({ message: "User ID and role are required" })
  }

  try {
    // Create emergency ticket
    const ticket = new Ticket({
      userId,
      userRole,
      rideId,
      issueType: "emergency",
      description: "Emergency alert triggered by user",
      status: "open",
      priority: "high",
      responses: [],
      metadata: {
        location,
        emergencyTime: new Date(),
      },
    })

    await ticket.save()

    // Publish emergency event
    publishSupportEvent("emergency_alert", {
      ticketId: ticket._id,
      userId,
      userRole,
      rideId,
      location,
    }).catch((err) => logError(SERVICE_NAME, err, "Kafka Publish emergency_alert"))

    // Send notification to user
    try {
      await makeServiceRequest(`${NOTIFICATION_SERVICE_URL}/notifications`, "POST", {
        userId,
        type: "emergency_received",
        title: "Emergency Alert Received",
        message: "Your emergency alert has been received. Our support team will contact you shortly.",
        data: {
          ticketId: ticket._id,
          rideId,
        },
      })
    } catch (error) {
      console.error("Failed to send notification:", error)
      // Continue even if notification fails
    }

    // TODO: In a real system, we would also notify emergency services and/or send alerts to admins

    res.status(200).json({
      message: "Emergency alert received",
      ticketId: ticket._id,
    })
  } catch (error) {
    logError(SERVICE_NAME, error, "Emergency Alert")
    res.status(500).json({ message: "Failed to process emergency alert" })
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
const PORT = process.env.SUPPORT_SERVICE_PORT || 3007
app.listen(PORT, () => {
  console.log(`Support Service listening on port ${PORT}`)
})
