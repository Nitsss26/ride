require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const { connectRedis, getRedisClient, getRedisPublisher } = require('./redisClient'); // Use publisher for pub/sub
const LocationUpdate = require('./models/LocationUpdate'); // Model for batch saving
const Driver = require('./models/Driver'); // Import Driver model for DB updates

const app = express();
app.use(express.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const MONGODB_URI = process.env.LOCATION_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/location_service';
const DRIVER_SERVICE_MONGODB_URI = process.env.DRIVER_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/driver_service'; // For updating Driver model

let isRedisConnected = false;
let locationUpdateBuffer = []; // Buffer for batch DB writes
const BATCH_INTERVAL = process.env.LOCATION_BATCH_INTERVAL_MS || 60000; // Default 1 minute
const BATCH_SIZE = process.env.LOCATION_BATCH_SIZE || 50; // Default 50 updates per batch

// Separate connection for Driver Service DB
let driverServiceDbConnection;

// --- Database Connections ---
// Primary DB for Location Service (storing historical updates)
mongoose.connect(MONGODB_URI)
  .then(() => console.log('LocationService Primary MongoDB connected (for LocationUpdate)'))
  .catch(err => console.error('LocationService Primary MongoDB connection error:', err));

// Secondary connection to Driver Service DB (for updating Driver.lastKnownLocation)
async function connectToDriverServiceDb() {
    try {
        driverServiceDbConnection = await mongoose.createConnection(DRIVER_SERVICE_MONGODB_URI).asPromise();
        console.log('LocationService connected to DriverService MongoDB (for Driver updates)');
        // Get the Driver model using the specific connection
        const DriverModel = driverServiceDbConnection.model('Driver', Driver.schema); // Use existing schema
        module.exports.DriverModel = DriverModel; // Make it available
    } catch (err) {
        console.error('LocationService failed to connect to DriverService MongoDB:', err);
        driverServiceDbConnection = null;
    }
}
connectToDriverServiceDb();


// --- Redis Connection ---
connectRedis().then(connected => {
    isRedisConnected = connected;
    if (connected) console.log('LocationService Redis connected (Client & Publisher)');
    else console.warn('LocationService Redis connection failed. Real-time updates will fail.');
}).catch(err => console.error('LocationService Redis connection error:', err));

// --- WebSocket Handling (Driver Location Updates) ---
wss.on('connection', (ws, req) => {
    // Driver App connects here to send location updates
    // Optional: Authenticate driver connection
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const driverId = urlParams.get('driverId'); // Expect driverId in connection query

    if (!driverId) {
         console.log('Driver WebSocket connection attempt without driverId. Closing.');
         ws.close(1008, "Driver ID is required");
         return;
     }
     console.log(`Driver WebSocket client connected: ${driverId}`);
     // Store ws per driver if needed for direct messages (though usually not needed here)
     // driverSockets.set(driverId, ws);

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'location_update' && data.location) {
                const { latitude, longitude } = data.location;
                 const rideId = data.rideId; // Include rideId if driver is on a ride

                if (latitude == null || longitude == null) {
                     console.warn(`Received invalid location data from driver ${driverId}`);
                     return;
                 }

                console.log(`Received location update from driver ${driverId}: Lat=${latitude}, Lon=${longitude}` + (rideId ? ` Ride=${rideId}` : ''));

                if (!isRedisConnected) {
                    console.warn(`Redis not connected. Cannot process location update for driver ${driverId}.`);
                    // Optionally buffer here if Redis is down, but risk memory issues
                    return;
                }

                const redisClient = getRedisClient();
                const redisPublisher = getRedisPublisher();
                const timestamp = new Date();

                // 1. Immediately update Redis Geo Set (for Driver Service matching)
                try {
                     // GEOADD driver-locations longitude latitude driverId
                     await redisClient.geoAdd('driver-locations', {
                         longitude: longitude,
                         latitude: latitude,
                         member: driverId
                     });
                     // console.log(`Updated driver ${driverId} location in Redis Geo Set.`); // Can be noisy
                } catch (geoError) {
                     console.error(`Error updating Redis Geo Set for driver ${driverId}:`, geoError);
                     // Continue processing other updates
                }


                 // 2. Publish location update to Redis Pub/Sub channel (for Rider App via Notification Service)
                 const pubSubChannel = `driver-location-updates:${driverId}`;
                 const pubSubPayload = JSON.stringify({
                     driverId: driverId,
                     rideId: rideId, // Pass rideId along
                     location: {
                         latitude: latitude,
                         longitude: longitude,
                         timestamp: timestamp.toISOString()
                     }
                 });
                 try {
                    await redisPublisher.publish(pubSubChannel, pubSubPayload);
                    // console.log(`Published location update to Redis channel ${pubSubChannel}`); // Can be noisy
                 } catch (pubError) {
                    console.error(`Error publishing location update to Redis channel ${pubSubChannel}:`, pubError);
                 }


                // 3. Add to buffer for batch DB write (LocationUpdate collection)
                 locationUpdateBuffer.push({
                     driverId: driverId,
                     rideId: rideId,
                     location: {
                         type: 'Point',
                         coordinates: [longitude, latitude]
                     },
                     timestamp: timestamp
                 });

                 // 4. Update Driver model's lastKnownLocation (direct DB update - less frequent might be better)
                  if (driverServiceDbConnection && module.exports.DriverModel) {
                     try {
                         await module.exports.DriverModel.findByIdAndUpdate(driverId, {
                              $set: {
                                   'lastKnownLocation': {
                                        type: 'Point',
                                        coordinates: [longitude, latitude],
                                        timestamp: timestamp
                                    }
                                }
                            }, { timestamps: false }); // Avoid triggering default timestamps here
                        // console.log(`Updated lastKnownLocation in Driver DB for ${driverId}`); // Can be noisy
                     } catch (dbError) {
                          console.error(`Error updating lastKnownLocation in Driver DB for ${driverId}:`, dbError);
                      }
                  } else {
                       console.warn(`DriverService DB connection not available. Cannot update Driver.lastKnownLocation for ${driverId}`);
                  }


                // Optional: Send ack back to driver
                ws.send(JSON.stringify({ type: 'location_ack', timestamp: timestamp.toISOString() }));

            } else if (data.type === 'ping') {
                 ws.send(JSON.stringify({ type: 'pong' }));
             }
            else {
                console.log(`Unknown message type from driver ${driverId}: ${data.type}`);
            }
        } catch (error) {
            console.error(`Failed to parse WebSocket message from driver ${driverId} or handle it:`, error);
            // Avoid sending error back for location updates to not flood driver app
        }
    });

    ws.on('close', () => {
        console.log(`Driver WebSocket client disconnected: ${driverId}`);
        // driverSockets.delete(driverId);
        // Optional: Update driver status to offline if they disconnect unexpectedly?
        // This might require coordination with Driver Service.
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for driver ${driverId}:`, error);
        // driverSockets.delete(driverId);
    });
});

// --- Batch Database Writing ---
async function writeLocationBufferToDb() {
    if (locationUpdateBuffer.length === 0) {
        return; // Nothing to write
    }

    const batchToWrite = [...locationUpdateBuffer]; // Copy buffer
    locationUpdateBuffer = []; // Clear original buffer immediately

    console.log(`Attempting to write ${batchToWrite.length} location updates to DB.`);

    try {
        await LocationUpdate.insertMany(batchToWrite, { ordered: false }); // ordered: false allows partial success
        console.log(`Successfully wrote ${batchToWrite.length} location updates to DB.`);
    } catch (error) {
        console.error('Error writing location batch to DB:', error);
        // Optional: Handle failed writes (e.g., retry, add back to buffer with caution)
        // Be careful not to create an infinite loop or run out of memory.
        // locationUpdateBuffer.unshift(...batchToWrite); // Add back to front (use with caution)
    }
}

// Start the batch writing interval
setInterval(writeLocationBufferToDb, BATCH_INTERVAL);

// Also write if buffer gets large
setInterval(() => {
     if (locationUpdateBuffer.length >= BATCH_SIZE) {
         console.log(`Buffer size limit (${BATCH_SIZE}) reached. Writing batch early.`);
         writeLocationBufferToDb();
     }
 }, 5000); // Check buffer size every 5 seconds


// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        mongoPrimary: mongoose.connection.readyState === 1,
        mongoDriverService: driverServiceDbConnection?.readyState === 1,
        redis: isRedisConnected,
        activeWebSockets: wss.clients.size,
        locationBuffer: locationUpdateBuffer.length
    });
});

// --- Server Start ---
const PORT = process.env.LOCATION_SERVICE_PORT || 3003;
server.listen(PORT, () => {
    console.log(`Location Service (including WebSocket Server) listening on port ${PORT}`);
});
