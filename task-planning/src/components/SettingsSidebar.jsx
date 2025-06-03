import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/store';
import apiService from '../utils/api';
import ErrorToast from './ErrorToast';
import modelsList from '../consts/models';

// JSON Renderer Component
const JsonRenderer = ({ data, level = 0, onDataChange }) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [hoveredField, setHoveredField] = useState(null);
  const [addingField, setAddingField] = useState(null);
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  const toggleExpanded = (key) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  const handleSingleClick = (key, value, path) => {
    if (typeof value !== 'object' || value === null) {
      setEditingField(`${path.length > 0 ? path.join('.') + '.' : ''}${key}`);
      setEditValue(String(value));
    }
  };

  const handleEditSubmit = async (key, path) => {
    if (onDataChange) {
      let parsedValue = editValue;
      
      // Check if the value is wrapped in quotes - treat as string
      if ((editValue.startsWith('"') && editValue.endsWith('"')) || 
          (editValue.startsWith("'") && editValue.endsWith("'"))) {
        parsedValue = editValue.slice(1, -1); // Remove quotes and keep as string
      } else {
        // Try to parse as JSON if it looks like JSON
        if (editValue.trim().startsWith('{') || editValue.trim().startsWith('[')) {
          try {
            parsedValue = JSON.parse(editValue);
          } catch (e) {
            // If parsing fails, keep as string
          }
        } else if (editValue.toLowerCase() === 'true') {
          parsedValue = true;
        } else if (editValue.toLowerCase() === 'false') {
          parsedValue = false;
        } else if (editValue.toLowerCase() === 'null') {
          parsedValue = null;
        } else if (!isNaN(editValue) && editValue.trim() !== '') {
          // Check if it's an integer
          if (Number.isInteger(parseFloat(editValue))) {
            parsedValue = parseInt(editValue);
          } else {
            parsedValue = parseFloat(editValue);
          }
        }
        // Otherwise keep as string
      }
      
      const success = await onDataChange(path, key, parsedValue);
      if (success !== false) {
        setEditingField(null);
        setEditValue('');
      }
    }
  };

  const handleEditCancel = () => {
    setEditingField(null);
    setEditValue('');
  };

  const handleAddField = (path) => {
    setAddingField(path.join('.'));
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleAddFieldSubmit = async (path) => {
    if (newFieldKey && onDataChange) {
      let processedValue = newFieldValue;
      
      // Check if the value is wrapped in quotes - treat as string
      if ((newFieldValue.startsWith('"') && newFieldValue.endsWith('"')) || 
          (newFieldValue.startsWith("'") && newFieldValue.endsWith("'"))) {
        processedValue = newFieldValue.slice(1, -1); // Remove quotes and keep as string
      } else {
        // Try to parse as JSON if it looks like JSON
        if (newFieldValue.trim().startsWith('{') || newFieldValue.trim().startsWith('[')) {
          try {
            processedValue = JSON.parse(newFieldValue);
          } catch (e) {
            // If parsing fails, keep as string
          }
        } else if (newFieldValue.toLowerCase() === 'true') {
          processedValue = true;
        } else if (newFieldValue.toLowerCase() === 'false') {
          processedValue = false;
        } else if (newFieldValue.toLowerCase() === 'null') {
          processedValue = null;
        } else if (!isNaN(newFieldValue) && newFieldValue.trim() !== '') {
          // Check if it's an integer
          if (Number.isInteger(parseFloat(newFieldValue))) {
            processedValue = parseInt(newFieldValue);
          } else {
            processedValue = parseFloat(newFieldValue);
          }
        }
        // Otherwise keep as string
      }
      
      const success = await onDataChange(path, newFieldKey, processedValue);
      if (success !== false) {
        setAddingField(null);
        setNewFieldKey('');
        setNewFieldValue('');
      }
    }
  };

  const handleAddFieldCancel = () => {
    setAddingField(null);
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleRemoveField = (key, path) => {
    if (onDataChange) {
      onDataChange(path, key, undefined, true);
    }
  };

  const renderValue = (key, value, currentLevel, path = []) => {
    const currentPath = [...path, key];
    const fieldId = `${currentLevel}-${key}`;
    const editFieldId = `${path.length > 0 ? path.join('.') + '.' : ''}${key}`;
    const isEditing = editingField === editFieldId;
    const isHovered = hoveredField === fieldId;

    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Handle arrays
        return (
          <div key={key} className="mb-2 p-2">
            <div 
              className="flex items-center justify-between group"
              onMouseEnter={() => setHoveredField(fieldId)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <div>
                <span className="font-medium text-sky-300">{key}</span>
                <span className="text-slate-300 ml-2">: [</span>
              </div>
              {isHovered && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleRemoveField(key, path)}
                    className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center"
                    title="Remove field"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="ml-6 mt-1">
              {value.map((item, index) => (
                <div key={index} className="text-slate-300">
                  {index}: {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                </div>
              ))}
            </div>
            <span className="text-slate-300 ml-2">]</span>
          </div>
        );
      } else {
        // Handle objects
        const hasDefinition = value.definition;
        const hasNestedContent = Object.keys(value).some(k => 
          k !== 'definition'
        );
        const isExpanded = expandedKeys.has(`${currentLevel}-${key}`);
        const isAddingToThis = addingField === currentPath.join('.');
        
        // Empty objects should be expandable to allow adding fields
        const shouldBeExpandable = hasNestedContent || Object.keys(value).length === 0;

        return (
          <div key={key} className="mb-2">
            <div 
              className={`flex items-center justify-between gap-2 p-2 rounded group ${shouldBeExpandable ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
              onClick={() => shouldBeExpandable && toggleExpanded(`${currentLevel}-${key}`)}
              onMouseEnter={() => setHoveredField(fieldId)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <div className="flex items-center gap-2">
                {shouldBeExpandable && (
                  <svg 
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-medium text-sky-300">{key}</span>
              </div>
              {isHovered && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddField(currentPath);
                    }}
                    className="w-4 h-4 text-green-400 hover:text-green-300 flex items-center justify-center"
                    title="Add field"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveField(key, path);
                    }}
                    className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center"
                    title="Remove field"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            {hasNestedContent && isExpanded && (
              <div className="ml-6 mt-2 border-l-2 border-slate-600 pl-4">
                {hasDefinition && (
                  <div className="mb-3 p-2 bg-slate-600/30 rounded text-sm text-slate-300 italic">
                    {value.definition}
                  </div>
                )}
                {Object.entries(value).map(([nestedKey, nestedValue]) => {
                  if (nestedKey === 'definition') return null;
                  return renderValue(nestedKey, nestedValue, currentLevel + 1, currentPath);
                })}
                
                {/* Add field form */}
                {isAddingToThis && (
                  <div className="mt-2 p-2 bg-slate-600/20 rounded border border-slate-500">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Field value"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddFieldSubmit(currentPath);
                          } else if (e.key === 'Escape') {
                            handleAddFieldCancel();
                          }
                        }}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddFieldSubmit(currentPath)}
                          className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={handleAddFieldCancel}
                          className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Show expanded empty object with add button */}
            {!hasNestedContent && isExpanded && (
              <div className="ml-6 mt-2 border-l-2 border-slate-600 pl-4">
                {/* Add field form for empty objects */}
                {isAddingToThis && (
                  <div className="mt-2 p-2 bg-slate-600/20 rounded border border-slate-500">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="Field name"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        autoFocus
                      />
                      <input
                        type="text"
                        placeholder="Field value"
                        value={newFieldValue}
                        onChange={(e) => setNewFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddFieldSubmit(currentPath);
                          } else if (e.key === 'Escape') {
                            handleAddFieldCancel();
                          }
                        }}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddFieldSubmit(currentPath)}
                          className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
                        >
                          Add
                        </button>
                        <button
                          onClick={handleAddFieldCancel}
                          className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                {!isAddingToThis && (
                  <div className="text-slate-400 text-sm italic">Empty object</div>
                )}
              </div>
            )}
          </div>
        );
      }
    } else {
      // Handle primitives (string, number, boolean)
      return (
        <div key={key} className="mb-2 p-2">
          <div 
            className="flex items-center justify-between group"
            onMouseEnter={() => setHoveredField(fieldId)}
            onMouseLeave={() => setHoveredField(null)}
          >
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => handleSingleClick(key, value, path)}
            >
              <span className="font-medium text-sky-300">{key}</span>
              <span className="text-slate-300 ml-2">: </span>
              {isEditing ? (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => handleEditSubmit(key, path)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleEditSubmit(key, path);
                    } else if (e.key === 'Escape') {
                      handleEditCancel();
                    }
                  }}
                  className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
              ) : (
                <span className="text-slate-300">{String(value)}</span>
              )}
            </div>
            {isHovered && !isEditing && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleRemoveField(key, path)}
                  className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center"
                  title="Remove field"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="text-sm">
      {Object.entries(data).map(([key, value]) => renderValue(key, value, level))}
      
      {/* Root level add field */}
      {level === 0 && addingField === '' && (
        <div className="mt-2 p-2 bg-slate-600/20 rounded border border-slate-500">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Field name"
              value={newFieldKey}
              onChange={(e) => setNewFieldKey(e.target.value)}
              className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
              autoFocus
            />
            <input
              type="text"
              placeholder="Field value"
              value={newFieldValue}
              onChange={(e) => setNewFieldValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddFieldSubmit([]);
                } else if (e.key === 'Escape') {
                  handleAddFieldCancel();
                }
              }}
              className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <div className="flex gap-1">
              <button
                onClick={() => handleAddFieldSubmit([])}
                className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
              >
                Add
              </button>
              <button
                onClick={handleAddFieldCancel}
                className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Root level add button */}
      {level === 0 && addingField !== '' && (
        <button
          onClick={() => handleAddField([])}
          className="mt-2 text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Field
        </button>
      )}
    </div>
  );
};

const SettingsSidebar = ({ isOpen, setIsOpen }) => {
  const {
    models,
    addModel,
    removeModel,
    updateModelSetting
  } = useStore();
  
  const sidebarRef = useRef(null);
  const [expandedModels, setExpandedModels] = useState(new Set([1])); // Default expand first model
  const [isJsonMode, setIsJsonMode] = useState({});
  const [parsedJson, setParsedJson] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [enabledModels, setEnabledModels] = useState([]);

  // Read enabled models from localStorage
  useEffect(() => {
    const storedEnabledModels = localStorage.getItem('enabledModels');
    if (storedEnabledModels) {
      try {
        const parsed = JSON.parse(storedEnabledModels);
        setEnabledModels(parsed);
      } catch (error) {
        console.error('Error parsing enabled models from localStorage:', error);
        setEnabledModels([]);
      }
    }
  }, []);

  // Filter models to only show enabled ones
  const getFilteredModels = () => {
    if (enabledModels.length === 0) {
      return modelsList; // If no enabled models found, show all
    }
    
    const filtered = {};
    Object.entries(modelsList).forEach(([label, value]) => {
      if (enabledModels.includes(value)) {
        filtered[label] = value;
      }
    });
    
    return filtered;
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, setIsOpen]);

  const toggleModelExpanded = (modelId) => {
    const newExpanded = new Set(expandedModels);
    if (newExpanded.has(modelId)) {
      newExpanded.delete(modelId);
    } else {
      newExpanded.add(modelId);
    }
    setExpandedModels(newExpanded);
  };

  const handleModelChange = (modelId, newValue) => {
    updateModelSetting(modelId, 'value', newValue);
  };

  const handleModelNameChange = (modelId, newName) => {
    updateModelSetting(modelId, 'name', newName);
  };

  const resetModelToDefaults = (modelId) => {
    updateModelSetting(modelId, 'systemPrompt', "You are a helpful AI assistant.");
    updateModelSetting(modelId, 'temperature', 0.7);
    updateModelSetting(modelId, 'maxTokens', 16384);
    updateModelSetting(modelId, 'topP', 1.0);
    updateModelSetting(modelId, 'minP', 0.0);
  };

  const handleJsonDataChange = async (modelId, path, key, value, isDelete = false) => {
    const currentParsedJson = parsedJson[modelId];
    if (!currentParsedJson) return false;

    const newData = JSON.parse(JSON.stringify(currentParsedJson));
    
    if (path.length === 0) {
      if (isDelete) {
        delete newData[key];
      } else {
        newData[key] = value;
      }
    } else {
      let current = newData;
      for (const pathKey of path) {
        if (current[pathKey] === undefined) {
          current[pathKey] = {};
        }
        current = current[pathKey];
      }
      
      if (isDelete) {
        delete current[key];
      } else {
        current[key] = value;
      }
    }
    
    // Validate JSON with backend
    try {
      const response = await apiService.post("/chats/validate-json/", newData);
      if (response.status === 200) {
        setParsedJson(prev => ({ ...prev, [modelId]: newData }));
        updateModelSetting(modelId, 'systemPrompt', JSON.stringify(newData, null, 2));
        setValidationError(null);
        setShowValidationError(false);
        return true; // Success
      }
    } catch (error) {
      console.error("JSON validation failed on backend:", error);
      let errorMessage = "JSON validation failed. Please check the structure.";
      if (error?.data?.details) {
        errorMessage = error.data.details.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
      } else if (error?.data?.error) {
        errorMessage = error.data.error;
      }
      setValidationError(errorMessage);
      setShowValidationError(true);
      return false; // Failure
    }
  };

  const handleRenderAsJson = async (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (model?.systemPrompt) {
      try {
        const parsed = JSON.parse(model.systemPrompt);
        if (typeof parsed === 'object' && parsed !== null) {
          try {
            const response = await apiService.post("/chats/validate-json/", parsed);
            if (response.status === 200) {
              setParsedJson(prev => ({ ...prev, [modelId]: parsed }));
              setIsJsonMode(prev => ({ ...prev, [modelId]: true }));
              setValidationError(null);
              setShowValidationError(false);
            }
          } catch (error) {
            console.error("JSON validation failed on backend:", error);
            let errorMessage = "JSON validation failed. Please check the structure.";
            if (error?.data?.details) {
              errorMessage = error.data.details.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
            } else if (error?.data?.error) {
              errorMessage = error.data.error;
            }
            setValidationError(errorMessage);
            setShowValidationError(true);
          }
        } else {
          setValidationError('Invalid JSON format: Not an object.');
          setShowValidationError(true);
        }
      } catch (e) {
        setValidationError('Invalid JSON: Could not parse the input.');
        setShowValidationError(true);
      }
    }
  };

  const handleEditAsText = (modelId) => {
    setIsJsonMode(prev => ({ ...prev, [modelId]: false }));
    setParsedJson(prev => {
      const newState = { ...prev };
      delete newState[modelId];
      return newState;
    });
  };

  const checkHasValidJson = (systemPrompt) => {
    if (!systemPrompt) return false;
    try {
      const parsed = JSON.parse(systemPrompt);
      return typeof parsed === 'object' && parsed !== null;
    } catch (e) {
      return false;
    }
  };

  return (
    <>
      <ErrorToast
        show={showValidationError}
        onClose={() => setShowValidationError(false)}
        title="Validation Error"
        message={validationError}
        duration={5000}
      />
      
      <div
        ref={sidebarRef}
        className={`h-full bg-slate-800/95 backdrop-blur-md 
                 border-l border-slate-600/80 shadow-2xl transform transition-all 
                 duration-300 ease-in-out ${isOpen ? 'w-96' : 'w-0'} overflow-hidden`}
      >
        <div className="flex flex-col h-full w-96">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-600/80">
            <h2 className="text-lg font-semibold text-sky-400">Models & Settings</h2>
          </div>

          {/* Models List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {models.map((model) => {
              const isExpanded = expandedModels.has(model.id);
              const hasValidJson = checkHasValidJson(model.systemPrompt);
              const modelIsJsonMode = isJsonMode[model.id];
              const modelParsedJson = parsedJson[model.id];
              const filteredModels = getFilteredModels();

              return (
                <div key={model.id} className="border border-slate-600 rounded-lg">
                  {/* Model Header */}
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={model.name}
                          onChange={(e) => handleModelNameChange(model.id, e.target.value)}
                          className="bg-transparent border-none text-sm font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 rounded px-1"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleModelExpanded(model.id)}
                          className="text-slate-400 hover:text-slate-200 focus:text-slate-200 focus:border-1 rounded-md transition-all"
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {models.length > 1 && (
                          <button
                            onClick={() => removeModel(model.id)}
                            className="text-red-400 hover:text-red-300 transition-colors ml-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Model Selector */}
                    <select
                      value={model.value}
                      onChange={(e) => handleModelChange(model.id, e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2 text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      {Object.entries(filteredModels).map(([label, value]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Expanded Settings */}
                  {isExpanded && (
                    <div className="border-t border-slate-600 p-3 space-y-4">
                      {/* System Prompt */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          System Prompt
                        </label>
                        
                        {(hasValidJson || modelIsJsonMode) && (
                          <div className="flex gap-2 mb-2">
                            {!modelIsJsonMode ? (
                              <button
                                onClick={() => handleRenderAsJson(model.id)}
                                className="text-xs bg-sky-500/20 text-sky-300 px-2 py-1 rounded hover:bg-sky-500/30 transition-colors"
                              >
                                Render as JSON
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditAsText(model.id)}
                                className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
                              >
                                Edit as Text
                              </button>
                            )}
                          </div>
                        )}
                        
                        {modelIsJsonMode && modelParsedJson ? (
                          <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 max-h-48 overflow-y-auto">
                            <JsonRenderer 
                              data={modelParsedJson} 
                              onDataChange={(path, key, value, isDelete) => handleJsonDataChange(model.id, path, key, value, isDelete)} 
                            />
                          </div>
                        ) : (
                          <textarea
                            value={model.systemPrompt || ""}
                            onChange={(e) => updateModelSetting(model.id, 'systemPrompt', e.target.value)}
                            className="w-full h-20 bg-slate-700 border border-slate-600 rounded-lg p-2
                                     text-slate-100 placeholder-slate-400 resize-none text-sm
                                     focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            placeholder="Enter system prompt..."
                          />
                        )}
                      </div>

                      {/* Temperature */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          Temperature: {model.temperature.toFixed(1)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={model.temperature}
                          onChange={(e) => updateModelSetting(model.id, 'temperature', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>

                      {/* Max Tokens */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          Max Tokens
                        </label>
                        <input
                          type="number"
                          min="1024"
                          max="32768"
                          value={model.maxTokens}
                          onChange={(e) => updateModelSetting(model.id, 'maxTokens', parseInt(e.target.value))}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg p-2
                                   text-slate-100 text-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                        />
                      </div>

                      {/* Top P */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          Top P: {model.topP.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={model.topP}
                          onChange={(e) => updateModelSetting(model.id, 'topP', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>

                      {/* Min P */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          Min P: {model.minP.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={model.minP}
                          onChange={(e) => updateModelSetting(model.id, 'minP', parseFloat(e.target.value))}
                          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                      </div>

                      {/* Reset Button */}
                      <button
                        onClick={() => resetModelToDefaults(model.id)}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 focus:bg-slate-600 
                                 border border-slate-600 rounded-lg py-2 px-3 text-sm
                                 transition-colors duration-200"
                      >
                        Reset to Defaults
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Model Button */}
            <button
              onClick={addModel}
              className="w-full border-2 border-dashed border-slate-600 rounded-lg p-4
                       text-slate-400 hover:text-slate-300 hover:border-slate-500
                       focus:text-slate-300 focus:border-slate-500
                       transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Model
            </button>
          </div>
        </div>

        <style>{`
          .slider-thumb::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #0ea5e9;
            cursor: pointer;
            border: 2px solid #1e293b;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }
          
          .slider-thumb::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #0ea5e9;
            cursor: pointer;
            border: 2px solid #1e293b;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
          }
        `}</style>
      </div>
    </>
  );
};

export default SettingsSidebar;
