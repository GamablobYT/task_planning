import { use, useEffect, useState } from 'react';
import Header from '../components/Header';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import SettingsSidebar from '../components/SettingsSidebar';
import ProfileDropdown from '../components/ProfileDropdown';
import useStore from '../store/store';
import { useNavigate} from 'react-router';
import apiService from '../utils/api';

function ChatPage({ onNewChat }) {
  const { messages, addMessage, updateMessage, clearMessages, models, fetchMessagesForID, chats, fetchChatIDs, activeChatID, setActiveChatID } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [chat_ID, setChatID] = useState(activeChatID || null);
  const [isChatsLoaded, setIsChatsLoaded] = useState(false);
  const [isSwitchingChat, setIsSwitchingChat] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  // Parse URL and set active chat ID
  useEffect(() => {
    const currentPath = window.location.pathname;
    const urlChatID = currentPath.split('/')[2] || null;
    if (urlChatID !== activeChatID) {
      setActiveChatID(urlChatID);
    }
  }, [window.location.pathname, setActiveChatID]);

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
    if (isSwitchingChat) return; // Prevent duplicate calls
    
    clearMessages();
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
    if (!chatId || isSwitchingChat) {
      //initial load, no chat ID or already switching
      return;
    }
    
    setIsSwitchingChat(true);
    
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

        const flaskHistory = [];
        
        if (Array.isArray(data2)) {
          for (const msg of data2) {
            const message = msg.message;
            flaskHistory.push({
              role: message.role,
              content: message.content
            })
          }
        }

        try {
          const sendingHistory = await fetch('http://127.0.0.1:5000/send-chat-history', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({messages: flaskHistory})
          });
        } catch (error) {
          console.error("Error sending chat history to Flask:", error);
          throw new Error("Failed to send chat history to Flask: " + error.message);
        }

        if (response2.data.error && response2.data.error === "Chat doesn't exist or has no messages") {
          console.warn("No messages found for this chat ID:", chatId);
          return; // No messages to process
        }

        if (typeof data2 === 'object') {
          for (const msg of data2) {
            const message = msg.message;
            addMessage({
              id: message.message_id,
              content: message.content,
              role: message.role === 'assistant' ? 'bot' : message.role,
              time: Date.now(),
              isTyping: false
            });
          }

          if (data2.length > 1 && data2[data2.length - 1].message.role !== 'assistant') {
            // if last message not from bot that means last request wasn't completed fully
            try {
              const response = await apiService.post('chats/save-chat/', {
                chat_id: chat_ID,
                message: {
                  role: 'assistant',
                  content: 'The last request was not completed. Please try again.'
                },
                message_id: crypto.randomUUID() // Use uuid4 for unique ID
              });
            }
            catch (error) {
              console.error("Error saving message:", error);
              throw new Error("Failed to save user message: " + error.message);
            }
  
            addMessage({
              id: crypto.randomUUID(), //uuid4
              content: 'The last request was not completed. Please try again.',
              role: 'bot',
              isTyping: false,
              time: Date.now()
            })
          }
          // else {
          //   console.log("last message: ", data2[data2.length - 1].message.role);
          // }
        }

        // console.log("Fetched messages: ", useStore.getState().messages);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        throw new Error("Failed to fetch chat history: " + error.message);
      }
    } catch (error) {
      console.error('Error switching chat:', error);
    } finally {
      setIsSwitchingChat(false);
    }
  };

  const chatNameHandling = async (message, id) => {
    try {
      // First check if chat already has a proper name
      const currentChat = chats.find(chat => chat.chat_id === id);
      if (currentChat && currentChat.chat_name && 
          currentChat.chat_name !== "Untitled Chat" && 
          currentChat.chat_name !== "New Chat") {
        return; // Chat already has a proper name
      }

      const response = await fetch(`http://127.0.0.1:5000/get-chat-name`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
        })
      });

      if (!response.ok) {
        console.error("Failed to get chat name");
        return;
      }

      const data = await response.json();
      const name = data.chat_name;

      if (name) {
        const settingNameResponse = await apiService.put(`chats/save-chat-name/${id}/`, {
          chat_name: name
        });
        
        if (settingNameResponse.status === 200) {
          console.log("Chat name updated successfully");
          // Refresh the chat list to show the new name
          fetchChatIDs();
        } else {
          console.error("Failed to save chat name");
        }
      }
    } catch (error) {
      console.error("Error in chatNameHandling:", error);
    }
  }

  const sendMessageToServer = async (message, id) => {
    // Get the number of models
    const numberOfModels = models.length;
    
    try {
      // Variable to hold the active chat ID for this request
      let activeChatID = chat_ID;
      let isNewChat = false;

      // If no chat ID exists, create a new chat
      if (!activeChatID) {
        if (onNewChat) {
          const newChatID = await onNewChat();
          console.log("Created new chat ID:", newChatID);
          
          // Store the new ID in our variable for immediate use
          activeChatID = newChatID;
          isNewChat = true;
          
          // Update the state immediately
          setActiveChatID(newChatID);
          setChatID(newChatID);
          
          // Navigate with the new ID
          navigate(`/chat/${newChatID}`, { replace: true });
          
          // Wait for state updates to propagate
          await new Promise(resolve => setTimeout(resolve, 300));
        } else {
          throw new Error("Unable to create new chat");
        }
      } else {
        console.log("Using existing Chat ID:", activeChatID);
        // Ensure we're on the correct URL
        const currentPath = window.location.pathname;
        const urlChatID = currentPath.split('/')[2] || null;
        if (urlChatID !== activeChatID) {
          navigate(`/chat/${activeChatID}`);
        }
      }

      // Now add the user message
      const newUserMessage = {
        id: id,
        content: message,
        role: 'user',
        time: Date.now()
      };
      addMessage(newUserMessage);

      try {
        const sendingMessageResponse = await apiService.post('chats/save-chat/', {
          chat_id: activeChatID,
          message: {
            role: 'user',
            content: message
          },
          message_id: id
        });
      } catch (error) {
        console.error("Error saving user message:", error);
        throw new Error("Failed to save user message: " + error.message);
      }

      // Small delay to ensure user message is rendered
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create only the first bot message initially
      const botMessageIds = [];
      const firstBotResponseId = crypto.randomUUID();
      botMessageIds.push(firstBotResponseId);
      
      const firstModelName = models[0]?.name || 'Model 1';
      addMessage({
        id: firstBotResponseId,
        content: `**${firstModelName}:**\n`,
        role: 'bot',
        isTyping: true,
        time: Date.now()
      });

      // Use fetch for streaming - with the activeChatID
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          model: models,
          chat_id: activeChatID
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get a reader from the response body stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let currentModelIndex = 0;
      let accumulatedTexts = new Array(numberOfModels).fill('');
      
      // Initialize the first bot message content with model name
      const firstModelNameText = models[0]?.name || 'Model 1';
      accumulatedTexts[0] = `**${firstModelNameText}:**\n`;
      
      // Process the stream chunk by chunk
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("Stream complete");
          
          // Save all bot responses that were created
          for (let i = 0; i < botMessageIds.length; i++) {
            try {
              const response = await apiService.post('chats/save-chat/', {
                chat_id: activeChatID,
                message: {
                  role: 'assistant',
                  content: accumulatedTexts[i]
                },
                message_id: botMessageIds[i]
              });
            } catch (error) {
              console.error(`Error saving bot response ${i}:`, error);
            }
          }

          // Handle chat naming for new chats or chats without proper names
          if (isNewChat || shouldUpdateChatName(activeChatID)) {
            await chatNameHandling(accumulatedTexts[1], activeChatID);
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
              if (currentModelIndex < botMessageIds.length) {
                updateMessage(botMessageIds[currentModelIndex], { 
                  content: accumulatedTexts[currentModelIndex] + "Sorry, an error occurred: " + parsedData.error, 
                  isTyping: false 
                });
              }
            } else if (parsedData.content) {
              // Check if this is a model separator (indicating next model response)
              if (parsedData.content.includes('--- Response from ') && parsedData.content.includes(' ---')) {
                console.log("Model separator detected, switching to next model");
                
                // Finish the current model
                if (currentModelIndex < botMessageIds.length) {
                  updateMessage(botMessageIds[currentModelIndex], { 
                    content: accumulatedTexts[currentModelIndex], 
                    isTyping: false 
                  });
                }
                
                // Move to next model
                currentModelIndex++;
                if (currentModelIndex < numberOfModels) {
                  console.log(`Switching to model ${currentModelIndex}`);
                  
                  // Create the next bot message
                  const nextBotResponseId = crypto.randomUUID();
                  botMessageIds.push(nextBotResponseId);
                  
                  const nextModelName = models[currentModelIndex]?.name || `Model ${currentModelIndex + 1}`;
                  accumulatedTexts[currentModelIndex] = `**${nextModelName}:**\n`;
                  
                  addMessage({
                    id: nextBotResponseId,
                    content: accumulatedTexts[currentModelIndex],
                    role: 'bot',
                    isTyping: true,
                    time: Date.now()
                  });
                } else {
                  console.log("All models processed");
                }
                continue;
              }
              
              // Add new content to the current model's accumulated text
              if (currentModelIndex < numberOfModels && currentModelIndex < botMessageIds.length) {
                accumulatedTexts[currentModelIndex] += parsedData.content;
                
                // Force immediate update to show streaming effect
                updateMessage(botMessageIds[currentModelIndex], { 
                  content: accumulatedTexts[currentModelIndex], 
                  isTyping: true 
                });
              }
            }
          } catch (error) {
            console.error("Error parsing JSON:", error, "Raw line:", line);
          }
        }
      }
      
      // Once stream is complete, remove typing indicator from all bot messages
      for (let i = 0; i < botMessageIds.length; i++) {
        updateMessage(botMessageIds[i], { isTyping: false });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error communicating with server:', error);
      
      // Add error message
      addMessage({
        id: crypto.randomUUID(), // Use uuid4 for unique ID
        content: "Sorry, I'm having trouble connecting to the server right now.",
        role: 'bot',
        isTyping: false,
        time: Date.now()
      });
      
      return { success: false };
    }
  };

  // Helper function to check if chat name should be updated
  const shouldUpdateChatName = (chatId) => {
    const currentChat = chats.find(chat => chat.chat_id === chatId);
    if (!currentChat) return true;
    
    const chatName = currentChat.chat_name;
    return !chatName || chatName === "Untitled Chat" || chatName === "New Chat";
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const messageID = crypto.randomUUID(); // Use uuid4 for unique ID
    const messageContent = inputValue;

    setInputValue('');
    setIsBotTyping(true);

    try {
      await sendMessageToServer(messageContent, messageID);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans">
      {/* Main Chat Content */}
      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <Header />
        <MessageList messages={messages} />
        <ChatInput 
          inputValue={inputValue} 
          setInputValue={setInputValue} 
          handleSendMessage={handleSendMessage} 
        />
        
        {/* Floating Action Buttons */}
        <div className="fixed right-6 top-2 z-30 flex gap-2">
          {/* Profile Button */}
          <ProfileDropdown />
          
          {/* Settings Button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="bg-slate-700/70 backdrop-blur-sm text-slate-100 
                       border border-slate-600/80 rounded-full p-3
                       hover:bg-slate-700/90 hover:border-slate-500 hover:scale-105
                       focus:outline-none focus:ring-2 focus:ring-sky-500/70
                       transition-all duration-200 ease-in-out shadow-lg"
            aria-label="Open settings"
            title="Settings"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Settings Sidebar */}
      <SettingsSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
    </div>
  );
}

export default ChatPage;
