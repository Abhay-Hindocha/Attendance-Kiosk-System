// import React, { useState } from 'react';
// import { Settings, Camera, Bell, Shield, Database, User, Save, RefreshCw, Eye, EyeOff } from 'lucide-react';

// const SettingsPage = () => {
//   const [activeTab, setActiveTab] = useState('general');
//   const [showPassword, setShowPassword] = useState(false);
//   const [settings, setSettings] = useState({
//     // General Settings
//     companyName: 'FaceRec Attendance System',
//     timezone: 'UTC-5',
//     dateFormat: 'MM/DD/YYYY',
//     timeFormat: '12-hour',
//     language: 'English',
    
//     // Camera Settings
//     cameraResolution: '640x480',
//     faceDetectionSensitivity: 'medium',
//     autoCapture: true,
//     captureDelay: 2,
    
//     // Notification Settings
//     emailNotifications: true,
//     smsNotifications: false,
//     attendanceAlerts: true,
//     lateArrivalAlerts: true,
//     absenceAlerts: true,
    
//     // Security Settings
//     dataEncryption: true,
//     biometricDataRetention: 30,
//     accessLogging: true,
//     twoFactorAuth: false,
    
//     // Database Settings
//     backupFrequency: 'daily',
//     dataRetention: 365,
//     autoBackup: true,
//     compressionEnabled: true,
    
//     // User Settings
//     username: 'admin',
//     email: 'admin@facerec-attendance.com',
//     password: '••••••••',
//     firstName: 'Admin',
//     lastName: 'User',
//     role: 'Administrator'
//   });

//   const tabs = [
//     { id: 'general', name: 'General', icon: Settings },
//     { id: 'camera', name: 'Camera', icon: Camera },
//     { id: 'notifications', name: 'Notifications', icon: Bell },
//     { id: 'security', name: 'Security', icon: Shield },
//     { id: 'database', name: 'Database', icon: Database },
//     { id: 'user', name: 'User Profile', icon: User }
//   ];

//   const handleSettingChange = (key, value) => {
//     setSettings(prev => ({
//       ...prev,
//       [key]: value
//     }));
//   };

//   const saveSettings = () => {
//     // Simulate saving settings
//     alert('Settings saved successfully!');
//   };

//   const resetSettings = () => {
//     if (confirm('Are you sure you want to reset all settings to default?')) {
//       // Reset to default values
//       alert('Settings reset to default values!');
//     }
//   };

//   const renderGeneralSettings = () => (
//     <div className="space-y-6">
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Company Name
//         </label>
//         <input
//           type="text"
//           value={settings.companyName}
//           onChange={(e) => handleSettingChange('companyName', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Timezone
//           </label>
//           <select
//             value={settings.timezone}
//             onChange={(e) => handleSettingChange('timezone', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="UTC-5">UTC-5 (EST)</option>
//             <option value="UTC-6">UTC-6 (CST)</option>
//             <option value="UTC-7">UTC-7 (MST)</option>
//             <option value="UTC-8">UTC-8 (PST)</option>
//             <option value="UTC+0">UTC+0 (GMT)</option>
//           </select>
//         </div>
        
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Date Format
//           </label>
//           <select
//             value={settings.dateFormat}
//             onChange={(e) => handleSettingChange('dateFormat', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="MM/DD/YYYY">MM/DD/YYYY</option>
//             <option value="DD/MM/YYYY">DD/MM/YYYY</option>
//             <option value="YYYY-MM-DD">YYYY-MM-DD</option>
//           </select>
//         </div>
//       </div>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Time Format
//           </label>
//           <select
//             value={settings.timeFormat}
//             onChange={(e) => handleSettingChange('timeFormat', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="12-hour">12-hour (AM/PM)</option>
//             <option value="24-hour">24-hour</option>
//           </select>
//         </div>
        
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Language
//           </label>
//           <select
//             value={settings.language}
//             onChange={(e) => handleSettingChange('language', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="English">English</option>
//             <option value="Spanish">Spanish</option>
//             <option value="French">French</option>
//             <option value="German">German</option>
//           </select>
//         </div>
//       </div>
//     </div>
//   );

//   const renderCameraSettings = () => (
//     <div className="space-y-6">
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Camera Resolution
//         </label>
//         <select
//           value={settings.cameraResolution}
//           onChange={(e) => handleSettingChange('cameraResolution', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           <option value="320x240">320x240 (Low)</option>
//           <option value="640x480">640x480 (Medium)</option>
//           <option value="1280x720">1280x720 (HD)</option>
//           <option value="1920x1080">1920x1080 (Full HD)</option>
//         </select>
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Face Detection Sensitivity
//         </label>
//         <select
//           value={settings.faceDetectionSensitivity}
//           onChange={(e) => handleSettingChange('faceDetectionSensitivity', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           <option value="low">Low</option>
//           <option value="medium">Medium</option>
//           <option value="high">High</option>
//         </select>
//       </div>
      
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Auto Capture
//           </label>
//           <p className="text-sm text-gray-500">Automatically capture when face is detected</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.autoCapture}
//           onChange={(e) => handleSettingChange('autoCapture', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Capture Delay (seconds)
//         </label>
//         <input
//           type="number"
//           min="1"
//           max="10"
//           value={settings.captureDelay}
//           onChange={(e) => handleSettingChange('captureDelay', parseInt(e.target.value))}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
//     </div>
//   );

//   const renderNotificationSettings = () => (
//     <div className="space-y-6">
//       <div className="space-y-4">
//         <div className="flex items-center justify-between">
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               Email Notifications
//             </label>
//             <p className="text-sm text-gray-500">Send notifications via email</p>
//           </div>
//           <input
//             type="checkbox"
//             checked={settings.emailNotifications}
//             onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
//             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//           />
//         </div>
        
//         <div className="flex items-center justify-between">
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               SMS Notifications
//             </label>
//             <p className="text-sm text-gray-500">Send notifications via SMS</p>
//           </div>
//           <input
//             type="checkbox"
//             checked={settings.smsNotifications}
//             onChange={(e) => handleSettingChange('smsNotifications', e.target.checked)}
//             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//           />
//         </div>
        
//         <div className="flex items-center justify-between">
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               Attendance Alerts
//             </label>
//             <p className="text-sm text-gray-500">Alert when attendance is marked</p>
//           </div>
//           <input
//             type="checkbox"
//             checked={settings.attendanceAlerts}
//             onChange={(e) => handleSettingChange('attendanceAlerts', e.target.checked)}
//             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//           />
//         </div>
        
//         <div className="flex items-center justify-between">
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               Late Arrival Alerts
//             </label>
//             <p className="text-sm text-gray-500">Alert for late arrivals</p>
//           </div>
//           <input
//             type="checkbox"
//             checked={settings.lateArrivalAlerts}
//             onChange={(e) => handleSettingChange('lateArrivalAlerts', e.target.checked)}
//             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//           />
//         </div>
        
//         <div className="flex items-center justify-between">
//           <div>
//             <label className="text-sm font-medium text-gray-700">
//               Absence Alerts
//             </label>
//             <p className="text-sm text-gray-500">Alert for absences</p>
//           </div>
//           <input
//             type="checkbox"
//             checked={settings.absenceAlerts}
//             onChange={(e) => handleSettingChange('absenceAlerts', e.target.checked)}
//             className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//           />
//         </div>
//       </div>
//     </div>
//   );

//   const renderSecuritySettings = () => (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Data Encryption
//           </label>
//           <p className="text-sm text-gray-500">Encrypt all stored data</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.dataEncryption}
//           onChange={(e) => handleSettingChange('dataEncryption', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Biometric Data Retention (days)
//         </label>
//         <input
//           type="number"
//           min="1"
//           max="365"
//           value={settings.biometricDataRetention}
//           onChange={(e) => handleSettingChange('biometricDataRetention', parseInt(e.target.value))}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
      
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Access Logging
//           </label>
//           <p className="text-sm text-gray-500">Log all system access</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.accessLogging}
//           onChange={(e) => handleSettingChange('accessLogging', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
      
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Two-Factor Authentication
//           </label>
//           <p className="text-sm text-gray-500">Require 2FA for admin access</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.twoFactorAuth}
//           onChange={(e) => handleSettingChange('twoFactorAuth', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
//     </div>
//   );

//   const renderDatabaseSettings = () => (
//     <div className="space-y-6">
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Backup Frequency
//         </label>
//         <select
//           value={settings.backupFrequency}
//           onChange={(e) => handleSettingChange('backupFrequency', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           <option value="hourly">Hourly</option>
//           <option value="daily">Daily</option>
//           <option value="weekly">Weekly</option>
//           <option value="monthly">Monthly</option>
//         </select>
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Data Retention (days)
//         </label>
//         <input
//           type="number"
//           min="30"
//           max="3650"
//           value={settings.dataRetention}
//           onChange={(e) => handleSettingChange('dataRetention', parseInt(e.target.value))}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
      
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Auto Backup
//           </label>
//           <p className="text-sm text-gray-500">Automatically backup data</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.autoBackup}
//           onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
      
//       <div className="flex items-center justify-between">
//         <div>
//           <label className="text-sm font-medium text-gray-700">
//             Compression Enabled
//           </label>
//           <p className="text-sm text-gray-500">Compress backup files</p>
//         </div>
//         <input
//           type="checkbox"
//           checked={settings.compressionEnabled}
//           onChange={(e) => handleSettingChange('compressionEnabled', e.target.checked)}
//           className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//         />
//       </div>
//     </div>
//   );

//   const renderUserSettings = () => (
//     <div className="space-y-6">
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             First Name
//           </label>
//           <input
//             type="text"
//             value={settings.firstName}
//             onChange={(e) => handleSettingChange('firstName', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
        
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Last Name
//           </label>
//           <input
//             type="text"
//             value={settings.lastName}
//             onChange={(e) => handleSettingChange('lastName', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Username
//         </label>
//         <input
//           type="text"
//           value={settings.username}
//           onChange={(e) => handleSettingChange('username', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Email
//         </label>
//         <input
//           type="email"
//           value={settings.email}
//           onChange={(e) => handleSettingChange('email', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         />
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Password
//         </label>
//         <div className="relative">
//           <input
//             type={showPassword ? "text" : "password"}
//             value={settings.password}
//             onChange={(e) => handleSettingChange('password', e.target.value)}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <button
//             type="button"
//             onClick={() => setShowPassword(!showPassword)}
//             className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//           >
//             {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
//           </button>
//         </div>
//       </div>
      
//       <div>
//         <label className="block text-sm font-medium text-gray-700 mb-2">
//           Role
//         </label>
//         <select
//           value={settings.role}
//           onChange={(e) => handleSettingChange('role', e.target.value)}
//           className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
//         >
//           <option value="Administrator">Administrator</option>
//           <option value="Manager">Manager</option>
//           <option value="Employee">Employee</option>
//         </select>
//       </div>
//     </div>
//   );

//   const renderTabContent = () => {
//     switch (activeTab) {
//       case 'general': return renderGeneralSettings();
//       case 'camera': return renderCameraSettings();
//       case 'notifications': return renderNotificationSettings();
//       case 'security': return renderSecuritySettings();
//       case 'database': return renderDatabaseSettings();
//       case 'user': return renderUserSettings();
//       default: return renderGeneralSettings();
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 py-8">
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
//             System Settings
//           </h1>
//           <p className="text-lg text-gray-600">
//             Configure and customize your attendance system
//           </p>
//         </div>

//         <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//           {/* Tab Navigation */}
//           <div className="border-b border-gray-200">
//             <nav className="flex space-x-8 px-6">
//               {tabs.map((tab) => {
//                 const Icon = tab.icon;
//                 return (
//                   <button
//                     key={tab.id}
//                     onClick={() => setActiveTab(tab.id)}
//                     className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
//                       activeTab === tab.id
//                         ? 'border-blue-500 text-blue-600'
//                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
//                     }`}
//                   >
//                     <Icon className="w-4 h-4" />
//                     <span>{tab.name}</span>
//                   </button>
//                 );
//               })}
//             </nav>
//           </div>

//           {/* Tab Content */}
//           <div className="p-6">
//             {renderTabContent()}
//           </div>

//           {/* Action Buttons */}
//           <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
//             <div className="flex justify-between">
//               <button
//                 onClick={resetSettings}
//                 className="flex items-center space-x-2 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
//               >
//                 <RefreshCw className="w-4 h-4" />
//                 <span>Reset to Default</span>
//               </button>
//               <button
//                 onClick={saveSettings}
//                 className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
//               >
//                 <Save className="w-4 h-4" />
//                 <span>Save Settings</span>
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SettingsPage;
