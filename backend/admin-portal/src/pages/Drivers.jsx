"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { ChevronLeft, ChevronRight, Search, Filter, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { fetchDrivers } from "../services/api"

const Drivers = () => {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetchDrivers({
          page,
          limit: 10,
          search: searchTerm,
          status: statusFilter !== "all" ? statusFilter : undefined,
          sortBy,
          sortOrder,
        })

        // Map the response data to handle vehicle JSON string and status
        const mappedDrivers = response.data.map(driver => {
          let vehicleData = {}
          try {
            vehicleData = typeof driver.vehicle === "string" ? JSON.parse(driver.vehicle) : driver.vehicle || {}
          } catch (error) {
            console.error(`Failed to parse vehicle data for driver ${driver._id}:`, error)
            vehicleData = {}
          }

          // Determine status based on isOnline and currentStatus
          let uiStatus = "unknown"
          if (driver.isOnline) {
            uiStatus = driver.currentStatus || "available"
          } else {
            uiStatus = "offline"
          }

          return {
            ...driver,
            vehicle: vehicleData,
            status: uiStatus,
          }
        })

        setDrivers(mappedDrivers)
        setTotalPages(response.totalPages)
      } catch (error) {
        console.error("Failed to fetch drivers:", error)
        setError(error.message || "Failed to load drivers. Please try again.")
        toast.error(error.message || "Failed to load drivers. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadDrivers()
  }, [page, searchTerm, statusFilter, sortBy, sortOrder])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1) // Reset to first page on new search
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "available":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Available
          </span>
        )
      case "busy":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Busy
          </span>
        )
      case "offline":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Offline
          </span>
        )
      case "en_route_pickup":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            En Route
          </span>
        )
      case "at_pickup":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            At Pickup
          </span>
        )
      case "on_ride":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            On Ride
          </span>
        )
      case "driver_arrived":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Arrived
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        )
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
        <Link
          to="/driver-approvals"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Driver Approvals
        </Link>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </form>

        <div className="flex gap-4">
          <div className="relative">
            <select
              className="appearance-none pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
              <option value="en_route_pickup">En Route</option>
              <option value="at_pickup">At Pickup</option>
              <option value="on_ride">On Ride</option>
              <option value="driver_arrived">Arrived</option>
            </select>
            <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative">
            <select
              className="appearance-none px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split("-")
                setSortBy(newSortBy)
                setSortOrder(newSortOrder)
                setPage(1)
              }}
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="rating-desc">Highest Rating</option>
              <option value="rating-asc">Lowest Rating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              const loadDrivers = async () => {
                try {
                  setLoading(true)
                  setError(null)
                  const response = await fetchDrivers({
                    page,
                    limit: 10,
                    search: searchTerm,
                    status: statusFilter !== "all" ? statusFilter : undefined,
                    sortBy,
                    sortOrder,
                  })

                  const mappedDrivers = response.data.map(driver => {
                    let vehicleData = {}
                    try {
                      vehicleData = typeof driver.vehicle === "string" ? JSON.parse(driver.vehicle) : driver.vehicle || {}
                    } catch (error) {
                      console.error(`Failed to parse vehicle data for driver ${driver._id}:`, error)
                      vehicleData = {}
                    }

                    let uiStatus = "unknown"
                    if (driver.isOnline) {
                      uiStatus = driver.currentStatus || "available"
                    } else {
                      uiStatus = "offline"
                    }

                    return {
                      ...driver,
                      vehicle: vehicleData,
                      status: uiStatus,
                    }
                  })

                  setDrivers(mappedDrivers)
                  setTotalPages(response.totalPages)
                } catch (error) {
                  console.error("Failed to fetch drivers:", error)
                  setError(error.message || "Failed to load drivers. Please try again.")
                  toast.error(error.message || "Failed to load drivers. Please try again.")
                } finally {
                  setLoading(false)
                }
              }
              loadDrivers()
            }}
            className="ml-2 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Drivers Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading drivers...</p>
          </div>
        ) : drivers.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-600">No drivers found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rides
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {drivers.map((driver) => (
                  <tr key={driver._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {driver.profileImage ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={driver.profileImage || "/placeholder.svg"}
                              alt={driver.name}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {driver.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                          <div className="text-sm text-gray-500">{driver.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {driver.phone || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {driver.vehicle && Object.keys(driver.vehicle).length > 0 ? (
                        <div className="text-sm text-gray-900">
                          {driver.vehicle.make || "N/A"} ({driver.vehicle.type || "N/A"})
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No vehicle info</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(driver.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900 mr-1">
                          {driver.rating ? driver.rating.toFixed(1) : "N/A"}
                        </span>
                        {driver.rating && (
                          <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{driver.ratingCount || 0} ratings</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{driver.totalRides || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(driver.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/drivers/${driver._id}`} className="text-blue-600 hover:text-blue-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === 1
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  page === totalPages
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      page === 1 ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  {/* Page numbers */}
                  {[...Array(totalPages).keys()].map((pageNum) => {
                    const pageNumber = pageNum + 1
                    // Show current page, first, last, and pages around current
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= page - 1 && pageNumber <= page + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          onClick={() => setPage(pageNumber)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === pageNumber
                              ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          }`}
                        >
                          {pageNumber}
                        </button>
                      )
                    }

                    // Show ellipsis for gaps
                    if ((pageNumber === 2 && page > 3) || (pageNumber === totalPages - 1 && page < totalPages - 2)) {
                      return (
                        <span
                          key={pageNumber}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                        >
                          ...
                        </span>
                      )
                    }

                    return null
                  })}

                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      page === totalPages ? "text-gray-300 cursor-not-allowed" : "text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Drivers
