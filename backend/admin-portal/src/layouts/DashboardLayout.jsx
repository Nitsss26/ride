"use client"

import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, Car, Ticket, Settings, LogOut, Menu, X, FileCheck, UserCog } from "lucide-react"
import { useAuth } from "../context/AuthContext"

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/users", icon: Users },
    { name: "Drivers", href: "/drivers", icon: Car },
    { name: "Driver Approvals", href: "/driver-approvals", icon: FileCheck },
    { name: "Rides", href: "/rides", icon: Car },
    { name: "Support Tickets", href: "/support-tickets", icon: Ticket },
    // Only show Admin Users to superadmins
    ...(user?.role === "superadmin" ? [{ name: "Admin Users", href: "/admin-users", icon: UserCog }] : []),
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Mobile sidebar */}
      <div className={`md:hidden ${sidebarOpen ? "block" : "hidden"} fixed inset-0 z-40`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex flex-col max-w-xs w-full bg-white shadow-xl">
          <div className="h-0 flex-1 flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center">
                <img className="h-8 w-auto" src="https://i.ibb.co/1G1cSmdB/1747664312159.jpg" alt="RideVerse" />
                <span className="ml-2 text-xl font-bold text-primary">RideVerse</span>
              </div>
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-6 w-6 text-gray-500" />
              </button>
            </div>
            <nav className="flex-1 px-2 py-4 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    location.pathname === item.href
                      ? "bg-primary text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                >
                  <item.icon
                    className={`${
                      location.pathname === item.href ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                    } mr-4 h-6 w-6`}
                  />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={handleLogout}
              className="flex-shrink-0 group block w-full flex items-center text-red-600 hover:text-red-700"
            >
              <LogOut className="mr-4 h-6 w-6" />
              <span className="text-base font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            <div className="flex items-center h-16 flex-shrink-0 px-4 border-b border-gray-200">
              <img className="h-8 w-auto" src="https://i.ibb.co/1G1cSmdB/1747664312159.jpg" alt="RideVerse" />
              <span className="ml-2 text-xl font-bold text-primary">RideVerse</span>
            </div>
            <div className="flex-1 flex flex-col overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      location.pathname === item.href
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <item.icon
                      className={`${
                        location.pathname === item.href ? "text-white" : "text-gray-400 group-hover:text-gray-500"
                      } mr-3 h-5 w-5`}
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={handleLogout}
                className="flex-shrink-0 w-full group flex items-center text-red-600 hover:text-red-700"
              >
                <LogOut className="mr-3 h-5 w-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {/* Header */}
              <div className="md:flex md:items-center md:justify-between mb-4 hidden">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                    {navigation.find((item) => item.href === location.pathname)?.name || "Dashboard"}
                  </h2>
                </div>
                <div className="mt-4 flex md:mt-0 md:ml-4 items-center">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.name || user?.username}</p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  </div>
                  <div className="ml-3 relative">
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
                      {user?.name?.charAt(0) || user?.username?.charAt(0) || "A"}
                    </div>
                  </div>
                </div>
              </div>
              {/* Content */}
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
