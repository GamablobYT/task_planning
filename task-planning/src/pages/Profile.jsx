import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../utils/api';
import useStore from '../store/store';
import ErrorToast from '../components/ErrorToast';
import modelsList from '../consts/models';

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [enabledModels, setEnabledModels] = useState(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { role } = useStore();

  // Convert models object to array format
  const models = Object.entries(modelsList).map(([displayName, modelId]) => ({
    id: modelId,
    name: modelId,
    display_name: displayName
  }));

  // Filter models based on search term
  const filteredModels = models.filter(model =>
    model.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    model.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    fetchProfileData();
    loadEnabledModels();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/users/profile/');
      setProfileData(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch profile data:', error);
      setError('Failed to load profile information. Please try again.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadEnabledModels = () => {
    const saved = localStorage.getItem('enabledModels');
    if (saved) {
      setEnabledModels(new Set(JSON.parse(saved)));
    }
  };

  const saveEnabledModels = () => {
    localStorage.setItem('enabledModels', JSON.stringify([...enabledModels]));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const toggleModel = (modelId) => {
    const newEnabledModels = new Set(enabledModels);
    if (newEnabledModels.has(modelId)) {
      newEnabledModels.delete(modelId);
    } else {
      newEnabledModels.add(modelId);
    }
    setEnabledModels(newEnabledModels);
  };

  const handleBackToChat = () => {
    navigate('/chat');
  };

  const renderProfileField = (key, value) => {
    if (!value || key === 'id') return null;
    
    const formatKey = (str) => {
      return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const formatValue = (val) => {
      if (key.includes('date') || key.includes('time')) {
        return new Date(val).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          ...(val.includes('T') ? { hour: '2-digit', minute: '2-digit' } : {})
        });
      }
      if (typeof val === 'boolean') {
        return val ? 'Yes' : 'No';
      }
      return val.toString();
    };

    return (
      <div key={key}>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          {formatKey(key)}
        </label>
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-slate-100">
          {formatValue(value)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ErrorToast
        show={showError}
        onClose={() => setShowError(false)}
        title="Error"
        message={error}
        duration={5000}
      />
      
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 border-b border-slate-600/80">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <h1 className="text-xl font-semibold text-sky-400">Profile Information</h1>
            <button
              onClick={handleBackToChat}
              className="bg-slate-700 hover:bg-slate-600 text-slate-100 
                         border border-slate-600 rounded-lg py-2 px-4
                         transition-colors duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Chat
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Profile Information */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-600/80 rounded-lg p-6 max-h-[80%] overflow-auto shadow-xl">
              <h2 className="text-lg font-semibold text-sky-400 mb-4">Profile Details</h2>
              
              {profileData ? (
                <div className="space-y-6">
                  {/* Profile Picture Placeholder */}
                  <div className="flex justify-center">
                    <div className="w-24 h-24 bg-slate-700 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Dynamic Profile Fields */}
                  <div className="space-y-4">
                    {Object.entries(profileData).map(([key, value]) => 
                      renderProfileField(key, value)
                    )}
                    
                    {/* Role from store */}
                    {role && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-slate-100 capitalize">
                          {role}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={fetchProfileData}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-medium
                                 py-2 px-4 rounded-lg transition-colors duration-200"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-slate-300 mb-4">No profile information available.</p>
                  <button
                    onClick={fetchProfileData}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-medium
                               py-2 px-4 rounded-lg transition-colors duration-200"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {/* Models Configuration */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-600/80 rounded-lg p-6 max-h-[80%] overflow-auto shadow-xl">
              <h2 className="text-lg font-semibold text-sky-400 mb-4">Model Preferences</h2>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-300 mb-4">
                  Select which models you want to use in your chats:
                </p>
                
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search models..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 
                               rounded-lg text-slate-100 placeholder-slate-400
                               focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-300"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {filteredModels.length > 0 ? (
                    filteredModels.map((model) => (
                      <label
                        key={model.id}
                        className="flex items-center p-3 bg-slate-700/30 border border-slate-600 
                                   rounded-lg hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={enabledModels.has(model.id)}
                          onChange={() => toggleModel(model.id)}
                          className="w-4 h-4 text-sky-500 bg-slate-700 border-slate-600 
                                     rounded focus:ring-sky-400 focus:ring-2"
                        />
                        <div className="ml-3 flex-1">
                          <div className="text-slate-100 font-medium">
                            {model.display_name}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            {model.id}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-slate-400">
                        No models found matching "{searchTerm}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-600">
                  <button
                    onClick={saveEnabledModels}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-medium
                               py-2 px-4 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    Save Preferences
                  </button>
                  
                  {saveSuccess && (
                    <div className="flex items-center text-green-400 text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Saved successfully!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
