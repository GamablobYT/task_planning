import React, { useState, useRef, useEffect } from 'react';
import useStore from '../store/store';
import apiService from '../utils/api';
import ErrorToast from './ErrorToast';
import modelsList from '../consts/models';

// JSON Renderer Component
const JsonRenderer = ({ 
  data, 
  level = 0, 
  onDataChange, 
  onKeyChange,
  // New props for selection mode
  isSelectionMode = false,
  selectedPaths = { inputs: new Set(), outputs: new Set() },
  onSelectionChange 
}) => {
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const [editingField, setEditingField] = useState(null); // For values: 'path.to.key'
  const [editValue, setEditValue] = useState('');
  const [editingKey, setEditingKey] = useState(null); // For keys: 'path.to.key'
  const [newKeyName, setNewKeyName] = useState('');
  const [hoveredField, setHoveredField] = useState(null);
  const [addingField, setAddingField] = useState(null); // Can be path to an object or an array
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // New state for adding to root
  const [isAddingToRoot, setIsAddingToRoot] = useState(false);
  const [newRootKeyName, setNewRootKeyName] = useState(''); // Only if root is an object
  const [newRootValue, setNewRootValue] = useState('');

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
    if (!onDataChange) return;
    const fieldId = `${path.length > 0 ? path.join('.') + '.' : ''}${key}`;
    if (typeof value !== 'object' || value === null) {
      setEditingField(fieldId);
      setEditValue(String(value));
    }
  };

  const parseValue = (value) => {
    let parsedValue = value;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      parsedValue = value.slice(1, -1);
    } else if (value.trim().startsWith('{') || value.trim().startsWith('[')) {
      try { parsedValue = JSON.parse(value); } catch (e) { /* keep as string */ }
    } else if (value.toLowerCase() === 'true') {
      parsedValue = true;
    } else if (value.toLowerCase() === 'false') {
      parsedValue = false;
    } else if (value.toLowerCase() === 'null') {
      parsedValue = null;
    } else if (!isNaN(value) && value.trim() !== '') {
      if (String(parseFloat(value)) === value.trim() && Number.isInteger(parseFloat(value))) {
        parsedValue = parseInt(value);
      } else if (String(parseFloat(value)) === value.trim()) {
        parsedValue = parseFloat(value);
      }
    }
    return parsedValue;
  };

  const handleEditSubmit = async (key, path) => {
    if (onDataChange) {
      const parsedValue = parseValue(editValue);
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

  const handleKeyDoubleClick = (key, path) => {
    if (typeof key === 'number' || !onKeyChange) return;
    const keyId = `${path.length > 0 ? path.join('.') + '.' : ''}${key}`;
    setEditingKey(keyId);
    setNewKeyName(key);
  };

  const handleKeyEditSubmit = async (key, path) => {
    if (onKeyChange && newKeyName && newKeyName !== key) {
      const success = await onKeyChange(path, key, newKeyName);
      if (success !== false) {
        setEditingKey(null);
        setNewKeyName('');
      }
    } else {
      setEditingKey(null);
      setNewKeyName('');
    }
  };

  const handleKeyEditCancel = () => {
    setEditingKey(null);
    setNewKeyName('');
  };
  
  const handleStartAddField = (path) => {
    if (!onDataChange) return;
    setAddingField(path.join('.'));
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleAddFieldSubmit = async (path) => {
    if (newFieldKey && onDataChange) {
      const processedValue = parseValue(newFieldValue);
      const success = await onDataChange(path, newFieldKey, processedValue);
      if (success !== false) {
        setAddingField(null);
        setNewFieldKey('');
        setNewFieldValue('');
      }
    }
  };
  
  const handleAddItemSubmit = async (path, array) => {
    if (onDataChange) {
        const processedValue = parseValue(newFieldValue);
        const success = await onDataChange(path, array.length, processedValue);
        if (success !== false) {
            setAddingField(null);
            setNewFieldValue('');
        }
    }
  };
  
  const handleAddCancel = () => {
    setAddingField(null);
    setNewFieldKey('');
    setNewFieldValue('');
  };

  const handleRemoveField = (key, path) => {
    if (onDataChange) {
      onDataChange(path, key, undefined, true);
    }
  };

  const handleStartAddRootField = () => {
    if (!onDataChange) return;
    setIsAddingToRoot(true);
    setNewRootKeyName('');
    setNewRootValue('');
  };

  const handleCancelAddRootField = () => {
    setIsAddingToRoot(false);
    setNewRootKeyName('');
    setNewRootValue('');
  };

  const handleSubmitAddRootField = async () => {
    if (!onDataChange) return;

    const processedValue = parseValue(newRootValue);
    let success = false;

    if (Array.isArray(data)) {
      success = await onDataChange([], data.length, processedValue);
    } else if (typeof data === 'object' && data !== null) {
      if (!newRootKeyName.trim()) {
        console.error("Key is required when adding to an object.");
        return; 
      }
      success = await onDataChange([], newRootKeyName, processedValue);
    }

    if (success !== false) {
      handleCancelAddRootField(); // Reset form
    }
  };

  const renderValue = (key, value, currentLevel, path = []) => {
    const currentPath = [...path, key];
    const fieldId = `${currentLevel}-${key}`;
    const fullPathId = `${path.length > 0 ? path.join('.') + '.' : ''}${key}`;
    const fullPathString = currentPath.join('.');
    const isEditing = editingField === fullPathId;
    const isEditingKey = editingKey === fullPathId;
    const isHovered = hoveredField === fieldId;
    const isAddingToThis = addingField === fullPathId;

    const keyDisplay = isEditingKey ? (
        <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onBlur={() => handleKeyEditSubmit(key, path)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleKeyEditSubmit(key, path);
                else if (e.key === 'Escape') handleKeyEditCancel();
            }}
            className="bg-slate-600 border border-slate-500 rounded px-1 py-0 text-sm font-medium text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-500 w-24"
            autoFocus
        />
    ) : (
        <span 
            className="font-medium text-sky-300"
            onDoubleClick={() => handleKeyDoubleClick(key, path)}
        >
            {key}
        </span>
    );

    const keyComponent = (
        <>
            {keyDisplay}
            {isSelectionMode && (
                <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                    <input 
                        type="checkbox"
                        title={`Mark as Input: ${fullPathString}`}
                        checked={selectedPaths.inputs.has(fullPathString)}
                        onChange={(e) => onSelectionChange(fullPathString, 'inputs', e.target.checked)}
                        className="w-4 h-4 rounded-sm bg-slate-600 border border-slate-500 text-sky-500 checked:border-sky-500 checked:bg-sky-500/20 focus:ring-sky-500 focus:ring-2 cursor-pointer"
                    />
                    <input 
                        type="checkbox"
                        title={`Mark as Output: ${fullPathString}`}
                        checked={selectedPaths.outputs.has(fullPathString)}
                        onChange={(e) => onSelectionChange(fullPathString, 'outputs', e.target.checked)}
                        className="w-4 h-4 rounded-sm bg-slate-600 border border-slate-500 text-orange-500 checked:border-orange-500 checked:bg-orange-500/20 focus:ring-orange-500 focus:ring-2 cursor-pointer"
                    />
                </div>
            )}
        </>
    );

    if (typeof value === 'object' && value !== null) {
      const isExpanded = expandedKeys.has(fullPathId);
      
      if (Array.isArray(value)) {
        const addItemForm = (
            <div className="mt-2 p-2 bg-slate-600/20 rounded border border-slate-500">
                <div className="flex flex-col gap-2">
                    <input type="text" placeholder="New item value" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddItemSubmit(currentPath, value);
                            else if (e.key === 'Escape') handleAddCancel();
                        }}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" autoFocus/>
                    <div className="flex gap-1">
                        <button onClick={() => handleAddItemSubmit(currentPath, value)} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors">Add</button>
                        <button onClick={handleAddCancel} className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        );
        return (
          <div key={key} className="mb-2">
            <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-700/30 p-2 rounded"
              onClick={() => toggleExpanded(fullPathId)} onMouseEnter={() => setHoveredField(fieldId)} onMouseLeave={() => setHoveredField(null)}>
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                {keyComponent}
                <span className="text-slate-300 ml-2">: [ {!isExpanded && `${value.length} items`}</span>
              </div>
              {isHovered && onDataChange && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); handleStartAddField(currentPath); }} className="w-4 h-4 text-green-400 hover:text-green-300 flex items-center justify-center" title="Add item"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg></button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveField(key, path); }} className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center" title="Remove field"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                </div>
              )}
            </div>
            {isExpanded && (
              <>
                <div className="ml-6 mt-1 border-l-2 border-slate-600 pl-4">
                  {value.map((item, index) => renderValue(index, item, currentLevel + 1, currentPath))}
                  {isAddingToThis && addItemForm}
                  {value.length === 0 && !isAddingToThis && <div className="text-slate-400 text-sm italic">Empty array</div>}
                </div>
                <span className="text-slate-300 ml-2">]</span>
              </>
            )}
            {!isExpanded && <span className="text-slate-300 ml-2">]</span>}
          </div>
        );
      } else {
        const hasDefinition = value.hasOwnProperty('definition');
        const hasNestedContent = Object.keys(value).some(k => k !== 'definition');
        const shouldBeExpandable = hasNestedContent || Object.keys(value).length === 0 || hasDefinition;
        const addFieldForm = (
            <div className="mt-2 p-2 bg-slate-600/20 rounded border border-slate-500">
                <div className="flex flex-col gap-2">
                    <input type="text" placeholder="Field name" value={newFieldKey} onChange={(e) => setNewFieldKey(e.target.value)} className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500" autoFocus/>
                    <input type="text" placeholder="Field value" value={newFieldValue} onChange={(e) => setNewFieldValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddFieldSubmit(currentPath);
                            else if (e.key === 'Escape') handleAddCancel();
                        }}
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"/>
                    <div className="flex gap-1">
                        <button onClick={() => handleAddFieldSubmit(currentPath)} className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors">Add</button>
                        <button onClick={handleAddCancel} className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors">Cancel</button>
                    </div>
                </div>
            </div>
        );

        return (
          <div key={key} className="mb-2">
            <div className={`flex items-center justify-between gap-2 p-2 rounded group ${shouldBeExpandable ? 'cursor-pointer hover:bg-slate-700/30' : ''}`}
              onClick={() => shouldBeExpandable && toggleExpanded(fullPathId)} onMouseEnter={() => setHoveredField(fieldId)} onMouseLeave={() => setHoveredField(null)}>
              <div className="flex items-center gap-2">
                {shouldBeExpandable && (<svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>)}
                {keyComponent}
              </div>
              {isHovered && onDataChange && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleStartAddField(currentPath); }} className="w-4 h-4 text-green-400 hover:text-green-300 flex items-center justify-center" title="Add field"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg></button>
                  <button onClick={(e) => { e.stopPropagation(); handleRemoveField(key, path); }} className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center" title="Remove field"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                </div>
              )}
            </div>
            
            {isExpanded && (
              <div className="ml-6 mt-2 border-l-2 border-slate-600 pl-4">
                {hasDefinition && (
                  <div className="mb-3 p-2 bg-slate-600/30 rounded text-sm text-slate-300 italic">
                    {editingField === `${currentPath.join('.')}.definition` ? (
                      <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleEditSubmit('definition', currentPath)} onKeyDown={(e) => { if (e.key === 'Enter') handleEditSubmit('definition', currentPath); else if (e.key === 'Escape') handleEditCancel();}} className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 not-italic" autoFocus/>
                    ) : (
                      <div className="cursor-pointer" onClick={() => handleSingleClick('definition', value.definition, currentPath)}>
                        <span className="font-medium not-italic text-slate-200">definition: </span>
                        <span className="hover:bg-slate-700/50 rounded px-1">{value.definition === "" ? <i className="text-slate-500">(empty)</i> : value.definition}</span>
                      </div>
                    )}
                  </div>
                )}
                {Object.entries(value).map(([nestedKey, nestedValue]) => {
                  if (nestedKey === 'definition') return null;
                  return renderValue(nestedKey, nestedValue, currentLevel + 1, currentPath);
                })}
                {isAddingToThis && addFieldForm}
                {!hasNestedContent && !hasDefinition && !isAddingToThis && <div className="text-slate-400 text-sm italic">Empty object</div>}
              </div>
            )}
          </div>
        );
      }
    } else {
      return (
        <div key={key} className="mb-2 p-2">
          <div className="flex items-center justify-between group" onMouseEnter={() => setHoveredField(fieldId)} onMouseLeave={() => setHoveredField(null)}>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                  {keyComponent}
                  <span className="text-slate-300">: </span>
                  {isEditing ? (
                    <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} onBlur={() => handleEditSubmit(key, path)} onKeyDown={(e) => { if (e.key === 'Enter') {handleEditSubmit(key, path);} else if (e.key === 'Escape') {handleEditCancel();}}} className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 flex-1" autoFocus/>
                  ) : (
                    <span className="text-slate-300 cursor-pointer hover:bg-slate-600/50 rounded px-2" onClick={() => handleSingleClick(key, value, path)}>
                      {value === "" ? <span className="italic text-slate-500">(empty)</span> : String(value)}
                    </span>
                  )}
              </div>
            </div>
            {isHovered && !isEditing && onDataChange && (
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleRemoveField(key, path)} className="w-4 h-4 text-red-400 hover:text-red-300 flex items-center justify-center" title="Remove field"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
              </div>
            )}
          </div>
        </div>
      );
    }
  };

  const renderTopLevel = () => {
    if (Array.isArray(data)) {
      return data.map((item, index) => renderValue(index, item, level, []));
    }
    return Object.entries(data).map(([key, value]) => renderValue(key, value, level, []));
  };
  
  const renderAddRootFieldForm = () => {
    if (!isAddingToRoot) {
      return (
        onDataChange && <button
          onClick={handleStartAddRootField}
          className="mt-4 w-full text-xs bg-slate-600 hover:bg-slate-500 text-slate-300 px-3 py-1.5 rounded-md transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
          {Array.isArray(data) ? "Add Item to Root" : "Add Field to Root"}
        </button>
      );
    }

    return (
      <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600 space-y-2">
        <h4 className="text-xs font-semibold text-slate-300">
          {Array.isArray(data) ? "New Root Item" : "New Root Field"}
        </h4>
        {!Array.isArray(data) && (
          <input
            type="text"
            placeholder="Field Name"
            value={newRootKeyName}
            onChange={(e) => setNewRootKeyName(e.target.value)}
            className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            autoFocus
          />
        )}
        <input
          type="text"
          placeholder="Field Value"
          value={newRootValue}
          onChange={(e) => setNewRootValue(e.target.value)}
          className="w-full bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitAddRootField(); else if (e.key === 'Escape') handleCancelAddRootField();}}
        />
        <div className="flex gap-2">
          <button
            onClick={handleSubmitAddRootField}
            className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded hover:bg-green-500/30 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancelAddRootField}
            className="text-xs bg-slate-500/20 text-slate-300 px-2 py-1 rounded hover:bg-slate-500/30 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="text-sm">
      {renderTopLevel()}
      {renderAddRootFieldForm()}
    </div>
  );
};

const SettingsSidebar = ({ isOpen, setIsOpen, onAddModelRequest }) => {
  const {
    models,
    // addModel, // No longer used directly from store for this button
    removeModel,
    updateModelSetting
  } = useStore();
  
  const sidebarRef = useRef(null);
  const fileInputRef = useRef(null);
  const [expandedModels, setExpandedModels] = useState(new Set([1])); // Default expand first model
  const [isJsonMode, setIsJsonMode] = useState({});
  const [parsedJson, setParsedJson] = useState({});
  const [validationError, setValidationError] = useState(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [enabledModels, setEnabledModels] = useState([]);
  const [showSaveSuccessToast, setShowSaveSuccessToast] = useState(false);

  // State for examples modal
  const [isExamplesModalOpen, setIsExamplesModalOpen] = useState(false);
  const [examplesModalContent, setExamplesModalContent] = useState(null); // Will store the model object

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

  const handleExportSystemPrompt = (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (!model?.systemPrompt) return;

    const hasValidJson = checkHasValidJson(model.systemPrompt);
    const fileName = `${model.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_system_prompt`;
    
    if (hasValidJson) {
      // Export as JSON
      const blob = new Blob([model.systemPrompt], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // Export as TXT
      const blob = new Blob([model.systemPrompt], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportSystemPrompt = (modelId) => {
    fileInputRef.current?.click();
    fileInputRef.current.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        const isJsonFile = file.name.toLowerCase().endsWith('.json');
        
        if (isJsonFile) {
          try {
            const parsed = JSON.parse(content);
            if (typeof parsed === 'object' && parsed !== null) {
              // Validate JSON with backend
              try {
                await apiService.post("/chats/validate-json/", parsed);
                updateModelSetting(modelId, 'systemPrompt', content);
                // If currently in JSON mode, update the parsedJson state
                if (isJsonMode[modelId]) {
                  setParsedJson(prev => ({...prev, [modelId]: parsed}));
                }
                setValidationError(null);
                setShowValidationError(false);
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
          } catch (error) {
            setValidationError('Invalid JSON: Could not parse the file.');
            setShowValidationError(true);
          }
        } else {
          // Import as text
          updateModelSetting(modelId, 'systemPrompt', content);
        }
      };
      reader.readAsText(file);
      
      // Reset file input
      event.target.value = '';
    };
  };

  const handleJsonDataChange = async (modelId, path, key, value, isDelete = false) => {
    const currentParsedJson = parsedJson[modelId];
    if (!currentParsedJson) return false;

    const newData = JSON.parse(JSON.stringify(currentParsedJson));
    
    let current = newData;
    for (const pathKey of path) {
        if (current[pathKey] === undefined) {
            // This should not happen if path is correct
            current[pathKey] = {}; 
        }
        current = current[pathKey];
    }
    
    if (isDelete) {
        if (Array.isArray(current)) {
            current.splice(key, 1);
        } else {
            delete current[key];
        }
    } else {
        current[key] = value;
    }
    
    // Validate JSON with backend
    try {
      await apiService.post("/chats/validate-json/", newData);
      setParsedJson(prev => ({ ...prev, [modelId]: newData }));
      updateModelSetting(modelId, 'systemPrompt', JSON.stringify(newData, null, 2));
      setValidationError(null);
      setShowValidationError(false);
      return true; // Success
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
  
  const handleJsonKeyChange = async (modelId, path, oldKey, newKey) => {
    const currentParsedJson = parsedJson[modelId];
    if (!currentParsedJson || !newKey || oldKey === newKey) return false;

    let finalObject;
    const newData = JSON.parse(JSON.stringify(currentParsedJson));

    let parentObject = newData;
    for (const p of path) {
        parentObject = parentObject[p];
    }

    if (Object.prototype.hasOwnProperty.call(parentObject, newKey)) {
        setValidationError(`Key "${newKey}" already exists at this level.`);
        setShowValidationError(true);
        return false;
    }

    const newParent = Object.fromEntries(
        Object.entries(parentObject).map(([k, v]) => (k === oldKey ? [newKey, v] : [k, v]))
    );

    if (path.length === 0) {
        finalObject = newParent;
    } else {
        let grandParent = newData;
        for (let i = 0; i < path.length - 1; i++) {
            grandParent = grandParent[path[i]];
        }
        grandParent[path[path.length - 1]] = newParent;
        finalObject = newData;
    }

    try {
        await apiService.post("/chats/validate-json/", finalObject);
        setParsedJson(prev => ({ ...prev, [modelId]: finalObject }));
        updateModelSetting(modelId, 'systemPrompt', JSON.stringify(finalObject, null, 2));
        setValidationError(null);
        setShowValidationError(false);
        return true;
    } catch (error) {
        console.error("JSON validation failed on backend:", error);
        let errorMessage = "JSON validation failed after key rename.";
        if (error?.data?.details) {
            errorMessage = error.data.details.map(d => `${d.loc.join('.')}: ${d.msg}`).join('; ');
        } else if (error?.data?.error) {
            errorMessage = error.data.error;
        }
        setValidationError(errorMessage);
        setShowValidationError(true);
        return false;
    }
  };


  const handleRenderAsJson = async (modelId) => {
    const model = models.find(m => m.id === modelId);
    if (model?.systemPrompt) {
      try {
        const parsed = JSON.parse(model.systemPrompt);
        if (typeof parsed === 'object' && parsed !== null) {
          try {
            await apiService.post("/chats/validate-json/", parsed);
            setParsedJson(prev => ({ ...prev, [modelId]: parsed }));
            setIsJsonMode(prev => ({ ...prev, [modelId]: true }));
            setValidationError(null);
            setShowValidationError(false);
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

  const getHistorySourceOptions = (currentModelId) => {
    const options = [
      { value: 'history', label: 'History' },
      { value: 'prompt', label: 'Prompt' },
      { value: 'models', label: 'Models' }
    ];
    
    return options;
  };

  const handleHistorySourceChange = (modelId, sourceType, value) => {
    const model = models.find(m => m.id === modelId);
    const currentSources = model.historySource || {};
    
    let newSources = { ...currentSources };
    
    if (sourceType === 'history') {
      if (value !== null) {
        newSources.history = parseInt(value) || 1;
      } else {
        delete newSources.history;
      }
    } else if (sourceType === 'prompt') {
      if (value !== null) {
        newSources.prompt = value ? 1 : 0;
      } else {
        delete newSources.prompt;
      }
    } else if (sourceType === 'models') {
      if (value !== null) {
        newSources.models = value;
      } else {
        delete newSources.models;
      }
    }
    
    updateModelSetting(modelId, 'historySource', newSources);
  };

  const handleModelSelectionChange = (modelId, targetModelId, isChecked) => {
    const model = models.find(m => m.id === modelId);
    const currentSources = model.historySource || {};
    const currentModels = currentSources.models || [];
    
    let newModels;
    if (isChecked) {
      newModels = [...currentModels, targetModelId];
    } else {
      newModels = currentModels.filter(id => id !== targetModelId);
    }
    
    handleHistorySourceChange(modelId, 'models', newModels.length > 0 ? newModels : null);
  };

  const handleSaveConfig = () => {
    const currentModels = useStore.getState().models;
    if (currentModels && currentModels.length > 0) {
      localStorage.setItem('savedModelConfig', JSON.stringify(currentModels));
      setShowSaveSuccessToast(true);
      setTimeout(() => setShowSaveSuccessToast(false), 3000); // Hide after 3 seconds
    } else {
      // Optionally, show an error or disable button if no models to save
      console.warn("No models to save.");
    }
  };

  const handleExportConfig = () => {
    const savedConfigRaw = localStorage.getItem('savedModelConfig');
    if (savedConfigRaw) {
      try {
        // Ensure it's a valid JSON string for the blob
        const parsedConfig = JSON.parse(savedConfigRaw);
        const configJson = JSON.stringify(parsedConfig, null, 2); // Pretty print
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'model_config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error exporting configuration:", error);
        // Optionally, show an error toast to the user
        setValidationError("Failed to export configuration. The saved data might be corrupted.");
        setShowValidationError(true);
      }
    } else {
      console.warn("No saved configuration to export.");
      // Optionally, show a toast or alert
      setValidationError("No configuration found in local storage to export.");
      setShowValidationError(true);
    }
  };

  const handleShowExamples = (model) => {
    setExamplesModalContent(model);
    setIsExamplesModalOpen(true);
  };

  const renderExamplesModal = () => {
    if (!isExamplesModalOpen || !examplesModalContent || !examplesModalContent.examples || examplesModalContent.examples.length === 0) {
      return null;
    }
    return (
      <div className="fixed inset-0 bg-slate-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[60] p-4"> {/* Increased z-index */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-sky-400">
              Few-Shot Examples for "{examplesModalContent.name}" ({examplesModalContent.examples.length})
            </h3>
            <button
              onClick={() => setIsExamplesModalOpen(false)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar-thin">
            {examplesModalContent.examples.map((example, index) => (
              <div key={index} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                <p className="text-xs text-slate-400 font-mono mb-2">Example {index + 1}</p>
                {example.inputs && Object.keys(example.inputs).length > 0 && (
                  <div className="mb-2">
                    <strong className="text-sm text-sky-300 block mb-1">Inputs:</strong>
                    {Object.entries(example.inputs).map(([key, value]) => (
                      <div key={`ex-in-${index}-${key}`} className="ml-2 mb-1">
                        <p className="text-xs text-slate-400 font-medium">{key}:</p>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-600/30 p-1.5 rounded text-xs">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {example.outputs && Object.keys(example.outputs).length > 0 && (
                  <div>
                    <strong className="text-sm text-sky-300 block mb-1">Outputs:</strong>
                    {Object.entries(example.outputs).map(([key, value]) => (
                      <div key={`ex-out-${index}-${key}`} className="ml-2 mb-1">
                        <p className="text-xs text-slate-400 font-medium">{key}:</p>
                        <p className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-600/30 p-1.5 rounded text-xs">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
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
      {showSaveSuccessToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-lg shadow-md z-50">
          Configuration saved successfully!
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.json"
        style={{ display: 'none' }}
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
                      {/* History Source */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-200">
                          Take history from <span className="text-red-400">*</span>
                        </label>
                        <div className={`bg-slate-700 border rounded-lg p-3 space-y-3 ${
                          !model.historySource || Object.keys(model.historySource).length === 0 ? 'border-red-500' : 'border-slate-600'
                        }`}>
                          {/* History option */}
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={model.historySource?.history !== undefined}
                                onChange={(e) => handleHistorySourceChange(
                                  model.id, 
                                  'history', 
                                  e.target.checked ? (model.historySource?.history || 1) : null
                                )}
                                className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                              />
                              <span className="text-sm text-slate-200">History</span>
                            </label>
                            {model.historySource?.history !== undefined && (
                              <div className="ml-6">
                                <input
                                  type="number"
                                  min="-1"
                                  value={model.historySource.history || 0}
                                  onChange={(e) => handleHistorySourceChange(
                                    model.id, 
                                    'history', 
                                    parseInt(e.target.value) || 0
                                  )}
                                  className="w-20 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  placeholder="Count"
                                />
                                <span className="ml-2 text-xs text-slate-400">messages</span>
                              </div>
                            )}
                          </div>

                          {/* Prompt option */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={model.historySource?.prompt !== undefined}
                              onChange={(e) => handleHistorySourceChange(
                                model.id, 
                                'prompt', 
                                e.target.checked ? 1 : null
                              )}
                              className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                            />
                            <span className="text-sm text-slate-200">Prompt</span>
                          </label>

                          {/* Models option */}
                          {models.filter(m => m.id !== model.id).length > 0 && (
                            <div className="space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={model.historySource?.models !== undefined}
                                  onChange={(e) => handleHistorySourceChange(
                                    model.id, 
                                    'models', 
                                    e.target.checked ? [] : null
                                  )}
                                  className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                                />
                                <span className="text-sm text-slate-200">Models</span>
                              </label>
                              {model.historySource?.models !== undefined && (
                                <div className="ml-6 space-y-2 border-l border-slate-600 pl-3">
                                  {models
                                    .filter(m => m.id !== model.id)
                                    .map(targetModel => {
                                      const isSelected = (model.historySource?.models || []).includes(targetModel.id);
                                      // Check for circular dependency
                                      const wouldCreateCircularDependency = (targetModel.historySource?.models || []).includes(model.id);
                                      
                                      return (
                                        <label 
                                          key={targetModel.id}
                                          className={`flex items-center gap-2 cursor-pointer ${
                                            wouldCreateCircularDependency ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={wouldCreateCircularDependency}
                                            onChange={(e) => handleModelSelectionChange(
                                              model.id, 
                                              targetModel.id, 
                                              e.target.checked
                                            )}
                                            className="w-3 h-3 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-1"
                                          />
                                          <span className={`text-xs ${
                                            wouldCreateCircularDependency ? 'text-slate-500' : 'text-slate-300'
                                          }`}>
                                            {targetModel.name}
                                          </span>
                                        </label>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {(!model.historySource || Object.keys(model.historySource).length === 0) && (
                          <p className="text-red-400 text-xs">At least one history source is required</p>
                        )}
                      </div>

                      {/* System Prompt */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-slate-200">
                            System Prompt
                          </label>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleImportSystemPrompt(model.id)}
                              className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded hover:bg-blue-500/30 transition-colors flex items-center gap-1"
                              title="Import from file (.txt or .json)"
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                              Import
                            </button>
                            <button
                              onClick={() => handleExportSystemPrompt(model.id)}
                              className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded hover:bg-purple-500/30 transition-colors flex items-center gap-1"
                              title="Export to file"
                              disabled={!model.systemPrompt}
                            >
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Export
                            </button>
                          </div>
                        </div>
                        
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
                              onKeyChange={(path, oldKey, newKey) => handleJsonKeyChange(model.id, path, oldKey, newKey)}
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

                      {/* Few-shot Examples Info */}
                      {model.examples && model.examples.length > 0 && (
                        <div 
                          className="text-xs text-slate-400 p-2 bg-slate-700/40 rounded-md border border-slate-600 hover:border-sky-500 cursor-pointer transition-colors"
                          onClick={() => handleShowExamples(model)}
                          title="Click to view examples"
                        >
                          <span className="font-semibold text-sky-400 hover:text-sky-300">{model.examples.length} few-shot example(s)</span> configured. (Click to view)
                          <br />
                          <span className="italic">Manage examples during new model creation or by editing the system prompt JSON.</span>
                        </div>
                      )}

                      {/* Initial Inputs Info */}
                      {model.initialInputs && Object.keys(model.initialInputs).length > 0 && (
                         <div className="text-xs text-slate-400 p-2 bg-slate-700/40 rounded-md border border-slate-600">
                          <span className="font-semibold text-slate-300">Initial input values</span> configured for this model template:
                          <ul className="list-disc list-inside pl-2 mt-1">
                            {Object.entries(model.initialInputs).map(([key, value]) => (
                              value && <li key={key} className="truncate"><strong>{key}</strong>: {String(value).substring(0,30)}{String(value).length > 30 ? '...' : ''}</li>
                            ))}
                          </ul>
                           <span className="italic">These are set up during new model creation.</span>
                        </div>
                      )}


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
              onClick={onAddModelRequest} // Changed from addModel store action
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

            {/* Save Config Button */}
            <button
              onClick={handleSaveConfig}
              className="w-full mt-4 bg-sky-600 hover:bg-sky-700 text-white rounded-lg p-3
                         text-sm font-medium transition-colors duration-200
                         flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
              </svg>
              Save Configuration
            </button>

            {/* Export Config Button */}
            <button
              onClick={handleExportConfig}
              className="w-full mt-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg p-3
                         text-sm font-medium transition-colors duration-200
                         flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Configuration
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
      {renderExamplesModal()}
    </>
  );
};

export default SettingsSidebar;
export { JsonRenderer};