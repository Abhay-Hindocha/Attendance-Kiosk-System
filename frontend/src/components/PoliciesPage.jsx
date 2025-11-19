import React, { useState, useEffect } from 'react';
import { Edit, Archive, Plus, CheckCircle, Clock, Calendar, Coffee, Copy, XCircle, Trash2, X, AlertCircle } from 'lucide-react';
import apiService from '../services/api';

const PoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: 'success', message: '' });
  const [formData, setFormData] = useState({
    policyName: '',
    effectiveFrom: '',
    effectiveTo: '',
    includeBreak: false,
    breakHours: 1,
    breakMinutes: 0,
    fullDayHours: 8,
    fullDayMinutes: 30,
    halfDayHours: 4,
    halfDayMinutes: 30,
    enableLateTracking: true,
    workStartTime: '09:00',
    lateGracePeriod: 15,
    enableEarlyTracking: true,
    workEndTime: '18:00',
    earlyGracePeriod: 15
  });

  useEffect(() => {
    const loadPolicies = async () => {
      try {
        const data = await apiService.getPolicies();
        setPolicies(data);
      } catch (error) {
        console.error('Failed to load policies:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPolicies();
  }, []);

  const handleEdit = (policy) => {
    const parseDate = (dateString) => {
      if (!dateString) return '';
      try {
        // Handle different date formats
        let date;
        if (dateString.includes('T')) {
          // Already has time component, parse directly
          date = new Date(dateString);
        } else {
          // Date only, assume local time
          date = new Date(dateString + 'T00:00:00');
        }
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return '';
        }
        // Format to YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error parsing date:', dateString, error);
        return '';
      }
    };

    setEditingPolicy(policy);
    setFormData({
      policyName: policy.name || '',
      effectiveFrom: parseDate(policy.effective_from),
      effectiveTo: parseDate(policy.effective_to),
      includeBreak: policy.include_break || false,
      breakHours: policy.break_hours || 1,
      breakMinutes: policy.break_minutes || 0,
      fullDayHours: policy.full_day_hours || 8,
      fullDayMinutes: policy.full_day_minutes || 30,
      halfDayHours: policy.half_day_hours || 4,
      halfDayMinutes: policy.half_day_minutes || 30,
      enableLateTracking: policy.enable_late_tracking !== undefined ? policy.enable_late_tracking : true,
      workStartTime: policy.work_start_time ? policy.work_start_time.substring(0, 5) : '09:00',
      lateGracePeriod: policy.late_grace_period || 15,
      enableEarlyTracking: policy.enable_early_tracking !== undefined ? policy.enable_early_tracking : true,
      workEndTime: policy.work_end_time ? policy.work_end_time.substring(0, 5) : '18:00',
      earlyGracePeriod: policy.early_grace_period || 15,

    });
    setShowForm(true);
  };

  const handleCreate = () => {
    setEditingPolicy(null);
    setFormData({
      policyName: '',
      effectiveFrom: '',
      effectiveTo: '',
      includeBreak: false,
      breakHours: 1,
      breakMinutes: 0,
      fullDayHours: 8,
      fullDayMinutes: 30,
      halfDayHours: 4,
      halfDayMinutes: 30,
      enableLateTracking: true,
      workStartTime: '09:00',
      lateGracePeriod: 15,
      enableEarlyTracking: true,
      workEndTime: '18:00',
      earlyGracePeriod: 15
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const policyData = {
      name: formData.policyName,
      effective_from: formData.effectiveFrom ? formData.effectiveFrom : null,
      effective_to: formData.effectiveTo ? formData.effectiveTo : null,
      include_break: formData.includeBreak,
      break_hours: formData.breakHours,
      break_minutes: formData.breakMinutes,
      full_day_hours: formData.fullDayHours,
      full_day_minutes: formData.fullDayMinutes,
      half_day_hours: formData.halfDayHours,
      half_day_minutes: formData.halfDayMinutes,
      enable_late_tracking: formData.enableLateTracking,
      work_start_time: formData.workStartTime,
      late_grace_period: formData.lateGracePeriod,
      enable_early_tracking: formData.enableEarlyTracking,
      work_end_time: formData.workEndTime,
      early_grace_period: formData.earlyGracePeriod,
      // enable_absence_tracking: formData.enableAbsenceTracking // Removed absence tracking
    };

    try {
      if (editingPolicy) {
        const updatedPolicy = await apiService.updatePolicy(editingPolicy.id, policyData);
        setPolicies(policies.map(pol => pol.id === editingPolicy.id ? updatedPolicy : pol));
        setNotification({ show: true, type: 'success', message: 'Policy updated successfully!' });
      } else {
        const newPolicy = await apiService.createPolicy(policyData);
        setPolicies([...policies, newPolicy]);
        setNotification({ show: true, type: 'success', message: 'Policy created successfully!' });
      }
      setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to save policy:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to save policy. Please try again.' });
      setTimeout(() => setNotification({ show: false, type: 'error', message: '' }), 3000);
    }
  };

  const handleDelete = (policy) => {
    setDeleteConfirm(policy);
  };

  const handleArchive = (policy) => {
    setArchiveConfirm(policy);
  };

  const confirmArchive = async () => {
    try {
      const response = await apiService.togglePolicyStatus(archiveConfirm.id);
      setPolicies(policies.map(pol => pol.id === archiveConfirm.id ? response.policy : pol));
      setArchiveConfirm(null);
      setNotification({ show: true, type: 'success', message: response.message || 'Policy status updated successfully!' });
      setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
    } catch (error) {
      console.error('Failed to toggle policy status:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to update policy status. Please try again.' });
      setTimeout(() => setNotification({ show: false, type: 'error', message: '' }), 3000);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.id) {
      setNotification({ show: true, type: 'error', message: 'Invalid policy selected. Please try again.' });
      setTimeout(() => setNotification({ show: false, type: 'error', message: '' }), 3000);
      setDeleteConfirm(null);
      return;
    }
    try {
      await apiService.deletePolicy(deleteConfirm.id);
      setPolicies(policies.filter(pol => pol.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      setNotification({ show: true, type: 'success', message: 'Policy deleted successfully!' });
      setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
    } catch (error) {
      console.error('Failed to delete policy:', error);
      if (error.response && error.response.status === 422 && error.response.data.error) {
        setDeleteError(error.response.data);
        setDeleteConfirm(null);
      } else {
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete policy. Please try again.';
        setNotification({ show: true, type: 'error', message: errorMessage });
        setTimeout(() => setNotification({ show: false, type: 'error', message: '' }), 3000);
      }
    }
  };

  const handleCopy = async (policy) => {
    const copiedPolicyData = {
      name: `Copy of ${policy.name}`,
      effective_from: policy.effective_from,
      effective_to: policy.effective_to,
      include_break: policy.include_break,
      break_hours: policy.break_hours,
      break_minutes: policy.break_minutes,
      full_day_hours: policy.full_day_hours,
      full_day_minutes: policy.full_day_minutes,
      half_day_hours: policy.half_day_hours,
      half_day_minutes: policy.half_day_minutes,
      enable_late_tracking: policy.enable_late_tracking,
      work_start_time: policy.work_start_time ? policy.work_start_time.substring(0, 5) : '09:00',
      late_grace_period: policy.late_grace_period,
      enable_early_tracking: policy.enable_early_tracking,
      work_end_time: policy.work_end_time ? policy.work_end_time.substring(0, 5) : '18:00',
      early_grace_period: policy.early_grace_period,
      enable_absence_tracking: policy.enable_absence_tracking
    };

    try {
      const newPolicy = await apiService.createPolicy(copiedPolicyData);
      setPolicies([...policies, newPolicy]);
      setNotification({ show: true, type: 'success', message: 'Policy copied successfully!' });
      setTimeout(() => setNotification({ show: false, type: 'success', message: '' }), 3000);
    } catch (error) {
      console.error('Failed to copy policy:', error);
      setNotification({ show: true, type: 'error', message: 'Failed to copy policy. Please try again.' });
      setTimeout(() => setNotification({ show: false, type: 'error', message: '' }), 3000);
    }
  };

  const formatTime = (timeString) => timeString ? timeString.substring(0, 5) : '-';

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Policy Management</h1>
              <p className="text-sm text-gray-600 mt-1">Configure attendance policies</p>
            </div>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors text-sm md:text-base"
            >
              <Plus className="w-5 h-5" />
              <span>Create Policy</span>
            </button>
          </div>
        </div>

        {/* Notification */}
        {notification.show && (
          <div className={`mb-6 p-4 border rounded-lg flex items-center shadow-sm ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
        )}

        {/* Policies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {policies.map((policy, index) => (
            <div key={policy.id || `policy-${index}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{policy.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    policy.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {policy.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{policy.employees_count || 0} employees assigned</p>
              </div>
              <div className="p-4 md:p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-600">Work Hours</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatTime(policy.work_start_time)} - {formatTime(policy.work_end_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Full Day / Half Day</p>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.full_day_hours}.{policy.full_day_minutes} hrs / {policy.half_day_hours}.{policy.half_day_minutes} hrs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Coffee className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-gray-600">Break Duration</p>
                    <p className="text-sm font-medium text-gray-900">
                      {policy.break_hours}.{policy.break_minutes} hr {policy.include_break ? '(Included)' : '(Excluded)'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => handleEdit(policy)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleCopy(policy)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  title="Copy"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleArchive(policy)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  title={policy.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* No Policies Found */}
        {policies.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No policies found</p>
            <p className="text-sm mt-2">Create your first policy to get started</p>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">{editingPolicy ? 'Edit Policy' : 'Create Policy'}</h2>
                  <p className="text-sm md:text-base text-gray-600 mt-1">{editingPolicy ? editingPolicy.name : 'New Policy'}</p>
                </div>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Policy Name */}
                  <div>
                    <label htmlFor="policyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Policy Name
                    </label>
                    <input
                      id="policyName"
                      type="text"
                      placeholder="e.g., Standard Office Policy"
                      value={formData.policyName}
                      onChange={(e) => setFormData({ ...formData, policyName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  {/* Effective Dates */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Effective From</label>
                      <input
                        type="date"
                        value={formData.effectiveFrom}
                        onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Effective To</label>
                      <input
                        type="date"
                        value={formData.effectiveTo}
                        onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Work Duration Settings */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      Work Duration Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          id="breakHandlingEdit"
                          checked={formData.includeBreak}
                          onChange={(e) => setFormData({ ...formData, includeBreak: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="breakHandlingEdit" className="text-sm font-medium text-gray-700">
                          Include break time in work duration calculation
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Break Duration (Hours)</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="1.0"
                            value={formData.breakHours}
                            onChange={(e) => setFormData({ ...formData, breakHours: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Break Duration (Minutes)</label>
                          <input
                            type="number"
                            step="15"
                            placeholder="0"
                            value={formData.breakMinutes}
                            onChange={(e) => setFormData({ ...formData, breakMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Attendance Classification */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      Attendance Classification
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Day Minimum Hours</label>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="number"
                            placeholder="8"
                            value={formData.fullDayHours}
                            onChange={(e) => setFormData({ ...formData, fullDayHours: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="30"
                            value={formData.fullDayMinutes}
                            onChange={(e) => setFormData({ ...formData, fullDayMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Hours and Minutes</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Half Day Minimum Hours</label>
                        <div className="grid grid-cols-2 gap-4">
                          <input
                            type="number"
                            placeholder="4"
                            value={formData.halfDayHours}
                            onChange={(e) => setFormData({ ...formData, halfDayHours: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <input
                            type="number"
                            placeholder="30"
                            value={formData.halfDayMinutes}
                            onChange={(e) => setFormData({ ...formData, halfDayMinutes: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Hours and Minutes</p>
                      </div>
                    </div>
                  </div>

                  {/* Late Arrival Tracking */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      Late Arrival Tracking
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          id="enableLateEdit"
                          checked={formData.enableLateTracking}
                          onChange={(e) => setFormData({ ...formData, enableLateTracking: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="enableLateEdit" className="text-sm font-medium text-gray-700">
                          Enable late arrival tracking
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work Start Time</label>
                          <input
                            type="time"
                            value={formData.workStartTime}
                            onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (minutes)</label>
                          <input
                            type="number"
                            placeholder="15"
                            value={formData.lateGracePeriod}
                            onChange={(e) => setFormData({ ...formData, lateGracePeriod: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Early Departure Tracking */}
                  <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      Early Departure Tracking
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          id="enableEarlyEdit"
                          checked={formData.enableEarlyTracking}
                          onChange={(e) => setFormData({ ...formData, enableEarlyTracking: e.target.checked })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <label htmlFor="enableEarlyEdit" className="text-sm font-medium text-gray-700">
                          Enable early departure tracking
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Work End Time</label>
                          <input
                            type="time"
                            value={formData.workEndTime}
                            onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Grace Period (minutes)</label>
                          <input
                            type="number"
                            placeholder="15"
                            value={formData.earlyGracePeriod}
                            onChange={(e) => setFormData({ ...formData, earlyGracePeriod: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Delete Policy</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Error Modal */}
        {deleteError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Cannot Delete Policy</h2>
                </div>
                <p className="text-red-600 mb-4 font-medium">{deleteError.error}</p>
                <p className="text-gray-600 mb-6">The following employees are currently assigned to this policy:</p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
                  <ul className="space-y-2">
                    {deleteError.assigned_employees.map((employee, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></span>
                        <span className="font-medium">{employee.employee_id}</span>
                        <span className="text-gray-600">- {employee.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteError(null)}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Archive Confirmation Modal */}
        {archiveConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <Archive className="w-6 h-6 text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {archiveConfirm.status === 'active' ? 'Deactivate Policy' : 'Activate Policy'}
                  </h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to {archiveConfirm.status === 'active' ? 'deactivate' : 'activate'} <strong>{archiveConfirm.name}</strong>?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setArchiveConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmArchive}
                    className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                  >
                    {archiveConfirm.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PoliciesPage;