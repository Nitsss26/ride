import axios from "axios"

const API_URL = import.meta.env.VITE_ADMIN_SERVICE_URL || "http://localhost:3009"

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor for adding the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired)
    if (error.response && error.response.status === 401) {
      // Clear localStorage and redirect to login
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// Helper to set auth token
const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common["Authorization"]
  }
}

// API service methods
export default {
  // Auth
  setAuthToken,
  login: (credentials) => api.post("/auth/login", credentials),

  // Users
  getUsers: (params) => api.get("/users", { params }),
  getUser: (userId) => api.get(`/users/${userId}`),
  updateUserStatus: (userId, status) => api.put(`/users/${userId}/status`, { accountStatus: status }),

  // Drivers
  getDrivers: (params) => api.get("/drivers", { params }),
  getDriver: (driverId) => api.get(`/drivers/${driverId}`),
  getDriverDocuments: (driverId) => api.get(`/drivers/${driverId}/documents`),
  getPendingDocuments: () => api.get("/drivers/documents/pending"),
  approveDocument: (documentId, notes) =>
    api.put(`/drivers/documents/${documentId}`, { status: "approved", reviewNotes: notes }),
  rejectDocument: (documentId, notes) =>
    api.put(`/drivers/documents/${documentId}`, { status: "rejected", reviewNotes: notes }),

  // Rides
  getRides: (params) => api.get("/rides", { params }),
  getRide: (rideId) => api.get(`/rides/${rideId}`),

  // Support Tickets
  getTickets: (params) => api.get("/support/tickets", { params }),
  getTicket: (ticketId) => api.get(`/support/tickets/${ticketId}`),
  updateTicket: (ticketId, data) => api.put(`/support/tickets/${ticketId}`, data),

  // Admin Users
  getAdmins: () => api.get("/admins"),
  createAdmin: (adminData) => api.post("/admins", adminData),
  updateAdmin: (adminId, adminData) => api.put(`/admins/${adminId}`, adminData),

  // Dashboard
  getDashboardOverview: () => api.get("/dashboard/overview"),
  getRecentActivity: () => api.get("/dashboard/recent-activity"),
  getRevenueStats: (period) => api.get("/dashboard/revenue", { params: { period } }),

  // Generic request methods
  get: (url, config) => api.get(url, config),
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
}
