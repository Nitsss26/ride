
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
//    ref: 'Ride', // Conceptually links to Ride
    required: true,
    index: true
  },
  riderId: {
    type: String,
//    ref: 'User', // Conceptually links to User/Rider
    required: true,
    index: true
  },
  driverId: {
    type: String,
//    ref: 'Driver', // Conceptually links to Driver
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'in-app', 'card', 'wallet'], // Extend as needed
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'error'],
    required: true,
    default: 'pending',
  },
  gateway: { // e.g., 'stripe', 'paypal', 'cash'
      type: String,
      default: 'none'
  },
  gatewayTransactionId: { // ID from the payment gateway (Stripe charge ID, etc.)
    type: String,
    index: true,
    sparse: true // Allow null/missing values without enforcing uniqueness
  },
  errorMessage: { // Store error messages from gateway or processing
      type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` timestamp on save/update
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

transactionSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);
