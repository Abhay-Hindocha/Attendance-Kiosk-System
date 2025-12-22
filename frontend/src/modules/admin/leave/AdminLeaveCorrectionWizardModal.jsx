import React, { useState, useEffect } from 'react';
import { X, Loader2, Scale, CheckCircle, Plus, Edit, Trash2, Clock, Calendar, FileText, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

/**
 * AdminLeaveCorrectionWizardModal.jsx
 *
 * Wizard-style modal for leave corrections, designed to match the policy creation wizard.
 * Features step-by-step sections with icons and organized form fields.
 */

const AdminLeaveCorrectionWizardModal = ({ onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [wizardSelectedEmployee, setWizardSelectedEmployee] = useState('');
  const [policies, setPolicies] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    policy_id: '',
    adjustment_days: '',
    adjustment_type: 'add', // 'add' | 'subtract'
    reason: '',
    from_date: '',
    to_date: '',
    leave_request_id: '',
    leave_type: 'Full Day'
  });

  const actions = [
    { id: 'adjust_balance', title: 'Adjust Balance', description: 'Add or subtract days from leave balance', icon: Scale },
    { id: 'add_leave', title: 'Add Leave Manually', description: 'Create a new leave entry', icon: Plus },
    { id: 'edit_leave', title: 'Edit Existing Leave', description: 'Modify an existing leave request', icon: Edit },
    { id: 'delete_leave', title: 'Delete Existing Leave', description: 'Remove an existing leave entry', icon: Trash2 }
  ];

  useEffect(() => {
    loadDepartments();
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDepartment) {
      loadEmployees();
    } else {
      setEmployees([]);
      setWizardSelectedEmployee('');
    }
  }, [selectedDepartment]);

  const loadDepartments = async () => {
    try {
      const data = await api.getDepartments();
      setDepartments(data.departments || []);
    } catch (error) {
      console.error('Failed to load departments:', error);
      setErrors({ submit: 'Failed to load departments. Please check your authentication and try again.' });
      setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 5000);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await api.getEmployeesByDepartment(selectedDepartment);
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
      setErrors({ submit: 'Failed to load employees. Please check your authentication and try again.' });
      setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 5000);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getCorrectionData();
      setPolicies(data.policies || []);
      setLeaveRequests(data.leave_requests || []);
    } catch (err) {
      console.error('Failed to load correction data', err);
      setErrors({ submit: 'Failed to load required data' });
      setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 2000);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      policy_id: '',
      adjustment_days: '',
      adjustment_type: 'add',
      reason: '',
      from_date: '',
      to_date: '',
      leave_request_id: '',
      leave_type: 'Full Day'
    });
    setErrors({});
    setSuccessMsg('');
  };

  const handleActionSelect = (actionId) => {
    setSelectedAction(actionId);
    resetForm();
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (step) => {
    if (step <= currentStep || (step === 2 && selectedAction) || (step === 3 && selectedAction)) {
      setCurrentStep(step);
    }
  };

  const extractPolicyId = (request) => {
    if (!request) return '';
    return (
      request.leave_policy_id ??
      request.policy_id ??
      request.policy?.id ??
      request.policy?.policy_id ??
      request.policy_name ??
      ''
    );
  };

  const asYMD = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const s = String(value);
    // For ISO datetimes, parse into a Date and extract local date parts.
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  // inclusive day count between two yyyy-mm-dd strings (counts both from & to)
  const inclusiveDaysBetween = (from, to, halfDayFlag = false) => {
    if (!from || !to) return 0;
    const parseYMD = (s) => {
      if (!s) return null;
      const parts = String(s).split('-').map(Number);
      if (parts.length !== 3) return null;
      const [y, m, d] = parts;
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    const a = parseYMD(from);
    const b = parseYMD(to);
    if (!a || !b) return 0;
    const diffMs = b.getTime() - a.getTime();
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
    if (days <= 0) return 0;
    return halfDayFlag ? days - 0.5 : days;
  };

  const validateForm = () => {
    const newErrors = {};

    if (!wizardSelectedEmployee) newErrors.employee_id = 'Employee is required';

    if (selectedAction === 'adjust_balance') {
      if (!formData.policy_id) newErrors.policy_id = 'Leave policy is required';
      if (formData.adjustment_days === '' || isNaN(Number(formData.adjustment_days))) {
        newErrors.adjustment_days = 'Please enter a valid number of days';
      }
      if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
    }

    if (selectedAction === 'add_leave') {
      if (!formData.policy_id) newErrors.policy_id = 'Leave policy is required';
      if (!formData.from_date) newErrors.from_date = 'From date is required';
      if (!formData.to_date) newErrors.to_date = 'To date is required';
      if (formData.from_date && formData.to_date && formData.from_date > formData.to_date) newErrors.to_date = 'End date must be after start date';
      if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
    }

    if (selectedAction === 'edit_leave' || selectedAction === 'delete_leave') {
      if (!formData.leave_request_id) newErrors.leave_request_id = 'Leave request is required';
      if (!formData.policy_id) newErrors.policy_id = 'Leave policy is required (from selected leave)';
      if (selectedAction === 'edit_leave') {
        if (!formData.from_date) newErrors.from_date = 'From date required';
        if (!formData.to_date) newErrors.to_date = 'To date required';
        if (formData.from_date && formData.to_date && formData.from_date > formData.to_date) newErrors.to_date = 'End date must be after start date';
        if (!formData.reason?.trim()) newErrors.reason = 'Reason is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const computeSignedAdjustment = (value, type) => {
    const n = Number(value);
    if (isNaN(n)) return undefined;
    const abs = Math.abs(n);
    return type === 'subtract' ? -abs : abs;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccessMsg('');

    try {
      const actionMapping = {
        add_leave: 'create',
        edit_leave: 'update',
        delete_leave: 'delete',
        adjust_balance: 'adjust_balance'
      };

      let finalPolicyId = formData.policy_id;
      let finalAdjustment = undefined;

      // Delete: compute days covered by the leave and return them (positive)
      if (selectedAction === 'delete_leave') {
        const found = (leaveRequests || []).find(r => String(r.id) === String(formData.leave_request_id));
        const from = asYMD(found?.from_date ?? formData.from_date);
        const to = asYMD(found?.to_date ?? formData.to_date);

        // detect half-day if backend marks it (very basic detection)
        const halfFlag = !!(found?.leave_type && String(found.leave_type).toLowerCase().includes('half')) || (formData.leave_type === 'Half Day');

        const daysCount = inclusiveDaysBetween(from, to, halfFlag);

        finalAdjustment = Number(daysCount); // positive (add back)
        finalPolicyId = finalPolicyId || extractPolicyId(found);

        if (!formData.reason) {
          setFormData(prev => ({ ...prev, reason: `Deleted leave returned ${daysCount} day(s)` }));
        }
      } else if (selectedAction === 'adjust_balance') {
        finalAdjustment = computeSignedAdjustment(formData.adjustment_days, formData.adjustment_type);
      }

      const fromDate = asYMD(formData.from_date);
      const toDate = asYMD(formData.to_date);

      // Build payload with extra keys for backends that require explicit balance update fields
      const payloadEmployeeId = formData.employee_id || wizardSelectedEmployee;

      const payload = {
        action: actionMapping[selectedAction],
        employee_id: payloadEmployeeId || undefined,
        leave_policy_id: finalPolicyId || undefined,
        leave_request_id: formData.leave_request_id || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        reason: formData.reason || undefined,
        comment: formData.reason?.trim() ?? '',
        adjustment_days: finalAdjustment !== undefined ? finalAdjustment : undefined,
        // extras to encourage server to update balances on delete
        update_balance: selectedAction === 'delete_leave' ? true : undefined,
        balance_adjustment: selectedAction === 'delete_leave' ? finalAdjustment : undefined,
        leave_type: formData.leave_type || undefined
      };

      // remove undefined entries
      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

      // debug
      // eslint-disable-next-line no-console
      console.debug('applyLeaveCorrection payload:', payload);

      await api.applyLeaveCorrection(payload);

      // reload data so UI shows updated balances
      await loadData();

      setSuccessMsg('Updated successfully');
      setTimeout(() => {
        setSuccessMsg('');
        if (typeof onSuccess === 'function') onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to apply correction', err);
      const respData = err?.response?.data ?? err?.data ?? null;

      if (err?.response?.status === 422 && respData) {
        const newErrors = {};
        if (respData.errors && typeof respData.errors === 'object') {
          Object.entries(respData.errors).forEach(([k, v]) => {
            const clientKey = k === 'leave_policy_id' ? 'policy_id' : k;
            if (Array.isArray(v)) newErrors[clientKey] = v.join(' ');
            else newErrors[clientKey] = String(v);
          });
        } else if (typeof respData === 'object') {
          Object.entries(respData).forEach(([k, v]) => {
            if (k === 'message') newErrors.submit = String(v);
            else if (Array.isArray(v)) newErrors[k] = v.join(' ');
            else newErrors[k] = String(v);
          });
        } else {
          newErrors.submit = 'Validation failed';
        }
        setErrors(newErrors);
        if (newErrors.submit) {
          setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 2000);
        }
      } else if (err?.response) {
        const serverMsg = respData?.message || respData?.error || `Server error ${err.response.status}`;
        setErrors({ submit: serverMsg });
        setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 2000);
      } else {
        setErrors({ submit: err?.message || 'Failed to apply correction' });
        setTimeout(() => setErrors(prev => ({ ...prev, submit: '' })), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const employeeLeaveRequests = leaveRequests.filter(r => String(r.employee_id) === String(wizardSelectedEmployee));
  const selectedBalance = (() => {
    const emp = employees.find(e => String(e.id) === String(wizardSelectedEmployee));
    if (!emp || !Array.isArray(emp.balances)) return null;
    const bal = emp.balances.find(b => String(b.policy_id) === String(formData.policy_id) || String(b.leave_policy_id) === String(formData.policy_id));
    if (!bal) return null;
    return bal.balance ?? bal.remaining ?? bal.days ?? null;
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Manual Leave Correction</h2>
              <p className="text-sm md:text-base text-gray-600 mt-1">Apply corrections to employee leave records</p>
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
                <span className={`ml-2 text-sm font-medium ${currentStep >= step ? 'text-blue-600' : 'text-gray-500'}`}>
                  {step === 1 ? 'Action' : step === 2 ? 'Details' : 'Review'}
                </span>
                {step < 3 && <div className={`hidden sm:block w-8 sm:w-12 h-0.5 mx-2 sm:mx-4 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-300'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-32">
          {/* Step 1: Action Selection */}
          {currentStep === 1 && (
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

          {/* Step 2: Configuration Details */}
          {currentStep === 2 && selectedAction && (
            <>
              {/* Department and Employee Selection */}
              <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Employee Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Department</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => {
                        setSelectedDepartment(e.target.value);
                        setWizardSelectedEmployee('');
                        setFormData(prev => ({ ...prev, employee_id: '', leave_request_id: '', policy_id: '' }));
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
                    <label className="block text-sm font-medium text-gray-700">Employee *</label>
                    <select
                      value={wizardSelectedEmployee}
                      onChange={(e) => {
                        setWizardSelectedEmployee(e.target.value);
                        setFormData(prev => ({ ...prev, employee_id: e.target.value, leave_request_id: '', policy_id: '' }));
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
                    {errors.employee_id && <p className="text-red-600 text-sm mt-1">{errors.employee_id}</p>}
                  </div>
                </div>
              </div>

              {/* Policy Selection for adjust/add */}
              {(selectedAction === 'adjust_balance' || selectedAction === 'add_leave') && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Leave Policy Configuration
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Policy *</label>
                      <select
                        value={formData.policy_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, policy_id: e.target.value }))}
                        className="w-full border px-3 py-2 rounded-lg"
                      >
                        <option value="">Select Policy</option>
                        {policies.map(pol => <option key={pol.id} value={pol.id}>{pol.name}</option>)}
                      </select>
                      {errors.policy_id && <p className="text-red-600 text-sm mt-1">{errors.policy_id}</p>}
                    </div>

                    {selectedBalance !== null && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800"><strong>Current Balance:</strong> {selectedBalance} days</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Adjustment Configuration */}
              {selectedAction === 'adjust_balance' && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Scale className="w-5 h-5 text-orange-600" />
                    Balance Adjustment
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type *</label>
                      <div className="flex items-center gap-4 mt-2">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="adj_type" checked={formData.adjustment_type === 'add'} onChange={() => setFormData(prev => ({ ...prev, adjustment_type: 'add' }))} />
                          <span className="text-sm">Add Days</span>
                        </label>
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input type="radio" name="adj_type" checked={formData.adjustment_type === 'subtract'} onChange={() => setFormData(prev => ({ ...prev, adjustment_type: 'subtract' }))} />
                          <span className="text-sm">Subtract Days</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of Days *</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.adjustment_days}
                        onChange={(e) => {
                          const v = String(e.target.value).replace(/\+/g, '');
                          setFormData(prev => ({ ...prev, adjustment_days: v }));
                        }}
                        className="w-full border px-3 py-2 rounded-lg"
                        placeholder="e.g., 2 or 1.5"
                      />
                      {errors.adjustment_days && <p className="text-red-600 text-sm mt-1">{errors.adjustment_days}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                      <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                      {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Add Leave Configuration */}
              {selectedAction === 'add_leave' && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-green-600" />
                    Leave Entry Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
                        <input type="date" value={formData.from_date} onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                        {errors.from_date && <p className="text-red-600 text-sm mt-1">{errors.from_date}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
                        <input type="date" value={formData.to_date} onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                        {errors.to_date && <p className="text-red-600 text-sm mt-1">{errors.to_date}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type *</label>
                      <select value={formData.leave_type} onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))} className="w-full border px-3 py-2 rounded-lg">
                        <option value="Full Day">Full Day</option>
                        <option value="Half Day">Half Day</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                      <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                      {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Edit/Delete Leave Selection */}
              {(selectedAction === 'edit_leave' || selectedAction === 'delete_leave') && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Edit className="w-5 h-5 text-indigo-600" />
                    Select Leave Request
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Leave Request *</label>
                      <select
                        value={formData.leave_request_id}
                        onChange={(e) => {
                          const requestId = e.target.value;
                          const req = employeeLeaveRequests.find(r => String(r.id) === String(requestId)) || (leaveRequests || []).find(r => String(r.id) === String(requestId));
                          const from = asYMD(req?.from_date);
                          const to = asYMD(req?.to_date);
                          const halfFlag = !!(req?.leave_type && String(req.leave_type).toLowerCase().includes('half')) || (req?.half_day === true);
                          const daysCount = inclusiveDaysBetween(from, to, halfFlag);

                          setFormData(prev => ({
                            ...prev,
                            leave_request_id: requestId,
                            from_date: from,
                            to_date: to,
                            policy_id: extractPolicyId(req),
                            adjustment_days: selectedAction === 'delete_leave' ? String(daysCount) : prev.adjustment_days,
                            adjustment_type: selectedAction === 'delete_leave' ? 'add' : prev.adjustment_type,
                            reason: req?.reason ?? prev.reason,
                            leave_type: req?.leave_type ?? prev.leave_type
                          }));
                          setErrors(prev => ({ ...prev, leave_request_id: undefined, policy_id: undefined }));
                        }}
                        className="w-full border px-3 py-2 rounded-lg"
                      >
                        <option value="">Select leave</option>
                        {employeeLeaveRequests.map(req => <option key={req.id} value={req.id}>{asYMD(req.from_date)} → {asYMD(req.to_date)} ({req.policy?.name ?? req.policy_name ?? ''})</option>)}
                      </select>
                      {errors.leave_request_id && <p className="text-red-600 text-sm mt-1">{errors.leave_request_id}</p>}
                      {errors.policy_id && <p className="text-red-600 text-sm mt-1">{errors.policy_id}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Leave Configuration */}
              {selectedAction === 'edit_leave' && (
                <div className="border border-gray-200 rounded-lg p-4 md:p-6 bg-gray-50 mb-6">
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Update Leave Details
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">From Date *</label>
                        <input type="date" value={formData.from_date} onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                        {errors.from_date && <p className="text-red-600 text-sm mt-1">{errors.from_date}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">To Date *</label>
                        <input type="date" value={formData.to_date} onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                        {errors.to_date && <p className="text-red-600 text-sm mt-1">{errors.to_date}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                      <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                      {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
                    </div>
                  </div>
                </div>
              )}

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

                  {selectedAction === 'adjust_balance' && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">Balance Adjustment</h4>
                      <p className="text-gray-700">
                        {formData.adjustment_type === 'add' ? 'Add' : 'Subtract'} {formData.adjustment_days} days
                        {formData.policy_id && (
                          <span className="block text-sm text-gray-600 mt-1">
                            Policy: {policies.find(p => String(p.id) === String(formData.policy_id))?.name}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {selectedAction === 'add_leave' && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">New Leave Entry</h4>
                      <p className="text-gray-700">
                        {formData.from_date} to {formData.to_date} ({formData.leave_type})
                        {formData.policy_id && (
                          <span className="block text-sm text-gray-600 mt-1">
                            Policy: {policies.find(p => String(p.id) === String(formData.policy_id))?.name}
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {(selectedAction === 'edit_leave' || selectedAction === 'delete_leave') && (
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {selectedAction === 'edit_leave' ? 'Edit Leave' : 'Delete Leave'}
                      </h4>
                      <p className="text-gray-700">
                        {formData.from_date} to {formData.to_date}
                        {formData.policy_id && (
                          <span className="block text-sm text-gray-600 mt-1">
                            Policy: {policies.find(p => String(p.id) === String(formData.policy_id))?.name}
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

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 flex gap-3 justify-between">
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
            {currentStep < 3 && selectedAction && (
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

export default AdminLeaveCorrectionWizardModal;