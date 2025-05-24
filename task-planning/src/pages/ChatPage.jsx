import { use, useEffect, useState } from 'react';
import Header from '../components/Header';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import useStore from '../store/store';
import { useNavigate} from 'react-router';
import apiService from '../utils/api';

function ChatPage({ onNewChat }) {
  const { messages, addMessage, updateMessage, clearMessages, selectedModel, fetchMessagesForID, chats, fetchChatIDs, activeChatID, setActiveChatID } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chat_ID, setChatID] = useState(activeChatID || null);
  const [isChatsLoaded, setIsChatsLoaded] = useState(false);
  const navigate = useNavigate();

  //get active chat id from url after /chat/
  const currentPath = window.location.pathname;
  setActiveChatID(currentPath.split('/')[2] || null);

  useEffect(() => {
    //fetch chats on first load
    if (chats.length === 0) {
      fetchChatIDs().then(() => {
        setIsChatsLoaded(true);
      });
    } else {
      setIsChatsLoaded(true);
    }
  }, [chats.length, fetchChatIDs]);

  useEffect(() => {
    //if chatid changed, clear messages, get messages
    clearMessages();
    // console.log("Active chat ID", activeChatID);
    setChatID(activeChatID);
    // Call Flask switch-chat API instead of fetchMessagesForID
    switchToChat(activeChatID);
  }, [activeChatID]);

  useEffect(() => {
    //if url chatid not in chats, navigate to /chats - only run after chats are loaded
    if (isChatsLoaded) {
      if ((activeChatID && !chats.some(chat => chat.id === activeChatID)) || (!activeChatID && chats.length > 0)) {
        // console.log("chatid: ", chat_ID, " not found in chats: ", chats);
        navigate('/chat');
      }
    }
  }, [activeChatID, chats, isChatsLoaded, navigate]);

  // Add this new function to handle chat switching
  const switchToChat = async (chatId) => {
    if (!chatId) {
      //initial load, no chat ID
      return;
    }
    try {
      const response = await fetch('http://127.0.0.1:5000/switch-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: chatId,
        })
      });


      try {
        const response2 = await apiService.get(`chats/get-chat-history/${chatId}/`);
        const data2 = response2.data;
        // console.log(data2);
        // data2.forEach((msg, index) => {
        //   addMessage({
        //     id: Date.now() + index,
        //     content: msg.content,
        //     role: msg.role === 'assistant' ? 'bot' : msg.role,
        //     isTyping: false
        //   });
        // });

        if (response2.data.error && response2.data.error === "Chat doesn't exist or has no messages") {
          console.warn("No messages found for this chat ID:", chatId);
          return; // No messages to process
        }

        for (const msg of data2) {
          const message = msg.message;
          addMessage({
            id: Date.now() + Math.random(), // Use random to avoid collisions
            content: message.content,
            role: message.role === 'assistant' ? 'bot' : message.role,
            isTyping: false
          });
        }

        // console.log("Fetched messages: ", useStore.getState().messages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        throw new Error("Failed to fetch chat history: " + error.message);
      }
    } catch (error) {
      console.error('Error switching chat:', error);
    }
  };

  const sendMessageToServer = async (message) => {
    try {
      // Variable to hold the active chat ID for this request
      let activeChatID = chat_ID;

      // If no chat ID exists, create a new chat
      if (!activeChatID) {
        if (onNewChat) {
          const newChatID = await onNewChat();
          // console.log("Created new chat ID:", newChatID);
          
          // Store the new ID in our variable for immediate use
          activeChatID = newChatID;
          
          // Also update the state for future requests
          setChatID(newChatID);
          
          // Navigate with the new ID
          navigate(`/chat/${newChatID}`);
        } else {
          throw new Error("Unable to create new chat");
        }
      } else {
        console.log("Using existing Chat ID:", activeChatID);
        navigate(`/chat/${activeChatID}`);
      }

      // Create a unique ID for the bot response message
      const botResponseId = Date.now() + 1;
      
      // Add a bot message with a typing indicator
      addMessage({
        id: botResponseId,
        content: '',
        role: 'bot',
        isTyping: true
      });


      try {
        const sendingMessageResponse = await apiService.post('chats/save-chat/', {
          chat_id: activeChatID,
          message: {
            role: 'user',
            content: message
          }
        });
      } catch (error) {
        console.error("Error saving user message:", error);
        throw new Error("Failed to save user message: " + error.message);
      }

      // Use fetch for streaming - with the activeChatID
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          model: selectedModel,
          chat_id: activeChatID  // Use the active ID, not the state variable
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get a reader from the response body stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      
      // Process the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("Stream complete");
          try {
          const response = await apiService.post('chats/save-chat/', {
            chat_id: activeChatID,
            message: {
              role: 'assistant',
              content: accumulatedText
            }
          });
        } catch (error) {
          console.error("Error saving bot response:", error);
        }
          break;
        }
        
        // Decode the chunk and log it for debugging
        const chunk = decoder.decode(value, { stream: true });
        console.log("Received chunk:", chunk);
        
        // Process all lines in the chunk
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          try {
            const parsedData = JSON.parse(line);
            
            if (parsedData.error) {
              console.error("Error from server:", parsedData.error);
              updateMessage(botResponseId, { 
                content: "Sorry, an error occurred: " + parsedData.error, 
                isTyping: false 
              });
            } else if (parsedData.content) {
              // Add new content to the accumulated text
              accumulatedText += parsedData.content;
              
              // Force immediate update to show streaming effect
              updateMessage(botResponseId, { 
                content: accumulatedText, 
                isTyping: true 
              });
            }
          } catch (error) {
            console.error("Error parsing JSON:", error, "Raw line:", line);
          }
        }
      }
      
      // Once stream is complete, remove typing indicator
      updateMessage(botResponseId, { isTyping: false });
      
      return { success: true };
    } catch (error) {
      console.error('Error communicating with server:', error);
      
      // Add error message
      addMessage({
        id: Date.now() + 1,
        content: "Sorry, I'm having trouble connecting to the server right now.",
        role: 'bot',
        isTyping: false
      });
      
      return { success: false };
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const newUserMessage = {
      id: Date.now(),
      content: inputValue,
      role: 'user',
    };
    addMessage(newUserMessage);
    setInputValue('');
    setIsBotTyping(true);

    try {
      await sendMessageToServer(inputValue);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans">
      <Header />
      <MessageList messages={messages} />
      <ChatInput 
        inputValue={inputValue} 
        setInputValue={setInputValue} 
        handleSendMessage={handleSendMessage} 
      />
    </div>
  );
}

export default ChatPage;
