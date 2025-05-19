"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { UserCog, Plus } from "lucide-react"
import api from "../services/api"
import { useAuth } from "../context/AuthContext"

const AdminUsers = () => {
  const { user: currentUser } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "admin",
    isActive: true,
  })

  useEffect(() => {
    fetchAdmins()
  }, [])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await api.getAdmins()
      setAdmins(response.data)
    } catch (error) {
      console.error("Error fetching admin users:", error)
      toast.error("Failed to load admin users")
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    if (!formData.username || !formData.password || !formData.name) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      await api.createAdmin(formData)
      toast.success("Admin user created successfully")
      setShowAddModal(false)
      resetForm()
      fetchAdmins()
    } catch (error) {
      console.error("Error creating admin user:", error)
      toast.error(error.response?.data?.message || "Failed to create admin user")
    }
  }

  const handleEditAdmin = async (e) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error("Name is required")
      return
    }

    try {
      await api.updateAdmin(selectedAdmin._id, formData)
      toast.success("Admin user updated successfully")
      setShowEditModal(false)
      resetForm()
      fetchAdmins()
    } catch (error) {
      console.error("Error updating admin user:", error)
      toast.error(error.response?.data?.message || "Failed to update admin user")
    }
  }

  const openEditModal = (admin) => {
    setSelectedAdmin(admin)
    setFormData({
      name: admin.name || "",
      email: admin.email || "",
      role: admin.role || "admin",
      isActive: admin.isActive !== false, // Default to true if not specified
      password: "", // Empty password means no change
    })
    setShowEditModal(true)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      email: "",
      role: "admin",
      isActive: true,
    })
    setSelectedAdmin(null)
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-primary text-white px-4 py-2 rounded-md flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Admin User
        </button>
      </div>

      {/* Admin Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium">Admin Users List</h2>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : admins.length === 0 ? (
          <div className="p-6 text-center">
            <UserCog className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No admin users found</h3>
            <p className="mt-2 text-sm text-gray-500">Add your first admin user to get started.</p>
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
                    Admin User
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
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">
                          {admin.name ? admin.name.charAt(0) : admin.username.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                          <div className="text-sm text-gray-500">
                            {admin.username} {admin.email ? `• ${admin.email}` : ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          admin.role === "superadmin" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          admin.isActive !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {admin.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {/* Only allow editing if current user is superadmin or if it's the user's own account */}
                      {(currentUser.role === "superadmin" || currentUser.id === admin._id) && (
                        <button onClick={() => openEditModal(admin)} className="text-primary hover:text-primary-dark">
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Admin User</h2>
            <form onSubmit={handleAddAdmin}>
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">
                  Add Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit Admin User</h2>
            <form onSubmit={handleEditAdmin}>
              <div className="mb-4">
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="edit-email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password (Leave blank to keep current)
                </label>
                <input
                  type="password"
                  id="edit-password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                />
              </div>
              {/* Only allow role change if current user is superadmin */}
              {currentUser.role === "superadmin" && (
                <div className="mb-4">
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    id="edit-role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              )}
              {/* Only allow status change if current user is superadmin and not editing themselves */}
              {currentUser.role === "superadmin" && currentUser.id !== selectedAdmin._id && (
                <div className="mb-4 flex items-center">
                  <input
                    type="checkbox"
                    id="edit-isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="edit-isActive" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-md">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
