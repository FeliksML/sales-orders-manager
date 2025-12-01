import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Smartphone, Globe, Bell } from 'lucide-react';
import notificationService from '../services/notificationService';
import { formatErrorMessage } from '../utils/errorHandler';

const NotificationSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    phone_number: '',
    email_notifications: true,
    sms_notifications: false,
    browser_notifications: true
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [browserPermission, setBrowserPermission] = useState('default');

  useEffect(() => {
    loadPreferences();
    checkBrowserPermission();
  }, []);

  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  };

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load notification preferences'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await notificationService.updatePreferences(preferences);
      setMessage({
        type: 'success',
        text: 'Notification preferences saved successfully!'
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({
        type: 'error',
        text: formatErrorMessage(error, 'Failed to save preferences')
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestBrowserPermission = async () => {
    const granted = await notificationService.requestBrowserPermission();
    checkBrowserPermission();
    if (granted) {
      setPreferences({ ...preferences, browser_notifications: true });
      setMessage({
        type: 'success',
        text: 'Browser notifications enabled!'
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } else {
      setMessage({
        type: 'error',
        text: 'Browser notifications permission denied'
      });
    }
  };

  const handleTestNotification = () => {
    notificationService.showBrowserNotification('Test Notification', {
      body: 'This is a test notification from Sales Order Manager',
      icon: '/icon.png'
    });
  };

  const glassCardStyle = {
    backgroundColor: 'rgba(0, 15, 33, 0.25)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 200, 255, 0.3)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.37), inset 0 0 80px rgba(0, 200, 255, 0.1)',
  };

  const pageBackground = {
    background: `
      radial-gradient(circle at 25% 25%, rgba(30, 58, 138, 0.3), transparent 25%),
      radial-gradient(circle at 75% 75%, rgba(20, 125, 190, 0.2), transparent 30%),
      radial-gradient(circle at 75% 25%, rgba(5, 150, 105, 0.2), transparent 25%),
      linear-gradient(142deg, #1e40af, #0d4f8b 30%, #067a5b 70%, #059669)
    `
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={pageBackground}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-8" style={pageBackground}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-lg text-white hover:scale-105 transition-transform"
            style={{
              backgroundColor: 'rgba(0, 15, 33, 0.3)',
              border: '1px solid rgba(0, 200, 255, 0.3)',
            }}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3) 0%, rgba(5, 150, 105, 0.3) 100%)',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              <Bell className="w-6 h-6 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Notification Settings</h1>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              backgroundColor: message.type === 'success'
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(239, 68, 68, 0.15)',
              border: `1px solid ${message.type === 'success'
                ? 'rgba(16, 185, 129, 0.4)'
                : 'rgba(239, 68, 68, 0.4)'}`,
            }}
          >
            <p className={message.type === 'success' ? 'text-emerald-300' : 'text-red-300'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Settings Card */}
        <div className="rounded-xl p-6" style={glassCardStyle}>
          <h2 className="text-xl font-bold text-white mb-6">
            Manage Your Notifications
          </h2>

          {/* Email Notifications */}
          <div className="mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 200, 255, 0.2)' }}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.3) 100%)',
                    }}
                  >
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Email Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-300 ml-12">
                  Receive installation reminders and updates via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.email_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      email_notifications: e.target.checked
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="mb-6 pb-6" style={{ borderBottom: '1px solid rgba(0, 200, 255, 0.2)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                    }}
                  >
                    <Smartphone className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    SMS Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-300 ml-12">
                  Receive text message reminders for installations
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sms_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      sms_notifications: e.target.checked
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {preferences.sms_notifications && (
              <div className="ml-12">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={preferences.phone_number || ''}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      phone_number: e.target.value
                    })
                  }
                  placeholder="+1 234 567 8900"
                  className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  style={{
                    backgroundColor: 'rgba(0, 15, 33, 0.4)',
                    border: '1px solid rgba(0, 200, 255, 0.3)',
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}
          </div>

          {/* Browser Notifications */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="p-2 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.3) 0%, rgba(14, 165, 233, 0.3) 100%)',
                    }}
                  >
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    Browser Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-300 ml-12">
                  Receive push notifications in your browser
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.browser_notifications}
                  onChange={(e) =>
                    setPreferences({
                      ...preferences,
                      browser_notifications: e.target.checked
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {preferences.browser_notifications && (
              <div className="ml-12 space-y-3">
                {browserPermission === 'default' && (
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                    }}
                  >
                    <p className="text-sm text-amber-300 mb-2">
                      Browser notifications require your permission
                    </p>
                    <button
                      onClick={handleRequestBrowserPermission}
                      className="text-sm px-4 py-2 rounded-lg text-white hover:scale-105 transition-transform"
                      style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.6) 0%, rgba(245, 158, 11, 0.6) 100%)',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                      }}
                    >
                      Enable Browser Notifications
                    </button>
                  </div>
                )}

                {browserPermission === 'denied' && (
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    <p className="text-sm text-red-300">
                      Browser notifications are blocked. Please enable them in
                      your browser settings.
                    </p>
                  </div>
                )}

                {browserPermission === 'granted' && (
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-emerald-300">
                        ✓ Browser notifications are enabled
                      </p>
                      <button
                        onClick={handleTestNotification}
                        className="text-sm px-4 py-2 rounded-lg text-white hover:scale-105 transition-transform"
                        style={{
                          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.6) 0%, rgba(5, 150, 105, 0.6) 100%)',
                          border: '1px solid rgba(16, 185, 129, 0.4)',
                        }}
                      >
                        Test Notification
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4" />
              What you'll receive:
            </h4>
            <ul className="text-sm text-emerald-200 space-y-1 ml-6">
              <li>• 24-hour reminders before installations</li>
              <li>• Same-day notifications for today's installs</li>
              <li>• Important order updates</li>
            </ul>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3 rounded-xl text-white font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.7), rgba(16, 185, 129, 0.7))',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: '0 4px 16px rgba(37, 99, 235, 0.3)'
              }}
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
