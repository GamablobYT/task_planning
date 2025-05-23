import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import "./App.css";
import ChatPage from './pages/ChatPage';
import Sidebar from './components/Sidebar';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import checkSession from './utils/checkSession';
import ProtectedRoute from './utils/ProtectedRoute';
import apiService from './utils/api';

import useStore from './store/store';

function App() {
  const {selectedModel, chats, setChats, activeChatID} = useStore();
  const {csrfToken, fetchCsrfToken, setRole} = useStore();
  const {isAuthenticated, setAuthentication} = useStore();

  const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";

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
    
    setChats([newChat, ...chats]);
    return newChat.id;
  };

  if (useStore.getState().isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="flex h-screen bg-slate-900 text-slate-100">
        {!isAuthPage && <Sidebar chats={chats} onNewChat={handleNewChat} />}
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Navigate to="/signup" replace />} />
            <Route path='*' element={isAuthenticated ? <Navigate to="/chat" /> : <Navigate to="/signup" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route element={<ProtectedRoute />} >
              <Route path="/chat/:chatId?" element={<ChatPage onNewChat={handleNewChat} chatID={activeChatID}/>} />
            </Route>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
