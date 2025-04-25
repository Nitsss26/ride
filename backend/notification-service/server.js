require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { connectRedis, getRedisClient, getRedisSubscriber } = require('./redisClient');
const { connectKafkaProducer, getKafkaProducer, connectKafkaConsumer, setupNotificationServiceConsumer } = require('./kafkaClient');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://localhost:3000';
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3001';

// Store WebSocket connections (use a Map for better performance)
const clients = new Map(); // key: userId (riderId or driverId), value: WebSocket client

// Store active ride offers and timeouts
const activeOffers = new Map(); // key: rideId, value: { batch: [], currentDriverIndex: 0, timeoutId: null, offerTimeout: 120 }
const rideTimeouts = new Map(); // key: rideId, value: timeoutId (for the overall 10-min ride timer check)

let isRedisConnected = false;
let isKafkaProducerConnected = false;
let isKafkaConsumerConnected = false;

// --- Redis Connection ---
connectRedis().then(connected => {
    isRedisConnected = connected;
    if (connected) {
        console.log('NotificationService Redis connected');
        // Subscribe to driver location updates if needed within Notification Service
        // setupRedisSubscriptions();
        monitorRedisKeys(); // Start monitoring Redis keys
    } else {
        console.warn('NotificationService Redis connection failed. Real-time features may be limited.');
    }
}).catch(err => console.error('NotificationService Redis connection error:', err));


// --- Kafka Connection ---
connectKafkaProducer().then(connected => {
    isKafkaProducerConnected = connected;
    if(connected) console.log('NotificationService Kafka Producer connected');
    else console.warn('NotificationService Kafka Producer connection failed. Critical events might not be published.');
}).catch(err => console.error('NotificationService Kafka Producer connection error:', err));

connectKafkaConsumer('notification-service-group').then(connected => {
    isKafkaConsumerConnected = connected;
    if (connected) {
        console.log('NotificationService Kafka Consumer connected');
        setupNotificationServiceConsumer({ handleDriverMatch, handleRideUpdate, handlePaymentCompleted }); // Pass handlers
    } else {
        console.warn('NotificationService Kafka Consumer connection failed. Will not process events.');
    }
}).catch(err => console.error('NotificationService Kafka Consumer connection error:', err));


// --- WebSocket Handling ---
wss.on('connection', (ws, req) => {
    // Extract userId (riderId or driverId) from connection URL or initial message
    // Example: ws://localhost:3002?userId=rider123
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('userId');

    if (!userId) {
        console.log('WebSocket connection attempt without userId. Closing.');
        ws.close(1008, "User ID is required");
        return;
    }

    console.log(`WebSocket client connected: ${userId}`);
    clients.set(userId, ws);

    ws.send(JSON.stringify({ type: 'connection_ack', message: `Connected as ${userId}` }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`Received WebSocket message from ${userId}:`, data);

            // Handle messages from clients (e.g., driver accepting/rejecting)
            switch (data.type) {
                 case 'driver_accept':
                    handleDriverAccept(userId, data.rideId);
                    break;
                case 'driver_reject':
                    handleDriverReject(userId, data.rideId, data.reason || 'Rejected');
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong' }));
                    break;
                // Add more message types as needed
                default:
                    console.log(`Unknown WebSocket message type from ${userId}: ${data.type}`);
                    ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            }
        } catch (error) {
            console.error(`Failed to parse WebSocket message from ${userId} or handle it:`, error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${userId}`);
        clients.delete(userId);
        // Clean up any offers/timers associated with this driver if they disconnect abruptly
        // This requires tracking which rides a driver might have an offer for.
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${userId}:`, error);
        clients.delete(userId); // Remove on error as well
    });
});

// --- Notification Sending Function ---
function sendNotification(userId, data) {
    const client = clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
        try {
            client.send(JSON.stringify(data));
            console.log(`Sent notification to ${userId}: ${data.type}`);
             return true;
        } catch (error) {
            console.error(`Failed to send notification to ${userId}:`, error);
             clients.delete(userId); // Assume client is broken
             return false;
        }
    } else {
        console.log(`Client ${userId} not connected or not open. Cannot send notification.`);
         if (client) clients.delete(userId); // Clean up stale connection
        return false;
    }
}

// --- Kafka Message Handlers ---

// Handles 'driver-matches' event from Driver Service
async function handleDriverMatch({ rideId, batch }) {
    console.log(`Received driver match batch for ride ${rideId}. Batch size: ${batch.length}`);
    if (!batch || batch.length === 0) {
        console.log(`Empty batch received for ride ${rideId}. No offers to send.`);
        // Potentially notify rider immediately or wait for ride timeout
        // await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Empty match batch' });
        return;
    }

    // Store the batch and start the offer process
    clearTimeout(activeOffers.get(rideId)?.timeoutId); // Clear previous offer timeout if any
    activeOffers.set(rideId, {
        batch: batch,
        currentDriverIndex: 0,
        offerTimeout: parseInt(process.env.DRIVER_OFFER_TIMEOUT_SECONDS || '30'), // Short timeout for driver response
        timeoutId: null
    });

    sendOfferToNextDriver(rideId);
}

// Handles 'ride-updates' from Ride Service (e.g., cancellations, timeouts)
async function handleRideUpdate({ rideId, status, riderId, driverId }) {
     console.log(`Received ride update via Kafka for ride ${rideId}: Status ${status}`);

     // If ride is cancelled or timed out, clear any active offers for it
     if (status === 'cancelled_by_rider' || status === 'cancelled_by_driver' || status === 'timed-out') {
         const offer = activeOffers.get(rideId);
         if (offer) {
             clearTimeout(offer.timeoutId);
             activeOffers.delete(rideId);
             console.log(`Cleared active offer for ${status} ride ${rideId}`);
         }
          // Notify the other party if applicable
          if (status === 'cancelled_by_rider' && driverId) {
               sendNotification(driverId, { type: 'ride_cancelled', rideId, reason: 'Cancelled by rider' });
           } else if (status === 'cancelled_by_driver' && riderId) {
               sendNotification(riderId, { type: 'ride_cancelled', rideId, reason: 'Cancelled by driver' });
           } else if (status === 'timed-out' && riderId) {
               sendNotification(riderId, { type: 'ride_timed_out', rideId, message: 'Could not find a driver in time.' });
           }
     } else if (status === 'driver_assigned' && riderId && driverId) {
          // Notify rider about assignment (Ride Service might also do this, confirm flow)
           console.log(`Notifying rider ${riderId} about driver ${driverId} assignment for ride ${rideId}`);
           sendNotification(riderId, {
                type: 'driver_assigned',
                rideId: rideId,
                driverId: driverId,
                message: `Driver ${driverId.slice(-4)} is on the way!`,
                // Include vehicle details if available in the event payload
            });
            // Start location sharing subscription for the rider
            subscribeRiderToLocation(riderId, driverId);

     } else if (status === 'driver_arrived' && riderId && driverId) {
         console.log(`Notifying rider ${riderId} that driver ${driverId} has arrived for ride ${rideId}`);
         // Send OTP to rider (SIMULATED)
         const simulatedOtp = "123456"; // Replace with real OTP generation/retrieval
          sendNotification(riderId, {
              type: 'driver_arrived',
              rideId: rideId,
              message: `Your driver has arrived! Share this OTP with the driver: ${simulatedOtp}`,
              otp: simulatedOtp // Send OTP
          });
          // Optionally notify driver confirmation of arrival
          sendNotification(driverId, { type: 'arrival_confirmed', rideId });

     } else if (status === 'in-progress' && riderId && driverId) {
         console.log(`Notifying rider ${riderId} and driver ${driverId} that ride ${rideId} is in progress`);
         sendNotification(riderId, { type: 'ride_started', rideId, message: 'Your ride has started!' });
         sendNotification(driverId, { type: 'ride_started', rideId, message: 'Ride is now in progress.' });
     }
}

// Handles 'payment-completed' from Payment Service
async function handlePaymentCompleted({ rideId, riderId, driverId, fare }) {
    console.log(`Received payment completion via Kafka for ride ${rideId}`);
    // Notify both rider and driver
    sendNotification(riderId, {
        type: 'ride_completed',
        rideId: rideId,
        message: `Your ride is complete. Thank you! Fare: ${fare?.amount || 'N/A'} ${fare?.currency || ''}`,
        fare: fare
    });
     if (driverId) { // Driver might have disconnected, check exists
        sendNotification(driverId, {
            type: 'ride_completed',
            rideId: rideId,
            message: `Ride complete. Payment received. You are now available.`,
            fare: fare
        });
        // Unsubscribe rider from driver's location
        unsubscribeRiderFromLocation(riderId, driverId);
    }
}


// --- Driver Offer Logic ---

function sendOfferToNextDriver(rideId) {
    const offer = activeOffers.get(rideId);
    if (!offer) {
        console.log(`No active offer found for ride ${rideId} to send.`);
        return;
    }

    if (offer.currentDriverIndex >= offer.batch.length) {
        console.log(`Batch exhausted for ride ${rideId}.`);
        activeOffers.delete(rideId); // Clean up exhausted offer
        // Publish batch-expired event so Driver Service can create a new one
        publishKafkaEvent('batch-expired', rideId, { rideId: rideId, reason: 'Batch exhausted' });
        return;
    }

    const driverInfo = offer.batch[offer.currentDriverIndex];
    const driverId = driverInfo.driverId;

    console.log(`Sending offer for ride ${rideId} to driver ${driverId} (Index: ${offer.currentDriverIndex})`);

    const offerSent = sendNotification(driverId, {
        type: 'ride_offer',
        rideId: rideId,
        pickupLocation: offer.batch[0]?.rideDetails?.pickupLocation, // Assuming rideDetails are in batch
        dropoffLocation: offer.batch[0]?.rideDetails?.dropoffLocation,
        estimatedFare: offer.batch[0]?.rideDetails?.fare, // Add fare if available
        timeout: offer.offerTimeout
    });

    if (offerSent) {
         // Start timer for this driver's response
         offer.timeoutId = setTimeout(() => {
            console.log(`Offer timeout for driver ${driverId} for ride ${rideId}.`);
            handleDriverReject(driverId, rideId, 'Timeout'); // Treat timeout as rejection
        }, offer.offerTimeout * 1000);
        activeOffers.set(rideId, offer); // Update map with timeoutId
    } else {
         // If sending failed (driver disconnected?), immediately try next driver
         console.warn(`Failed to send offer to driver ${driverId}. Trying next.`);
         handleDriverReject(driverId, rideId, 'Failed to contact');
    }
}

function handleDriverAccept(driverId, rideId) {
    console.log(`Driver ${driverId} ACCEPTED ride ${rideId}`);
    const offer = activeOffers.get(rideId);

    if (!offer || offer.batch[offer.currentDriverIndex]?.driverId !== driverId) {
        console.warn(`Received acceptance from driver ${driverId} for ride ${rideId}, but no active/matching offer found. Ignoring.`);
        // Could be a late response after timeout or another driver accepted.
        // Optionally send a "Too late" message back to the driver.
        sendNotification(driverId, { type: 'offer_expired', rideId, message: 'Offer already assigned or expired.' });
        return;
    }

    // Clear the timeout for this offer
    clearTimeout(offer.timeoutId);

    // 1. Update Driver Status (via Driver Service)
    updateDriverStatus(driverId, 'busy', rideId); // Or 'en_route_pickup'

    // 2. Update Ride Status (via Ride Service)
    const acceptedDriverInfo = offer.batch[offer.currentDriverIndex];
    publishRideUpdate(rideId, {
         status: 'driver_assigned',
         driverId: driverId,
         vehicleDetails: acceptedDriverInfo.vehicle // Send vehicle details
     });

    // 3. Notify the accepting driver (confirmation)
    sendNotification(driverId, { type: 'offer_accepted', rideId, message: 'Offer accepted. Proceed to pickup.' });

    // 4. Clean up the active offer for this ride
    activeOffers.delete(rideId);

    // 5. (Handled by Kafka handler) Notify the rider via Ride Service update event
    // 6. (Handled by Kafka handler) Start location subscription for rider
}

function handleDriverReject(driverId, rideId, reason = 'Rejected') {
    console.log(`Driver ${driverId} REJECTED/TIMED OUT ride ${rideId}. Reason: ${reason}`);
    const offer = activeOffers.get(rideId);

    if (!offer) {
        // Offer might have been accepted by someone else or timed out already
        console.warn(`Received rejection/timeout from driver ${driverId} for ride ${rideId}, but no active offer found.`);
        return;
    }

     // Check if the rejection is from the currently offered driver
     if (offer.batch[offer.currentDriverIndex]?.driverId === driverId) {
        // Clear the specific driver's timeout
        clearTimeout(offer.timeoutId);
        offer.timeoutId = null; // Reset timeout ID

        // Move to the next driver in the batch
        offer.currentDriverIndex++;
        activeOffers.set(rideId, offer); // Update the index in the map
        sendOfferToNextDriver(rideId); // Send offer to the next one
     } else {
         console.warn(`Received rejection from driver ${driverId} but they are not the current driver offered for ride ${rideId}. Ignoring.`);
     }
}

// --- Redis Key Monitoring (for ride timers and batch expirations) ---
async function monitorRedisKeys() {
    if (!isRedisConnected) return;
    console.log("Starting Redis key monitoring...");

    // Method 1: Using Keyspace Notifications (Requires Redis config: `notify-keyspace-events Ex`)
    // This is the preferred, event-driven method.
    try {
        const subscriber = getRedisSubscriber(); // Use the dedicated subscriber client
        if (!subscriber) {
             console.warn("Redis subscriber client not available for keyspace notifications.");
              // Fallback to polling if subscriber failed
             setTimeout(pollRedisKeys, 5000); // Poll every 5 seconds
             return;
         }

        await subscriber.subscribe('__keyevent@0__:expired', (message, channel) => {
             console.log(`Redis Keyspace Event: ${channel} -> Key: ${message}`);
             if (message.startsWith('ride-timer:')) {
                 const rideId = message.split(':')[1];
                 handleRideTimeout(rideId);
             } else if (message.startsWith('driver-batch:')) {
                 const rideId = message.split(':')[1];
                 handleBatchTimeout(rideId);
             }
         });
         console.log("Subscribed to Redis keyspace expired events.");

    } catch (error) {
        console.error("Error subscribing to Redis keyspace events:", error);
        // Fallback to polling if subscription fails
        console.log("Falling back to polling Redis keys due to subscription error.");
        setTimeout(pollRedisKeys, 5000); // Poll every 5 seconds
    }

    // Method 2: Polling (Fallback if Keyspace Notifications aren't enabled/working)
    // This is less efficient.
    // setTimeout(pollRedisKeys, 5000); // Start polling
}

// Fallback Polling Function (Less efficient)
async function pollRedisKeys() {
     if (!isRedisConnected) {
         console.warn("Polling stopped: Redis not connected.");
         return;
     };
     const redisClient = getRedisClient();
     if (!redisClient) return;

     try {
         // Check for expired ride timers (approximate)
         const rideTimerKeys = await redisClient.keys('ride-timer:*');
         for (const key of rideTimerKeys) {
             const ttl = await redisClient.ttl(key);
             if (ttl <= 0) { // Key expired or doesn't exist anymore
                 const rideId = key.split(':')[1];
                 // Double check if ride is still in a state needing timeout
                 handleRideTimeout(rideId);
                 await redisClient.del(key); // Clean up just in case
             }
         }

         // Check for expired batches (approximate)
         const batchKeys = await redisClient.keys('driver-batch:*');
         for (const key of batchKeys) {
             const ttl = await redisClient.ttl(key);
             if (ttl <= 0) {
                 const rideId = key.split(':')[1];
                 handleBatchTimeout(rideId);
                 await redisClient.del(key); // Clean up
             }
         }

     } catch (error) {
         console.error("Error polling Redis keys:", error);
     } finally {
         // Schedule next poll
         setTimeout(pollRedisKeys, 5000); // Poll again in 5 seconds
     }
}


function handleRideTimeout(rideId) {
    console.log(`Ride timer expired for ride ${rideId}.`);
    // Check if an offer is still active (shouldn't be if timeout occurred)
    const offer = activeOffers.get(rideId);
    if (offer) {
        clearTimeout(offer.timeoutId);
        activeOffers.delete(rideId);
        console.log(`Cleared active offer due to ride timeout for ride ${rideId}`);
    }
    // Publish ride-timeout event
     publishRideUpdate(rideId, { status: 'timed-out', reason: '10 minute limit reached' });
     // Ride Service will consume this and update DB, potentially notify rider
}

function handleBatchTimeout(rideId) {
    console.log(`Driver batch TTL expired for ride ${rideId}.`);
    // Check if an offer for THIS batch is still active (e.g. driver hasn't responded yet)
    const offer = activeOffers.get(rideId);
    if (offer) {
        console.log(`Batch timed out, but an offer is still active for ride ${rideId}. Allowing driver response timeout to handle.`);
        // Let the driver_reject timeout handle the progression to the next driver or batch expiry event
    } else {
         // If no offer is active (meaning all drivers in batch rejected/timed out),
         // trigger the Driver Service to create a new batch.
         console.log(`No active offer for ride ${rideId} upon batch expiry. Publishing batch-expired event.`);
         publishKafkaEvent('batch-expired', rideId, { rideId: rideId, reason: 'Batch TTL expired' });
    }
}


// --- Location Subscription --- (Using Redis Pub/Sub)
async function subscribeRiderToLocation(riderId, driverId) {
    if (!isRedisConnected) {
        console.warn(`Cannot subscribe rider ${riderId} to location updates: Redis not connected.`);
        return;
    }
    const subscriber = getRedisSubscriber();
    if (!subscriber) {
        console.warn(`Cannot subscribe rider ${riderId}: Redis subscriber not available.`);
        return;
    }

    const channel = `driver-location-updates:${driverId}`;
    try {
        // Check if rider's WebSocket client exists
        const riderClient = clients.get(riderId);
        if (!riderClient || riderClient.readyState !== WebSocket.OPEN) {
            console.log(`Rider ${riderId} not connected. Cannot subscribe to location updates.`);
            return;
        }

         // Store subscription info on the WebSocket object or a separate map
         if (!riderClient.subscriptions) riderClient.subscriptions = new Set();
         if (riderClient.subscriptions.has(channel)) {
             console.log(`Rider ${riderId} already subscribed to ${channel}`);
             return; // Already subscribed
         }


        // Define message handler specific to this subscription
         const messageHandler = (message, msgChannel) => {
              if (msgChannel === channel) {
                  try {
                      const locationData = JSON.parse(message);
                      // Send location update to the specific rider client
                      sendNotification(riderId, {
                          type: 'driver_location_update',
                          rideId: locationData.rideId, // Assuming LocationService includes rideId
                          driverId: driverId,
                          location: locationData.location // { latitude, longitude, timestamp }
                      });
                  } catch (e) {
                      console.error(`Error parsing location update for rider ${riderId} from channel ${channel}:`, e);
                  }
              }
          };

         // Subscribe using psubscribe or subscribe
         await subscriber.subscribe(channel, messageHandler);
         riderClient.subscriptions.add(channel); // Track subscription

        console.log(`Rider ${riderId} subscribed to location updates for driver ${driverId} on channel ${channel}`);

    } catch (error) {
        console.error(`Error subscribing rider ${riderId} to channel ${channel}:`, error);
    }
}

async function unsubscribeRiderFromLocation(riderId, driverId) {
     if (!isRedisConnected) return;
     const subscriber = getRedisSubscriber();
     if (!subscriber) return;

     const channel = `driver-location-updates:${driverId}`;
     const riderClient = clients.get(riderId);

     try {
          await subscriber.unsubscribe(channel);
          if (riderClient && riderClient.subscriptions) {
              riderClient.subscriptions.delete(channel);
          }
         console.log(`Rider ${riderId} unsubscribed from location updates for driver ${driverId} on channel ${channel}`);
     } catch (error) {
         console.error(`Error unsubscribing rider ${riderId} from channel ${channel}:`, error);
     }
}

// --- Helper Functions for Cross-Service Communication ---

async function publishKafkaEvent(topic, key, data) {
    if (!isKafkaProducerConnected) {
        console.warn(`Kafka Producer not connected. Cannot publish ${topic} event for key ${key}.`);
        // No fallback here, as these are internal coordination events
        return;
    }
    try {
        const producer = getKafkaProducer();
        await producer.send({
            topic: topic,
            messages: [{ key: key, value: JSON.stringify(data) }],
        });
        console.log(`Published ${topic} event for key ${key}:`, data);
    } catch (error) {
        console.error(`Failed to publish ${topic} event for key ${key}:`, error);
    }
}

async function updateDriverStatus(driverId, status, rideId = null) {
    console.log(`Requesting status update for driver ${driverId} to ${status}` + (rideId ? ` (Ride: ${rideId})` : ''));
    try {
        const response = await fetch(`${DRIVER_SERVICE_URL}/drivers/${driverId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, rideId }),
        });
        if (!response.ok) {
            throw new Error(`Driver Service returned status ${response.status}`);
        }
        console.log(`Successfully requested status update for driver ${driverId}`);
    } catch (error) {
        console.error(`Error updating driver ${driverId} status via Driver Service:`, error.message);
        // Decide how to handle failure - retry? Log?
    }
}

async function publishRideUpdate(rideId, updateData) {
    // This could publish to Kafka 'ride-updates' or call Ride Service directly
    console.log(`Publishing ride update for ${rideId}:`, updateData);
    // Prefer Kafka
     await publishKafkaEvent('ride-updates', rideId, { rideId, ...updateData });

    // Fallback direct call (less ideal)
    /*
    try {
        const response = await fetch(`${RIDE_SERVICE_URL}/rides/${rideId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData),
        });
        if (!response.ok) {
            throw new Error(`Ride Service returned status ${response.status}`);
        }
        console.log(`Successfully published ride update for ${rideId} via Ride Service`);
    } catch (error) {
        console.error(`Error publishing ride update for ${rideId} via Ride Service:`, error.message);
    }
    */
}


// --- API Endpoints (for direct notification simulation/testing) ---
app.post('/notify/rider/:riderId', (req, res) => {
    const { riderId } = req.params;
    const notificationData = req.body;
    console.log(`Received direct notification request for rider ${riderId}`);
    const success = sendNotification(riderId, notificationData);
    if (success) {
        res.status(200).json({ message: 'Notification sent' });
    } else {
        res.status(404).json({ message: 'Rider not connected' });
    }
});

app.post('/notify/driver/:driverId', (req, res) => {
    const { driverId } = req.params;
    const notificationData = req.body;
     console.log(`Received direct notification request for driver ${driverId}`);
    const success = sendNotification(driverId, notificationData);
    if (success) {
        res.status(200).json({ message: 'Notification sent' });
    } else {
        res.status(404).json({ message: 'Driver not connected' });
    }
});

// Endpoint to simulate receiving a batch (for testing without Kafka)
app.post('/notify/drivers', (req, res) => {
     const { rideId, batch } = req.body;
     console.log(`Received direct batch notification request for ride ${rideId}`);
     if (!rideId || !batch) {
         return res.status(400).json({ message: 'Missing rideId or batch' });
     }
     // Manually call the handler function
     handleDriverMatch({ rideId, batch });
     res.status(200).json({ message: 'Batch processing initiated' });
 });


// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        redis: isRedisConnected,
        kafkaProducer: isKafkaProducerConnected,
        kafkaConsumer: isKafkaConsumerConnected,
        activeWebSockets: clients.size
    });
});

// --- Server Start ---
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3002;
server.listen(PORT, () => {
    console.log(`Notification Service (including WebSocket Server) listening on port ${PORT}`);
});
