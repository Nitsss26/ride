require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { connectKafkaProducer, getKafkaProducer, disconnectKafka } = require('./kafkaClient');
const Transaction = require('./models/Transaction');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY); // Initialize Stripe

const app = express();
app.use(express.json());

const MONGODB_URI = process.env.PAYMENT_SERVICE_MONGODB_URI || 'mongodb://localhost:27017/payment_service';

let isKafkaProducerConnected = false;

// --- Database Connection ---
mongoose.connect(MONGODB_URI)
  .then(() => console.log('PaymentService MongoDB connected'))
  .catch(err => console.error('PaymentService MongoDB connection error:', err));

// --- Kafka Connection ---
connectKafkaProducer().then(connected => {
    isKafkaProducerConnected = connected;
    if(connected) console.log('PaymentService Kafka Producer connected');
    else console.warn('PaymentService Kafka Producer connection failed. Completion events will not be published.');
}).catch(err => console.error('PaymentService Kafka Producer connection error:', err));


// --- API Endpoints ---

// Process Cash Payment (Confirmation from Driver App)
app.post('/payments/cash', async (req, res) => {
    const { rideId, driverId, riderId, amount, currency = 'USD' } = req.body;

    if (!rideId || !driverId || !riderId || amount == null) {
        return res.status(400).json({ message: 'Missing required payment details for cash transaction' });
    }

    console.log(`Processing cash payment confirmation for ride ${rideId}, amount: ${amount} ${currency}`);

    try {
        // 1. Record the transaction
        const transaction = new Transaction({
            rideId,
            driverId,
            riderId,
            amount,
            currency,
            paymentMethod: 'cash',
            status: 'completed', // Cash payment is confirmed by driver
            gatewayTransactionId: `cash_${rideId}_${Date.now()}` // Generate simple ID
        });
        const savedTransaction = await transaction.save();
        console.log(`Cash transaction recorded for ride ${rideId}`);

        // 2. Publish payment-completed event to Kafka
        await publishPaymentCompleted(rideId, driverId, riderId, {amount, currency});

        res.status(200).json({ message: 'Cash payment confirmed', transaction: savedTransaction });

    } catch (error) {
        console.error(`Error processing cash payment for ride ${rideId}:`, error);
        // Consider if Kafka event should still be published on DB error? Probably not.
        res.status(500).json({ message: 'Failed to process cash payment confirmation' });
    }
});

// Process In-App Payment (Request from Rider App)
app.post('/payments/in-app', async (req, res) => {
    // --- Highly Simplified Stripe Integration ---
    // In a real app:
    // - Use Stripe Elements on the frontend (Rider App) to collect payment details securely.
    // - Create PaymentIntents on the backend.
    // - Confirm the PaymentIntent using the frontend result.
    // - Handle webhooks from Stripe for asynchronous payment success/failure.

    const { rideId, driverId, riderId, amount, currency = 'USD', paymentMethodId /* from frontend */, customerId /* optional Stripe customer */ } = req.body;

     if (!rideId || !driverId || !riderId || amount == null || !paymentMethodId) {
         return res.status(400).json({ message: 'Missing required payment details for in-app transaction' });
     }
     console.log(`Processing in-app payment request for ride ${rideId}, amount: ${amount} ${currency}`);

     let transactionStatus = 'pending';
     let gatewayId = null;
     let transactionError = null;

     // Create initial transaction record
     const transaction = new Transaction({
          rideId,
          driverId,
          riderId,
          amount,
          currency,
          paymentMethod: 'in-app', // or derive from paymentMethodId if available
          status: transactionStatus,
          gateway: 'stripe'
      });

      try {
          await transaction.save(); // Save pending transaction first

          // --- Simulate Stripe PaymentIntent creation and confirmation ---
          console.log("Simulating Stripe PaymentIntent creation...");
          // In real Stripe: await stripe.paymentIntents.create({...});
          const simulatedPaymentIntent = {
              id: `pi_${rideId}_${Date.now()}`,
              status: 'processing', // Start as processing
              amount: Math.round(amount * 100), // Stripe uses cents
              currency: currency,
          };
          transaction.gatewayTransactionId = simulatedPaymentIntent.id;
          gatewayId = simulatedPaymentIntent.id;

          console.log(`Simulated PaymentIntent ${gatewayId} created for ride ${rideId}.`);

          // Simulate confirmation (replace with actual Stripe confirmation logic)
          // This step would typically involve frontend interaction or webhooks
          console.log("Simulating Stripe payment confirmation...");
          await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay

          // Simulate success scenario
          const paymentSucceeded = Math.random() > 0.1; // 90% success rate simulation

          if (paymentSucceeded) {
              simulatedPaymentIntent.status = 'succeeded';
              transactionStatus = 'completed';
              console.log(`Simulated PaymentIntent ${gatewayId} succeeded for ride ${rideId}.`);
              transaction.status = transactionStatus;
              await transaction.save(); // Update transaction status

              // Publish payment-completed event ONLY on success
              await publishPaymentCompleted(rideId, driverId, riderId, { amount, currency });

              res.status(200).json({ message: 'In-app payment successful', transaction });

          } else {
              simulatedPaymentIntent.status = 'failed';
              transactionStatus = 'failed';
              transactionError = 'Simulated payment gateway failure.';
              console.error(`Simulated PaymentIntent ${gatewayId} failed for ride ${rideId}.`);
              transaction.status = transactionStatus;
              transaction.errorMessage = transactionError;
              await transaction.save(); // Update transaction status
               res.status(400).json({ message: 'In-app payment failed', error: transactionError, transaction });
          }

      } catch (error) {
         console.error(`Error processing in-app payment for ride ${rideId}:`, error);
          // Update transaction status if possible
          try {
             transaction.status = 'error';
             transaction.errorMessage = error.message || 'Internal processing error';
             await transaction.save();
         } catch (saveError) {
             console.error("Failed to save error status to transaction:", saveError);
         }
         res.status(500).json({ message: 'Failed to process in-app payment' });
     }

});

// Get Transaction Status
app.get('/transactions/:transactionId', async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.transactionId);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }
        res.json(transaction);
    } catch (error) {
        console.error('Error getting transaction status:', error);
        res.status(500).json({ message: 'Failed to get transaction status' });
    }
});

// Get Transactions for a Ride
app.get('/rides/:rideId/transactions', async (req, res) => {
    try {
        const transactions = await Transaction.find({ rideId: req.params.rideId }).sort({ createdAt: -1 });
        res.json(transactions);
    } catch (error) {
        console.error(`Error getting transactions for ride ${req.params.rideId}:`, error);
        res.status(500).json({ message: 'Failed to get transactions' });
    }
});


// --- Kafka Publishing Helper ---
async function publishPaymentCompleted(rideId, driverId, riderId, fare) {
    if (!isKafkaProducerConnected) {
        console.warn(`Kafka Producer not connected. Cannot publish payment-completed event for ${rideId}.`);
        // CRITICAL: If Kafka fails, the ride/driver status won't update automatically.
        // Implement fallback/retry or monitoring.
        return;
    }
    try {
        const producer = getKafkaProducer();
        const payload = JSON.stringify({
             rideId,
             driverId,
             riderId,
             status: 'completed',
             fare // Include fare details
        });
        await producer.send({
            topic: 'payment-completed',
            messages: [{ key: rideId, value: payload }],
        });
        console.log(`Published payment-completed event for ride ${rideId}`);
    } catch (error) {
        console.error(`Failed to publish payment-completed event for ride ${rideId}:`, error);
        // Handle Kafka publish failure (retry?)
    }
}

// --- Health Check ---
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        mongo: mongoose.connection.readyState === 1,
        kafkaProducer: isKafkaProducerConnected
     });
});

// --- Server Start ---
const PORT = process.env.PAYMENT_SERVICE_PORT || 3004;
app.listen(PORT, () => {
    console.log(`Payment Service listening on port ${PORT}`);
});

// Graceful shutdown for Kafka
process.on('SIGINT', async () => {
  await disconnectKafka();
  process.exit(0);
});
process.on('SIGTERM', async () => {
    await disconnectKafka();
    process.exit(0);
});
