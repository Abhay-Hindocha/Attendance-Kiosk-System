import React, { useState, useEffect } from 'react';

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Attendance Correction</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedEmployee('');
                setAttendanceLogs([]);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setAttendanceLogs([]);
              }}
              disabled={!selectedDepartment}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="space-y-2">
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="custom" className="ml-2 block text-sm text-gray-900">
                  Custom Range
                </label>
              </div>
            </div>
          </div>

          {dateRangeOption === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex gap-4">
          <button
            onClick={fetchAttendanceLogs}
            disabled={!selectedEmployee || !startDate || !endDate || loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
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
            className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Add New Attendance
          </button>

          <button
            onClick={handleEditAttendance}
            disabled={attendanceLogs.length === 0}
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Edit Attendance Records
          </button>
        </div>
      </div>

      {/* Attendance Logs Table */}
      {attendanceLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.date}
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
          <div className="relative top-20 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Edit Attendance Records
                </h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Showing attendance records for {employees.find(emp => emp.id === parseInt(selectedEmployee))?.name || 'Selected Employee'} from {startDate} to {endDate}
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Check In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        New Check Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reason
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Breaks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.check_in || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.check_out || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
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
                            className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="2"
                            placeholder="Reason for change"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-2">
                            {(editForm[log.id]?.breaks || []).map((breakItem, index) => (
                              <div key={index} className="flex items-center space-x-2">
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
                                  className="w-20 border border-gray-300 rounded-md px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-xs">-</span>
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
                                  className="w-20 border border-gray-300 rounded-md px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => removeBreak(log.id, index)}
                                  className="text-red-500 hover:text-red-700 text-xs"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addBreak(log.id)}
                              className="text-blue-500 hover:text-blue-700 text-xs"
                            >
                              + Add Break
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => handleUpdateSingleAttendance(log.id)}
                            disabled={!editForm[log.id]?.reason || !editForm[log.id]?.check_in && !editForm[log.id]?.check_out && !(editForm[log.id]?.breaks && editForm[log.id].breaks.some(b => b.break_start || b.break_end))}
                            className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New Attendance
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => setAddForm({...addForm, date: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check In
                    </label>
                    <input
                      type="time"
                      value={addForm.check_in}
                      onChange={(e) => setAddForm({...addForm, check_in: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check Out
                    </label>
                    <input
                      type="time"
                      value={addForm.check_out}
                      onChange={(e) => setAddForm({...addForm, check_out: e.target.value})}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Breaks</label>
                <div className="space-y-2">
                  {(addForm.breaks || []).map((breakItem, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={breakItem.break_start}
                        onChange={(e) => {
                          const newBreaks = [...addForm.breaks];
                          newBreaks[index].break_start = e.target.value;
                          setAddForm({ ...addForm, breaks: newBreaks });
                        }}
                        className="w-24 border border-gray-300 rounded-md px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-xs">-</span>
                      <input
                        type="time"
                        value={breakItem.break_end}
                        onChange={(e) => {
                          const newBreaks = [...addForm.breaks];
                          newBreaks[index].break_end = e.target.value;
                          setAddForm({ ...addForm, breaks: newBreaks });
                        }}
                        className="w-24 border border-gray-300 rounded-md px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => setAddForm({ ...addForm, breaks: addForm.breaks.filter((_, i) => i !== index) })}
                        className="text-red-500 hover:text-red-700 text-xs"
                        type="button"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setAddForm({ ...addForm, breaks: [...(addForm.breaks || []), { break_start: '', break_end: '' }] })}
                    className="text-blue-500 hover:text-blue-700 text-xs"
                    type="button"
                  >
                    + Add Break
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={addForm.reason}
                  onChange={(e) => setAddForm({...addForm, reason: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewAttendance}
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  Add Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAttendanceCorrectionPage;
