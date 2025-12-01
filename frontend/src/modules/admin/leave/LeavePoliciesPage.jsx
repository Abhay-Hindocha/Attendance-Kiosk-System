import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  ShieldCheck,
  Calendar,
  RefreshCw,
  Copy,
  Archive,
  Edit,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import api from '../../../services/api';

const defaultForm = {
  name: '',
  code: '',
  description: '',
  yearly_quota: 12,
  monthly_accrual: 1,
  accrual_day: 1,
  join_date_proration: true,
  carry_forward_enabled: true,
  carry_forward_quarter_cap: 3,
  carry_forward_reset_mode: 'quarterly',
  auto_reset_quarter_end: true,
  reset_notice_days: 3,
  sandwich_rule_enabled: true,
  sandwich_examples: [
    'Leave Fri + Mon → Sat & Sun counted (4 days)',
    'Leave Wed + Fri with Thu holiday → Wed, Thu, Fri (3 days)',
  ],
  max_balance: 12,
  status: 'active',
  eligibility_departments: [],
  eligibility_designations: [],
};

const chips = (items = []) => (
  <div className="flex flex-wrap gap-2">
    {items.length === 0 ? (
      <span className="text-xs text-gray-500">All</span>
    ) : (
      items.map((item) => (
        <span key={item} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
          {item}
        </span>
      ))
    )}
  </div>
);

const LeavePoliciesPage = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formState, setFormState] = useState(defaultForm);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [notification, setNotification] = useState(null);
  const [confirmArchive, setConfirmArchive] = useState(null);
  const [confirmCopy, setConfirmCopy] = useState(null);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.getLeavePolicies();
      setPolicies(data);
    } catch (error) {
      console.error('Failed to load leave policies', error);
      setNotification({ type: 'error', message: 'Unable to load leave policies.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPolicy(null);
    setFormState(defaultForm);
  };

  const startCreate = () => {
    setEditingPolicy(null);
    setFormState(defaultForm);
    setShowModal(true);
  };

  const startEdit = (policy) => {
    setEditingPolicy(policy);
    setFormState({
      ...defaultForm,
      ...policy,
      code: policy.code,
      name: policy.name,
      description: policy.description ?? '',
      yearly_quota: policy.yearly_quota,
      monthly_accrual: policy.monthly_accrual,
      accrual_day: policy.accrual_day,
      carry_forward_enabled: policy.carry_forward_enabled,
      sandwich_examples: policy.sandwich_examples || defaultForm.sandwich_examples,
      eligibility_departments: policy.eligibility_departments || [],
      eligibility_designations: policy.eligibility_designations || [],
    });
    setShowModal(true);
  };

  const handleInput = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleArrayInput = (key, value) => {
    const items = value.split(',').map((item) => item.trim()).filter(Boolean);
    handleInput(key, items);
  };

  const formSections = useMemo(
    () => [
      {
        title: 'Basic Details',
        description: 'Name, description & status',
        content: (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Name</label>
              <input
                type="text"
                value={formState.name}
                onChange={(e) => handleInput('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="e.g., Casual Leave"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Code</label>
              <input
                type="text"
                value={formState.code}
                onChange={(e) => handleInput('code', e.target.value.toUpperCase())}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 uppercase"
                placeholder="CL"
                maxLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formState.description}
                onChange={(e) => handleInput('description', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                rows={3}
                placeholder="Explain what this leave type covers"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Accrual Rules',
        description: 'Monthly accrual and quotas',
        content: (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yearly Quota</label>
              <input
                type="number"
                value={formState.yearly_quota}
                onChange={(e) => handleInput('yearly_quota', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                min={0}
              />
              <p className="text-xs text-gray-500 mt-1">Annual maximum 12 leaves</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Accrual</label>
              <input
                type="number"
                step="0.5"
                value={formState.monthly_accrual}
                onChange={(e) => handleInput('monthly_accrual', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">1 leave added on 1st</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accrual Day</label>
              <input
                type="number"
                min={1}
                max={28}
                value={formState.accrual_day}
                onChange={(e) => handleInput('accrual_day', Number(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>
        ),
      },
      {
        title: 'Carry-forward Settings',
        description: 'Quarter limits & reset notifications',
        content: (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-800">Carry-forward allowed</p>
                <p className="text-sm text-gray-500">Auto reset at quarter end</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.carry_forward_enabled}
                  onChange={(e) => handleInput('carry_forward_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>
            {formState.carry_forward_enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quarter Cap (max leaves)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.carry_forward_quarter_cap}
                    onChange={(e) => handleInput('carry_forward_quarter_cap', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 3 leaves carry forward</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reset Mode</label>
                  <select
                    value={formState.carry_forward_reset_mode}
                    onChange={(e) => handleInput('carry_forward_reset_mode', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reset Notification (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={formState.reset_notice_days}
                    onChange={(e) => handleInput('reset_notice_days', Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">Alert 3 days before reset</p>
                </div>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Sandwich Rule',
        description: 'Enable sandwich logic & examples',
        content: (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-800">Sandwich Rule</p>
                <p className="text-sm text-gray-500">Weekend/holiday counted if leave spans both sides</p>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.sandwich_rule_enabled}
                  onChange={(e) => handleInput('sandwich_rule_enabled', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </label>
            </div>
            {formState.sandwich_rule_enabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Examples</label>
                <textarea
                  value={formState.sandwich_examples.join('\n')}
                  onChange={(e) => handleInput('sandwich_examples', e.target.value.split('\n').filter(Boolean))}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  One example per line. Displayed to admins for clarity.
                </p>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Eligibility',
        description: 'Departments / designations the policy applies to',
        content: (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departments</label>
              <input
                type="text"
                value={formState.eligibility_departments.join(', ')}
                onChange={(e) => handleArrayInput('eligibility_departments', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="HR, Finance, Engineering"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Designations</label>
              <input
                type="text"
                value={formState.eligibility_designations.join(', ')}
                onChange={(e) => handleArrayInput('eligibility_designations', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
                placeholder="Manager, Executive"
              />
            </div>
          </div>
        ),
      },
    ],
    [formState]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPolicy) {
        await api.updateLeavePolicy(editingPolicy.id, formState);
      } else {
        await api.createLeavePolicy(formState);
      }
      await loadPolicies();
      setNotification({ type: 'success', message: `Policy ${editingPolicy ? 'updated' : 'created'} successfully.` });
      handleModalClose();
    } catch (error) {
      console.error('Failed to save policy', error);
      setNotification({
        type: 'error',
        message: error?.message || 'Unable to save policy. Please check inputs.',
      });
    }
  };

  const handleArchiveToggle = async () => {
    if (!confirmArchive) return;
    try {
      await api.toggleLeavePolicyStatus(confirmArchive.id);
      await loadPolicies();
      setNotification({ type: 'success', message: 'Policy status updated.' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to update status.' });
    } finally {
      setConfirmArchive(null);
    }
  };

  const handleCopyConfirm = async () => {
    if (!confirmCopy) return;
    try {
      await api.copyLeavePolicy(confirmCopy.id);
      await loadPolicies();
      setNotification({ type: 'success', message: 'Policy copied successfully.' });
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to copy policy.' });
    } finally {
      setConfirmCopy(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Policies</h1>
            <p className="text-sm text-gray-600">Configure CL, SL, EL accruals & sandwich rule.</p>
          </div>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Policy
          </button>
        </div>

        {notification && (
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
              notification.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium text-sm">{notification.message}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">Loading policies...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500">{policy.code}</p>
                    <h3 className="text-lg font-semibold text-gray-900">{policy.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{policy.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      policy.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {policy.status}
                  </span>
                </div>
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span>Quota: {policy.yearly_quota} / year · +{policy.monthly_accrual} monthly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    <span>Accrual on {policy.accrual_day}{policy.accrual_day === 1 ? 'st' : 'th'} · Max {policy.max_balance}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-orange-500" />
                    <span>
                      Carry forward:{' '}
                      {policy.carry_forward_enabled ? `Yes · ${policy.carry_forward_quarter_cap} per quarter` : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle
                      className={`w-4 h-4 ${policy.sandwich_rule_enabled ? 'text-red-500' : 'text-gray-400'}`}
                    />
                    <span>Sandwich rule: {policy.sandwich_rule_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-semibold text-gray-700">Eligibility</p>
                  {chips(policy.eligibility_departments)}
                  {chips(policy.eligibility_designations)}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <button
                    onClick={() => startEdit(policy)}
                    className="flex-1 inline-flex items-center justify-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmCopy(policy)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    title="Copy policy"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmArchive(policy)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                    title="Archive policy"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPolicy ? 'Edit Leave Policy' : 'Create Leave Policy'}
                </h2>
                <p className="text-sm text-gray-500">
                  Multi-section setup covering accrual, carry-forward, sandwich & eligibility.
                </p>
              </div>
              <button onClick={handleModalClose} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-6">
              {formSections.map((section) => (
                <div key={section.title} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-800">{section.title}</p>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                  {section.content}
                </div>
              ))}
            </form>
            <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3 justify-end">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingPolicy ? 'Update Policy' : 'Create Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmArchive && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {confirmArchive.status === 'active' ? 'Archive Policy' : 'Activate Policy'}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmArchive.status === 'active'
                ? 'Archiving will disable accruals. Employees keep existing balance.'
                : 'Activating will resume accruals for eligible employees.'}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmArchive(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleArchiveToggle}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCopy && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Copy {confirmCopy.name}?</h3>
            <p className="text-sm text-gray-600">A new inactive policy will be created with the same rules.</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmCopy(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleCopyConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Copy Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePoliciesPage;

