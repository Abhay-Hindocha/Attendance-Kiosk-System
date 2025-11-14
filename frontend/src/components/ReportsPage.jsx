import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Clock, LogOut, Users } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

// This component is a visual refinement of the original AttendanceReportsPage
// to more closely match the provided screenshot (larger calendar tiles, compact header,
// bold month label, color legend, and card-like detailed logs with pagination).

export default function AttendanceReportsPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});


  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const startingDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

  const formatLocalYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateKey = (year, monthIndex, day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  function getStatusColor(status) {
    switch (status) {
      case 'Present': return 'bg-emerald-500 text-white';
      case 'Late Entry': return 'bg-violet-500 text-white';
      case 'Absent': return 'bg-rose-500 text-white';
      case 'Holiday': return 'bg-blue-500 text-white';
      case 'On Leave': return 'bg-amber-500 text-white';
      case 'Early Departure': return 'bg-pink-500 text-white';
      case 'Half Day': return 'bg-yellow-500 text-white';
      default: return '';
    }
  }

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
      if (data && data.length > 0) {
        setSelectedEmployee(data[0].employee_id);
      }
    } catch (err) {
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to fetch employees');
    }
  };



  const fetchAttendance = async () => {
    if (!selectedEmployee) return;
    setLoading(true); setError(null);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const data = await api.getEmployeeMonthlyAttendance(selectedEmployee, year, month);
      const recordMap = {};
      (data || []).forEach(record => {
        const dateKey = record.date;
        recordMap[dateKey] = {
          status: record.status,
          checkIn: record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          checkOut: record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          totalHours: record.total_hours || '-',
          breaks: record.breaks || [],
          holiday: record.holiday || null,
          leaveReason: record.leave_reason || null
        };
      });

      // Check for early departures
      const employee = employees.find(emp => emp.employee_id === selectedEmployee);
      if (employee && employee.policy && employee.policy.enable_early_tracking && employee.policy.work_end_time) {
        const workEndTime = employee.policy.work_end_time.substring(0, 5); // 'HH:MM'
        const gracePeriod = employee.policy.early_grace_period ?? 0;
        Object.keys(recordMap).forEach(dateKey => {
          const rec = recordMap[dateKey];
          if (rec.checkOut !== '-' && (rec.status === 'Present' || rec.status === 'Late Entry')) {
            if (rec.checkOut < workEndTime) {
              // Calculate minutes early
              const [endHour, endMinute] = workEndTime.split(':').map(Number);
              const [checkHour, checkMinute] = rec.checkOut.split(':').map(Number);
              const endMinutes = endHour * 60 + endMinute;
              const checkMinutes = checkHour * 60 + checkMinute;
              const minutesEarly = endMinutes - checkMinutes;
              if (minutesEarly > 60) {
                rec.status = 'Half Day';
              } else if (minutesEarly > gracePeriod) {
                rec.status = 'Early Departure';
              }
              // If within grace period, leave status unchanged
            }
          }
        });
      }

      setAttendanceRecords(recordMap);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);
  useEffect(() => { fetchAttendance(); }, [selectedEmployee, monthOffset]);

  useEffect(() => {
    const id = setInterval(() => { if (selectedEmployee) fetchAttendance(); }, 30000);
    return () => clearInterval(id);
  }, [selectedEmployee, monthOffset]);

  const buildCalendar = () => {
    const cells = [];
    const year = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const todayKey = formatLocalYMD(new Date());

    for (let i = 0; i < startingDay; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(year, m, d);
      const cellDate = new Date(year, m, d);
      const cellKeyISO = formatLocalYMD(cellDate);
      let rec = attendanceRecords[key];

      if (!rec) {
        const yesterdayKey = new Date(today);
        yesterdayKey.setDate(yesterdayKey.getDate() - 1);
        const yesterdayKeyStr = formatLocalYMD(yesterdayKey);
        const dayOfWeek = cellDate.getDay();
        if (cellKeyISO <= yesterdayKeyStr && selectedEmployee && dayOfWeek !== 0 && dayOfWeek !== 6) {
          rec = { status: 'Absent', checkIn: '-', checkOut: '-', totalHours: '-', holiday: null };
        }
      }

      cells.push({ day: d, key, rec, date: cellDate });
    }

    return cells;
  };

  const cells = buildCalendar();

  const allLogs = cells
    .filter(Boolean)
    .filter(c => c.rec)
    .map(c => ({ date: c.key, ...c.rec }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const pagedLogs = loading ? Array(pageSize).fill({ skeleton: true }) : allLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(allLogs.length / pageSize));

  const handleExport = async () => {
    if (!selectedEmployee) return;
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const blob = await api.exportEmployeeMonthlyAttendance(selectedEmployee, year, month);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedEmployee}-${year}-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      if (err?.response?.status === 401) navigate('/login');
      setError('Failed to export attendance records');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header (matches screenshot spacing and Export button) */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Attendance Calendar</h1>
            <p className="text-sm text-gray-500">View attendance records</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={loading || !selectedEmployee}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-64">
                <label className="text-xs text-gray-600">Select Employee</label>
                <select
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={selectedEmployee || ''}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={loading}
                >
                  {employees.map(emp => (
                    <option key={emp.employee_id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="px-4 py-2 bg-gray-100 rounded-md font-medium min-w-[180px] text-center">{monthName}</div>
                <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {error && <div className="text-rose-500 text-sm">{error}</div>}
          </div>
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="grid grid-cols-7 gap-3 text-sm font-medium text-center text-gray-500 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {/* leading placeholders */}
            {cells.slice(0, startingDay).map((_, i) => <div key={`lead-${i}`} className="aspect-square rounded-lg border border-transparent bg-gray-50" />)}

            {cells.slice(startingDay).map((c, idx) => {
              const status = c.rec?.status;
              const colorClass = getStatusColor(status);
              const isWeekend = new Date(c.key).getDay() === 0 || new Date(c.key).getDay() === 6;

              return (
                <div key={`${c.key}-${idx}`} className={`aspect-square rounded-lg ${status ? '' : isWeekend ? 'bg-gray-50' : 'bg-white border border-gray-200'}`}>
                  <div className={`${status ? colorClass : 'bg-transparent'} h-full p-3 flex flex-col justify-between rounded-lg`}>

                    {/* Day and tiny tag */}
                    <div className="flex items-start justify-between">
                      <div className={`text-sm font-semibold ${status ? 'text-white' : 'text-gray-700'}`}>{c.day}</div>
                    </div>

                    {/* Check times or reason - hidden on small screens (like screenshot) */}
                    <div className="text-xs self-start mt-2">
                      {c.rec ? (
                        <>
                          {status === 'Present' || status === 'Late Entry' || status === 'Early Departure' || status === 'Half Day' ? (
                            <>
                              <div className="flex items-center gap-1 truncate hidden md:flex">
                                <Clock className={`w-3 h-3 ${status ? 'text-white' : 'text-gray-500'}`} />
                                <span className={`${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.checkIn}</span>
                              </div>
                              <div className="flex items-center gap-1 truncate mt-1 hidden md:flex">
                                <LogOut className={`w-3 h-3 ${status ? 'text-white' : 'text-gray-500'}`} />
                                <span className={`${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.checkOut}</span>
                              </div>
                            </>
                          ) : status === 'Holiday' ? (
                            <div className="truncate">
                              <span className={`font-semibold ${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.holiday?.name || 'Holiday'}</span>
                            </div>
                          ) : status === 'On Leave' ? (
                            <div className="truncate">
                              <span className={`${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.leaveReason || 'On Leave'}</span>
                            </div>
                          ) : (
                            <div className="text-gray-300">&nbsp;</div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-300">&nbsp;</div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /> Present</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-violet-500" /> Late Entry</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500" /> Absent</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500" /> Holiday</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500" /> On Leave</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-pink-500" /> Early Departure</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500" /> Half Day</div>
          </div>
        </div>

        {/* Detailed Attendance Logs */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5" /> Detailed Attendance Logs</h2>
            <div className="text-sm text-gray-500">Showing {allLogs.length} records</div>
          </div>

          <div className="space-y-4">
            {pagedLogs.map((log, i) => (
              <div key={log.skeleton ? i : log.date} className="rounded-lg border p-4">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  {log.skeleton ? (
                    <>
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-2"></div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                            <div>
                              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-semibold">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
                          <div className={`text-[12px] px-3 py-1 rounded-full ${log.status === 'Present' ? 'bg-green-100 text-green-800' :
                            log.status === 'Absent' ? 'bg-red-100 text-red-800' :
                              log.status === 'Late Entry' ? 'bg-purple-100 text-purple-800' :
                                log.status === 'Early Departure' ? 'bg-pink-100 text-pink-800' :
                                  log.status === 'Holiday' ? 'bg-blue-100 text-blue-800' :
                                    log.status === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                                      log.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                            }`}>{log.status}</div>
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{employees.find(emp => emp.employee_id === selectedEmployee)?.policy?.name || 'No Policy'}</div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">Check-In</div>
                            <div className="text-sm text-gray-600">{log.checkIn}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <LogOut className="w-5 h-5 text-red-500" />
                          <div>
                            <div className="text-sm font-medium">Check-Out</div>
                            <div className="text-sm text-gray-600">{log.checkOut}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium">Total Duration</div>
                            <div className="text-sm text-gray-600">{log.totalHours}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <Users className="w-5 h-5 text-orange-500" />
                          <div>
                            <div className="text-sm font-medium">Breaks</div>
                            <div className="text-sm text-gray-600">{Array.isArray(log.breaks) ? log.breaks.length : (log.breaks || 0)} times</div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {log.breaks && log.breaks.length > 0 && (
                  <>
                    <hr className="my-4 border-gray-200" />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Break Details</h4>
                      {log.breaks.map((b, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-500" />
                            <span className="font-medium">In:</span>
                            <span className="text-gray-600">{b.in_time ? new Date(b.in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <LogOut className="w-4 h-4 text-red-500" />
                            <span className="font-medium">Out:</span>
                            <span className="text-gray-600">{b.out_time ? new Date(b.out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, allLogs.length)} of {allLogs.length} records</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 rounded border">Previous</button>
              <div className="px-3 py-1 border rounded">{page}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 rounded border">Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
