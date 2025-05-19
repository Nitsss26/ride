"use client"

import { useState } from "react"
import { toast } from "react-toastify"
import {
  User,
  Lock,
  Bell,
  Palette,
  Shield,
  CreditCard,
  HelpCircle,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react"
import { updateAdminProfile, updateAdminPassword } from "../services/api"
import { useAuth } from "../context/AuthContext"

const Settings = () => {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    bio: user?.bio || "",
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newUserSignups: true,
    newDriverSignups: true,
    supportTickets: true,
    rideIssues: true,
    systemAlerts: true,
    marketingEmails: false,
  })

  // Appearance settings state
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    sidebarCollapsed: false,
    denseMode: false,
    fontSize: "medium",
  })

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNotificationChange = (e) => {
    const { name, checked } = e.target
    setNotificationSettings((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAppearanceChange = (e) => {
    const { name, value, type, checked } = e.target
    setAppearanceSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const response = await updateAdminProfile(profileForm)
      updateUser({ ...user, ...profileForm })
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    try {
      setSaving(true)
      await updateAdminPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      })

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })

      toast.success("Password updated successfully")
    } catch (error) {
      console.error("Error updating password:", error)
      toast.error("Failed to update password. Please check your current password.")
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      // In a real implementation, you would save these settings to the server
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      toast.success("Notification settings updated successfully")
    } catch (error) {
      console.error("Error updating notification settings:", error)
      toast.error("Failed to update notification settings")
    } finally {
      setSaving(false)
    }
  }

  const handleAppearanceSubmit = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      // In a real implementation, you would save these settings to the server
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API call
      toast.success("Appearance settings updated successfully")
    } catch (error) {
      console.error("Error updating appearance settings:", error)
      toast.error("Failed to update appearance settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "profile" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            <User className="h-5 w-5 inline mr-2" />
            Profile
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "password" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("password")}
          >
            <Lock className="h-5 w-5 inline mr-2" />
            Password
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "notifications"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            <Bell className="h-5 w-5 inline mr-2" />
            Notifications
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "appearance"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("appearance")}
          >
            <Palette className="h-5 w-5 inline mr-2" />
            Appearance
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "security" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("security")}
          >
            <Shield className="h-5 w-5 inline mr-2" />
            Security
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "billing" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("billing")}
          >
            <CreditCard className="h-5 w-5 inline mr-2" />
            Billing
          </button>
          <button
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === "help" ? "border-b-2 border-primary text-primary" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("help")}
          >
            <HelpCircle className="h-5 w-5 inline mr-2" />
            Help
          </button>
        </div>

        <div className="p-6">
          {/* Profile Settings */}
          {activeTab === "profile" && (
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-3xl font-bold mr-6">
                    {profileForm.name ? profileForm.name.charAt(0).toUpperCase() : "A"}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Profile Picture</h3>
                    <p className="text-sm text-gray-500 mb-2">
                      This will be displayed on your profile and throughout the admin portal.
                    </p>
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 hover:bg-gray-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      id="jobTitle"
                      name="jobTitle"
                      value={profileForm.jobTitle}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={profileForm.department}
                      onChange={handleProfileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows={4}
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                    placeholder="Tell us a little about yourself"
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Password Settings */}
          {activeTab === "password" && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary pr-10"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">Password must be at least 8 characters long.</p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Notification Settings */}
          {activeTab === "notifications" && (
            <form onSubmit={handleNotificationSubmit}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="emailNotifications"
                          name="emailNotifications"
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="emailNotifications" className="font-medium text-gray-700">
                          Email Notifications
                        </label>
                        <p className="text-gray-500">Receive notifications via email.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="pushNotifications"
                          name="pushNotifications"
                          type="checkbox"
                          checked={notificationSettings.pushNotifications}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="pushNotifications" className="font-medium text-gray-700">
                          Push Notifications
                        </label>
                        <p className="text-gray-500">Receive push notifications in your browser.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="newUserSignups"
                          name="newUserSignups"
                          type="checkbox"
                          checked={notificationSettings.newUserSignups}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="newUserSignups" className="font-medium text-gray-700">
                          New User Signups
                        </label>
                        <p className="text-gray-500">Get notified when new users register.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="newDriverSignups"
                          name="newDriverSignups"
                          type="checkbox"
                          checked={notificationSettings.newDriverSignups}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="newDriverSignups" className="font-medium text-gray-700">
                          New Driver Signups
                        </label>
                        <p className="text-gray-500">Get notified when new drivers register.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="supportTickets"
                          name="supportTickets"
                          type="checkbox"
                          checked={notificationSettings.supportTickets}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="supportTickets" className="font-medium text-gray-700">
                          Support Tickets
                        </label>
                        <p className="text-gray-500">Get notified about new and updated support tickets.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="rideIssues"
                          name="rideIssues"
                          type="checkbox"
                          checked={notificationSettings.rideIssues}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="rideIssues" className="font-medium text-gray-700">
                          Ride Issues
                        </label>
                        <p className="text-gray-500">Get notified about ride cancellations and disputes.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="systemAlerts"
                          name="systemAlerts"
                          type="checkbox"
                          checked={notificationSettings.systemAlerts}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="systemAlerts" className="font-medium text-gray-700">
                          System Alerts
                        </label>
                        <p className="text-gray-500">Get notified about system performance and issues.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="marketingEmails"
                          name="marketingEmails"
                          type="checkbox"
                          checked={notificationSettings.marketingEmails}
                          onChange={handleNotificationChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="marketingEmails" className="font-medium text-gray-700">
                          Marketing Emails
                        </label>
                        <p className="text-gray-500">Receive marketing and promotional emails.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Appearance Settings */}
          {activeTab === "appearance" && (
            <form onSubmit={handleAppearanceSubmit}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div
                      className={`border rounded-lg p-4 cursor-pointer ${
                        appearanceSettings.theme === "light"
                          ? "border-primary ring-2 ring-primary ring-opacity-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setAppearanceSettings((prev) => ({ ...prev, theme: "light" }))}
                    >
                      <div className="h-20 bg-white border border-gray-200 rounded-md mb-2"></div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={appearanceSettings.theme === "light"}
                          onChange={handleAppearanceChange}
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">Light</label>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer ${
                        appearanceSettings.theme === "dark"
                          ? "border-primary ring-2 ring-primary ring-opacity-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setAppearanceSettings((prev) => ({ ...prev, theme: "dark" }))}
                    >
                      <div className="h-20 bg-gray-800 border border-gray-700 rounded-md mb-2"></div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={appearanceSettings.theme === "dark"}
                          onChange={handleAppearanceChange}
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">Dark</label>
                      </div>
                    </div>

                    <div
                      className={`border rounded-lg p-4 cursor-pointer ${
                        appearanceSettings.theme === "system"
                          ? "border-primary ring-2 ring-primary ring-opacity-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setAppearanceSettings((prev) => ({ ...prev, theme: "system" }))}
                    >
                      <div className="h-20 bg-gradient-to-r from-white to-gray-800 border border-gray-200 rounded-md mb-2"></div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="theme"
                          value="system"
                          checked={appearanceSettings.theme === "system"}
                          onChange={handleAppearanceChange}
                          className="h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">System</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Options</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="sidebarCollapsed"
                          name="sidebarCollapsed"
                          type="checkbox"
                          checked={appearanceSettings.sidebarCollapsed}
                          onChange={handleAppearanceChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="sidebarCollapsed" className="font-medium text-gray-700">
                          Collapsed Sidebar
                        </label>
                        <p className="text-gray-500">Use a compact sidebar to maximize screen space.</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="denseMode"
                          name="denseMode"
                          type="checkbox"
                          checked={appearanceSettings.denseMode}
                          onChange={handleAppearanceChange}
                          className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor="denseMode" className="font-medium text-gray-700">
                          Dense Mode
                        </label>
                        <p className="text-gray-500">Reduce padding and spacing throughout the interface.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Text Size</h3>
                  <div className="max-w-md">
                    <select
                      id="fontSize"
                      name="fontSize"
                      value={appearanceSettings.fontSize}
                      onChange={handleAppearanceChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium (Default)</option>
                      <option value="large">Large</option>
                      <option value="x-large">Extra Large</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Security Settings */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Enable Two-Factor Authentication
                </button>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Login Sessions</h3>
                <p className="text-sm text-gray-500 mb-4">
                  These are the devices that are currently logged into your account.
                </p>
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Current Session</p>
                        <p className="text-xs text-gray-500">Chrome on Windows • New York, USA</p>
                        <p className="text-xs text-gray-500">IP: 192.168.1.1 • Last active: Just now</p>
                      </div>
                      <div className="flex items-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Safari on MacOS</p>
                        <p className="text-xs text-gray-500">San Francisco, USA</p>
                        <p className="text-xs text-gray-500">IP: 192.168.1.2 • Last active: 2 days ago</p>
                      </div>
                      <div>
                        <button type="button" className="text-sm text-red-600 hover:text-red-800 font-medium">
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Firefox on Android</p>
                        <p className="text-xs text-gray-500">Chicago, USA</p>
                        <p className="text-xs text-gray-500">IP: 192.168.1.3 • Last active: 5 days ago</p>
                      </div>
                      <div>
                        <button type="button" className="text-sm text-red-600 hover:text-red-800 font-medium">
                          Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <button type="button" className="text-sm text-red-600 hover:text-red-800 font-medium">
                    Revoke All Other Sessions
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Activity</h3>
                <p className="text-sm text-gray-500 mb-4">Recent security events for your account.</p>
                <div className="space-y-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Lock className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Password changed</p>
                      <p className="text-xs text-gray-500">2 days ago • IP: 192.168.1.1</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Successful login</p>
                      <p className="text-xs text-gray-500">3 days ago • IP: 192.168.1.1</p>
                    </div>
                  </div>

                  <div className="flex">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">Failed login attempt</p>
                      <p className="text-xs text-gray-500">5 days ago • IP: 192.168.1.4</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing Settings */}
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-lg font-medium text-gray-900">Enterprise Plan</p>
                      <p className="text-sm text-gray-500">$499/month • Billed monthly</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-700">
                      Your next billing date is <span className="font-medium">June 1, 2023</span>
                    </p>
                  </div>
                  <div className="mt-4 flex space-x-4">
                    <button
                      type="button"
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Change Plan
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-red-600 hover:bg-gray-50"
                    >
                      Cancel Subscription
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="h-10 w-16 bg-gray-200 rounded flex items-center justify-center text-gray-500 font-medium">
                        VISA
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                        <p className="text-xs text-gray-500">Expires 12/2024</p>
                      </div>
                    </div>
                    <div>
                      <button type="button" className="text-sm text-primary hover:text-primary-dark font-medium">
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Add Payment Method
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing History</h3>
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                        >
                          Date
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Description
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Amount
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      <tr>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          May 1, 2023
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Enterprise Plan - Monthly</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">$499.00</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href="#" className="text-primary hover:text-primary-dark">
                            Download
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          Apr 1, 2023
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Enterprise Plan - Monthly</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">$499.00</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href="#" className="text-primary hover:text-primary-dark">
                            Download
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          Mar 1, 2023
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">Enterprise Plan - Monthly</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">$499.00</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Paid
                          </span>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <a href="#" className="text-primary hover:text-primary-dark">
                            Download
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Help & Support */}
          {activeTab === "help" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Help & Support</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Need help with the admin portal? Here are some resources to get you started.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-2">Documentation</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Comprehensive guides and API references for the admin portal.
                    </p>
                    <a href="#" className="text-sm text-primary hover:text-primary-dark font-medium">
                      View Documentation
                    </a>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-2">Video Tutorials</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Watch step-by-step tutorials on how to use the admin portal.
                    </p>
                    <a href="#" className="text-sm text-primary hover:text-primary-dark font-medium">
                      Watch Tutorials
                    </a>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-2">FAQs</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Find answers to commonly asked questions about the admin portal.
                    </p>
                    <a href="#" className="text-sm text-primary hover:text-primary-dark font-medium">
                      View FAQs
                    </a>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-base font-medium text-gray-900 mb-2">Contact Support</h4>
                    <p className="text-sm text-gray-500 mb-3">
                      Get in touch with our support team for personalized help.
                    </p>
                    <a href="#" className="text-sm text-primary hover:text-primary-dark font-medium">
                      Contact Support
                    </a>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submit a Support Ticket</h3>
                <form>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                        Subject
                      </label>
                      <input
                        type="text"
                        id="subject"
                        name="subject"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        placeholder="Enter the subject of your issue"
                      />
                    </div>
                    <div>
                      <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        id="category"
                        name="category"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      >
                        <option value="">Select a category</option>
                        <option value="account">Account Issues</option>
                        <option value="billing">Billing Issues</option>
                        <option value="technical">Technical Issues</option>
                        <option value="feature">Feature Request</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="description"
                        name="description"
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                        placeholder="Describe your issue in detail"
                      ></textarea>
                    </div>
                    <div>
                      <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-1">
                        Attachment (optional)
                      </label>
                      <input
                        type="file"
                        id="attachment"
                        name="attachment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Max file size: 10MB. Supported formats: JPG, PNG, PDF.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Submit Ticket
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Settings
