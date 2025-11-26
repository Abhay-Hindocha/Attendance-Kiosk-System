import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Clock,
  TrendingUp,
  Mail,
  Phone,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import ApiService from '../services/api';

// Helper: format time to "09:55 AM"
const formatTimeTo12Hour = (timeStr) => {
  if (!timeStr) return 'N/A';

  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;

  const hh = String(hour12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');

  return `${hh}:${mm} ${period}`;
};

// Helper: format minutes like "45 mins", "1 hr", "1 hr 15 mins"
const formatDurationFromMinutes = (rawMinutes) => {
  if (rawMinutes == null) return 'N/A';

  const minutes = Math.abs(Number(rawMinutes)); // remove minus sign if any
  if (Number.isNaN(minutes)) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (mins > 0) parts.push(`${mins} min${mins > 1 ? 's' : ''}`);

  if (parts.length === 0) return '0 mins';
  return parts.join(' ');
};

// Helper: recursively search any field whose key contains "email" or "mail"
const findEmailRecursively = (obj) => {
  if (!obj || typeof obj !== 'object') return null;

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (
      typeof value === 'string' &&
      value.trim() !== '' &&
      (lowerKey.includes('email') || lowerKey.includes('mail'))
    ) {
      return value;
    }

    if (value && typeof value === 'object') {
      const nested = findEmailRecursively(value);
      if (nested) return nested;
    }
  }

  return null;
};

// Main resolver: first try some common fields, then fallback to deep search
const resolveEmail = (item) => {
  const direct =
    item.email ||
    item.mail ||
    item.employee_email ||
    item.employee_mail ||
    item.work_email ||
    item.work_mail ||
    item.office_email ||
    item.office_mail ||
    item.employee?.email ||
    item.employee?.mail ||
    item.employee?.work_email ||
    item.employee?.work_mail ||
    item.employee?.official_email ||
    item.employee?.official_mail ||
    item.user?.email ||
    item.user?.mail;

  if (direct && direct.trim() !== '') return direct;

  const fromDeepSearch = findEmailRecursively(item);
  return fromDeepSearch || 'N/A';
};

const StatsModal = ({ isOpen, onClose, statType, statValue }) => {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && statType) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, statType]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let res;
      switch (statType) {
        case 'total_employees':
          res = await ApiService.getEmployees();
          break;
        case 'present_today':
          res = await ApiService.getPresentToday();
          break;
        case 'absent_today':
          res = await ApiService.getAbsentToday();
          break;
        case 'on_leave':
          res = await ApiService.getOnLeaveToday();
          break;
        case 'late_arrivals':
          res = await ApiService.getLateArrivalsToday();
          break;
        case 'early_departures':
          res = await ApiService.getEarlyDeparturesToday();
          break;
        default:
          res = [];
      }
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const getHeaderTitle = () => {
    switch (statType) {
      case 'total_employees':
        return 'All Employees';
      case 'present_today':
        return 'Employees Present Today';
      case 'absent_today':
        return 'Employees Absent Today';
      case 'on_leave':
        return 'Employees On Leave';
      case 'late_arrivals':
        return 'Late Arrivals Today';
      case 'early_departures':
        return 'Early Departures Today';
      default:
        return 'Details';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'N/A';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* flex-col so header + body + footer stack and body scrolls */}
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* HEADER */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex items-center justify-between z-10 rounded-t-2xl">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">
              {getHeaderTitle()}
            </h2>
            <p className="text-sm md:text-base text-gray-600 mt-1">
              {statValue} records
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {isLoading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!isLoading && !error && data.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available</p>
            </div>
          )}

          {!isLoading && !error && data.length > 0 && (
            <div className="space-y-3">
              {data.map((item, idx) => {
                const name =
                  item.name ||
                  item.employee?.name ||
                  `Employee ${item.employee_id || item.id}`;
                const department =
                  item.department || item.employee?.department || 'N/A';

                const email = resolveEmail(item);
                const phone =
                  item.phone ||
                  item.employee?.phone ||
                  item.user?.phone ||
                  'N/A';

                const checkIn =
                  item.check_in_time || item.employee?.check_in_time;
                const checkOut =
                  item.check_out_time || item.employee?.check_out_time;
                const earlyMinutes =
                  item.early_minutes ?? item.employee?.early_minutes ?? null;
                const lateMinutes =
                  item.late_minutes ?? item.employee?.late_minutes ?? null;

                const leaveType =
                  item.leave_type ||
                  item.leave_reason ||
                  item.type ||
                  'On Leave';
                const leaveDays =
                  item.leave_days || item.duration_days || item.days || null;
                const absentReason =
                  item.reason || item.absence_reason || 'No show';

                const employmentStatusRaw =
                  item.employment_status || item.status || '';
                const employmentStatus = employmentStatusRaw.toLowerCase();

                let statusLabel = 'Active';
                let statusClasses = 'bg-green-100 text-green-700';

                if (employmentStatus.includes('leave')) {
                  statusLabel = 'On Leave';
                  statusClasses = 'bg-blue-100 text-blue-700';
                } else if (
                  employmentStatus.includes('inactive') ||
                  employmentStatus.includes('not_active') ||
                  employmentStatus.includes('terminated')
                ) {
                  statusLabel = 'Not Active';
                  statusClasses = 'bg-gray-200 text-gray-700';
                } else if (employmentStatus === '') {
                  statusLabel = 'Active';
                  statusClasses = 'bg-green-100 text-green-700';
                }

                // PRESENT TODAY
                if (statType === 'present_today') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-[14px] h-[14px]" />
                              <span>{phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="w-[14px] h-[14px]" />
                              <span>
                                Check-in: {formatTimeTo12Hour(checkIn)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // EARLY DEPARTURES
                if (statType === 'early_departures') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="w-[14px] h-[14px]" />
                              <span>
                                Check-out: {formatTimeTo12Hour(checkOut)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-purple-600">
                              <AlertCircle className="w-[14px] h-[14px]" />
                              <span>
                                Early by:{' '}
                                {formatDurationFromMinutes(earlyMinutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ON LEAVE
                if (statType === 'on_leave') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span>{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-blue-600">
                              <MapPin className="w-[14px] h-[14px]" />
                              <span>
                                {leaveType}
                                {leaveDays != null
                                  ? ` (${leaveDays} day${
                                      leaveDays === 1 ? '' : 's'
                                    })`
                                  : ''}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // LATE ARRIVALS
                if (statType === 'late_arrivals') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Clock className="w-[14px] h-[14px]" />
                              <span>
                                Check-in: {formatTimeTo12Hour(checkIn)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-orange-600">
                              <AlertCircle className="w-[14px] h-[14px]" />
                              <span>
                                Late by:{' '}
                                {formatDurationFromMinutes(lateMinutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ABSENT TODAY
                if (statType === 'absent_today') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-[14px] h-[14px]" />
                              <span>{phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-red-600">
                              <AlertCircle className="w-[14px] h-[14px]" />
                              <span>Reason: {absentReason}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // TOTAL EMPLOYEES
                if (statType === 'total_employees') {
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                              {getInitials(name)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {name}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {department}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="w-[14px] h-[14px]" />
                              <span className="truncate">{email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Phone className="w-[14px] h-[14px]" />
                              <span>{phone}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${statusClasses}`}
                              >
                                {statusLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Fallback
                return (
                  <div
                    key={idx}
                    className="bg-gray-50 rounded-2xl p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {getInitials(name)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {department}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Mail className="w-[14px] h-[14px]" />
                            <span className="truncate">{email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <Phone className="w-[14px] h-[14px]" />
                            <span>{phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 p-4 md:p-6 flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={() => (window.location.href = '/employees')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            Manage Employees
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
