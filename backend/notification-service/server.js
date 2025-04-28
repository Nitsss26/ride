
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { connectRedis, getRedisClient, getRedisSubscriber } = require('./redisClient');
const { connectKafkaProducer, getKafkaProducer, connectKafkaConsumer, setupNotificationServiceConsumer } = require('./kafkaClient');
const { getFetch } = require('./fetchHelper'); // Import getFetch from fetchHelper.js

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
        monitorRedisKeys();
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
        setupNotificationServiceConsumer({ handleDriverMatch, handleRideUpdate, handlePaymentCompleted });
    } else {
        console.warn('NotificationService Kafka Consumer connection failed. Will not process events.');
    }
}).catch(err => console.error('NotificationService Kafka Consumer connection error:', err));

// --- WebSocket Handling ---
wss.on('connection', (ws, req) => {
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
        // Clean up active offers for this driver
        for (const [rideId, offer] of activeOffers.entries()) {
            if (offer.batch[offer.currentDriverIndex]?.driverId === userId) {
                clearTimeout(offer.timeoutId);
                offer.currentDriverIndex++;
                activeOffers.set(rideId, offer);
                sendOfferToNextDriver(rideId);
            }
        }
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for client ${userId}:`, error);
        clients.delete(userId);
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
            clients.delete(userId);
            return false;
        }
    } else {
        console.log(`Client ${userId} not connected or not open. Cannot send notification.`);
        if (client) clients.delete(userId);
        return false;
    }
}

// --- Kafka Message Handlers ---
async function handleDriverMatch({ rideId, batch }) {
    console.log(`Received driver match batch for ride ${rideId}. Batch size: ${batch.length}`);
    if (!batch || batch.length === 0) {
        console.log(`Empty batch received for ride ${rideId}. No offers to send.`);
        return;
    }

    // Check if the driver is already assigned to another ride
    for (const driverInfo of batch) {
        const driverId = driverInfo.driverId;
        try {
            const fetch = await getFetch(); // Get fetch dynamically
            const response = await fetch(`${DRIVER_SERVICE_URL}/drivers/${driverId}`);
            if (response.ok) {
                const driverData = await response.json();
                if (driverData.currentStatus !== 'available') {
                    console.log(`Driver ${driverId} is not available (status: ${driverData.currentStatus}). Skipping.`);
                    batch.splice(batch.indexOf(driverInfo), 1);
                }
            }
        } catch (error) {
            console.error(`Failed to check driver ${driverId} status:`, error);
        }
    }

    if (batch.length === 0) {
        console.log(`No available drivers in batch for ride ${rideId}. Publishing batch-expired.`);
        publishKafkaEvent('batch-expired', rideId, { rideId: rideId, reason: 'No available drivers' });
        return;
    }

    clearTimeout(activeOffers.get(rideId)?.timeoutId);
    activeOffers.set(rideId, {
        batch: batch,
        currentDriverIndex: 0,
        offerTimeout: parseInt(process.env.DRIVER_OFFER_TIMEOUT_SECONDS || '30'),
        timeoutId: null
    });

    sendOfferToNextDriver(rideId);
}


async function handleRideUpdate({ rideId, status, riderId, driverId }) {
    console.log(`Received ride update via Kafka for ride ${rideId}: Status ${status}`);
    if (status === 'cancelled_by_rider' || status === 'cancelled_by_driver' || status === 'timed-out') {
        const offer = activeOffers.get(rideId);
        if (offer) {
            clearTimeout(offer.timeoutId);
            activeOffers.delete(rideId);
            console.log(`Cleared active offer for ${status} ride ${rideId}`);
        }
        if (status === 'cancelled_by_rider' && driverId) {
            sendNotification(driverId, { type: 'ride_cancelled', rideId, reason: 'Cancelled by rider' });
        } else if (status === 'cancelled_by_driver' && riderId) {
            sendNotification(riderId, { type: 'ride_cancelled', rideId, reason: 'Cancelled by driver' });
       } else if (status === 'timed-out' && riderId) {
            sendNotification(riderId, { type: 'ride_timed_out', rideId, message: 'Could not find a driver in time.' });
        }
    } else if (status === 'driver_assigned' && riderId && driverId) {
        console.log(`Notifying rider ${riderId} about driver ${driverId} assignment for ride ${rideId}`);
        sendNotification(riderId, {
            type: 'driver_assigned',
            rideId: rideId,
            driverId: driverId,
            message: `Driver ${driverId.slice(-4)} is on the way!`,
        });
        subscribeRiderToLocation(riderId, driverId);
    } else if (status === 'driver_arrived' && riderId && driverId) {
        console.log(`Notifying rider ${riderId} that driver ${driverId} has arrived for ride ${rideId}`);
        const simulatedOtp = "123456";
        sendNotification(riderId, {
            type: 'driver_arrived',
            rideId: rideId,
           message: `Your driver has arrived! Share this OTP with the driver: ${simulatedOtp}`,
            otp: simulatedOtp
       });
        sendNotification(driverId, { type: 'arrival_confirmed', rideId });
   } else if (status === 'in-progress' && riderId && driverId) {
        console.log(`Notifying rider ${riderId} and driver ${driverId} that ride ${rideId} is in progress`);
        sendNotification(riderId, { type: 'ride_started', rideId, message: 'Your ride has started!' });
        sendNotification(driverId, { type: 'ride_started', rideId, message: 'Ride is now in progress.' });
    }
}

async function handlePaymentCompleted({ rideId, riderId, driverId, fare }) {
    console.log(`Received payment completion via Kafka for ride ${rideId}`);
    sendNotification(riderId, {
        type: 'ride_completed',
        rideId: rideId,
        message: `Your ride is complete. Thank you! Fare: ${fare?.amount || 'N/A'} ${fare?.currency || ''}`,
        fare: fare
    });
    if (driverId) {
        sendNotification(driverId, {
            type: 'ride_completed',
            rideId: rideId,
            message: `Ride complete. Payment received. You are now available.`,
            fare: fare
        });
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
        activeOffers.delete(rideId);
        publishKafkaEvent('batch-expired', rideId, { rideId: rideId, reason: 'Batch exhausted' });
        return;
    }

    const driverInfo = offer.batch[offer.currentDriverIndex];
    const driverId = driverInfo.driverId;

    console.log(`Sending offer for ride ${rideId} to driver ${driverId} (Index: ${offer.currentDriverIndex})`);

    const offerSent = sendNotification(driverId, {
        type: 'ride_offer',
        rideId: rideId,
        pickupLocation: offer.batch[0]?.rideDetails?.pickupLocation,
        dropoffLocation: offer.batch[0]?.rideDetails?.dropoffLocation,
        estimatedFare: offer.batch[0]?.rideDetails?.fare,
        timeout: offer.offerTimeout
    });

    if (offerSent) {
        offer.timeoutId = setTimeout(() => {
            console.log(`Offer timeout for driver ${driverId} for ride ${rideId}.`);
            handleDriverReject(driverId, rideId, 'Timeout');
        }, offer.offerTimeout * 1000);
        activeOffers.set(rideId, offer);
    } else {
        console.warn(`Failed to send offer to driver ${driverId}. Trying next.`);
        handleDriverReject(driverId, rideId, 'Failed to contact');
    }
}

function handleDriverAccept(driverId, rideId) {
    console.log(`Driver ${driverId} ACCEPTED ride ${rideId}`);
    const offer = activeOffers.get(rideId);

    if (!offer || offer.batch[offer.currentDriverIndex]?.driverId !== driverId) {
        console.warn(`Received acceptance from driver ${driverId} for ride ${rideId}, but no active/matching offer found. Ignoring.`);
        sendNotification(driverId, { type: 'offer_expired', rideId, message: 'Offer already assigned or expired.' });
        return;
    }

    clearTimeout(offer.timeoutId);

    updateDriverStatus(driverId, 'en_route_pickup', rideId);
    const acceptedDriverInfo = offer.batch[offer.currentDriverIndex];
    publishRideUpdate(rideId, {
        status: 'driver_assigned',
        driverId: driverId,
        vehicleDetails: acceptedDriverInfo.vehicle
    });

    sendNotification(driverId, { type: 'offer_accepted', rideId, message: 'Offer accepted. Proceed to pickup.' });
    activeOffers.delete(rideId);
}

function handleDriverReject(driverId, rideId, reason = 'Rejected') {
    console.log(`Driver ${driverId} REJECTED/TIMED OUT ride ${rideId}. Reason: ${reason}`);
    const offer = activeOffers.get(rideId);

    if (!offer) {
        console.warn(`Received rejection/timeout from driver ${driverId} for ride ${rideId}, but no active offer found.`);
        return;
    }

    if (offer.batch[offer.currentDriverIndex]?.driverId === driverId) {
        clearTimeout(offer.timeoutId);
        offer.timeoutId = null;
        offer.currentDriverIndex++;
        activeOffers.set(rideId, offer);
        sendOfferToNextDriver(rideId);
    } else {
        console.warn(`Received rejection from driver ${driverId} but they are not the current driver offered for ride ${rideId}. Ignoring.`);
    }
}

// --- Redis Key Monitoring ---
async function monitorRedisKeys() {
    if (!isRedisConnected) return;
    console.log("Starting Redis key monitoring...");

    try {
        const subscriber = getRedisSubscriber();
        if (!subscriber) {
            console.warn("Redis subscriber client not available for keyspace notifications.");
            setTimeout(pollRedisKeys, 5000);
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
        console.log("Falling back to polling Redis keys due to subscription error.");
        setTimeout(pollRedisKeys, 5000);
    }
}

async function pollRedisKeys() {
    if (!isRedisConnected) {
        console.warn("Polling stopped: Redis not connected.");
        return;
    }
    const redisClient = getRedisClient();
    if (!redisClient) return;

    try {
        const rideTimerKeys = await redisClient.keys('ride-timer:*');
        for (const key of rideTimerKeys) {
            const ttl = await redisClient.ttl(key);
            if (ttl <= 0) {
                const rideId = key.split(':')[1];
                handleRideTimeout(rideId);
                await redisClient.del(key);
            }
        }

        const batchKeys = await redisClient.keys('driver-batch:*');
        for (const key of batchKeys) {
            const ttl = await redisClient.ttl(key);
            if (ttl <= 0) {
                const rideId = key.split(':')[1];
                handleBatchTimeout(rideId);
                await redisClient.del(key);
            }
        }

    } catch (error) {
        console.error("Error polling Redis keys:", error);
    } finally {
        setTimeout(pollRedisKeys, 5000);
    }
}

function handleRideTimeout(rideId) {
    console.log(`Ride timer expired for ride ${rideId}.`);
    const offer = activeOffers.get(rideId);
    if (offer) {
        clearTimeout(offer.timeoutId);
        activeOffers.delete(rideId);
        console.log(`Cleared active offer due to ride timeout for ride ${rideId}`);
    }
    publishRideUpdate(rideId, { status: 'timed-out', reason: '10 minute limit reached' });
}

function handleBatchTimeout(rideId) {
    console.log(`Driver batch TTL expired for ride ${rideId}.`);
    const offer = activeOffers.get(rideId);
    if (offer) {
        console.log(`Batch timed out, but an offer is still active for ride ${rideId}. Allowing driver response timeout to handle.`);
    } else {
        console.log(`No active offer for ride ${rideId} upon batch expiry. Publishing batch-expired event.`);
        publishKafkaEvent('batch-expired', rideId, { rideId: rideId, reason: 'Batch TTL expired' });
    }
}

// --- Location Subscription ---
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
        const riderClient = clients.get(riderId);
        if (!riderClient || riderClient.readyState !== WebSocket.OPEN) {
            console.log(`Rider ${riderId} not connected. Cannot subscribe to location updates.`);
            return;
        }

        if (!riderClient.subscriptions) riderClient.subscriptions = new Set();
        if (riderClient.subscriptions.has(channel)) {
            console.log(`Rider ${riderId} already subscribed to ${channel}`);
            return;
        }

        const messageHandler = (message, msgChannel) => {
            if (msgChannel === channel) {
                try {
                    const locationData = JSON.parse(message);
                    sendNotification(riderId, {
                        type: 'driver_location_update',
                        rideId: locationData.rideId,
                        driverId: driverId,
                        location: locationData.location
                    });
                } catch (e) {
                    console.error(`Error parsing location update for rider ${riderId} from channel ${channel}:`, e);
                }
            }
        };

        await subscriber.subscribe(channel, messageHandler);
        riderClient.subscriptions.add(channel);
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
        const fetch = await getFetch(); // Get fetch dynamically
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
    }
}

async function publishRideUpdate(rideId, updateData) {
    console.log(`Publishing ride update for ${rideId}:`, updateData);
    await publishKafkaEvent('ride-updates', rideId, { rideId, ...updateData });
}

// --- API Endpoints ---
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

app.post('/notify/drivers', (req, res) => {
    const { rideId, batch } = req.body;
    console.log(`Received direct batch notification request for ride ${rideId}`);
    if (!rideId || !batch) {
        return res.status(400).json({ message: 'Missing rideId or batch' });
    }
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
