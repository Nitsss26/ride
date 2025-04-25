const { createClient } = require('redis');

let redisClient;    // For GEOADD, general commands
let redisPublisher; // Dedicated client for PUBLISH
let isReady = false;
let isPublisherReady = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function connectRedis() {
  if (isReady && redisClient && isPublisherReady && redisPublisher) {
    return true; // Already connected
  }

  // --- Connect Regular Client ---
  if (!redisClient) {
     redisClient = createClient({ url: REDIS_URL });

     redisClient.on('error', (err) => {
       console.error('LocationService Redis Client Error:', err);
       isReady = false;
     });
     redisClient.on('ready', () => {
       console.log('LocationService Redis client is ready');
       isReady = true;
     });
      redisClient.on('end', () => {
        console.log('LocationService Redis client connection closed');
        isReady = false;
        redisClient = null;
      });

     try {
       await redisClient.connect();
     } catch (err) {
       console.error('Failed to connect LocationService Redis client:', err);
       isReady = false;
       redisClient = null;
     }
  }

   // --- Connect Publisher Client ---
  if (!redisPublisher) {
     // Use a separate client instance for publishing if expecting high volume or wanting isolation
     redisPublisher = createClient({ url: REDIS_URL });

     redisPublisher.on('error', (err) => {
       console.error('LocationService Redis Publisher Error:', err);
       isPublisherReady = false;
     });
     redisPublisher.on('ready', () => {
       console.log('LocationService Redis publisher is ready');
       isPublisherReady = true;
     });
      redisPublisher.on('end', () => {
         console.log('LocationService Redis publisher connection closed');
         isPublisherReady = false;
         redisPublisher = null;
       });

     try {
       await redisPublisher.connect();
     } catch (err) {
       console.error('Failed to connect LocationService Redis publisher:', err);
       isPublisherReady = false;
       redisPublisher = null;
     }
   }

  // Return true if both are ready (or adjust based on minimum requirement)
  return isReady && isPublisherReady;
}

function getRedisClient() {
  if (!isReady || !redisClient) {
    console.warn('LocationService Redis client requested but not ready or not connected.');
    return null;
  }
  return redisClient;
}

function getRedisPublisher() {
  if (!isPublisherReady || !redisPublisher) {
     console.warn('LocationService Redis publisher requested but not ready or not connected.');
    return null;
  }
  return redisPublisher;
}

async function disconnectRedis() {
    const disconnectPromises = [];
    if (redisClient && isReady) {
        disconnectPromises.push(redisClient.quit().catch(err => console.error('Error disconnecting Redis client:', err)));
    }
     if (redisPublisher && isPublisherReady) {
         disconnectPromises.push(redisPublisher.quit().catch(err => console.error('Error disconnecting Redis publisher:', err)));
     }

    try {
         await Promise.all(disconnectPromises);
    } finally {
        redisClient = null;
        redisPublisher = null;
        isReady = false;
        isPublisherReady = false;
        console.log("LocationService Redis clients disconnected.");
    }
}

process.on('SIGINT', async () => {
  await disconnectRedis();
  process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnectRedis();
    process.exit(0);
});

module.exports = {
  connectRedis,
  getRedisClient,
  getRedisPublisher, // Export publisher client
  disconnectRedis
};
