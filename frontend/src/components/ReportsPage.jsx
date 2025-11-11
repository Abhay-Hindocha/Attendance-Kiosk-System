import React, { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Download, Clock, LogOut, Users, RefreshCcw } from 'lucide-react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function AttendanceReportsPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, positive/negative for navigation
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [refreshKey, setRefreshKey] = useState(0);

  // Utilities
  const monthDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const startingDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay();

  const formatYMD = (d) => d.toISOString().split('T')[0];

  const formatLocalYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateKey = (year, monthIndex, day) => `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  function getStatusColor(status) {
    switch (status) {
      case 'Present':
        return 'bg-emerald-500 text-white';
      case 'Late Entry':
        return 'bg-violet-500 text-white';
      case 'Absent':
        return 'bg-rose-500 text-white';
      case 'Holiday':
        return 'bg-blue-500 text-white';
      case 'On Leave':
        return 'bg-amber-500 text-white';
      case 'Late Departure':
        return 'bg-pink-500 text-white';
      default:
        return '';
    }
  }

  // Fetch functions
  const fetchEmployees = async () => {
    try {
      const data = await api.getEmployees();
      setEmployees(data || []);
      if (data && data.length > 0) {
        setSelectedEmployee(data[0].employee_id);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setError('Failed to fetch employees');
    }
  };

  const fetchAttendance = async () => {
    if (!selectedEmployee) return;

    setLoading(true);
    setError(null);
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      console.log('Fetching attendance for employee:', selectedEmployee, 'year:', year, 'month:', month);
      const data = await api.getEmployeeMonthlyAttendance(selectedEmployee, year, month);
      console.log('API response data:', data);

      // Convert array of records to object with date as key
      const recordMap = {};
      data.forEach(record => {
        const dateKey = record.date;
        recordMap[dateKey] = {
          status: record.status,
          checkIn: record.check_in ? new Date(record.check_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          checkOut: record.check_out ? new Date(record.check_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-',
          totalHours: record.total_hours || '-',
          breaks: record.breaks || 0,
          holiday: record.holiday
        };
      });
      console.log('Processed recordMap:', recordMap);
      setAttendanceRecords(recordMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setError('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedEmployee) return;
    
    try {
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth() + 1;
      const blob = await api.exportEmployeeMonthlyAttendance(selectedEmployee, year, month);
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-${selectedEmployee}-${year}-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      }
      setError('Failed to export attendance records');
    }
  };

  const calculateTotalHours = (checkIn, checkOut) => {
    const diff = checkOut - checkIn;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Effects
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedEmployee, monthOffset, refreshKey]);

  // Set up polling interval for live data
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (selectedEmployee) {
        fetchAttendance();
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(intervalId);
  }, [selectedEmployee, monthOffset]);

  // Build calendar cells
  const buildCalendar = () => {
    const cells = [];
    const year = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const todayKey = formatLocalYMD(new Date());

    // empty leading cells
    for (let i = 0; i < startingDay; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const key = formatDateKey(year, m, d);
      const cellDate = new Date(year, m, d);
      const cellKeyISO = formatLocalYMD(cellDate);
      let rec = attendanceRecords[key];

      if (!rec) {
        // Only mark as absent if no attendance record and no holiday, and it's past (till one day behind), and not a weekend
        const yesterdayKey = new Date(today);
        yesterdayKey.setDate(yesterdayKey.getDate() - 1);
        const yesterdayKeyStr = formatLocalYMD(yesterdayKey);
        const dayOfWeek = cellDate.getDay(); // 0 = Sunday, 6 = Saturday
        if (cellKeyISO <= yesterdayKeyStr && selectedEmployee && dayOfWeek !== 0 && dayOfWeek !== 6) {
          rec = { status: 'Absent', checkIn: '-', checkOut: '-', totalHours: '-', holiday: null };
        }
      }

      cells.push({ day: d, key, rec, date: cellDate });
    }

    return cells;
  };

  const cells = buildCalendar();

  // Detailed logs come from real attendance records
  const allLogs = Object.entries(cells)
    .map(([i, c]) => c)
    .filter(Boolean)
    .filter(c => c.rec) // Only show days with records
    .map(c => ({ date: c.key, ...c.rec }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const pagedLogs = loading 
    ? Array(pageSize).fill({ skeleton: true }) 
    : allLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(allLogs.length / pageSize));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-800">Attendance Calendar</h1>
            <p className="text-sm text-gray-500">View and manage attendance records</p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:bg-blue-700 transition-colors font-medium text-sm"
              onClick={handleExport}
              disabled={loading || !selectedEmployee}
            >
              <Download className="w-4 h-4" /> 
              {loading ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative w-56">
                <label className="text-xs text-gray-600">Select Employee</label>
                <select
                  className="w-full border rounded-md px-3 py-2 mt-1 appearance-none bg-white pr-8"
                  value={selectedEmployee || ''}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  disabled={loading}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.employee_id}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-[60%] transform -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMonthOffset(monthOffset - 1)} 
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                  disabled={loading}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-medium min-w-[140px] text-center">{monthName}</div>
                <button 
                  onClick={() => setMonthOffset(monthOffset + 1)} 
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                  disabled={loading}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(prev => prev + 1)}
                className="px-3 py-2 rounded-lg bg-gray-100 flex items-center gap-2 disabled:opacity-50 text-gray-700 hover:bg-gray-200"
                disabled={loading}
              >
                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </button>
              {error && (
                <div className="text-rose-500 text-sm">{error}</div>
              )}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="grid grid-cols-7 gap-3 text-sm font-medium text-center text-gray-500 mb-4">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-3">
            {/* leading blanks */}
            {cells.slice(0, startingDay).map((_, i) => <div key={"lead-"+i} className="aspect-square rounded border border-transparent" />)}

            {cells.slice(startingDay).map((c, idx) => {
              const status = c.rec?.status;
              const colorClass = getStatusColor(status);
              const isWeekend = new Date(c.key).getDay() === 0 || new Date(c.key).getDay() === 6;

              return (
                <div key={c.key + '-' + idx} className={`aspect-square rounded-lg ${status ? '' : isWeekend ? 'bg-gray-50' : 'bg-white border border-gray-200'}`}>
                  <div className={`${status ? colorClass : 'bg-transparent'} h-full p-2 flex flex-col`}>
                    <div className="text-xs self-start">
                      {c.rec ? (
                        <>
                          <div className="flex items-center gap-1 truncate">
                            <Clock className={`w-3 h-3 ${status ? 'text-white' : 'text-gray-500'}`} />
                            <span className={`${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.checkIn}</span>
                          </div>
                          <div className="flex items-center gap-1 truncate mt-1">
                            <LogOut className={`w-3 h-3 ${status ? 'text-white' : 'text-gray-500'}`} />
                            <span className={`${status ? 'text-white' : 'text-gray-700'}`}>{c.rec.checkOut}</span>
                          </div>
                          {c.rec.totalHours && c.rec.totalHours !== '-' && (
                            <div className={`text-[10px] mt-1 ${status ? 'text-white opacity-75' : 'text-gray-500'}`}>
                              Total: {c.rec.totalHours}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-300">&nbsp;</div>
                      )}
                    </div>

                    <div className="flex justify-between items-start mt-auto">
                      <div className={`text-sm font-medium ${status ? 'text-white' : 'text-gray-700'}`}>{c.day}</div>
                      {status && (
                        <div className={`text-[10px] px-1.5 py-0.5 rounded-sm bg-opacity-20 bg-white text-white`}>
                          {c.rec.holiday ? c.rec.holiday.name : status}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

            {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-6 text-sm text-gray-600">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500"/> Present</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-violet-500"/> Late Entry</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-rose-500"/> Absent</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-500"/> Holiday</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-500"/> On Leave</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-pink-500"/> Late Departure</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-300"/> Early Departure</div>
          </div>
        </div>

        {/* Detailed Attendance Logs */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2"><Calendar className="w-5 h-5"/> Detailed Attendance Logs</h2>
            <div className="text-sm text-gray-500">Showing {allLogs.length} records</div>
          </div>

          <div className="space-y-4">
            {pagedLogs.map((log, i) => (
              <div key={log.skeleton ? i : log.date} className="rounded-lg border p-4 flex flex-col md:flex-row justify-between gap-4">
                {log.skeleton ? (
                  // Skeleton loading state
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
                        <div className="text-sm font-semibold">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric'})}</div>
                        <div className={`text-[12px] px-3 py-1 rounded-full ${
                          log.status === 'Present' ? 'bg-green-100 text-green-800' : 
                          log.status === 'Absent' ? 'bg-red-100 text-red-800' : 
                          log.status === 'Late Entry' ? 'bg-purple-100 text-purple-800' :
                          log.status === 'Late Departure' ? 'bg-pink-100 text-pink-800' :
                          log.status === 'Holiday' ? 'bg-blue-100 text-blue-800' :
                          log.status === 'On Leave' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{log.status}</div>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">Employee Policy</div>
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
                          <div className="text-sm text-gray-600">{log.breaks || '0'} times</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-500">Showing {(page-1)*pageSize + 1} - {Math.min(page*pageSize, allLogs.length)} of {allLogs.length} records</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 rounded border">Previous</button>
              <div className="px-3 py-1 border rounded">{page}</div>
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1 rounded border">Next</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
