import React, { useEffect, useState } from 'react';

const ErrorToast = ({ 
  show, 
  onClose, 
  title = "Error", 
  message, 
  duration = 5000,
  position = "top-right" 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Use a small delay to ensure the element is rendered before animating
      const animateTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      
      const hideTimer = setTimeout(() => {
        handleClose();
      }, duration);
      
      return () => {
        clearTimeout(animateTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Match animation duration
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed ${getPositionClasses()} z-[100] p-4 max-w-md w-full bg-red-600 text-white rounded-lg shadow-xl
                   transform transition-all duration-300 ease-in-out
                   ${isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
      role="alert"
    >
      <div className="flex justify-between items-center">
        <p className="font-semibold">{title}</p>
        <button 
          onClick={handleClose}
          className="ml-2 text-red-100 hover:text-white"
          aria-label="Close error message"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <p className="text-sm mt-1">{message}</p>
    </div>
  );
};

export default ErrorToast;
