import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';

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
  const [sendingTest, setSendingTest] = useState(false);

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
        text: error.response?.data?.detail || 'Failed to save preferences'
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

  const handleTestSendReminders = async () => {
    setSendingTest(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await notificationService.testSendReminders();
      const { results } = response;

      let message = '';
      if (results.tomorrow_reminders > 0 || results.today_reminders > 0) {
        message = `Sent ${results.tomorrow_reminders} 24-hour reminder(s) and ${results.today_reminders} today reminder(s). Check your notification center!`;
      } else {
        message = 'No installations found for today or tomorrow. Create an order with install date set to today or tomorrow to test.';
      }

      if (results.errors.length > 0) {
        message += ` Errors: ${results.errors.join(', ')}`;
      }

      setMessage({
        type: results.errors.length > 0 ? 'error' : 'success',
        text: message
      });
    } catch (error) {
      console.error('Failed to send test reminders:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Failed to send test reminders'
      });
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-green-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ←
            </button>
            <h1 className="text-3xl font-bold">Notification Settings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Settings Card */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Manage Your Notifications
          </h2>

          {/* Email Notifications */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📧</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Email Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-600 ml-8">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📱</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    SMS Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-600 ml-8">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {preferences.sms_notifications && (
              <div className="ml-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Include country code (e.g., +1 for US)
                </p>
              </div>
            )}
          </div>

          {/* Browser Notifications */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🌐</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Browser Notifications
                  </h3>
                </div>
                <p className="text-sm text-gray-600 ml-8">
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
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {preferences.browser_notifications && (
              <div className="ml-8 space-y-3">
                {browserPermission === 'default' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 mb-2">
                      Browser notifications require your permission
                    </p>
                    <button
                      onClick={handleRequestBrowserPermission}
                      className="text-sm bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                    >
                      Enable Browser Notifications
                    </button>
                  </div>
                )}

                {browserPermission === 'denied' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-800">
                      Browser notifications are blocked. Please enable them in
                      your browser settings.
                    </p>
                  </div>
                )}

                {browserPermission === 'granted' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-green-800">
                        ✓ Browser notifications are enabled
                      </p>
                      <button
                        onClick={handleTestNotification}
                        className="text-sm bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
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
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-900 mb-2">
              📋 What you'll receive:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 ml-4">
              <li>• 24-hour reminders before installations</li>
              <li>• Same-day notifications for today's installs</li>
              <li>• Important order updates</li>
            </ul>
          </div>

          {/* Test Notifications Section */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-purple-900 mb-3">
              🧪 Test Your Notifications
            </h4>
            <p className="text-sm text-purple-800 mb-3">
              Click the button below to send test reminders for any orders you
              have scheduled for today or tomorrow.
            </p>
            <button
              onClick={handleTestSendReminders}
              disabled={sendingTest}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {sendingTest ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Sending Test Notifications...
                </span>
              ) : (
                'Send Test Notifications Now'
              )}
            </button>
            <p className="text-xs text-purple-600 mt-2">
              Note: Make sure you have at least one order with install date set
              to today or tomorrow
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-700 to-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-800 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
