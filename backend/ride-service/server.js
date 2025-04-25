require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { connectRedis, getRedisClient } = require('./redisClient');
const { connectKafkaProducer, getKafkaProducer, connectKafkaConsumer, setupRideServiceConsumer } = require('./kafkaClient');
const Ride = require('./models/Ride');
const fetch = require('node-fetch'); // Using node-fetch v3

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.RIDE_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/ride_service';
const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';

let isRedisConnected = false;
let isKafkaProducerConnected = false;
let isKafkaConsumerConnected = false;

// --- Database Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('RideService MongoDB connected'))
  .catch(err => console.error('RideService MongoDB connection error:', err));

// --- Redis Connection ---
connectRedis().then(connected => {
    isRedisConnected = connected;
    if (connected) console.log('RideService Redis connected');
    else console.warn('RideService Redis connection failed. Timers will not function.');
}).catch(err => console.error('RideService Redis connection error:', err));

// --- Kafka Connection ---
connectKafkaProducer().then(connected => {
    isKafkaProducerConnected = connected;
    if(connected) console.log('RideService Kafka Producer connected');
    else console.warn('RideService Kafka Producer connection failed. Events will not be published.');
}).catch(err => console.error('RideService Kafka Producer connection error:', err));

connectKafkaConsumer('ride-service-group').then(connected => {
    isKafkaConsumerConnected = connected;
    if (connected) {
        console.log('RideService Kafka Consumer connected');
        setupRideServiceConsumer().catch(err => console.error("Error setting up RideService consumer:", err));
    } else {
        console.warn('RideService Kafka Consumer connection failed. Will not process events.');
    }
}).catch(err => console.error('RideService Kafka Consumer connection error:', err));


// --- API Endpoints ---

// Request a new ride
app.post('/rides', async (req, res) => {
    const { riderId, pickupLocation, dropoffLocation, preferences } = req.body;

    if (!riderId || !pickupLocation || !dropoffLocation) {
        return res.status(400).json({ message: 'Missing required ride details' });
    }

    try {
        const newRide = new Ride({
            riderId,
            pickupLocation,
            dropoffLocation,
            preferences,
            status: 'requested',
        });

        const savedRide = await newRide.save();
        const rideId = savedRide._id.toString();

        // 1. Set 10-minute timer in Redis
        if (isRedisConnected) {
            const redisClient = getRedisClient();
            const timerKey = `ride-timer:${rideId}`;
            await redisClient.set(timerKey, 'active', { EX: 600 }); // 10 minutes expiry
             console.log(`Ride timer set in Redis for ride ${rideId}`);
             // In a real system, Redis would publish a keyevent notification on expiry.
             // We'll simulate this timeout check periodically for demo purposes if Redis isn't fully configured for keyspace events.
             // Or Notification Service can periodically check keys.
        } else {
            console.warn(`Redis not connected. Cannot set timer for ride ${rideId}.`);
        }

        // 2. Publish ride-requested event to Kafka
        if (isKafkaProducerConnected) {
            const producer = getKafkaProducer();
            await producer.send({
                topic: 'ride-requests',
                messages: [{ key: rideId, value: JSON.stringify(savedRide) }],
            });
            console.log(`Published ride-requested event for ride ${rideId}`);
        } else {
            console.warn(`Kafka Producer not connected. Cannot publish ride-requested event for ${rideId}. Simulating Driver Service call.`);
            // Simulate direct call if Kafka isn't available (for basic testing)
            try {
                 await fetch(`${DRIVER_SERVICE_URL}/find-drivers`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ ride: savedRide }),
                 });
                 console.log(`Simulated call to Driver Service for ride ${rideId}`);
            } catch (fetchError) {
                 console.error(`Error simulating call to Driver Service for ride ${rideId}:`, fetchError.message);
            }
        }

        res.status(201).json(savedRide);

    } catch (error) {
        console.error('Error requesting ride:', error);
        res.status(500).json({ message: 'Failed to request ride' });
    }
});

// Get ride status
app.get('/rides/:rideId', async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }
        res.json(ride);
    } catch (error) {
        console.error('Error getting ride status:', error);
        res.status(500).json({ message: 'Failed to get ride status' });
    }
});

// Internal endpoint to update ride status (called by other services via Kafka/direct)
app.put('/rides/:rideId/status', async (req, res) => {
    const { status, driverId, vehicleDetails } = req.body;
    const { rideId } = req.params;

    if (!status) {
        return res.status(400).json({ message: 'Missing status' });
    }

    try {
        const updateData = { status };
        if (driverId) updateData.driverId = driverId;
        if (vehicleDetails) updateData.vehicleDetails = vehicleDetails; // Store vehicle info

        const updatedRide = await Ride.findByIdAndUpdate(rideId, updateData, { new: true });

        if (!updatedRide) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        console.log(`Ride ${rideId} status updated to ${status}`);

        // If driver assigned, potentially remove the timeout timer
        if (status === 'driver-assigned' && isRedisConnected) {
            const redisClient = getRedisClient();
            const timerKey = `ride-timer:${rideId}`;
            const deletedCount = await redisClient.del(timerKey);
            if(deletedCount > 0) console.log(`Removed ride timer for assigned ride ${rideId}`);
        }

        // Notify rider about status change (example using direct call if Kafka fails)
        if (status === 'driver-assigned' || status === 'in-progress' || status === 'completed' || status === 'timed-out' || status === 'cancelled') {
             console.log(`Attempting to notify rider ${updatedRide.riderId} for ride ${rideId} status: ${status}`);
             try {
                // In a real system, Notification Service would handle this via Kafka/WebSockets
                // Simulating a direct call for simplicity
                 await fetch(`${NOTIFICATION_SERVICE_URL}/notify/rider/${updatedRide.riderId}`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({
                        type: `ride_${status}`,
                        message: `Your ride status is now: ${status}`,
                        ride: updatedRide
                     }),
                 });
                 console.log(`Simulated notification call to rider ${updatedRide.riderId} for ride ${rideId}`);
             } catch (fetchError) {
                 console.error(`Error simulating notification call for ride ${rideId}:`, fetchError.message);
             }
         }


        res.json(updatedRide);
    } catch (error) {
        console.error(`Error updating ride ${rideId} status:`, error);
        res.status(500).json({ message: 'Failed to update ride status' });
    }
});

// Endpoint for OTP verification (called by Driver App)
app.post('/rides/:rideId/verify-otp', async (req, res) => {
    const { rideId } = req.params;
    const { otp } = req.body;

    // --- Basic OTP Simulation ---
    // In a real system, OTP would be generated, stored (e.g., Redis with TTL),
    // and sent to the rider. Here, we'll use a simple check.
    const EXPECTED_OTP = "123456"; // Hardcoded for simulation

    console.log(`Received OTP verification request for ride ${rideId} with OTP: ${otp}`);

    try {
        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (ride.status !== 'driver-arrived') {
             return res.status(400).json({ message: 'Ride is not in the correct state for OTP verification.' });
        }

        if (otp === EXPECTED_OTP) {
            // OTP is correct, update ride status to 'in-progress'
            ride.status = 'in-progress';
            await ride.save();

            console.log(`OTP verified for ride ${rideId}. Status updated to in-progress.`);

             // Notify rider and driver
             const notificationPayload = {
                type: 'ride_in_progress',
                message: 'Your ride has started!',
                ride: ride
             };

             // Simulate notification calls
             try {
                 await fetch(`${NOTIFICATION_SERVICE_URL}/notify/rider/${ride.riderId}`, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(notificationPayload),
                 });
                 await fetch(`${NOTIFICATION_SERVICE_URL}/notify/driver/${ride.driverId}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(notificationPayload),
                  });
                 console.log(`Simulated notifications for ride start ${rideId}`);
             } catch (fetchError) {
                 console.error(`Error simulating start notifications for ride ${rideId}:`, fetchError.message);
             }


            res.json({ success: true, message: 'OTP verified, ride started.' });
        } else {
            // OTP is incorrect
            console.log(`Incorrect OTP for ride ${rideId}.`);
            res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
    } catch (error) {
        console.error(`Error verifying OTP for ride ${rideId}:`, error);
        res.status(500).json({ message: 'Failed to verify OTP.' });
    }
});


// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        mongo: mongoose.connection.readyState === 1, // 1 = connected
        redis: isRedisConnected,
        kafkaProducer: isKafkaProducerConnected,
        kafkaConsumer: isKafkaConsumerConnected
    });
});

// --- Server Start ---
const PORT = process.env.RIDE_SERVICE_PORT || 3000;
app.listen(PORT, () => {
    console.log(`Ride Service listening on port ${PORT}`);
});
