const { createClient } = require('redis');

let redisClient;        // For general commands (GET, SET, etc.)
let redisSubscriber;    // Dedicated client for Pub/Sub
let isReady = false;
let isSubscriberReady = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function connectRedis() {
  if (isReady && redisClient && isSubscriberReady && redisSubscriber) {
    return true; // Already connected
  }

  // --- Connect Regular Client ---
  if (!redisClient) {
     redisClient = createClient({ url: REDIS_URL });

     redisClient.on('error', (err) => {
       console.error('NotificationService Redis Client Error:', err);
       isReady = false;
     });

     redisClient.on('ready', () => {
       console.log('NotificationService Redis client is ready');
       isReady = true;
     });

      redisClient.on('end', () => {
        console.log('NotificationService Redis client connection closed');
        isReady = false;
        redisClient = null;
      });

     try {
       await redisClient.connect();
     } catch (err) {
       console.error('Failed to connect NotificationService Redis client:', err);
       isReady = false;
       redisClient = null;
       // Don't necessarily stop subscriber connection attempt
     }
  }


   // --- Connect Subscriber Client ---
  if (!redisSubscriber) {
     // Important: Create a separate client instance for subscriptions
     redisSubscriber = createClient({ url: REDIS_URL });

     redisSubscriber.on('error', (err) => {
       console.error('NotificationService Redis Subscriber Error:', err);
       isSubscriberReady = false;
     });

     redisSubscriber.on('ready', () => {
       console.log('NotificationService Redis subscriber is ready');
       isSubscriberReady = true;
     });

      redisSubscriber.on('end', () => {
         console.log('NotificationService Redis subscriber connection closed');
         isSubscriberReady = false;
         redisSubscriber = null;
       });


     try {
        // Connect the subscriber client
       await redisSubscriber.connect();
     } catch (err) {
       console.error('Failed to connect NotificationService Redis subscriber:', err);
       isSubscriberReady = false;
       redisSubscriber = null;
     }
   }

  // Return true if at least the main client connected, or both if needed
   return isReady || isSubscriberReady; // Adjust logic based on requirements
}

function getRedisClient() {
  if (!isReady || !redisClient) {
    console.warn('NotificationService Redis client requested but not ready or not connected.');
    return null;
  }
  return redisClient;
}

function getRedisSubscriber() {
  if (!isSubscriberReady || !redisSubscriber) {
     console.warn('NotificationService Redis subscriber requested but not ready or not connected.');
    return null;
  }
  return redisSubscriber;
}


async function disconnectRedis() {
    const disconnectPromises = [];
    if (redisClient && isReady) {
        disconnectPromises.push(redisClient.quit().catch(err => console.error('Error disconnecting Redis client:', err)));
    }
    if (redisSubscriber && isSubscriberReady) {
        disconnectPromises.push(redisSubscriber.quit().catch(err => console.error('Error disconnecting Redis subscriber:', err)));
    }

    try {
         await Promise.all(disconnectPromises);
    } finally {
        redisClient = null;
        redisSubscriber = null;
        isReady = false;
        isSubscriberReady = false;
        console.log("NotificationService Redis clients disconnected.");
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
  getRedisSubscriber,
  disconnectRedis
};
