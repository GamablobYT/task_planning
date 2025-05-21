import React from 'react';
import useStore from '../store/store';
import modelsList from '../consts/models';

const Header = () => {
  const {selectedModel, setModel} = useStore();

  return (
    <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-10 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-left text-sky-400">AI Chat Assistant</h1>
      
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="relative">
          <select 
            className="bg-slate-700/70 backdrop-blur-sm text-slate-100 border border-slate-600/80 rounded-lg py-2 px-4 pr-10
                      hover:bg-slate-700/90 hover:border-slate-500
                      focus:outline-none focus:ring-2 focus:ring-sky-500/70 appearance-none
                      cursor-pointer transition-all duration-200 ease-in-out shadow-md"
            value={selectedModel || Object.keys(modelsList)[0]}
            onChange={(e) => setModel(e.target.value)}
          >
            {Object.keys(modelsList).map((modelKey) => (
              <option key={modelKey} value={modelsList[modelKey]}>
                {modelKey}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </div>
        </div>
      </div>
      
      <div className="w-[120px]"></div> {/* Empty div for balanced spacing */}
    </header>
  );
};

export default Header;
