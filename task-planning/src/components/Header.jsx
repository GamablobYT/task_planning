import React, { useEffect, useState, useRef } from 'react';
import useStore from '../store/store';
import modelsList from '../consts/models';

const Header = () => {
  const { selectedModel, setModel } = useStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const optionRefs = useRef([]);
  
  // grab an array of the actual model strings:
  const modelValues = Object.values(modelsList);

  useEffect(() => {
    console.log("Selected model changed:", selectedModel);
  }, [selectedModel]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Find the index of the currently selected model
  const getSelectedModelIndex = () => {
    return Object.values(modelsList).findIndex(value => value === selectedModel);
  };

  // Set up option refs when dropdown opens
  useEffect(() => {
    if (isDropdownOpen) {
      // Reset option refs
      optionRefs.current = optionRefs.current.slice(0, Object.keys(modelsList).length);
      
      // Set focus to the currently selected item or first item
      const selectedIndex = getSelectedModelIndex();
      setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      
      // Wait for render then focus
      setTimeout(() => {
        if (optionRefs.current[focusedIndex]) {
          optionRefs.current[focusedIndex].focus();
        }
      }, 10);
    } else {
      setFocusedIndex(-1);
    }
  }, [isDropdownOpen, selectedModel]);

  // Focus the item when focused index changes
  useEffect(() => {
    if (isDropdownOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].focus();
    }
  }, [focusedIndex, isDropdownOpen]);

  // Find the label for the currently selected model
  const getSelectedModelLabel = () => {
    const entry = Object.entries(modelsList).find(([_, value]) => value === selectedModel);
    return entry ? entry[0] : Object.keys(modelsList)[0];
  };

  // Handle keyboard navigation
  const handleDropdownKeyDown = (e) => {
    const optionsCount = Object.keys(modelsList).length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex + 1) % optionsCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prevIndex) => (prevIndex - 1 + optionsCount) % optionsCount);
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(optionsCount - 1);
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        break;
      case 'Tab':
        if (!e.shiftKey && focusedIndex === optionsCount - 1) {
          setIsDropdownOpen(false);
        } else if (e.shiftKey && focusedIndex === 0) {
          setIsDropdownOpen(false);
        }
        break;
      default:
        break;
    }
  };

  // Handle keyboard navigation for the toggle button
  const handleButtonKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsDropdownOpen(true);
    }
  };

  return (
    <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-10 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-left text-sky-400">
        AI Chat Assistant
      </h1>

      <div className="absolute left-1/2 transform -translate-x-1/2">
        <div className="relative" ref={dropdownRef}>
          <button
            className="bg-slate-700/70 backdrop-blur-sm text-slate-100 border border-slate-600/80 rounded-lg py-2 px-4
                     hover:bg-slate-700/90 hover:border-slate-500
                     focus:outline-none focus:ring-2 focus:ring-sky-500/70
                     cursor-pointer transition-all duration-200 ease-in-out shadow-md text-center
                     flex items-center justify-between min-w-[180px]"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            onKeyDown={handleButtonKeyDown}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
            aria-labelledby="model-selection"
            tabIndex={0}
            onFocus={() => console.log("Button focused")}
            style={{ outline: 'none' }} // Prevent default outline, rely on our custom focus styles
          >
            <span id="model-selection">{getSelectedModelLabel()}</span>
            <svg
              className={`w-4 h-4 ml-2 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              ></path>
            </svg>
          </button>
          
          {isDropdownOpen && (
            <div 
              className="absolute mt-1 w-full bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 animate-fadeInUp"
              onKeyDown={handleDropdownKeyDown}
            >
              <ul 
                className="py-1 max-h-60 overflow-auto"
                role="listbox"
                aria-labelledby="model-selection"
              >
                {Object.entries(modelsList).map(([label, value], index) => (
                  <li
                    key={label}
                    className={`px-4 py-2 hover:bg-slate-700 cursor-pointer transition-colors duration-150 focus-visible:outline-none
                              ${selectedModel === value ? 'text-sky-400' : 'text-slate-100'}
                              ${focusedIndex === index ? 'bg-slate-700 ring-0 border-transparent' : ''}`}
                    onClick={() => {
                      setModel(value);
                      setIsDropdownOpen(false);
                    }}
                    role="option"
                    aria-selected={selectedModel === value}
                    tabIndex={0}
                    ref={el => optionRefs.current[index] = el}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setModel(value);
                        setIsDropdownOpen(false);
                      }
                    }}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="w-[120px]"></div>
    </header>
  );
};

export default Header;
