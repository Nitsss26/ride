# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install app dependencies
RUN npm ci --only=production

# Bundle app source
COPY . .

# Make port 3003 available (for WebSocket and HTTP)
EXPOSE 3003

# Define the command to run your app
CMD [ "node", "server.js" ]
