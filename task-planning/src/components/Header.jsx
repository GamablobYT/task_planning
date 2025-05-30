import React from 'react';

const Header = () => {
  return (
    <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-10 flex items-center justify-center">
      <h1 className="text-xl font-semibold text-sky-400">
        AI Chat Assistant
      </h1>
    </header>
  );
};

export default Header;
