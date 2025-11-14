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
      case 'Present': return 'bg-green-500 text-white';
      case 'Late Arrival': return 'bg-purple-500 text-white';
      case 'Absent': return 'bg-red-500 text-white';
      case 'Holiday': return 'bg-blue-500 text-white';
      case 'On Leave': return 'bg-orange-500 text-white';
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Employee</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedEmployee || ''}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                disabled={loading}
              >
                {employees.map(emp => (
                  <option key={emp.employee_id} value={emp.employee_id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => setMonthOffset(m => m - 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg md:text-xl font-bold text-gray-900 text-center">{monthName}</h2>
              <button onClick={() => setMonthOffset(m => m + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1"></div>
          </div>

          {error && <div className="text-rose-500 text-sm">{error}</div>}
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Sun</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Mon</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Tue</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Wed</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Thu</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Fri</div>
            <div className="text-center font-semibold text-gray-700 text-sm py-2">Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {/* leading placeholders */}
            {cells.slice(0, startingDay).map((_, i) => <div key={`lead-${i}`} className="aspect-square rounded-lg border border-transparent bg-gray-50" />)}

            {cells.slice(startingDay).map((c, idx) => {
              const status = c.rec?.status;
              const colorClass = getStatusColor(status);
              const isWeekend = new Date(c.key).getDay() === 0 || new Date(c.key).getDay() === 6;

              return (
                <div key={`${c.key}-${idx}`} className={`aspect-square rounded-lg border-2 p-2 cursor-pointer transition-all hover:shadow-md ${status ? colorClass : isWeekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                  <div className="h-full flex flex-col">

                    {/* Day */}
                    <div className="mb-1">
                      <div className={`text-sm font-semibold ${status ? 'text-white' : 'text-gray-700'}`}>{c.day}</div>
                    </div>

                    {/* Status details */}
                    <div className="flex-1 flex flex-col justify-center text-xs">
                      {c.rec ? (
                        <>
                          {status === 'Holiday' ? (
                            <span className={`font-medium ${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.holiday?.name || 'Holiday'}</span>
                          ) : status === 'On Leave' ? (
                            <span className={`font-medium ${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.leaveReason || 'Leave'}</span>
                          ) : status === 'Present' || status === 'Late Arrival' || status === 'Early Departure' || status === 'Half Day' ? (
                            <>
                              <span className={`${status ? 'text-white' : 'text-gray-700'}`}>In: {c.rec.checkIn}</span>
                              <span className={`${status ? 'text-white' : 'text-gray-700'}`}>Out: {c.rec.checkOut}</span>
                            </>
                          ) : (
                            <span>&nbsp;</span>
                          )}
                        </>
                      ) : (
                        <span>&nbsp;</span>
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2"><Calendar className="w-5 h-5" /> Detailed Attendance Logs</h2>

          <div className="space-y-4">
            {pagedLogs.map((log, i) => (
              <div key={log.skeleton ? i : log.date} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  {log.skeleton ? (
                    <>
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse mt-2"></div>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(n => (
                          <div key={n} className="flex items-start gap-3">
                            <div className="w-5 h-5 bg-gray-200 rounded animate-pulse mt-1"></div>
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
                        <p className="text-lg font-semibold text-gray-900">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <p className="text-sm text-gray-600">{employees.find(emp => emp.employee_id === selectedEmployee)?.policy?.name || 'No Policy'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${log.status === 'Present' ? 'bg-green-100 text-green-700' :
                        log.status === 'Absent' ? 'bg-red-100 text-red-800' :
                          log.status === 'Late Arrival' ? 'bg-purple-100 text-purple-800' :
                            log.status === 'Early Departure' ? 'bg-pink-100 text-pink-800' :
                              log.status === 'Holiday' ? 'bg-blue-100 text-blue-800' :
                                log.status === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                                  log.status === 'Half Day' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>{log.status}</span>
                    </>
                  )}
                </div>

                {!log.skeleton && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Check-In</p>
                        <p className="text-base font-semibold text-gray-900">{log.checkIn}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <LogOut className="w-5 h-5 text-red-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Check-Out</p>
                        <p className="text-base font-semibold text-gray-900">{log.checkOut}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Total Duration</p>
                        <p className="text-base font-semibold text-gray-900">{log.totalHours}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-purple-600 mt-1" />
                      <div>
                        <p className="text-xs text-gray-600">Re-entries</p>
                        <p className="text-base font-semibold text-gray-900">{Array.isArray(log.breaks) ? log.breaks.length : (log.breaks || 0)} times</p>
                      </div>
                    </div>
                  </div>
                )}

                {log.breaks && log.breaks.length > 0 && (
                  <>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">Break Details:</p>
                      {log.breaks.map((b, idx) => (
                        <div key={idx} className="flex gap-4 text-sm">
                          <span className="text-gray-700">Out: {b.out_time ? new Date(b.out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                          <span className="text-gray-700">In: {b.in_time ? new Date(b.in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">Showing {pagedLogs.length} of {allLogs.length} records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Previous</button>
              <button className={`px-4 py-2 rounded-lg text-sm font-medium ${page === 1 ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors'}`}>1</button>
              {totalPages > 1 && <button className={`px-4 py-2 rounded-lg text-sm font-medium ${page === 2 ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors'}`}>2</button>}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
