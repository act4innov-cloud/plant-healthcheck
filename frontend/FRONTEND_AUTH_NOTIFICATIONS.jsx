// ═══════════════════════════════════════════════════════════════════════════
// FILE: frontend/src/components/Auth/Login.jsx
// Complete Login Component with Firebase Auth
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import toast from 'react-hot-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      // Get user data from backend
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch user data');

      const userData = await response.json();

      // Store token and user data
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(userData.data));

      toast.success('✅ Logged in successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed');
      toast.error(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
          🏭
        </h1>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Plant HealthCheck
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? '⏳ Logging in...' : '🔓 Login'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              Create one
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: frontend/src/components/Auth/Register.jsx
// Complete Register Component with Firebase Auth
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import toast from 'react-hot-toast';

export const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      setError('Please fill in all required fields');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      const token = await userCredential.user.getIdToken();

      // Register via backend API
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            email: formData.email,
            displayName: formData.displayName,
            phoneNumber: formData.phoneNumber || null
          })
        }
      );

      if (!response.ok) throw new Error('Registration failed');

      const result = await response.json();

      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(result.data));

      toast.success('✅ Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error('Register error:', err);
      setError(err.message || 'Registration failed');
      toast.error(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
          Create Account
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+1234567890"
            />
            <p className="text-xs text-gray-500 mt-1">Format: +1234567890</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? '⏳ Creating account...' : '✅ Create Account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: frontend/src/components/Notifications/NotificationCenter.jsx
// Notification Center with Email/SMS Preferences
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadPreferences();
  }, [user]);

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/preferences`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data.preferences);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const updatePreferences = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/preferences`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ preferences })
        }
      );

      if (response.ok) {
        toast.success('✅ Preferences updated');
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      toast.error('❌ Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(
        `${import.meta.env.VITE_API_URL}/notifications/${notificationId}/read`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">📬 Notifications</h2>

        {notifications.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No notifications yet</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 border rounded-lg cursor-pointer transition ${
                  notif.read
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-blue-50 border-blue-300'
                }`}
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800">{notif.title}</h3>
                    <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!notif.read && (
                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">⚙️ Preferences</h2>

        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="emailNotif"
              checked={preferences.emailNotifications}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  emailNotifications: e.target.checked
                })
              }
              className="mr-3 w-4 h-4"
            />
            <label htmlFor="emailNotif" className="text-gray-700">
              📧 Receive email notifications
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="smsNotif"
              checked={preferences.smsNotifications}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  smsNotifications: e.target.checked
                })
              }
              className="mr-3 w-4 h-4"
            />
            <label htmlFor="smsNotif" className="text-gray-700">
              📱 Receive SMS notifications
            </label>
            <span className="text-xs text-gray-500 ml-2">(requires phone number)</span>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="pushNotif"
              checked={preferences.pushNotifications}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  pushNotifications: e.target.checked
                })
              }
              className="mr-3 w-4 h-4"
            />
            <label htmlFor="pushNotif" className="text-gray-700">
              🔔 Receive push notifications (browser)
            </label>
          </div>

          <button
            onClick={updatePreferences}
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? '⏳ Saving...' : '💾 Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: frontend/src/hooks/useAuth.js
// Custom hook for authentication
// ═══════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebaseConfig';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Fetch user data from backend
          const token = await firebaseUser.getIdToken();
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/auth/me`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );

          if (response.ok) {
            const data = await response.json();
            setUserData(data.data);
          }
        } else {
          setUser(null);
          setUserData(null);
        }
      } catch (err) {
        setError(err.message);
        console.error('Auth error:', err);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return {
    user,
    userData,
    loading,
    error,
    isAuthenticated: !!user
  };
};
