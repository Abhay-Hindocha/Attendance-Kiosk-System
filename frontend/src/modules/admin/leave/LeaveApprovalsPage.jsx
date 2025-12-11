import React, { useEffect, useMemo, useState } from 'react';
import {
  Filter,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  ChevronRight,
  Info,
  Download,
  Loader2,
  Settings,
} from 'lucide-react';
import api from '../../../services/api';
import AdminLeaveCorrectionWizardModal from './AdminLeaveCorrectionWizardModal';

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  clarification: { label: 'Clarification', className: 'bg-blue-100 text-blue-700' },
};

const defaultFilters = {
  status: 'pending',
  department: '',
  leave_policy_id: '',
  start_date: '',
  end_date: '',
};

const LeaveApprovalsPage = () => {
  const [requests, setRequests] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [actionForm, setActionForm] = useState({ comment: '', from_date: '', to_date: '', admin_reason: '', reject_choice: 'reject' });
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  const baseAssetUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_APP_API_BASE_URL || '';
    return apiBase.replace(/\/api\/?$/, '');
  }, []);

  const apiBase = import.meta.env.VITE_APP_API_BASE_URL || '';

  // Helper: normalize various date formats and timestamps to "yyyy-MM-dd"
  const asYMD = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const s = String(value);
    const t = s.indexOf('T');
    if (t > -1) return s.slice(0, t);
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return '';
  };

  const fetchPolicies = async () => {
    try {
      const data = await api.getLeavePolicies();
      setPolicies(data || []);
    } catch (error) {
      console.error('Failed to load leave policies', error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // build params from filters and page. Only include non-empty values.
      const params = { page };

      if (filters.status) params.status = filters.status;
      if (filters.department && String(filters.department).trim() !== '') params.department = filters.department.trim();
      if (filters.leave_policy_id) params.leave_policy_id = filters.leave_policy_id;
      if (filters.start_date) params.start_date = filters.start_date;
      if (filters.end_date) params.end_date = filters.end_date;

      const response = await api.getLeaveApprovals(params);

      // Normalize dates on incoming requests to ensure consistent display
      const normalized = (response.data || []).map((r) => ({
        ...r,
        from_date: asYMD(r.from_date),
        to_date: asYMD(r.to_date),
      }));

      setRequests(normalized);
      setPagination({
        current_page: response.current_page,
        last_page: response.last_page,
      });
    } catch (error) {
      console.error('Failed to load leave approvals', error);
      setNotification({ type: 'error', message: 'Unable to load leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  useEffect(() => {
    // whenever filters change, ensure we request page 1 if page is >1
    setPage(1);
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    // fetch when page changes
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openDetail = async (request) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api.getLeaveRequest(request.id);
      // normalize the date fields in detail too
      const normalizedDetail = {
        ...data,
        from_date: asYMD(data.from_date),
        to_date: asYMD(data.to_date),
        timelines: (data.timelines || []).map((t) => ({
          ...t,
          created_at: t.created_at,
        })),
      };
      setDetail(normalizedDetail);
    } catch (error) {
      console.error('Failed to load leave request detail', error);
      setNotification({ type: 'error', message: 'Unable to load leave details.' });
    } finally {
      setDetailLoading(false);
    }
  };

  const closeActionModal = () => {
    setActionModal(null);
    setActionForm({ comment: '', from_date: '', to_date: '', admin_reason: '', reject_choice: 'reject' });
  };

  const openActionModal = (type, request) => {
    // type: 'approve' | 'reject'
    setActionModal({ type, request });

    setActionForm({
      comment: '',
      from_date: asYMD(request.from_date),
      to_date: asYMD(request.to_date),
      admin_reason: '',
      reject_choice: 'reject',
    });
  };

  const handleActionSubmit = async () => {
    if (!actionModal) return;
    const { type, request } = actionModal;

    // validation
    if (type === 'approve') {
      // allow approve without comment but dates must be valid
      if (!actionForm.from_date || !actionForm.to_date) {
        setNotification({ type: 'error', message: 'Please provide valid from and to dates.' });
        return;
      }
    }

    if (type === 'reject') {
      // actionForm.reject_choice decides whether admin wants clarification or reject
      if (actionForm.reject_choice === 'clarify' && !actionForm.comment.trim()) {
        setNotification({ type: 'error', message: 'Clarification comment is required.' });
        return;
      }

      if (actionForm.reject_choice === 'reject' && !actionForm.admin_reason.trim()) {
        setNotification({ type: 'error', message: 'Rejection reason is required.' });
        return;
      }
    }

    setActionLoading(true);
    try {
      if (type === 'approve') {
        await api.approveLeaveRequest(request.id, {
          comment: actionForm.comment,
          from_date: actionForm.from_date,
          to_date: actionForm.to_date,
        });
        setNotification({ type: 'success', message: 'Request approved successfully.' });
      } else if (type === 'reject') {
        if (actionForm.reject_choice === 'clarify') {
          await api.requestLeaveClarification(request.id, {
            comment: actionForm.comment,
          });
          setNotification({ type: 'success', message: 'Clarification requested successfully.' });
        } else {
          await api.rejectLeaveRequest(request.id, {
            comment: actionForm.admin_reason,
          });
          setNotification({ type: 'success', message: 'Request rejected successfully.' });
        }
      }

      closeActionModal();
      fetchRequests();
      if (detail && detail.id === request.id) {
        openDetail(request);
      }
    } catch (error) {
      console.error('Action failed', error);
      setNotification({ type: 'error', message: error?.message || 'Action failed. Please try again.' });
    } finally {
      setActionLoading(false);
    }
  };

  const attachmentUrl = (path, id) => {
    const token = localStorage.getItem('authToken');
    if (id) {
      const url = new URL(`${apiBase}/leave/requests/${id}/download`);
      url.searchParams.set('token', token);
      return url.toString();
    }
    if (!path) return null;
    return `${baseAssetUrl}/storage/${path}`;
  };

  const statusTabs = Object.keys(statusConfig);
  const timeline = detail?.timelines || [];

  const renderStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>{config.label}</span>;
  };

  // helper: leave requests filtered by selected employee used in correction modal (kept for parity)
  const employeeLeaveRequestsFor = (employeeId) => {
    return (requests || []).filter((r) => String(r.employee?.id || r.employee_id) === String(employeeId));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Approvals</h1>
            <p className="text-sm text-gray-600">Review leave requests, apply sandwich rules, and manage workflows.</p>
          </div>
          <button
            onClick={() => setShowCorrectionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Manual Leave Correction
          </button>
        </div>

        {notification && (
          <div
            className={`px-4 py-3 rounded-lg text-sm font-medium ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusTabs.map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status }));
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  filters.status === status
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {statusConfig[status].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                Department
              </label>
              <input
                type="text"
                value={filters.department}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, department: e.target.value }));
                }}
                placeholder="All departments"
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                From date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, start_date: e.target.value }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                To date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, end_date: e.target.value }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 flex items-center gap-2 mb-1">
                <Filter className="w-4 h-4 text-gray-400" />
                Leave type
              </label>
              <select
                value={filters.leave_policy_id}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, leave_policy_id: e.target.value }));
                }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2"
              >
                <option value="">All leave types</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex justify-center items-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
                No leave requests found for the selected filters.
              </div>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 md:p-5 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">{request.employee?.department || 'General'}</p>
                      <h3 className="text-lg font-semibold text-gray-900">{request.employee?.name}</h3>
                      <p className="text-xs text-gray-500">{request.policy?.name}</p>
                    </div>
                    {renderStatusBadge(request.status)}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Dates</p>
                      <p className="font-semibold text-gray-800">
                        {asYMD(request.from_date)} → {asYMD(request.to_date)}
                      </p>
                      <p className="text-xs text-gray-500">{request.estimated_days} days</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Sandwich rule</p>
                      <p className="font-semibold text-gray-800">
                        {request.sandwich_rule_applied ? `${request.sandwich_applied_days} days added` : 'Not applied'}
                      </p>
                      <p className="text-xs text-gray-500">Policy setting controls reset</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Reason</p>
                      <p className="font-semibold text-gray-800 line-clamp-2">{request.reason || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {request.attachment_path && (
                      <a
                        href={attachmentUrl(request.attachment_path, request.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Download className="w-4 h-4" />
                        Attachment
                      </a>
                    )}
                    <button
                      onClick={() => openDetail(request)}
                      className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 ml-auto"
                    >
                      View timeline
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  {request.status === 'pending' && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openActionModal('approve', request)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => openActionModal('reject', request)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      {/* Clarify button removed per request; reject now contains option to ask clarification */}
                    </div>
                  )}
                </div>
              ))
            )}
            {pagination.last_page > 1 && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center justify-between">
                <button
                  disabled={pagination.current_page === 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
                >
                  Previous
                </button>
                <p className="text-sm text-gray-500">
                  Page {pagination.current_page} of {pagination.last_page}
                </p>
                <button
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="px-4 py-2 rounded-lg border text-sm font-medium disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 sticky top-4 h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Request detail
            </h2>
            {detailLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Employee</p>
                  <p className="text-base font-semibold text-gray-900">{detail.employee?.name}</p>
                  <p className="text-xs text-gray-500">{detail.employee?.department}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Policy</p>
                    <p className="font-semibold text-gray-900">{detail.policy?.name}</p>
                    <p className="text-xs text-gray-500">{detail.policy?.code}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="font-semibold text-gray-900">
                      {asYMD(detail.from_date)} → {asYMD(detail.to_date)}
                    </p>
                    <p className="text-xs text-gray-500">{detail.estimated_days} days + {detail.sandwich_applied_days} sandwich</p>
                  </div>
                </div>
                <div className="border border-gray-100 rounded-xl p-3">
                  <p className="text-xs text-gray-500 uppercase mb-1">Reason</p>
                  <p className="text-sm text-gray-800">{detail.reason || 'No reason provided'}</p>
                </div>
                {detail.attachment_path && (
                  <a
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                    href={attachmentUrl(detail.attachment_path, detail.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="w-4 h-4" />
                    Download document
                  </a>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-400" />
                    Timeline
                  </p>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {timeline.length === 0 ? (
                      <p className="text-sm text-gray-500">No timeline entries yet.</p>
                    ) : (
                      timeline.map((entry) => (
                        <div key={entry.id} className="border border-gray-100 rounded-xl p-3 text-sm">
                          <p className="font-semibold text-gray-800 capitalize">{entry.action.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-500">{new Date(entry.created_at).toLocaleString()}</p>
                          {entry.notes && <p className="text-sm text-gray-700 mt-1">{entry.notes}</p>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select a request to view its timeline & attachments.</div>
            )}
          </div>
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {actionModal.type === 'reject' ? 'Reject / Ask clarification' : `${actionModal.type} leave`}
              </h3>
              <p className="text-sm text-gray-500">For {actionModal.request.employee?.name}</p>
            </div>
            <div className="px-6 py-4 space-y-4">
              {actionModal.type === 'approve' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">From date</label>
                    <input
                      type="date"
                      value={actionForm.from_date}
                      onChange={(e) => setActionForm((prev) => ({ ...prev, from_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">To date</label>
                    <input
                      type="date"
                      value={actionForm.to_date}
                      onChange={(e) => setActionForm((prev) => ({ ...prev, to_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {actionModal.type === 'reject' && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Action</label>
                  <div className="flex gap-2">
                    <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${actionForm.reject_choice === 'reject' ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="reject_choice"
                        value="reject"
                        checked={actionForm.reject_choice === 'reject'}
                        onChange={(e) => setActionForm((prev) => ({ ...prev, reject_choice: e.target.value }))}
                      />
                      Reject
                    </label>
                    <label className={`inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer ${actionForm.reject_choice === 'clarify' ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
                      <input
                        type="radio"
                        name="reject_choice"
                        value="clarify"
                        checked={actionForm.reject_choice === 'clarify'}
                        onChange={(e) => setActionForm((prev) => ({ ...prev, reject_choice: e.target.value }))}
                      />
                      Ask for clarification
                    </label>
                  </div>

                  {actionForm.reject_choice === 'reject' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Reason (required)</label>
                      <textarea
                        value={actionForm.admin_reason}
                        onChange={(e) => setActionForm((prev) => ({ ...prev, admin_reason: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Clarification required (required)</label>
                      <textarea
                        value={actionForm.comment}
                        onChange={(e) => setActionForm((prev) => ({ ...prev, comment: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2"
                      />
                    </div>
                  )}
                </div>
              )}

              {actionModal.type !== 'reject' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Comment</label>
                  <textarea
                    value={actionForm.comment}
                    onChange={(e) => setActionForm((prev) => ({ ...prev, comment: e.target.value }))}
                    rows={3}
                    placeholder={
                      actionModal.type === 'clarify'
                        ? 'Explain what details you need from the employee.'
                        : 'Optional note to the employee.'
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2"
                  />
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex items-center gap-3 justify-end">
              <button
                onClick={closeActionModal}
                className="px-4 py-2 rounded-lg border text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <AdminLeaveCorrectionWizardModal
          onClose={() => setShowCorrectionModal(false)}
          onSuccess={() => {
            setShowCorrectionModal(false);
            fetchRequests();
            setNotification({ type: 'success', message: 'Leave correction completed successfully.' });
          }}
        />
      )}
    </div>
  );
};

export default LeaveApprovalsPage;
