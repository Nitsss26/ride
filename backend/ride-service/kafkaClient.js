const { Kafka, logLevel } = require('kafkajs');
const Ride = require('./models/Ride');
const { getFetch } = require('./fetchHelper');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';

const kafka = new Kafka({
  clientId: 'ride-service',
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.WARN, // Adjust log level as needed (ERROR, WARN, INFO, DEBUG)
   retry: {
      initialRetryTime: 300,
      retries: 5
    }
});

const producer = kafka.producer();
let consumer = kafka.consumer({ groupId: 'ride-service-group' }); // Default group

let producerConnected = false;
let consumerConnected = false;

async function connectKafkaProducer() {
  if (producerConnected) return true;
  try {
    await producer.connect();
    producerConnected = true;
    console.log("RideService Kafka Producer connected successfully.");
    return true;
  } catch (error) {
    console.error('Failed to connect RideService Kafka Producer:', error);
    producerConnected = false;
    return false;
  }
}

async function connectKafkaConsumer(groupId = 'ride-service-group') {
 if (consumerConnected) return true;
  // Recreate consumer if groupId changes or not connected
 if (!consumerConnected) {
    // Disconnect previous consumer if exists and connected
    if (consumer && typeof consumer.disconnect === 'function') {
        try { await consumer.disconnect(); } catch (e) { console.warn("Error disconnecting previous consumer:", e.message); }
    }
    // Create a new consumer instance with the specified groupId
    consumer = kafka.consumer({ groupId });
  }


  try {
    await consumer.connect();
    consumerConnected = true;
    console.log(`RideService Kafka Consumer connected successfully (Group ID: ${groupId}).`);
    return true;
  } catch (error) {
    console.error(`Failed to connect RideService Kafka Consumer (Group ID: ${groupId}):`, error);
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
    console.log("RideService Kafka clients disconnected.");
  } catch (error) {
    console.error('Error disconnecting RideService Kafka clients:', error);
  }
}

function getKafkaProducer() {
  if (!producerConnected) {
     console.warn("Kafka Producer requested but not connected.");
    // throw new Error('Kafka producer not connected');
    return null; // Or handle as needed
  }
  return producer;
}

function getKafkaConsumer() {
    if (!consumerConnected) {
       console.warn("Kafka Consumer requested but not connected.");
      // throw new Error('Kafka consumer not connected');
      return null; // Or handle as needed
    }
    return consumer;
}


// --- Consumer Logic ---
async function setupRideServiceConsumer() {
    if (!consumerConnected) {
        console.warn("Cannot setup RideService consumer, Kafka not connected.");
        return;
    }

    try {
        await consumer.subscribe({ topic: 'ride-updates', fromBeginning: false });
        await consumer.subscribe({ topic: 'payment-completed', fromBeginning: false });
        // Add more topics as needed e.g., 'driver-updates'

        console.log("RideService Consumer subscribed to topics: ride-updates, payment-completed");

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                console.log(`RideService received message: Topic=${topic}, Partition=${partition}`);
                const messageKey = message.key?.toString();
                const messageValue = message.value.toString();

                try {
                    const payload = JSON.parse(messageValue);
                    const rideId = messageKey || payload.rideId; // Prefer key, fallback to payload

                    if (!rideId) {
                        console.warn(`Skipping message from topic ${topic}: Missing rideId.`);
                        return;
                    }

                    console.log(`Processing message for rideId: ${rideId} from topic: ${topic}`);

                    let updateData = {};
                    let notificationType = '';
                    let notificationMessage = '';
                    let notifyRider = false;
                    let notifyDriver = false;
                    let targetDriverId = null;

                    switch (topic) {
                        case 'ride-updates':
                            // Messages from Driver Service or Notification Service about ride state
                            if (payload.status) {
                                updateData.status = payload.status;
                                notificationType = `ride_${payload.status}`;
                                notificationMessage = `Ride status updated to ${payload.status}`;
                                notifyRider = true; // Usually notify rider on status change

                                if (payload.status === 'driver_assigned') {
                                    if (payload.driverId) updateData.driverId = payload.driverId;
                                    if (payload.vehicleDetails) updateData.vehicleDetails = payload.vehicleDetails;
                                    notificationMessage = `Driver ${payload.driverId ? payload.driverId.slice(-4) : 'N/A'} is assigned.`;
                                    notifyDriver = true; // Notify assigned driver too
                                    targetDriverId = payload.driverId;
                                } else if (payload.status === 'driver_arrived') {
                                    notificationMessage = 'Your driver has arrived!';
                                    notifyDriver = true; // Notify driver too
                                    targetDriverId = payload.driverId;
                                } else if (payload.status === 'cancelled_by_driver' || payload.status === 'cancelled_by_rider'){
                                    notificationMessage = `Ride has been cancelled.`;
                                    notifyDriver = true;
                                    targetDriverId = payload.driverId;
                                } else if (payload.status === 'timed-out') {
                                     notificationMessage = `Could not find a driver for your ride. Please try again.`;
                                }
                                // Add more specific status handling if needed
                            } else {
                                console.warn(`Received ride-updates message without status for ride ${rideId}`);
                                return; // Skip if no status provided
                            }
                            break;

                        case 'payment-completed':
                            // Message from Payment Service
                            updateData.status = 'completed';
                            if (payload.fare) updateData.fare = payload.fare;
                             notificationType = 'ride_completed';
                             notificationMessage = 'Your ride is complete and payment was successful!';
                             notifyRider = true;
                             notifyDriver = true;
                             targetDriverId = payload.driverId; // Get driverId from payment event
                            break;

                        // Add case 'driver-updates' if needed for specific driver info propagation

                        default:
                            console.log(`Received message from unhandled topic: ${topic}`);
                            return;
                    }

                    // Update the Ride document in MongoDB
                    const updatedRide = await Ride.findByIdAndUpdate(rideId, updateData, { new: true });

                    if (!updatedRide) {
                        console.warn(`Ride ${rideId} not found for update based on topic ${topic}.`);
                        return;
                    }
                    console.log(`Ride ${rideId} updated successfully via Kafka event (${topic}). Status: ${updatedRide.status}`);

                    // Trigger Notifications (Simulated Direct Call)
                    const notificationPayload = {
                         type: notificationType,
                         message: notificationMessage,
                         ride: updatedRide
                     };

                    // Get fetch function from helper
                    const fetch = await getFetch();

                    if (notifyRider && updatedRide.riderId) {
                         try {
                             await fetch(`${NOTIFICATION_SERVICE_URL}/notify/rider/${updatedRide.riderId}`, {
                                 method: 'POST',
                                 headers: { 'Content-Type': 'application/json' },
                                 body: JSON.stringify(notificationPayload),
                             });
                             console.log(`Simulated notification call to rider ${updatedRide.riderId} for ${topic} event`);
                         } catch (fetchError) {
                             console.error(`Error simulating notification call to rider for ${topic} event:`, fetchError.message);
                         }
                     }
                     // Use the correct driver ID for notification
                     const driverToNotify = targetDriverId || updatedRide.driverId;
                     if (notifyDriver && driverToNotify) {
                          try {
                              await fetch(`${NOTIFICATION_SERVICE_URL}/notify/driver/${driverToNotify}`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(notificationPayload),
                              });
                              console.log(`Simulated notification call to driver ${driverToNotify} for ${topic} event`);
                          } catch (fetchError) {
                              console.error(`Error simulating notification call to driver for ${topic} event:`, fetchError.message);
                          }
                      }


                } catch (error) {
                    console.error(`Error processing message from topic ${topic}:`, error);
                    // Optional: Implement dead-letter queue logic here
                }
            },
        });

        console.log("RideService consumer is running and waiting for messages...");

    } catch (error) {
        console.error('Error setting up or running RideService consumer:', error);
        consumerConnected = false; // Mark as not connected on setup error
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
  setupRideServiceConsumer,
  disconnectKafka,
};
