const { Kafka, logLevel } = require('kafkajs');
const fetch = require('node-fetch');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3001'; // Self-reference for internal calls
const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';


const kafka = new Kafka({
  clientId: 'driver-service',
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.WARN,
   retry: {
      initialRetryTime: 300,
      retries: 5
    }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'driver-service-group' });

let producerConnected = false;
let consumerConnected = false;

async function connectKafkaProducer() {
  if (producerConnected) return true;
  try {
    await producer.connect();
    producerConnected = true;
    console.log("DriverService Kafka Producer connected successfully.");
    return true;
  } catch (error) {
    console.error('Failed to connect DriverService Kafka Producer:', error);
    producerConnected = false;
    return false;
  }
}

async function connectKafkaConsumer(groupId = 'driver-service-group') {
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
    console.log(`DriverService Kafka Consumer connected successfully (Group ID: ${groupId}).`);
    return true;
  } catch (error) {
    console.error(`Failed to connect DriverService Kafka Consumer (Group ID: ${groupId}):`, error);
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
    console.log("DriverService Kafka clients disconnected.");
  } catch (error) {
    console.error('Error disconnecting DriverService Kafka clients:', error);
  }
}

function getKafkaProducer() {
  if (!producerConnected) {
     console.warn("Kafka Producer requested but not connected.");
    // throw new Error('Kafka producer not connected');
     return null;
  }
  return producer;
}

function getKafkaConsumer() {
    if (!consumerConnected) {
       console.warn("Kafka Consumer requested but not connected.");
      // throw new Error('Kafka consumer not connected');
       return null;
    }
    return consumer;
}


// --- Consumer Logic ---
async function setupDriverServiceConsumer() {
    if (!consumerConnected) {
        console.warn("Cannot setup DriverService consumer, Kafka not connected.");
        return;
    }

    try {
        await consumer.subscribe({ topic: 'ride-requests', fromBeginning: false });
        await consumer.subscribe({ topic: 'payment-completed', fromBeginning: false });
        await consumer.subscribe({ topic: 'batch-expired', fromBeginning: false });
        await consumer.subscribe({ topic: 'ride-updates', fromBeginning: false }); // Listen for cancellations/timeouts

        console.log("DriverService Consumer subscribed to topics: ride-requests, payment-completed, batch-expired, ride-updates");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                 console.log(`DriverService received message: Topic=${topic}, Partition=${partition}`);
                 const messageKey = message.key?.toString(); // rideId usually
                 const messageValue = message.value.toString();

                try {
                    const payload = JSON.parse(messageValue);
                    const rideId = messageKey || payload.rideId;

                    if (!rideId && topic !== 'payment-completed') { // payment-completed might use driverId in payload
                        console.warn(`Skipping message from topic ${topic}: Missing rideId/key.`);
                        return;
                    }

                    console.log(`Processing message for rideId: ${rideId || 'N/A'}, driverId: ${payload.driverId || 'N/A'} from topic: ${topic}`);

                    switch (topic) {
                        case 'ride-requests':
                             // Trigger driver matching process internally
                             console.log(`Received ride request event for ${rideId}, initiating driver search.`);
                              try {
                                  // Call the internal /find-drivers endpoint
                                  await fetch(`${DRIVER_SERVICE_URL}/find-drivers`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ ride: payload }), // Pass the full ride object
                                  });
                              } catch (fetchError) {
                                  console.error(`Error calling internal /find-drivers for ride ${rideId}:`, fetchError.message);
                              }
                            break;

                        case 'payment-completed':
                            // Update driver status to available after ride completion
                             const driverId = payload.driverId;
                             if (!driverId) {
                                 console.warn(`Payment completed event missing driverId for ride ${rideId}. Cannot update status.`);
                                 break;
                             }
                            console.log(`Received payment completion for ride ${rideId}, setting driver ${driverId} to available.`);
                            try {
                                // Call internal endpoint to update status
                                await fetch(`${DRIVER_SERVICE_URL}/drivers/${driverId}/status`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'available', rideId: rideId }), // Include rideId for context
                                });
                            } catch (fetchError) {
                                console.error(`Error calling internal status update for driver ${driverId} after payment:`, fetchError.message);
                            }
                            break;

                        case 'batch-expired':
                            // If a batch expires, try to find drivers again (potentially with wider criteria or just retry)
                            console.log(`Driver batch expired for ride ${rideId}. Re-initiating driver search.`);
                            // Fetch latest ride details before retrying
                            try {
                                const rideRes = await fetch(`${RIDE_SERVICE_URL}/rides/${rideId}`);
                                if (rideRes.ok) {
                                     const latestRideDetails = await rideRes.json();
                                     // Only retry if the ride is still in a 'requested' state
                                     if (latestRideDetails.status === 'requested' || latestRideDetails.status === 'no_drivers_found') {
                                         console.log(`Retrying driver search for ride ${rideId} (Status: ${latestRideDetails.status})`);
                                          await fetch(`${DRIVER_SERVICE_URL}/find-drivers`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ ride: latestRideDetails }),
                                          });
                                     } else {
                                          console.log(`Skipping batch-expired retry for ride ${rideId}, status is now ${latestRideDetails.status}.`);
                                     }

                                } else {
                                    console.error(`Failed to fetch latest ride details for ride ${rideId} on batch expiry. Status: ${rideRes.status}`);
                                }
                            } catch (fetchError) {
                                console.error(`Error re-initiating driver search for ride ${rideId} after batch expiry:`, fetchError.message);
                            }
                            break;
                        case 'ride-updates':
                             // Listen specifically for 'timed-out' or 'cancelled_by_rider' to potentially clear driver state if needed
                             if (payload.status === 'timed-out' || payload.status === 'cancelled_by_rider') {
                                 console.log(`Received ride ${payload.status} event for ${rideId}. Checking if assigned driver needs status update.`);
                                 // If a driver was potentially assigned or notified before timeout/cancellation,
                                 // ensure their status is reset if they didn't formally accept/reject.
                                 // This logic might be complex depending on exact state transitions.
                                 // For simplicity, we might rely on the driver explicitly becoming 'available'
                                 // or the Notification Service handling this cleanup.
                                 // Example: Check Redis batch? Check driver's currentRideId?
                                 // const potentialDriverId = payload.driverId; // This might not be set if cancelled early
                                 // if (potentialDriverId) {
                                 //    // Check and potentially reset driver status
                                 // }
                             }
                              break;

                        default:
                            console.log(`DriverService received message from unhandled topic: ${topic}`);
                            break;
                    }
                } catch (error) {
                    console.error(`Error processing message from topic ${topic} in DriverService:`, error);
                    // Optional: Dead-letter queue
                }
            },
        });

        console.log("DriverService consumer is running and waiting for messages...");

    } catch (error) {
        console.error('Error setting up or running DriverService consumer:', error);
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
  setupDriverServiceConsumer,
  disconnectKafka,
};
