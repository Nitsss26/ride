const { Kafka, logLevel } = require("kafkajs")
const { logError } = require("./logger")

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",")
const SERVICE_NAME = "user-service"

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
    console.log("UserService Kafka Producer connected successfully.")
    return true
  } catch (error) {
    console.error("Failed to connect UserService Kafka Producer:", error)
    logError(SERVICE_NAME, error, "Kafka Producer Connection")
    producerConnected = false
    return false
  }
}

async function disconnectKafka() {
  try {
    if (producerConnected) await producer.disconnect()
    producerConnected = false
    console.log("UserService Kafka producer disconnected.")
  } catch (error) {
    console.error("Error disconnecting UserService Kafka producer:", error)
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

// Kafka publishing helper for user events
async function publishUserEvent(eventType, userData) {
  if (!producerConnected) {
    console.warn(`Kafka Producer not connected. Cannot publish user event: ${eventType}`)
    return
  }
  try {
    const producer = getKafkaProducer()
    const topic = "user-events" // Central topic for user-related events
    const message = {
      key: userData.userId.toString(),
      value: JSON.stringify({
        type: eventType,
        timestamp: new Date().toISOString(),
        ...userData,
      }),
    }
    await producer.send({ topic, messages: [message] })
    console.log(`Published ${eventType} event to Kafka topic ${topic} for user ${userData.userId}`)
  } catch (error) {
    logError(SERVICE_NAME, error, `Failed to publish ${eventType} event for user ${userData.userId}`)
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
  publishUserEvent,
}
