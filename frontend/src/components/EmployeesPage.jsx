import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Trash2, Camera, X, Mail, Phone, Briefcase, CheckCircle, AlertCircle, Filter, Download, Play, Square } from 'lucide-react';
import * as faceapi from 'face-api.js';
import ApiService from '../services/api';

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
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [enrollingEmployee, setEnrollingEmployee] = useState(null);
  const [faceStatus, setFaceStatus] = useState('');
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const capturedDescriptorsRef = useRef([]);
  const capturedImagesRef = useRef([]);
  const isCapturingRef = useRef(false);
  const [showEnrollConfirm, setShowEnrollConfirm] = useState(false);
  const samplesRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [autoStartCapturing, setAutoStartCapturing] = useState(false);
  const modelsLoadingRef = useRef(false);
  const [detectionMethod, setDetectionMethod] = useState('ssdMobilenetv1');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

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

  // lazy model loader (call when opening the face modal)
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

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-indigo-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-teal-500',
      'bg-green-500',
      'bg-orange-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const resetForm = () => {
    setFormData({
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
    setErrors({});
    setEditingEmployee(null);
  };

  const openAddForm = () => {
    resetForm();
    setShowForm(true);
  };

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
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

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
        await ApiService.updateEmployee(editingEmployee.id, employeeData);
        setEmployees(employees.map(emp =>
          emp.id === editingEmployee.id ? { id: editingEmployee.id, ...employeeData } : emp
        ));
      } else {
        const newEmployee = await ApiService.createEmployee(employeeData);
        setEmployees([...employees, newEmployee]);
      }
      closeForm();
    } catch (error) {
      console.error('Failed to save employee:', error);
      alert('Failed to save employee. Please try again.');
    }
  };

  const handleDelete = (employee) => {
    setDeleteConfirm(employee);
  };

  const confirmDelete = async () => {
    try {
      await ApiService.deleteEmployee(deleteConfirm.id);
      setEmployees(employees.filter(emp => emp.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Name', 'Employee ID', 'Email', 'Phone', 'Department', 'Designation', 'Face Enrolled', 'Join Date'],
      ...filteredEmployees.map(emp => [
        emp.name,
        emp.employee_id,
        emp.email,
        emp.phone || '',
        emp.department,
        emp.designation,
        emp.face_enrolled ? 'Yes' : 'No',
        emp.join_date
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const openFaceModal = (employee) => {
    setEnrollingEmployee(employee);
    setShowFaceModal(true);
    setFaceStatus('Initializing camera...');
    setCapturedDescriptors([]);
    setCapturedImages([]);
    setNotifications([]);
  setAutoStartCapturing(true);
    // clear previous thumbnails container if any
    if (samplesRef.current) samplesRef.current.innerHTML = '';
    // load models if not already loaded (lazy load to speed up initial page load)
    if (!modelsLoaded && !modelsLoadingRef.current) {
      modelsLoadingRef.current = true;
      loadModels().then(() => {
        modelsLoadingRef.current = false;
        setModelsLoaded(true);
        // after models loaded, start video
        startVideo();
      }).catch(err => {
        console.error('Failed to load models on demand:', err);
        modelsLoadingRef.current = false;
        // still attempt to start camera even if models fail
        startVideo();
      });
    } else {
      startVideo();
    }
  };

  const closeFaceModal = () => {
    setShowFaceModal(false);
    setEnrollingEmployee(null);
    setFaceStatus('');
    setCapturedDescriptors([]);
    setCapturedImages([]);
    setIsCapturing(false);
    setShowEnrollConfirm(false);
    stopVideo();
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      // Play may reject if autoplay is blocked; ignore that and rely on readyState checks
      const playPromise = videoRef.current.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {
          // autoplay prevented, user interaction may be required
        });
      }
      setFaceStatus('Camera ready. Click "Start Capturing" to begin.');
      // if autoStartCapturing requested and models are loaded, auto-start capturing
      if (autoStartCapturing && modelsLoaded) {
        setTimeout(() => {
          // small delay to let video frames arrive
          if (!isCapturingRef.current) startCapturing();
        }, 500);
      }
    } catch (error) {
      setFaceStatus('Camera access denied or unavailable.');
      console.error('Camera error:', error);
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startCapturing = () => {
    // ensure models are loaded and video is ready
    if (!modelsLoaded) {
      setFaceStatus('Models not loaded yet. Please wait.');
      return;
    }
    if (!videoRef.current) {
      setFaceStatus('Camera not available.');
      return;
    }
    // reset detection method preference
    setDetectionMethod('ssdMobilenetv1');
  setIsCapturing(true);
  isCapturingRef.current = true;
    setFaceStatus('Capturing face samples...');
    // clear any leftover thumbnails container
    if (samplesRef.current) samplesRef.current.innerHTML = '';
    // ensure video has frames: wait until readyState >= 2
    const waitForVideo = (resolve, reject, tries = 0) => {
      if (!videoRef.current) return reject(new Error('No video element'));
      if (videoRef.current.readyState >= 2) return resolve();
      if (tries > 50) return reject(new Error('Video not ready'));
      setTimeout(() => waitForVideo(resolve, reject, tries + 1), 100);
    };
    new Promise(waitForVideo).then(() => captureSamples()).catch(err => {
      console.error('Video readiness error:', err);
      setFaceStatus('Video not ready. Please try again.');
      setIsCapturing(false);
      isCapturingRef.current = false;
    });
  };

  const stopCapturing = () => {
    setIsCapturing(false);
    isCapturingRef.current = false;
    if (capturedDescriptors.length >= 5) {
      setFaceStatus(`Captured ${capturedDescriptors.length} samples. Click "Enroll Face" to save.`);
    } else {
      setFaceStatus(`Captured ${capturedDescriptors.length} samples. Need at least 5 samples to enroll.`);
    }
  };

  const captureSamples = async (retryCount = 0) => {
    if (!isCapturingRef.current || capturedDescriptorsRef.current.length >= 10) {
      if (capturedDescriptorsRef.current.length >= 10) {
        setFaceStatus('All 10 samples captured. Click "Enroll Face" to save.');
        setIsCapturing(false);
        isCapturingRef.current = false;
      }
      return;
    }

    if (!videoRef.current || videoRef.current.readyState < 2) {
      console.log(`Video not ready, readyState: ${videoRef.current?.readyState}, retry: ${retryCount}`);
      if (retryCount < 50) { // Max 50 retries (5 seconds)
        setTimeout(() => captureSamples(retryCount + 1), 100);
      } else {
        setFaceStatus('Video failed to load properly. Please try again.');
        setIsCapturing(false);
        isCapturingRef.current = false;
      }
      return;
    }

    try {
      console.log('Attempting face detection...');
      let detection;

      if (detectionMethod === 'ssdMobilenetv1') {
        detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (!detection && detectionMethod === 'ssdMobilenetv1') {
        console.log('SSD Mobilenet failed, falling back to TinyFaceDetector');
        setDetectionMethod('tinyFaceDetector');
        detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.1 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      } else if (detectionMethod === 'tinyFaceDetector') {
        detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.1 }))
          .withFaceLandmarks()
          .withFaceDescriptor();
      }

      if (detection) {
        console.log('Face detected, capturing sample');
        // push into refs to avoid stale closure issues and then update state
        capturedDescriptorsRef.current.push(detection.descriptor);
        const newDescriptors = capturedDescriptorsRef.current.slice();
        setCapturedDescriptors(newDescriptors);
        setFaceStatus(`Captured ${newDescriptors.length}/10 samples...`);

        // Create thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        // draw the detected box area if landmarks available for slightly better crop
        try {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        } catch (err) {
          // drawing may fail in some browsers if video is not fully ready
          console.warn('Failed to draw video frame for thumbnail', err);
        }
        const imgData = canvas.toDataURL('image/jpeg');
  capturedImagesRef.current.push(imgData);
  const newImages = capturedImagesRef.current.slice();
  setCapturedImages(newImages);
        if (samplesRef.current) {
          const img = document.createElement('img');
          img.src = imgData;
          img.className = 'w-16 h-12 object-cover border border-gray-300 rounded';
          samplesRef.current.appendChild(img);
        }
        // if we've reached the desired number stop capturing automatically
        if (capturedDescriptorsRef.current.length >= 10) {
          setFaceStatus('All 10 samples captured. Click "Enroll Face" to save.');
          setIsCapturing(false);
          isCapturingRef.current = false;
          return;
        }
      } else {
        console.log('No face detected');
        setFaceStatus(`No face detected. Captured ${capturedDescriptorsRef.current.length}/10 samples...`);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setFaceStatus('Error during detection.');
    }

    setTimeout(captureSamples, 250); // 250ms interval
  };

  const enrollFace = async () => {
    if (capturedDescriptors.length < 5) {
      alert('Please capture at least 5 face samples before enrolling.');
      return;
    }

    try {
      setFaceStatus('Enrolling face...');
      const metadata = {
        method: 'auto-10',
        intervalMs: 250,
        totalSamples: capturedDescriptors.length,
        detectionMethod: detectionMethod
      };
      await ApiService.enrollFace(enrollingEmployee.employee_id, capturedDescriptors, metadata);
      // Backend already updates face_enrolled status, so just update local state
      setEmployees(employees.map(emp =>
        emp.id === enrollingEmployee.id ? { ...emp, face_enrolled: true } : emp
      ));
      setFaceStatus('Face enrolled successfully!');
      setTimeout(() => closeFaceModal(), 2000);
    } catch (error) {
      console.error('Enrollment error:', error);
      setFaceStatus('Enrollment failed. Please try again.');
    }
  };

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
            <button
              onClick={openAddForm}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>Add Employee</span>
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={handleExport}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Employee Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredEmployees.map((employee) => (
            <div key={employee.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-full ${getAvatarColor(employee.name)} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {getInitials(employee.name)}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(employee)}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Employee"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(employee)}
                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Employee"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Employee Info */}
              <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 mb-1">{employee.name}</h3>
                <p className="text-sm text-blue-600 font-medium mb-3">{employee.employee_id}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{employee.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="w-4 h-4 flex-shrink-0" />
                    <span>{employee.department}</span>
                  </div>
                </div>
              </div>

              {/* Face Enrollment Status */}
              <div className="mb-3">
                {employee.face_enrolled ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-700">Face Enrolled</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-red-700">Not Enrolled</span>
                  </div>
                )}
              </div>

              {/* Enroll Button */}
              <button
                onClick={() => openFaceModal(employee)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                title={employee.face_enrolled ? 'Re-enroll Face' : 'Enroll Face'}
              >
                <Camera className="w-4 h-4" />
                <span>{employee.face_enrolled ? 'Re-enroll Face' : 'Enroll Face'}</span>
              </button>
            </div>
          ))}
        </div>

        {/* No Employees Found */}
        {filteredEmployees.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">No employees found</p>
            <p className="text-sm text-gray-600">Try adjusting your search or add a new employee</p>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h2>
                  <button
                    onClick={closeForm}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="John"
                      />
                      {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Smith"
                      />
                      {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="employeeId" className="block text-sm font-semibold text-gray-700 mb-2">
                      Employee ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="EMP-001"
                    />
                    {errors.employeeId && <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="john.smith@company.com"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="+1 234 567 8900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="department" className="block text-sm font-semibold text-gray-700 mb-2">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Engineering"
                      />
                      {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                    </div>
                    <div>
                      <label htmlFor="designation" className="block text-sm font-semibold text-gray-700 mb-2">
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="designation"
                        name="designation"
                        value={formData.designation}
                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="Senior Developer"
                      />
                      {errors.designation && <p className="text-red-500 text-sm mt-1">{errors.designation}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="policyId" className="block text-sm font-semibold text-gray-700 mb-2">
                      Attendance Policy <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="policyId"
                      name="policyId"
                      value={formData.policyId}
                      onChange={(e) => setFormData({ ...formData, policyId: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select a policy</option>
                      {policies.map((policy) => (
                        <option key={policy.id} value={policy.id}>{policy.name}</option>
                      ))}
                    </select>
                    {errors.policyId && <p className="text-red-500 text-sm mt-1">{errors.policyId}</p>}
                  </div>

                  <div>
                    <label htmlFor="joinDate" className="block text-sm font-semibold text-gray-700 mb-2">
                      Join Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="joinDate"
                      name="joinDate"
                      value={formData.joinDate}
                      onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    {errors.joinDate && <p className="text-red-500 text-sm mt-1">{errors.joinDate}</p>}
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="on_leave">On Leave</option>
                    </select>
                    {errors.status && <p className="text-red-500 text-sm mt-1">{errors.status}</p>}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={closeForm}
                      type="button"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      {editingEmployee ? 'Update Employee' : 'Add Employee'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Face Enrollment Modal */}
        {showFaceModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Face Enrollment - {enrollingEmployee?.name}
                  </h2>
                  <button
                    onClick={closeFaceModal}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Camera Section */}
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 w-full h-64"
                      style={{ display: 'none' }}
                    />
                  </div>

                  {/* Status */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">{faceStatus}</p>
                  </div>

                  {/* Samples Thumbnails */}
                  {capturedDescriptors.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Captured Samples</span>
                        <span>{capturedDescriptors.length}/10</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(capturedDescriptors.length / 10) * 100}%` }}
                        />
                      </div>
                      <div ref={samplesRef} className="flex gap-2 flex-wrap mt-2"></div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex gap-3">
                    {!isCapturing && capturedDescriptors.length < 5 ? (
                      <button
                        onClick={startCapturing}
                        disabled={!modelsLoaded}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4" />
                        Start Capturing
                      </button>
                    ) : isCapturing ? (
                      <button
                        onClick={stopCapturing}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        <Square className="w-4 h-4" />
                        Stop Capturing
                      </button>
                    ) : (
                      <button
                        onClick={enrollFace}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Enroll Face
                      </button>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Instructions:</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Position your face in the center of the camera</li>
                      <li>• Ensure good lighting and clear view of your face</li>
                      <li>• Capture at least 5 samples for better accuracy</li>
                      <li>• Keep your head still during capture</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Delete Employee</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone and will remove all associated data.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeesPage;
