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
  },
  timestamp: {
     type: Date,
     default: Date.now
  }
}, { _id: false });


const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  phone: {
     type: String,
     required: true,
     unique: true
  },
  email: {
     type: String,
     required: true,
     unique: true
   },
  isOnline: {
    type: Boolean,
    default: false,
  },
  currentStatus: {
    type: String,
    enum: ['available', 'busy', 'offline', 'en_route_pickup', 'at_pickup', 'on_ride'],
    default: 'offline',
  },
  lastKnownLocation: locationSchema,
  rating: {
    type: Number,
    default: 4.5, // Default rating
    min: 1,
    max: 5
  },
  vehicle: {
    make: String,
    model: String,
    licensePlate: {
        type: String,
        required: true,
        unique: true
    },
    color: String,
    type: String // e.g., 'Sedan', 'SUV', 'Bike'
  },
  currentRideId: { // Track the ID of the ride the driver is currently on/assigned to
     type: String,
     ref: 'Ride', // Reference Ride model (conceptually, not a hard link)
     default: null
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

// Index for location queries if needed directly on this model (though Redis is primary)
// driverSchema.index({ lastKnownLocation: '2dsphere' });

// Index for faster lookups by status and online state
driverSchema.index({ isOnline: 1, currentStatus: 1 });


// Update `updatedAt` timestamp on save
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('lastKnownLocation')) {
      this.lastKnownLocation.timestamp = Date.now();
  }
  next();
});

// Update `updatedAt` timestamp on updates
driverSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  // If updating location directly via findOneAndUpdate (less common with LocationService)
  // const update = this.getUpdate();
  // if (update.$set && update.$set.lastKnownLocation) {
  //    update.$set['lastKnownLocation.timestamp'] = Date.now();
  // } else if (update.lastKnownLocation) {
  //    this.set({ 'lastKnownLocation.timestamp': Date.now() });
  // }
  next();
});


module.exports = mongoose.model('Driver', driverSchema);
