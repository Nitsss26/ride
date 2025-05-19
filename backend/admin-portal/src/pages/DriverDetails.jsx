import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { toast } from "react-toastify"
import { ArrowLeft, User, Car, FileText, MapPin, Phone, Mail, Calendar, Star, Clock, DollarSign, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { fetchDriverDetails, updateDriverStatus, fetchDriverDocuments } from "../services/api"

const DriverDetails = () => {
  const { driverId } = useParams()
  const navigate = useNavigate()
  const [driver, setDriver] = useState(null)
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  useEffect(() => {
    const loadDriverDetails = async () => {
      try {
        setLoading(true)
        const driverData = await fetchDriverDetails(driverId)
        setDriver(driverData)
        
        // Fetch driver documents
        const docsData = await fetchDriverDocuments(driverId)
        setDocuments(docsData)
      } catch (error) {
        console.error("Failed to fetch driver details:", error)
        toast.error("Failed to load driver details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadDriverDetails()
  }, [driverId])

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true)
      await updateDriverStatus(driverId, newStatus)
      setDriver({ ...driver, status: newStatus })
      toast.success(`Driver status updated to ${newStatus}`)
    } catch (error) {
      console.error("Failed to update driver status:", error)
      toast.error("Failed to update driver status. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Active
          </span>
        )
      case "inactive":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XCircle className="w-4 h-4 mr-1" />
            Inactive
          </span>
        )
      case "pending":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Pending
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center space-x-4">
              <div className="rounded-full bg-gray-200 h-16 w-16"></div>
              <div className="flex-1 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Driver Not Found</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">The driver you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/drivers"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Drivers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Driver Details</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {getStatusBadge(driver.status)}
          
          <div className="relative">
            <button
              disabled={updating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
              onClick={() => {
                const newStatus = driver.status === "active" ? "inactive" : "active"
                handleStatusChange(newStatus)
              }}
            >
              {updating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                  Updating...
                </>
              ) : (
                <>
                  {driver.status === "active" ? "Deactivate" : "Activate"} Driver
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Driver Profile Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              {driver.profileImage ? (
                <img
                  src={driver.profileImage || "/placeholder.svg"}
                  alt={driver.name}
                  className="h-24 w-24 rounded-full object-cover border-4 border-gray-100"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-2xl font-bold border-4 border-gray-100">
                  {driver.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{driver.name}</h2>
              <div className="mt-1 flex flex-wrap items-center text-sm text-gray-600">
                <div className="mr-6 mb-2 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  {driver.email}
                </div>
                <div className="mr-6 mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {driver.phone}
                </div>
                <div className="mr-6 mb-2 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {driver.address?.city}, {driver.address?.state}
                </div>
                <div className="mr-6 mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Joined {new Date(driver.createdAt).toLocaleDateString()}
                </div>
              </div>
              
              <div className="mt-3 flex flex-wrap">
                <div className="mr-6 mb-2">
                  <div className="text-sm font-medium text-gray-500">Rating</div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="font-medium">
                      {driver.rating ? driver.rating.toFixed(1) : "N/A"}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">
                      ({driver.ratingCount || 0} ratings)
                    </span>
                  </div>
                </div>
                
                <div className="mr-6 mb-2">
                  <div className="text-sm font-medium text-gray-500">Total Rides</div>
                  <div className="flex items-center">
                    <Car className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="font-medium">{driver.totalRides || 0}</span>
                  </div>
                </div>
                
                <div className="mr-6 mb-2">
                  <div className="text-sm font-medium text-gray-500">Total Earnings</div>
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                    <span className="font-medium">
                      ${driver.totalEarnings ? driver.totalEarnings.toFixed(2) : "0.00"}
                    </span>
                  </div>
                </div>
                
                <div className="mr-6 mb-2">
                  <div className="text-sm font-medium text-gray-500">Avg. Response Time</div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="font-medium">
                      {driver.avgResponseTime ? `${driver.avgResponseTime}s` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("profile")}
            >
              <User className="h-5 w-5 inline mr-2" />
              Profile
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "vehicle"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("vehicle")}
            >
              <Car className="h-5 w-5 inline mr-2" />
              Vehicle
            </button>
            <button
              className={`py-4 px-6 text-center border-b-2 font-medium text-sm ${
                activeTab === "documents"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("documents")}
            >
              <FileText className="h-5 w-5 inline mr-2" />
              Documents
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Full Name</div>
                    <div className="mt-1 text-sm text-gray-900">{driver.name}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    <div className="mt-1 text-sm text-gray-900">{driver.email}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Phone</div>
                    <div className="mt-1 text-sm text-gray-900">{driver.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Date of Birth</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.dateOfBirth ? new Date(driver.dateOfBirth).toLocaleDateString() : "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Gender</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.gender ? driver.gender.charAt(0).toUpperCase() + driver.gender.slice(1) : "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Language</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.language || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Street Address</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.address?.street || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">City</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.address?.city || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">State</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.address?.state || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Zip Code</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.address?.zipCode || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Country</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.address?.country || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Name</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.emergencyContact?.name || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Relationship</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.emergencyContact?.relationship || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Phone</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.emergencyContact?.phone || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Banking Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Account Holder</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.bankInfo?.accountHolder || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Bank Name</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.bankInfo?.bankName || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Account Number</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.bankInfo?.accountNumber 
                        ? `****${driver.bankInfo.accountNumber.slice(-4)}` 
                        : "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Routing Number</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.bankInfo?.routingNumber 
                        ? `****${driver.bankInfo.routingNumber.slice(-4)}` 
                        : "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "vehicle" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Make</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.make || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Model</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.model || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Year</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.year || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Color</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.color || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">License Plate</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.licensePlate || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">VIN</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.vin || "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vehicle Photos</h3>
                {driver.vehicle?.photos && driver.vehicle.photos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {driver.vehicle.photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo || "/placeholder.svg"}
                          alt={`Vehicle photo ${index + 1}`}
                          className="h-48 w-full object-cover rounded-lg"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No vehicle photos provided</p>
                )}
              </div>
              
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Insurance Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-500">Insurance Provider</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.insurance?.provider || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Policy Number</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.insurance?.policyNumber || "Not provided"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Expiration Date</div>
                    <div className="mt-1 text-sm text-gray-900">
                      {driver.vehicle?.insurance?.expirationDate 
                        ? new Date(driver.vehicle.insurance.expirationDate).toLocaleDateString() 
                        : "Not provided"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === "documents" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Driver Documents</h3>
                {documents.length > 0 ? (
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Document Type
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Status
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Submitted
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Expiration
                          </th>
                          <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {documents.map((doc) => (
                          <tr key={doc._id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              {doc.documentType}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                              {doc.status === "approved" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Approved
                                </span>
                              )}
                              {doc.status === "rejected" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Rejected
                                </span>
                              )}
                              {doc.status === "pending" && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending Review
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {doc.expirationDate 
                                ? new Date(doc.expirationDate).toLocaleDateString() 
                                : "N/A"}
                            </td>
                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                              <a 
                                href={doc.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No documents found for this driver.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverDetails
