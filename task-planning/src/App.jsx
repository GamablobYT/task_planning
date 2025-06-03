import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import "./App.css";
import ChatPage from './pages/ChatPage';
import Profile from './pages/Profile';
import Sidebar from './components/Sidebar';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import checkSession from './utils/checkSession';
import ProtectedRoute from './utils/ProtectedRoute';
import apiService from './utils/api';

import useStore from './store/store';
import { useNavigate } from 'react-router-dom';

function AppContent() {
  const {selectedModel, chats, setChats, activeChatID, setActiveChatID} = useStore();
  const {csrfToken, fetchCsrfToken, setRole} = useStore();
  const {isAuthenticated, setAuthentication} = useStore();
  
  const location = useLocation();
  const isChatPage = location.pathname.startsWith("/chat");

  useEffect(() => {
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
  }, [csrfToken, fetchCsrfToken, setAuthentication, setRole]); // Add dependency array

  const handleNewChat = async () => {
    const response = await fetch("http://127.0.0.1:5000/new-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: selectedModel,
      })
    })

    if (!response.ok) {
      console.error("Failed to create a new chat");
      return;
    }
    const data = await response.json();
    console.log("New chat created:", data);

    // Generate a proper UUID instead of using timestamp
    const newChat = {
      id: data.chat_id,
      title: "New Chat"
    };
    
    // Update the store with the new chat
    const updatedChats = [newChat, ...chats];
    setChats(updatedChats);
    
    // Set the new chat as active immediately
    setActiveChatID(newChat.id);
    
    return newChat.id;
  };

  if (useStore.getState().isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100">
      {isChatPage && <Sidebar chats={chats} onNewChat={handleNewChat} />}
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/signup" replace />} />
          <Route path='*' element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/signup" />} />
          <Route path="/login" element={isAuthenticated ? <Navigate to='/chat' /> : <Login />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to='chat' /> : <SignUp />} />
          <Route element={<ProtectedRoute />} >
            <Route path="/chat/:chatId?" element={<ChatPage onNewChat={handleNewChat} />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </div>
    </div>
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
