import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import useStore from '../store/store';

const Sidebar = ({ chats = [], onNewChat }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {setActiveChatID} = useStore();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  const handleNewChat = async () => {
    if (onNewChat) {
      onNewChat();
    }
  };
  
  const handleChatSelect = (chatId) => {
    setActiveChatID(chatId);
    // Navigate to the selected chat - the ChatPage useEffect will handle the switch
    navigate(`/chat/${chatId}`);
  };
  
  return (
    <div 
      className={`sidebar h-full flex flex-col transition-all duration-300 ease-in-out bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 ${
        expanded ? 'w-64' : 'w-16 sidebar-collapsed'
      }`}
    >
      {/* Header */}
      <div className="flex items-center p-3 sm:p-4 border-b border-slate-700/70">
        <button 
          onClick={toggleSidebar}
          className="sidebar-item p-1.5 rounded-lg text-slate-300 hover:bg-slate-700/70 cursor-pointer focus:bg-slate-700/70 focus:ring-2 hover:text-slate-100 transition-all"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? (
            <ChevronLeftIcon className="w-5 h-5 sidebar-icon" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 sidebar-icon" />
          )}
        </button>
      </div>
      
      {/* Actions Section */}
      <div className="p-3 sm:p-4 flex items-center">
        <div className="sidebar-item flex items-center w-full">
          <span className="sidebar-content text-xs font-medium text-slate-400 uppercase tracking-wider mr-auto">
            {expanded && "Chats"}
          </span>
          <button
            onClick={handleNewChat}
            className="p-2 rounded-full bg-sky-500 hover:bg-sky-600 focus:ring-2 text-white transition-all duration-200 ease-in-out hover:scale-105 cursor-pointer shadow-md sidebar-icon"
            aria-label="New Chat"
            title="New Chat"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-grow overflow-y-auto overflow-x-hidden">
        <div className="p-3 sm:p-4 flex flex-col items-center space-y-2">
          {expanded && chats.length === 0 && (
            <p className="text-slate-400 text-sm">No chat history yet</p>
          )}
          
          {chats.map((chat) => {
            const isActive = location.pathname === `/chat/${chat.id}`;
            
            return (
              <button
                key={chat.id}
                onClick={() => handleChatSelect(chat.id)}
                className={`sidebar-item p-3 rounded-lg focus:bg-slate-700/90 focus:ring-2 flex items-center transition-all ${
                  isActive 
                    ? 'bg-slate-700/90 text-slate-100 shadow-sm' 
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                } ${
                    expanded ? 'gap-2' : 'gap-0 px-6'
                }`}
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5 sidebar-icon" />
                <span className="sidebar-content truncate">
                  {chat.title || 'Untitled Chat'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 sm:p-4 border-t border-slate-700/70">
        <div className="sidebar-item flex items-center">
          <div className="sidebar-content text-xs text-slate-400">
            Task Planning Assistant
          </div>
          <ChatBubbleLeftRightIcon className={`w-5 h-5 text-slate-400 opacity-60 sidebar-icon ${expanded ? 'hidden' : ''}`} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
