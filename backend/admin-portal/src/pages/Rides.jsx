"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { Search, Filter, Car, ChevronLeft, ChevronRight } from "lucide-react"
import api from "../services/api"

const Rides = () => {
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: "",
    driverId: "",
    riderId: "",
    fromDate: "",
    toDate: "",
    search: "",
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchRides()
  }, [filters, pagination.page, pagination.limit])

  const fetchRides = async () => {
    try {
      setLoading(true)
      const response = await api.getRides({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      })

      setRides(response.data.rides || response.data)
      if (response.data.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages,
        }))
      }
    } catch (error) {
      console.error("Error fetching rides:", error)
      toast.error("Failed to load rides")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({ ...prev, [name]: value }))
    setPagination((prev) => ({ ...prev, page: 1 })) // Reset to first page on filter change
  }

  const handleSearch = (e) => {
    e.preventDefault()
    fetchRides()
  }

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Rides</h1>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Filters</h2>
        </div>
        <div className="p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="in-progress">In Progress</option>
                <option value="driver-assigned">Driver Assigned</option>
                <option value="driver-arrived">Driver Arrived</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div>
              <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                id="fromDate"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                id="toDate"
                name="toDate"
                value={filters.toDate}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="driverId" className="block text-sm font-medium text-gray-700 mb-1">
                Driver ID
              </label>
              <input
                type="text"
                id="driverId"
                name="driverId"
                value={filters.driverId}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                placeholder="Enter driver ID"
              />
            </div>
            <div>
              <label htmlFor="riderId" className="block text-sm font-medium text-gray-700 mb-1">
                Rider ID
              </label>
              <input
                type="text"
                id="riderId"
                name="riderId"
                value={filters.riderId}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                placeholder="Enter rider ID"
              />
            </div>
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Ride ID, location..."
                />
              </div>
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Filter className="h-4 w-4 inline mr-2" />
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Rides Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Rides List</h2>
          <span className="text-sm text-gray-500">
            Showing {rides.length} of {pagination.total} rides
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : rides.length === 0 ? (
          <div className="p-6 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No rides found</h3>
            <p className="mt-2 text-sm text-gray-500">Try adjusting your filters to find what you're looking for.</p>
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
                    Users
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ride._id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{ride.pickupLocation?.address || "Unknown"}</div>
                      <div className="text-sm text-gray-500">to {ride.dropoffLocation?.address || "Unknown"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <Link to={`/users/${ride.riderId}`} className="text-primary hover:text-primary-dark">
                          Rider: {ride.riderId?.substring(0, 8)}...
                        </Link>
                      </div>
                      {ride.driverId && (
                        <div className="text-sm text-gray-500">
                          <Link to={`/drivers/${ride.driverId}`} className="text-primary hover:text-primary-dark">
                            Driver: {ride.driverId?.substring(0, 8)}...
                          </Link>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(ride.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          ride.status,
                        )}`}
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

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                <span className="font-medium">{pagination.total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    pagination.page === 1
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" />
                </button>
                {/* Page numbers */}
                {[...Array(pagination.pages).keys()].map((x) => {
                  const pageNumber = x + 1
                  // Show current page, first, last, and pages around current
                  if (
                    pageNumber === 1 ||
                    pageNumber === pagination.pages ||
                    (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === pageNumber
                            ? "z-10 bg-primary border-primary text-white"
                            : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    )
                  }
                  // Show ellipsis for gaps
                  if (
                    (pageNumber === 2 && pagination.page > 3) ||
                    (pageNumber === pagination.pages - 1 && pagination.page < pagination.pages - 2)
                  ) {
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
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    pagination.page === pagination.pages
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-gray-500 hover:bg-gray-50 cursor-pointer"
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Rides
