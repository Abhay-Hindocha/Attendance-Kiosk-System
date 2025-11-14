import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Camera, X, Mail, Phone, User, CheckCircle, XCircle, Filter, Download, Play, Square, Briefcase, AlertCircle } from 'lucide-react';
import * as faceapi from 'face-api.js';
import ApiService from '../services/api';

/**
 * Employees Page with post-create "Employee Added" prompt and
 * a 3-step Face Enrollment Wizard that matches the provided screenshots.
 */
const EmployeesPage = () => {
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
        setEmployees(employees.map(emp => emp.id === editingEmployee.id ? { id: editingEmployee.id, ...employeeData } : emp));
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
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Employee Management</h1>
              <p className="text-sm text-gray-600 mt-1">Manage employees and face enrollment</p>
            </div>
            <button onClick={openAddForm} className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
              <Plus className="w-5 h-5" /><span>Add Employee</span>
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
            <div className="flex gap-2">
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="w-4 h-4" /><span className="hidden sm:inline">Filter</span>
              </button>
              <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Download className="w-4 h-4" /><span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        

        {/* Employee Cards Grid */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-lg font-bold`}>{getInitials(employee.name)}</div>
                <div className="flex gap-1">
                  <button onClick={() => openEditForm(employee)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><Edit className="w-4 h-4"/></button>
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
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg mb-3">
                <CheckCircle className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-green-700">Face Enrolled</span>
              </div>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
                  <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">First Name <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.firstName} onChange={(e)=>setFormData({...formData, firstName:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="John"/>
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.lastName} onChange={(e)=>setFormData({...formData, lastName:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Smith"/>
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Employee ID <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.employeeId} onChange={(e)=>setFormData({...formData, employeeId:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="EMP-001"/>
                    {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Email <span className="text-red-500">*</span></label>
                    <input type="email" value={formData.email} onChange={(e)=>setFormData({...formData, email:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="john.smith@company.com"/>
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input type="tel" value={formData.phone} onChange={(e)=>setFormData({...formData, phone:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+1 234 567 8900"/>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Department <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.department} onChange={(e)=>setFormData({...formData, department:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Engineering"/>
                      {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Designation <span className="text-red-500">*</span></label>
                      <input type="text" value={formData.designation} onChange={(e)=>setFormData({...formData, designation:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Senior Developer"/>
                      {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Attendance Policy <span className="text-red-500">*</span></label>
                    <select value={formData.policyId} onChange={(e)=>setFormData({...formData, policyId:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">Select a policy</option>
                      {policies.map((p)=> (<option key={p.id} value={p.id}>{p.name}</option>))}
                    </select>
                    {errors.policyId && <p className="text-red-500 text-sm mt-1">{errors.policyId}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Join Date <span className="text-red-500">*</span></label>
                    <input type="date" value={formData.joinDate} onChange={(e)=>setFormData({...formData, joinDate:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"/>
                    {errors.joinDate && <p className="text-red-500 text-sm mt-1">{errors.joinDate}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Status <span className="text-red-500">*</span></label>
                    <select value={formData.status} onChange={(e)=>setFormData({...formData, status:e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button onClick={closeForm} type="button" className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Cancel</button>
                    <button onClick={handleSubmit} type="submit" className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">{editingEmployee ? 'Update Employee' : 'Add Employee'}</button>
                  </div>
                </div>
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

        {/* Face Enrollment Wizard  */}
        {showWizard && enrollingEmployee && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0f1a2b] text-white rounded-2xl w-full max-w-md overflow-hidden">
              {/* Header / Stepper */}
              <div className="p-5 flex items-center justify-between">
                <h3 className="text-xl font-semibold">Face Enrollment</h3>
                <button onClick={closeWizard} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-white/10"><X className="w-5 h-5"/></button>
              </div>
              <div className="pb-2 ">
                <div className="flex items-center justify-between px-5">
                  {[0,1,2].map((s,idx)=> (
                    <div key={idx} className="flex items-center flex-1">
                      <div className={`w-9 h-9 rounded-full grid place-items-center ${(wizardStep > s || (wizardStep === 2 && s === 2)) ? 'bg-green-500' : wizardStep === s ? 'bg-blue-500' : 'bg-slate-600'}`}>
                        {idx === 1 ? <Camera className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </div>
                      {idx<2 && <div className={`h-1 flex-1 mx-2 rounded ${wizardStep>idx? 'bg-green-500':'bg-slate-600'}`}></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="bg-[#0b1220] p-6">
                {/* Intro Step */}
                {wizardStep===0 && (
                  <div>
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-500 grid place-items-center text-3xl font-bold">{getInitials(enrollingEmployee.name)}</div>
                    <div className="text-center mb-4">
                      <h4 className="text-2xl font-semibold">{enrollingEmployee.name}</h4>
                      <p className="text-slate-300">{enrollingEmployee.employee_id}</p>
                      <p className="text-slate-300">{enrollingEmployee.department}</p>
                    </div>
                    <div className="bg-slate-800/70 rounded-xl p-4 text-slate-100 mb-6">
                      <p className="font-semibold mb-2">Instructions:</p>
                      <ul className="space-y-1 text-sm">
                        <li>• Position your face in the camera frame</li>
                        <li>• Look directly at the camera</li>
                        <li>• Ensure good lighting</li>
                        <li>• 10 images will be captured automatically</li>
                      </ul>
                    </div>
                    <button onClick={beginCaptureStep} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-3">Start Capture</button>
                  </div>
                )}

                {/* Capture Step */}
                {wizardStep===1 && (
                  <div>
                    <div className="relative bg-slate-900 rounded-xl overflow-hidden mb-4">
                      <video ref={videoRef} autoPlay muted playsInline className="w-full h-64 object-cover" />
                      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-64 hidden" />
                    </div>
                    <div className="text-center text-slate-200 mb-2 whitespace-pre-line">{faceStatus || 'Capturing your face...'}</div>
                    <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${(capturedDescriptors.length/10)*100}%`}} />
                    </div>
                    <div className="grid grid-cols-5 gap-2 mb-4">
                      {capturedImages.map((src, i)=> (
                        <img key={i} src={src} alt={`sample-${i}`} className="w-full h-16 object-cover rounded border border-slate-700"/>
                      ))}
                    </div>
                    <p className="text-center text-slate-400 text-sm">Capturing 10 images automatically...</p>
                    {isEnrolling && (
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400"></div>
                        <span className="text-sm">Processing enrollment...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Step */}
                {wizardStep===2 && (
                  <div className="text-center">
                    
                    <div className="w-20 h-20 rounded-full bg-green-500 grid place-items-center mx-auto mb-4">
                      <CheckCircle className="w-10 h-10 text-white"/>
                    </div>
                    <h4 className="text-2xl font-semibold mb-1">Enrollment Successful!</h4>
                    <p className="text-slate-300 mb-6">Face has been registered successfully</p>
                    <button onClick={closeWizard} className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl py-3">Continue</button>
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
