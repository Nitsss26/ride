"use client"

import { useState, useEffect } from "react"
import { toast } from "react-toastify"
import { CheckCircle, XCircle, FileText, User, Calendar, AlertTriangle } from "lucide-react"
import api from "../services/api"

const DriverApprovals = () => {
  const [pendingDocuments, setPendingDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    fetchPendingDocuments()
  }, [])

  const fetchPendingDocuments = async () => {
    try {
      setLoading(true)
      const response = await api.getPendingDocuments()
      setPendingDocuments(response.data)
    } catch (error) {
      console.error("Error fetching pending documents:", error)
      toast.error("Failed to load pending documents")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (documentId) => {
    if (!reviewNotes.trim() && selectedDocument?.documentType !== "profile") {
      toast.warning("Please add review notes before approving")
      return
    }

    try {
      setProcessingId(documentId)
      await api.approveDocument(documentId, reviewNotes)
      toast.success("Document approved successfully")
      setPendingDocuments(pendingDocuments.filter((doc) => doc._id !== documentId))
      setSelectedDocument(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error approving document:", error)
      toast.error("Failed to approve document")
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (documentId) => {
    if (!reviewNotes.trim()) {
      toast.warning("Please add rejection reason")
      return
    }

    try {
      setProcessingId(documentId)
      await api.rejectDocument(documentId, reviewNotes)
      toast.success("Document rejected")
      setPendingDocuments(pendingDocuments.filter((doc) => doc._id !== documentId))
      setSelectedDocument(null)
      setReviewNotes("")
    } catch (error) {
      console.error("Error rejecting document:", error)
      toast.error("Failed to reject document")
    } finally {
      setProcessingId(null)
    }
  }

  const getDocumentTypeIcon = (type) => {
    switch (type) {
      case "license":
        return <FileText className="h-5 w-5 text-blue-500" />
      case "insurance":
        return <FileText className="h-5 w-5 text-green-500" />
      case "registration":
        return <FileText className="h-5 w-5 text-purple-500" />
      case "profile":
        return <User className="h-5 w-5 text-gray-500" />
      case "vehicle_photo":
        return <FileText className="h-5 w-5 text-yellow-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Driver Document Approvals</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document List */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Pending Documents</h2>
            <p className="text-sm text-gray-500 mt-1">
              {pendingDocuments.length} document{pendingDocuments.length !== 1 ? "s" : ""} pending review
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : pendingDocuments.length === 0 ? (
            <div className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No pending documents</h3>
              <p className="mt-2 text-sm text-gray-500">All driver documents have been reviewed.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {pendingDocuments.map((doc) => (
                <div
                  key={doc._id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedDocument?._id === doc._id ? "bg-gray-50" : ""}`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex items-center">
                    {getDocumentTypeIcon(doc.documentType)}
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {doc.documentType.replace("_", " ").charAt(0).toUpperCase() +
                          doc.documentType.replace("_", " ").slice(1)}
                      </p>
                      <p className="text-xs text-gray-500">Driver ID: {doc.driverId.substring(0, 8)}...</p>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Document Preview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          {selectedDocument ? (
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">
                  {selectedDocument.documentType.replace("_", " ").charAt(0).toUpperCase() +
                    selectedDocument.documentType.replace("_", " ").slice(1)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Submitted on {new Date(selectedDocument.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex-1 p-4 overflow-y-auto">
                <div className="mb-4">
                  <img
                    src={selectedDocument.documentUrl || "/placeholder.svg"}
                    alt={selectedDocument.documentType}
                    className="max-w-full h-auto rounded-lg border border-gray-200"
                  />
                </div>

                {selectedDocument.documentType === "license" && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-blue-800">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {selectedDocument.expiryDate ? (
                        <>Expires on {new Date(selectedDocument.expiryDate).toLocaleDateString()}</>
                      ) : (
                        <>No expiry date provided</>
                      )}
                    </p>
                  </div>
                )}

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Review Notes{" "}
                    {selectedDocument.documentType !== "profile" && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary focus:border-primary"
                    rows="3"
                    placeholder={`Enter your review notes or rejection reason...`}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center"
                  onClick={() => handleReject(selectedDocument._id)}
                  disabled={processingId === selectedDocument._id}
                >
                  {processingId === selectedDocument._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <XCircle className="h-4 w-4 mr-2" />
                  )}
                  Reject
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
                  onClick={() => handleApprove(selectedDocument._id)}
                  disabled={processingId === selectedDocument._id}
                >
                  {processingId === selectedDocument._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <FileText className="h-16 w-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No document selected</h3>
              <p className="mt-2 text-sm text-gray-500">Select a document from the list to review</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DriverApprovals
