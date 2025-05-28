import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-slate-300 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition-all duration-200 ease-in-out focus:ring-2 focus:ring-slate-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-all duration-200 ease-in-out hover:scale-105 focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
