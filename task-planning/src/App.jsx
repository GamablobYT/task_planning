import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate as useReactRouterNavigate } from 'react-router-dom';
import "./App.css";
import ChatPage from './pages/ChatPage';
import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import checkSession from './utils/checkSession';
import ProtectedRoute from './utils/ProtectedRoute';
import apiService from './utils/api';
import NewChatModal from './components/NewChatModal'; // Import the new modal
import SettingsSidebar from './components/SettingsSidebar'; // Assuming SettingsSidebar is imported if used in ChatPage

import useStore from './store/store';

function AppContent() {
  const { chats, setChats, activeChatID, setActiveChatID } = useStore();
  const { csrfToken, fetchCsrfToken, setRole } = useStore();
  const { isAuthenticated, setAuthentication } = useStore();
  const navigate = useReactRouterNavigate(); // Alias to avoid conflict if any

  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatModalMode, setNewChatModalMode] = useState(null); // 'initial' or 'add'
  
  const location = useLocation();
  const isChatPage = location.pathname.startsWith("/chat");

  useEffect(() => {
    useStore.getState().initializeNextModelId(); // Initialize model ID counter

    // Check the session when the app loads
    const validateSession = async () => {
      try {
        const authenticated = await checkSession();
        setAuthentication(authenticated);
      }
      catch (error) {
        console.error("Error validating session:", error);
        setAuthentication(false);
      }
    };
    
    const fetchRole = async () => {
      const response = await apiService.get("/users/get-role/");
      // console.log(response.data.role);
      setRole(response.data.role);
      localStorage.setItem("userRole", response.data.role);
    }

    const init = async () => {
      if (!csrfToken) {
        await fetchCsrfToken();
      }

      await validateSession();
      await fetchRole();
    }
    init();
  }, [csrfToken, fetchCsrfToken, setAuthentication, setRole]);

  const openNewChatModal = (mode) => {
    setNewChatModalMode(mode);
    setIsNewChatModalOpen(true);
  };

  const handleNewChatTrigger = () => {
    openNewChatModal('initial');
  };

  const handleFinalizeChatCreation = async (modelForAction, mode) => {
    setIsNewChatModalOpen(false); // Close modal regardless of action
    setNewChatModalMode(null);

    if (mode === 'add') {
      // If mode is 'add', the model is already added to the store by NewChatModal.
      // No further action (like creating a chat) is needed here.
      console.log("Model added to store via Settings. No new chat created.");
      return;
    }

    // Proceed with chat creation only if mode is 'initial' (or similar that implies new chat)
    if (!modelForAction || !modelForAction.value) {
      console.error("Invalid model configuration received for chat creation.");
      return;
    }

    try {
      const requestBody = {
        model: modelForAction.value, 
      };

      if (modelForAction.examples && modelForAction.examples.length > 0) {
        requestBody.examples = modelForAction.examples;
      }

      const response = await fetch("http://127.0.0.1:5000/new-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        console.error("Failed to create a new chat on the backend");
        return;
      }
      const data = await response.json();
      console.log("New chat created on backend:", data);

      const newChat = {
        id: data.chat_id,
        title: modelForAction.name || "New Chat",
        initialInputs: modelForAction.initialInputs || {}, // Store initialInputs
        examples: modelForAction.examples || [] // Store examples
      };
      
      const updatedChats = [newChat, ...useStore.getState().chats];
      setChats(updatedChats);
      setActiveChatID(newChat.id);
      
      navigate(`/chat/${newChat.id}`);
    } catch (error) {
      console.error("Error finalizing chat creation:", error);
    }
    // Modal is already closed at the beginning of this function.
  };


  if (useStore.getState().isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex h-screen bg-slate-900 text-slate-100">
        {isChatPage && <Sidebar chats={chats} onNewChat={handleNewChatTrigger} />}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/signup" replace />} />
            <Route path='*' element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/signup" />} />
            <Route path="/login" element={isAuthenticated ? <Navigate to='/chat' /> : <Login />} />
            <Route path="/signup" element={isAuthenticated ? <Navigate to='chat' /> : <SignUp />} />
            <Route element={<ProtectedRoute />} >
              {/* Pass onAddModelRequest to ChatPage, which then passes to SettingsSidebar */}
              <Route path="/chat/:chatId?" element={<ChatPage onAddModelRequest={() => openNewChatModal('add')} />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
          </Routes>
        </div>
      </div>
      {isNewChatModalOpen && (
        <NewChatModal
          isOpen={isNewChatModalOpen}
          onClose={() => {
            setIsNewChatModalOpen(false);
            setNewChatModalMode(null);
          }}
          onFinalizeCreation={handleFinalizeChatCreation}
          creationMode={newChatModalMode}
        />
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;