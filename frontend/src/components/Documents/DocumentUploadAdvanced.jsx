import React, { useState, useRef } from 'react';
import { storage, database } from '../../firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { push, set, ref as dbRef } from 'firebase/database';
import { useAuth } from '../../hooks/useAuth';
import Navbar from '../Layout/Navbar';

export default function DocumentUploadAdvanced() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [linkedChecklistId, setLinkedChecklistId] = useState('');
  const [tags, setTags] = useState('');
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Créer un aperçu pour les images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload vers Firebase Storage
      const timestamp = Date.now();
      const storagePath = `documents/${user.uid}/${timestamp}-${file.name}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Sauvegarder metadata dans Realtime Database
      const docsRef = dbRef(database, `documents/${user.uid}`);
      const newDocRef = push(docsRef);

      await set(newDocRef, {
        id: newDocRef.key,
        filename: file.name,
        type: file.type.split('/')[1] || 'unknown',
        size: file.size,
        url: downloadURL,
        linkedChecklistId: linkedChecklistId || null,
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        metadata: {
          mimetype: file.type
        }
      });

      alert('Document uploadé avec succès!');
      setFile(null);
      setPreview(null);
      setLinkedChecklistId('');
      setTags('');
      fileInputRef.current.value = '';
    } catch (error) {
      alert('Erreur: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="max-w-2xl mx-auto py-12 px-4">
        <h1 className="text-4xl font-bold mb-6">Uploader des Documents</h1>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500"
          >
            <p className="text-gray-600 mb-2">Cliquez ou glissez un fichier</p>
            <p className="text-sm text-gray-500">PDF, Excel, Images, Vidéos acceptés</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mov"
          />

          {preview && (
            <div className="mt-6">
              <p className="font-semibold mb-2">Aperçu:</p>
              <img src={preview} alt="preview" className="max-w-full h-auto rounded" />
            </div>
          )}

          {file && (
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <p><strong>Fichier:</strong> {file.name}</p>
              <p><strong>Taille:</strong> {(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>Type:</strong> {file.type}</p>
            </div>
          )}

          <input
            type="text"
            placeholder="ID Checklist (optionnel)"
            value={linkedChecklistId}
            onChange={(e) => setLinkedChecklistId(e.target.value)}
            className="w-full p-2 mt-4 border border-gray-300 rounded"
          />

          <input
            type="text"
            placeholder="Tags (séparés par des virgules)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full p-2 mt-4 border border-gray-300 rounded"
          />

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-6 bg-blue-500 text-white p-3 rounded font-bold hover:bg-blue-600 disabled:bg-gray-400"
          >
            {uploading ? 'Upload en cours...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}
