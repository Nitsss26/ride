const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

const locationUpdateSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver', // Reference Driver model conceptually
    required: true,
    index: true // Index for querying by driver
  },
  rideId: { // Optional: Link location update to a specific ride
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Ride', // Reference Ride model conceptually
     index: true, // Index if querying location history per ride
     default: null
   },
  location: {
      type: locationSchema,
      required: true
      // Consider adding a 2dsphere index if you query historical data geographically often
      // index: '2dsphere'
  },
  timestamp: {
    type: Date,
    required: true,
    index: true // Index for time-based queries
  }
});

// Compound index for common queries (driver + time)
locationUpdateSchema.index({ driverId: 1, timestamp: -1 });

// TTL index to automatically remove old location data after a certain period (e.g., 30 days)
// Adjust 'expireAfterSeconds' as needed (30 days = 30 * 24 * 60 * 60 seconds)
// locationUpdateSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

module.exports = mongoose.model('LocationUpdate', locationUpdateSchema);
