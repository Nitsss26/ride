const { Kafka, logLevel } = require('kafkajs');

const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');

const kafka = new Kafka({
  clientId: 'payment-service',
  brokers: KAFKA_BROKERS,
  logLevel: logLevel.WARN,
   retry: {
      initialRetryTime: 300,
      retries: 5
    }
});

const producer = kafka.producer();
let producerConnected = false;

async function connectKafkaProducer() {
  if (producerConnected) return true;
  try {
    await producer.connect();
    producerConnected = true;
    console.log("PaymentService Kafka Producer connected successfully.");
    return true;
  } catch (error) {
    console.error('Failed to connect PaymentService Kafka Producer:', error);
    producerConnected = false;
    return false;
  }
}

async function disconnectKafka() {
  try {
    if (producerConnected) await producer.disconnect();
    producerConnected = false;
    console.log("PaymentService Kafka producer disconnected.");
  } catch (error) {
    console.error('Error disconnecting PaymentService Kafka producer:', error);
  }
}

function getKafkaProducer() {
  if (!producerConnected) {
     console.warn("Kafka Producer requested but not connected.");
    // throw new Error('Kafka producer not connected');
     return null;
  }
  return producer;
}


module.exports = {
  connectKafkaProducer,
  getKafkaProducer,
  disconnectKafka,
};
