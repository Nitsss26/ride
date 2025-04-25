const { Kafka, logLevel } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'notification-service',
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.WARN,
   retry: {
      initialRetryTime: 300,
      retries: 5
    }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'notification-service-group' });

let producerConnected = false;
let consumerConnected = false;

async function connectKafkaProducer() {
  if (producerConnected) return true;
  try {
    await producer.connect();
    producerConnected = true;
    console.log("NotificationService Kafka Producer connected successfully.");
    return true;
  } catch (error) {
    console.error('Failed to connect NotificationService Kafka Producer:', error);
    producerConnected = false;
    return false;
  }
}

async function connectKafkaConsumer(groupId = 'notification-service-group') {
 if (consumerConnected) return true;
 if (!consumerConnected) {
      if (consumer && typeof consumer.disconnect === 'function') {
          try { await consumer.disconnect(); } catch (e) { console.warn("Error disconnecting previous consumer:", e.message); }
      }
      consumer = kafka.consumer({ groupId });
   }

  try {
    await consumer.connect();
    consumerConnected = true;
    console.log(`NotificationService Kafka Consumer connected successfully (Group ID: ${groupId}).`);
    return true;
  } catch (error) {
    console.error(`Failed to connect NotificationService Kafka Consumer (Group ID: ${groupId}):`, error);
    consumerConnected = false;
    return false;
  }
}

async function disconnectKafka() {
  try {
    if (producerConnected) await producer.disconnect();
    if (consumerConnected) await consumer.disconnect();
    producerConnected = false;
    consumerConnected = false;
    console.log("NotificationService Kafka clients disconnected.");
  } catch (error) {
    console.error('Error disconnecting NotificationService Kafka clients:', error);
  }
}

function getKafkaProducer() {
  if (!producerConnected) {
    console.warn("Kafka Producer requested but not connected.");
    return null;
  }
  return producer;
}

function getKafkaConsumer() {
    if (!consumerConnected) {
       console.warn("Kafka Consumer requested but not connected.");
       return null;
    }
    return consumer;
}


// --- Consumer Logic Setup ---
// Pass handlers from server.js to process messages
async function setupNotificationServiceConsumer(handlers) {
    if (!consumerConnected) {
        console.warn("Cannot setup NotificationService consumer, Kafka not connected.");
        return;
    }
     if (!handlers || typeof handlers.handleDriverMatch !== 'function' || typeof handlers.handleRideUpdate !== 'function' || typeof handlers.handlePaymentCompleted !== 'function') {
          console.error("Missing required message handlers for NotificationService consumer.");
          return;
      }

    const { handleDriverMatch, handleRideUpdate, handlePaymentCompleted } = handlers;

    try {
        await consumer.subscribe({ topic: 'driver-matches', fromBeginning: false });
        await consumer.subscribe({ topic: 'ride-updates', fromBeginning: false }); // Listen for finalized statuses
        await consumer.subscribe({ topic: 'payment-completed', fromBeginning: false }); // Listen for payment success

        console.log("NotificationService Consumer subscribed to topics: driver-matches, ride-updates, payment-completed");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                 console.log(`NotificationService received message: Topic=${topic}, Partition=${partition}`);
                 const messageKey = message.key?.toString();
                 const messageValue = message.value.toString();

                try {
                    const payload = JSON.parse(messageValue);
                    const rideId = messageKey || payload.rideId; // Prefer key

                    console.log(`Processing message for rideId: ${rideId || 'N/A'} from topic: ${topic}`);


                    switch (topic) {
                        case 'driver-matches':
                            if (rideId && payload.batch) {
                                await handleDriverMatch({ rideId, batch: payload.batch });
                            } else {
                                console.warn(`Invalid driver-matches payload for key ${messageKey}`);
                            }
                            break;
                        case 'ride-updates':
                            // Handle updates like assigned, arrived, started, cancelled, timed-out
                             if (rideId && payload.status) {
                                 await handleRideUpdate({
                                     rideId,
                                     status: payload.status,
                                     riderId: payload.riderId,
                                     driverId: payload.driverId,
                                     // Pass other relevant data if needed
                                 });
                             } else {
                                 console.warn(`Invalid ride-updates payload for key ${messageKey}`);
                             }
                            break;
                        case 'payment-completed':
                             if (rideId && payload.riderId) {
                                 await handlePaymentCompleted({
                                     rideId,
                                     riderId: payload.riderId,
                                     driverId: payload.driverId,
                                     fare: payload.fare
                                 });
                             } else {
                                 console.warn(`Invalid payment-completed payload for key ${messageKey}`);
                             }
                            break;

                        default:
                            console.log(`NotificationService received message from unhandled topic: ${topic}`);
                    }
                } catch (error) {
                    console.error(`Error processing message from topic ${topic} in NotificationService:`, error);
                }
            },
        });

        console.log("NotificationService consumer is running and waiting for messages...");

    } catch (error) {
        console.error('Error setting up or running NotificationService consumer:', error);
        consumerConnected = false;
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectKafka();
  process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnectKafka();
    process.exit(0);
});


module.exports = {
  connectKafkaProducer,
  getKafkaProducer,
  connectKafkaConsumer,
  getKafkaConsumer,
  setupNotificationServiceConsumer, // Export the setup function
  disconnectKafka,
};
