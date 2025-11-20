// This is the AttendancePage component, which provides the main face recognition interface.
// It handles camera access, face detection, recognition, and attendance marking.
// The component integrates with face-api.js for face recognition and communicates with the backend API.

import React, { useState, useRef, useEffect } from "react";
import { Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import * as faceapi from 'face-api.js';
import ApiService from '../services/api';
import Header from './Header';
import Footer from './Footer';

// Notification system for displaying real-time messages to the user
const notifications = [];
const notify = (text) => {
  const el = document.createElement('div');
  el.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  notifications.unshift(el);
  if (notifications.length > 10) notifications.pop(); // Keep only last 10 notifications
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
  const [currentAction, setCurrentAction] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Remove localStorage token when coming to attendance page
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('isAuthenticated');

    const loadModelsAndCamera = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        setModelsLoaded(true);

        // Pre-acquire camera stream after models are loaded
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
        } catch (cameraError) {
          console.error('Failed to pre-acquire camera stream:', cameraError);
        }
      } catch (error) {
        console.error('Failed to load face-api models:', error);
        notify('Failed to load face recognition models');
      }
    };
    loadModelsAndCamera();

    // Cleanup function to stop camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startVideo = async () => {
    if (streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    } else {
      // Fallback: request camera access if pre-acquired stream failed
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      } catch (error) {
        console.error('Camera error:', error);
        setStatus('Camera access denied');
      }
    }
  };

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
      videoRef.current.load();
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

    let recognitionAttempted = false;
    let scanCompleted = false;
    let attendanceMarked = false;
    let isMarkingAttendance = false;
    let timeoutId = null;
    let recognitionInterval = null;
    let countdownInterval = null;

    // Start countdown
    countdownInterval = setInterval(() => {
      setCountdown(prev => {
        const newCountdown = Math.max(0, prev - 1);
        if (newCountdown === 0) {
          clearInterval(countdownInterval);
          if (!scanCompleted) {
            scanCompleted = true;
            clearInterval(recognitionInterval);
            setIsScanning(false);
            setStatus("Face not recognized");
            stopVideo();
            setTimeout(() => {
              setStatus("ready");
            }, 2000);
          }
        }
        return newCountdown;
      });
    }, 1000);

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
            clearTimeout(timeoutId);
            setIsScanning(false);
            setCountdown(0);
            stopVideo();

            setRecognizedEmployee({ ...result, mood: dominantExpression });
            setStatus("success");
            notify(`Recognized ${result.employee_name} (ID: ${result.employee_id}) - Mood: ${dominantExpression}`);

            // Mark attendance
            try {
              const response = await ApiService.markAttendance(result.employee_id);
              console.log('markAttendance response:', response);
              const now = new Date();
              setMarkedTime(now);
              notify('Attendance marked successfully!');

              // Update recognized employee with department from markAttendance response
              setRecognizedEmployee(prev => ({ ...prev, department: response?.attendance?.employee?.department }));

              // Set status after updating employee data
              setStatus("Attendance marked successfully!");

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

              setCurrentAction(action);

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
    recognitionInterval = setInterval(attemptRecognition, 2000);

    // Initial attempt
    await attemptRecognition();

    // Timeout after 15 seconds if not recognized
    timeoutId = setTimeout(() => {
      if (!scanCompleted) {
        scanCompleted = true;
        clearInterval(countdownInterval);
        clearInterval(recognitionInterval);
        setIsScanning(false);
        setStatus("Face not recognized");
        stopVideo();

        // Reset to ready state after 2 seconds
        setTimeout(() => {
          setStatus("ready");
        }, 2000);
      }
    }, 15000); // Extended to 15 seconds for better recognition
  };



  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gradient-to-br from-[#0a1123] via-[#111c35] to-[#0c1229] flex items-center justify-center p-6 overflow-hidden">
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
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
            .blink {
              animation: blink 4s infinite;
            }
          `}
        </style>
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {/* Camera Section */}
          <div className="lg:col-span-2 bg-[#1b233c]/70 border border-gray-500 rounded-2xl backdrop-blur-md grid " style={{ gridTemplateRows: '4fr .5fr' }}>
            <div className="p-6 flex flex-col rounded-t-2xl overflow-hidden relative" style={{ background: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(168, 85, 247, 0.2))' }}>
              {/* Red Blinking Dot */}
              <div className="m-3 absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full blink"></div>
              {/* Status Label */}
              <div className="flex justify-start">
                <div className={`bg-[#0e1629] px-2 py-2 rounded-full text-sm font-medium text-white ${
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
                    {/* Check Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-14 w-14 sm:w-10 sm:h-10 text-green-500" />
                      </div>
                    </div>

                    {/* Avatar */}
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center mb-3">
                      <span className="text-3xl font-bold text-white">{recognizedEmployee.employee_name.split(" ").map((n) => n[0]).join("")}</span>
                    </div>

                    {/* Name */}
                    <h2 className="text-white text-2xl font-semibold">{recognizedEmployee.employee_name}</h2>

                    {/* Employee ID */}
                    <p className="text-gray-300 text-sm mt-1">{recognizedEmployee.employee_id}</p>
                    {/* Employee Department */}
                    <p className="text-gray-300 text-sm mt-1">{recognizedEmployee?.department}</p>
                    {/* Green Button */}
                    <button className="mt-5 p-5 w-400 bg-green-500 hover:bg-green-600 transition text-white font-semibold py-2.5 rounded-full">
                      {currentAction || "Check-In"} Successful
                    </button>
                  </>
                ) : status === "Face not recognized" ? (
                  <>
                    {/* X Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14  rounded-full flex items-center justify-center">
                        <XCircle className="h-14 w-14 sm:w-10 sm:h-10 text-red-500" />
                      </div>
                    </div>


                    {/* Message */}
                    <h2 className="text-white text-2xl font-semibold">Face Not Recognized</h2>

                    {/* Sub Message */}
                    <p className="text-gray-300 text-sm mt-1">Please try again or contact support</p>

                    {/* Red Button */}
                    <button className="mt-5 p-5 w-350 bg-red-500 hover:bg-red-600 transition text-white font-semibold py-2.5 rounded-full">
                      Try Again
                    </button>
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
            </div>
            <div className="bg-grey-900 p-6 flex justify-center items-center">
              {/* Scan Button */}
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
        <div className="flex flex-col h-full space-y-6">
          {/* Recent Activity */}
          <div className="bg-[#1b233c]/70 border border-white/10 rounded-2xl p-6 backdrop-blur-md h-64 flex flex-col">
            <div className="flex items-center mb-4 gap-2">
              <div className={`w-2 h-2 bg-green-500 rounded-full ${recentActivities.length > 0 ? 'blink' : ''}`}></div>
              <h2 className="text-lg font-semibold text-white">
                Recent Activity
              </h2>
            </div>
            <div className="overflow-y-scroll custom-scrollbar h-full">
              <div className="space-y-3">
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
          </div>

          {/* Instructions */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-6 flex-shrink-0">
            <h3 className="text-white text-lg font-semibold mb-4">Instructions</h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span>
                <span>Stand 2-3 feet away from the screen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span>
                <span>Look directly at the camera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span>
                <span>Wait for automatic recognition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">4.</span>
                <span>Confirmation will appear on screen</span>
              </li>
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
