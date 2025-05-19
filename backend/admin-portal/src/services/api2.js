import axios from "axios"

//const API_URL = import.meta.env.VITE_ADMIN_SERVICE_URL || "http://localhost:3009"
const API_URL = "http://82.29.164.244:3009"

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
  (error) => Promise.reject(error)
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  }
)

const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    delete api.defaults.headers.common["Authorization"]
  }
}

// 🟩 DUMMY IMPLEMENTATIONS FOR NOW
export const fetchDriverDetails = async (id) => {
  return { data: { id, name: "John Doe", status: "active" } }
}

export const fetchDriverDocuments = async (id) => {
  return { data: [{ id: 1, type: "License", status: "approved" }] }
}

export const updateDriverStatus = async (id, status) => {
  return { data: { success: true, status } }
}

export const fetchDrivers = async () => {
  return { data: [{ id: 1, name: "Driver A" }, { id: 2, name: "Driver B" }] }
}

export const updateAdminProfile = async (profile) => {
  return { data: { success: true, ...profile } }
}

export const updateAdminPassword = async (data) => {
  return { data: { success: true } }
}

export const fetchSupportTickets = async () => {
  return { data: [{ id: 1, subject: "Issue A" }, { id: 2, subject: "Issue B" }] }
}

export const fetchTicketDetails = async (id) => {
  return { data: { id, subject: "Test Ticket", messages: [] } }
}

export const updateTicketStatus = async (id, status) => {
  return { data: { success: true, id, status } }
}

export const addTicketReply = async (ticketId, message) => {
  return { data: { success: true, message } }
}

// 🟦 EXISTING EXPORT (default)
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
  approveDocument: (documentId, notes) => api.put(`/drivers/documents/${documentId}`, { status: "approved", reviewNotes: notes }),
  rejectDocument: (documentId, notes) => api.put(`/drivers/documents/${documentId}`, { status: "rejected", reviewNotes: notes }),

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
