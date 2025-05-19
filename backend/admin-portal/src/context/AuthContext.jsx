"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "react-toastify"
 import * as api from "../services/api"
//import { login as loginApi } from "../services/api"

const AuthContext = createContext()

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem("token") || null)
  const [loading, setLoading] = useState(true)

  // Check if user is authenticated
  const isAuthenticated = !!token

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("token")
      const storedUser = localStorage.getItem("user")

      if (storedToken && storedUser) {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
        api.setAuthToken(storedToken)
      }

      setLoading(false)
    }

    initAuth()
  }, [])

  // Login function
  const login = async (username, password) => {
    try {
      setLoading(true)
      // const response = await api.post("/auth/login", { username, password })
//const response = await loginApi({ username, password })
const response = await api.login({ username, password })      
const { token, user } = response
//const { token, user } = response.data

      // Save to state
      setToken(token)
      setUser(user)

      // Save to localStorage
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))

      // Set token for API requests
      api.setAuthToken(token)

      toast.success("Login successful!")
      return true
    } catch (error) {
      console.error("Login error:", error)
      toast.error(error.response?.data?.message || "Login failed")
      return false
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = () => {
    // Clear state
    setToken(null)
    setUser(null)

    // Clear localStorage
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    // Clear API token
    api.setAuthToken(null)

    toast.info("Logged out successfully")
  }

  // Update user profile
  const updateProfile = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem("user", JSON.stringify(updatedUser))
  }

  const authContextValue = {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    updateProfile,
  }

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>
}
