import axios from "axios"

// Base URLs for different services
const API_BASE_URL = "http://82.29.164.244/"
const USER_SERVICE_URL = "http://82.29.164.244:3006"
const DRIVER_SERVICE_URL = "http://82.29.164.244:3001"
const RIDE_SERVICE_URL = "http://82.29.164.244:3000"
const SUPPORT_SERVICE_URL = "http://82.29.164.244:3007"
const ADMIN_SERVICE_URL = "http://82.29.164.244:3009"
const ANALYTICS_SERVICE_URL = `${API_BASE_URL}/analytics-service`

// Create axios instances for different services
const createAxiosInstance = (baseURL) => {
  const instance = axios.create({
    baseURL,
    headers: {
      "Content-Type": "application/json",
    },
    timeout: 10000,
  })

  // Request interceptor for adding auth token
  instance.interceptors.request.use(
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
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Handle 401 Unauthorized errors (token expired)
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
      return Promise.reject(error)
    },
  )

  return instance
}

const userService = createAxiosInstance(USER_SERVICE_URL)
const driverService = createAxiosInstance(DRIVER_SERVICE_URL)
const rideService = createAxiosInstance(RIDE_SERVICE_URL)
const supportService = createAxiosInstance(SUPPORT_SERVICE_URL)
const adminService = createAxiosInstance(ADMIN_SERVICE_URL)
const analyticsService = createAxiosInstance(ANALYTICS_SERVICE_URL)

// Auth APIs
export const login = async (credentials) => {
  try {
    const response = await adminService.post("/auth/login", credentials)
    return response.data
  } catch (error) {
    throw error
  }
}

export const logout = async () => {
  try {
    const response = await adminService.post("/auth/logout")
    return response.data
  } catch (error) {
    throw error
  }
}

// User Management APIs
export const fetchUsers = async (params = {}) => {
  try {
    const response = await userService.get("/users", { params })
    return response
  } catch (error) {
    throw error
  }
}

export const fetchUserDetails = async (userId) => {
  try {
    const response = await userService.get(`/users/${userId}`)
    return response
  } catch (error) {
    throw error
  }
}

export const updateUserStatus = async (userId, status) => {
  try {
    const response = await userService.put(`/users/${userId}/status`, { status })
    return response
  } catch (error) {
    throw error
  }
}

// Driver Management APIs
export const fetchDrivers = async (params = {}) => {
  try {
    const response = await driverService.get("/drivers", { params })
    return {
      data: response.data.drivers || response.data,
      totalPages: response.data.pagination?.totalPages || 1,
      totalCount: response.data.pagination?.total || response.data.length,
    }
  } catch (error) {
    throw error
  }
}

export const fetchDriverDetails = async (driverId) => {
  try {
    const response = await driverService.get(`/drivers/${driverId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateDriverStatus = async (driverId, status) => {
  try {
    const response = await driverService.put(`/drivers/${driverId}/status`, { status })
    return response.data
  } catch (error) {
    throw error
  }
}

export const fetchDriverDocuments = async (driverId) => {
  try {
    const response = await driverService.get(`/drivers/${driverId}/documents`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const fetchPendingDocuments = async () => {
  try {
    const response = await driverService.get("/documents/pending")
    return response.data
  } catch (error) {
    throw error
  }
}

export const approveDocument = async (documentId, notes) => {
  try {
    const response = await driverService.put(`/documents/${documentId}/approve`, { notes })
    return response.data
  } catch (error) {
    throw error
  }
}

export const rejectDocument = async (documentId, notes) => {
  try {
    const response = await driverService.put(`/documents/${documentId}/reject`, { notes })
    return response.data
  } catch (error) {
    throw error
  }
}

// Ride Management APIs
export const fetchRides = async (params = {}) => {
  try {
    const response = await rideService.get("/rides", { params })
    return {
      data: response.data.rides || response.data,
      totalPages: response.data.pagination?.totalPages || 1,
      totalCount: response.data.pagination?.total || response.data.length,
    }
  } catch (error) {
    throw error
  }
}

export const fetchRideDetails = async (rideId) => {
  try {
    const response = await rideService.get(`/rides/${rideId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateRideStatus = async (rideId, status) => {
  try {
    const response = await rideService.put(`/rides/${rideId}/status`, { status })
    return response.data
  } catch (error) {
    throw error
  }
}

// Support Ticket APIs
export const fetchSupportTickets = async (params = {}) => {
  try {
    const response = await supportService.get("/tickets", { params })
    return {
      data: response.data.tickets || response.data,
      totalPages: response.data.pagination?.totalPages || 1,
      totalCount: response.data.pagination?.total || response.data.length,
    }
  } catch (error) {
    throw error
  }
}

export const fetchTicketDetails = async (ticketId) => {
  try {
    const response = await supportService.get(`/tickets/${ticketId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateTicketStatus = async (ticketId, status) => {
  try {
    const response = await supportService.put(`/tickets/${ticketId}`, { status })
    return response.data
  } catch (error) {
    throw error
  }
}

export const addTicketReply = async (ticketId, replyData) => {
  try {
    const response = await supportService.post(`/tickets/${ticketId}/responses`, replyData)
    return response.data
  } catch (error) {
    throw error
  }
}

// Admin Management APIs
export const fetchAdmins = async () => {
  try {
    const response = await adminService.get("/admins")
    return response.data
  } catch (error) {
    throw error
  }
}

export const createAdmin = async (adminData) => {
  try {
    const response = await adminService.post("/admins", adminData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateAdmin = async (adminId, adminData) => {
  try {
    const response = await adminService.put(`/admins/${adminId}`, adminData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const deleteAdmin = async (adminId) => {
  try {
    const response = await adminService.delete(`/admins/${adminId}`)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateAdminProfile = async (profileData) => {
  try {
    const response = await adminService.put("/profile", profileData)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateAdminPassword = async (passwordData) => {
  try {
    const response = await adminService.put("/password", passwordData)
    return response.data
  } catch (error) {
    throw error
  }
}

// Analytics APIs
export const getDashboardOverview = async () => {
  try {
    const response = await analyticsService.get("/dashboard/overview")
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      totalUsers: 12458,
      totalDrivers: 3245,
      totalRides: 28976,
      activeDrivers: 1876,
      pendingDriverApprovals: 43,
      openSupportTickets: 28,
      revenue: {
        daily: 8750,
        weekly: 52480,
        monthly: 215690,
        yearly: 2568450,
      },
      growth: {
        users: 12.5,
        drivers: 8.3,
        rides: 15.2,
        revenue: 18.7,
      },
    }
  }
}

export const getRecentActivity = async () => {
  try {
    const response = await analyticsService.get("/dashboard/recent-activity")
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      rides: [
        {
          _id: "r1",
          riderId: "u1",
          driverId: "d1",
          pickupLocation: { address: "123 Main St" },
          dropoffLocation: { address: "456 Elm St" },
          status: "completed",
          fare: { amount: 25.5, currency: "USD" },
          createdAt: new Date().toISOString(),
        },
        {
          _id: "r2",
          riderId: "u2",
          driverId: "d2",
          pickupLocation: { address: "789 Oak Ave" },
          dropoffLocation: { address: "101 Pine Rd" },
          status: "in-progress",
          fare: { amount: 18.75, currency: "USD" },
          createdAt: new Date().toISOString(),
        },
        {
          _id: "r3",
          riderId: "u3",
          driverId: "d3",
          pickupLocation: { address: "202 Maple Dr" },
          dropoffLocation: { address: "303 Cedar Ln" },
          status: "cancelled",
          fare: { amount: 0, currency: "USD" },
          createdAt: new Date().toISOString(),
        },
      ],
      users: [
        {
          _id: "u1",
          name: "John Smith",
          email: "john@example.com",
          role: "rider",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "u2",
          name: "Jane Doe",
          email: "jane@example.com",
          role: "rider",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "d1",
          name: "Mike Johnson",
          email: "mike@example.com",
          role: "driver",
          createdAt: new Date().toISOString(),
        },
      ],
      supportTickets: [
        {
          _id: "t1",
          userId: "u1",
          issueType: "payment_dispute",
          description: "I was charged incorrectly for my last ride",
          status: "open",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "t2",
          userId: "d1",
          issueType: "app_bug",
          description: "The app crashes when I try to start a ride",
          status: "in-progress",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "t3",
          userId: "u2",
          issueType: "driver_behavior",
          description: "The driver was rude and took a longer route",
          status: "resolved",
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }
}

export const getRevenueStats = async (period = "week") => {
  try {
    const response = await analyticsService.get(`/dashboard/revenue?period=${period}`)
    return response.data
  } catch (error) {
    // Return dummy data for development
    const dummyData = []
    const today = new Date()

    if (period === "week") {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        dummyData.push({
          date: date.toISOString().split("T")[0],
          amount: Math.floor(Math.random() * 5000) + 3000,
        })
      }
    } else if (period === "month") {
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        dummyData.push({
          date: date.toISOString().split("T")[0],
          amount: Math.floor(Math.random() * 5000) + 3000,
        })
      }
    } else if (period === "year") {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(today)
        date.setMonth(date.getMonth() - i)
        dummyData.push({
          date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
          amount: Math.floor(Math.random() * 50000) + 30000,
        })
      }
    }

    return dummyData
  }
}

export const getUserStats = async (params = {}) => {
  try {
    const response = await analyticsService.get("/users/stats", { params })
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      userGrowth: [
        { date: "2023-01", count: 1250 },
        { date: "2023-02", count: 1380 },
        { date: "2023-03", count: 1490 },
        { date: "2023-04", count: 1620 },
        { date: "2023-05", count: 1780 },
        { date: "2023-06", count: 1950 },
      ],
      usersByRegion: [
        { region: "North America", count: 5240 },
        { region: "Europe", count: 3180 },
        { region: "Asia", count: 2760 },
        { region: "South America", count: 980 },
        { region: "Africa", count: 540 },
        { region: "Australia", count: 320 },
      ],
      usersByDevice: [
        { device: "iOS", count: 6540 },
        { device: "Android", count: 5420 },
        { device: "Web", count: 980 },
      ],
      activeUsers: {
        daily: 3250,
        weekly: 7840,
        monthly: 10580,
      },
    }
  }
}

export const getDriverStats = async (params = {}) => {
  try {
    const response = await analyticsService.get("/drivers/stats", { params })
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      driverGrowth: [
        { date: "2023-01", count: 320 },
        { date: "2023-02", count: 380 },
        { date: "2023-03", count: 420 },
        { date: "2023-04", count: 490 },
        { date: "2023-05", count: 540 },
        { date: "2023-06", count: 610 },
      ],
      driversByRegion: [
        { region: "North America", count: 1240 },
        { region: "Europe", count: 980 },
        { region: "Asia", count: 760 },
        { region: "South America", count: 320 },
        { region: "Africa", count: 180 },
        { region: "Australia", count: 120 },
      ],
      driverRatings: [
        { rating: "5", count: 1850 },
        { rating: "4", count: 980 },
        { rating: "3", count: 320 },
        { rating: "2", count: 80 },
        { rating: "1", count: 15 },
      ],
      activeDrivers: {
        daily: 980,
        weekly: 1840,
        monthly: 2580,
      },
    }
  }
}

export const getRideStats = async (params = {}) => {
  try {
    const response = await analyticsService.get("/rides/stats", { params })
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      rideGrowth: [
        { date: "2023-01", count: 3250 },
        { date: "2023-02", count: 3580 },
        { date: "2023-03", count: 4120 },
        { date: "2023-04", count: 4680 },
        { date: "2023-05", count: 5240 },
        { date: "2023-06", count: 5780 },
      ],
      ridesByRegion: [
        { region: "North America", count: 12540 },
        { region: "Europe", count: 8760 },
        { region: "Asia", count: 6320 },
        { region: "South America", count: 2180 },
        { region: "Africa", count: 980 },
        { region: "Australia", count: 720 },
      ],
      ridesByStatus: [
        { status: "completed", count: 25840 },
        { status: "cancelled", count: 2180 },
        { status: "in-progress", count: 980 },
      ],
      peakHours: [
        { hour: "00:00", count: 320 },
        { hour: "01:00", count: 180 },
        { hour: "02:00", count: 120 },
        { hour: "03:00", count: 80 },
        { hour: "04:00", count: 60 },
        { hour: "05:00", count: 120 },
        { hour: "06:00", count: 280 },
        { hour: "07:00", count: 780 },
        { hour: "08:00", count: 1580 },
        { hour: "09:00", count: 1280 },
        { hour: "10:00", count: 980 },
        { hour: "11:00", count: 1120 },
        { hour: "12:00", count: 1380 },
        { hour: "13:00", count: 1240 },
        { hour: "14:00", count: 980 },
        { hour: "15:00", count: 1080 },
        { hour: "16:00", count: 1580 },
        { hour: "17:00", count: 2180 },
        { hour: "18:00", count: 2480 },
        { hour: "19:00", count: 1980 },
        { hour: "20:00", count: 1580 },
        { hour: "21:00", count: 1280 },
        { hour: "22:00", count: 980 },
        { hour: "23:00", count: 580 },
      ],
    }
  }
}

export const getRevenueAnalytics = async (params = {}) => {
  try {
    const response = await analyticsService.get("/revenue/analytics", { params })
    return response.data
  } catch (error) {
    // Return dummy data for development
    return {
      revenueGrowth: [
        { date: "2023-01", amount: 125000 },
        { date: "2023-02", amount: 138000 },
        { date: "2023-03", amount: 149000 },
        { date: "2023-04", amount: 162000 },
        { date: "2023-05", amount: 178000 },
        { date: "2023-06", amount: 195000 },
      ],
      revenueByRegion: [
        { region: "North America", amount: 524000 },
        { region: "Europe", amount: 318000 },
        { region: "Asia", amount: 276000 },
        { region: "South America", amount: 98000 },
        { region: "Africa", amount: 54000 },
        { region: "Australia", amount: 32000 },
      ],
      revenueByPaymentMethod: [
        { method: "Credit Card", amount: 654000 },
        { method: "Debit Card", amount: 342000 },
        { method: "Digital Wallet", amount: 198000 },
        { method: "Cash", amount: 108000 },
      ],
      averageFare: {
        overall: 22.5,
        byRegion: [
          { region: "North America", amount: 25.8 },
          { region: "Europe", amount: 22.4 },
          { region: "Asia", amount: 18.6 },
          { region: "South America", amount: 15.2 },
          { region: "Africa", amount: 12.8 },
          { region: "Australia", amount: 28.4 },
        ],
      },
    }
  }
}

// Helper function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem("token", token)
    userService.defaults.headers.common["Authorization"] = `Bearer ${token}`
    driverService.defaults.headers.common["Authorization"] = `Bearer ${token}`
    rideService.defaults.headers.common["Authorization"] = `Bearer ${token}`
    supportService.defaults.headers.common["Authorization"] = `Bearer ${token}`
    adminService.defaults.headers.common["Authorization"] = `Bearer ${token}`
    analyticsService.defaults.headers.common["Authorization"] = `Bearer ${token}`
  } else {
    localStorage.removeItem("token")
    delete userService.defaults.headers.common["Authorization"]
    delete driverService.defaults.headers.common["Authorization"]
    delete rideService.defaults.headers.common["Authorization"]
    delete supportService.defaults.headers.common["Authorization"]
    delete adminService.defaults.headers.common["Authorization"]
    delete analyticsService.defaults.headers.common["Authorization"]
  }
}

// Export a default object with all APIs
export default {
  setAuthToken,
  login,
  logout,
  fetchUsers,
  fetchUserDetails,
  updateUserStatus,
  fetchDrivers,
  fetchDriverDetails,
  updateDriverStatus,
  fetchDriverDocuments,
  fetchPendingDocuments,
  approveDocument,
  rejectDocument,
  fetchRides,
  fetchRideDetails,
  updateRideStatus,
  fetchSupportTickets,
  fetchTicketDetails,
  updateTicketStatus,
  addTicketReply,
  fetchAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  updateAdminProfile,
  updateAdminPassword,
  getDashboardOverview,
  getRecentActivity,
  getRevenueStats,
  getUserStats,
  getDriverStats,
  getRideStats,
  getRevenueAnalytics,
}
