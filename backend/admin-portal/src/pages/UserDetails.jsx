"use client"

import { useState, useEffect } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "react-toastify"
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Shield,
  AlertTriangle,
  Car,
  CheckCircle,
  XCircle,
  ArrowLeft,
} from "lucide-react"
import api from "../services/api"

const UserDetails = () => {
  const { userId } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rides, setRides] = useState([])
  const [tickets, setTickets] = useState([])
  const [activeTab, setActiveTab] = useState("profile")
  const [processingStatus, setProcessingStatus] = useState(false)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      setLoading(true)
      const userResponse = await api.fetchUserDetails(userId)
      setUser(userResponse.data)

      // Fetch related data
      try {
        const ridesResponse = await api.fetchRides({ userId, limit: 5 })
        setRides(ridesResponse.data.rides || ridesResponse.data || [])
      } catch (error) {
        console.error("Error fetching rides:", error)
      }

      try {
        const ticketsResponse = await api.getTickets({ userId, limit: 5 })
        setTickets(ticketsResponse.data.tickets || ticketsResponse.data || [])
      } catch (error) {
        console.error("Error fetching tickets:", error)
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      toast.error("Failed to load user details")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      setProcessingStatus(true)
      await api.updateUserStatus(userId, newStatus)
      toast.success(`User status updated to ${newStatus}`)
      fetchUserDetails() // Refresh user data
    } catch (error) {
      console.error("Error updating user status:", error)
      toast.error("Failed to update user status")
    } finally {
      setProcessingStatus(false)
    }
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "suspended":
        return "bg-yellow-100 text-yellow-800"
      case "banned":
        return "bg-red-100 text-red-800"
      case "pending_verification":
        return "bg-blue-100 text-blue-800"
      case "pending_approval":
        return "bg-purple-100 text-purple-800"
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

  if (!user) {
    return (
      <div className="p-6">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">User not found</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The user you are looking for does not exist or has been deleted.</p>
              </div>
              <div className="mt-4">
                <Link
                  to="/users"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Users
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
        <Link to="/users" className="text-primary hover:text-primary-dark flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Users
        </Link>
      </div>

      {/* User Header */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex items-center">
              <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                {user.name ? user.name.charAt(0) : <User className="h-8 w-8" />}
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900">{user.name || "No Name"}</h1>
                <div className="flex items-center mt-1">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === "driver" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                    } mr-2`}
                  >
                    {user.role}
                  </span>
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                      user.accountStatus,
                    )}`}
                  >
                    {user.accountStatus?.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              {user.accountStatus !== "active" && (
                <button
                  onClick={() => handleStatusChange("active")}
                  disabled={processingStatus}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  {processingStatus ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Activate
                </button>
              )}
              {user.accountStatus !== "suspended" && (
                <button
                  onClick={() => handleStatusChange("suspended")}
                  disabled={processingStatus}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  {processingStatus ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <AlertTriangle className="mr-2 h-4 w-4" />
                  )}
                  Suspend
                </button>
              )}
              {user.accountStatus !== "banned" && (
                <button
                  onClick={() => handleStatusChange("banned")}
                  disabled={processingStatus}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {processingStatus ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <XCircle className="mr-2 h-4 w-4" />
                  )}
                  Ban
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-200">
          <nav className="flex">
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "profile"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              Profile
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "rides"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("rides")}
            >
              Rides
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === "support"
                  ? "border-b-2 border-primary text-primary"
                  : "text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("support")}
            >
              Support Tickets
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "profile" && (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">User Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Full Name</p>
                      <p className="text-sm font-medium">{user.name || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Phone Number</p>
                      <p className="text-sm font-medium">{user.phone || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Email Address</p>
                      <p className="text-sm font-medium">{user.email || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="text-sm font-medium">{user.address || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Account Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Account Status</p>
                      <p
                        className={`text-sm font-medium ${
                          user.accountStatus === "active"
                            ? "text-green-600"
                            : user.accountStatus === "suspended"
                              ? "text-yellow-600"
                              : user.accountStatus === "banned"
                                ? "text-red-600"
                                : "text-blue-600"
                        }`}
                      >
                        {user.accountStatus?.replace("_", " ").toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">Joined Date</p>
                      <p className="text-sm font-medium">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-xs text-gray-500">User ID</p>
                      <p className="text-sm font-medium">{user._id}</p>
                    </div>
                  </div>
                  {user.role === "driver" && (
                    <div className="flex items-center">
                      <Car className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-xs text-gray-500">Driver Status</p>
                        <Link
                          to={`/drivers/${user._id}`}
                          className="text-sm font-medium text-primary hover:text-primary-dark"
                        >
                          View Driver Details
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "rides" && (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Recent Rides</h2>
              <Link
                to={`/rides?${user.role === "driver" ? "driverId" : "riderId"}=${user._id}`}
                className="text-primary hover:text-primary-dark text-sm"
              >
                View All Rides
              </Link>
            </div>

            {rides.length === 0 ? (
              <div className="text-center py-6">
                <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No rides found</h3>
                <p className="mt-2 text-sm text-gray-500">This user hasn't taken any rides yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Ride ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Route
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Fare
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rides.map((ride) => (
                      <tr key={ride._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ride._id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{ride.pickupLocation?.address || "Unknown"} → </div>
                          <div className="text-sm text-gray-500">{ride.dropoffLocation?.address || "Unknown"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ride.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ride.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : ride.status === "cancelled"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {ride.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ride.fare?.amount ? `${ride.fare.amount} ${ride.fare.currency}` : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link to={`/rides/${ride._id}`} className="text-primary hover:text-primary-dark">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "support" && (
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">Support Tickets</h2>
              <Link to={`/support-tickets?userId=${user._id}`} className="text-primary hover:text-primary-dark text-sm">
                View All Tickets
              </Link>
            </div>

            {tickets.length === 0 ? (
              <div className="text-center py-6">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No support tickets found</h3>
                <p className="mt-2 text-sm text-gray-500">This user hasn't submitted any support tickets yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Ticket ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Issue Type
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets.map((ticket) => (
                      <tr key={ticket._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {ticket._id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ticket.issueType === "emergency" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {ticket.issueType.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 truncate max-w-xs">{ticket.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ticket.status === "open"
                                ? "bg-yellow-100 text-yellow-800"
                                : ticket.status === "resolved"
                                  ? "bg-green-100 text-green-800"
                                  : ticket.status === "closed"
                                    ? "bg-gray-100 text-gray-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {ticket.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link to={`/support-tickets/${ticket._id}`} className="text-primary hover:text-primary-dark">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDetails
