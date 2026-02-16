import React, { useState, useEffect } from 'react';
import { database } from '../../firebaseConfig';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';

export default function EquipmentList() {
  const [equipments, setEquipments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    type: 'Pompe',
    serialNumber: '',
    installDate: new Date().toISOString().split('T')[0]
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const equipmentsRef = ref(database, `equipments/${user.uid}`);
    onValue(equipmentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setEquipments(Object.entries(data).map(([key, val]) => ({ ...val, key })));
      } else {
        setEquipments([]);
      }
    });
  }, [user]);

  const handleAddEquipment = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      const equipmentsRef = ref(database, `equipments/${user.uid}`);
      const newEquipRef = push(equipmentsRef);
      
      await set(newEquipRef, {
        id: newEquipRef.key,
        ...formData,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastInspection: null
      });

      setFormData({
        name: '',
        location: '',
        type: 'Pompe',
        serialNumber: '',
        installDate: new Date().toISOString().split('T')[0]
      });
      setShowForm(false);
      alert('Équipement ajouté avec succès!');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleDeleteEquipment = async (key) => {
    if (!user || !window.confirm('Êtes-vous sûr?')) return;

    try {
      const equipmentRef = ref(database, `equipments/${user.uid}/${key}`);
      await remove(equipmentRef);
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-6">Équipements</h1>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded mb-6 hover:bg-blue-600"
        >
          + Ajouter Équipement
        </button>

        {showForm && (
          <form onSubmit={handleAddEquipment} className="bg-white p-6 rounded-lg shadow-md mb-6 max-w-2xl">
            <input
              type="text"
              placeholder="Nom"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
              required
            />
            <input
              type="text"
              placeholder="Localisation"
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
              required
            />
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            >
              <option>Pompe</option>
              <option>Moteur</option>
              <option>Valve</option>
              <option>Capteur</option>
              <option>Compresseur</option>
              <option>Autre</option>
            </select>
            <input
              type="text"
              placeholder="Numéro de série"
              value={formData.serialNumber}
              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <input
              type="date"
              value={formData.installDate}
              onChange={(e) => setFormData({...formData, installDate: e.target.value})}
              className="w-full p-2 mb-4 border border-gray-300 rounded"
            />
            <button
              type="submit"
              className="w-full bg-green-500 text-white p-2 rounded hover:bg-green-600"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="w-full bg-gray-400 text-white p-2 rounded mt-2 hover:bg-gray-500"
            >
              Annuler
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {equipments.map((eq) => (
            <div key={eq.key} className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold">{eq.name}</h2>
              <p className="text-gray-600">📍 {eq.location}</p>
              <p className="text-gray-600">🏷️ {eq.type}</p>
              <p className="text-sm text-gray-500">SN: {eq.serialNumber}</p>
              <p className="text-sm text-gray-500">Installation: {eq.installDate}</p>
              <p className="mt-2">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  {eq.status === 'active' ? '✅ Actif' : '⚠️ Inactif'}
                </span>
              </p>
              <button
                onClick={() => handleDeleteEquipment(eq.key)}
                className="mt-4 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>

        {equipments.length === 0 && !showForm && (
          <p className="text-gray-600 text-center py-8">Aucun équipement. Commencez par ajouter un!</p>
        )}
      </div>
    </div>
  );
}
