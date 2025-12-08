import React, { useState, useEffect } from 'react';
import {
  Clock,
  User,
  Edit3,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  FileText
} from 'lucide-react';

const AdminAttendanceCorrectionPage = () => {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [addForm, setAddForm] = useState({
    date: '',
    check_in: '',
    check_out: '',
    reason: '',
    breaks: []
  });

  // Helper function to format date to dd-mm-yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper function to calculate total break duration in minutes
  const calculateBreakDuration = (breaks) => {
    if (!breaks || breaks.length === 0) return 'N/A';
    let totalMinutes = 0;
    breaks.forEach(breakItem => {
      if (breakItem.break_start && breakItem.break_end) {
        const start = new Date(`1970-01-01T${breakItem.break_start}:00`);
        const end = new Date(`1970-01-01T${breakItem.break_end}:00`);
        const diffMs = end - start;
        const diffMins = Math.floor(diffMs / 60000); // Convert to minutes
        if (diffMins > 0) totalMinutes += diffMins;
      }
    });
    return totalMinutes > 0 ? `${totalMinutes} min` : 'N/A';
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      fetchEmployees();
    }
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments);
      } else {
        setError('Failed to fetch departments');
      }
    } catch (error) {
      setError('Failed to fetch departments');
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(`/api/admin/employees-by-department?department=${encodeURIComponent(selectedDepartment)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees);
      } else {
        setError('Failed to fetch employees');
      }
    } catch (error) {
      setError('Failed to fetch employees');
    }
  };

  const fetchAttendanceLogs = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      setError('Please select employee and date range');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/attendance-logs?employee_id=${selectedEmployee}&start_date=${startDate}&end_date=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceLogs(data.attendances);
      } else {
        setError('Failed to fetch attendance logs');
      }
    } catch (error) {
      setError('Failed to fetch attendance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAttendance = () => {
    const initialForm = {};
    attendanceLogs.forEach(log => {
      initialForm[log.id] = {
        check_in: '',
        check_out: '',
        reason: '',
        breaks: log.breaks ? log.breaks.map(b => ({ break_start: b.break_start || '', break_end: b.break_end || '' })) : []
      };
    });
    setEditForm(initialForm);
    setShowEditModal(true);
  };

  const addBreak = (logId) => {
    setEditForm(prev => ({
      ...prev,
      [logId]: {
        ...prev[logId],
        breaks: [...(prev[logId].breaks || []), { break_start: '', break_end: '' }]
      }
    }));
  };

  const removeBreak = (logId, index) => {
    setEditForm(prev => ({
      ...prev,
      [logId]: {
        ...prev[logId],
        breaks: prev[logId].breaks.filter((_, i) => i !== index)
      }
    }));
  };

  const handleUpdateSingleAttendance = async (attendanceId) => {
    const formData = editForm[attendanceId];
    const hasTimingData = formData.check_in || formData.check_out || (formData.breaks && formData.breaks.some(b => b.break_start || b.break_end));
    if (!formData || !formData.reason || !hasTimingData) {
      alert('Please provide reason and at least one timing field');
      return;
    }

    // Prepare the request data, converting empty break strings to null
    const requestData = {
      ...formData,
      breaks: formData.breaks ? formData.breaks.map(breakItem => ({
        break_start: breakItem.break_start || null,
        break_end: breakItem.break_end || null
      })) : []
    };

    try {
      const response = await fetch(`/api/admin/attendance/${attendanceId}/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        fetchAttendanceLogs(); // Refresh the logs
        setEditForm({ ...editForm, [attendanceId]: {} }); // Clear the form for this record
        alert('Attendance updated successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update attendance');
      }
    } catch (error) {
      setError('Failed to update attendance');
    }
  };

  const handleAddNewAttendance = async () => {
    try {
      const hasTimingData = addForm.check_in || addForm.check_out || (addForm.breaks && addForm.breaks.some(b => b.break_start || b.break_end));
      if (!addForm.reason || !hasTimingData) {
        setError('Please provide reason and at least one timing field');
        return;
      }

      const requestData = {
        employee_id: selectedEmployee,
        date: addForm.date,
        reason: addForm.reason,
      };

      if (addForm.check_in) requestData.check_in = addForm.check_in;
      if (addForm.check_out) requestData.check_out = addForm.check_out;

      if (addForm.breaks && Array.isArray(addForm.breaks) && addForm.breaks.length > 0) {
        // convert empty strings to null for backend
        requestData.breaks = addForm.breaks.map(b => ({
          break_start: b.break_start || null,
          break_end: b.break_end || null
        }));
      }

      const response = await fetch('/api/admin/attendance/add-new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        setShowAddModal(false);
        setAddForm({ date: '', check_in: '', check_out: '', reason: '', breaks: [] });
        fetchAttendanceLogs(); // Refresh the logs
        alert('New attendance added successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add new attendance');
      }
    } catch (error) {
      setError('Failed to add new attendance');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Attendance Correction</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manual attendance correction and management</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl shadow-lg border-l-4 bg-red-50 text-red-800 border-red-400 flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-400 hover:text-red-600 transition-colors duration-200"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>
        )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedEmployee('');
                setAttendanceLogs([]);
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setAttendanceLogs([]);
              }}
              disabled={!selectedDepartment}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

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
                    setStartDate(today);
                    setEndDate(today);
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
                    setStartDate('');
                    setEndDate('');
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
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <button
            onClick={fetchAttendanceLogs}
            disabled={!selectedEmployee || !startDate || !endDate || loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Loading...' : 'Fetch Attendance Logs'}
          </button>

          <button
            onClick={() => {
              // Prefill add form date with selected startDate (or today) and reset fields
              const defaultDate = startDate || new Date().toISOString().split('T')[0];
              setAddForm({ date: defaultDate, check_in: '', check_out: '', reason: '', breaks: [] });
              setShowAddModal(true);
            }}
            disabled={!selectedEmployee}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Attendance
          </button>

          <button
            onClick={handleEditAttendance}
            disabled={attendanceLogs.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Attendance Records
          </button>
        </div>
      </div>

      {/* Attendance Logs Table */}
      {attendanceLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Attendance Logs</h2>
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(log.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.check_in || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.check_out || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.breaks && log.breaks.length > 0 ? (
                        <div className="space-y-1">
                          {log.breaks.map((breakItem, index) => (
                            <div key={breakItem.id} className="text-xs">
                              Break {index + 1}: {breakItem.break_start || '-'} - {breakItem.break_end || '-'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        'No breaks'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {calculateBreakDuration(log.breaks)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-xl bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-gray-600" />
                  Edit Attendance Records
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Showing attendance records for {employees.find(emp => emp.id === parseInt(selectedEmployee))?.name || 'Selected Employee'} from {formatDate(startDate)} to {formatDate(endDate)}
                </p>
              </div>

              <div className="space-y-6">
                {attendanceLogs.map((log) => (
                  <div key={log.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-900">{log.date}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 lg:mt-0">
                        <div className="text-sm text-gray-600">
                          Current: {log.check_in || 'No check-in'} - {log.check_out || 'No check-out'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          New Check In
                        </label>
                        <input
                          type="time"
                          value={editForm[log.id]?.check_in || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            [log.id]: {
                              ...editForm[log.id],
                              check_in: e.target.value,
                              id: log.id
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          New Check Out
                        </label>
                        <input
                          type="time"
                          value={editForm[log.id]?.check_out || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            [log.id]: {
                              ...editForm[log.id],
                              check_out: e.target.value,
                              id: log.id
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="block text-sm font-medium text-gray-700">Breaks</label>
                      <div className="space-y-3">
                        {(editForm[log.id]?.breaks || []).map((breakItem, index) => (
                          <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                            <input
                              type="time"
                              value={breakItem.break_start}
                              onChange={(e) => {
                                const newBreaks = [...editForm[log.id].breaks];
                                newBreaks[index].break_start = e.target.value;
                                setEditForm({
                                  ...editForm,
                                  [log.id]: {
                                    ...editForm[log.id],
                                    breaks: newBreaks
                                  }
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                              placeholder="Start time"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="time"
                              value={breakItem.break_end}
                              onChange={(e) => {
                                const newBreaks = [...editForm[log.id].breaks];
                                newBreaks[index].break_end = e.target.value;
                                setEditForm({
                                  ...editForm,
                                  [log.id]: {
                                    ...editForm[log.id],
                                    breaks: newBreaks
                                  }
                                });
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                              placeholder="End time"
                            />
                            <button
                              onClick={() => removeBreak(log.id, index)}
                              className="text-red-500 hover:text-red-700 transition-colors p-1"
                              type="button"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addBreak(log.id)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2 text-sm font-medium"
                          type="button"
                        >
                          <Plus className="w-4 h-4" />
                          Add Break
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6">
                      <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        Reason *
                      </label>
                      <textarea
                        value={editForm[log.id]?.reason || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          [log.id]: {
                            ...editForm[log.id],
                            reason: e.target.value,
                            id: log.id
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                        rows={3}
                        placeholder="Please explain the reason for this attendance correction"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => handleUpdateSingleAttendance(log.id)}
                        disabled={!editForm[log.id]?.reason || !editForm[log.id]?.check_in && !editForm[log.id]?.check_out && !(editForm[log.id]?.breaks && editForm[log.id].breaks.some(b => b.break_start || b.break_end))}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Update Record
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Attendance Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-xl bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-gray-600" />
                  Add New Attendance
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleAddNewAttendance(); }} className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Date *
                  </label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({...addForm, date: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Check In
                    </label>
                    <input
                      type="time"
                      value={addForm.check_in}
                      onChange={(e) => setAddForm({...addForm, check_in: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      Check Out
                    </label>
                    <input
                      type="time"
                      value={addForm.check_out}
                      onChange={(e) => setAddForm({...addForm, check_out: e.target.value})}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Breaks</label>
                  <div className="space-y-3">
                    {(addForm.breaks || []).map((breakItem, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="time"
                          value={breakItem.break_start}
                          onChange={(e) => {
                            const newBreaks = [...addForm.breaks];
                            newBreaks[index].break_start = e.target.value;
                            setAddForm({ ...addForm, breaks: newBreaks });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                          placeholder="Start time"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="time"
                          value={breakItem.break_end}
                          onChange={(e) => {
                            const newBreaks = [...addForm.breaks];
                            newBreaks[index].break_end = e.target.value;
                            setAddForm({ ...addForm, breaks: newBreaks });
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                          placeholder="End time"
                        />
                        <button
                          onClick={() => setAddForm({ ...addForm, breaks: addForm.breaks.filter((_, i) => i !== index) })}
                          className="text-red-500 hover:text-red-700 transition-colors p-1"
                          type="button"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setAddForm({ ...addForm, breaks: [...(addForm.breaks || []), { break_start: '', break_end: '' }] })}
                      className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2 text-sm font-medium"
                      type="button"
                    >
                      <Plus className="w-4 h-4" />
                      Add Break
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-500" />
                    Reason *
                  </label>
                  <textarea
                    value={addForm.reason}
                    onChange={(e) => setAddForm({...addForm, reason: e.target.value})}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    rows={4}
                    placeholder="Please explain the reason for adding this attendance record"
                    required
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Attendance
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminAttendanceCorrectionPage;
