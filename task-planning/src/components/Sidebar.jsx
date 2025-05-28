import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import useStore from '../store/store';
import ConfirmationModal from './ConfirmationModal';
import apiService from '../utils/api';

const Sidebar = ({ chats = [], onNewChat }) => {
  const [expanded, setExpanded] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, chatId: null, chatTitle: '' });
  const navigate = useNavigate();
  const location = useLocation();
  const {setActiveChatID, fetchChatIDs} = useStore();

  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  const handleNewChat = async () => {
    if (onNewChat) {
      const new_chat_id = await onNewChat();
      handleChatSelect(new_chat_id);
    }
  };
  
  const handleChatSelect = (chatId) => {
    setActiveChatID(chatId);
    // Navigate to the selected chat - the ChatPage useEffect will handle the switch
    navigate(`/chat/${chatId}`);
  };

  const handleDeleteClick = (e, chatId, chatTitle) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    setDeleteModal({ 
      isOpen: true, 
      chatId, 
      chatTitle: chatTitle || 'Untitled Chat' 
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.chatId) {
      await apiService.delete(`/chats/delete-chat/${deleteModal.chatId}/`);
      await fetchChatIDs(); // Refresh chat list after deletion
      // If we're currently viewing the deleted chat, navigate to home
      if (location.pathname === `/chat/${deleteModal.chatId}`) {
        navigate('/');
      }
    }
    setDeleteModal({ isOpen: false, chatId: null, chatTitle: '' });
  };

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, chatId: null, chatTitle: '' });
  };

  return (
    <>
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
                <div
                  key={chat.id}
                  className={`sidebar-item w-full group relative`}
                >
                  <button
                    onClick={() => handleChatSelect(chat.id)}
                    className={`w-full p-3 rounded-lg focus:bg-slate-700/90 focus:ring-2 flex items-center transition-all ${
                      isActive 
                        ? 'bg-slate-700/90 text-slate-100 shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-slate-100'
                    } ${
                        expanded ? 'gap-2 pr-10' : 'gap-0 px-6 justify-center'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="w-5 h-5 sidebar-icon flex-shrink-0" />
                    <span className="sidebar-content truncate">
                      {chat.title || 'Untitled Chat'}
                    </span>
                  </button>
                  
                  {/* Delete Button - only render when expanded */}
                  {expanded && (
                    <button
                      onClick={(e) => handleDeleteClick(e, chat.id, chat.title)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/70 opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out focus:opacity-100 focus:ring-2 focus:ring-red-500"
                      aria-label={`Delete ${chat.title || 'Untitled Chat'}`}
                      title="Delete chat"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Chat"
        message={`Are you sure you want to delete "${deleteModal.chatTitle}"? This action cannot be undone.`}
      />
    </>
  );
};

export default Sidebar;
