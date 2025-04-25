const { createClient } = require('redis');

let redisClient;
let isReady = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function connectRedis() {
  if (isReady && redisClient) {
    return true; // Already connected
  }

  redisClient = createClient({ url: REDIS_URL });

  redisClient.on('error', (err) => {
    console.error('RideService Redis Client Error:', err);
    isReady = false;
    // Optional: Implement reconnection logic if needed
  });

  redisClient.on('ready', () => {
    console.log('RideService Redis client is ready');
    isReady = true;
  });

  redisClient.on('end', () => {
    console.log('RideService Redis client connection closed');
    isReady = false;
    redisClient = null; // Allow for reconnection attempt
  });

  try {
    await redisClient.connect();
    return true;
  } catch (err) {
    console.error('Failed to connect to RideService Redis:', err);
    isReady = false;
    redisClient = null; // Ensure client is null if connection fails
    return false;
  }
}

function getRedisClient() {
  if (!isReady || !redisClient) {
    console.warn('RideService Redis client requested but not ready or not connected.');
    // Optionally throw an error or return null based on desired behavior
    // throw new Error('Redis client not available');
    return null; // Return null if not ready
  }
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient && isReady) {
    try {
      await redisClient.quit();
    } catch (err) {
      console.error('Error disconnecting RideService Redis:', err);
    } finally {
        redisClient = null;
        isReady = false;
    }
  }
}

// Graceful shutdown
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
  disconnectRedis
};
