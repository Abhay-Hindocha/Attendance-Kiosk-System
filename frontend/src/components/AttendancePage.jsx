// This is the AttendancePage component, which provides the main face recognition interface.
// It handles camera access, face detection, recognition, and attendance marking.
// The component integrates with face-api.js for face recognition and communicates with the backend API.

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import * as faceapi from "face-api.js";
import ApiService from "../services/api";
import FaceModelService from "../services/FaceModelService";
import Header from "./Header";
import Footer from "./Footer";

// Helper to format time with AM/PM in IST timezone
const formatTime = (date) =>
  date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata", // Force IST timezone
  });

// Try to normalize any kind of time value coming from backend into AM/PM string
const normalizeActivityTime = (activity) => {
  // Guess possible fields where time/date might be stored
  const possible =
    activity.time ||
    activity.timestamp ||
    activity.created_at ||
    activity.createdAt ||
    activity.date;

  if (!possible) {
    // If no time field found, use current time as fallback
    return {
      ...activity,
      time: formatTime(new Date()),
    };
  }

  let parsed;
  // Check if it's just "hh:mm" format (e.g., "14:30")
  if (/^\d{1,2}:\d{2}$/.test(possible)) {
    // For time-only format, use today's date
    const today = new Date();
    const [hours, minutes] = possible.split(':');
    parsed = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
  } else if (/^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(possible)) {
    // Already in AM/PM format, return as-is
    return activity;
  } else {
    // Try parsing as a full date-time string
    parsed = new Date(possible);
  }

  if (isNaN(parsed.getTime())) {
    // If it's not a valid Date, return with original value
    console.warn('Failed to parse time:', possible);
    return activity;
  }

  return {
    ...activity,
    time: formatTime(parsed),
  };
};

// Simple Loader component for loading spinner
const Loader = () => (
  <div className="flex items-center justify-center space-x-2">
    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
    <span className="text-white text-lg font-medium">Loading...</span>
  </div>
);

// Notification system for displaying real-time messages to the user
const notifications = [];
const notify = (text) => {
  const el = document.createElement("div");
  el.innerText = `[${formatTime(new Date())}] ${text}`;
  notifications.unshift(el);
  if (notifications.length > 10) notifications.pop(); // Keep only last 10 notifications
  updateNotifications();
};

const updateNotifications = () => {
  const container = document.getElementById("attendance-notifications");
  if (container) {
    container.innerHTML = "";
    notifications.forEach((n) => container.appendChild(n));
  }
};

const AttendancePage = ({ registerCleanup }) => {
  const navigate = useNavigate();
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

  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Prevent double execution in StrictMode/Development
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Remove localStorage token when coming to attendance page
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("isAuthenticated");

    const loadModelsAndCamera = async () => {
      try {
        await FaceModelService.loadModels();
        setModelsLoaded(true);

        // Pre-acquire camera stream after models are loaded
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
        } catch (cameraError) {
          console.error("Failed to pre-acquire camera stream:", cameraError);
        }
      } catch (error) {
        console.error("Failed to load face-api models:", error);
        notify("Failed to load face recognition models");
      }
    };

    const fetchLiveActivity = async () => {
      try {
        const activities = await ApiService.getLiveActivity();
        const normalized = activities.map((a) => normalizeActivityTime(a));
        setRecentActivities(normalized);
      } catch (error) {
        console.error("Failed to fetch live activity:", error);
      }
    };

    loadModelsAndCamera();
    fetchLiveActivity();

    // Register cleanup for route changes
    if (registerCleanup) {
      registerCleanup(() => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      });
    }

    // Cleanup function to stop camera stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [registerCleanup]);

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
        console.error("Camera error:", error);
        setStatus("Camera access denied");
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
      setStatus("Models not loaded yet");
      notify("Models not loaded yet");
      return;
    }

    setIsScanning(true);
    setStatus("analyzing");
    setRecognizedEmployee(null);
    setCountdown(15);
    notify("Starting face scan...");

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
      setCountdown((prev) => {
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

    let isProcessing = false;

    const attemptRecognition = async () => {
      if (recognitionAttempted || scanCompleted || isProcessing) return;

      try {
        // Use SSD MobileNet directly for better accuracy and privacy (client-side only)
        notify("Detecting face...");
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          notify("Face detected, extracting features...");
          const descriptor = Array.from(detection.descriptor);
          notify("Recognizing face...");

          isProcessing = true;
          // Lower threshold to 0.4 for stricter matching, aligned with backend default
          const result = await ApiService.recognizeFace(descriptor, 0.4);

          if (result.match && !attendanceMarked && !isMarkingAttendance) {
            recognitionAttempted = true;
            scanCompleted = true;
            attendanceMarked = true;
            isMarkingAttendance = true;

            // Stop scanning immediately on recognition to prevent any overlapping intervals
            clearInterval(countdownInterval);
            if (recognitionInterval) clearInterval(recognitionInterval);
            if (timeoutId) clearTimeout(timeoutId);

            setIsScanning(false);
            setCountdown(0);
            stopVideo();

            setRecognizedEmployee({ ...result });
            setStatus("Face recognized");
            notify(
              `Recognized ${result.employee_name} (ID: ${result.employee_id})`
            );

            // Mark attendance
            try {
              const response = await ApiService.markAttendance(result.employee_id);
              console.log("markAttendance response:", response);
              const now = new Date();
              setMarkedTime(now);
              notify("Attendance marked successfully!");

              // Update recognized employee with department from markAttendance response
              setRecognizedEmployee((prev) => ({
                ...prev,
                department: response?.attendance?.employee?.department,
              }));

              // Set status after updating employee data
              setStatus("Attendance marked successfully!");

              // Determine action based on response message
              let action = "Check-In";
              if (response.message && response.message.includes("Break start")) {
                action = "Break Start";
              } else if (response.message && response.message.includes("Break end")) {
                action = "Break End";
              } else if (response.message && response.message.includes("Check-out")) {
                action = "Check-Out";
              } else if (response.message && response.message.includes("Check-in")) {
                action = "Check-In";
              }

              setCurrentAction(action);

              // Add to recent activities
              const timeString = formatTime(now);

              const newActivity = {
                name: result.employee_name,
                action: action,
                time: timeString,
                employee_id: result.employee_id,
              };
              setRecentActivities((prev) => [newActivity, ...prev.slice(0, 19)]); // Show up to 20

              // Reset to ready state after 2 seconds
              setTimeout(() => {
                setStatus("ready");
                setRecognizedEmployee(null);
                setMarkedTime(null);
              }, 2000);
            } catch (attendanceError) {
              console.log("Attendance marking error response:", attendanceError.response);
              const response = attendanceError.response;

              if (
                response &&
                response.status === 403 &&
                response.data &&
                typeof response.data.message === "string"
              ) {
                const msg = response.data.message.toLowerCase();
                if (
                  msg.includes("inactive employee") ||
                  msg.includes("inactive employees") ||
                  (msg.includes("inactive") && msg.includes("not allowed"))
                ) {
                  const now = new Date();
                  setMarkedTime(now);
                  setStatus("Inactive employees cannot mark attendance");
                  notify("Inactive employees cannot mark attendance");

                  // Reset to ready state after 2 seconds
                  setTimeout(() => {
                    setStatus("ready");
                    setRecognizedEmployee(null);
                    setMarkedTime(null);
                  }, 2000);
                } else if (
                  attendanceError.message &&
                  attendanceError.message.includes("already marked")
                ) {
                  const now = new Date();
                  setMarkedTime(now);
                  setStatus("Attendance marked successfully!");
                  notify("Attendance already marked for today");

                  // Still add to recent activities for already marked
                  const timeString = formatTime(now);
                  const newActivity = {
                    name: result.employee_name,
                    action: "Already Checked-In",
                    time: timeString,
                    employee_id: result.employee_id,
                  };
                  setRecentActivities((prev) => [newActivity, ...prev.slice(0, 19)]); // Show up to 20

                  // Reset to ready state after 2 seconds
                  setTimeout(() => {
                    setStatus("ready");
                    setRecognizedEmployee(null);
                    setMarkedTime(null);
                  }, 2000);
                } else {
                  console.error("Attendance marking error:", attendanceError);
                  setStatus("Face recognized but attendance marking failed");
                  notify("Face recognized but attendance marking failed");

                  // Reset to ready state after 2 seconds for general errors
                  setTimeout(() => {
                    setStatus("ready");
                    setRecognizedEmployee(null);
                    setMarkedTime(null);
                  }, 2000);
                }
              } else if (
                attendanceError.message &&
                attendanceError.message.includes("already marked")
              ) {
                const now = new Date();
                setMarkedTime(now);
                setStatus("Attendance marked successfully!");
                notify("Attendance already marked for today");

                // Still add to recent activities for already marked
                const timeString = formatTime(now);
                const newActivity = {
                  name: result.employee_name,
                  action: "Already Checked-In",
                  time: timeString,
                  employee_id: result.employee_id,
                };
                setRecentActivities((prev) => [newActivity, ...prev.slice(0, 19)]); // Show up to 20

                // Reset to ready state after 2 seconds
                setTimeout(() => {
                  setStatus("ready");
                  setRecognizedEmployee(null);
                  setMarkedTime(null);
                }, 2000);
              } else {
                console.error("Attendance marking error:", attendanceError);
                setStatus("Face recognized but attendance marking failed");
                notify("Face recognized but attendance marking failed");

                // Reset to ready state after 2 seconds for general errors
                setTimeout(() => {
                  setStatus("ready");
                  setRecognizedEmployee(null);
                  setMarkedTime(null);
                }, 2000);
              }
            } finally {
              isMarkingAttendance = false;
            }
          } else if (!result.match) {
            notify("Face detected but not recognized, trying again...");
          }
        } else {
          notify("No face detected, trying again...");
        }
      } catch (error) {
        console.error("Recognition error:", error);
        notify("Recognition attempt failed: " + error.message);
      } finally {
        isProcessing = false;
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
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col">
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 2px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 1px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent.
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.25);
          }
        `}
      </style>
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row space-y-4 md:space-y-6 lg:space-y-0 lg:space-x-6 p-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        <div className="flex-1 flex flex-col">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border-2 border-white/20 overflow-hidden flex-1 flex flex-col">
            {/* Camera section wrapper */}
            <div className="bg-slate-800 relative flex flex-col flex-1 pt-3 pb-5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20" />

              <div className="flex justify-between p-4 z-20">
                <div
                  className={`px-4 py-2 rounded-full text-sm font-medium text-white ${status === "success" || status.includes("successfully")
                    ? "bg-green-600"
                    : status === "Face not recognized" ||
                      status === "No face detected" ||
                      status.includes("failed")
                      ? "bg-red-600"
                      : "bg-black/50"
                    }`}
                >
                  {status === "ready" ? "Ready" : status}
                </div>

                <div className="bg-red-500 w-3 h-3 rounded-full animate-pulse" />
              </div>

              <div className="flex-1 relative z-10 text-center px-4 flex items-center justify-center">
                {!modelsLoaded ? (
                  <Loader />
                ) : status === "Attendance marked successfully!" &&
                  recognizedEmployee &&
                  markedTime ? (
                  <div className="flex flex-col items-center justify-center space-y-6 mb-2">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                      </div>

                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">
                          {recognizedEmployee.employee_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </span>
                      </div>

                      <div className="text-center space-y-1">
                        <h2 className="text-white text-xl font-semibold">
                          {recognizedEmployee.employee_name}
                        </h2>
                        <p className="text-gray-300 text-sm">
                          ID: {recognizedEmployee.employee_id}
                        </p>
                        {recognizedEmployee?.department && (
                          <p className="text-gray-400 text-xs">
                            {recognizedEmployee.department}
                          </p>
                        )}
                      </div>
                    </div>

                    <button className="px-6 py-3 bg-green-500 hover:bg-green-600 transition-colors text-white font-semibold rounded-full text-sm">
                      {currentAction || "Check-In"} Successful
                    </button>
                  </div>
                ) : status === "Face not recognized" ? (
                  <div className="flex flex-col items-center justify-center space-y-6 mb-2">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center">
                        <XCircle className="w-14 h-14 text-red-500" />
                      </div>

                      <div className="text-center space-y-1">
                        <h2 className="text-white text-xl font-semibold">Face Not Recognized</h2>
                        <p className="text-gray-300 text-sm">
                          Please try again or contact support
                        </p>
                      </div>
                    </div>

                    <button className="px-6 py-3 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-full text-sm">
                      Try Again
                    </button>
                  </div>
                ) : status === "Inactive employees cannot mark attendance" ? (
                  <div className="flex flex-col items-center justify-center space-y-6 mb-2">
                    <div className="flex flex-col items-center space-y-4">
                      <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-white" />
                      </div>

                      <div className="text-center space-y-1">
                        <h2 className="text-white text-xl font-semibold">Attendance Denied</h2>
                        <p className="text-gray-300 text-sm">
                          Inactive employees are not allowed to mark attendance.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !isScanning ? (
                  <div className="flex flex-col items-center justify-center space-y-4 mb-4">
                    <Camera className="w-16 h-16 text-white/70" />
                    <div className="text-center">
                      <p className="text-lg text-white font-medium mb-1">
                        Position your face in the frame
                      </p>
                      <p className="text-sm text-gray-400">Camera is active and scanning</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-6 mb-2 w-full">
                    {/* CAMERA + CANVAS BLOCK WITH FIXED HEIGHT */}
                    <div className="w-full flex justify-center px-2">
                      <div
                        className="
                          relative
                          w-full
                          max-w-xs
                          sm:max-w-sm
                          md:max-w-md
                          h-64
                          md:h-72
                          lg:h-80
                          rounded-xl
                          border-4 border-blue-400/40
                          overflow-hidden
                          bg-black
                          mx-auto
                        "
                      >
                        {/* CAMERA FEED */}
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="
                            absolute
                            inset-0
                            w-full
                            h-full
                            object-cover
                          "
                          style={{ transform: "scaleX(1)" }}
                        />

                        {/* CANVAS OVERLAY */}
                        <canvas
                          ref={canvasRef}
                          className="
                            absolute
                            inset-0
                            w-full
                            h-full
                            pointer-events-none
                          "
                          style={{ transform: "scaleX(1)" }}
                        />
                      </div>
                    </div>

                    {/* TEXT STACKED */}
                    <div className="flex flex-col items-center space-y-1 mt-4">
                      <div className="text-center px-4">
                        <p className="text-lg text-white font-medium">
                          Analyzing face... ({countdown}s)
                        </p>
                        <p className="text-sm text-gray-400">
                          Please keep your face in the frame
                        </p>
                      </div>
                    </div>

                    {recognizedEmployee && (
                      <div className="p-4 rounded-lg border border-green-500/30 max-w-sm w-full">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Recognized!</span>
                        </div>
                        <p className="text-white font-medium">
                          {recognizedEmployee.employee_name}
                        </p>
                        <p className="text-gray-300 text-sm">
                          Employee ID: {recognizedEmployee.employee_id}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 md:p-6 text-center">
              <button
                onClick={handleScan}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-6 md:px-8 py-2 md:py-3 rounded-lg font-semibold transition-colors text-sm md:text-base ${!modelsLoaded ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                disabled={!modelsLoaded}
              >
                Simulate Face Recognition
              </button>
            </div>
          </div>

          <div className="w-full lg:w-96 flex flex-col gap-4 md:gap-6">
            {/* Right Panel moved below on small screens */}
          </div>
        </div>

        <div className="w-full lg:w-96 flex flex-col space-y-4 md:space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Recent Activity
            </h2>

            <div className="space-y-3 h-60 overflow-y-auto scrollbar-w-1 scrollbar-thumb-white/20 scrollbar-track-transparent">
              {recentActivities.map((a, index) => (
                <div
                  key={index}
                  className="bg-white/5 rounded-lg p-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {a.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.name}</p>
                    <p className="text-slate-400 text-xs">{a.action}</p>
                  </div>
                  <div className="text-slate-300 text-xs whitespace-nowrap flex-shrink-0">
                    {a.time || formatTime(new Date())}
                  </div>
                </div>
              ))}
              {recentActivities.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-8">
                  No recent activities yet
                </div>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Instructions</h3>
            <ul className="space-y-3 text-slate-300 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">1.</span> Stand 2-3 feet away from the
                screen
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">2.</span> Look directly at the camera
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">3.</span> Wait for automatic recognition
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 font-bold">4.</span> Confirmation will appear on
                screen
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AttendancePage;
