import { useState } from "react"
import { toast } from "react-toastify"
import { Save, User, Lock, Bell, Globe, Shield, CreditCard, HelpCircle } from 'lucide-react'
import { useAuth } from "../context/AuthContext"
import { updateAdminProfile, updateAdminPassword } from "../services/api"

const Settings = () => {
  const { user, updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    jobTitle: user?.jobTitle || "",
    department: user?.department || "",
    bio: user?.bio || ""
  })
  
  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    newTicketAlerts: true,
    ticketUpdates: true,
    systemAlerts: true,
    marketingEmails: false
  })
  
  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setProfileForm(prev => ({ ...prev, [name]: value }))
  }
  
  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }
  
  const handleNotificationChange = (e) => {
    const { name, checked } = e.target
    setNotificationSettings(prev => ({ ...prev, [name]: checked }))
  }
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setSaving(true)
      const updatedProfile = await updateAdminProfile(profileForm)
      updateUser(updatedProfile)
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Failed to update profile:", error)
      toast.error("Failed to update profile. Please try again.")
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
    
    try {
      setChangingPassword(true)
      await updateAdminPassword(passwordForm)
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      toast.success("Password updated successfully")
    } catch (error) {
      console.error("Failed to update password:", error)
      toast.error("Failed to update password. Please check your current password and try again.")
    } finally {
      setChangingPassword(false)
    }
  }
  
  const handleNotificationSubmit = (e) => {
    e.preventDefault()
    // In a real app, you would save these settings to the backend
    toast.success("Notification settings updated successfully")
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="w-full md:w-64 bg-gray-50 p-6 border-b md:border-b-0 md:border-r border-gray-200">
            <nav className="space-y-1">
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "profile"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("profile")}
              >
                <User className="mr-3 h-5 w-5" />
                Profile Information
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "password"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("password")}
              >
                <Lock className="mr-3 h-5 w-5" />
                Password
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "notifications"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="mr-3 h-5 w-5" />
                Notifications
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "appearance"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("appearance")}
              >
                <Globe className="mr-3 h-5 w-5" />
                Appearance
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "security"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("security")}
              >
                <Shield className="mr-3 h-5 w-5" />
                Security
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "billing"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("billing")}
              >
                <CreditCard className="mr-3 h-5 w-5" />
                Billing
              </button>
              
              <button
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full ${
                  activeTab === "help"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={() => setActiveTab("help")}
              >
                <HelpCircle className="mr-3 h-5 w-5" />
                Help & Support
              </button>
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-6">
            {activeTab === "profile" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Update your account profile information and email address.
                </p>
                
                <form onSubmit={handleProfileSubmit}>
                  <div className="space-y-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 mr-4">
                        {user?.profileImage ? (
                          <img
                            src={user.profileImage || "/placeholder.svg"}
                            alt={user.name}
                            className="h-16 w-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                            {user?.name?.charAt(0).toUpperCase() || "A"}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          Change avatar
                        </button>
                        <p className="mt-1 text-xs text-gray-500">
                          JPG, GIF or PNG. 1MB max.
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          id="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <input
                          type="email"
                          name="email"
                          id="email"
                          value={profileForm.email}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          id="phone"
                          value={profileForm.phone}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
                          Job Title
                        </label>
                        <input
                          type="text"
                          name="jobTitle"
                          id="jobTitle"
                          value={profileForm.jobTitle}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                          Department
                        </label>
                        <select
                          name="department"
                          id="department"
                          value={profileForm.department}
                          onChange={handleProfileChange}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="">Select Department</option>
                          <option value="Customer Support">Customer Support</option>
                          <option value="Operations">Operations</option>
                          <option value="Finance">Finance</option>
                          <option value="Marketing">Marketing</option>
                          <option value="IT">IT</option>
                          <option value="Management">Management</option>
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        id="bio"
                        rows={4}
                        value={profileForm.bio}
                        onChange={handleProfileChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Brief description about yourself"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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
              </div>
            )}
            
            {activeTab === "password" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Update Password</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Ensure your account is using a strong password for security.
                </p>
                
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                        Current Password
                      </label>
                      <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {changingPassword ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                            Updating...
                          </>
                        ) : (
                          "Update Password"
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === "notifications" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Manage how you receive notifications and alerts.
                </p>
                
                <form onSubmit={handleNotificationSubmit}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Channels</h3>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="emailNotifications"
                              name="emailNotifications"
                              type="checkbox"
                              checked={notificationSettings.emailNotifications}
                              onChange={handleNotificationChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Notification Types</h3>
                      <div className="space-y-4">
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="newTicketAlerts"
                              name="newTicketAlerts"
                              type="checkbox"
                              checked={notificationSettings.newTicketAlerts}
                              onChange={handleNotificationChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="newTicketAlerts" className="font-medium text-gray-700">
                              New Support Tickets
                            </label>
                            <p className="text-gray-500">Get notified when a new support ticket is created.</p>
                          </div>
                        </div>
                        
                        <div className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id="ticketUpdates"
                              name="ticketUpdates"
                              type="checkbox"
                              checked={notificationSettings.ticketUpdates}
                              onChange={handleNotificationChange}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="ticketUpdates" className="font-medium text-gray-700">
                              Ticket Updates
                            </label>
                            <p className="text-gray-500">Get notified when there are updates to tickets you're assigned to.</p>
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
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="systemAlerts" className="font-medium text-gray-700">
                              System Alerts
                            </label>
                            <p className="text-gray-500">Receive important system alerts and announcements.</p>
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
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor="marketingEmails" className="font-medium text-gray-700">
                              Marketing Emails
                            </label>
                            <p className="text-gray-500">Receive marketing emails and newsletters.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            
            {activeTab === "appearance" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Appearance Settings</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Customize the appearance of your admin dashboard.
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="border border-gray-200 rounded-md p-4 flex flex-col items-center cursor-pointer bg-white shadow-sm hover:border-blue-500">
                        <div className="w-full h-24 bg-white border border-gray-200 rounded-md mb-2"></div>
                        <span className="text-sm font-medium">Light</span>
                      </div>
                      
                      <div className="border border-gray-200 rounded-md p-4 flex flex-col items-center cursor-pointer hover:border-blue-500">
                        <div className="w-full h-24 bg-gray-900 border border-gray-700 rounded-md mb-2"></div>
                        <span className="text-sm font-medium">Dark</span>
                      </div>
                      
                      <div className="border border-gray-200 rounded-md p-4 flex flex-col items-center cursor-pointer hover:border-blue-500">
                        <div className="w-full h-24 bg-gradient-to-b from-white to-gray-900 border border-gray-200 rounded-md mb-2"></div>
                        <span className="text-sm font-medium">System</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Accent Color</h3>
                    <div className="grid grid-cols-6 gap-4">
                      <div className="h-10 w-10 rounded-full bg-blue-500 cursor-pointer ring-2 ring-offset-2 ring-blue-500"></div>
                      <div className="h-10 w-10 rounded-full bg-purple-500 cursor-pointer"></div>
                      <div className="h-10 w-10 rounded-full bg-pink-500 cursor-pointer"></div>
                      <div className="h-10 w-10 rounded-full bg-red-500 cursor-pointer"></div>
                      <div className="h-10 w-10 rounded-full bg-green-500 cursor-pointer"></div>
                      <div className="h-10 w-10 rounded-full bg-yellow-500 cursor-pointer"></div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Font Size</h3>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">A</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        defaultValue="3"
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-lg text-gray-500 ml-2">A</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "security" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Manage your account security settings and login sessions.
                </p>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Two-Factor Authentication</h3>
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <Shield className="h-6 w-6 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">Protect your account with 2FA</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            Two-factor authentication adds an extra layer of security to your account by requiring more than just a password to sign in.
                          </p>
                          <div className="mt-3">
                            <button
                              type="button"
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              Enable 2FA
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Active Sessions</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        <li>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <span className="text-green-600 text-xs">
                                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">Current Session</p>
                                  <p className="text-sm text-gray-500">
                                    Chrome on Windows • IP: 192.168.1.1
                                  </p>
                                </div>
                              </div>
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Active Now
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                        <li>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-gray-600 text-xs">
                                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">Safari on iPhone</p>
                                  <p className="text-sm text-gray-500">
                                    IP: 203.0.113.1 • Last active 2 days ago
                                  </p>
                                </div>
                              </div>
                              <div>
                                <button
                                  type="button"
                                  className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  Revoke
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Login History</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                      <ul className="divide-y divide-gray-200">
                        <li>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Today at 10:30 AM</p>
                                <p className="text-sm text-gray-500">
                                  Chrome on Windows • IP: 192.168.1.1
                                </p>
                              </div>
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Successful
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                        <li>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Yesterday at 8:45 PM</p>
                                <p className="text-sm text-gray-500">
                                  Safari on iPhone • IP: 203.0.113.1
                                </p>
                              </div>
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Successful
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                        <li>
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">May 12, 2023 at 3:20 PM</p>
                                <p className="text-sm text-gray-500">
                                  Firefox on Mac • IP: 198.51.100.1
                                </p>
                              </div>
                              <div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Failed
                                </span>
                              </div>
                            </div>
                          </div>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "billing" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Billing Information</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Manage your billing information and subscription details.
                </p>
                
                <div className="space-y-6">
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Current Plan</h3>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Enterprise Plan</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            $499/month • Renews on June 1, 2023
                          </p>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Change Plan
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-gray-700">Plan Features</h5>
                        <ul className="mt-2 space-y-1">
                          <li className="text-sm text-gray-500 flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Unlimited admin users
                          </li>
                          <li className="text-sm text-gray-500 flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Advanced analytics
                          </li>
                          <li className="text-sm text-gray-500 flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            24/7 priority support
                          </li>
                          <li className="text-sm text-gray-500 flex items-center">
                            <svg className="h-4 w-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Custom integrations
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Method</h3>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M22 4H2c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H2V6h20v12zM4 12h4v2H4v-2zm0-3h4v2H4V9zm5 3h10v2H9v-2zm0-3h10v2H9V9z" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">Visa ending in 4242</p>
                            <p className="text-sm text-gray-500">Expires 12/2024</p>
                          </div>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">Billing History</h3>
                    </div>
                    <div className="border-t border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Description
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th scope="col" className="relative px-6 py-3">
                              <span className="sr-only">Download</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              May 1, 2023
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Enterprise Plan - Monthly
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              $499.00
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a href="#" className="text-blue-600 hover:text-blue-900">
                                Download
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Apr 1, 2023
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Enterprise Plan - Monthly
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              $499.00
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a href="#" className="text-blue-600 hover:text-blue-900">
                                Download
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Mar 1, 2023
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              Enterprise Plan - Monthly
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              $499.00
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Paid
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <a href="#" className="text-blue-600 hover:text-blue-900">
                                Download
                              </a>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === "help" && (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-4">Help & Support</h2>
                <p className="text-sm text-gray-600 mb-6">
                  Get help with your account or contact our support team.
                </p>
                
                <div className="space-y-6">
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Frequently Asked Questions</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">How do I reset my password?</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            You can reset your password by going to the Password tab in your account settings and following the instructions.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">How do I add a new admin user?</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            If you have superadmin privileges, you can add new admin users from the Admin Users page.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">How do I export data from the platform?</h4>
                          <p className="mt-1 text-sm text-gray-500">
                            You can export data from most pages using the Export button in the top-right corner of the data table.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Contact Support</h3>
                      
                      <form className="space-y-4">
                        <div>
                          <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                            Subject
                          </label>
                          <input
                            type="text"
                            name="subject"
                            id="subject"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="What do you need help with?"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                            Message
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            rows={4}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Describe your issue in detail"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Priority
                          </label>
                          <select
                            id="priority"
                            name="priority"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Submit Ticket
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                  
                  <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Documentation</h3>
                      
                      <div className="space-y-4">
                        <a href="#" className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-gray-900">Admin User Guide</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                Learn how to use the admin dashboard and manage users, rides, and more.
                              </p>
                            </div>
                          </div>
                        </a>
                        
                        <a href="#" className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-gray-900">API Documentation</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                Technical documentation for developers integrating with our platform.
                              </p>
                            </div>
                          </div>
                        </a>
                        
                        <a href="#" className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm font-medium text-gray-900">Best Practices Guide</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                Learn the best practices for managing your ride-sharing platform.
                              </p>
                            </div>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
