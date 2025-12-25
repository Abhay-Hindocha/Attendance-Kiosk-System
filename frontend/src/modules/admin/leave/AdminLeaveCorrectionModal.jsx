import React, { useState, useEffect } from 'react';
import { X, Loader2, Scale, CheckCircle, Plus, Edit, Trash2 } from 'lucide-react';
import api from '../../../services/api';

/**
 * AdminLeaveCorrectionModal.jsx
 *
 * - Sends extra fields on delete (update_balance, balance_adjustment) to help backends apply the returned days.
 * - Computes inclusive day count for deleted leaves and sends that as adjustment_days (positive).
 * - Normalizes date values to yyyy-MM-dd for date inputs.
 * - Reloads correction data after success so balances reflect immediately.
 * - Shows field-level and submit errors returned by the server.
 */

const AdminLeaveCorrectionModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState('action');
  const [selectedAction, setSelectedAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
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
    { id: 'adjust_balance', title: 'Adjust Balance', description: 'Add or subtract days', icon: Scale },
    { id: 'add_leave', title: 'Add Leave Manually', description: 'Create a new leave', icon: Plus },
    { id: 'edit_leave', title: 'Edit Existing Leave', description: 'Modify an existing leave', icon: Edit },
    { id: 'delete_leave', title: 'Delete Existing Leave', description: 'Remove an existing leave', icon: Trash2 }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getCorrectionData();
      setEmployees(data.employees || []);
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
    setStep('form');
    resetForm();
  };

  const handleBack = () => {
    setStep('action');
    setSelectedAction('');
    setErrors({});
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

    if (!formData.employee_id) newErrors.employee_id = 'Employee is required';

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
        // For adjust_balance, we now use the dedicated endpoint
        await api.adjustLeaveBalance(formData.employee_id, {
          leave_policy_id: formData.policy_id,
          type: formData.adjustment_type === 'add' ? 'credit' : 'debit',
          amount: formData.adjustment_days,
          reason: formData.reason
        });

        // Skip the legacy cleanup call for this action
        await loadData();
        setSuccessMsg('Updated successfully');
        setTimeout(() => {
          setSuccessMsg('');
          if (typeof onSuccess === 'function') onSuccess();
          onClose();
        }, 1500);
        setLoading(false);
        return;
      }

      const fromDate = asYMD(formData.from_date);
      const toDate = asYMD(formData.to_date);

      // Build payload with extra keys for backends that require explicit balance update fields
      const payload = {
        action: actionMapping[selectedAction],
        employee_id: formData.employee_id,
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

  const renderForm = () => {
    const employeeLeaveRequests = leaveRequests.filter(r => String(r.employee_id) === String(formData.employee_id));
    const selectedBalance = (() => {
      const emp = employees.find(e => String(e.id) === String(formData.employee_id));
      if (!emp || !Array.isArray(emp.balances)) return null;
      const bal = emp.balances.find(b => String(b.policy_id) === String(formData.policy_id) || String(b.leave_policy_id) === String(formData.policy_id));
      if (!bal) return null;
      return bal.balance ?? bal.remaining ?? bal.days ?? null;
    })();

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold">{actions.find(a => a.id === selectedAction)?.title}</h3>
        </div>

        <div className="space-y-4">
          {/* Employee */}
          <div>
            <label className="block text-sm font-medium">Employee *</label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData(prev => ({ ...prev, employee_id: e.target.value, leave_request_id: '', policy_id: '' }))}
              className="w-full border px-3 py-2 rounded-lg"
            >
              <option value="">Select Employee</option>
              {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name} - {emp.department}</option>)}
            </select>
            {errors.employee_id && <p className="text-red-600 text-sm mt-1">{errors.employee_id}</p>}
          </div>

          {/* Policy for adjust/add */}
          {(selectedAction === 'adjust_balance' || selectedAction === 'add_leave') && (
            <>
              <div>
                <label className="block text-sm font-medium">Leave Policy *</label>
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
            </>
          )}

          {/* Adjustment (explicit add/subtract) */}
          {selectedAction === 'adjust_balance' && (
            <>
              <div>
                <label className="block text-sm font-medium">Adjustment Type *</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="adj_type" checked={formData.adjustment_type === 'add'} onChange={() => setFormData(prev => ({ ...prev, adjustment_type: 'add' }))} />
                    <span className="text-sm">Add</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="adj_type" checked={formData.adjustment_type === 'subtract'} onChange={() => setFormData(prev => ({ ...prev, adjustment_type: 'subtract' }))} />
                    <span className="text-sm">Subtract</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Adjustment Days *</label>
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
                <label className="block text-sm font-medium">Reason *</label>
                <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
              </div>
            </>
          )}

          {/* Add leave */}
          {selectedAction === 'add_leave' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">From Date *</label>
                  <input type="date" value={formData.from_date} onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                  {errors.from_date && <p className="text-red-600 text-sm mt-1">{errors.from_date}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium">To Date *</label>
                  <input type="date" value={formData.to_date} onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                  {errors.to_date && <p className="text-red-600 text-sm mt-1">{errors.to_date}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Leave Type *</label>
                <select value={formData.leave_type} onChange={(e) => setFormData(prev => ({ ...prev, leave_type: e.target.value }))} className="w-full border px-3 py-2 rounded-lg">
                  <option value="Full Day">Full Day</option>
                  <option value="Half Day">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Reason *</label>
                <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
              </div>
            </>
          )}

          {/* Edit/Delete */}
          {(selectedAction === 'edit_leave' || selectedAction === 'delete_leave') && (
            <>
              <div>
                <label className="block text-sm font-medium">Leave Request *</label>
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

              {selectedAction === 'edit_leave' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium">From Date *</label>
                    <input type="date" value={formData.from_date} onChange={(e) => setFormData(prev => ({ ...prev, from_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                    {errors.from_date && <p className="text-red-600 text-sm mt-1">{errors.from_date}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium">To Date *</label>
                    <input type="date" value={formData.to_date} onChange={(e) => setFormData(prev => ({ ...prev, to_date: e.target.value }))} className="w-full border px-3 py-2 rounded-lg" />
                    {errors.to_date && <p className="text-red-600 text-sm mt-1">{errors.to_date}</p>}
                  </div>
                </div>
              )}

              {selectedAction === 'edit_leave' && (
                <div>
                  <label className="block text-sm font-medium">Reason *</label>
                  <textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} rows={3} className="w-full border px-3 py-2 rounded-lg" />
                  {errors.reason && <p className="text-red-600 text-sm mt-1">{errors.reason}</p>}
                </div>
              )}
            </>
          )}

          {/* server submit error */}
          {errors.submit && <div className="bg-red-50 p-3 border border-red-200 rounded-lg"><p className="text-red-600 text-sm">{errors.submit}</p></div>}

          {/* field-level backend messages */}
          {Object.entries(errors).filter(([k, v]) => k !== 'submit' && v).map(([k, v]) => (
            <div key={k} className="text-sm text-red-600">{k}: {v}</div>
          ))}

          {/* success message */}
          {successMsg && <div className="bg-green-50 p-3 border border-green-200 rounded-lg"><p className="text-green-700 text-sm">{successMsg}</p></div>}
        </div>

        <div className="flex justify-end gap-3 mt-6 border-t pt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Apply Correction
          </button>
        </div>
      </div>
    );
  };

  // helper: leave requests filtered by selected employee
  const employeeLeaveRequests = leaveRequests.filter(r => String(r.employee_id) === String(formData.employee_id));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {step === 'action' ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Action</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actions.map(a => {
                const Icon = a.icon;
                return (
                  <button key={a.id} onClick={() => handleActionSelect(a.id)} className="p-4 border rounded-lg text-left hover:bg-blue-50">
                    <div className="flex gap-3">
                      <Icon className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-sm text-gray-600">{a.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          renderForm()
        )}
      </div>
    </div>
  );
};

export default AdminLeaveCorrectionModal;
