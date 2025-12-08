import React, { useState, useEffect } from 'react';

const AdminCorrectionRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [message, setMessage] = useState('');

  // Manual attendance form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: '',
    time: '',
    type: 'checkin',
    reason: ''
  });

  // Edit attendance form state
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editForm, setEditForm] = useState({
    check_in: '',
    check_out: '',
    reason: ''
  });

  // Add missing state for correction requests
  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('Authentication required. Please log in again.');
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
        setMessage('Authentication failed. Please log in again.');
        // Clear invalid token
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAuthenticated');
        // Redirect to login after a short delay
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else if (response.status === 403) {
        setMessage('You do not have permission to access this resource.');
      } else if (response.status >= 500) {
        setMessage('Server error. Please try again later.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.message || 'Failed to load correction requests');
      }
    } catch (error) {
      console.error('Error loading correction requests:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('An error occurred while loading requests. Please try again.');
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
        setMessage('Correction request approved successfully');
        loadCorrectionRequests();
      } else {
        setMessage(data.message || 'Failed to approve request');
      }
    } catch (error) {
      setMessage('An error occurred while approving request');
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
        setMessage('Correction request rejected successfully');
        loadCorrectionRequests();
      } else {
        setMessage(data.message || 'Failed to reject request');
      }
    } catch (error) {
      setMessage('An error occurred while rejecting request');
    } finally {
      setProcessingId(null);
    }
  };

  const validateManualForm = () => {
    const errors = [];

    // Employee ID validation
    if (!manualForm.employee_id.trim()) {
      errors.push('Employee ID is required');
    } else if (!/^[A-Za-z0-9-_]+$/.test(manualForm.employee_id.trim())) {
      errors.push('Employee ID contains invalid characters');
    }

    // Date validation
    if (!manualForm.date) {
      errors.push('Date is required');
    } else {
      const selectedDate = new Date(manualForm.date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      if (selectedDate > today) {
        errors.push('Date cannot be in the future');
      } else if (selectedDate < oneYearAgo) {
        errors.push('Date cannot be more than a year in the past');
      }
    }

    // Time validation
    if (!manualForm.time) {
      errors.push('Time is required');
    } else {
      const [hours, minutes] = manualForm.time.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        errors.push('Invalid time format');
      }
    }

    // Reason validation
    if (!manualForm.reason.trim()) {
      errors.push('Reason is required');
    } else if (manualForm.reason.trim().length < 10) {
      errors.push('Reason must be at least 10 characters long');
    } else if (manualForm.reason.trim().length > 500) {
      errors.push('Reason cannot exceed 500 characters');
    }

    return errors;
  };

  const handleManualAttendance = async (e) => {
    e.preventDefault();

    // Client-side validation
    const validationErrors = validateManualForm();
    if (validationErrors.length > 0) {
      setMessage(`Validation errors: ${validationErrors.join(', ')}`);
      return;
    }

    setProcessingId('manual');

    try {
      const endpoint = manualForm.type === 'checkin' ? '/api/admin/manual-checkin' : '/api/admin/manual-checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          employee_id: manualForm.employee_id.trim(),
          date: manualForm.date,
          time: manualForm.time,
          reason: manualForm.reason.trim()
        })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not valid JSON (e.g., HTML error page), handle gracefully
        console.error('Failed to parse response as JSON:', parseError);
        if (response.status >= 500) {
          setMessage('Server error occurred. Please try again later or contact support.');
        } else if (response.status === 404) {
          setMessage('API endpoint not found. Please check your connection.');
        } else {
          setMessage(`Request failed with status ${response.status}. Please try again.`);
        }
        return;
      }

      if (response.ok) {
        setMessage(`Manual ${manualForm.type} recorded successfully`);
        setShowManualForm(false);
        setManualForm({
          employee_id: '',
          date: '',
          time: '',
          type: 'checkin',
          reason: ''
        });
      } else {
        if (response.status === 422 && data.errors) {
          // Validation errors from server
          const errorMessages = Object.values(data.errors).flat().join(', ');
          setMessage(`Validation error: ${errorMessages}`);
        } else if (response.status === 404) {
          setMessage('Employee not found. Please check the Employee ID.');
        } else if (response.status === 409) {
          setMessage('Attendance record already exists for this employee and date.');
        } else if (response.status >= 500) {
          setMessage('Server error occurred. Please try again later.');
        } else {
          setMessage(data.message || 'Failed to record manual attendance');
        }
      }
    } catch (error) {
      console.error('Error recording manual attendance:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('An error occurred while recording manual attendance. Please try again.');
      }
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
      setMessage(`Validation errors: ${validationErrors.join(', ')}`);
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
        setMessage('Attendance record updated successfully');
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
          setMessage(`Validation error: ${errorMessages}`);
        } else if (response.status === 404) {
          setMessage('Attendance record not found');
        } else if (response.status === 409) {
          setMessage('Another attendance record exists for this time slot');
        } else {
          setMessage(data.message || 'Failed to update attendance');
        }
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('An error occurred while updating attendance. Please try again.');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Attendance Correction Requests</h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee attendance correction requests</p>
          </div>
          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            {showManualForm ? 'Cancel' : 'Manual Attendance'}
          </button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('successfully')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
          <button
            onClick={() => setMessage('')}
            className="float-right ml-4 text-lg font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Manual Attendance Form */}
      {showManualForm && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Record Manual Attendance</h2>
          <form onSubmit={handleManualAttendance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                <input
                  type="text"
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({...manualForm, employee_id: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter employee ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={manualForm.type}
                  onChange={(e) => setManualForm({...manualForm, type: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="checkin">Check-in</option>
                  <option value="checkout">Check-out</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({...manualForm, date: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  value={manualForm.time}
                  onChange={(e) => setManualForm({...manualForm, time: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason</label>
              <textarea
                value={manualForm.reason}
                onChange={(e) => setManualForm({...manualForm, reason: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Please explain the reason for manual attendance"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingId === 'manual'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {processingId === 'manual' ? 'Recording...' : 'Record Attendance'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Attendance Form */}
      {editingAttendance && (
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Edit Attendance Record</h2>
          <form onSubmit={handleEditAttendance} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Check-in Time</label>
                <input
                  type="time"
                  value={editForm.check_in}
                  onChange={(e) => setEditForm({...editForm, check_in: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Check-out Time</label>
                <input
                  type="time"
                  value={editForm.check_out}
                  onChange={(e) => setEditForm({...editForm, check_out: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reason for Edit</label>
              <textarea
                value={editForm.reason}
                onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Please explain the reason for editing this attendance record"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingAttendance(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processingId === 'edit'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {processingId === 'edit' ? 'Updating...' : 'Update Attendance'}
              </button>
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
  );
};

export default AdminCorrectionRequestsPage;
