import React, { useState, useEffect } from 'react';
import { database } from '../../firebaseConfig';
import { ref, onValue } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';

export default function DashboardAdvanced() {
  const [stats, setStats] = useState({
    totalEquipments: 0,
    totalChecklists: 0,
    completedChecklists: 0,
    pendingApprovals: 0,
    totalDocuments: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Équipements
    const equipRef = ref(database, `equipments/${user.uid}`);
    onValue(equipRef, (snapshot) => {
      const data = snapshot.val();
      setStats(prev => ({ ...prev, totalEquipments: data ? Object.keys(data).length : 0 }));
    });

    // Checklists
    const checklistRef = ref(database, `checklists/${user.uid}`);
    onValue(checklistRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const total = Object.keys(data).length;
        const completed = Object.values(data).filter(cl => cl.status === 'approved').length;
        const pending = Object.values(data).filter(cl => cl.status === 'submitted').length;
        setStats(prev => ({
          ...prev,
          totalChecklists: total,
          completedChecklists: completed,
          pendingApprovals: pending
        }));
      }
    });

    // Documents
    const docRef = ref(database, `documents/${user.uid}`);
    onValue(docRef, (snapshot) => {
      const data = snapshot.val();
      setStats(prev => ({ ...prev, totalDocuments: data ? Object.keys(data).length : 0 }));
    });
  }, [user]);

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">ÉQUIPEMENTS</h3>
            <p className="text-4xl font-bold text-blue-500">{stats.totalEquipments}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">CHECKLISTS</h3>
            <p className="text-4xl font-bold text-orange-500">{stats.totalChecklists}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">APPROUVÉES</h3>
            <p className="text-4xl font-bold text-green-500">{stats.completedChecklists}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">EN ATTENTE</h3>
            <p className="text-4xl font-bold text-red-500">{stats.pendingApprovals}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">DOCUMENTS</h3>
            <p className="text-4xl font-bold text-purple-500">{stats.totalDocuments}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a href="/equipments" className="p-4 bg-blue-50 rounded hover:bg-blue-100">
              ⚙️ Gérer Équipements
            </a>
            <a href="/checklists/new" className="p-4 bg-orange-50 rounded hover:bg-orange-100">
              ✅ Nouvelle Checklist
            </a>
            <a href="/approvals" className="p-4 bg-red-50 rounded hover:bg-red-100">
              📋 Approvals
            </a>
            <a href="/documents" className="p-4 bg-purple-50 rounded hover:bg-purple-100">
              📄 Uploader Document
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
