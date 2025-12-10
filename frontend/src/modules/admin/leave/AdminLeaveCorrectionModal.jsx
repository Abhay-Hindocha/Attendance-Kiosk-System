import React, { useState, useEffect } from 'react';
import { X, Search, User, Calendar, FileText, Loader2, Plus, Edit, Trash2, Scale, CheckCircle } from 'lucide-react';
import api from '../../../services/api';

const AdminLeaveCorrectionModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('action'); // 'action', 'form'
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [correctionData, setCorrectionData] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    policy_id: '',
    adjustment_days: '',
    reason: '',
    from_date: '',
    to_date: '',
    leave_request_id: '',
    leave_type: 'Full Day',
  });
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [errors, setErrors] = useState({});

  const actions = [
    {
      id: 'adjust_balance',
      title: 'Adjust Balance',
      description: 'Add or subtract days from an employee\'s leave balance',
      icon: Scale,
    },
    {
      id: 'add_leave',
      title: 'Add Leave Manually',
      description: 'Create a new leave entry for an employee',
      icon: Plus,
    },
    {
      id: 'edit_leave',
      title: 'Edit Existing Leave',
      description: 'Modify an existing leave request',
      icon: Edit,
    },
    {
      id: 'delete_leave',
      title: 'Delete Existing Leave',
      description: 'Remove an existing leave request',
      icon: Trash2,
    },
  ];

  useEffect(() => {
    fetchCorrectionData();
  }, []);

  const fetchCorrectionData = async () => {
    setLoading(true);
    try {
      const data = await api.getCorrectionData();
      setCorrectionData(data);
      setEmployees(data.employees || []);
      setPolicies(data.policies || []);
      setLeaveRequests(data.leave_requests || []);
    } catch (error) {
      console.error('Failed to load correction data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActionSelect = (actionId) => {
    setSelectedAction(actionId);
    setStep('form');
    setFormData({
      employee_id: '',
      policy_id: '',
      adjustment_days: '',
      reason: '',
      from_date: '',
      to_date: '',
      leave_request_id: '',
      leave_type: 'Full Day',
    });
    setErrors({});
  };

  const handleBack = () => {
    setStep('action');
    setSelectedAction('');
    setFormData({
      employee_id: '',
      policy_id: '',
      adjustment_days: '',
      reason: '',
      from_date: '',
      to_date: '',
      leave_request_id: '',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Employee is required';
    }

    if (selectedAction === 'adjust_balance') {
      if (!formData.policy_id) {
        newErrors.policy_id = 'Leave policy is required';
      }
      if (!formData.adjustment_days || isNaN(formData.adjustment_days)) {
        newErrors.adjustment_days = 'Valid adjustment days are required';
      }
      if (!formData.reason.trim()) {
        newErrors.reason = 'Reason is required';
      }
    } else if (selectedAction === 'add_leave') {
      if (!formData.policy_id) {
        newErrors.policy_id = 'Leave policy is required';
      }
      if (!formData.from_date) {
        newErrors.from_date = 'From date is required';
      }
      if (!formData.to_date) {
        newErrors.to_date = 'To date is required';
      }
      if (formData.from_date && formData.to_date && formData.from_date > formData.to_date) {
        newErrors.to_date = 'To date must be after from date';
      }
      if (!formData.reason.trim()) {
        newErrors.reason = 'Reason is required';
      }
    } else if (selectedAction === 'edit_leave' || selectedAction === 'delete_leave') {
      if (!formData.leave_request_id) {
        newErrors.leave_request_id = 'Leave request is required';
      }
      if (selectedAction === 'edit_leave') {
        if (!formData.from_date) {
          newErrors.from_date = 'From date is required';
        }
        if (!formData.to_date) {
          newErrors.to_date = 'To date is required';
        }
        if (formData.from_date && formData.to_date && formData.from_date > formData.to_date) {
          newErrors.to_date = 'To date must be after from date';
        }
        if (!formData.reason.trim()) {
          newErrors.reason = 'Reason is required';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Map frontend action names to backend action names
      const actionMapping = {
        'add_leave': 'create',
        'edit_leave': 'update',
        'delete_leave': 'delete',
        'adjust_balance': 'adjust_balance'
      };

      const payload = {
        action: actionMapping[selectedAction] || selectedAction,
        employee_id: formData.employee_id,
        leave_policy_id: formData.policy_id,
        leave_request_id: formData.leave_request_id,
        from_date: formData.from_date,
        to_date: formData.to_date,
        reason: formData.reason,
        adjustment_days: formData.adjustment_days,
        comment: formData.reason, // Use reason as comment
        leave_type: formData.leave_type,
      };

      await api.applyLeaveCorrection(payload);
      onSuccess();
    } catch (error) {
      console.error('Failed to apply correction', error);
      setErrors({ submit: error?.message || 'Failed to apply correction' });
    } finally {
      setLoading(false);
    }
  };

  const renderActionSelection = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Correction Action</h3>
        <p className="text-sm text-gray-600">Choose the type of leave correction you want to perform</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleActionSelect(action.id)}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <Icon className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderForm = () => {
    const selectedEmployee = employees.find(emp => emp.id === parseInt(formData.employee_id));
    const employeeLeaveRequests = leaveRequests.filter(req => req.employee_id === parseInt(formData.employee_id));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-gray-900">
            {actions.find(a => a.id === selectedAction)?.title}
          </h3>
        </div>

        <div className="space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Employee <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select employee</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.department}
                </option>
              ))}
            </select>
            {errors.employee_id && <p className="text-sm text-red-600 mt-1">{errors.employee_id}</p>}
          </div>

          {/* Action-specific fields */}
          {selectedAction === 'adjust_balance' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Policy <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.policy_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select policy</option>
                  {policies.map(policy => (
                    <option key={policy.id} value={policy.id}>{policy.name}</option>
                  ))}
                </select>
                {errors.policy_id && <p className="text-sm text-red-600 mt-1">{errors.policy_id}</p>}
              </div>
              {formData.policy_id && selectedEmployee && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Current Balance:</strong> {selectedEmployee.balances?.find(b => b.policy_id === parseInt(formData.policy_id))?.balance || 0} days
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Days <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.adjustment_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, adjustment_days: e.target.value }))}
                  placeholder="e.g., 2.5 or -1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.adjustment_days && <p className="text-sm text-red-600 mt-1">{errors.adjustment_days}</p>}
              </div>
            </>
          )}

          {selectedAction === 'add_leave' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Policy <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.policy_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select policy</option>
                  {policies.map(policy => (
                    <option key={policy.id} value={policy.id}>{policy.name}</option>
                  ))}
                </select>
                {errors.policy_id && <p className="text-sm text-red-600 mt-1">{errors.policy_id}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.from_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.from_date && <p className="text-sm text-red-600 mt-1">{errors.from_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.to_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.to_date && <p className="text-sm text-red-600 mt-1">{errors.to_date}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>
            </>
          )}

          {(selectedAction === 'edit_leave' || selectedAction === 'delete_leave') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Leave Request <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.leave_request_id}
                  onChange={(e) => {
                    const requestId = e.target.value;
                    const request = employeeLeaveRequests.find(r => r.id === parseInt(requestId));
                    setFormData(prev => ({
                      ...prev,
                      leave_request_id: requestId,
                      from_date: request ? request.from_date : '',
                      to_date: request ? request.to_date : '',
                      policy_id: request ? request.policy_id : '',
                      reason: request ? request.reason : '',
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select leave request</option>
                  {employeeLeaveRequests.map(request => (
                    <option key={request.id} value={request.id}>
                      {request.from_date} - {request.to_date} ({request.policy?.name})
                    </option>
                  ))}
                </select>
                {errors.leave_request_id && <p className="text-sm text-red-600 mt-1">{errors.leave_request_id}</p>}
              </div>
              {selectedAction === 'edit_leave' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.from_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.from_date && <p className="text-sm text-red-600 mt-1">{errors.from_date}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.to_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {errors.to_date && <p className="text-sm text-red-600 mt-1">{errors.to_date}</p>}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Reason field for all actions except delete */}
          {selectedAction !== 'delete_leave' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
                placeholder="Provide a reason for this correction"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.reason && <p className="text-sm text-red-600 mt-1">{errors.reason}</p>}
            </div>
          )}

          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Apply Correction
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {loading && step === 'action' ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {step === 'action' && renderActionSelection()}
              {step === 'form' && renderForm()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLeaveCorrectionModal;

