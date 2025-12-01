import React, { useEffect, useState } from 'react';
import { CalendarRange, RefreshCw } from 'lucide-react';
import employeeApi from '../../services/employeeApi';

const EmployeeAttendancePage = () => {
  const [range, setRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end_date: new Date().toISOString().slice(0, 10),
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await employeeApi.getAttendanceReport(range);
      setData(response);
    } catch (err) {
      setError(err?.message || 'Unable to load attendance report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (key, value) => {
    setRange((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-indigo-500" />
              Attendance Report
            </h2>
            <p className="text-sm text-gray-500">Download-ready snapshot of your attendance window.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              className="px-4 py-2.5 border border-gray-300 rounded-xl"
              value={range.start_date}
              onChange={(e) => handleRangeChange('start_date', e.target.value)}
            />
            <input
              type="date"
              className="px-4 py-2.5 border border-gray-300 rounded-xl"
              value={range.end_date}
              onChange={(e) => handleRangeChange('end_date', e.target.value)}
            />
            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-2xl shadow p-6 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading records...</p>
        </div>
      ) : (
        data && (
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm text-gray-600">
                Range: {data.range.start} → {data.range.end}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm">
                <p>
                  Present:{' '}
                  <span className="font-semibold text-green-600">{data.summary.present}</span>
                </p>
                <p>
                  Absent:{' '}
                  <span className="font-semibold text-red-600">{data.summary.absent}</span>
                </p>
                <p>
                  Late:{' '}
                  <span className="font-semibold text-amber-600">{data.summary.late}</span>
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Date</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Check In</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Check Out</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.records.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-2">{record.date}</td>
                      <td className="px-4 py-2">{record.check_in ? new Date(record.check_in).toLocaleTimeString() : '-'}</td>
                      <td className="px-4 py-2">{record.check_out ? new Date(record.check_out).toLocaleTimeString() : '-'}</td>
                      <td className="px-4 py-2 capitalize">{record.status}</td>
                    </tr>
                  ))}
                  {data.records.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                        No attendance records in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default EmployeeAttendancePage;

