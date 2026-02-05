import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-md">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Plant HealthCheck</h1>
        <div className="space-x-4">
          <Link to="/dashboard" className="hover:bg-blue-700 px-3 py-2 rounded">Dashboard</Link>
          <Link to="/checklists" className="hover:bg-blue-700 px-3 py-2 rounded">Checklists</Link>
          <Link to="/documents" className="hover:bg-blue-700 px-3 py-2 rounded">Documents</Link>
          <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 px-3 py-2 rounded">Logout</button>
        </div>
      </div>
    </nav>
  );
}
