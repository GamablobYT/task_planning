import React from 'react';

const ChatInput = ({ inputValue, setInputValue, handleSendMessage }) => {
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md p-3 sm:p-4 border-t border-slate-700 sticky bottom-0">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type your message..."
          className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder-slate-400 text-slate-100 resize-none"
          rows="1"
        />
        <button
          onClick={handleSendMessage}
          disabled={inputValue.trim() === ''}
          className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
