"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { toast } from "react-toastify"
import { Users, UserCheck, Car, Clock, AlertTriangle, Activity, DollarSign, TrendingUp } from "lucide-react"
import api from "../services/api"
import StatCard from "../components/dashboard/StatCard"
import RecentActivityCard from "../components/dashboard/RecentActivityCard"
import RevenueChart from "../components/dashboard/RevenueChart"
import RideMap from "../components/dashboard/RideMap"
import UserGrowthChart from "../components/dashboard/UserGrowthChart"
import RideDistributionChart from "../components/dashboard/RideDistributionChart"

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    totalRides: 0,
    activeDrivers: 0,
    pendingDriverApprovals: 0,
    openSupportTickets: 0,
    revenue: {
      daily: 0,
      weekly: 0,
      monthly: 0,
      yearly: 0,
    },
    growth: {
      users: 0,
      drivers: 0,
      rides: 0,
      revenue: 0,
    },
  })

  const [recentActivity, setRecentActivity] = useState({
    rides: [],
    users: [],
    supportTickets: [],
  })

  const [revenueData, setRevenueData] = useState([])
  const [revenuePeriod, setRevenuePeriod] = useState("week")
  const [revenueLoading, setRevenueLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [userStats, setUserStats] = useState(null)
  const [rideStats, setRideStats] = useState(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        const [statsResponse, activityResponse, userStatsResponse, rideStatsResponse] = await Promise.all([
          api.getDashboardOverview(),
          api.getRecentActivity(),
          api.getUserStats(),
          api.getRideStats(),
        ])

        setStats(statsResponse)
        setRecentActivity(activityResponse)
        setUserStats(userStatsResponse)
        setRideStats(rideStatsResponse)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setRevenueLoading(true)
        const response = await api.getRevenueStats(revenuePeriod)
        setRevenueData(response)
      } catch (error) {
        console.error("Error fetching revenue data:", error)
        toast.error("Failed to load revenue data")
      } finally {
        setRevenueLoading(false)
      }
    }

    fetchRevenueData()
  }, [revenuePeriod])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats.totalUsers.toLocaleString()}
              icon={<Users className="h-8 w-8 text-blue-500" />}
              change={stats.growth.users}
              linkTo="/users"
            />
            <StatCard
              title="Total Drivers"
              value={stats.totalDrivers.toLocaleString()}
              icon={<UserCheck className="h-8 w-8 text-green-500" />}
              change={stats.growth.drivers}
              linkTo="/drivers"
            />
            <StatCard
              title="Total Rides"
              value={stats.totalRides.toLocaleString()}
              icon={<Car className="h-8 w-8 text-purple-500" />}
              change={stats.growth.rides}
              linkTo="/rides"
            />
            <StatCard
              title="Monthly Revenue"
              value={`$${stats.revenue.monthly.toLocaleString()}`}
              icon={<DollarSign className="h-8 w-8 text-emerald-500" />}
              change={stats.growth.revenue}
              linkTo="/analytics/revenue"
            />
            <StatCard
              title="Active Drivers"
              value={stats.activeDrivers.toLocaleString()}
              icon={<Activity className="h-8 w-8 text-indigo-500" />}
              linkTo="/drivers?status=active"
            />
            <StatCard
              title="Pending Approvals"
              value={stats.pendingDriverApprovals}
              icon={<Clock className="h-8 w-8 text-yellow-500" />}
              linkTo="/driver-approvals"
              highlight={stats.pendingDriverApprovals > 0}
            />
            <StatCard
              title="Open Support Tickets"
              value={stats.openSupportTickets}
              icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
              linkTo="/support-tickets?status=open"
              highlight={stats.openSupportTickets > 0}
            />
            <StatCard
              title="Daily Revenue"
              value={`$${stats.revenue.daily.toLocaleString()}`}
              icon={<TrendingUp className="h-8 w-8 text-teal-500" />}
              linkTo="/analytics/revenue"
            />
          </div>

          {/* Revenue Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Revenue Overview</h2>
                <div className="flex space-x-2">
                  <button
                    className={`px-3 py-1 rounded-md text-sm ${
                      revenuePeriod === "week" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setRevenuePeriod("week")}
                  >
                    Week
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md text-sm ${
                      revenuePeriod === "month" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setRevenuePeriod("month")}
                  >
                    Month
                  </button>
                  <button
                    className={`px-3 py-1 rounded-md text-sm ${
                      revenuePeriod === "year" ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                    }`}
                    onClick={() => setRevenuePeriod("year")}
                  >
                    Year
                  </button>
                </div>
              </div>

              {revenueLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : (
                <RevenueChart data={revenueData} period={revenuePeriod} />
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">User Growth</h2>
                <Link to="/analytics/users" className="text-primary hover:text-primary-dark text-sm">
                  View Details
                </Link>
              </div>
              {userStats ? (
                <UserGrowthChart data={userStats.userGrowth} />
              ) : (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Maps and Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Live Ride Map</h2>
                <div className="flex items-center text-sm text-gray-500">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                  <span className="mr-3">Active Rides</span>
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                  <span>Available Drivers</span>
                </div>
              </div>
              <RideMap />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Ride Distribution</h2>
                <Link to="/analytics/rides" className="text-primary hover:text-primary-dark text-sm">
                  View Details
                </Link>
              </div>
              {rideStats ? (
                <RideDistributionChart data={rideStats.ridesByStatus} />
              ) : (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <RecentActivityCard
              title="Recent Rides"
              items={recentActivity.rides}
              icon={<Car className="h-5 w-5" />}
              renderItem={(ride) => (
                <div key={ride._id} className="mb-4 last:mb-0">
                  <Link to={`/rides/${ride._id}`} className="text-sm font-medium text-gray-900 hover:text-primary">
                    {ride.pickupLocation?.address} → {ride.dropoffLocation?.address}
                  </Link>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{new Date(ride.createdAt).toLocaleString()}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        ride.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : ride.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>
                </div>
              )}
              linkTo="/rides"
              linkText="View All Rides"
            />

            <RecentActivityCard
              title="New Users"
              items={recentActivity.users}
              icon={<Users className="h-5 w-5" />}
              renderItem={(user) => (
                <div key={user._id} className="mb-4 last:mb-0">
                  <Link to={`/users/${user._id}`} className="text-sm font-medium text-gray-900 hover:text-primary">
                    {user.name}
                  </Link>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleString()}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        user.role === "driver" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              )}
              linkTo="/users"
              linkText="View All Users"
            />

            <RecentActivityCard
              title="Support Tickets"
              items={recentActivity.supportTickets}
              icon={<AlertTriangle className="h-5 w-5" />}
              renderItem={(ticket) => (
                <div key={ticket._id} className="mb-4 last:mb-0">
                  <Link
                    to={`/support-tickets/${ticket._id}`}
                    className="text-sm font-medium text-gray-900 hover:text-primary"
                  >
                    {ticket.issueType.replace("_", " ")} - {ticket.description.substring(0, 30)}...
                  </Link>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleString()}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        ticket.status === "open"
                          ? "bg-red-100 text-red-800"
                          : ticket.status === "resolved"
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {ticket.status}
                    </span>
                  </div>
                </div>
              )}
              linkTo="/support-tickets"
              linkText="View All Tickets"
            />
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
