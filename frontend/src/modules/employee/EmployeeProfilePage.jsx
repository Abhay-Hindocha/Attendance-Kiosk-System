import React, { useState, useRef } from 'react';
import { useEmployeePortal } from './EmployeeLayout';
import { User, Phone, Mail, Building, Calendar, Shield, Edit, Key, FileText, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const EmployeeProfilePage = () => {
  const { profile, refreshProfile } = useEmployeePortal();
  const [activeTab, setActiveTab] = useState('view');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-dismiss success/error messages after 2 seconds
  React.useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2000);
    return () => clearTimeout(timer);
  }, [message]);
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
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [selectedDate, setSelectedDate] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const [correctionForm, setCorrectionForm] = useState({
    type: 'missing',
    requested_check_in: '',
    requested_check_out: '',
    reason: '',
    breaks: []
  });

  const [correctionRequests, setCorrectionRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestsError, setRequestsError] = useState(null);

  function getStatusColor(status) {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

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

  const fetchAttendanceLogs = async () => {
    if (!selectedDate) {
      setLogsError('Please select a date');
      return;
    }

    setLoadingLogs(true);
    setLogsError('');
    try {
      const params = {
        start_date: selectedDate,
        end_date: selectedDate
      };
      const data = await employeeApi.getAttendanceReport(params);
      setAttendanceLogs(data?.records || []);
      setSelectedLog(null); // Reset selected log when fetching new logs
    } catch (error) {
      console.error('Failed to fetch attendance logs:', error);
      setLogsError('Failed to fetch attendance logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDateRangeChange = (option) => {
    setDateRangeOption(option);
    if (option === 'today') {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    } else {
      setSelectedDate('');
    }
    setAttendanceLogs([]);
    setSelectedLog(null);
  };

  const handleTypeChange = (newType) => {
    const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };

    setCorrectionForm({
      ...correctionForm,
      type: newType,
      requested_check_in: newType === 'missing' ? correctionForm.requested_check_in : (selectedLog ? formatTime(selectedLog.check_in) : ''),
      requested_check_out: newType === 'missing' ? correctionForm.requested_check_out : (selectedLog ? formatTime(selectedLog.check_out) : '')
    });
  };

  const handleLogSelection = (log) => {
    setSelectedLog(log);
    const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    };
    setCorrectionForm({
      ...correctionForm,
      requested_check_in: formatTime(log.check_in),
      requested_check_out: formatTime(log.check_out),
      breaks: log.breaks ? log.breaks.map(b => ({
        break_start: b.break_start ? formatTime(b.break_start) : '',
        break_end: b.break_end ? formatTime(b.break_end) : ''
      })) : []
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
      const formData = {
        ...correctionForm,
        attendance_id: correctionForm.type === 'missing' ? null : selectedLog.id,
        date: selectedLog.date // Include the selected log date
      };
      await employeeApi.submitCorrectionRequest(formData);

      setMessage('Correction request submitted successfully');
      setCorrectionForm({
        type: 'missing',
        requested_check_in: '',
        requested_check_out: '',
        reason: '',
        breaks: []
      });
      setSelectedLog(null);
      setAttendanceLogs([]);
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
      setCorrectionRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (error) {
      console.error('Failed to load correction requests:', error);
      setRequestsError('Failed to load correction requests');
      setCorrectionRequests([]);
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
                  {(profile.leave_policies || []).map((policy) => (
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

          {/* Edit Profile Tab (now includes Change Password) */}
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

              {/* Change Password moved into Edit tab */}
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
              {/* Error Message */}
              {logsError && (
                <div className="p-4 rounded-xl shadow-lg border-l-4 bg-red-50 text-red-800 border-red-400 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                    <span className="font-medium">{logsError}</span>
                  </div>
                  <button
                    onClick={() => setLogsError('')}
                    className="text-red-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      Date Range
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="today"
                          name="dateRange"
                          value="today"
                          checked={dateRangeOption === 'today'}
                          onChange={(e) => {
                            setDateRangeOption(e.target.value);
                            const today = new Date().toISOString().split('T')[0];
                            setSelectedDate(today);
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="today" className="ml-2 block text-sm text-gray-900">
                          Today
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="custom"
                          name="dateRange"
                          value="custom"
                          checked={dateRangeOption === 'custom'}
                          onChange={(e) => {
                            setDateRangeOption(e.target.value);
                            setSelectedDate('');
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="custom" className="ml-2 block text-sm text-gray-900">
                          Custom Range
                        </label>
                      </div>
                    </div>
                  </div>

                  {dateRangeOption === 'custom' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={fetchAttendanceLogs}
                    disabled={!selectedDate || loadingLogs}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {loadingLogs && <RefreshCw className="w-4 h-4 animate-spin" />}
                    {loadingLogs ? 'Loading...' : 'Fetch Attendance Logs'}
                  </button>
                </div>
              </div>

              {/* Attendance Logs Table */}
              {attendanceLogs.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold">Your Attendance Logs</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Check In
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Check Out
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Breaks
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Break Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Hours
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(attendanceLogs || []).map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(log.date).toLocaleDateString('en-GB')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.check_in ? new Date(log.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.check_out ? new Date(log.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.breaks && log.breaks.length > 0 ? (
                                <div className="space-y-1">
                                  {log.breaks.map((breakItem, index) => (
                                    <div key={breakItem.id || index} className="text-xs">
                                      Break {index + 1}: {breakItem.break_start ? new Date(breakItem.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'} - {breakItem.break_end ? new Date(breakItem.break_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                'No breaks'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.breaks && log.breaks.length > 0 ? `${log.breaks.length * 30} min` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.total_hours || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                log.status === 'Present' ? 'bg-green-100 text-green-800' :
                                log.status === 'Absent' ? 'bg-red-100 text-red-800' :
                                log.status === 'Late Arrival' ? 'bg-purple-100 text-purple-800' :
                                log.status === 'Early Departure' ? 'bg-pink-100 text-pink-800' :
                                log.status === 'Holiday' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                                log.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                type="button"
                                onClick={() => handleLogSelection(log)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                  selectedLog?.id === log.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                   }`}
                              >
                                {selectedLog?.id === log.id ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Attendance Correction request */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                   Attendance Correction request
                </h3>
                {selectedLog ? (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Selected Log:</strong> {new Date(selectedLog.date).toLocaleDateString()}{' '}
                      - Check-in: {selectedLog.check_in ? new Date(selectedLog.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}{' '}
                      - Check-out: {selectedLog.check_out ? new Date(selectedLog.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : 'N/A'}
                    </p>
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Please select an attendance log from the table above to submit a correction request.
                    </p>
                  </div>
                )}
                <form onSubmit={handleCorrectionRequest} className="space-y-6">
                  {/* Correction Type Selection */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Correction Type *
                    </label>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="missing"
                          name="correctionType"
                          value="missing"
                          checked={correctionForm.type === 'missing'}
                          onChange={(e) => handleTypeChange(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="missing" className="ml-2 block text-sm text-gray-900">
                          Change Attendance - Request for a completely missing attendance record
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="wrong_checkin"
                          name="correctionType"
                          value="wrong_checkin"
                          checked={correctionForm.type === 'wrong_checkin'}
                          onChange={(e) => handleTypeChange(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="wrong_checkin" className="ml-2 block text-sm text-gray-900">
                          Wrong Check-in Time - Correct only the check-in time
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="wrong_checkout"
                          name="correctionType"
                          value="wrong_checkout"
                          checked={correctionForm.type === 'wrong_checkout'}
                          onChange={(e) => handleTypeChange(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="wrong_checkout" className="ml-2 block text-sm text-gray-900">
                          Wrong Check-out Time - Correct only the check-out time
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id="wrong_break"
                          name="correctionType"
                          value="wrong_break"
                          checked={correctionForm.type === 'wrong_break'}
                          onChange={(e) => handleTypeChange(e.target.value)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor="wrong_break" className="ml-2 block text-sm text-gray-900">
                          Wrong Break Times - Correct break start and end times
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Check-in Time {(correctionForm.type === 'missing' || correctionForm.type === 'wrong_checkin') ? '*' : ''}
                      </label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_in}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_in: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required={correctionForm.type === 'missing' || correctionForm.type === 'wrong_checkin'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Check-out Time {(correctionForm.type === 'missing' || correctionForm.type === 'wrong_checkout') ? '*' : ''}
                      </label>
                      <input
                        type="time"
                        value={correctionForm.requested_check_out}
                        onChange={(e) => setCorrectionForm({...correctionForm, requested_check_out: e.target.value})}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        required={correctionForm.type === 'missing' || correctionForm.type === 'wrong_checkout'}
                      />
                    </div>
                  </div>

                  {/* Breaks Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        Breaks
                      </label>
                      <button
                        type="button"
                        onClick={() => setCorrectionForm({
                          ...correctionForm,
                          breaks: [...(correctionForm.breaks || []), { break_start: '', break_end: '' }]
                        })}
                        className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition-colors"
                      >
                        Add Break
                      </button>
                    </div>
                    {(correctionForm.breaks || []).map((breakItem, index) => (
                      <div key={`break-${index}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">
                            Break Start Time
                          </label>
                          <input
                            type="time"
                            value={breakItem.break_start}
                            onChange={(e) => {
                              const newBreaks = [...(correctionForm.breaks || [])];
                              newBreaks[index].break_start = e.target.value;
                              setCorrectionForm({...correctionForm, breaks: newBreaks});
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-600">
                            Break End Time
                          </label>
                          <input
                            type="time"
                            value={breakItem.break_end}
                            onChange={(e) => {
                              const newBreaks = [...(correctionForm.breaks || [])];
                              newBreaks[index].break_end = e.target.value;
                              setCorrectionForm({...correctionForm, breaks: newBreaks});
                            }}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              const newBreaks = (correctionForm.breaks || []).filter((_, i) => i !== index);
                              setCorrectionForm({...correctionForm, breaks: newBreaks});
                            }}
                            className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      Reason for Edit *
                    </label>
                    <textarea
                      value={correctionForm.reason}
                      onChange={(e) => setCorrectionForm({...correctionForm, reason: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                      rows={4}
                      placeholder="Please explain the reason for editing this attendance record"
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={isLoading || !selectedLog}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                      <FileText className="w-4 h-4" />
                      {isLoading ? 'Submitting...' : 'Submit Request'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Correction Requests History */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Your Correction Requests
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  {correctionRequests.length > 0 ? (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Requested Times
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reason
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(Array.isArray(correctionRequests) ? correctionRequests : []).map((request, index) => (
                          <tr key={request.id || `correction-${index}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.date ? new Date(request.date).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.type === 'missing' ? 'Change Attendance' :
                               request.type === 'wrong_checkin' ? 'Wrong Check-in' :
                               request.type === 'wrong_checkout' ? 'Wrong Check-out' :
                               request.type === 'wrong_break' ? 'Wrong Break Times' :
                               request.type === 'break' ? 'Break Correction' : request.type}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.requested_check_in || '-'} - {request.requested_check_out || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                              {request.reason}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {request.submitted_at ? new Date(request.submitted_at).toLocaleDateString('en-GB') : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No correction requests found
                    </div>
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
