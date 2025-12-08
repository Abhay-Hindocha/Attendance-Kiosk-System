import React, { useState, useRef } from 'react';
import { useEmployeePortal } from './EmployeeLayout';
import { User, Phone, Mail, Building, Calendar, Shield, Edit, Key, FileText, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
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
    { id: 'view', label: 'Profile', icon: User },
    { id: 'edit', label: 'Edit Profile', icon: Edit },
    { id: 'password', label: 'Change Password', icon: Key },
    { id: 'corrections', label: 'Attendance Corrections', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Employee Profile</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage your personal information and account settings</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                <p className="text-xs text-gray-500">{profile.employee_id}</p>
              </div>
            </div>
            <button
              onClick={refreshProfile}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
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
              {/* Personal Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email Address</p>
                      <p className="font-medium text-gray-900">{profile.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="font-medium text-gray-900">{profile.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Emergency Contact</p>
                      <p className="font-medium text-gray-900">{profile.emergency_contact || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="font-medium text-gray-900">{profile.department || 'General'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Designation</p>
                      <p className="font-medium text-gray-900">{profile.designation || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Join Date</p>
                      <p className="font-medium text-gray-900">
                        {profile.join_date
                          ? new Date(profile.join_date).toLocaleDateString('en-GB')
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Leave Policies */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  Assigned Leave Policies
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.leave_policies?.map((policy) => (
                    <div key={policy.id} className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{policy.name}</p>
                          <p className="text-xs text-green-600 font-medium">{policy.yearly_quota} days/year</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!profile.leave_policies || profile.leave_policies.length === 0) && (
                    <div className="col-span-full p-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No leave policies assigned.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Attendance Policy */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Assigned Attendance Policy
                </h3>
                {profile.attendance_policy ? (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{profile.attendance_policy.name}</p>
                        <p className="text-sm text-blue-600">Work Schedule Policy</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Work Start</p>
                        <p className="text-sm font-semibold text-gray-900">{profile.attendance_policy.work_start_time}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Work End</p>
                        <p className="text-sm font-semibold text-gray-900">{profile.attendance_policy.work_end_time}</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Break Duration</p>
                        <p className="text-sm font-semibold text-gray-900">{profile.attendance_policy.break_duration} mins</p>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Grace Period</p>
                        <p className="text-sm font-semibold text-gray-900">{profile.attendance_policy.grace_period} mins</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No attendance policy assigned.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Profile Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Edit className="w-5 h-5 text-gray-600" />
                  Update Personal Information
                </h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-500" />
                        Emergency Contact
                      </label>
                      <input
                        type="text"
                        value={profileForm.emergency_contact}
                        onChange={(e) => setProfileForm({...profileForm, emergency_contact: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        placeholder="Enter emergency contact"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4" />
                          Update Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Change Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-gray-600" />
                  Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-500" />
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-500" />
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm({...passwordForm, password: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-500" />
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordForm.password_confirmation}
                      onChange={(e) => setPasswordForm({...passwordForm, password_confirmation: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Changing...
                        </>
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Attendance Corrections Tab */}
          {activeTab === 'corrections' && (
            <div className="space-y-6">
              {/* Submit Correction Request Form */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Submit Correction Request
                </h3>
                <form onSubmit={handleCorrectionRequest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Request Type
                      </label>
                      <select
                        value={correctionForm.type}
                        onChange={(e) => handleTypeChange(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      >
                        <option value="missing">Missing Attendance</option>
                        <option value="wrong_checkin">Wrong Check-in Time</option>
                        <option value="wrong_checkout">Wrong Check-out Time</option>
                      </select>
                    </div>
                    {(correctionForm.type === 'wrong_checkin' || correctionForm.type === 'wrong_checkout') && (
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          Attendance ID
                        </label>
                        <input
                          type="text"
                          value={correctionForm.attendance_id}
                          onChange={(e) => setCorrectionForm({...correctionForm, attendance_id: e.target.value})}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Enter attendance ID"
                          required
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Requested Check-in Time
                      </label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_in}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_in: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required={correctionForm.type === 'missing'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Requested Check-out Time
                      </label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_out}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_out: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required={correctionForm.type === 'missing'}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Reason
                    </label>
                    <textarea
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})}
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder="Please explain the reason for this correction request"
                      required
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Submit Request
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Correction Requests History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Correction Request History
                </h3>
                <div className="space-y-4">
                  {loadingRequests ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-gray-500">Loading correction requests...</p>
                    </div>
                  ) : requestsError ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                      <p className="text-red-500">{requestsError}</p>
                    </div>
                  ) : correctionRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No correction requests found.</p>
                    </div>
                  ) : (
                    correctionRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <p className="font-medium text-gray-900 capitalize">{request.type.replace('_', ' ')}</p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {request.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 mb-2">Submitted on {request.submitted_at}</p>
                            <p className="text-sm text-gray-600 mb-2">{request.reason}</p>
                            {(request.requested_check_in || request.requested_check_out) && (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <p className="text-sm text-gray-600">
                                  Requested: {request.requested_check_in || 'N/A'} - {request.requested_check_out || 'N/A'}
                                </p>
                              </div>
                            )}
                          </div>
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
    </div>
  );
};

export default EmployeeProfilePage;

