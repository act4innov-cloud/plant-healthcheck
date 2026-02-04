// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/firebaseConfig.js
// Firebase configuration for frontend
// ═══════════════════════════════════════════════════════════════════════════

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);

export default app;


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/context/AuthContext.jsx
// Authentication context for the entire app
// ═══════════════════════════════════════════════════════════════════════════

import React, { createContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, database } from '../firebaseConfig';
import { ref, get } from 'firebase/database';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Get user data from Firebase database
        try {
          const userRef = ref(database, `users/${currentUser.uid}`);
          const snapshot = await get(userRef);
          const data = snapshot.val();
          setUserData(data);
        } catch (error) {
          console.error('❌ Error fetching user data:', error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/authService.js
// Authentication service functions
// ═══════════════════════════════════════════════════════════════════════════

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth, database } from '../firebaseConfig';
import { ref, set } from 'firebase/database';

export const authService = {
  // Register new user
  register: async (email, password, displayName, role = 'user') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await updateProfile(userCredential.user, {
        displayName
      });

      // Save user data to database
      const userRef = ref(database, `users/${userCredential.user.uid}`);
      await set(userRef, {
        uid: userCredential.user.uid,
        email,
        displayName,
        role,
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      return userCredential.user;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      return userCredential.user;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Logout user
  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(error.message);
    }
  },

  // Get current user token
  getIdToken: async () => {
    if (!auth.currentUser) return null;
    return await auth.currentUser.getIdToken();
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/services/checklistService.js
// Checklist API operations
// ═══════════════════════════════════════════════════════════════════════════

import axios from 'axios';
import { auth } from '../firebaseConfig';

const API_URL = import.meta.env.VITE_API_URL_PROD || import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const checklistService = {
  // Get all checklists
  getAllChecklists: async () => {
    const response = await api.get('/checklists');
    return response.data;
  },

  // Get single checklist
  getChecklist: async (id) => {
    const response = await api.get(`/checklists/${id}`);
    return response.data;
  },

  // Create checklist
  createChecklist: async (checklistData) => {
    const response = await api.post('/checklists', checklistData);
    return response.data;
  },

  // Update checklist
  updateChecklist: async (id, checklistData) => {
    const response = await api.put(`/checklists/${id}`, checklistData);
    return response.data;
  },

  // Delete checklist
  deleteChecklist: async (id) => {
    const response = await api.delete(`/checklists/${id}`);
    return response.data;
  },

  // Submit for approval
  submitForApproval: async (id) => {
    const response = await api.put(`/checklists/${id}`, {
      status: 'pending_approval'
    });
    return response.data;
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/Auth/Login.jsx
// Login component
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import toast from 'react-hot-toast';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authService.login(email, password);
      toast.success('✅ Logged in successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(`❌ Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          🏭 Plant HealthCheck
        </h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
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

        <p className="text-center text-gray-600 mt-4">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Register here
          </a>
        </p>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/Checklists/ChecklistForm.jsx
// Form to create/edit checklists
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checklistService } from '../../services/checklistService';
import toast from 'react-hot-toast';

export const ChecklistForm = () => {
  const [formData, setFormData] = useState({
    template: 'ElecCheck',
    items: [],
    metadata: {
      location: '',
      inspectorName: '',
      date: new Date().toISOString().split('T')[0]
    }
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const checklistTemplates = {
    'ElecCheck': {
      name: 'Electrical Inspection',
      items: ['Voltage', 'Current', 'Ground', 'Insulation']
    },
    'MecaCheck': {
      name: 'Mechanical Inspection',
      items: ['Alignment', 'Vibration', 'Temperature', 'Noise']
    },
    'InstruCheck': {
      name: 'Instrumentation Inspection',
      items: ['Calibration', 'Functionality', 'Accuracy', 'Maintenance']
    }
  };

  const handleTemplateChange = (e) => {
    const template = e.target.value;
    setFormData({
      ...formData,
      template,
      items: checklistTemplates[template].items.map(item => ({
        name: item,
        status: 'pending',
        notes: '',
        photo: null
      }))
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await checklistService.createChecklist(formData);
      toast.success('✅ Checklist created successfully!');
      navigate('/checklists');
    } catch (error) {
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">📋 Create New Checklist</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Checklist Type
          </label>
          <select
            value={formData.template}
            onChange={handleTemplateChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(checklistTemplates).map(([key, value]) => (
              <option key={key} value={key}>
                {value.name}
              </option>
            ))}
          </select>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.metadata.location}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, location: e.target.value }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Facility location"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inspector Name
            </label>
            <input
              type="text"
              value={formData.metadata.inspectorName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  metadata: { ...formData.metadata, inspectorName: e.target.value }
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Your name"
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Items to Check</h2>
          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {item.name}
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) => {
                    const newItems = [...formData.items];
                    newItems[index].notes = e.target.value;
                    setFormData({ ...formData, items: newItems });
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Add notes..."
                  rows="2"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? '⏳ Creating...' : '✅ Create Checklist'}
        </button>
      </form>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/components/Documents/DocumentUpload.jsx
// Document upload component
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import axios from 'axios';
import { auth } from '../../firebaseConfig';
import toast from 'react-hot-toast';

export const DocumentUpload = ({ checklistId }) => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL_PROD || import.meta.env.VITE_API_URL;

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('checklistId', checklistId);

      const token = await auth.currentUser?.getIdToken();
      const response = await axios.post(
        `${API_URL}/documents/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      toast.success('✅ File uploaded successfully!');
    } catch (error) {
      toast.error(`❌ Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-6 border-2 border-dashed rounded-lg transition ${
        dragActive
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-700 mb-2">
          📁 Drag and drop your documents
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Supported: PDF, JPEG, PNG (Max 50MB)
        </p>

        <label className="inline-block">
          <input
            type="file"
            onChange={(e) => handleDrop({ dataTransfer: { files: e.target.files } })}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            disabled={loading}
          />
          <span className="px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700">
            {loading ? '⏳ Uploading...' : '📤 Choose File'}
          </span>
        </label>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════
// FILE: src/hooks/useChecklists.js
// Custom hook for checklist operations
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { checklistService } from '../services/checklistService';

export const useChecklists = () => {
  const [checklists, setChecklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const response = await checklistService.getAllChecklists();
      setChecklists(response.data || {});
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('❌ Error loading checklists:', err);
    } finally {
      setLoading(false);
    }
  };

  const createChecklist = async (data) => {
    try {
      const response = await checklistService.createChecklist(data);
      setChecklists({
        ...checklists,
        [response.data.id]: response.data
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateChecklist = async (id, data) => {
    try {
      const response = await checklistService.updateChecklist(id, data);
      setChecklists({
        ...checklists,
        [id]: response.data
      });
      return response.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteChecklist = async (id) => {
    try {
      await checklistService.deleteChecklist(id);
      const newChecklists = { ...checklists };
      delete newChecklists[id];
      setChecklists(newChecklists);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    checklists,
    loading,
    error,
    createChecklist,
    updateChecklist,
    deleteChecklist,
    reload: loadChecklists
  };
};
