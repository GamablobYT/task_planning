import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1.5 mt-1">
      <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-1"></div>
      <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-2"></div>
      <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-3"></div>
    </div>
  );
};

export default TypingIndicator;
