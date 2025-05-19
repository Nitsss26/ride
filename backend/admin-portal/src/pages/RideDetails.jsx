"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "react-toastify"
import {
  Car,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react"
import api from "../services/api"

const RideDetails = () => {
  const { rideId } = useParams()
  const [ride, setRide] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rider, setRider] = useState(null)
  const [driver, setDriver] = useState(null)

  useEffect(() => {
    fetchRideDetails()
  }, [rideId])

  const fetchRideDetails = async () => {
    try {
      setLoading(true)
      const rideResponse = await api.getRide(rideId)
      setRide(rideResponse.data)

      // Fetch rider details
      if (rideResponse.data.riderId) {
        try {
          const riderResponse = await api.getUser(rideResponse.data.riderId)
          setRider(riderResponse.data)
        } catch (error) {
          console.error("Error fetching rider details:", error)
        }
      }

      // Fetch driver details
      if (rideResponse.data.driverId) {
        try {
          const driverResponse = await api.getUser(rideResponse.data.driverId)
          setDriver(driverResponse.data)
        } catch (error) {
          console.error("Error fetching driver details:", error)
        }
      }
    } catch (error) {
      console.error("Error fetching ride details:", error)
      toast.error("Failed to load ride details")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "driver-assigned":
        return "bg-yellow-100 text-yellow-800"
      case "driver-arrived":
        return "bg-purple-100 text-purple-800"
      case "pending":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!ride) {
    return (
      <div className="p-6">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Ride not found</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The ride you are looking for does not exist or has been deleted.</p>
              </div>
              <div className="mt-4">
                <Link
                  to="/rides"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Rides
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link to="/rides" className="text-primary hover:text-primary-dark flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Rides
        </Link>
      </div>

      {/* Ride Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ride #{ride._id.substring(0, 8)}</h1>
              <div className="flex items-center mt-1">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                    ride.status,
                  )}`}
                >
                  {ride.status}
                </span>
                <span className="ml-2 text-sm text-gray-500">{new Date(ride.createdAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              {ride.status === "completed" ? (
                <div className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </div>
              ) : ride.status === "cancelled" ? (
                <div className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelled
                </div>
              ) : (
                <div className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100">
                  <Clock className="mr-2 h-4 w-4" />
                  {ride.status.replace(/-/g, " ")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ride Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Route Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Route Information</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Pickup Location</p>
                  <p className="text-sm font-medium">{ride.pickupLocation?.address || "Not specified"}</p>
                  {ride.pickupLocation?.geo?.coordinates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: {ride.pickupLocation.geo.coordinates[1]}, {ride.pickupLocation.geo.coordinates[0]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Dropoff Location</p>
                  <p className="text-sm font-medium">{ride.dropoffLocation?.address || "Not specified"}</p>
                  {ride.dropoffLocation?.geo?.coordinates && (
                    <p className="text-xs text-gray-500 mt-1">
                      Coordinates: {ride.dropoffLocation.geo.coordinates[1]}, {ride.dropoffLocation.geo.coordinates[0]}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Ride Duration</p>
                  <p className="text-sm font-medium">
                    {ride.completedAt && ride.startedAt
                      ? `${Math.round((new Date(ride.completedAt) - new Date(ride.startedAt)) / 60000)} minutes`
                      : "Not completed"}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <Car className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Vehicle Type</p>
                  <p className="text-sm font-medium">
                    {ride.preferences?.vehicleType || ride.vehicleDetails?.type || "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">User Information</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-start">
                <User className="h-5 w-5 text-blue-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Rider</p>
                  {rider ? (
                    <div>
                      <Link to={`/users/${rider._id}`} className="text-sm font-medium text-primary hover:underline">
                        {rider.name || "Unknown"}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">ID: {rider._id}</p>
                      <p className="text-xs text-gray-500">Phone: {rider.phone || "N/A"}</p>
                    </div>
                  ) : (
                    <div>
                      <Link to={`/users/${ride.riderId}`} className="text-sm font-medium text-primary hover:underline">
                        View Rider (ID: {ride.riderId?.substring(0, 8)}...)
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-start">
                <Car className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Driver</p>
                  {driver ? (
                    <div>
                      <Link to={`/drivers/${driver._id}`} className="text-sm font-medium text-primary hover:underline">
                        {driver.name || "Unknown"}
                      </Link>
                      <p className="text-xs text-gray-500 mt-1">ID: {driver._id}</p>
                      <p className="text-xs text-gray-500">Phone: {driver.phone || "N/A"}</p>
                    </div>
                  ) : ride.driverId ? (
                    <div>
                      <Link
                        to={`/drivers/${ride.driverId}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View Driver (ID: {ride.driverId?.substring(0, 8)}...)
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-500">No driver assigned</p>
                  )}
                </div>
              </div>
              {ride.vehicleDetails && (
                <div className="flex items-start">
                  <Car className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Vehicle Details</p>
                    <p className="text-sm font-medium">
                      {ride.vehicleDetails.color} {ride.vehicleDetails.make} {ride.vehicleDetails.model}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">License Plate: {ride.vehicleDetails.licensePlate}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium">Payment Information</h2>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-start">
                <DollarSign className="h-5 w-5 text-green-500 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Fare</p>
                  <p className="text-sm font-medium">
                    {ride.fare?.amount ? `${ride.fare.amount} ${ride.fare.currency}` : "Not available"}
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <DollarSign className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Payment Method</p>
                  <p className="text-sm font-medium">{ride.paymentMethod || "Not specified"}</p>
                </div>
              </div>
              <div className="flex items-start">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                <div>
                  <p className="text-xs text-gray-500">Payment Status</p>
                  <p className="text-sm font-medium">
                    {ride.paymentStatus || (ride.status === "completed" ? "Paid" : "Pending")}
                  </p>
                </div>
              </div>
              {ride.paymentId && (
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                  <div>
                    <p className="text-xs text-gray-500">Payment ID</p>
                    <p className="text-sm font-medium">{ride.paymentId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ride Timeline */}
      <div className="mt-6 bg-white shadow rounded-lg">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Ride Timeline</h2>
        </div>
        <div className="p-4">
          <div className="flow-root">
            <ul className="-mb-8">
              <li>
                <div className="relative pb-8">
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                  <div className="relative flex space-x-3">
                    <div>
                      <span className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center ring-8 ring-white">
                        <Calendar className="h-5 w-5 text-gray-500" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                      <div>
                        <p className="text-sm text-gray-500">Ride requested</p>
                      </div>
                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                        {new Date(ride.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
              {ride.driverId && (
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center ring-8 ring-white">
                          <Car className="h-5 w-5 text-yellow-500" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Driver assigned</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {ride.driverAssignedAt ? new Date(ride.driverAssignedAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              )}
              {ride.status === "driver-arrived" || ride.status === "in-progress" || ride.status === "completed" ? (
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center ring-8 ring-white">
                          <MapPin className="h-5 w-5 text-purple-500" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Driver arrived at pickup</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {ride.driverArrivedAt ? new Date(ride.driverArrivedAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ) : null}
              {ride.status === "in-progress" || ride.status === "completed" ? (
                <li>
                  <div className="relative pb-8">
                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center ring-8 ring-white">
                          <Car className="h-5 w-5 text-blue-500" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Ride started</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {ride.startedAt ? new Date(ride.startedAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ) : null}
              {ride.status === "completed" ? (
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">Ride completed</p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {ride.completedAt ? new Date(ride.completedAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ) : ride.status === "cancelled" ? (
                <li>
                  <div className="relative">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center ring-8 ring-white">
                          <XCircle className="h-5 w-5 text-red-500" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            Ride cancelled {ride.cancelledBy ? `by ${ride.cancelledBy}` : ""}
                          </p>
                          {ride.cancellationReason && (
                            <p className="text-sm text-red-500 mt-1">Reason: {ride.cancellationReason}</p>
                          )}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {ride.cancelledAt ? new Date(ride.cancelledAt).toLocaleString() : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RideDetails

