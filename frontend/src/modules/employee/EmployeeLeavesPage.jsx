import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, Clock, Calendar, AlertCircle, X } from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useEmployeePortal } from './EmployeeLayout';

const EmployeeDashboardPage = () => {
  const { profile } = useEmployeePortal();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBalance, setSelectedBalance] = useState(null);

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
          <Link
            to="/employee/apply-leave"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium shadow-sm hover:bg-cyan-600 transition-colors self-start md:self-auto"
          >
            <span className="text-base">➕ apply leave</span>
          </Link>
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
                      <span
                        className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
                          leave.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : leave.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {leave.status || 'Pending'}
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
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;
