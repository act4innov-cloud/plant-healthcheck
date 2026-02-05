import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-2">Welcome</h2>
            <p className="text-gray-600">Hello, {user?.displayName || 'User'}!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
