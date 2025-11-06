import React, { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import * as faceapi from 'face-api.js';
import ApiService from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Notification system
const notifications = [];
const notify = (text) => {
  const el = document.createElement('div');
  el.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  notifications.unshift(el);
  if (notifications.length > 10) notifications.pop(); // Keep only last 10
  updateNotifications();
};

const updateNotifications = () => {
  const container = document.getElementById('attendance-notifications');
  if (container) {
    container.innerHTML = '';
    notifications.forEach(n => container.appendChild(n));
  }
};

const AttendancePage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState("ready");
  const [recognizedEmployee, setRecognizedEmployee] = useState(null);
  const [markedTime, setMarkedTime] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [recentActivities, setRecentActivities] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        setModelsLoaded(true);
        notify('Face recognition and expression models loaded successfully');
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        notify('Failed to load face recognition models');
      }
    };
    loadModels();
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (error) {
      console.error('Camera error:', error);
      setStatus('Camera access denied');
    }
  };

  const stopVideo = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleScan = async () => {
    if (!modelsLoaded) {
      setStatus('Models not loaded yet');
      notify('Models not loaded yet');
      return;
    }

    setIsScanning(true);
    setStatus("analyzing");
    setRecognizedEmployee(null);
    setCountdown(15);
    notify('Starting face scan...');

    await startVideo();

    // Start countdown
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    let recognitionAttempted = false;
    let scanCompleted = false;
    let attendanceMarked = false;
    let isMarkingAttendance = false;

    const attemptRecognition = async () => {
      if (recognitionAttempted || scanCompleted) return;

      try {
        // Try TinyFaceDetector first for speed, fallback to SSD Mobilenet for accuracy
        notify('Detecting face...');
        let detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.1 }))
          .withFaceLandmarks()
          .withFaceDescriptor()
          .withFaceExpressions();

        if (!detection) {
          notify('TinyFace detection failed, trying SSD Mobilenet...');
          detection = await faceapi
            .detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
            .withFaceLandmarks()
            .withFaceDescriptor()
            .withFaceExpressions();
        }

        if (detection) {
          notify('Face detected, extracting features...');
          const descriptor = Array.from(detection.descriptor);
          const expressions = detection.expressions;
          const dominantExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
          notify('Recognizing face...');
          const result = await ApiService.recognizeFace(descriptor, 0.6); // Lower threshold for better matching

          if (result.match && !attendanceMarked && !isMarkingAttendance) {
            recognitionAttempted = true;
            scanCompleted = true;
            attendanceMarked = true;
            isMarkingAttendance = true;

            // Stop scanning immediately on recognition
            clearInterval(countdownInterval);
            clearInterval(recognitionInterval);
            setIsScanning(false);
            setCountdown(0);
            stopVideo();

            setRecognizedEmployee({ ...result, mood: dominantExpression });
            setStatus("success");
            notify(`Recognized ${result.employee_name} (ID: ${result.employee_id}) - Mood: ${dominantExpression}`);

            // Mark attendance
            try {
              const response = await ApiService.markAttendance(result.employee_id);
              const now = new Date();
              setMarkedTime(now);
              setStatus("Attendance marked successfully!");
              notify('Attendance marked successfully!');

              // Determine action based on response message
              let action = "Check-In";
              if (response.message && response.message.includes('Break start')) {
                action = "Break Start";
              } else if (response.message && response.message.includes('Break end')) {
                action = "Break End";
              } else if (response.message && response.message.includes('Check-out')) {
                action = "Check-Out";
              } else if (response.message && response.message.includes('Check-in')) {
                action = "Check-In";
              }

              // Add to recent activities
              const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const newActivity = {
                name: result.employee_name,
                action: action,
                time: timeString,
                employee_id: result.employee_id,
                mood: dominantExpression
              };
              setRecentActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep only last 10

              // Reset to ready state after 2 seconds
              setTimeout(() => {
                setStatus("ready");
                setRecognizedEmployee(null);
                setMarkedTime(null);
              }, 2000);
            } catch (attendanceError) {
              if (attendanceError.message && attendanceError.message.includes('already marked')) {
                const now = new Date();
                setMarkedTime(now);
                setStatus("Attendance marked successfully!");
                notify('Attendance already marked for today');

                // Still add to recent activities for already marked
                const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const newActivity = {
                  name: result.employee_name,
                  action: "Already Checked-In",
                  time: timeString,
                  employee_id: result.employee_id,
                  mood: dominantExpression
                };
                setRecentActivities(prev => [newActivity, ...prev.slice(0, 9)]);

                // Reset to ready state after 2 seconds
                setTimeout(() => {
                  setStatus("ready");
                  setRecognizedEmployee(null);
                  setMarkedTime(null);
                }, 2000);
              } else {
                console.error('Attendance marking error:', attendanceError);
                setStatus("Face recognized but attendance marking failed");
                notify('Face recognized but attendance marking failed');
              }
            } finally {
              isMarkingAttendance = false;
            }
          } else if (!result.match) {
            notify('Face detected but not recognized, trying again...');
          }
        } else {
          notify('No face detected, trying again...');
        }
      } catch (error) {
        console.error('Recognition error:', error);
        notify('Recognition attempt failed: ' + error.message);
      }
    };

    // Attempt recognition every 2 seconds during the scan period
    const recognitionInterval = setInterval(attemptRecognition, 2000);

    // Initial attempt
    await attemptRecognition();

    // Timeout after 15 seconds if not recognized
    const timeoutId = setTimeout(() => {
      if (!scanCompleted) {
        scanCompleted = true;
        clearInterval(countdownInterval);
        clearInterval(recognitionInterval);
        setIsScanning(false);
        setStatus("Face not recognized");
        notify('Face not recognized after multiple attempts');
        stopVideo();
      }
    }, 15000); // Extended to 15 seconds for better recognition
  };



  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-[#0a1123] via-[#111c35] to-[#0c1229] flex items-center justify-center p-6">
        <style>
          {`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #1b233c;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #4a5568;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #718096;
            }
          `}
        </style>
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Camera Section */}
          <div className="lg:col-span-2 bg-[#1b233c]/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
          {/* Status Label */}
          <div className="flex justify-start">
            <div className={`bg-[#0e1629] px-4 py-1 rounded-full text-sm font-medium text-white ${
              status === "success" || status.includes("successfully") ? "bg-green-600" :
              status === "Face not recognized" || status === "No face detected" || status.includes("failed") ? "bg-red-600" :
              "bg-[#0e1629]"
            }`}>
              {status === "ready" ? "Ready" : status}
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            {status === "Attendance marked successfully!" && recognizedEmployee && markedTime ? (
              <>
                <div className="relative mb-6">
                  <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-green-500">
                      {recognizedEmployee.employee_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                  </div>
                </div>
                <div className="mb-4 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Attendance Marked Successfully!</span>
                  </div>
                  <p className="text-white font-medium">{recognizedEmployee.employee_name}</p>
                  <p className="text-gray-300 text-sm">Employee ID: {recognizedEmployee.employee_id}</p>
                  <p className="text-gray-300 text-sm">Status: Checked In</p>
                  <p className="text-gray-300 text-sm">Time: {markedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                </div>
              </>
            ) : !isScanning ? (
              <>
                <Camera className="w-16 h-16 text-white/70 mb-4" />
                <p className="text-lg text-white font-medium mb-1">
                  Position your face in the frame
                </p>
                <p className="text-sm text-gray-400">
                  Camera is active and scanning
                </p>
              </>
            ) : (
              <>
                <div className="relative mb-6">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-96 h-96 border-4 border-blue-400/40 rounded-lg object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-96 h-96"
                    style={{ display: 'none' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
                  </div>
                </div>
                {recognizedEmployee && (
                  <div className="mb-4 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Recognized!</span>
                    </div>
                    <p className="text-white font-medium">{recognizedEmployee.employee_name}</p>
                    <p className="text-gray-300 text-sm">Employee ID: {recognizedEmployee.employee_id}</p>
                    <p className="text-gray-300 text-sm">Mood: {recognizedEmployee.mood}</p>
                  </div>
                )}
                <p className="text-lg text-white font-medium mb-1">
                  Analyzing face... ({countdown}s)
                </p>
                <p className="text-sm text-gray-400">
                  Please keep your face in the frame
                </p>
              </>
            )}
          </div>

          {/* Scan Button */}
          <div className="flex justify-center">
            <button
              onClick={handleScan}
              disabled={isScanning || !modelsLoaded}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Camera className="w-5 h-5" />
              {isScanning ? "Scanning..." : "Scan Face"}
            </button>
          </div>
          </div>

          {/* Right Panel */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <div className="bg-[#1b233c]/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Recent Activity
              </h2>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              {recentActivities.map((a, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-[#222b4a]/60 hover:bg-[#2b3560]/60 transition rounded-xl px-4 py-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white">
                      {a.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">
                        {a.name}
                      </p>
                      <p className="text-gray-400 text-xs">{a.action}</p>
                      {a.mood && (
                        <p className="text-gray-500 text-xs">Mood: {a.mood}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs">{a.time}</p>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  No recent activities yet
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-[#1b233c]/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              Notifications
            </h2>
            <div id="attendance-notifications" className="text-sm text-gray-300 space-y-1 max-h-32 overflow-y-auto">
              {/* Notifications will be inserted here */}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-[#1b233c]/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-white mb-4">
              Instructions
            </h2>
            <ul className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
              <li>
                Stand <span className="text-white font-medium">2–3 feet</span>{" "}
                away from the screen
              </li>
              <li>Look directly at the camera</li>
              <li>Click "Scan Face" to start recognition</li>
              <li>Wait for automatic recognition</li>
              <li>Attendance will be marked automatically</li>
            </ul>
          </div>
        </div>
        </div>

      </main>
      <Footer />
    </div>
  );
};

export default AttendancePage;
