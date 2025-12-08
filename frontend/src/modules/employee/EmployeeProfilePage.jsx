  import React, { useState, useRef } from 'react';
import { useEmployeePortal } from './EmployeeLayout';
import employeeApi from '../../services/employeeApi';

const EmployeeProfilePage = () => {
  const { profile, refreshProfile } = useEmployeePortal();
  const [activeTab, setActiveTab] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    phone: '',
    emergency_contact: ''
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: ''
  });

  // Correction request form state
  const [correctionForm, setCorrectionForm] = useState({
    type: 'missing',
    attendance_id: '',
    requested_check_in: '',
    requested_check_out: '',
    reason: ''
  });

  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  React.useEffect(() => {
    if (profile) {
      setProfileForm({
        phone: profile.phone || '',
        emergency_contact: profile.emergency_contact || ''
      });
    }
  }, [profile]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      await employeeApi.updateProfile(profileForm);
      setMessage('Profile updated successfully');
      refreshProfile();
    } catch (error) {
      if (error.errors) {
        setMessage(Object.values(error.errors).flat().join(', '));
      } else {
        setMessage(error.message || 'Failed to update profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setMessage('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await employeeApi.changePassword({
        current_password: passwordForm.current_password,
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation
      });

      setMessage('Password changed successfully');
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: ''
      });
    } catch (error) {
      if (error.errors) {
        setMessage(Object.values(error.errors).flat().join(', '));
      } else {
        setMessage(error.message || 'Failed to change password');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeChange = (newType) => {
    setCorrectionForm({
      ...correctionForm,
      type: newType,
      attendance_id: '', // Clear attendance_id when switching types
      requested_check_in: newType === 'missing' ? correctionForm.requested_check_in : '',
      requested_check_out: newType === 'missing' ? correctionForm.requested_check_out : ''
    });
  };

  const validateTimes = () => {
    if (correctionForm.requested_check_in && correctionForm.requested_check_out) {
      const checkInTime = correctionForm.requested_check_in;
      const checkOutTime = correctionForm.requested_check_out;
      if (checkOutTime <= checkInTime) {
        return 'Check-out time must be after check-in time';
      }
    }
    return null;
  };

  const handleCorrectionRequest = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // Validate times
    const timeValidationError = validateTimes();
    if (timeValidationError) {
      setMessage(timeValidationError);
      setIsLoading(false);
      return;
    }

    try {
      await employeeApi.submitCorrectionRequest(correctionForm);

      setMessage('Correction request submitted successfully');
      setCorrectionForm({
        type: 'missing',
        attendance_id: '',
        requested_check_in: '',
        requested_check_out: '',
        reason: ''
      });
      loadCorrectionRequests();
    } catch (error) {
      setMessage(error.message || 'Failed to submit correction request');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCorrectionRequests = async () => {
    setLoadingRequests(true);
    setRequestsError(null);
    try {
      const data = await employeeApi.getCorrectionRequests();
      setCorrectionRequests(data.requests || []);
    } catch (error) {
      console.error('Failed to load correction requests:', error);
      setRequestsError('Failed to load correction requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'corrections') {
      loadCorrectionRequests();
    }
  }, [activeTab]);

  if (!profile) {
    return null;
  }

  const tabs = [
    { id: 'view', label: 'Profile' },
    { id: 'edit', label: 'Edit Profile' },
    { id: 'password', label: 'Change Password' },
    { id: 'corrections', label: 'Attendance Corrections' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Employee</p>
            <h2 className="text-2xl font-semibold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.employee_id}</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <button
              onClick={refreshProfile}
              className="px-4 py-2 rounded-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.includes('successfully')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* View Profile Tab */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Emergency Contact</p>
                  <p className="font-medium text-gray-900">{profile.emergency_contact || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="font-medium text-gray-900">{profile.department || 'General'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Designation</p>
                  <p className="font-medium text-gray-900">{profile.designation || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Join Date</p>
                  <p className="font-medium text-gray-900">
                    {profile.join_date
                      ? new Date(profile.join_date).toLocaleDateString('en-GB')
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Leave Policies</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.leave_policies?.map((policy) => (
                    <div key={policy.id} className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{policy.name}</p>
                      <p className="text-xs text-gray-500">{policy.yearly_quota} days/year</p>
                    </div>
                  ))}
                  {(!profile.leave_policies || profile.leave_policies.length === 0) && (
                    <p className="text-sm text-gray-500">No leave policies assigned.</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Attendance Policy</h3>
                {profile.attendance_policy ? (
                  <div className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-sm font-semibold text-gray-900">{profile.attendance_policy.name}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Work Start:</span>
                        <span className="ml-1 font-medium">{profile.attendance_policy.work_start_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Work End:</span>
                        <span className="ml-1 font-medium">{profile.attendance_policy.work_end_time}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Break Duration:</span>
                        <span className="ml-1 font-medium">{profile.attendance_policy.break_duration} mins</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Grace Period:</span>
                        <span className="ml-1 font-medium">{profile.attendance_policy.grace_period} mins</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No attendance policy assigned.</p>
                )}
              </div>
            </div>
          )}

          {/* Edit Profile Tab */}
          {activeTab === 'edit' && (
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Emergency Contact</label>
                  <input
                    type="text"
                    value={profileForm.emergency_contact}
                    onChange={(e) => setProfileForm({...profileForm, emergency_contact: e.target.value})}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter emergency contact"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Profile'}
                </button>
              </div>
            </form>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.password_confirmation}
                  onChange={(e) => setPasswordForm({...passwordForm, password_confirmation: e.target.value})}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* Attendance Corrections Tab */}
          {activeTab === 'corrections' && (
            <div className="space-y-6">
              {/* Submit Correction Request Form */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Submit Correction Request</h3>
                <form onSubmit={handleCorrectionRequest} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Request Type</label>
                      <select
                        value={correctionForm.type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="missing">Missing Attendance</option>
                        <option value="wrong_checkin">Wrong Check-in Time</option>
                        <option value="wrong_checkout">Wrong Check-out Time</option>
                      </select>
                    </div>
                    {(correctionForm.type === 'wrong_checkin' || correctionForm.type === 'wrong_checkout') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Attendance ID</label>
                        <input
                          type="text"
                          value={correctionForm.attendance_id}
                          onChange={(e) => setCorrectionForm({...correctionForm, attendance_id: e.target.value})}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter attendance ID"
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Requested Check-in Time</label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_in}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_in: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required={correctionForm.type === 'missing'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Requested Check-out Time</label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_out}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_out: e.target.value})}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required={correctionForm.type === 'missing'}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <textarea
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Please explain the reason for this correction request"
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Correction Requests History */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Correction Request History</h3>
                <div className="space-y-3">
                  {loadingRequests ? (
                    <p className="text-gray-500 text-center py-4">Loading correction requests...</p>
                  ) : requestsError ? (
                    <p className="text-red-500 text-center py-4">{requestsError}</p>
                  ) : correctionRequests.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No correction requests found.</p>
                  ) : (
                    correctionRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{request.type.replace('_', ' ')}</p>
                            <p className="text-sm text-gray-500">Submitted on {request.submitted_at}</p>
                            <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                            {(request.requested_check_in || request.requested_check_out) && (
                              <p className="text-sm text-gray-600 mt-1">
                                Requested: {request.requested_check_in || 'N/A'} - {request.requested_check_out || 'N/A'}
                              </p>
                            )}
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            request.status === 'approved' ? 'bg-green-100 text-green-800' :
                            request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {request.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;

