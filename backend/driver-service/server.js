require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { connectRedis, getRedisClient } = require('./redisClient');
const { connectKafkaProducer, getKafkaProducer, connectKafkaConsumer, setupDriverServiceConsumer } = require('./kafkaClient');
const Driver = require('./models/Driver');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.DRIVER_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/driver_service';
const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';

let isRedisConnected = false;
let isKafkaProducerConnected = false;
let isKafkaConsumerConnected = false;

// --- Database Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('DriverService MongoDB connected'))
  .catch(err => console.error('DriverService MongoDB connection error:', err));

// --- Redis Connection ---
connectRedis().then(connected => {
    isRedisConnected = connected;
    if (connected) console.log('DriverService Redis connected');
    else console.warn('DriverService Redis connection failed. Location/Status updates might fail.');
}).catch(err => console.error('DriverService Redis connection error:', err));

// --- Kafka Connection ---
connectKafkaProducer().then(connected => {
    isKafkaProducerConnected = connected;
    if(connected) console.log('DriverService Kafka Producer connected');
    else console.warn('DriverService Kafka Producer connection failed. Events will not be published.');
}).catch(err => console.error('DriverService Kafka Producer connection error:', err));

connectKafkaConsumer('driver-service-group').then(connected => {
    isKafkaConsumerConnected = connected;
    if (connected) {
        console.log('DriverService Kafka Consumer connected');
        setupDriverServiceConsumer().catch(err => console.error("Error setting up DriverService consumer:", err));
    } else {
        console.warn('DriverService Kafka Consumer connection failed. Will not process events.');
    }
}).catch(err => console.error('DriverService Kafka Consumer connection error:', err));

// --- Helper Functions ---

// Basic Haversine distance calculation (in kilometers)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// --- API Endpoints ---

// Endpoint called by Ride Service (or triggered by Kafka 'ride-requested' event)
app.post('/find-drivers', async (req, res) => {
    const { ride } = req.body; // Expects the full ride object

    if (!ride || !ride._id || !ride.pickupLocation?.geo?.coordinates) {
        return res.status(400).json({ message: 'Missing ride details or pickup location coordinates' });
    }

    const rideId = ride._id.toString();
    const [pickupLon, pickupLat] = ride.pickupLocation.geo.coordinates;

    console.log(`Finding drivers for ride ${rideId} near [${pickupLon}, ${pickupLat}]`);

    if (!isRedisConnected) {
         console.warn(`Redis not connected. Cannot query driver locations for ride ${rideId}.`);
         // Optionally try DB query as fallback, but it's less efficient for real-time
         // await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Location service unavailable (Redis)' });
         return res.status(503).json({ message: 'Location service unavailable (Redis)' });
    }

    const redisClient = getRedisClient();

    try {
        // 1. Query Redis for nearby available drivers
        // Using GEOSEARCH (Redis 6.2+) - replace with GEORADIUS if using older Redis
         const searchRadiusKm = process.env.DRIVER_SEARCH_RADIUS_KM || 5; // Search within 5km
         // GEOSEARCH driver-locations BYLONLAT pickupLon pickupLat BYRADIUS searchRadiusKm km WITHCOORD WITHDIST ASC COUNT 10
         const nearbyDriversResult = await redisClient.sendCommand([
            'GEOSEARCH',
            'driver-locations', // The key where driver locations are stored (needs to match Location Service)
            'BYLONLAT', `${pickupLon}`, `${pickupLat}`,
            'BYRADIUS', `${searchRadiusKm}`, 'km',
            'WITHCOORD', // Include coordinates
            'WITHDIST', // Include distance
            'ASC', // Order by distance ascending
            'COUNT', '10' // Limit initial search (can be adjusted)
         ]);

         console.log(`Redis GEOSEARCH result for ride ${rideId}:`, nearbyDriversResult);


        if (!nearbyDriversResult || nearbyDriversResult.length === 0) {
            console.log(`No drivers found within ${searchRadiusKm}km for ride ${rideId}`);
            // Optionally publish 'no_drivers_found' status update via Kafka
            await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'No drivers in range' });
            return res.status(404).json({ message: 'No available drivers found nearby' });
        }

        // 2. Filter results to get only driver IDs and distances
         const nearbyDriverIdsWithDistance = nearbyDriversResult.map(result => ({
            driverId: result[0], // Driver ID is the member name
            distance: parseFloat(result[1]), // Distance is the second element
            // Coordinates are in result[2] if needed: [lon, lat]
          }));


        // 3. Fetch driver details (rating, vehicle, status) from MongoDB for the nearby IDs
        const driverIds = nearbyDriverIdsWithDistance.map(d => d.driverId);
        const driversFromDb = await Driver.find({
            _id: { $in: driverIds },
            isOnline: true,
            currentStatus: 'available' // Ensure they are actually available in DB too
        }).select('rating vehicle currentStatus'); // Select necessary fields

        // 4. Combine Redis location data with DB data and filter unavailable drivers
        const availableDrivers = nearbyDriverIdsWithDistance
            .map(redisDriver => {
                const dbDriver = driversFromDb.find(db => db._id.toString() === redisDriver.driverId);
                if (dbDriver) {
                    return {
                        driverId: redisDriver.driverId,
                        distance: redisDriver.distance,
                        rating: dbDriver.rating,
                        vehicle: dbDriver.vehicle, // Include vehicle info
                        status: dbDriver.currentStatus // Should be 'available'
                    };
                }
                return null; // Driver found in Redis but not available in DB (or DB error)
            })
            .filter(driver => driver !== null); // Remove null entries

        if (availableDrivers.length === 0) {
            console.log(`No *available* drivers found for ride ${rideId} after DB check.`);
             await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Nearby drivers not available' });
            return res.status(404).json({ message: 'No available drivers found nearby' });
        }

        // 5. Implement Matching Algorithm (Simple example: sort by distance, then rating)
        availableDrivers.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance; // Closer drivers first
            }
            return b.rating - a.rating; // Higher rating second
        });

        // 6. Create Driver Batch (e.g., top 3-5 drivers)
        const batchSize = parseInt(process.env.DRIVER_BATCH_SIZE || '3');
        const driverBatch = availableDrivers.slice(0, batchSize);

        console.log(`Created batch of ${driverBatch.length} drivers for ride ${rideId}:`, driverBatch.map(d=>d.driverId));

        // 7. Store Batch in Redis with TTL (e.g., 90 seconds)
        const batchKey = `driver-batch:${rideId}`;
        const batchTTL = parseInt(process.env.DRIVER_BATCH_TTL_SECONDS || '90');
        await redisClient.set(batchKey, JSON.stringify({ drivers: driverBatch, rideDetails: ride }), { EX: batchTTL });
        console.log(`Stored driver batch in Redis for ride ${rideId} with TTL ${batchTTL}s`);


        // 8. Publish driver-match event to Kafka (for Notification Service)
        if (isKafkaProducerConnected) {
            const producer = getKafkaProducer();
            await producer.send({
                topic: 'driver-matches',
                messages: [{ key: rideId, value: JSON.stringify({ rideId: rideId, batch: driverBatch }) }],
            });
            console.log(`Published driver-match event for ride ${rideId}`);
        } else {
            console.warn(`Kafka Producer not connected. Cannot publish driver-match event for ${rideId}. Simulating Notification Service call.`);
            // Simulate direct call if Kafka isn't available
             try {
                 await fetch(`${NOTIFICATION_SERVICE_URL}/notify/drivers`, { // Endpoint expects batch
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ rideId: rideId, batch: driverBatch }),
                 });
                 console.log(`Simulated call to Notification Service for ride ${rideId}`);
             } catch (fetchError) {
                 console.error(`Error simulating call to Notification Service for ride ${rideId}:`, fetchError.message);
             }
        }

        res.status(200).json({ message: 'Driver search initiated', batch: driverBatch });

    } catch (error) {
        if (error.message.includes('GEOSEARCH requires Redis 6.2.0')) {
             console.error("Redis version does not support GEOSEARCH. Use GEORADIUS or upgrade Redis.");
             // Implement fallback using GEORADIUS if needed
             res.status(501).json({ message: 'Location search feature requires Redis 6.2+' });
         } else if (error.message.includes('WRONGTYPE')) {
             console.error(`Redis key 'driver-locations' is not a Geo Set. Ensure Location Service is writing correctly.`);
             res.status(500).json({ message: 'Internal location data error.' });
         }
         else {
            console.error(`Error finding drivers for ride ${rideId}:`, error);
            res.status(500).json({ message: 'Failed to find drivers' });
        }
         await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Internal search error' });
    }
});


// Endpoint to update driver status (called internally or via Kafka)
app.put('/drivers/:driverId/status', async (req, res) => {
    const { driverId } = req.params;
    const { status, rideId } = req.body; // e.g., 'available', 'busy', 'offline'

    if (!status) {
        return res.status(400).json({ message: 'Missing status' });
    }
    const validStatuses = ['available', 'busy', 'offline', 'en_route_pickup', 'at_pickup', 'on_ride'];
     if (!validStatuses.includes(status)) {
         return res.status(400).json({ message: 'Invalid status provided' });
     }

    console.log(`Updating status for driver ${driverId} to ${status}` + (rideId ? ` for ride ${rideId}` : ''));

    try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Update status in MongoDB
        driver.currentStatus = status;
        driver.isOnline = status !== 'offline'; // Update online status based on main status
        if (status === 'busy' || status === 'en_route_pickup' || status === 'at_pickup' || status === 'on_ride') {
            driver.currentRideId = rideId || driver.currentRideId; // Assign rideId if provided and status indicates being on a ride
        } else if (status === 'available' || status === 'offline') {
            driver.currentRideId = null; // Clear rideId when available or offline
        }
        await driver.save();

        // Update status in Redis (for quick availability checks)
        if (isRedisConnected) {
            const redisClient = getRedisClient();
            const statusKey = `driver-status:${driverId}`;
             await redisClient.set(statusKey, status); // Store simple status string

             // Also update the Geo Set if driver goes offline/online
             if (status === 'offline') {
                // Remove from Geo Set if they go offline
                await redisClient.zRem('driver-locations', driverId);
                console.log(`Removed offline driver ${driverId} from Redis Geo Set.`);
             } else if (driver.isOnline && driver.lastKnownLocation) {
                // Re-add or update location if they come online and have a location
                const [lon, lat] = driver.lastKnownLocation.coordinates;
                 await redisClient.geoAdd('driver-locations', { longitude: lon, latitude: lat, member: driverId });
                 console.log(`Updated online driver ${driverId} in Redis Geo Set.`);
             }

            console.log(`Driver ${driverId} status updated to ${status} in Redis`);
        } else {
            console.warn(`Redis not connected. Cannot update status for driver ${driverId} in Redis.`);
        }

        res.status(200).json({ message: 'Driver status updated successfully', driver });

    } catch (error) {
        console.error(`Error updating status for driver ${driverId}:`, error);
        res.status(500).json({ message: 'Failed to update driver status' });
    }
});

// Get Driver Details
app.get('/drivers/:driverId', async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }
        res.json(driver);
    } catch (error) {
        console.error('Error getting driver details:', error);
        res.status(500).json({ message: 'Failed to get driver details' });
    }
});

// Add a new driver (for testing/setup)
app.post('/drivers', async (req, res) => {
    try {
        const newDriver = new Driver(req.body);
        await newDriver.save();
        res.status(201).json(newDriver);
    } catch (error) {
        console.error("Error creating driver:", error);
        res.status(400).json({ message: "Failed to create driver", error: error.message });
    }
});


// --- Kafka Publishing Helper ---
async function publishRideUpdate(rideId, updateData) {
    if (!isKafkaProducerConnected) {
        console.warn(`Kafka Producer not connected. Cannot publish ride update for ${rideId}. Simulating Ride Service call.`);
        // Simulate direct call to Ride Service for status update
        try {
             await fetch(`${RIDE_SERVICE_URL}/rides/${rideId}/status`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(updateData),
             });
             console.log(`Simulated call to Ride Service for ride ${rideId} status update:`, updateData);
         } catch (fetchError) {
             console.error(`Error simulating call to Ride Service for ride ${rideId} status update:`, fetchError.message);
         }
        return;
    }
    try {
        const producer = getKafkaProducer();
        await producer.send({
            topic: 'ride-updates', // Topic for Ride Service to consume status updates
            messages: [{ key: rideId, value: JSON.stringify({ rideId, ...updateData }) }],
        });
        console.log(`Published ride update event for ride ${rideId}:`, updateData);
    } catch (error) {
        console.error(`Failed to publish ride update for ride ${rideId}:`, error);
    }
}


// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        mongo: mongoose.connection.readyState === 1,
        redis: isRedisConnected,
        kafkaProducer: isKafkaProducerConnected,
        kafkaConsumer: isKafkaConsumerConnected
     });
});

// --- Server Start ---
const PORT = process.env.DRIVER_SERVICE_PORT || 3001;
app.listen(PORT, () => {
    console.log(`Driver Service listening on port ${PORT}`);
});
