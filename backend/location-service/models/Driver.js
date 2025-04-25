const mongoose = require('mongoose');

// IMPORTANT: This schema definition MUST match the one in Driver Service exactly.
// It's used here only to interact with the Driver Service's database connection.

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
    default: 4.5,
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
    type: String
  },
  currentRideId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Ride',
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
}, { collection: 'drivers' }); // Explicitly set collection name if needed


module.exports = mongoose.model('DriverSchemaForLocationService', driverSchema); // Use a distinct model name locally
// The actual model used will be retrieved via driverServiceDbConnection.model('Driver', driverSchema) in server.js
