import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle, TrendingUp, Calendar, AlertCircle, RefreshCcw } from 'lucide-react';
import ApiService from '../services/api';
import StatsModal from './StatsModal';

const DashboardPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total_employees: 0,
    present_today: 0,
    absent_today: 0,
    on_leave: 0,
    late_arrivals: 0,
    early_departures: 0,
    changes: {
      present: 0,
      absent: 0,
      on_leave: 0,
      late_arrivals: 0,
      early_departures: 0
    }
  });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [trends, setTrends] = useState({
    average_check_in: '00:00',
    average_work_hours: 0,
    punctuality_rate: 0
  });
  const [liveActivity, setLiveActivity] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalState, setModalState] = useState({ isOpen: false, statType: null, statValue: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel
        const [statsData, deptData, trendsData, activityData] = await Promise.all([
          ApiService.getAttendanceStats(),
          ApiService.getDepartmentStats(),
          ApiService.getAttendanceTrends(),
          ApiService.getLiveActivity()
        ]);

        setStats(statsData);
        setDepartmentStats(deptData);
        setTrends(trendsData);
        setLiveActivity(activityData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Set up polling interval for live data
    const intervalId = setInterval(() => {
      fetchData();
    }, 30000); // Update every 30 seconds

    return () => clearInterval(intervalId);
  }, [refreshKey]); // Add refreshKey to dependencies to trigger refresh

  const [currentTime, setCurrentTime] = useState(new Date());

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

  const getActionBadgeColor = (action) => {
    if (action === 'Check-In') return 'bg-green-100 text-green-700';
    if (action === 'Re-Check-In') return 'bg-blue-100 text-blue-700';
    if (action === 'Check-Out') return 'bg-gray-100 text-gray-700';
    if (action === 'Early Departure') return 'bg-orange-100 text-orange-700';
    if (action === 'Break Start') return 'bg-yellow-100 text-yellow-700';
    if (action === 'Break End') return 'bg-blue-100 text-blue-700';
    return 'bg-green-100 text-green-700';
  };

  const handleStatClick = (statType, statValue) => {
    setModalState({ isOpen: true, statType, statValue });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, statType: null, statValue: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[1400px] mx-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Admin Dashboard</h1>
            <p className="text-sm text-gray-500">Real-time attendance monitoring</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">{formatTime()}</p>
            <p className="text-sm text-gray-500">{formatDate()}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('total_employees', stats.total_employees)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.total_employees}</p>
                <p className="text-xs text-gray-600">Current Count</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('present_today', stats.present_today)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Present Today</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.present_today}</p>
                <p className={`text-xs ${stats.changes.present >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.changes.present > 0 ? '+' : ''}{stats.changes.present} from yesterday
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('absent_today', stats.absent_today)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Absent</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.absent_today}</p>
                <p className={`text-xs ${stats.changes.absent <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.changes.absent > 0 ? '+' : ''}{stats.changes.absent} from yesterday
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('on_leave', stats.on_leave)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">On Leave</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.on_leave}</p>
                <p className={`text-xs ${stats.changes.on_leave >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.changes.on_leave > 0 ? '+' : ''}{stats.changes.on_leave} from yesterday
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('late_arrivals', stats.late_arrivals)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Late Arrivals</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.late_arrivals}</p>
                <p className={`text-xs ${stats.changes.late_arrivals <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.changes.late_arrivals > 0 ? '+' : ''}{stats.changes.late_arrivals} from yesterday
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStatClick('early_departures', stats.early_departures)}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Early Departures</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.early_departures}</p>
                <p className={`text-xs ${stats.changes.early_departures <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.changes.early_departures > 0 ? '+' : ''}{stats.changes.early_departures} from yesterday
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section - Live Activity & Department Attendance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Live Activity Feed */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                Live Activity Feed
              </h2>
              <button
                className="text-sm text-blue-600 hover:text-blue-700"
                onClick={() => window.location.href = '/reports'}
              >
                View All
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {liveActivity.slice(0, 8).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${activity.badgeColor} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
                      {activity.badge}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{activity.name}</p>
                      <p className="text-xs text-gray-500">{activity.time} {activity.date}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getActionBadgeColor(activity.action)}`}>
                    {activity.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Department Attendance */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Department Attendance</h2>
            <div className="space-y-4">
              {departmentStats.map((dept, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{dept.department}</span>
                    <span className="text-sm font-semibold text-gray-900">{dept.present}/{dept.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${dept.percentage}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dept.percentage}% present</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section - Attendance Trends & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Trends */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Attendance Trends</h3>
            <div className="space-y-6">
              {/* Average Check-in Time */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Average Check-in Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {trends.average_check_in && trends.average_check_in !== '00:00:00' ? new Date(`2000-01-01T${trends.average_check_in}`).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    }) : 'No Data'}
                  </p>
                </div>
                <TrendingUp className="w-7 h-7 text-green-500" />
              </div>

              {/* Average Work Hours */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Average Work Hours</p>
                  <p className="text-2xl font-semibold text-gray-900">{typeof trends.average_work_hours === 'number' && !isNaN(trends.average_work_hours) ? trends.average_work_hours.toFixed(1) : '0.0'} hrs</p>
                </div>
                <Clock className="w-7 h-7 text-blue-500" />
              </div>

              {/* Punctuality Rate */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Punctuality Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{trends.punctuality_rate}%</p>
                </div>
                <TrendingUp className="w-7 h-7 text-purple-500" />
              </div>
            </div>
          </div>


          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Manage Employees */}
              <button
                onClick={() => window.location.href = '/employees'}
                className="flex flex-col items-center justify-center p-4 border-2 border rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-all"
              >
                <Users className="w-6 h-6 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Manage Employees</span>
              </button>

              {/* View Reports */}
              <button
                onClick={() => window.location.href = '/reports'}
                className="flex flex-col items-center justify-center p-4 border-2 border rounded-lg hover:bg-green-50 hover:border-green-500 transition-all"
              >
                <TrendingUp className="w-6 h-6 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">View Reports</span>
              </button>

              {/* Manage Policies */}
              <button
                onClick={() => window.location.href = '/policies'}
                className="flex flex-col items-center justify-center p-4 border-2 border rounded-lg hover:bg-purple-50 hover:border-purple-500 transition-all"
              >
                <Clock className="w-6 h-6 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">Manage Policies</span>
              </button>

              {/* View Alerts */}
              <button
                onClick={() => handleStatClick('late_arrivals', stats.late_arrivals)}
                className="flex flex-col items-center justify-center p-4 border-2 border rounded-lg hover:bg-orange-50 hover:border-orange-500 transition-all"
              >
                <AlertCircle className="w-6 h-6 text-orange-600 mb-2" />
                <span className="text-sm font-medium text-gray-900 text-center">View Alerts</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Modal */}
        {modalState.isOpen && (
          <StatsModal
            isOpen={modalState.isOpen}
            onClose={closeModal}
            statType={modalState.statType}
            statValue={modalState.statValue}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
