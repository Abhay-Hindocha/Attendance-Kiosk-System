import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Calendar, AlertCircle, Users, TrendingUp, User } from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useEmployeePortal } from './EmployeeLayout';

const statusColorMap = {
  present: 'text-green-600 bg-green-50',
  absent: 'text-red-600 bg-red-50',
  late: 'text-amber-600 bg-amber-50',
  default: 'text-gray-600 bg-gray-100',
};

const EmployeeDashboardPage = () => {
  const { profile } = useEmployeePortal();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

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
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatWeeklyHours = (hours) => {
    if (!hours || hours === 0) return '0 h 0 min';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const min = totalMinutes % 60;
    return `${h} h ${min} min`;
  };

  const formatLeaveDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Preparing your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 text-sm text-red-600 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  const statusClass = statusColorMap[data?.today?.status] || statusColorMap.default;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Employee Dashboard</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Welcome back, {profile?.name}</p>
          </div>
          <div className="text-left md:text-right">
            <div className="text-xl md:text-2xl font-bold text-gray-900">{formatTime()}</div>
            <div className="text-xs md:text-sm text-gray-600">{formatDate()}</div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Today's Attendance Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data?.today?.status || 'Pending'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-gray-600">
                    {data?.today?.check_in ? 'Checked In' : 'Not Checked In'}
                  </span>
                </div>
              </div>
              <div className="bg-green-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Hours worked this week</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatWeeklyHours(data?.weekly_hours)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-gray-600">Current week hours</span>
                </div>
              </div>
              <div className="bg-blue-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Pending Leave Requests</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{data?.pending_leaves?.length ?? 0}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-gray-600">Awaiting Approval</span>
                </div>
              </div>
              <div className="bg-yellow-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Profile Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-2 capitalize">{profile?.status || 'Active'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-medium text-gray-600">{profile?.designation}</span>
                </div>
              </div>
              <div className="bg-purple-500 w-12 h-12 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Last 5 Check-ins & Pending Leaves */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-8">
          {/* Last 5 Activities */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                Recent Activities
              </h2>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {data?.last_check_ins?.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{profile?.name || 'You'}</p>
                    <p className="text-xs text-gray-500">{new Date(activity.time).toLocaleString()}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    activity.action === 'Check-In' ? 'bg-green-100 text-green-700' :
                    activity.action === 'Check-Out' ? 'bg-gray-100 text-gray-700' :
                    activity.action === 'Break Start' ? 'bg-yellow-100 text-yellow-700' :
                    activity.action === 'Break End' ? 'bg-blue-100 text-blue-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {activity.action}
                  </span>
                </div>
              ))}
              {(!data?.last_check_ins || data.last_check_ins.length === 0) && (
                <p className="text-xs text-gray-500">No recent activities yet.</p>
              )}
            </div>
          </div>

          {/* Pending Leaves */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Pending Leave Requests</h2>
            <div className="space-y-4">
              {data?.pending_leaves?.map((leave) => (
                <div key={leave.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {leave.policy_name || 'Leave'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatLeaveDate(leave.from_date)} → {formatLeaveDate(leave.to_date)} - {leave.days} day{leave.days > 1 ? 's' : ''}
                  </p>
                </div>
              ))}
              {(!data?.pending_leaves || data.pending_leaves.length === 0) && (
                <p className="text-xs text-gray-500">You have no pending leave requests.</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Section - Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/employee/leaves')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <Calendar className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">Leave Dashboard</p>
            </button>
            <button
              onClick={() => navigate('/employee/attendance')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
            >
              <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">View My Attendance Report</p>
            </button>
            <button
              onClick={() => navigate('/employee/profile')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
            >
              <User className="w-6 h-6 text-purple-600 mb-2" />
              <p className="text-sm font-medium text-gray-900">My Profile</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboardPage;

