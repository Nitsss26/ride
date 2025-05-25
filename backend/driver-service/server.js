require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectRedis, getRedisClient } = require('./redisClient');
const { connectKafkaProducer, getKafkaProducer, connectKafkaConsumer, setupDriverServiceConsumer } = require('./kafkaClient');
const Driver = require('./models/Driver');
const { getFetch } = require('./fetchHelper');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
app.use(express.json());
app.use(cors({
  origin: 'http://82.29.164.244:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup for file uploads
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'driver_documents',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => `${req.params.driverId}_${file.fieldname}_${Date.now()}`,
  },
});
const upload = multer({ storage });

const MONGODB_URI = process.env.DRIVER_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/driver_service';
const RIDE_SERVICE_URL = process.env.RIDE_SERVICE_URL || 'http://localhost:3000';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';

let isRedisConnected = false;
let isKafkaProducerConnected = false;
let isKafkaConsumerConnected = false;

// Database Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('DriverService MongoDB connected'))
  .catch(err => console.error('DriverService MongoDB connection error:', err));

// Redis Connection
connectRedis().then(connected => {
    isRedisConnected = connected;
    if (connected) console.log('DriverService Redis connected');
    else console.warn('DriverService Redis connection failed. Location/Status updates might fail.');
}).catch(err => console.error('DriverService Redis connection error:', err));

// Kafka Connection
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

// Helper Functions
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Document Upload Endpoint
app.post('/drivers/:driverId/documents', upload.fields([
  { name: 'license', maxCount: 1 },
  { name: 'insurance', maxCount: 1 },
  { name: 'registration', maxCount: 1 },
  { name: 'profile', maxCount: 1 },
]), async (req, res) => {
  const { driverId } = req.params;
  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const documentUrls = {};
    for (const [key, file] of Object.entries(req.files || {})) {
      documentUrls[key] = {
        url: file[0].path,
        status: 'pending',
        uploadedAt: new Date(),
      };
    }

    driver.documents = { ...driver.documents, ...documentUrls };
    await driver.save();

    // Publish notification to admin service via Kafka
    if (isKafkaProducerConnected) {
      const producer = getKafkaProducer();
      await producer.send({
        topic: 'document-uploaded',
        messages: [{ key: driverId, value: JSON.stringify({ driverId, documents: documentUrls }) }],
      });
      console.log(`Published document-uploaded event for driver ${driverId}`);
    }

    res.status(200).json({ message: 'Documents uploaded successfully', documents: documentUrls });
  } catch (error) {
    console.error(`Error uploading documents for driver ${driverId}:`, error);
    res.status(500).json({ message: 'Failed to upload documents', error: error.message });
  }
});

// Endpoint to find drivers
app.post('/find-drivers', async (req, res) => {
    const { ride } = req.body;
    if (!ride || !ride._id || !ride.pickupLocation?.geo?.coordinates) {
        return res.status(400).json({ message: 'Missing ride details or pickup location coordinates' });
    }
    const rideId = ride._id.toString();
    const [pickupLon, pickupLat] = ride.pickupLocation.geo.coordinates;

    if (!isRedisConnected) {
        console.warn(`Redis not connected. Cannot query driver locations for ride ${rideId}.`);
        return res.status(503).json({ message: 'Location service unavailable (Redis)' });
    }

    const redisClient = getRedisClient();
    try {
        const searchRadiusKm = process.env.DRIVER_SEARCH_RADIUS_KM || 5;
        const nearbyDriversResult = await redisClient.sendCommand([
            'GEORADIUS',
            'driver-locations',
            String(pickupLon),
            String(pickupLat),
            String(searchRadiusKm),
            'km',
            'WITHCOORD',
            'WITHDIST',
            'ASC',
            'COUNT',
            '10'
        ]);

        if (!nearbyDriversResult || nearbyDriversResult.length === 0) {
            console.log(`No drivers found within ${searchRadiusKm}km for ride ${rideId}`);
            await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'No drivers in range' });
            return res.status(404).json({ message: 'No available drivers found nearby' });
        }

        const nearbyDriverIdsWithDistance = nearbyDriversResult.map(result => ({
            driverId: result[0],
            distance: parseFloat(result[1]),
        }));

        const driverIds = nearbyDriverIdsWithDistance.map(d => d.driverId);
        const driversFromDb = await Driver.find({
            _id: { $in: driverIds },
            isOnline: true,
            currentStatus: 'available',
            'documents.license.status': 'approved',
            'documents.insurance.status': 'approved',
            'documents.registration.status': 'approved',
            'documents.profile.status': 'approved'
        }).select('rating vehicle currentStatus');

        const availableDrivers = nearbyDriverIdsWithDistance
            .map(redisDriver => {
                const dbDriver = driversFromDb.find(db => db._id.toString() === redisDriver.driverId);
                if (dbDriver) {
                    return {
                        driverId: redisDriver.driverId,
                        distance: redisDriver.distance,
                        rating: dbDriver.rating,
                        vehicle: dbDriver.vehicle,
                        status: dbDriver.currentStatus
                    };
                }
                return null;
            })
            .filter(driver => driver !== null);

        if (availableDrivers.length === 0) {
            console.log(`No *available* drivers found for ride ${rideId} after DB check.`);
            await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Nearby drivers not available or documents not approved' });
            return res.status(404).json({ message: 'No available drivers found nearby' });
        }

        availableDrivers.sort((a, b) => {
            if (a.distance !== b.distance) {
                return a.distance - b.distance;
            }
            return b.rating - a.rating;
        });

        const batchSize = parseInt(process.env.DRIVER_BATCH_SIZE || '3');
        const driverBatch = availableDrivers.slice(0, batchSize);

        const batchKey = `driver-batch:${rideId}`;
        const batchTTL = parseInt(process.env.DRIVER_BATCH_TTL_SECONDS || '90');
        await redisClient.set(batchKey, JSON.stringify({ drivers: driverBatch, rideDetails: ride }), { EX: batchTTL });

        if (isKafkaProducerConnected) {
            const producer = getKafkaProducer();
            await producer.send({
                topic: 'driver-matches',
                messages: [{ key: rideId, value: JSON.stringify({ rideId: rideId, batch: driverBatch }) }],
            });
            console.log(`Published driver-match event for ride ${rideId}`);
        } else {
            console.warn(`Kafka Producer not connected. Simulating Notification Service call.`);
            try {
                const fetch = await getFetch();
                await fetch(`${NOTIFICATION_SERVICE_URL}/notify/drivers`, {
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
        console.error(`Error finding drivers for ride ${rideId}:`, error);
        res.status(500).json({ message: 'Failed to find drivers' });
        await publishRideUpdate(rideId, { status: 'no_drivers_found', reason: 'Internal search error' });
    }
});

// Update driver status
app.put('/drivers/:driverId/status', async (req, res) => {
    const { driverId } = req.params;
    const { status, rideId } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Missing status' });
    }
    const validStatuses = ['available', 'busy', 'offline', 'en_route_pickup', 'at_pickup', 'on_ride'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status provided' });
    }

    try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        if (status === 'available' && (
            driver.documents?.license?.status !== 'approved' ||
            driver.documents?.insurance?.status !== 'approved' ||
            driver.documents?.registration?.status !== 'approved' ||
            driver.documents?.profile?.status !== 'approved'
        )) {
            return res.status(403).json({ message: 'Cannot go online until all documents are approved' });
        }

        driver.currentStatus = status;
        driver.isOnline = status !== 'offline';
        if (status === 'busy' || status === 'en_route_pickup' || status === 'at_pickup' || status === 'on_ride') {
            driver.currentRideId = rideId || driver.currentRideId;
        } else if (status === 'available' || status === 'offline') {
            driver.currentRideId = null;
        }
        await driver.save();

        if (isRedisConnected) {
            const redisClient = getRedisClient();
            const statusKey = `driver-status:${driverId}`;
            await redisClient.set(statusKey, status);

            if (status === 'offline') {
                await redisClient.zRem('driver-locations', driverId);
                console.log(`Removed offline driver ${driverId} from Redis Geo Set.`);
            } else if (driver.isOnline && driver.lastKnownLocation) {
                const [lon, lat] = driver.lastKnownLocation.coordinates;
                await redisClient.geoAdd('driver-locations', { longitude: lon, latitude: lat, member: driverId });
                console.log(`Updated online driver ${driverId} in Redis Geo Set.`);
            }
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

// Get All Drivers with Pagination and Search
app.get('/drivers', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = '',
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        const searchQuery = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: 'i' } },
                      { email: { $regex: search, $options: 'i' } },
                      { phone: { $regex: search, $options: 'i' } },
                      { 'vehicle.licensePlate': { $regex: search, $options: 'i' } },
                  ],
              }
            : {};

        const sortQuery = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const drivers = await Driver.find(searchQuery)
            .sort(sortQuery)
            .skip(skip)
            .limit(limitNum)
            .select('name email phone vehicle rating currentStatus isOnline lastKnownLocation documents createdAt');

        const total = await Driver.countDocuments(searchQuery);

        res.status(200).json({
            drivers,
            pagination: {
                total,
                totalPages: Math.ceil(total / limitNum),
                currentPage: pageNum,
                limit: limitNum,
            },
        });
    } catch (error) {
        console.error('Failed to fetch drivers:', error);
        res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
    }
});

// Add a new driver
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

// Kafka Publishing Helper
async function publishRideUpdate(rideId, updateData) {
    if (!isKafkaProducerConnected) {
        console.warn(`Kafka Producer not connected. Simulating Ride Service call.`);
        try {
            const fetch = await getFetch();
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
            topic: 'ride-updates',
            messages: [{ key: rideId, value: JSON.stringify({ rideId, ...updateData }) }],
        });
        console.log(`Published ride update event for ride ${rideId}:`, updateData);
    } catch (error) {
        console.error(`Failed to publish ride update for ride ${rideId}:`, error);
    }
}

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        mongo: mongoose.connection.readyState === 1,
        redis: isRedisConnected,
        kafkaProducer: isKafkaProducerConnected,
        kafkaConsumer: isKafkaConsumerConnected
    });
});

// Server Start
const PORT = process.env.DRIVER_SERVICE_PORT || 3001;
app.listen(PORT, () => {
    console.log(`Driver Service listening on port ${PORT}`);
});
