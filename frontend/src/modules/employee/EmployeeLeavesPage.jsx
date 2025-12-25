import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Clock, Calendar, AlertCircle, X, MessageSquare, PlusCircle, Paperclip, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useEmployeePortal } from './EmployeeLayout';

const EmployeeDashboardPage = () => {
  const { profile } = useEmployeePortal();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [clarificationModal, setClarificationModal] = useState(null);
  const [clarificationResponse, setClarificationResponse] = useState('');
  const [submittingClarification, setSubmittingClarification] = useState(false);

  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [form, setForm] = useState({
    leave_policy_id: '',
    from_date: '',
    to_date: '',
    partial_day: 'full_day',
    partial_session: 'first_half',
    reason: '',
    attachment: null,
  });

  const [balances, setBalances] = useState([]);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [holidays, setHolidays] = useState([]);
  const [wizardError, setWizardError] = useState('');
  const [wizardSuccess, setWizardSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [estimation, setEstimation] = useState({ estimated_days: 0, sandwich_days: 0, total_days: 0 });
  const [estimating, setEstimating] = useState(false);

  // Helper: consistent date formatting (e.g. "10 Dec 2025").
  // Uses a safe parse and falls back to the original value if parsing fails.
  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatRange = (from, to) => {
    const f = formatDate(from);
    const t = formatDate(to);
    return `${f} — ${t}`;
  };

  useEffect(() => {
    const load = async () => {
      try {
        const response = await employeeApi.getDashboard();
        setData(response);
      } catch (err) {
        setError(err?.message || 'Unable to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadBalances = async () => {
      try {
        const response = await employeeApi.getLeaveBalances();
        setBalances(Array.isArray(response.balances) ? response.balances : []);
      } catch (err) {
        console.error('Failed to load leave balances:', err);
        setBalances([]);
      }
    };
    loadBalances();
  }, []);

  useEffect(() => {
    const loadHolidays = async () => {
      const years = new Set();
      if (form.from_date) {
        years.add(new Date(form.from_date).getFullYear());
      }
      if (form.to_date) {
        years.add(new Date(form.to_date).getFullYear());
      }
      if (years.size === 0) {
        years.add(new Date().getFullYear());
      }

      const allHolidays = [];
      for (const year of years) {
        try {
          const response = await employeeApi.getHolidays(year);
          allHolidays.push(...response.holidays);
        } catch (err) {
          console.error('Failed to load holidays for year', year, err);
        }
      }
      setHolidays(allHolidays);
    };
    loadHolidays();
  }, [form.from_date, form.to_date]);

  const leaveBalances = data?.leave_balances || [];

  const getPercent = (available, total) => {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((available / total) * 100));
  };

  const pendingRequests = data?.pending_leaves || data?.pending_requests || [];
  const recentRequests = data?.recent_leaves || [];

  const pendingCount =
    data?.pending_requests_count != null
      ? data.pending_requests_count
      : pendingRequests.length;

  const approvedThisMonth = data?.approved_this_month ?? 0;
  const totalLeavesTaken = data?.total_leaves_taken ?? 0;

  const handleClarificationClick = (leave) => {
    setClarificationModal(leave);
    setClarificationResponse('');
  };

  const submitClarification = async () => {
    if (!clarificationModal || !clarificationResponse.trim()) return;

    setSubmittingClarification(true);
    try {
      await employeeApi.respondToClarification(clarificationModal.id, {
        response: clarificationResponse.trim(),
      });

      // Refresh dashboard data
      const response = await employeeApi.getDashboard();
      setData(response);

      setClarificationModal(null);
      setClarificationResponse('');
    } catch (err) {
      console.error('Failed to submit clarification:', err);
      // You might want to show an error message here
    } finally {
      setSubmittingClarification(false);
    }
  };

  // Wizard functions
  const openWizard = () => {
    setIsWizardOpen(true);
    setCurrentStep(1);
    setWizardError('');
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setCurrentStep(1);
    setForm({
      leave_policy_id: '',
      from_date: '',
      to_date: '',
      partial_day: 'full_day',
      partial_session: 'first_half',
      reason: '',
      attachment: null,
    });
    setWizardError('');
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    setWizardError('');
    switch (currentStep) {
      case 1:
        if (!form.leave_policy_id) {
          setWizardError('Please select a leave type.');
          return false;
        }
        return true;
      case 2:
        if (!form.from_date) {
          setWizardError('Please select a date.');
          return false;
        }
        if (form.partial_day !== 'half_day' && !form.to_date) {
          setWizardError('Please select an end date.');
          return false;
        }
        return true;
      case 3:
        if (!form.reason.trim()) {
          setWizardError('Please provide a reason for the leave request.');
          return false;
        }
        if (selectedPolicy?.code === 'SL' && estimatedDays >= 2 && !form.attachment) {
          setWizardError('Supporting document is required for medical leave of 2+ days.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleWizardChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleWizardFileChange = (e) => {
    const file = e.target.files?.[0];
    handleWizardChange('attachment', file || null);
  };

  const handleWizardSubmit = async (e) => {
    e.preventDefault();
    setWizardError('');
    setWizardSuccess('');
    if (!form.leave_policy_id) {
      setWizardError('Please choose a leave policy.');
      return;
    }
    if (!form.reason.trim()) {
      setWizardError('Please provide a reason for the leave request.');
      return;
    }
    if (selectedPolicy?.code === 'SL' && estimatedDays >= 2 && !form.attachment) {
      setWizardError('Supporting document is required for medical leave of 2+ days.');
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
      setWizardSuccess('Leave request submitted successfully.');
      // Reload dashboard data after successful submission
      const response = await employeeApi.getDashboard();
      setData(response);
      setForm({
        leave_policy_id: '',
        from_date: '',
        to_date: '',
        partial_day: 'full_day',
        partial_session: 'first_half',
        reason: '',
        attachment: null,
      });
      // Reset wizard to step 1
      setCurrentStep(1);
      setIsWizardOpen(false);
    } catch (err) {
      setWizardError(err?.error || err?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Wizard computed values
  const selectedPolicy = useMemo(() => {
    if (!Array.isArray(balances)) return null;
    return balances.find((b) => Number(b.policy?.id) === Number(form.leave_policy_id))?.policy;
  }, [balances, form.leave_policy_id]);

  const availableBalance = useMemo(() => {
    if (!Array.isArray(balances)) return 0;
    const record = balances.find((b) => Number(b.policy?.id) === Number(form.leave_policy_id));
    if (!record) return 0;
    return record.available;
  }, [balances, form.leave_policy_id]);

  // Backend Estimation
  useEffect(() => {
    let active = true;
    const fetchEstimate = async () => {
      if (!form.from_date || !form.to_date || !form.leave_policy_id) {
        setEstimation({ estimated_days: 0, sandwich_days: 0, total_days: 0 });
        return;
      }

      const parseYMD = (s) => {
        if (!s) return null;
        const [y, m, d] = s.split('-').map(Number);
        if (!y || !m || !d) return null;
        return new Date(Date.UTC(y, m - 1, d));
      };
      const from = parseYMD(form.from_date);
      const to = parseYMD(form.to_date);
      if (!from || !to || from > to) {
        setEstimation({ estimated_days: 0, sandwich_days: 0, total_days: 0 });
        return;
      }

      setEstimating(true);
      try {
        const res = await employeeApi.estimateLeave({
          employee_id: profile?.id,
          leave_policy_id: form.leave_policy_id,
          from_date: form.from_date,
          to_date: form.to_date,
          partial_day: form.partial_day,
          partial_session: form.partial_session
        });
        if (active) {
          setEstimation(res);
        }
      } catch (err) {
        console.error("Estimation failed", err);
      } finally {
        if (active) setEstimating(false);
      }
    };

    // Debounce slightly or just call
    const timer = setTimeout(fetchEstimate, 500);
    return () => { active = false; clearTimeout(timer); };
  }, [form.from_date, form.to_date, form.leave_policy_id, form.partial_day, form.partial_session, profile]);

  const estimatedDays = estimation.total_days;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Preparing your leave dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Leave Dashboard
            </h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              Manage your leave requests and view balances
            </p>
          </div>
          <button
            onClick={openWizard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium shadow-sm hover:bg-cyan-600 transition-colors self-start md:self-auto"
          >
            <span className="text-base">➕ apply leave</span>
          </button>
        </div>

        {/* Leave Balances */}
        <section className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaveBalances.map((balance) => {
              const pct = getPercent(balance.available, balance.total);
              const colors = {
                'CL': { bg: 'bg-cyan-500', text: 'text-cyan-500' },
                'SL': { bg: 'bg-emerald-500', text: 'text-emerald-500' },
                'EL': { bg: 'bg-amber-500', text: 'text-amber-500' },
              };
              const color = colors[balance.code] || { bg: 'bg-blue-500', text: 'text-blue-500' };

              return (
                <div
                  key={balance.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedBalance(balance)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {balance.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Available leaves</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${color.text}`}>
                        {balance.available}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">out of {balance.total || 0}</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className={`h-1.5 ${color.bg} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Small Stats Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Pending Requests</p>
                <p className="text-4xl font-bold text-amber-500">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Approved This Month</p>
                <p className="text-4xl font-bold text-emerald-500">
                  {approvedThisMonth} days
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-600 mb-1">Total Leaves Taken</p>
                <p className="text-4xl font-bold text-cyan-500">
                  {totalLeavesTaken} days
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-cyan-500" />
              </div>
            </div>
          </div>
        </section>

        {/* Pending + Recent Requests */}
        <div className="space-y-6">
          {/* Pending Requests */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Pending Requests
            </h2>
            <div className="space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {leave.type || 'Leave'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {leave.days} day{leave.days > 1 ? 's' : ''}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium bg-amber-100 text-amber-700">
                        Pending
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatRange(leave.from_date, leave.to_date)}
                      </span>
                    </div>
                    {leave.reason && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                        <span className="flex-shrink-0">📄</span>
                        <span>{leave.reason}</span>
                      </div>
                    )}
                    {leave.submitted_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted on {formatDate(leave.submitted_at)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  You have no pending leave requests.
                </p>
              )}
            </div>
          </section>

          {/* Recent Requests */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Recent Requests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentRequests.length > 0 ? (
                recentRequests.slice(0, 3).map((leave) => (
                  <div
                    key={leave.id}
                    className={`border border-gray-200 rounded-lg p-4 ${leave.clarification_reason ? 'cursor-pointer hover:bg-gray-50' : ''
                      }`}
                    onClick={() => leave.clarification_reason && handleClarificationClick(leave)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {leave.type || 'Leave'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {leave.days} day{leave.days > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {leave.clarification_reason && (
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        )}
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${leave.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : leave.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : leave.clarification_reason
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {leave.clarification_reason ? 'Clarification Needed' : leave.status || 'Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatRange(leave.from_date, leave.to_date)}
                      </span>
                    </div>
                    {leave.reason && (
                      <div className="flex items-start gap-1.5 text-xs text-gray-600 mb-2">
                        <span>reason: {leave.reason}</span>
                      </div>
                    )}
                    {leave.submitted_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted on {formatDate(leave.submitted_at)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  No recent leave requests found.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Leave Balance Modal */}
        {selectedBalance && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedBalance.name} Details
                </h3>
                <button
                  onClick={() => setSelectedBalance(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedBalance.available}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{selectedBalance.total}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Current Balance:</span>
                    <span className="font-medium">{selectedBalance.balance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Carry Forward:</span>
                    <span className="font-medium">{selectedBalance.carry_forward_balance}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending Deduction:</span>
                    <span className="font-medium">{selectedBalance.pending_deduction}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Accrued This Year:</span>
                    <span className="font-medium">{selectedBalance.accrued_this_year}</span>
                  </div>
                </div>
                {selectedBalance.description && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Description</p>
                    <p className="text-sm text-gray-900">{selectedBalance.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Clarification Modal */}
        {clarificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Clarification Required
                </h3>
                <button
                  onClick={() => setClarificationModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Admin Message:</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-900">{clarificationModal.clarification_reason}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={clarificationResponse}
                    onChange={(e) => setClarificationResponse(e.target.value)}
                    placeholder="Please provide clarification for your leave request..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                    disabled={submittingClarification}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setClarificationModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={submittingClarification}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitClarification}
                    disabled={!clarificationResponse.trim() || submittingClarification}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingClarification ? 'Submitting...' : 'Submit Response'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Modal */}
        {isWizardOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header with steps */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Apply for Leave
                </h3>
                <button
                  onClick={closeWizard}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => {
                    const stepLabels = {
                      1: 'Select Leave Type',
                      2: 'Select Dates',
                      3: 'Provide Details',
                      4: 'Review & Submit'
                    };
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step < currentStep
                            ? 'bg-green-500 text-white'
                            : step === currentStep
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                            }`}
                        >
                          {step < currentStep ? <Check className="w-4 h-4" /> : step}
                        </div>
                        <p className={`text-xs mt-2 text-center ${step === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
                          }`}>
                          {stepLabels[step]}
                        </p>
                        {step < totalSteps && (
                          <div
                            className={`w-12 h-0.5 mx-2 mt-4 ${step < currentStep ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form content */}
              <div className="p-6">
                {wizardError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{wizardError}</p>
                  </div>
                )}
                {wizardSuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600">{wizardSuccess}</p>
                  </div>
                )}

                {currentStep === 1 && (
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-4">Select Leave Type</h4>
                    <div className="space-y-3">
                      {balances.map((balance) => {
                        const policy = balance.policy;
                        return (
                          <label key={policy.id} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="leave_policy"
                              value={policy.id}
                              checked={form.leave_policy_id == policy.id}
                              onChange={(e) => handleWizardChange('leave_policy_id', e.target.value)}
                              className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{policy.name}</p>
                              <p className="text-xs text-gray-600">Available: {balance.available} days</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-4">Select Dates</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                        <select
                          value={form.partial_day}
                          onChange={(e) => handleWizardChange('partial_day', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="full_day">Full Day</option>
                          <option value="half_day">Half Day</option>
                        </select>
                      </div>

                      {form.partial_day === 'half_day' ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                          <input
                            type="date"
                            value={form.from_date}
                            onChange={(e) => handleWizardChange('from_date', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
                            <select
                              value={form.partial_session}
                              onChange={(e) => handleWizardChange('partial_session', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="first_half">First Half</option>
                              <option value="second_half">Second Half</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                            <input
                              type="date"
                              value={form.from_date}
                              onChange={(e) => handleWizardChange('from_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                            <input
                              type="date"
                              value={form.to_date}
                              onChange={(e) => handleWizardChange('to_date', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      )}

                      <div className="min-h-[60px]">
                        {estimating ? (
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-gray-600">Calculating days...</span>
                          </div>
                        ) : estimatedDays > 0 ? (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900">
                              Estimated days: {estimatedDays} {estimatedDays === 0.5 ? 'half day' : 'days'}
                            </p>
                            {estimation.sandwich_days > 0 && (
                              <p className="text-xs text-blue-700 mt-0.5">
                                (Includes {estimation.sandwich_days} sandwich days)
                              </p>
                            )}
                            {availableBalance < estimatedDays && (
                              <p className="text-sm text-red-600 mt-1">
                                Warning: Insufficient balance. Available: {availableBalance} days
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-4">Provide Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Leave</label>
                        <textarea
                          value={form.reason}
                          onChange={(e) => handleWizardChange('reason', e.target.value)}
                          placeholder="Please provide a reason for your leave request..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                        />
                      </div>

                      {selectedPolicy?.code === 'SL' && estimatedDays >= 2 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Supporting Document</label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleWizardFileChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">Required for medical leave of 2+ days</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div>
                    <h4 className="text-base font-medium text-gray-900 mb-4">Review & Submit</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Leave Type:</span>
                        <span className="text-sm font-medium">{selectedPolicy?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dates:</span>
                        <span className="text-sm font-medium">
                          {form.partial_day === 'half_day'
                            ? `${formatDate(form.from_date)} (${form.partial_session})`
                            : formatRange(form.from_date, form.to_date)
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Days:</span>
                        <span className="text-sm font-medium">{estimatedDays} {estimatedDays === 0.5 ? 'half day' : 'days'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Reason:</span>
                        <span className="text-sm font-medium">{form.reason}</span>
                      </div>
                      {form.attachment && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Attachment:</span>
                          <span className="text-sm font-medium">{form.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer with buttons */}
              <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={closeWizard}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  {currentStep < totalSteps ? (
                    <button
                      onClick={nextStep}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      onClick={handleWizardSubmit}
                      disabled={submitting}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>

  );

};

export default EmployeeDashboardPage;
