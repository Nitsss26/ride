import React, { createContext, useContext, useEffect, useState } from "react"
import { login as loginApi, logout as logoutApi } from "../services/api"
import { useNavigate } from "react-router-dom"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load auth state from localStorage on mount
    const savedToken = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = async (credentials) => {
    try {
      const { token, user } = await loginApi(credentials)
      setToken(token)
      setUser(user)
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
      navigate("/") // Redirect to dashboard or home
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    try {
      await logoutApi()
    } catch (error) {
      // Handle logout API failure silently
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      navigate("/login")
    }
  }

  const isAuthenticated = !!token

  const hasRole = (roles) => {
    if (!user || !user.role) return false
    return Array.isArray(roles) ? roles.includes(user.role) : user.role === roles
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        hasRole,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
