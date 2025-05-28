import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/store';

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

  const handleEditSubmit = (key, path) => {
    if (onDataChange) {
      onDataChange(path, key, editValue);
    }
    setEditingField(null);
    setEditValue('');
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

  const handleAddFieldSubmit = (path) => {
    if (newFieldKey && onDataChange) {
      let processedValue = newFieldValue;
      
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
        // Check if it's a number
        processedValue = parseFloat(newFieldValue);
      }
      
      onDataChange(path, newFieldKey, processedValue);
    }
    setAddingField(null);
    setNewFieldKey('');
    setNewFieldValue('');
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

        return (
          <div key={key} className="mb-2">
            <div 
              className={`flex items-center justify-between gap-2 p-2 rounded group ${hasNestedContent ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
              onClick={() => hasNestedContent && toggleExpanded(`${currentLevel}-${key}`)}
              onMouseEnter={() => setHoveredField(fieldId)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <div className="flex items-center gap-2">
                {hasNestedContent && (
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
    systemPrompt,
    setSystemPrompt,
    temperature,
    setTemperature,
    maxTokens,
    setMaxTokens,
    topP,
    setTopP,
    minP,
    setMinP
  } = useStore();
  
  const sidebarRef = useRef(null);
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [parsedJson, setParsedJson] = useState(null);
  const [hasValidJson, setHasValidJson] = useState(false);

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

  // Check if system prompt contains valid JSON
  useEffect(() => {
    if (systemPrompt) {
      try {
        const parsed = JSON.parse(systemPrompt);
        if (typeof parsed === 'object' && parsed !== null) {
          setHasValidJson(true);
        } else {
          setHasValidJson(false);
        }
      } catch (e) {
        setHasValidJson(false);
      }
    } else {
      setHasValidJson(false);
    }
  }, [systemPrompt]);

  const resetToDefaults = () => {
    setSystemPrompt("You are a helpful AI assistant.");
    setTemperature(0.7);
    setMaxTokens(1000);
    setTopP(1.0);
    setMinP(0.0);
  };

  const handleJsonDataChange = (path, key, value, isDelete = false) => {
    if (!parsedJson) return;

    const newData = JSON.parse(JSON.stringify(parsedJson));
    
    if (path.length === 0) {
      // Root level change
      if (isDelete) {
        delete newData[key];
      } else {
        newData[key] = value;
      }
    } else {
      // Navigate to the nested object
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
    
    setParsedJson(newData);
    setSystemPrompt(JSON.stringify(newData, null, 2));
  };

  const handleRenderAsJson = () => {
    if (systemPrompt) {
      try {
        const parsed = JSON.parse(systemPrompt);
        if (typeof parsed === 'object' && parsed !== null) {
          setParsedJson(parsed);
          setIsJsonMode(true);
        } else {
          alert('Invalid JSON format');
        }
      } catch (e) {
        alert('Invalid JSON format');
      }
    }
  };

  const handleEditAsText = () => {
    setIsJsonMode(false);
    setParsedJson(null);
  };

  return (
    <div
      ref={sidebarRef}
      className={`h-full bg-slate-800/95 backdrop-blur-md 
                 border-l border-slate-600/80 shadow-2xl transform transition-all 
                 duration-300 ease-in-out ${isOpen ? 'w-96' : 'w-0'} overflow-hidden`}
    >
      <div className="flex flex-col h-full w-96">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-600/80">
          <h2 className="text-lg font-semibold text-sky-400">Settings</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg
                       hover:bg-slate-700/50 transition-colors duration-150"
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              System Prompt
            </label>
            
            {/* Control buttons */}
            {(hasValidJson || isJsonMode) && (
              <div className="flex gap-2 mb-2">
                {!isJsonMode ? (
                  <button
                    onClick={handleRenderAsJson}
                    className="text-xs bg-sky-500/20 text-sky-300 px-2 py-1 rounded hover:bg-sky-500/30 transition-colors"
                  >
                    Render as JSON
                  </button>
                ) : (
                  <button
                    onClick={handleEditAsText}
                    className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
                  >
                    Edit as Text
                  </button>
                )}
              </div>
            )}
            
            {isJsonMode && parsedJson ? (
              <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                <JsonRenderer data={parsedJson} onDataChange={handleJsonDataChange} />
              </div>
            ) : (
              <textarea
                value={systemPrompt || ""}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full h-24 bg-slate-700 border border-slate-600 rounded-lg p-3
                           text-slate-100 placeholder-slate-400 resize-none
                           focus:ring-2 focus:ring-sky-500 focus:border-transparent
                           transition-all duration-200"
                placeholder="Enter system prompt or JSON configuration..."
              />
            )}
            
            <p className="text-xs text-slate-400">
              {isJsonMode 
                ? "Click values to edit. Hover over fields to add/remove them."
                : "Define the AI's behavior and personality, or enter JSON for structured configuration"
              }
            </p>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Temperature: {(temperature ?? 0.7).toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature ?? 0.7}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                         slider-thumb"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0 (Deterministic)</span>
              <span>2 (Creative)</span>
            </div>
            <p className="text-xs text-slate-400">
              Controls randomness in responses
            </p>
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
              value={maxTokens || ""}
              onChange={(e) => setMaxTokens(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3
                         text-slate-100 placeholder-slate-400
                         focus:ring-2 focus:ring-sky-500 focus:border-transparent
                         transition-all duration-200"
            />
            <p className="text-xs text-slate-400">
              Maximum length of the response
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Top P: {(topP ?? 1.0).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={topP ?? 1.0}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                         slider-thumb"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0</span>
              <span>1</span>
            </div>
            <p className="text-xs text-slate-400">
              Controls diversity via nucleus sampling
            </p>
          </div>

          {/* Min P */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Min P: {(minP ?? 0.0).toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={minP ?? 0.0}
              onChange={(e) => setMinP(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                         slider-thumb"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>0</span>
              <span>1</span>
            </div>
            <p className="text-xs text-slate-400">
              Minimum probability threshold for token selection
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-600/80 space-y-3">
          <button
            onClick={resetToDefaults}
            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 
                       border border-slate-600 rounded-lg py-2 px-4
                       transition-colors duration-200 font-medium"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0ea5e9;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #0ea5e9;
          cursor: pointer;
          border: 2px solid #1e293b;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default SettingsSidebar;
