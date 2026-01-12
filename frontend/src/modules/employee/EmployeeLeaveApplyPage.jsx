import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Paperclip, PlusCircle, Calendar, Clock, FileText, CheckCircle, XCircle } from 'lucide-react';
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
    partial_day: 'full_day',
    partial_session: 'first_half',
    reason: '',
    attachment: null,
  });

  const [holidays, setHolidays] = useState([]);

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

  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const data = await employeeApi.getHolidays();
        setHolidays(data.holidays || []);
      } catch (err) {
        // Silently fail for holidays, not critical
        console.warn('Failed to load holidays:', err);
      }
    };
    loadHolidays();
  }, []);

  useEffect(() => {
    if (balances.length > 0 && !form.leave_policy_id) {
      setForm(prev => ({ ...prev, leave_policy_id: balances[0].policy.id.toString() }));
    }
  }, [balances]);

  // Sync to_date with from_date when partial day is selected
  useEffect(() => {
    if (form.partial_day === 'half_day' && form.from_date) {
      setForm(prev => ({ ...prev, to_date: form.from_date }));
    }
  }, [form.partial_day, form.from_date]);

  // Auto-dismiss success/error messages after 2 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const selectedPolicy = useMemo(() => {
    return balances.find((b) => Number(b.policy?.id) === Number(form.leave_policy_id))?.policy;
  }, [balances, form.leave_policy_id]);

  const availableBalance = useMemo(() => {
    const record = balances.find((b) => Number(b.policy?.id) === Number(form.leave_policy_id));
    if (!record) return 0;
    return record.available;
  }, [balances, form.leave_policy_id]);

  const estimatedDays = useMemo(() => {
    if (!form.from_date || !form.to_date) return 0;
    const parseYMD = (s) => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    };

    const from = parseYMD(form.from_date);
    const to = parseYMD(form.to_date);
    if (!from || !to || from > to) return 0;

    if (form.partial_day === 'half_day') return 0.5;

    // Check if sandwich rule is enabled for the selected policy
    const isSandwichRuleEnabled = selectedPolicy?.sandwich_rule_enabled === true;

    if (isSandwichRuleEnabled) {
      // Sandwich rule logic: count all days in the range (including weekends)
      const totalDays = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
      return totalDays;
    } else {
      // If sandwich rule is disabled, only count working days (exclude weekends and holidays)
      let workingDays = 0;
      const currentDate = new Date(from);
      const holidayDates = holidays.map((h) => h.date);

      const toYMD = (d) => `${d.getFullYear().toString().padStart(4, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

      while (currentDate <= to) {
        const dateString = toYMD(currentDate);
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6 && !holidayDates.includes(dateString)) {
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return workingDays;
    }
  }, [form.from_date, form.to_date, form.partial_day, selectedPolicy, holidays]);

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
    if (!form.reason.trim()) {
      setError('Please provide a reason for the leave request.');
      return;
    }
    if (selectedPolicy?.code === 'SL' && estimatedDays >= 2 && !form.attachment) {
      setError('Supporting document is required for medical leave of 2+ days.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append('leave_policy_id', form.leave_policy_id);
      payload.append('from_date', form.from_date);
      payload.append('to_date', form.to_date);
      payload.append('partial_day', form.partial_day);
      if (form.partial_day === 'half_day') {
        payload.append('partial_session', form.partial_session);
      }
      payload.append('reason', form.reason);
      if (form.attachment) {
        payload.append('attachment', form.attachment);
      }
      await employeeApi.createLeaveRequest(payload);
      setSuccess('Leave request submitted successfully.');
      // Reload balances after successful submission
      const data = await employeeApi.getLeaveBalances();
      setBalances(data.balances || []);
      setForm({
        leave_policy_id: '',
        from_date: '',
        to_date: '',
        partial_day: 'full_day',
        partial_session: 'first_half',
        reason: '',
        attachment: null,
      });
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to submit leave request.');
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-indigo-500" />
            Apply for Leave
          </h2>
          <button
            onClick={async () => {
              try {
                const data = await employeeApi.getLeaveBalances();
                setBalances(data.balances || []);
              } catch (err) {
                setError(err?.message || 'Unable to refresh balances.');
              }
            }}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Refresh Balances
          </button>
        </div>

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
              {balances.map((balance) => (
                <option key={balance.policy.id} value={balance.policy.id}>
                  {balance.policy.name}
                </option>
              ))}
            </select>
            {selectedPolicy && (
              <p className="text-xs text-gray-500 mt-1">
                Monthly accrual: {selectedPolicy.monthly_accrual} · Sandwich rule{' '}
                {selectedPolicy.sandwich_rule_enabled === true ? 'enabled' : 'disabled'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.partial_day === 'half_day' ? 'Date' : 'From Date'}
              </label>
              <input
                type="date"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={form.from_date}
                onChange={(e) => handleChange('from_date', e.target.value)}
                required
              />
            </div>
            {form.partial_day !== 'half_day' && (
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
            )}
          </div>

          <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-indigo-500" />
                <div className="flex items-center gap-2">
                  <input
                    id="partial-day"
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    checked={form.partial_day === 'half_day'}
                    onChange={(e) => handleChange('partial_day', e.target.checked ? 'half_day' : 'full_day')}
                  />
                  <label htmlFor="partial-day" className="text-sm font-medium text-gray-700">
                    Partial day leave
                  </label>
                </div>
              </div>

              {form.partial_day === 'half_day' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Session:</span>
                  <select
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    value={form.partial_session}
                    onChange={(e) => handleChange('partial_session', e.target.value)}
                  >
                    <option value="first_half">First Half</option>
                    <option value="second_half">Second Half</option>
                  </select>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">Days:</span>
                  <span className={`font-semibold ${estimatedDays > availableBalance ? 'text-red-600' : 'text-gray-900'}`}>
                    {Number.isNaN(estimatedDays) ? 0 : estimatedDays}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Available:</span>
                  <span className={`font-semibold ${availableBalance < estimatedDays ? 'text-red-600' : 'text-green-600'}`}>
                    {availableBalance.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {selectedPolicy && (
              <div className="mt-3 text-xs text-gray-500">
                {selectedPolicy.sandwich_rule_enabled === true && (
                  <p>Sandwich rule is enabled for this policy.</p>
                )}
                {selectedPolicy.code === 'SL' && (
                  <p>Medical leave requires supporting document for 2+ days.</p>
                )}
              </div>
            )}

            {estimatedDays > availableBalance && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                Insufficient leave balance for the requested period.
              </div>
            )}
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
            disabled={submitting || estimatedDays > availableBalance}
            className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Submit Leave Request
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EmployeeLeaveApplyPage;

