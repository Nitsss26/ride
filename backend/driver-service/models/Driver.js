const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
    default: 'Point'
  },
  coordinates: {
    type: [Number],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const documentSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  rejectionReason: {
    type: String,
    default: null
  }
}, { _id: false });

const vehicleSchema = new mongoose.Schema({
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: { type: String }, // Optional, as per DriverApp.js
  color: { type: String, required: true },
  licensePlate: { type: String, required: true, unique: true },
  type: { type: String, required: true, enum: ['Sedan', 'SUV', 'Hatchback', 'Luxury'] }
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
  vehicle: vehicleSchema,
  documents: {
    license: documentSchema,
    insurance: documentSchema,
    registration: documentSchema,
    profile: documentSchema
  },
  currentRideId: {
    type: String,
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
});

driverSchema.index({ isOnline: 1, currentStatus: 1 });

driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.isModified('lastKnownLocation')) {
    this.lastKnownLocation.timestamp = Date.now();
  }
  next();
});

driverSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: Date.now() });
  next();
});

module.exports = mongoose.model('Driver', driverSchema);
