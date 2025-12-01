import React from 'react';
import { useEmployeePortal } from './EmployeeLayout';

const EmployeeProfilePage = () => {
  const { profile, refreshProfile } = useEmployeePortal();

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Employee</p>
            <h2 className="text-2xl font-semibold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.employee_id}</p>
          </div>
          <button
            onClick={refreshProfile}
            className="px-4 py-2 rounded-full text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 text-sm">
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900">{profile.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-medium text-gray-900">{profile.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-500">Department</p>
            <p className="font-medium text-gray-900">{profile.department || 'General'}</p>
          </div>
          <div>
            <p className="text-gray-500">Designation</p>
            <p className="font-medium text-gray-900">{profile.designation || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Join Date</p>
            <p className="font-medium text-gray-900">{profile.join_date || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500">Portal Role</p>
            <p className="font-medium text-gray-900 capitalize">{profile.portal_role || 'employee'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Leave Policies</h3>
        <div className="flex flex-wrap gap-2">
          {profile.leave_policies?.map((policy) => (
            <div key={policy.id} className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{policy.name}</p>
              <p className="text-xs text-gray-500">{policy.yearly_quota} days/year · sandwich {policy.sandwich_rule_enabled ? 'on' : 'off'}</p>
            </div>
          ))}
          {(!profile.leave_policies || profile.leave_policies.length === 0) && (
            <p className="text-sm text-gray-500">No leave policies assigned.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfilePage;

