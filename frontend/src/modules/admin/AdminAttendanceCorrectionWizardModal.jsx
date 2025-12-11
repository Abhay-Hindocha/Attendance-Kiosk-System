import React, { useState, useEffect } from 'react';
import { X, Loader2, Plus, Edit, CheckCircle, Clock, Calendar, FileText, AlertCircle, User } from 'lucide-react';

const AdminAttendanceCorrectionWizardModal = ({ onClose, onSuccess, selectedEmployee, startDate, endDate, attendanceLogs }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [noLogsMsg, setNoLogsMsg] = useState('');

  // Department and employee selection
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [wizardSelectedEmployee, setWizardSelectedEmployee] = useState(selectedEmployee || '');
  const [dateRangeOption, setDateRangeOption] = useState('today');
  const [wizardStartDate, setWizardStartDate] = useState(startDate || '');
  const [wizardEndDate, setWizardEndDate] = useState(endDate || '');
  const [wizardAttendanceLogs, setWizardAttendanceLogs] = useState(attendanceLogs || []);

  const [formData, setFormData] = useState({
    date: startDate || '',
    check_in: '',
    check_out: '',
    reason: '',
    breaks: [],
    attendance_id: '' // for edit
  });

  const actions = [
    { id: 'add_attendance', title: 'Add New Attendance', description: 'Create a new attendance record', icon: Plus },
    { id: 'edit_attendance', title: 'Edit Existing Attendance', description: 'Modify an existing attendance record', icon: Edit }
  ];

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadEmployees();
    } else {
      setEmployees([]);
      setWizardSelectedEmployee('');
    }
  }, [selectedDepartment]);

  useEffect(() => {
    if (selectedAction === 'edit_attendance' && wizardAttendanceLogs?.length > 0) {
      // Pre-select first attendance record for editing
      handleAttendanceSelect(wizardAttendanceLogs[0].id);
    }
  }, [selectedAction, wizardAttendanceLogs]);

  const resetForm = () => {
    setFormData({
      date: startDate || '',
      check_in: '',
      check_out: '',
      reason: '',
      breaks: [],
      attendance_id: ''
    });
    setErrors({});
    setSuccessMsg('');
    setNoLogsMsg('');
  };

  const loadDepartments = async () => {
    try {
      const response = await fetch('/api/admin/departments', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDepartments(data.departments || []);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch(`/api/admin/employees-by-department?department=${encodeURIComponent(selectedDepartment)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const fetchWizardAttendanceLogs = async () => {
    if (!wizardSelectedEmployee || !wizardStartDate || !wizardEndDate) {
      setErrors({ submit: 'Please select employee and date range' });
      return;
    }

    setLoading(true);
    setErrors({});
    try {
      const response = await fetch(`/api/admin/attendance-logs?employee_id=${wizardSelectedEmployee}&start_date=${wizardStartDate}&end_date=${wizardEndDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const logs = data.attendances || [];
        setWizardAttendanceLogs(logs);

        if (logs.length > 0) {
          setSuccessMsg('Attendance logs loaded successfully');
          setTimeout(() => setSuccessMsg(''), 2000);
        } else {
          setNoLogsMsg('No logs found for the selected period');
          setTimeout(() => setNoLogsMsg(''), 2000);
        }
      } else {
        setErrors({ submit: 'Failed to fetch attendance logs' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to fetch attendance logs' });
    } finally {
      setLoading(false);
    }
  };

  const handleFetchAndContinue = () => {
    if (wizardAttendanceLogs.length > 0) {
      setCurrentStep(2);
    }
  };

  const handleActionSelect = (actionId) => {
    setSelectedAction(actionId);
    resetForm();
    setCurrentStep(3);
  };

  const handleNext = () => {
    if (currentStep === 1 && wizardAttendanceLogs.length > 0) {
      setCurrentStep(2);
    } else if (currentStep === 2 && selectedAction) {
      setCurrentStep(3);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step) => {
    if (step <= currentStep || (step === 2 && wizardAttendanceLogs.length > 0) || (step === 3 && selectedAction)) {
      setCurrentStep(step);
    }
  };

  const handleAttendanceSelect = (attendanceId) => {
    const log = wizardAttendanceLogs.find(l => l.id === parseInt(attendanceId));
    if (log) {
      setFormData({
        date: log.date,
        check_in: log.check_in || '',
        check_out: log.check_out || '',
        reason: '',
        breaks: log.breaks ? log.breaks.map(b => ({ break_start: b.break_start || '', break_end: b.break_end || '' })) : [],
        attendance_id: log.id
      });
    }
  };

  const addBreak = () => {
    setFormData(prev => ({
      ...prev,
      breaks: [...(prev.breaks || []), { break_start: '', break_end: '' }]
    }));
  };

  const removeBreak = (index) => {
    setFormData(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (selectedAction === 'add_attendance') {
      if (!wizardSelectedEmployee) newErrors.employee = 'Employee selection is required';
      if (!formData.date) newErrors.date = 'Date is required';
      if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
      const hasTimingData = formData.check_in || formData.check_out || (formData.breaks && formData.breaks.some(b => b.break_start || b.break_end));
      if (!hasTimingData) newErrors.timing = 'At least one timing field (check-in, check-out, or break) is required';
    }

    if (selectedAction === 'edit_attendance') {
      if (!wizardSelectedEmployee) newErrors.employee = 'Employee selection is required';
      if (!formData.attendance_id) newErrors.attendance_id = 'Attendance record is required';
      if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
      const hasTimingData = formData.check_in || formData.check_out || (formData.breaks && formData.breaks.some(b => b.break_start || b.break_end));
      if (!hasTimingData) newErrors.timing = 'At least one timing field (check-in, check-out, or break) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccessMsg('');

    try {
      let response;
      const requestData = {
        reason: formData.reason,
      };

      if (formData.check_in) requestData.check_in = formData.check_in;
      if (formData.check_out) requestData.check_out = formData.check_out;

      if (formData.breaks && Array.isArray(formData.breaks) && formData.breaks.length > 0) {
        requestData.breaks = formData.breaks.map(b => ({
          break_start: b.break_start || null,
          break_end: b.break_end || null
        }));
      }

      if (selectedAction === 'add_attendance') {
        requestData.employee_id = wizardSelectedEmployee;
        requestData.date = formData.date;

        response = await fetch('/api/admin/attendance/add-new', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(requestData)
        });
      } else if (selectedAction === 'edit_attendance') {
        response = await fetch(`/api/admin/attendance/${formData.attendance_id}/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(requestData)
        });
      }

      if (response.ok) {
        setSuccessMsg('Attendance updated successfully');
        setTimeout(() => {
          setSuccessMsg('');
          if (typeof onSuccess === 'function') onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        setErrors({ submit: errorData.message || 'Failed to update attendance' });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to update attendance' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Attendance Correction Wizard</h2>
              <p className="text-sm md:text-base text-gray-600 mt-1">Apply corrections to employee attendance records</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => handleStepClick(step)}
                  disabled={step > currentStep && !(step === 2 && selectedAction) && !(step === 3 && selectedAction)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : step === 2 && selectedAction
                      ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                      : 'bg-gray-200 text-gray-600'
                  } ${step > currentStep && !(step === 2 && selectedAction) && !(step === 3 && selectedAction) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-blue-700 hover:text-white'}`}
                >
                  {step}
                </button>
                <span className={`ml-2 text-xs sm:text-sm font-medium ${currentStep >= step ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step === 1 ? 'Emp & Date' : step === 2 ? 'Select Action' : 'Config Details'}
                </span>
                {step < 3 && (
                  <div className={`hidden sm:block w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Department and Employee Selection */}
          {currentStep === 1 && (
            <>
              {/* Department and Employee Selection */}
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Employee Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setWizardSelectedEmployee('');
                        setWizardAttendanceLogs([]);
                      }}
                      className="w-full border px-3 py-2 rounded-lg"
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
                    <label className="block text-sm font-medium text-gray-700">Employee</label>
                    <select
                      value={wizardSelectedEmployee}
                      onChange={(e) => {
                        setWizardSelectedEmployee(e.target.value);
                        setWizardAttendanceLogs([]);
                      }}
                      disabled={!selectedDepartment}
                      className="w-full border px-3 py-2 rounded-lg disabled:bg-gray-100"
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
                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="wizard-today"
                        name="wizard-dateRange"
                        value="today"
                        checked={dateRangeOption === 'today'}
                        onChange={(e) => {
                          setDateRangeOption(e.target.value);
                          const today = new Date().toISOString().split('T')[0];
                          setWizardStartDate(today);
                          setWizardEndDate(today);
                        }}
                      />
                      <label htmlFor="wizard-today" className="text-sm">Today</label>

                      <input
                        type="radio"
                        id="wizard-custom"
                        name="wizard-dateRange"
                        value="custom"
                        checked={dateRangeOption === 'custom'}
                        onChange={(e) => {
                          setDateRangeOption(e.target.value);
                          setWizardStartDate('');
                          setWizardEndDate('');
                        }}
                      />
                      <label htmlFor="wizard-custom" className="text-sm">Custom</label>
                    </div>
                  </div>
                </div>

                {dateRangeOption === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={wizardStartDate}
                        onChange={(e) => setWizardStartDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={wizardEndDate}
                        onChange={(e) => setWizardEndDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    onClick={fetchWizardAttendanceLogs}
                    disabled={!wizardSelectedEmployee || !wizardStartDate || !wizardEndDate || loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Fetch Attendance Logs
                  </button>
                  {errors.employee && <p className="text-red-600 text-sm mt-1">{errors.employee}</p>}
                </div>

                {wizardAttendanceLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Found {wizardAttendanceLogs.length} attendance record(s) for the selected period
                    </p>
                  </div>
                )}

                {noLogsMsg && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      {noLogsMsg}
                    </p>
                  </div>
                )}

                {noLogsMsg && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      {noLogsMsg}
                    </p>
                  </div>
                )}
              </div>

              {/* Attendance Logs Preview */}
              {wizardAttendanceLogs.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Attendance Records ({wizardAttendanceLogs.length})
                  </h3>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {wizardAttendanceLogs.map((log) => {
                        // Format date to dd-mm-yyyy
                        const formatDate = (dateStr) => {
                          if (!dateStr) return '';
                          const date = new Date(dateStr);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          return `${day}-${month}-${year}`;
                        };

                        return (
                          <div key={log.id} className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="font-medium text-gray-900">{formatDate(log.date)}</span>
                              </div>
                              <div className="text-sm text-gray-600">
                                {log.check_in || 'No check-in'} - {log.check_out || 'No check-out'}
                              </div>
                            </div>
                            {log.breaks && log.breaks.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                <span className="font-medium">Breaks:</span>{' '}
                                {log.breaks.map((breakItem, idx) => (
                                  <span key={idx}>
                                    {breakItem.break_start || '??:??'} - {breakItem.break_end || '??:??'}
                                    {idx < log.breaks.length - 1 ? ', ' : ''}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Step 2: Action Selection */}
          {currentStep === 2 && wizardAttendanceLogs.length > 0 && (
            <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                Select Correction Type
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {actions.map(a => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleActionSelect(a.id)}
                      className={`p-4 border rounded-lg text-left hover:bg-blue-50 transition-colors ${
                        selectedAction === a.id ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex gap-3">
                        <Icon className={`w-6 h-6 ${selectedAction === a.id ? 'text-blue-600' : 'text-gray-600'}`} />
                        <div>
                          <p className="font-semibold text-gray-900">{a.title}</p>
                          <p className="text-sm text-gray-600">{a.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Configuration Details */}
          {currentStep === 3 && selectedAction && (
            <>
              {/* Department and Employee Selection */}
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Employee Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setWizardSelectedEmployee('');
                        setWizardAttendanceLogs([]);
                      }}
                      className="w-full border px-3 py-2 rounded-lg"
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
                    <label className="block text-sm font-medium text-gray-700">Employee</label>
                    <select
                      value={wizardSelectedEmployee}
                      onChange={(e) => {
                        setWizardSelectedEmployee(e.target.value);
                        setWizardAttendanceLogs([]);
                      }}
                      disabled={!selectedDepartment}
                      className="w-full border px-3 py-2 rounded-lg disabled:bg-gray-100"
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
                    <label className="block text-sm font-medium text-gray-700">Date Range</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="wizard-today"
                        name="wizard-dateRange"
                        value="today"
                        checked={dateRangeOption === 'today'}
                        onChange={(e) => {
                          setDateRangeOption(e.target.value);
                          const today = new Date().toISOString().split('T')[0];
                          setWizardStartDate(today);
                          setWizardEndDate(today);
                        }}
                      />
                      <label htmlFor="wizard-today" className="text-sm">Today</label>

                      <input
                        type="radio"
                        id="wizard-custom"
                        name="wizard-dateRange"
                        value="custom"
                        checked={dateRangeOption === 'custom'}
                        onChange={(e) => {
                          setDateRangeOption(e.target.value);
                          setWizardStartDate('');
                          setWizardEndDate('');
                        }}
                      />
                      <label htmlFor="wizard-custom" className="text-sm">Custom</label>
                    </div>
                  </div>
                </div>

                {dateRangeOption === 'custom' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={wizardStartDate}
                        onChange={(e) => setWizardStartDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={wizardEndDate}
                        onChange={(e) => setWizardEndDate(e.target.value)}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    onClick={fetchWizardAttendanceLogs}
                    disabled={!wizardSelectedEmployee || !wizardStartDate || !wizardEndDate || loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Fetch Attendance Logs
                  </button>
                  {errors.employee && <p className="text-red-600 text-sm mt-1">{errors.employee}</p>}
                </div>

                {wizardAttendanceLogs.length > 0 && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      Found {wizardAttendanceLogs.length} attendance record(s) for the selected period
                    </p>
                  </div>
                )}
              </div>

              {/* Date Selection for Add */}
              {selectedAction === 'add_attendance' && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Attendance Date
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                      {errors.date && <p className="text-red-600 text-sm mt-1">{errors.date}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Attendance Selection for Edit */}
              {selectedAction === 'edit_attendance' && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Select Attendance Record
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Record *</label>
                      <select
                        value={formData.attendance_id}
                        onChange={(e) => handleAttendanceSelect(e.target.value)}
                        className="w-full border px-3 py-2 rounded-lg"
                      >
                        <option value="">Select attendance record</option>
                        {wizardAttendanceLogs.map(log => {
                          const formatDate = (dateStr) => {
                            if (!dateStr) return '';
                            const date = new Date(dateStr);
                            const day = String(date.getDate()).padStart(2, '0');
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}-${month}-${year}`;
                          };

                          return (
                            <option key={log.id} value={log.id}>
                              {formatDate(log.date)} - {log.check_in || 'No check-in'} to {log.check_out || 'No check-out'}
                            </option>
                          );
                        })}
                      </select>
                      {errors.attendance_id && <p className="text-red-600 text-sm mt-1">{errors.attendance_id}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Timing Configuration */}
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Timing Details
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check In</label>
                      <input
                        type="time"
                        value={formData.check_in}
                        onChange={(e) => setFormData(prev => ({ ...prev, check_in: e.target.value }))}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Check Out</label>
                      <input
                        type="time"
                        value={formData.check_out}
                        onChange={(e) => setFormData(prev => ({ ...prev, check_out: e.target.value }))}
                        className="w-full border px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Breaks</label>
                    <div className="space-y-3">
                      {(formData.breaks || []).map((breakItem, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200">
                          <input
                            type="time"
                            value={breakItem.break_start}
                            onChange={(e) => {
                              const newBreaks = [...formData.breaks];
                              newBreaks[index].break_start = e.target.value;
                              setFormData(prev => ({ ...prev, breaks: newBreaks }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Start time"
                          />
                          <span className="text-gray-500">-</span>
                          <input
                            type="time"
                            value={breakItem.break_end}
                            onChange={(e) => {
                              const newBreaks = [...formData.breaks];
                              newBreaks[index].break_end = e.target.value;
                              setFormData(prev => ({ ...prev, breaks: newBreaks }));
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="End time"
                          />
                          <button
                            onClick={() => removeBreak(index)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={addBreak}
                        className="text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2 text-sm font-medium"
                        type="button"
                      >
                        <Plus className="w-4 h-4" />
                        Add Break
                      </button>
                    </div>
                  </div>

                  {errors.timing && <p className="text-red-600 text-sm">{errors.timing}</p>}
                </div>
              </div>

              {/* Reason */}
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  Correction Reason
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                    <textarea
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      rows={4}
                      className="w-full border px-3 py-2 rounded-lg"
                      placeholder="Please explain the reason for this attendance correction"
                    />
                    {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
                  </div>
                </div>
              </div>

              {/* Server errors */}
              {errors.submit && (
                <div className="bg-red-50 p-3 border border-red-200 rounded-lg mb-6">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Success message */}
              {successMsg && (
                <div className="bg-green-50 p-3 border border-green-200 rounded-lg mb-6">
                  <p className="text-green-700 text-sm">{successMsg}</p>
                </div>
              )}
            </>
          )}

          {/* Step 3: Review & Submit */}
          {currentStep === 3 && selectedAction && (
            <div className="space-y-6">
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Review Your Changes
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Correction Type</h4>
                      <p className="text-gray-700">{actions.find(a => a.id === selectedAction)?.title}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Employee</h4>
                      <p className="text-gray-700">
                        {employees.find(e => String(e.id) === String(wizardSelectedEmployee))?.name || 'Not selected'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Date</h4>
                      <p className="text-gray-700">{formData.date || 'Not specified'}</p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Date Range</h4>
                      <p className="text-gray-700">
                        {wizardStartDate} to {wizardEndDate}
                      </p>
                    </div>
                  </div>

                  {selectedAction === 'add_attendance' && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">New Attendance Entry</h4>
                      <p className="text-gray-700">
                        Check-in: {formData.check_in || 'Not specified'}<br />
                        Check-out: {formData.check_out || 'Not specified'}
                        {formData.breaks && formData.breaks.length > 0 && (
                          <span className="block text-sm text-gray-600 mt-2">
                            Breaks: {formData.breaks.filter(b => b.break_start || b.break_end).length} break(s)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {selectedAction === 'edit_attendance' && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Edit Existing Attendance</h4>
                      <p className="text-gray-700">
                        Check-in: {formData.check_in || 'Not specified'}<br />
                        Check-out: {formData.check_out || 'Not specified'}
                        {formData.breaks && formData.breaks.length > 0 && (
                          <span className="block text-sm text-gray-600 mt-2">
                            Breaks: {formData.breaks.filter(b => b.break_start || b.break_end).length} break(s)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">Reason</h4>
                    <p className="text-gray-700">{formData.reason || 'No reason provided'}</p>
                  </div>
                </div>
              </div>

              {/* Server errors */}
              {errors.submit && (
                <div className="bg-red-50 p-3 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              )}

              {/* Success message */}
              {successMsg && (
                <div className="bg-green-50 p-3 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">{successMsg}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 md:p-6 flex gap-3 justify-between">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex gap-3">
            {currentStep === 1 && wizardAttendanceLogs.length > 0 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            )}
            {currentStep === 2 && selectedAction && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Next
              </button>
            )}
            {currentStep === 3 && selectedAction && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Apply Correction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAttendanceCorrectionWizardModal;