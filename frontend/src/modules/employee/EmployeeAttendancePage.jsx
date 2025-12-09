import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock, LogOut, Download } from 'lucide-react';
import employeeApi from '../../services/employeeApi';
import { useNavigate } from 'react-router-dom';

export default function EmployeeAttendancePage() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleDownload = async () => {
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const startDate = formatDateKey(year, month - 1, 1);
      const endDate = formatDateKey(year, month - 1, daysInMonth);
      const blob = await employeeApi.exportAttendanceReport({ start_date: startDate, end_date: endDate });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      setError('Failed to download attendance report');
    }
  };

  const monthDate = new Date(selectedYear, selectedMonth, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const startingDay = new Date(selectedYear, selectedMonth, 1).getDay();

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

  const fetchAttendance = async () => {
    setLoading(true); setError(null);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const startDate = formatDateKey(year, month - 1, 1);
      const endDate = formatDateKey(year, month - 1, daysInMonth);
      const data = await employeeApi.getAttendanceReport({ start_date: startDate, end_date: endDate });
      const recordMap = {};
      (data.records || []).forEach(record => {
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

  useEffect(() => { fetchAttendance(); }, [selectedYear, selectedMonth]);

  useEffect(() => {
    const id = setInterval(() => { fetchAttendance(); }, 30000);
    return () => clearInterval(id);
  }, [selectedYear, selectedMonth]);

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
        if (cellKeyISO <= yesterdayKeyStr && dayOfWeek !== 0 && dayOfWeek !== 6) {
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="p-3 space-y-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Attendance Calendar</h1>
            <p className="text-md text-gray-500">View your attendance records</p>
          </div>
        </div>

        {/* Controls and Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button onClick={handlePreviousMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-bold text-gray-900 text-center">{monthName}</h2>
              <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto">
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>

          {error && <div className="text-rose-500 text-sm">{error}</div>}

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
            {cells.slice(0, startingDay).map((_, i) => <div key={`lead-${i}`} className="aspect-square" />)}

            {cells.slice(startingDay).map((c, idx) => {
              const status = c.rec?.status;
              const colorClass = getStatusColor(status);
              const isWeekend = new Date(c.key).getDay() === 0 || new Date(c.key).getDay() === 6;

              return (
                <div key={`${c.key}-${idx}`} className={`aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all hover:shadow-md ${status ? colorClass : isWeekend ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-200'}`}>
                  <div className="h-full flex flex-col">

                    {/* Day */}
                    <span className={`text-sm font-semibold mb-1 ${status ? 'text-white' : 'text-gray-700'}`}>{c.day}</span>

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
          <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-gray-200 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 md:gap-4">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-green-500 rounded"></div><span className="text-sm text-gray-700">Present</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-yellow-500 rounded"></div><span className="text-sm text-gray-700">Half Day</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-500 rounded"></div><span className="text-sm text-gray-700">Absent</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-500 rounded"></div><span className="text-sm text-gray-700">Holiday</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-orange-500 rounded"></div><span className="text-sm text-gray-700">On Leave</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-purple-500 rounded"></div><span className="text-sm text-gray-700">Late Arrival</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-pink-500 rounded"></div><span className="text-sm text-gray-700">Early Departure</span></div>
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
                          <span className="text-gray-700">Start: {b.break_start ? new Date(b.break_start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                          <span className="text-gray-700">End: {b.break_end ? new Date(b.break_end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 gap-4">
            <p className="text-sm text-gray-600">Showing {pagedLogs.length} of {allLogs.length} records</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}>Previous</button>
              <button className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">{page}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className={`px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}>Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

