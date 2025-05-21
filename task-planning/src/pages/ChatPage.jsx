import { useState } from 'react';
import Header from '../components/Header';
import MessageList from '../components/MessageList';
import ChatInput from '../components/ChatInput';
import useStore from '../store/store';

function ChatPage() {
  const { messages, addMessage, updateMessage } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  const sendMessageToServer = async (message) => {
    try {
      // Create a unique ID for the bot response message
      const botResponseId = Date.now() + 1;
      
      // Add a bot message with a typing indicator
      addMessage({
        id: botResponseId,
        text: '',
        sender: 'bot',
        isTyping: true
      });
      
      // Use fetch for streaming
      const response = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message
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
                text: "Sorry, an error occurred: " + parsedData.error, 
                isTyping: false 
              });
            } else if (parsedData.content) {
              // Add new content to the accumulated text
              accumulatedText += parsedData.content;
              
              // Force immediate update to show streaming effect
              updateMessage(botResponseId, { 
                text: accumulatedText, 
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
        text: "Sorry, I'm having trouble connecting to the server right now.",
        sender: 'bot',
        isTyping: false
      });
      
      return { success: false };
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim() === '') return;

    const newUserMessage = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
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
