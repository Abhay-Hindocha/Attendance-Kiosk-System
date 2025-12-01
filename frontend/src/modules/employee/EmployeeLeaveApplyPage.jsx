import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Paperclip, PlusCircle } from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useEmployeePortal } from './EmployeeLayout';

const EmployeeLeaveApplyPage = () => {
  const { profile } = useEmployeePortal();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    leave_policy_id: '',
    from_date: '',
    to_date: '',
    partial_day: false,
    partial_session: 'first_half',
    reason: '',
    attachment: null,
  });

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const data = await employeeApi.getLeaveBalances();
        setBalances(data.balances || []);
      } catch (err) {
        setError(err?.message || 'Unable to fetch balances.');
      } finally {
        setLoading(false);
      }
    };
    loadBalances();
  }, []);

  const selectedPolicy = useMemo(() => {
    return profile?.leave_policies?.find((p) => p.id.toString() === form.leave_policy_id);
  }, [profile, form.leave_policy_id]);

  const availableBalance = useMemo(() => {
    const record = balances.find((b) => b.leave_policy_id?.toString() === form.leave_policy_id);
    if (!record) return 0;
    return (
      record.balance +
      record.carry_forward_balance -
      record.pending_deduction
    );
  }, [balances, form.leave_policy_id]);

  const estimatedDays = useMemo(() => {
    if (!form.from_date || !form.to_date) return 0;
    const from = new Date(form.from_date);
    const to = new Date(form.to_date);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return 0;
    const diff = (to - from) / (1000 * 60 * 60 * 24) + 1;
    return form.partial_day ? diff - 0.5 : diff;
  }, [form.from_date, form.to_date, form.partial_day]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    handleChange('attachment', file || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.leave_policy_id) {
      setError('Please choose a leave policy.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('leave_policy_id', form.leave_policy_id);
      payload.append('from_date', form.from_date);
      payload.append('to_date', form.to_date);
      payload.append('partial_day', form.partial_day);
      payload.append('partial_session', form.partial_session);
      payload.append('reason', form.reason);
      if (form.attachment) {
        payload.append('attachment', form.attachment);
      }
      await employeeApi.createLeaveRequest(payload);
      setSuccess('Leave request submitted successfully.');
      setForm({
        leave_policy_id: '',
        from_date: '',
        to_date: '',
        partial_day: false,
        partial_session: 'first_half',
        reason: '',
        attachment: null,
      });
    } catch (err) {
      setError(err?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow text-center">
        <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading leave policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-indigo-500" />
          Apply for Leave
        </h2>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
            {success}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={form.leave_policy_id}
              onChange={(e) => handleChange('leave_policy_id', e.target.value)}
              required
            >
              <option value="">Select leave type</option>
              {profile?.leave_policies?.map((policy) => (
                <option key={policy.id} value={policy.id}>
                  {policy.name}
                </option>
              ))}
            </select>
            {selectedPolicy && (
              <p className="text-xs text-gray-500 mt-1">
                Monthly accrual: {selectedPolicy.monthly_accrual} · Sandwich rule{' '}
                {selectedPolicy.sandwich_rule_enabled ? 'enabled' : 'disabled'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.from_date}
                onChange={(e) => handleChange('from_date', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.to_date}
                onChange={(e) => handleChange('to_date', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <input
                id="partial-day"
                type="checkbox"
                className="w-4 h-4 text-indigo-600"
                checked={form.partial_day}
                onChange={(e) => handleChange('partial_day', e.target.checked)}
              />
              <label htmlFor="partial-day" className="text-sm text-gray-700">
                Partial day
              </label>
            </div>
            {form.partial_day && (
              <select
                className="w-full md:w-40 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.partial_session}
                onChange={(e) => handleChange('partial_session', e.target.value)}
              >
                <option value="first_half">First half</option>
                <option value="second_half">Second half</option>
                <option value="custom">Custom</option>
              </select>
            )}
            <div className="text-sm text-gray-600">
              Estimated days:{' '}
              <span className="font-semibold text-gray-900">{Number.isNaN(estimatedDays) ? 0 : estimatedDays}</span>
            </div>
            <div className="text-sm text-gray-600">
              Available:{' '}
              <span className="font-semibold text-gray-900">{availableBalance.toFixed(1)}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Explain why you need this leave..."
              value={form.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supporting document (optional)</label>
            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-xl cursor-pointer text-sm text-gray-600 hover:border-indigo-300">
              <Paperclip className="w-4 h-4" />
              {form.attachment ? form.attachment.name : 'Upload medical certificate, exam hall ticket, etc.'}
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLeaveApplyPage;

