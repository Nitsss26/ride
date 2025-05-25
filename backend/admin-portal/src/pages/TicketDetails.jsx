import { useState, useEffect } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { toast } from "react-toastify"
import { ArrowLeft, MessageSquare, User, Clock, Calendar, Tag, CheckCircle, XCircle, AlertTriangle, Send } from 'lucide-react'
import { fetchTicketDetails, updateTicketStatus, addTicketReply, fetchUserDetails, fetchDriverDetails } from "../services/api"
import { useAuth } from "../context/AuthContext"

const TicketDetails = () => {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [replyText, setReplyText] = useState("")
  const [submittingReply, setSubmittingReply] = useState(false)

  useEffect(() => {
    const loadTicketDetails = async () => {
      try {
        setLoading(true)
        const ticketData = await fetchTicketDetails(ticketId)
        setTicket(ticketData)

        // Fetch user details based on user type
        if (ticketData.userId) {
          setUserLoading(true)
          try {
            let userData
            if (ticketData.user?.type === "driver" || ticketData.role === "driver") {
              userData = await fetchDriverDetails(ticketData.userId)
            } else {
              userData = await fetchUserDetails(ticketData.userId)
            }
            setUserDetails(userData.data)
          } catch (error) {
            console.error("Failed to fetch user details:", error)
            toast.error("Failed to load user details.")
            setUserDetails(null)
          } finally {
            setUserLoading(false)
          }
        } else {
          setUserLoading(false)
        }
      } catch (error) {
        console.error("Failed to fetch ticket details:", error)
        toast.error("Failed to load ticket details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    loadTicketDetails()
  }, [ticketId])

  const handleStatusChange = async (newStatus) => {
    try {
      setUpdating(true)
      await updateTicketStatus(ticketId, newStatus)
      setTicket({ ...ticket, status: newStatus })
      toast.success(`Ticket status updated to ${newStatus}`)
    } catch (error) {
      console.error("Failed to update ticket status:", error)
      toast.error("Failed to update ticket status. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  const handleSubmitReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return

    try {
      setSubmittingReply(true)
      const newReply = await addTicketReply(ticketId, {
        message: replyText,
        isAdminReply: true
      })
      
      setTicket({
        ...ticket,
        replies: [...ticket.replies, newReply]
      })
      
      setReplyText("")
      toast.success("Reply added successfully")
    } catch (error) {
      console.error("Failed to add reply:", error)
      toast.error("Failed to add reply. Please try again.")
    } finally {
      setSubmittingReply(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Open
          </span>
        )
      case "in-progress":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            In Progress
          </span>
        )
      case "resolved":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Resolved
          </span>
        )
      case "closed":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-4 h-4 mr-1" />
            Closed
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

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "low":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Low
          </span>
        )
      case "medium":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Medium
          </span>
        )
      case "high":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            High
          </span>
        )
      case "critical":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Critical
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {priority}
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
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
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

  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Ticket Not Found</h1>
        </div>
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">The support ticket you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/support-tickets"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Back to Support Tickets
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
          <h1 className="text-2xl font-bold text-gray-900">Support Ticket #{ticket.ticketNumber}</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          {getStatusBadge(ticket.status)}
          
          {ticket.status !== "resolved" && ticket.status !== "closed" && (
            <div className="relative">
              <button
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                onClick={() => handleStatusChange("resolved")}
              >
                {updating ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </>
                )}
              </button>
            </div>
          )}
          
          {ticket.status !== "closed" && (
            <div className="relative">
              <button
                disabled={updating}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center"
                onClick={() => handleStatusChange("closed")}
              >
                {updating ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                    Updating...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Close Ticket
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2">
          {/* Ticket Information */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{ticket.subject}</h2>
              <div className="prose max-w-none text-gray-700 mb-6">
                <p>{ticket.description}</p>
              </div>
              
              {ticket.attachments && ticket.attachments.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {ticket.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        {attachment.filename || `Attachment ${index + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Conversation */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Conversation</h3>
            </div>
            
            <div className="p-6">
              {/* Original message */}
              <div className="flex mb-6">
                <div className="flex-shrink-0 mr-4">
                  {userDetails?.profileImage ? (
                    <img
                      src={userDetails.profileImage || "/placeholder.svg"}
                      alt={userDetails.name}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      {userDetails?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {userDetails?.name || "User"}
                    </h4>
                    <span className="ml-2 text-xs text-gray-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4 text-sm text-gray-700">
                    <p>{ticket.description}</p>
                  </div>
                </div>
              </div>
              
              {/* Replies */}
              {ticket.replies && ticket.replies.map((reply) => (
                <div key={reply._id} className="flex mb-6">
                  <div className="flex-shrink-0 mr-4">
                    {reply.isAdminReply ? (
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        A
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {userDetails?.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {reply.isAdminReply ? `${reply.adminName || "Admin"}` : userDetails?.name || "User"}
                      </h4>
                      <span className="ml-2 text-xs text-gray-500">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className={`rounded-lg p-4 text-sm ${
                      reply.isAdminReply 
                        ? "bg-purple-50 text-gray-700" 
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      <p>{reply.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Reply Form */}
              {ticket.status !== "closed" && (
                <form onSubmit={handleSubmitReply} className="mt-6">
                  <div className="mb-4">
                    <label htmlFor="reply" className="block text-sm font-medium text-gray-700 mb-2">
                      Add Reply
                    </label>
                    <textarea
                      id="reply"
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Type your reply here..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingReply || !replyText.trim()}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submittingReply ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="md:col-span-1">
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Ticket Information</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Status</div>
                <div className="mt-1">{getStatusBadge(ticket.status)}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Priority</div>
                <div className="mt-1">{getPriorityBadge(ticket.priority)}</div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Category</div>
                <div className="mt-1 flex items-center">
                  <Tag className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-900">
                    {ticket.category || "General"}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Created</div>
                <div className="mt-1 flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-900">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium text-gray-500">Last Updated</div>
                <div className="mt-1 flex items-center">
                  <Clock className="h-4 w-4 text-gray-400 mr-1" />
                  <span className="text-sm text-gray-900">
                    {new Date(ticket.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">User Information</h3>
            </div>
            <div className="p-6">
              {userLoading ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : userDetails ? (
                <div>
                  <div className="flex items-center mb-4">
                    {userDetails.profileImage ? (
                      <img
                        src={userDetails.profileImage}
                        alt={userDetails.name}
                        className="h-10 w-10 rounded-full mr-3"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                        {userDetails.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {userDetails.name || "Unknown User"}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {userDetails.email || "No email provided"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-500">User ID</div>
                      <div className="mt-1 text-sm text-gray-900">{ticket.userId || "N/A"}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div className="mt-1 text-sm text-gray-900">{userDetails.phone || "Not provided"}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Account Type</div>
                      <div className="mt-1 text-sm text-gray-900">
                        {userDetails.role === "driver" ? "Driver" : "Rider"}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Member Since</div>
                      <div className="mt-1 text-sm text-gray-900">
                        {userDetails.createdAt 
                          ? new Date(userDetails.createdAt).toLocaleDateString() 
                          : "Unknown"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <Link
                      to={`/users/${ticket.userId}`}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <User className="h-4 w-4 mr-2" />
                      View User Profile
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  Unable to load user details.
                </div>
              )}
            </div>
          </div>
          
          {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Related Tickets</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-3">
                  {ticket.relatedTickets.map((relatedTicket) => (
                    <li key={relatedTicket._id}>
                      <Link
                        to={`/support-tickets/${relatedTicket._id}`}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        #{relatedTicket.ticketNumber}: {relatedTicket.subject}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TicketDetails
