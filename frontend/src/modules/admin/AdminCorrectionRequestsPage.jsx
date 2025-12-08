import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Filter,
  Calendar,
  FileText,
  Send,
  Loader2,
  Users,
  TrendingUp
} from 'lucide-react';

const AdminCorrectionRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });

  // Edit attendance form state
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    reason: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setNotification({ show: true, type: 'error', message: 'Authentication required. Please log in again.' });
      return;
    }
    loadCorrectionRequests();
  }, [filter]);

  const loadCorrectionRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/correction-requests?status=${filter}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      } else if (response.status === 401) {
        setNotification({ show: true, type: 'error', message: 'Authentication failed. Please log in again.' });
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (response.status === 403) {
        setNotification({ show: true, type: 'error', message: 'You do not have permission to access this resource.' });
      } else if (response.status >= 500) {
        setNotification({ show: true, type: 'error', message: 'Server error. Please try again later.' });
      } else {
        const errorData = await response.json().catch(() => ({}));
        setNotification({ show: true, type: 'error', message: errorData.message || 'Failed to load correction requests' });
      }
    } catch (error) {
      console.error('Error loading correction requests:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setNotification({ show: true, type: 'error', message: 'Network error. Please check your connection and try again.' });
      } else {
        setNotification({ show: true, type: 'error', message: 'An error occurred while loading requests. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/correction-requests/${id}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ show: true, type: 'success', message: 'Correction request approved successfully' });
        loadCorrectionRequests();
      } else {
        setNotification({ show: true, type: 'error', message: data.message || 'Failed to approve request' });
      }
    } catch (error) {
      setNotification({ show: true, type: 'error', message: 'An error occurred while approving request' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/correction-requests/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ show: true, type: 'success', message: 'Correction request rejected successfully' });
        loadCorrectionRequests();
      } else {
        setNotification({ show: true, type: 'error', message: data.message || 'Failed to reject request' });
      }
    } catch (error) {
      setNotification({ show: true, type: 'error', message: 'An error occurred while rejecting request' });
    } finally {
      setProcessingId(null);
    }
  };



  const validateEditForm = () => {
    const errors = [];

    // At least one time field should be provided
    if (!editForm.check_in && !editForm.check_out) {
      errors.push('At least one time field (check-in or check-out) must be provided');
    }

    // Validate time formats if provided
    if (editForm.check_in) {
      const [hours, minutes] = editForm.check_in.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        errors.push('Invalid check-in time format');
      }
    }

    if (editForm.check_out) {
      const [hours, minutes] = editForm.check_out.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        errors.push('Invalid check-out time format');
      }
    }

    // If both times are provided, check-out should be after check-in
    if (editForm.check_in && editForm.check_out && editForm.check_out <= editForm.check_in) {
      errors.push('Check-out time must be after check-in time');
    }

    // Reason validation
    if (!editForm.reason.trim()) {
      errors.push('Reason for edit is required');
    } else if (editForm.reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters long');
    } else if (editForm.reason.trim().length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    }

    return errors;
  };

  const handleEditAttendance = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateEditForm();
    if (validationErrors.length > 0) {
      setNotification({ show: true, type: 'error', message: `Validation errors: ${validationErrors.join(', ')}` });
      return;
    }

    setProcessingId('edit');

    try {
      // Prepare data, handling null values properly
      const updateData = {
        check_in: editForm.check_in || null,
        check_out: editForm.check_out || null,
        reason: editForm.reason.trim()
      };

      const response = await fetch(`/api/admin/attendance/${editingAttendance.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        setNotification({ show: true, type: 'success', message: 'Attendance record updated successfully' });
        setEditingAttendance(null);
        setEditForm({
          check_in: '',
          check_out: '',
          reason: ''
        });
        // Refresh the requests to show updated attendance
        loadCorrectionRequests();
      } else {
        if (response.status === 422 && data.errors) {
          // Validation errors from server
          const errorMessages = Object.values(data.errors).flat().join(', ');
          setNotification({ show: true, type: 'error', message: `Validation error: ${errorMessages}` });
        } else if (response.status === 404) {
          setNotification({ show: true, type: 'error', message: 'Attendance record not found' });
        } else if (response.status === 409) {
          setNotification({ show: true, type: 'error', message: 'Another attendance record exists for this time slot' });
        } else {
          setNotification({ show: true, type: 'error', message: data.message || 'Failed to update attendance' });
        }
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setNotification({ show: true, type: 'error', message: 'Network error. Please check your connection and try again.' });
      } else {
        setNotification({ show: true, type: 'error', message: 'An error occurred while updating attendance. Please try again.' });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const openEditForm = (attendance) => {
    setEditingAttendance(attendance);
    setEditForm({
      check_in: attendance.check_in || '',
      check_out: attendance.check_out || '',
      reason: ''
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Attendance Correction Requests</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage employee attendance correction requests</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/admin/attendance-correction"
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" />
              <span>Admin Attendance Correction</span>
            </Link>
          </div>
        </div>

      {/* Notification */}
      {notification.show && (
        <div className={`p-4 rounded-xl shadow-lg border-l-4 flex items-center justify-between ${
          notification.type === 'success'
            ? 'bg-green-50 text-green-800 border-green-400'
            : 'bg-red-50 text-red-800 border-red-400'
        }`}>
          <div className="flex items-center space-x-3">
            {notification.type === 'success' ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-red-600" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification({ show: false, type: 'success', message: '' })}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}



      {/* Edit Attendance Form */}
      {editingAttendance && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-gray-600" />
            Edit Attendance Record
          </h3>
          <form onSubmit={handleEditAttendance} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={editForm.check_in}
                  onChange={(e) => setEditForm({...editForm, check_in: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={editForm.check_out}
                  onChange={(e) => setEditForm({...editForm, check_out: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Reason for Edit
              </label>
              <textarea
                value={editForm.reason}
                onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                rows={4}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                placeholder="Please explain the reason for editing this attendance record"
                required
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingAttendance(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === 'edit'}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {processingId === 'edit' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Update Attendance
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pending', label: 'Pending' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'all', label: 'All' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Requests List */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No correction requests found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.employee.name}
                        </h3>
                        <span className="text-sm text-gray-500">
                          {request.employee.employee_id}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          request.status === 'approved' ? 'bg-green-100 text-green-800' :
                          request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Request Type</p>
                          <p className="font-medium text-gray-900 capitalize">
                            {request.type.replace('_', ' ')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Submitted</p>
                          <p className="font-medium text-gray-900">{request.submitted_at}</p>
                        </div>
                        {(request.requested_check_in || request.requested_check_out) && (
                          <div>
                            <p className="text-gray-500">Requested Times</p>
                            <p className="font-medium text-gray-900">
                              {request.requested_check_in || 'N/A'} - {request.requested_check_out || 'N/A'}
                            </p>
                          </div>
                        )}
                        {request.attendance && (
                          <div>
                            <p className="text-gray-500">Current Attendance</p>
                            <p className="font-medium text-gray-900">
                              {request.attendance.check_in || 'N/A'} - {request.attendance.check_out || 'N/A'}
                              <button
                                onClick={() => openEditForm(request.attendance)}
                                className="ml-2 text-indigo-600 hover:text-indigo-800 text-xs"
                              >
                                Edit
                              </button>
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-3">
                        <p className="text-gray-500 text-sm">Reason</p>
                        <p className="text-gray-900 mt-1">{request.reason}</p>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          {processingId === request.id ? 'Approving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          {processingId === request.id ? 'Rejecting...' : 'Reject'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminCorrectionRequestsPage;
