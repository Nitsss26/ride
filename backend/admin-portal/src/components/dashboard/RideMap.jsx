"use client"

import { useEffect, useRef, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for Leaflet marker icons
import icon from "leaflet/dist/images/marker-icon.png"
import iconShadow from "leaflet/dist/images/marker-shadow.png"

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

L.Marker.prototype.options.icon = DefaultIcon

// Custom icons
const driverIcon = new L.Icon({
  iconUrl: "/images/driver-marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

const rideIcon = new L.Icon({
  iconUrl: "/images/ride-marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
})

// Dummy data for development
const dummyDrivers = [
  { id: "d1", name: "John Driver", lat: 40.7128, lng: -74.006, status: "available" },
  { id: "d2", name: "Sarah Driver", lat: 40.7228, lng: -74.016, status: "available" },
  { id: "d3", name: "Mike Driver", lat: 40.7328, lng: -74.026, status: "on_ride" },
  { id: "d4", name: "Lisa Driver", lat: 40.7428, lng: -74.036, status: "available" },
  { id: "d5", name: "Tom Driver", lat: 40.7528, lng: -74.046, status: "on_ride" },
]

const dummyRides = [
  {
    id: "r1",
    driverId: "d3",
    riderId: "u1",
    riderName: "Alice User",
    pickup: { lat: 40.7328, lng: -74.026 },
    dropoff: { lat: 40.7528, lng: -74.046 },
    status: "in_progress",
  },
  {
    id: "r2",
    driverId: "d5",
    riderId: "u2",
    riderName: "Bob User",
    pickup: { lat: 40.7528, lng: -74.046 },
    dropoff: { lat: 40.7628, lng: -74.056 },
    status: "in_progress",
  },
]

const RideMap = () => {
  const [drivers, setDrivers] = useState(dummyDrivers)
  const [rides, setRides] = useState(dummyRides)
  const [loading, setLoading] = useState(false)
  const mapRef = useRef(null)

  useEffect(() => {
    // In a real implementation, you would fetch real-time data here
    // and potentially set up a WebSocket connection for live updates
    const fetchMapData = async () => {
      try {
        setLoading(true)
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // In a real implementation, you would update with real data
        // For now, we'll just use the dummy data
        setDrivers(dummyDrivers)
        setRides(dummyRides)
      } catch (error) {
        console.error("Error fetching map data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMapData()

    // Set up interval to simulate real-time updates
    const interval = setInterval(() => {
      // Simulate driver movement
      setDrivers((prevDrivers) =>
        prevDrivers.map((driver) => ({
          ...driver,
          lat: driver.lat + (Math.random() - 0.5) * 0.001,
          lng: driver.lng + (Math.random() - 0.5) * 0.001,
        })),
      )
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-96 rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={[40.7128, -74.006]} // New York City coordinates
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        whenCreated={(map) => {
          mapRef.current = map
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render available drivers */}
        {drivers
          .filter((driver) => driver.status === "available")
          .map((driver) => (
            <Marker key={driver.id} position={[driver.lat, driver.lng]} icon={driverIcon}>
              <Popup>
                <div>
                  <h3 className="font-medium">{driver.name}</h3>
                  <p className="text-sm text-gray-600">Available for rides</p>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Render active rides */}
        {rides.map((ride) => {
          const driver = drivers.find((d) => d.id === ride.driverId)
          if (!driver) return null

          return (
            <Marker key={ride.id} position={[driver.lat, driver.lng]} icon={rideIcon}>
              <Popup>
                <div>
                  <h3 className="font-medium">Active Ride</h3>
                  <p className="text-sm text-gray-600">Driver: {driver.name}</p>
                  <p className="text-sm text-gray-600">Rider: {ride.riderName}</p>
                  <p className="text-sm text-gray-600">Status: In Progress</p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}

export default RideMap
