import React, { useState, useEffect } from 'react';
import { database } from '../../firebaseConfig';
import { ref, onValue, push, set } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Layout/Navbar';

export default function ChecklistForm() {
  const [equipments, setEquipments] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    equipmentId: '',
    items: [{ id: '1', title: '', type: 'checkbox', required: true }]
  });
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const equipmentsRef = ref(database, `equipments/${user.uid}`);
    onValue(equipmentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setEquipments(Object.entries(data).map(([key, val]) => ({ ...val, key })));
      }
    });
  }, [user]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { id: Date.now().toString(), title: '', type: 'checkbox', required: true }
      ]
    });
  };

  const handleRemoveItem = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({...formData, items: newItems});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !formData.title || !formData.equipmentId) {
      alert('Remplissez tous les champs requis!');
      return;
    }

    try {
      const checklistsRef = ref(database, `checklists/${user.uid}`);
      const newChecklistRef = push(checklistsRef);

      await set(newChecklistRef, {
        id: newChecklistRef.key,
        title: formData.title,
        description: formData.description,
        equipmentId: formData.equipmentId,
        items: formData.items.map(item => ({
          ...item,
          completed: false,
          value: null,
          evidence: null
        })),
        status: 'draft',
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
        approvals: {
          intervenant: { status: 'pending' },
          responsable: { status: 'pending' },
          supervisor: { status: 'pending' },
          admin: { status: 'pending' }
        }
      });

      alert('Checklist créée!');
      navigate('/checklists');
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-4xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-6">Créer une Checklist</h1>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
          <input
            type="text"
            placeholder="Titre"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="w-full p-2 mb-4 border border-gray-300 rounded text-lg font-semibold"
            required
          />

          <textarea
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-2 mb-4 border border-gray-300 rounded"
            rows="3"
          />

          <select
            value={formData.equipmentId}
            onChange={(e) => setFormData({...formData, equipmentId: e.target.value})}
            className="w-full p-2 mb-6 border border-gray-300 rounded"
            required
          >
            <option value="">Sélectionner un équipement</option>
            {equipments.map((eq) => (
              <option key={eq.key} value={eq.id}>
                {eq.name} ({eq.type})
              </option>
            ))}
          </select>

          <h2 className="text-2xl font-bold mb-4">Éléments de Checklist</h2>

          {formData.items.map((item, index) => (
            <div key={item.id} className="mb-4 p-4 border border-gray-200 rounded">
              <input
                type="text"
                placeholder="Titre de l'élément"
                value={item.title}
                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                className="w-full p-2 mb-2 border border-gray-300 rounded"
                required
              />

              <select
                value={item.type}
                onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                className="w-full p-2 mb-2 border border-gray-300 rounded"
              >
                <option value="checkbox">Case à cocher</option>
                <option value="text">Texte</option>
                <option value="number">Nombre</option>
                <option value="select">Sélection</option>
              </select>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(e) => handleItemChange(index, 'required', e.target.checked)}
                  className="mr-2"
                />
                <span>Obligatoire</span>
              </label>

              {formData.items.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="mt-2 bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                >
                  Supprimer
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddItem}
            className="w-full bg-blue-500 text-white p-2 rounded mb-6 hover:bg-blue-600"
          >
            + Ajouter un Élément
          </button>

          <button
            type="submit"
            className="w-full bg-green-500 text-white p-3 rounded font-bold hover:bg-green-600"
          >
            Créer la Checklist
          </button>
        </form>
      </div>
    </div>
  );
}
