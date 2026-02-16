import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Dashboard from './components/Dashboard/Dashboard';
import ChecklistList from './components/Checklists/ChecklistList';
import DocumentUpload from './components/Documents/DocumentUpload';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/checklists" element={<ProtectedRoute><ChecklistList /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentUpload /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
import EquipmentList from './components/Equipments/EquipmentList';
import ChecklistForm from './components/Checklists/ChecklistForm';
import DocumentUploadAdvanced from './components/Documents/DocumentUploadAdvanced';
import ApprovalQueue from './components/Approvals/ApprovalQueue';
import DashboardAdvanced from './components/Dashboard/DashboardAdvanced';

// Dans les routes:
<Route path="/equipments" element={<ProtectedRoute><EquipmentList /></ProtectedRoute>} />
<Route path="/checklists/new" element={<ProtectedRoute><ChecklistForm /></ProtectedRoute>} />
<Route path="/documents/upload" element={<ProtectedRoute><DocumentUploadAdvanced /></ProtectedRoute>} />
<Route path="/approvals" element={<ProtectedRoute><ApprovalQueue /></ProtectedRoute>} />
<Route path="/dashboard" element={<ProtectedRoute><DashboardAdvanced /></ProtectedRoute>} />
