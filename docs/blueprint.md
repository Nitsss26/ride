# **App Name**: RideVerse

## Core Features:

- Ride Request Processing: Handle rider requests, including pickup/dropoff locations and ride preferences. Validate requests, create ride entries, and store ride details in MongoDB. Set a 10-minute timer in Redis for each ride.
- Driver Matching: Match drivers to ride requests based on proximity, rating, vehicle type, and historical metrics. Create driver batches and store them in Redis with TTL. Publish driver-match events to Kafka.
- Driver Notification and Response: Manage driver offers via WebSocket. Handle driver acceptance, rejection, or timeout. Update ride and driver statuses accordingly. Implement batch expiration handling and ride timeout handling.
- Real-time Location Tracking: Track driver locations in real-time using WebSocket and Redis. Batch location updates to MongoDB. Provide real-time tracking for riders via Redis Pub/Sub.
- Ride Completion and Payment: Handle ride progress, including driver arrival verification using OTP. Process payments (cash and in-app) and update ride status accordingly. Use Kafka to publish payment-completed events.

## Style Guidelines:

- Primary color: White (#FFFFFF) for a clean and modern look.
- Secondary color: Dark gray (#333333) for text and important elements.
- Accent: Teal (#008080) for interactive elements and highlights.
- Clear and readable font for all text elements.
- Simple and intuitive icons for easy navigation.
- Clean and organized layout with a focus on usability.
- Subtle animations for transitions and feedback.

## Original User Request:
Initial Ride Request Phase
Rider requests a ride

Rider App sends request to Ride Service Request includes pickup/dropoff locations and ride preferences

Ride Service processes request

Validates request and creates ride entry Stores ride details in Ride DB Sets a 10-minute timer in Redis (key: ride-timer:{rideId}) Publishes ride-requested event to Kafka

Driver Matching Phase
Driver Service consumes ride request

Receives ride-requested event from Kafka Queries Redis for available driver locations near pickup point Joins location data with driver profiles from Driver DB Runs matching algorithm considering:

Proximity to pickup location Driver rating and reliability metrics Vehicle type and capacity Historical metrics

Driver Service creates matching batch

Creates small batch (3-5) of best driver matches Sets batch expiration time (80-90 seconds) Stores batch in Redis with TTL (key: driver-batch:{rideId}) Publishes driver-match event with batch info to Kafka

Driver Notification Phase
Notification Service manages driver offers

Consumes driver-match event from Kafka Sends ride offer to highest-ranked driver via WebSocket Starts countdown timer (e.g., 120 seconds) for driver response

Batch expiration handling

Notification Service monitors batch expiration in Redis When batch expires, publishes batch-expired event to Kafka Driver Service consumes this event and creates fresh batch This ensures location data is never stale

Driver response handling

If driver accepts:

Notification Service publishes driver-accepted event Driver Service updates driver status to "busy" Ride Service updates ride status to "driver-assigned" Notification Service notifies rider via WebSocket

If driver rejects or times out:

Notification Service tries next driver in current batch If batch is exhausted, waits for new batch from Driver Service

Ride Timeout Handling
10-minute ride timer

Redis TTL expires after 10 minutes if no driver accepts Notification Service detects expiration Publishes ride-timeout event to Kafka Ride Service updates ride status to "timed-out" Notification Service informs rider to try again

Location Tracking Phase
Driver location updates

Driver App sends location updates every 5 seconds via WebSocket Location Service immediately updates Redis (key: driver-location:{driverId}) Location Service publishes to Redis channel (channel: driver-location-updates:{driverId}) Driver locations are never stored in Driver Service database Location Service batches updates to Location DB every 1-2 minutes

Real-time tracking for rider

When ride is assigned, Rider App subscribes to driver's Redis channel Receives real-time position updates via Redis Pub/Sub No direct connection between rider and driver apps

Ride Progress Phase
Driver arrival and verification

Driver indicates arrival via Driver App Rider shares OTP with driver for verification Driver inputs OTP in Driver App Verification request sent to Ride Service Ride Service validates OTP and updates ride status to "in-progress" Notification Service informs both parties

Ride Completion Phase (Ride completion and payment)
Driver arrives at destination For cash payment:

Driver confirms payment received via Driver App Driver App sends confirmation to Payment Service

For in-app payment:

Rider confirms completion via Rider App Rider App sends request to Payment Service Payment Service processes the transaction

Payment Service records transaction in Payment DB Payment Service publishes payment-completed event Ride Service consumes event and updates ride status to "completed" Driver Service updates driver status to "available" in Redis and DB Notification Service notifies both parties of completion

Bro i want all these things for my ride-app-backend with microservice architeture please make exaclty all things as i want make sure include all these things redis, kafka i will use docker images for these things so please make sure make it accordingly also make sure if any of these are not configured then my all things must be done without error show waring that sertup redis ot kafka things so i want you to design my backend services keeping these things in mind and make sure make in a way atleast we can test this flow make all services accordingly make sure use node js and express and mongodb for backend please

After completetion make driver and user app for react native expo and make sure make these whole apps in single file so that it will be easy for me to test this in expo online emulator from single 1 file make 1 file for driver app and 1 file for rider app make sure in one file all the functionalities will covered to test these things i how you under stand

first of all make backenn, then make 1 file driver app for react native and 1 file rider app for react native
  