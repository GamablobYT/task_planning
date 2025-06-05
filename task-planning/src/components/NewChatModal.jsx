import React, { useState, useEffect, useRef } from 'react';
import useStore from '../store/store';
import modelsList from '../consts/models'; // Assuming you have this
import apiService from '../utils/api'; // For JSON validation if needed
import { JsonRenderer } from './SettingsSidebar';
import { TrashIcon } from '@heroicons/react/24/outline'; // Import TrashIcon

const NewChatModal = ({ isOpen, onClose, onFinalizeCreation }) => {
  const { models: existingModels } = useStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(3); // Will be dynamic
  
  // Step 1 State
  const [configName, setConfigName] = useState('My Custom Model');
  const [selectedModelValue, setSelectedModelValue] = useState(modelsList[Object.keys(modelsList)[0]]);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(16384);
  const [topP, setTopP] = useState(1.0);
  const [minP, setMinP] = useState(0.0);
  const [historySource, setHistorySource] = useState({});
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(false);
  const [historyCount, setHistoryCount] = useState(1);
  const [isPromptEnabled, setIsPromptEnabled] = useState(false);
  const [isModelsEnabled, setIsModelsEnabled] = useState(false);
  const [selectedHistoryModels, setSelectedHistoryModels] = useState([]);

  // Step 2 State
  const fileInputRef = useRef(null);
  const [systemPromptContent, setSystemPromptContent] = useState('');
  const [isJsonPrompt, setIsJsonPrompt] = useState(false);
  const [parsedJsonToEdit, setParsedJsonToEdit] = useState(null);

  // Step 3 State
  const [jsonValidationError, setJsonValidationError] = useState(null);
  const [isFewShotPossible, setIsFewShotPossible] = useState(false); // New state to drive logic
  
  // Step 4 State (I/O Selection)
  const [templateIO, setTemplateIO] = useState({ inputs: [], outputs: [] });
  const [selectedIO, setSelectedIO] = useState({ inputs: new Set(), outputs: new Set() });

  // Step 5 State (Add Examples)
  const [fewShotExamples, setFewShotExamples] = useState([]);
  const [currentExample, setCurrentExample] = useState(null);


  useEffect(() => {
    if (!isOpen) {
      // Full reset on close
      setCurrentStep(1);
      setTotalSteps(3);
      setConfigName('My Custom Model');
      setSelectedModelValue(modelsList[Object.keys(modelsList)[0]]);
      setTemperature(0.7);
      setMaxTokens(16384);
      setTopP(1.0);
      setMinP(0.0);
      setSystemPromptContent('');
      setIsJsonPrompt(false);
      setParsedJsonToEdit(null);
      setJsonValidationError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setHistorySource({});
      setIsHistoryEnabled(false);
      setHistoryCount(1);
      setIsPromptEnabled(false);
      setIsModelsEnabled(false);
      setSelectedHistoryModels([]);
      setIsFewShotPossible(false);
      setTemplateIO({ inputs: [], outputs: [] });
      setSelectedIO({ inputs: new Set(), outputs: new Set() });
      setFewShotExamples([]);
      setCurrentExample(null);
    }
  }, [isOpen]);

  // EFFECT: Check for few-shot possibility when in Step 3
  useEffect(() => {
    if (currentStep === 3) {
      let potentialJson = parsedJsonToEdit;
      // If not using JSON renderer, try parsing the text content
      if (!potentialJson) {
        try {
          potentialJson = JSON.parse(systemPromptContent);
        } catch {
          potentialJson = null;
        }
      }

      const hasValidIOStructure = potentialJson &&
            potentialJson.inputs && typeof potentialJson.inputs === 'object' && !Array.isArray(potentialJson.inputs) &&
            potentialJson.outputs && typeof potentialJson.outputs === 'object' && !Array.isArray(potentialJson.outputs) &&
            (Object.keys(potentialJson.inputs).length > 0 || Object.keys(potentialJson.outputs).length > 0);

      if (hasValidIOStructure) {
        setIsFewShotPossible(true);
        setTotalSteps(5);
      } else {
        setIsFewShotPossible(false);
        setTotalSteps(3);
      }
    }
  }, [currentStep, parsedJsonToEdit, systemPromptContent]);

  const handleNext = () => {
    if (currentStep === 1) {
      const compiledHistorySource = {};
      if (isHistoryEnabled) compiledHistorySource.history = historyCount;
      if (isPromptEnabled) compiledHistorySource.prompt = 1;
      if (isModelsEnabled && selectedHistoryModels.length > 0) compiledHistorySource.models = selectedHistoryModels;
      setHistorySource(compiledHistorySource);
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Move to editor (Step 3)
      setJsonValidationError(null);
      if (systemPromptContent) {
        try {
          const parsed = JSON.parse(systemPromptContent);
          if (typeof parsed === 'object' && parsed !== null) {
            setParsedJsonToEdit(parsed);
            setIsJsonPrompt(true);
          } else {
            setJsonValidationError("Content is valid JSON but not an object. Editing as text.");
            setParsedJsonToEdit(null);
            setIsJsonPrompt(false);
          }
        } catch (e) {
          setJsonValidationError("Content is not valid JSON. Editing as text.");
          setParsedJsonToEdit(null);
          setIsJsonPrompt(false);
        }
      } else {
        setSystemPromptContent("You are a helpful AI assistant.");
        setParsedJsonToEdit(null);
        setIsJsonPrompt(false);
      }
      setCurrentStep(3);
    } else if (currentStep === 3) { // From Editor to I/O Selection
        let finalJson = parsedJsonToEdit;
        if (!finalJson) try { finalJson = JSON.parse(systemPromptContent); } catch { finalJson = null; }

        if (finalJson) {
            const inputKeys = Object.keys(finalJson.inputs || {});
            const outputKeys = Object.keys(finalJson.outputs || {});
            setTemplateIO({ inputs: inputKeys, outputs: outputKeys });
            setSelectedIO({ inputs: new Set(inputKeys), outputs: new Set(outputKeys) });
        }
        setCurrentStep(4);
    } else if (currentStep === 4) { // From I/O Selection to Add Examples
        const exampleShape = { inputs: {}, outputs: {} };
        selectedIO.inputs.forEach(key => exampleShape.inputs[key] = '');
        selectedIO.outputs.forEach(key => exampleShape.outputs[key] = '');
        setCurrentExample(exampleShape);
        setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setSystemPromptContent(e.target.result);
    reader.readAsText(file);
  };
  
  const handleSkipUpload = () => {
    setSystemPromptContent("You are a helpful AI assistant.");
    setParsedJsonToEdit(null);
    setIsJsonPrompt(false);
    setJsonValidationError(null);
    setCurrentStep(3);
  };

  const handleJsonDataChange = async (path, key, value, isDelete = false) => {
    if (!parsedJsonToEdit) return false;
    let newData = JSON.parse(JSON.stringify(parsedJsonToEdit));
    let current = newData;
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]];
    }
    if (isDelete) delete current[key]; else current[key] = value;
    setParsedJsonToEdit(newData);
    setSystemPromptContent(JSON.stringify(newData, null, 2));
    setJsonValidationError(null);
    return true;
  };


  const handleCreateChat = () => {
    let finalSystemPrompt = systemPromptContent;
    if (isJsonPrompt && parsedJsonToEdit) {
      finalSystemPrompt = JSON.stringify(parsedJsonToEdit, null, 2);
    }

    const newModelConfigurationData = {
      name: configName,
      value: selectedModelValue,
      systemPrompt: finalSystemPrompt,
      temperature: parseFloat(temperature),
      maxTokens: parseInt(maxTokens),
      topP: parseFloat(topP),
      minP: parseFloat(minP),
      historySource: historySource,
    };

    if (isFewShotPossible && fewShotExamples.length > 0) {
      newModelConfigurationData.examples = fewShotExamples;
    }

    const newlyCreatedModel = useStore.getState().addNewModelFromConfig(newModelConfigurationData);
    
    if (newlyCreatedModel) {
      onFinalizeCreation(newlyCreatedModel);
    } else {
      onClose();
    }
  };

  const handleHistoryModelSelectionChange = (targetModelId, isChecked) => {
    setSelectedHistoryModels(prev => 
      isChecked ? [...prev, targetModelId] : prev.filter(id => id !== targetModelId)
    );
  };

  // --- RENDER FUNCTIONS FOR NEW STEPS ---
  const handleIOSelection = (type, key, checked) => {
    setSelectedIO(prev => {
        const newSet = new Set(prev[type]);
        if (checked) newSet.add(key); else newSet.delete(key);
        return { ...prev, [type]: newSet };
    });
  };

  const renderStep4_IOSelection = () => (
    <div className="space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Select Input/Output Fields</h3>
        <p className="text-slate-400">Choose which fields from your template you want to use for providing examples.</p>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-sky-400">Inputs</label>
            <div className="bg-slate-700/50 p-3 rounded-lg space-y-2 border border-slate-600">
                {templateIO.inputs.length > 0 ? templateIO.inputs.map(key => (
                    <label key={`in-${key}`} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" checked={selectedIO.inputs.has(key)} onChange={e => handleIOSelection('inputs', key, e.target.checked)} className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2" />
                        <span>{key}</span>
                    </label>
                )) : <p className="text-slate-500 text-sm italic">No input fields found in template.</p>}
            </div>
        </div>
        <div className="space-y-2">
            <label className="block text-sm font-medium text-sky-400">Outputs</label>
            <div className="bg-slate-700/50 p-3 rounded-lg space-y-2 border border-slate-600">
                {templateIO.outputs.length > 0 ? templateIO.outputs.map(key => (
                    <label key={`out-${key}`} className="flex items-center gap-2 cursor-pointer text-slate-300">
                        <input type="checkbox" checked={selectedIO.outputs.has(key)} onChange={e => handleIOSelection('outputs', key, e.target.checked)} className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2" />
                        <span>{key}</span>
                    </label>
                )) : <p className="text-slate-500 text-sm italic">No output fields found in template.</p>}
            </div>
        </div>
    </div>
  );
  
  const handleExampleFieldChange = (type, key, value) => {
    setCurrentExample(prev => ({ ...prev, [type]: { ...prev[type], [key]: value } }));
  };
  const handleAddExample = () => {
    if (!currentExample) return;
    const allFilled = [...Object.values(currentExample.inputs), ...Object.values(currentExample.outputs)].every(v => v.trim() !== '');
    if (!allFilled) {
        alert("Please fill all fields for the example.");
        return;
    }
    setFewShotExamples(prev => [...prev, currentExample]);
    const exampleShape = { inputs: {}, outputs: {} };
    selectedIO.inputs.forEach(key => exampleShape.inputs[key] = '');
    selectedIO.outputs.forEach(key => exampleShape.outputs[key] = '');
    setCurrentExample(exampleShape);
  };
  const handleRemoveExample = (index) => {
    setFewShotExamples(prev => prev.filter((_, i) => i !== index));
  };
  
  const renderStep5_AddExamples = () => (
    <div className="space-y-6">
        <h3 className="text-lg font-medium text-slate-200">Add Few-Shot Examples</h3>
        {currentExample && (
            <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 space-y-4">
                <h4 className="font-semibold text-slate-300">New Example</h4>
                {Array.from(selectedIO.inputs).length > 0 && <div className="space-y-2">
                    <label className="text-sm font-medium text-sky-400">Inputs</label>
                    {Array.from(selectedIO.inputs).map(key => (
                        <div key={`ex-in-${key}`}>
                            <label htmlFor={`ex-in-${key}`} className="block text-xs text-slate-400 mb-1">{key}</label>
                            <textarea id={`ex-in-${key}`} value={currentExample.inputs[key] || ''} onChange={e => handleExampleFieldChange('inputs', key, e.target.value)} className="w-full h-20 bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 placeholder-slate-400 resize-y focus:ring-2 focus:ring-sky-500 focus:border-transparent"/>
                        </div>
                    ))}
                </div>}
                {Array.from(selectedIO.outputs).length > 0 && <div className="space-y-2">
                    <label className="text-sm font-medium text-sky-400">Outputs</label>
                    {Array.from(selectedIO.outputs).map(key => (
                        <div key={`ex-out-${key}`}>
                            <label htmlFor={`ex-out-${key}`} className="block text-xs text-slate-400 mb-1">{key}</label>
                            <textarea id={`ex-out-${key}`} value={currentExample.outputs[key] || ''} onChange={e => handleExampleFieldChange('outputs', key, e.target.value)} className="w-full h-20 bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 placeholder-slate-400 resize-y focus:ring-2 focus:ring-sky-500 focus:border-transparent"/>
                        </div>
                    ))}
                </div>}
                <button onClick={handleAddExample} className="px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">
                    Add This Example
                </button>
            </div>
        )}
        <div className="space-y-3">
            <h4 className="font-semibold text-slate-300">Added Examples ({fewShotExamples.length})</h4>
            {fewShotExamples.length === 0 && <p className="text-slate-500 text-sm italic">No examples added yet.</p>}
            {fewShotExamples.map((ex, index) => (
                <div key={index} className="p-3 bg-slate-900/50 rounded-lg relative border border-slate-700">
                    <button onClick={() => handleRemoveExample(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-400 p-1 rounded-full hover:bg-slate-700">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-slate-400 font-mono mb-2">Example {index + 1}</p>
                    <div className="text-sm space-y-1">
                      {Object.entries(ex.inputs).map(([k,v]) => <div key={k}><strong>{k}:</strong> <span className="text-slate-300 whitespace-pre-wrap">{v}</span></div>)}
                      {Object.entries(ex.outputs).map(([k,v]) => <div key={k}><strong>{k}:</strong> <span className="text-slate-300 whitespace-pre-wrap">{v}</span></div>)}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  if (!isOpen) return null;
  const availableModelsForHistory = existingModels;

  return (
    <div className="fixed inset-0 bg-slate-900 bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 p-6 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-semibold text-sky-400 mb-4">
          New Chat Configuration - Step {currentStep} of {totalSteps}
        </h2>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label htmlFor="configName" className="block text-sm font-medium text-slate-300">Configuration Name</label>
                <input type="text" id="configName" value={configName} onChange={(e) => setConfigName(e.target.value)}
                       className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="modelValue" className="block text-sm font-medium text-slate-300">Base Model</label>
                <select id="modelValue" value={selectedModelValue} onChange={(e) => setSelectedModelValue(e.target.value)}
                        className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                  {Object.entries(modelsList).map(([label, value]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Temperature: {temperature}</label>
                <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} 
                       className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb"/>
              </div>
               <div>
                <label className="block text-sm font-medium text-slate-300">Max Tokens: {maxTokens}</label>
                <input type="number" min="1" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))}
                 className="mt-1 block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Top P: {topP.toFixed(2)}</label>
                <input type="range" min="0" max="1" step="0.01" value={topP} onChange={e => setTopP(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Min P: {minP.toFixed(2)}</label>
                <input type="range" min="0" max="1" step="0.01" value={minP} onChange={e => setMinP(parseFloat(e.target.value))}
                       className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider-thumb" />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-sm font-medium text-slate-200">
                  Take history from <span className="text-xs text-slate-400">(Optional)</span>
                </label>
                <div className={`bg-slate-700/50 border rounded-lg p-3 space-y-3 border-slate-600`}>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isHistoryEnabled}
                        onChange={(e) => setIsHistoryEnabled(e.target.checked)}
                        className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                      />
                      <span className="text-sm text-slate-200">History</span>
                    </label>
                    {isHistoryEnabled && (
                      <div className="ml-6">
                        <input
                          type="number"
                          min="-1"
                          value={historyCount}
                          onChange={(e) => setHistoryCount(parseInt(e.target.value) || 0)}
                          className="w-20 bg-slate-600 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Count"
                        />
                        <span className="ml-2 text-xs text-slate-400">messages (-1 for all)</span>
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPromptEnabled}
                      onChange={(e) => setIsPromptEnabled(e.target.checked)}
                      className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                    />
                    <span className="text-sm text-slate-200">Prompt</span>
                  </label>

                  {availableModelsForHistory.length > 0 && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isModelsEnabled}
                          onChange={(e) => setIsModelsEnabled(e.target.checked)}
                          className="w-4 h-4 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-2"
                        />
                        <span className="text-sm text-slate-200">Models</span>
                      </label>
                      {isModelsEnabled && (
                        <div className="ml-6 space-y-2 border-l border-slate-600 pl-3 max-h-24 overflow-y-auto custom-scrollbar-thin">
                          {availableModelsForHistory.map(targetModel => (
                            <label key={targetModel.id} className={`flex items-center gap-2 cursor-pointer`}>
                              <input
                                type="checkbox"
                                checked={selectedHistoryModels.includes(targetModel.id)}
                                onChange={(e) => handleHistoryModelSelectionChange(targetModel.id, e.target.checked)}
                                className="w-3 h-3 text-sky-500 bg-slate-600 border-slate-500 rounded focus:ring-sky-500 focus:ring-1"
                              />
                              <span className={`text-xs text-slate-300`}>{targetModel.name} (ID: {targetModel.id})</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-slate-300">Upload a system prompt template (.txt or .json). If the JSON contains "inputs" and "outputs" objects, you can create few-shot examples in later steps.</p>
              <div>
                <label htmlFor="promptFile" className="block text-sm font-medium text-slate-300">Upload File</label>
                <input type="file" id="promptFile" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.json"
                       className="mt-1 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"/>
              </div>
               {systemPromptContent && <p className="text-xs text-slate-400">File selected. Preview (first 100 chars): {systemPromptContent.substring(0,100)}...</p>}
            </div>
          )}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-slate-300">Edit the system prompt. If it contains valid "inputs" and "outputs" JSON objects, you can proceed to add examples.</p>
              {jsonValidationError && <p className="text-yellow-400 text-sm mb-2">{jsonValidationError}</p>}
              {isJsonPrompt && parsedJsonToEdit ? (
                <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 max-h-80 overflow-y-auto custom-scrollbar-thin">
                  <JsonRenderer data={parsedJsonToEdit} onDataChange={handleJsonDataChange} />
                </div>
              ) : (
                <textarea value={systemPromptContent} onChange={(e) => {
                    setSystemPromptContent(e.target.value);
                    if (isJsonPrompt) setIsJsonPrompt(false); 
                    if (parsedJsonToEdit) setParsedJsonToEdit(null);
                }}
                  className="w-full h-40 bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-100 placeholder-slate-400 resize-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Enter system prompt..."/>
              )}
            </div>
          )}
          {currentStep === 4 && renderStep4_IOSelection()}
          {currentStep === 5 && renderStep5_AddExamples()}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-sky-500">Cancel</button>
          <div className="flex gap-3">
            {currentStep > 1 && <button onClick={handleBack} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md">Back</button>}
            
            {/* Step 1 & 2 Navigation */}
            {(currentStep === 1) && <button onClick={handleNext} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">Next</button>}
            {currentStep === 2 && (
              <>
                <button onClick={handleSkipUpload} className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-600 hover:bg-slate-500 rounded-md">Skip & Use Default</button>
                <button onClick={handleNext} disabled={!systemPromptContent} className={`px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md ${!systemPromptContent ? 'opacity-50 cursor-not-allowed' : ''}`}>Use File & Next</button>
              </>
            )}

            {/* Step 3 (Dynamic Button) */}
            {currentStep === 3 && isFewShotPossible && (
              <button onClick={handleNext} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">Next</button>
            )}
            {currentStep === 3 && !isFewShotPossible && (
               <button onClick={handleCreateChat} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Create Chat</button>
            )}

            {/* Step 4 & 5 Navigation */}
            {currentStep === 4 && <button onClick={handleNext} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md">Next</button>}
            {currentStep === 5 && <button onClick={handleCreateChat} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Create Chat</button>}
          </div>
        </div>
      </div>
      <style>{`
          .slider-thumb::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #0ea5e9; cursor: pointer; border: 2px solid #1e293b; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
          .slider-thumb::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #0ea5e9; cursor: pointer; border: 2px solid #1e293b; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: #334155; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
          .custom-scrollbar-thin::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
          .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `}</style>
    </div>
  );
};

export default NewChatModal;