"use client"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { ToastContainer } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

// Layouts
import DashboardLayout from "./layouts/DashboardLayout"
import AuthLayout from "./layouts/AuthLayout"

// Pages
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Users from "./pages/Users"
import UserDetails from "./pages/UserDetails"
import Drivers from "./pages/Drivers"
import DriverDetails from "./pages/DriverDetails"
import DriverApprovals from "./pages/DriverApprovals"
import Rides from "./pages/Rides"
import RideDetails from "./pages/RideDetails"
import SupportTickets from "./pages/SupportTickets"
import TicketDetails from "./pages/TicketDetails"
import AdminUsers from "./pages/AdminUsers"
import Settings from "./pages/Settings"
import NotFound from "./pages/NotFound"

// Context
import { AuthProvider, useAuth } from "./context/AuthContext"

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// SuperAdmin Only Route
const SuperAdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role !== "superadmin") {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <Login />
            </AuthLayout>
          }
        />

        {/* Dashboard Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* User Management */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Users />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users/:userId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <UserDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Driver Management */}
        <Route
          path="/drivers"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Drivers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/drivers/:driverId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DriverDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/driver-approvals"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DriverApprovals />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Ride Management */}
        <Route
          path="/rides"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Rides />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rides/:rideId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <RideDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Support Tickets */}
        <Route
          path="/support-tickets"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SupportTickets />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/support-tickets/:ticketId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TicketDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Admin Users - SuperAdmin Only */}
        <Route
          path="/admin-users"
          element={
            <SuperAdminRoute>
              <DashboardLayout>
                <AdminUsers />
              </DashboardLayout>
            </SuperAdminRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-right" autoClose={3000} />
    </AuthProvider>
  )
}

export default App
