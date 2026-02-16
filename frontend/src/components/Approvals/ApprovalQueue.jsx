import React, { useState, useEffect } from 'react';
import { database } from '../../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';

export default function ApprovalQueue() {
  const [checklists, setChecklists] = useState([]);
  const [userRole, setUserRole] = useState('intervenant');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Récupérer le rôle de l'utilisateur
    const userRef = ref(database, `users/${user.uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data?.role) setUserRole(data.role);
    });

    // Récupérer toutes les checklists
    const checklistsRef = ref(database, `checklists/${user.uid}`);
    onValue(checklistsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data).filter(cl => cl.status !== 'draft');
        setChecklists(list);
      }
    });
  }, [user]);

  const handleApprove = async (checklist, approved) => {
    if (!user) return;

    try {
      const updatePath = `checklists/${user.uid}/${checklist.id}/approvals/${userRole}`;
      const checklistRef = ref(database, updatePath);

      await update(checklistRef, {
        status: approved ? 'approved' : 'rejected',
        approvedBy: user.uid,
        approvedAt: new Date().toISOString()
      });

      // Vérifier si tous les niveaux sont approuvés
      const allApproved = Object.keys(checklist.approvals).every(level =>
        checklist.approvals[level].status === 'approved'
      );

      if (allApproved) {
        const clRef = ref(database, `checklists/${user.uid}/${checklist.id}`);
        await update(clRef, { status: 'approved' });
      }

      alert(approved ? 'Approuvé!' : 'Rejeté!');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const getApprovalStatus = (level) => {
    const status = checklists[0]?.approvals?.[level]?.status || 'pending';
    return {
      pending: '⏳ En attente',
      approved: '✅ Approuvé',
      rejected: '❌ Rejeté'
    }[status];
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-2">Approbations</h1>
        <p className="text-gray-600 mb-6">Rôle: <strong>{userRole}</strong></p>

        <div className="space-y-6">
          {checklists.map((cl) => (
            <div key={cl.id} className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold mb-2">{cl.title}</h2>
              <p className="text-gray-600 mb-4">{cl.description}</p>

              <div className="grid grid-cols-4 gap-4 mb-6">
                {['intervenant', 'responsable', 'supervisor', 'admin'].map((level) => (
                  <div key={level} className="p-3 bg-gray-100 rounded text-center">
                    <p className="font-semibold capitalize">{level}</p>
                    <p className="text-sm text-gray-600">{getApprovalStatus(level)}</p>
                  </div>
                ))}
              </div>

              {cl.approvals[userRole]?.status === 'pending' && (
                <div className="flex gap-4">
                  <button
                    onClick={() => handleApprove(cl, true)}
                    className="flex-1 bg-green-500 text-white p-2 rounded hover:bg-green-600 font-bold"
                  >
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => handleApprove(cl, false)}
                    className="flex-1 bg-red-500 text-white p-2 rounded hover:bg-red-600 font-bold"
                  >
                    ❌ Rejeter
                  </button>
                </div>
              )}

              {cl.approvals[userRole]?.status === 'approved' && (
                <p className="text-green-600 font-bold">✅ Vous avez approuvé le {cl.approvals[userRole]?.approvedAt}</p>
              )}

              {cl.approvals[userRole]?.status === 'rejected' && (
                <p className="text-red-600 font-bold">❌ Vous avez rejeté le {cl.approvals[userRole]?.approvedAt}</p>
              )}
            </div>
          ))}
        </div>

        {checklists.length === 0 && (
          <p className="text-gray-600 text-center py-8">Aucune checklist en attente d'approbation</p>
        )}
      </div>
    </div>
  );
}
