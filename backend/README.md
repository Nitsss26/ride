# RideVerse Backend Microservices

This directory contains the backend microservices for the RideVerse application.

## Architecture Overview

The backend follows a microservice architecture, designed for scalability and resilience. Key components include:

-   **Ride Service:** Manages the lifecycle of a ride request.
-   **Driver Service:** Handles driver profiles, availability, and matching logic.
-   **Notification Service:** Manages real-time communication (WebSocket) for ride offers, status updates, etc.
-   **Location Service:** Processes and stores real-time driver location updates.
-   **Payment Service:** Handles payment processing (cash & in-app).

Infrastructure components used:

-   **MongoDB:** Primary database for storing persistent data (rides, drivers, transactions, locations).
-   **Redis:** Used for caching, real-time data (driver locations via Geo Sets, driver status), timers (ride timeout, batch expiration), and Pub/Sub for location updates.
-   **Kafka:** Asynchronous messaging bus for inter-service communication (ride requests, driver matches, status updates, payment completion, etc.).
-   **WebSocket:** Used by Notification Service and Location Service for real-time bidirectional communication with mobile apps.

## Prerequisites

-   Docker & Docker Compose
-   Node.js (v18+ recommended, mainly for running services locally outside Docker if needed)
-   An `.env` file in the `backend` root directory (see `.env.example`). You'll need to add your Stripe test keys.

## Running the Backend (Docker Compose)

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```
2.  **Create your environment file:**
    Copy `.env.example` to `.env` and fill in your Stripe API keys:
    ```bash
    cp .env.example .env
    # Edit .env and add your Stripe keys
    ```
3.  **Build and start the services:**
    ```bash
    docker-compose up --build -d
    ```
    This command will:
    -   Build the Docker images for each service if they don't exist or have changed.
    -   Start containers for all services (Node.js apps, Kafka, Zookeeper, Redis, MongoDB).
    -   Run the services in detached mode (`-d`).

4.  **View Logs:**
    To see the logs from all services:
    ```bash
    docker-compose logs -f
    ```
    To view logs for a specific service (e.g., `ride-service`):
    ```bash
    docker-compose logs -f ride-service
    ```

5.  **Stopping the Services:**
    ```bash
    docker-compose down
    ```
    To stop and remove volumes (clears DB data, Kafka topics, etc.):
    ```bash
    docker-compose down -v
    ```

## Service Endpoints (Default Ports)

-   **Ride Service:** `http://localhost:3000`
-   **Driver Service:** `http://localhost:3001`
-   **Notification Service:** `http://localhost:3002` (HTTP), `ws://localhost:3002` (WebSocket)
-   **Location Service:** `http://localhost:3003` (HTTP), `ws://localhost:3003` (WebSocket for driver updates)
-   **Payment Service:** `http://localhost:3004`
-   **Kafka:** `localhost:29092` (External listener for host access)
-   **Redis:** `localhost:6379`
-   **MongoDB:** `mongodb://localhost:27017`

## Important Notes

-   **Kafka Topics:** Topics are set to auto-create in the `docker-compose.yml` for development ease. In production, you would typically pre-create topics with appropriate partitioning and replication factors.
-   **Redis Keyspace Notifications:** The `docker-compose.yml` configures Redis to emit expiration events (`Ex`). Notification Service uses this (or polling as a fallback) to handle ride/batch timeouts. Ensure your Redis server (if run outside Docker) has `notify-keyspace-events Ex` configured.
-   **Error Handling & Resilience:** The provided code includes basic error handling. Production systems would require more robust error handling, retry mechanisms (e.g., for Kafka publishing, DB writes), circuit breakers, and detailed monitoring/alerting.
-   **Security:** This setup is for development. Production deployments need proper authentication, authorization, network security, input validation, and secrets management.
-   **Simulation:** Some features like OTP generation/sending and full Stripe integration are simplified or simulated.
-   **Database Connections:** Location Service connects to its own DB *and* the Driver Service DB to update `lastKnownLocation`. Ensure network connectivity and credentials allow this.

## Testing

Use tools like Postman or `curl` to interact with the HTTP endpoints of the services. WebSocket clients (like browser extensions or simple Node.js scripts) can be used to test the Notification and Location services. The React Native apps will provide the primary way to test the end-to-end flow.
