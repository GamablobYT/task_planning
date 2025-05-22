import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import "./App.css";
import ChatPage from './pages/ChatPage';
import Sidebar from './components/Sidebar';
import useStore from './store/store';

function App() {
  const {selectedModel, chats, setChats, activeChatID} = useStore();

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

  return (
    <Router>
      <div className="flex h-screen bg-slate-900 text-slate-100">
        <Sidebar chats={chats} onNewChat={handleNewChat} />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/chat/:chatId?" element={<ChatPage onNewChat={handleNewChat} chatID={activeChatID}/>} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
