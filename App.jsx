import React, { useState, useEffect } from 'react';
import { Upload, LogOut, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react';

export default function AppFotosEscola() {
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [accessToken, setAccessToken] = useState(null);

  const CLIENT_ID = process.env.REACT_APP_CLIENT_ID;
  const CLIENT_SECRET = process.env.REACT_APP_CLIENT_SECRET;
  const REDIRECT_URI = 'https://app-fotos-ie-gornal.vercel.app/callback';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code && !accessToken) {
      exchangeCodeForToken(code);
    }
  }, []);

  const exchangeCodeForToken = async (code) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      const data = await response.json();
      
      if (data.access_token) {
        setAccessToken(data.access_token);
        await loadUserInfo(data.access_token);
        await loadFolders(data.access_token);
        setMessage('Connectat correctament!');
        setMessageType('success');
      }
    } catch (error) {
      setMessage('Error: ' + error.message);
      setMessageType('error');
    }
  };

  const loadUserInfo = async (token) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const loadFolders = async (token) => {
    try {
      const folderNames = [
        'INFANTIL 3', 'INFANTIL 4', 'INFANTIL 5',
        '1R PRI', '2N PRI', '3R PRI', '4T PRI', '5È PRI', '6È PRI',
        '1R ESO', '2N ESO', '3R ESO', '4T ESO',
        'FOTOS MESTRES'
      ];

      const query = `name in (${folderNames.map(f => `"${f}"`).join(',')}) and trashed=false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();
      const foundFolders = data.files || [];
      setFolders(foundFolders.map(f => ({ id: f.id, name: f.name })));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLogin = () => {
    const scope = 'https://www.googleapis.com/auth/drive.file';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline`;
    
    window.location.href = authUrl;
  };

  const handleFileSelect = async (e) => {
    if (!selectedFolder) {
      setMessage('Selecciona una carpeta primer!');
      setMessageType('error');
      return;
    }

    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setMessage('Pujant fotos...');
    setMessageType('info');

    try {
      let uploadedCount = 0;

      for (const file of files) {
        const formData = new FormData();
        const metadata = {
          name: file.name,
          parents: [selectedFolder.id],
        };
        
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        formData.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        if (response.ok) {
          uploadedCount++;
        }
      }

      setMessage(`✓ ${uploadedCount} foto(s) pujada(s) a "${selectedFolder.name}" correctament!`);
      setMessageType('success');
      e.target.value = '';
    } catch (error) {
      setMessage('Error: ' + error.message);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedFolder(null);
    setFolders([]);
    setAccessToken(null);
    setMessage('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">App Fotos</h1>
            <p className="text-gray-600">IE Gornal</p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2 mb-4"
          >
            <Upload className="w-5 h-5" />
            Connectar amb Google
          </button>

          <p className="text-xs text-gray-500 text-center">
            Usa el teu email @ie-gornal.cat per connectar-te
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">App Fotos IE Gornal</h1>
            <p className="text-blue-100">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition"
          >
            <LogOut className="w-4 h-4" />
            Desconnectar
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 mt-8">
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            messageType === 'error' ? 'bg-red-100 text-red-800 border border-red-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {messageType === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            {message}
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Selecciona una carpeta</h2>
          
          {folders.length === 0 ? (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-lg">
              Carregant carpetes...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    setSelectedFolder(folder);
                    setMessage('');
                  }}
                  className={`p-6 rounded-xl transition transform hover:scale-105 flex items-center gap-3 font-semibold text-lg ${
                    selectedFolder?.id === folder.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-blue-400 shadow'
                  }`}
                >
                  <FolderOpen className="w-6 h-6" />
                  {folder.name}
                </button>
              ))}
            </div>
          )}

          {selectedFolder && (
            <div className="bg-white rounded-xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                Carpeta seleccionada: <span className="text-blue-600">{selectedFolder.name}</span>
              </h3>

              <div className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center bg-blue-50 hover:bg-blue-100 transition">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id="fileInput"
                />
                <label
                  htmlFor="fileInput"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-lg font-semibold text-gray-800">
                    {uploading ? 'Pujant...' : 'Clica per seleccionar fotos'}
                  </span>
                  <span className="text-sm text-gray-600">
                    o arrossega-les aquí
                  </span>
                </label>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                Les fotos es guardaran directament a la carpeta "{selectedFolder.name}"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
