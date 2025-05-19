const { Kafka, logLevel } = require("kafkajs")
const { logError } = require("./logger")

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",")
const SERVICE_NAME = "support-service"

const kafka = new Kafka({
  clientId: SERVICE_NAME,
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
})

const producer = kafka.producer()
let producerConnected = false

async function connectKafkaProducer() {
  if (producerConnected) return true
  try {
    await producer.connect()
    producerConnected = true
    console.log("SupportService Kafka Producer connected successfully.")
    return true
  } catch (error) {
    console.error("Failed to connect SupportService Kafka Producer:", error)
    logError(SERVICE_NAME, error, "Kafka Producer Connection")
    producerConnected = false
    return false
  }
}

async function disconnectKafka() {
  try {
    if (producerConnected) await producer.disconnect()
    producerConnected = false
    console.log("SupportService Kafka producer disconnected.")
  } catch (error) {
    console.error("Error disconnecting SupportService Kafka producer:", error)
    logError(SERVICE_NAME, error, "Kafka Disconnect")
  }
}

function getKafkaProducer() {
  if (!producerConnected) {
    console.warn("Kafka Producer requested but not connected.")
    return null
  }
  return producer
}

// Kafka publishing helper for support events
async function publishSupportEvent(eventType, eventData) {
  if (!producerConnected) {
    console.warn(`Kafka Producer not connected. Cannot publish support event: ${eventType}`)
    return
  }
  try {
    const producer = getKafkaProducer()
    const topic = "support-events" // Central topic for support-related events
    const message = {
      key: eventData.ticketId ? eventData.ticketId.toString() : "system",
      value: JSON.stringify({
        type: eventType,
        timestamp: new Date().toISOString(),
        ...eventData,
      }),
    }
    await producer.send({ topic, messages: [message] })
    console.log(`Published ${eventType} event to Kafka topic ${topic} for ticket ${eventData.ticketId}`)
  } catch (error) {
    logError(SERVICE_NAME, error, `Failed to publish ${eventType} event for ticket ${eventData.ticketId}`)
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await disconnectKafka()
  process.exit(0)
})
process.on("SIGTERM", async () => {
  await disconnectKafka()
  process.exit(0)
})

module.exports = {
  connectKafkaProducer,
  getKafkaProducer,
  disconnectKafka,
  publishSupportEvent,
}
