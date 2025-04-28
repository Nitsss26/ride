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


const rideSchema = new mongoose.Schema({
  riderId: {
    //type: mongoose.Schema.Types.ObjectId, // Assuming rider IDs are Mongo ObjectIds
    type:String,
    ref: 'User', // Optional: If you have a User model
    required: true,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId, // Assuming driver IDs are Mongo ObjectIds
    ref: 'Driver', // Optional: If you have a Driver model
    default: null,
  },
  pickupLocation: {
    address: String,
    geo: locationSchema
  },
  dropoffLocation: {
     address: String,
     geo: locationSchema
  },
  status: {
    type: String,
    enum: [
        'requested',          // Rider initiated request
        'no_drivers_found',   // Initial search failed
        'driver_assigned',    // A driver accepted the ride
        'driver_arrived',     // Driver reached pickup location
        'in-progress',        // Ride started after OTP verification
        'completed',          // Ride finished, payment processed
        'cancelled_by_rider', // Rider cancelled
        'cancelled_by_driver',// Driver cancelled
        'timed-out'           // No driver accepted within the time limit
        ],
    required: true,
    default: 'requested',
  },
  preferences: { // Optional ride preferences
    vehicleType: String,
    // other preferences...
  },
  vehicleDetails: { // Details of the assigned vehicle
     make: String,
     model: String,
     licensePlate: String,
     color: String
  },
  fare: { // Estimated or final fare
    amount: Number,
    currency: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  // Optional: Add OTP field if you store it temporarily
  // otp: {
  //   code: String,
  //   expiresAt: Date
  // }
});

// Update `updatedAt` timestamp on save
rideSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update `updatedAt` timestamp on findByIdAndUpdate
rideSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});


module.exports = mongoose.model('Ride', rideSchema);
