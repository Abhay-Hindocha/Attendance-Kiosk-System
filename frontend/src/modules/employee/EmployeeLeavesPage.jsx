import React, { useEffect, useState } from 'react';
import { AlertCircle, Layers } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const statusBadge = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-700',
  clarification: 'bg-blue-50 text-blue-700',
};

const EmployeeLeavesPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await employeeApi.getLeaveBalances();
      setData(response);
    } catch (err) {
      setError(err?.message || 'Unable to fetch leave balances.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow text-center">
        <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading leave dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow text-sm text-red-600 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Leave Balances</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data?.balances?.map((balance) => (
            <div
              key={balance.id}
              className="border border-gray-100 rounded-2xl p-4 bg-gray-50 hover:bg-white hover:shadow transition"
            >
              <p className="text-xs uppercase text-gray-500">{balance.policy?.code}</p>
              <p className="text-lg font-semibold text-gray-900">{balance.policy?.name}</p>
              <p className="text-sm text-gray-500 mt-2">
                Available:{' '}
                <span className="font-semibold text-gray-900">
                  {(balance.balance + balance.carry_forward_balance + balance.accrued_this_year - balance.pending_deduction).toFixed(1)}
                </span>
              </p>
              <p className="text-xs text-gray-400">
                {balance.balance.toFixed(1)} current · {balance.carry_forward_balance.toFixed(1)} carry forward
              </p>
            </div>
          ))}
          {(!data?.balances || data.balances.length === 0) && (
            <p className="text-sm text-gray-500">No leave policies have been assigned to you yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Pending requests</h3>
        <div className="space-y-3">
          {data?.pending_requests?.map((req) => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">
                  {req.from_date} → {req.to_date}
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[req.status] || statusBadge.pending}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{req.reason || 'No reason provided'}</p>
              {req.estimated_days && (
                <p className="text-xs text-gray-400 mt-1">
                  Estimated days: {req.estimated_days} {req.sandwich_applied_days > 0 && `(including ${req.sandwich_applied_days} sandwich days)`}
                </p>
              )}
            </div>
          ))}
          {(!data?.pending_requests || data.pending_requests.length === 0) && (
            <p className="text-xs text-gray-500">Great! You have no pending approvals.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Approved leaves</h3>
        <div className="space-y-3">
          {data?.approved_leaves?.map((req) => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">
                  {req.from_date} → {req.to_date}
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[req.status] || statusBadge.approved}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">{req.reason || 'No reason provided'}</p>
              {req.estimated_days && (
                <p className="text-xs text-gray-400 mt-1">
                  Estimated days: {req.estimated_days} {req.sandwich_applied_days > 0 && `(including ${req.sandwich_applied_days} sandwich days)`}
                </p>
              )}
            </div>
          ))}
          {(!data?.approved_leaves || data.approved_leaves.length === 0) && (
            <p className="text-xs text-gray-500">No approved leaves yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700">Recent history</h3>
          <button onClick={load} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            Refresh
          </button>
        </div>
        <div className="space-y-3">
          {data?.history?.map((req) => (
            <div key={req.id} className="border border-gray-100 rounded-xl p-3 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">
                  {req.from_date} → {req.to_date}
                </p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge[req.status] || statusBadge.pending}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{req.reason || 'No reason provided'}</p>
              {req.estimated_days && (
                <p className="text-xs text-gray-400 mt-1">
                  Estimated days: {req.estimated_days} {req.sandwich_applied_days > 0 && `(including ${req.sandwich_applied_days} sandwich days)`}
                </p>
              )}
            </div>
          ))}
          {(!data?.history || data.history.length === 0) && (
            <p className="text-xs text-gray-500">No leave history available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeavesPage;

