"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { Search, Filter, User, ChevronLeft, ChevronRight } from "lucide-react"
import api from "../services/api"

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    role: "",
    status: "",
    search: "",
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  useEffect(() => {
    fetchUsers()
  }, [filters, pagination.page, pagination.limit])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.fetchUsers({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      })

      setUsers(response.data.users || response.data)
      if (response.data.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.pagination.total,
          pages: response.data.pagination.pages,
        }))
      }
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to load users")
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
    fetchUsers()
  }

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= pagination.pages) {
      setPagination((prev) => ({ ...prev, page: newPage }))
    }
  }

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await api.updateUserStatus(userId, newStatus)
      toast.success(`User status updated to ${newStatus}`)
      fetchUsers() // Refresh the list
    } catch (error) {
      console.error("Error updating user status:", error)
      toast.error("Failed to update user status")
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Users</h1>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Filters</h2>
        </div>
        <div className="p-4">
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={filters.role}
                onChange={handleFilterChange}
                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                <option value="">All Roles</option>
                <option value="rider">Rider</option>
                <option value="driver">Driver</option>
              </select>
            </div>
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
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="pending_verification">Pending Verification</option>
                <option value="pending_approval">Pending Approval</option>
              </select>
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
                  placeholder="Name, email, phone..."
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Filter className="h-4 w-4 inline mr-2" />
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium">Users List</h2>
          <span className="text-sm text-gray-500">
            Showing {users.length} of {pagination.total} users
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No users found</h3>
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
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
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
                    Joined
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          {user.name ? (
                            <span className="text-lg font-medium text-gray-700">{user.name.charAt(0)}</span>
                          ) : (
                            <User className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name || "N/A"}</div>
                          <div className="text-sm text-gray-500">ID: {user._id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone || "N/A"}</div>
                      <div className="text-sm text-gray-500">{user.email || "No email"}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === "driver" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                          user.accountStatus,
                        )}`}
                      >
                        {user.accountStatus?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2 justify-end">
                        <Link
                          to={`/users/${user._id}`}
                          className="text-primary hover:text-primary-dark bg-primary-50 px-3 py-1 rounded-md"
                        >
                          View
                        </Link>
                        <div className="relative group">
                          <button className="text-gray-600 hover:text-gray-900 bg-gray-100 px-3 py-1 rounded-md">
                            Status
                          </button>
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block z-10">
                            <div className="py-1">
                              {user.accountStatus !== "active" && (
                                <button
                                  onClick={() => handleStatusChange(user._id, "active")}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Activate
                                </button>
                              )}
                              {user.accountStatus !== "suspended" && (
                                <button
                                  onClick={() => handleStatusChange(user._id, "suspended")}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Suspend
                                </button>
                              )}
                              {user.accountStatus !== "banned" && (
                                <button
                                  onClick={() => handleStatusChange(user._id, "banned")}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                >
                                  Ban
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
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

export default Users
