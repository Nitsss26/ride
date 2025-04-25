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
    console.error('DriverService Redis Client Error:', err);
    isReady = false;
  });

  redisClient.on('ready', () => {
    console.log('DriverService Redis client is ready');
    isReady = true;
  });

   redisClient.on('end', () => {
    console.log('DriverService Redis client connection closed');
    isReady = false;
    redisClient = null;
  });

  try {
    await redisClient.connect();
    return true;
  } catch (err) {
    console.error('Failed to connect to DriverService Redis:', err);
    isReady = false;
     redisClient = null;
    return false;
  }
}

function getRedisClient() {
  if (!isReady || !redisClient) {
     console.warn('DriverService Redis client requested but not ready or not connected.');
    // throw new Error('Redis client not available');
     return null;
  }
  return redisClient;
}

async function disconnectRedis() {
  if (redisClient && isReady) {
     try {
       await redisClient.quit();
     } catch (err) {
       console.error('Error disconnecting DriverService Redis:', err);
     } finally {
         redisClient = null;
         isReady = false;
     }
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
  disconnectRedis
};
