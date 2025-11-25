import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Camera, X, Mail, Phone, User, CheckCircle, XCircle, Filter, Download, Play, Square, Briefcase, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import ApiService from '../services/api';

/**
 * Employees Page with post-create "Employee Added" prompt and
 * a 3-step Face Enrollment Wizard that matches the provided screenshots.
 */
const EmployeesPage = ({registerCleanup}) => {
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    policyId: '',
    joinDate: '',
    status: 'active'
  });
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loading, setLoading] = useState(true);

  // Face enrollment related
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const modelsLoadingRef = useRef(false);

  const [showAddedModal, setShowAddedModal] = useState(false); // "Employee Added" modal
  const [newlyCreatedEmployee, setNewlyCreatedEmployee] = useState(null);
  const [showUpdatedModal, setShowUpdatedModal] = useState(false); // "Employee Updated" modal
  const [updatedEmployee, setUpdatedEmployee] = useState(null);

  const [showWizard, setShowWizard] = useState(false); // face wizard wrapper
  const [wizardStep, setWizardStep] = useState(0); // 0=intro, 1=capture, 2=processing, 3=success
  const [enrollingEmployee, setEnrollingEmployee] = useState(null);

  const [faceStatus, setFaceStatus] = useState('');
  const [detectionMethod, setDetectionMethod] = useState('ssdMobilenetv1');
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const capturedDescriptorsRef = useRef([]);
  const [capturedImages, setCapturedImages] = useState([]);
  const capturedImagesRef = useRef([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const isCapturingRef = useRef(false);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const processingStartedRef = useRef(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const samplesRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [employeesData, policiesData] = await Promise.all([
          ApiService.getEmployees(),
          ApiService.getPolicies()
        ]);
        setEmployees(employeesData);
        setPolicies(policiesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // Register cleanup function on unmount or route change
    if (registerCleanup) {
      registerCleanup(() => {
        stopVideo();
      });
    }

    return () => {
      stopVideo();
    };
  }, []);

  // lazy model loader (call when opening the wizard)
  const loadModels = async () => {
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
      await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
      await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
      setModelsLoaded(true);
    } catch (error) {
      console.error('Failed to load face-api models:', error);
      throw error;
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase();
  const getAvatarColor = () => 'bg-gradient-to-br from-blue-500 to-purple-500';

  const resetForm = () => {
    setFormData({ firstName:'', lastName:'', employeeId:'', email:'', phone:'', department:'', designation:'', policyId:'', joinDate:'', status:'active' });
    setErrors({});
    setEditingEmployee(null);
  };

  const openAddForm = () => { resetForm(); setShowForm(true); };

  const openEditForm = (employee) => {
    setFormData({
      firstName: employee.name.split(' ')[0],
      lastName: employee.name.split(' ').slice(1).join(' ') || '',
      employeeId: employee.employee_id,
      email: employee.email,
      phone: employee.phone || '',
      department: employee.department,
      designation: employee.designation,
      policyId: employee.policy ? employee.policy.id.toString() : '',
      joinDate: employee.join_date,
      status: employee.status || 'active'
    });
    setEditingEmployee(employee); setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); resetForm(); };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.employeeId.trim()) newErrors.employeeId = 'Employee ID is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.department.trim()) newErrors.department = 'Department is required';
    if (!formData.designation.trim()) newErrors.designation = 'Designation is required';
    if (!formData.policyId) newErrors.policyId = 'Policy is required';
    if (!formData.joinDate) newErrors.joinDate = 'Join date is required';
    setErrors(newErrors); return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); if (!validateForm()) return;
    const employeeData = {
      employee_id: formData.employeeId.trim(),
      name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      department: formData.department.trim(),
      designation: formData.designation.trim(),
      join_date: formData.joinDate,
      status: formData.status,
      face_enrolled: editingEmployee ? editingEmployee.face_enrolled : false,
      policy_id: parseInt(formData.policyId)
    };
    try {
      if (editingEmployee) {
        const updatedEmployee = await ApiService.updateEmployee(editingEmployee.id, employeeData);
        // Re-fetch employees list after update to refresh page data
        const refreshedEmployees = await ApiService.getEmployees(); 
        setEmployees(refreshedEmployees);
        setUpdatedEmployee(updatedEmployee);
        setShowUpdatedModal(true);
        closeForm();
      } else {
        const newEmployee = await ApiService.createEmployee(employeeData);
        setEmployees([...employees, newEmployee]);
        setNewlyCreatedEmployee(newEmployee);
        setShowForm(false);
        // Show the "Employee Added" modal
        setShowAddedModal(true);
      }
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Failed to save employee. Please try again.');
    }
  };

  const handleDelete = (employee) => setDeleteConfirm(employee);
  const confirmDelete = async () => {
    try { await ApiService.deleteEmployee(deleteConfirm.id); setEmployees(employees.filter(emp => emp.id !== deleteConfirm.id)); setDeleteConfirm(null); }
    catch (error) { console.error('Failed to delete employee:', error); alert('Failed to delete employee. Please try again.'); }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name','Employee ID','Email','Phone','Department','Designation','Face Enrolled','Join Date'],
      ...filteredEmployees.map(emp => [emp.name, emp.employee_id, emp.email, emp.phone || '', emp.department, emp.designation, emp.face_enrolled ? 'Yes' : 'No', emp.join_date])
    ].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`; a.click(); window.URL.revokeObjectURL(url);
  };

  // ---------- Face Wizard Controls ----------
  const openWizard = async (employee) => {
    setEnrollingEmployee(employee);
    setWizardStep(0);
    setShowWizard(true);
    setFaceStatus('');
    setCapturedDescriptors([]); capturedDescriptorsRef.current = [];
    setCapturedImages([]); capturedImagesRef.current = [];
    if (!modelsLoaded && !modelsLoadingRef.current) {
      modelsLoadingRef.current = true;
      try { await loadModels(); } finally { modelsLoadingRef.current = false; }
    }
  };

  const closeWizard = () => {
    setShowWizard(false); setWizardStep(0); setEnrollingEmployee(null);
    stopVideo();
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream; streamRef.current = stream;
        const playPromise = videoRef.current.play(); if (playPromise?.catch) playPromise.catch(() => {});
      }
    } catch (err) {
      console.error('Camera error', err);
      setFaceStatus('Camera access denied or unavailable.');
    }
  };

  const stopVideo = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const beginCaptureStep = async () => {
    setWizardStep(1);
    setDetectionMethod('ssdMobilenetv1');
    setFaceStatus('Initializing camera...');
    await startVideo();
    // Wait for frames then start sampling
    const ensure = (resolve, reject, tries = 0) => {
      if (!videoRef.current) return reject(new Error('No video element'));
      if (videoRef.current.readyState >= 2) return resolve();
      if (tries > 50) return reject(new Error('Video not ready'));
      setTimeout(() => ensure(resolve, reject, tries + 1), 100);
    };
    new Promise(ensure).then(() => {
      setIsCapturing(true); isCapturingRef.current = true; setFaceStatus('Capturing your face...');
      captureSamples();
    }).catch(() => setFaceStatus('Video not ready. Please try again.'));
  };

  const stopCapturing = () => {
    setIsCapturing(false); isCapturingRef.current = false;
    if (capturedDescriptorsRef.current.length >= 5) setFaceStatus(`Captured ${capturedDescriptorsRef.current.length} samples. You can enroll now.`);
    else setFaceStatus(`Captured ${capturedDescriptorsRef.current.length} samples. Need at least 5.`);
  };

  const captureSamples = async () => {
    if (!isCapturingRef.current || capturedDescriptorsRef.current.length >= 10) return;
    try {
      let detection;
      if (detectionMethod === 'ssdMobilenetv1') {
        detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks().withFaceDescriptor();
        if (!detection) setDetectionMethod('tinyFaceDetector');
      }
      if (!detection) {
        detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.1 }))
          .withFaceLandmarks().withFaceDescriptor();
      }
      if (detection) {
        capturedDescriptorsRef.current.push(detection.descriptor);
        setCapturedDescriptors([...capturedDescriptorsRef.current]);
        // Thumbnail
        const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 120; const ctx = canvas.getContext('2d');
        try { ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height); } catch {}
        const imgData = canvas.toDataURL('image/jpeg');
        capturedImagesRef.current.push(imgData); setCapturedImages([...capturedImagesRef.current]);
        setFaceStatus(`Capturing your face...\nImage ${capturedDescriptorsRef.current.length} of 10`);
        if (capturedDescriptorsRef.current.length >= 10) {
          setIsCapturing(false); isCapturingRef.current = false; setFaceStatus('All 10 images captured. Ready to enroll.');
          // Automatically enroll face
          enrollFace();
        }
      }
    } catch (err) { console.error('Detection error', err); setFaceStatus('Error during detection.'); }
    if (isCapturingRef.current) setTimeout(captureSamples, 250);
  };

  const enrollFace = async () => {
    if (capturedDescriptorsRef.current.length < 5) { alert('Please capture at least 5 images.'); return; }
    try {
      setIsEnrolling(true);
      setFaceStatus('Registering face...');
      const metadata = { method: 'auto-10', intervalMs: 250, totalSamples: capturedDescriptorsRef.current.length, detectionMethod };
      await ApiService.enrollFace(enrollingEmployee.employee_id, capturedDescriptorsRef.current, metadata);
      setEmployees(emps => emps.map(emp => emp.id === enrollingEmployee.id ? { ...emp, face_enrolled: true } : emp));
      stopVideo();
      setWizardStep(2);
    } catch (err) {
      console.error('Enrollment error:', err); setFaceStatus('Enrollment failed. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // ---------------- UI ----------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-md text-gray-600 mt-1">Manage employees and face enrollment</p>
            </div>
            <button onClick={openAddForm} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
              <Plus className="w-4 h-4" /><span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Search / Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search employees..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-row lg:flex-row gap-2">
              <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4" /><span className="inline">Filter</span>
              </button>
              <button onClick={handleExport} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4" /><span className="inline">Export</span>
              </button>
            </div>
          </div>
        

        {/* Employee Cards Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold`}>{getInitials(employee.name)}</div>
                <div className="flex gap-1">
<button onClick={() => openEditForm(employee)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pen text-gray-600"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg></button>
                  {/* <button  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button> */}
                  <button onClick={() => setDeleteConfirm(employee)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{employee.name}</h3>
              <p className="text-xs text-gray-600 mb-3">{employee.employee_id}</p>
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2 text-xs text-gray-600"><Mail className="w-4 h-4" /><span className="truncate">{employee.email}</span></div>
                <div className="flex items-center gap-2 text-xs text-gray-600"><Phone className="w-4 h-4" /><span>{employee.phone || '+1 234 567 8902'}</span></div>
                <div className="flex items-center gap-2 text-xs text-gray-600"><User className="w-4 h-4" /><span>{employee.department}</span></div>
              </div>
              {employee.face_enrolled ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                  <CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-green-700">Face Enrolled</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg mb-3">
                  <XCircle className="w-4 h-4 text-red-600" /><span className="text-xs font-medium text-red-700">Face Not Enrolled</span>
                </div>
              )}
              <button onClick={() => openWizard(employee)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"><Camera className="w-4 h-4"/><span>{employee.face_enrolled ? 'Re-enroll Face' : 'Enroll Face'}</span></button>
            </div>
          ))}
        </div>

        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-gray-400"/></div>
            <p className="text-lg font-medium text-gray-900 mb-2">No employees found</p>
            <p className="text-sm text-gray-600">Try adjusting your search or add a new employee</p>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button onClick={closeForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Scrollable Form Body */}
              <div className="overflow-y-auto px-6 py-6 flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    placeholder="EMP-001"
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      placeholder="john.smith@techcorp.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      placeholder="+1 234 567 8901"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                    <input
                      type="text"
                      placeholder="Engineering"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                    <input
                      type="text"
                      placeholder="Senior Developer"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attendance Policy</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.policyId}
                      onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                    >
                      <option value="">Select a policy</option>
                      {policies.filter(p => p.status === 'active').map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-3">
                <button onClick={closeForm} type="button" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                  {editingEmployee ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Employee Added modal after cicking on employee add */}
        {showAddedModal && newlyCreatedEmployee && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Camera className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Employee Added!</h3>
              <p className="text-gray-700 mb-6"><span className="font-semibold">{newlyCreatedEmployee.name}</span> has been added successfully. Would you like to enroll their face now?</p>
              <div className="flex gap-3">
                <button onClick={()=>{ setShowAddedModal(false); setNewlyCreatedEmployee(null); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-medium">Enroll Later</button>
                <button onClick={()=>{ setShowAddedModal(false); openWizard(newlyCreatedEmployee); }} className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-blue-600 text-white inline-flex items-center justify-center gap-2"><Camera className="w-4 h-4"/>Enroll Now</button>
              </div>
            </div>
          </div>
        )}

        {/* Face Enrollment Wizard */}
        {showWizard && enrollingEmployee && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f1a2b] text-white rounded-2xl w-full max-w-md overflow-hidden">
              {/* Header */}
              <div className="p-4 sm:p-6 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-bold text-white">Face Enrollment</h2>
                <button onClick={closeWizard} className="text-white/60 hover:text-white">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
              {/* Stepper */}
              <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-6">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-500">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 h-1 mx-1 sm:mx-2 bg-gray-700"></div>
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${wizardStep >= 1 ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div className="flex-1 h-1 mx-1 sm:mx-2 bg-gray-700"></div>
                <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full ${wizardStep >= 2 ? 'bg-green-500' : 'bg-gray-700'}`}>
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              {/* Body */}
              <div className="p-4 sm:p-6">
                {/* Intro Step */}
                {wizardStep === 0 && (
                  <div className="text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold mx-auto mb-4">
                      {getInitials(enrollingEmployee.name)}
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">{enrollingEmployee.name}</h3>
                    <p className="text-gray-400 mb-1 text-sm sm:text-base">{enrollingEmployee.employee_id}</p>
                    <p className="text-gray-400 mb-4 sm:mb-6 text-sm sm:text-base">{enrollingEmployee.department}</p>
                    <div className="bg-slate-800 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 text-left">
                      <h4 className="text-sm font-semibold text-white mb-2 sm:mb-3">Instructions:</h4>
                      <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Position your face in the camera frame</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Look directly at the camera</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>Ensure good lighting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400">•</span>
                          <span>10 images will be captured automatically</span>
                        </li>
                      </ul>
                    </div>
                    <button onClick={beginCaptureStep} className="w-full bg-green-600 hover:bg-green-700 text-white py-2 sm:py-3 rounded-lg font-semibold transition-colors text-sm sm:text-base">
                      Start Capture
                    </button>
                  </div>
                )}

                {/* Capture Step */}
                {wizardStep === 1 && (
                  <div className="text-center">
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden mb-4">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-48 sm:h-64 object-cover" />
                      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-48 sm:h-64 hidden" />
                    </div>
                    <div className="text-slate-200 mb-2 whitespace-pre-line text-sm sm:text-base">{faceStatus || 'Capturing your face...'}</div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(capturedDescriptors.length / 10) * 100}%` }} />
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
                      {capturedImages.map((src, i) => (
                        <img key={i} src={src} alt={`sample-${i}`} className="w-full h-12 sm:h-16 object-cover rounded border border-slate-700" />
                      ))}
                    </div>
                    <p className="text-center text-slate-400 text-xs sm:text-sm">Capturing 10 images automatically...</p>
                    {isEnrolling && (
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                        <span className="text-sm">Processing enrollment...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Step */}
                {wizardStep === 2 && (
                  <div className="text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 grid place-items-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <h4 className="text-xl sm:text-2xl font-semibold mb-1">Enrollment Successful!</h4>
                    <p className="text-slate-300 mb-4 sm:mb-6 text-sm sm:text-base">Face has been registered successfully</p>
                    <button onClick={closeWizard} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-2 sm:py-3 text-sm sm:text-base">
                      Continue
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employee Updated modal */}
        {showUpdatedModal && updatedEmployee && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Employee Updated Successfully</h3>
              <p className="text-gray-700 mb-6"><span className="font-semibold">{updatedEmployee.name}</span> has been updated successfully.</p>
              <div className="flex gap-3">
                <button onClick={()=>{ setShowUpdatedModal(false); setUpdatedEmployee(null); }} className="flex-1 px-4 py-2.5 rounded-lg font-medium bg-green-600 text-white">Continue</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center"><Trash2 className="w-6 h-6 text-red-600"/></div>
                  <h2 className="text-xl font-bold text-gray-900">Delete Employee</h2>
                </div>
                <p className="text-gray-600 mb-6">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone and will remove all associated data.</p>
                <div className="flex gap-3">
                  <button onClick={()=>setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                  <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Delete</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default EmployeesPage;
