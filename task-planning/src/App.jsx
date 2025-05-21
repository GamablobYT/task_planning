import { useState, useEffect, useRef } from 'react';
import "./App.css"
import Markdown from 'react-markdown';

function App() {
  const [messages, setMessages] = useState([
    { id: Date.now(), text: "Hello! I'm your friendly chat assistant. How can I help you today?", sender: "bot" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const sendMessageToServer = async (message) => {
    try {
      // Create a unique ID for the bot response message
      const botResponseId = Date.now() + 1;
      
      // Add a bot message with a typing indicator
      setMessages(prevMessages => [...prevMessages, {
        id: botResponseId,
        text: '',
        sender: 'bot',
        isTyping: true
      }]);
      
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
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  msg.id === botResponseId 
                    ? { ...msg, text: "Sorry, an error occurred: " + parsedData.error, isTyping: false } 
                    : msg
                )
              );
            } else if (parsedData.content) {
              // Add new content to the accumulated text
              accumulatedText += parsedData.content;
              
              // Force immediate update to show streaming effect
              setMessages(prevMessages => {
                const updatedMessages = prevMessages.map(msg => 
                  msg.id === botResponseId 
                    ? { ...msg, text: accumulatedText, isTyping: true } 
                    : msg
                );
                // Force React to treat this as a new array
                return [...updatedMessages];
              });
              
              // Ensure scrolling happens with each update
              setTimeout(scrollToBottom, 0);
            }
          } catch (error) {
            console.error("Error parsing JSON:", error, "Raw line:", line);
          }
        }
      }
      
      // Once stream is complete, remove typing indicator
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === botResponseId 
            ? { ...msg, isTyping: false } 
            : msg
        )
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error communicating with server:', error);
      
      // Add error message
      setMessages(prevMessages => [...prevMessages, {
        id: Date.now() + 1,
        text: "Sorry, I'm having trouble connecting to the server right now.",
        sender: 'bot',
        isTyping: false
      }]);
      
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
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setInputValue('');
    setIsBotTyping(true);

    try {
      // No need to set isBotTyping here since we're using isTyping property in messages
      await sendMessageToServer(inputValue);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      // Error is already handled in sendMessageToServer
    } finally {
      setIsBotTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-10">
        <h1 className="text-xl font-semibold text-center text-sky-400">AI Chat Assistant</h1>
      </header>

      {/* Messages Area */}
      <div className="flex-grow p-4 sm:p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex animate-fadeInUp ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-xl shadow-md break-words ${
                msg.sender === 'user'
                  ? 'bg-sky-600 rounded-br-none'
                  : 'bg-slate-700 rounded-bl-none'
              }`}
            >
              {msg.text ? (
                <div className="markdown text-sm">
                  <Markdown
                    components={{
                      // Override components to ensure proper styling
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-md font-bold" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                      b: ({node, ...props}) => <b className="font-bold" {...props} />,
                      p: ({node, ...props}) => <p className="leading-relaxed" {...props} />
                    }}
                  >
                    {msg.text}
                  </Markdown>
                </div>
              ) : null}
              
              {/* Show typing indicator inside the message if isTyping is true */}
              {msg.isTyping && (
                <div className="flex items-center space-x-1.5 mt-1">
                  <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-1"></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-2"></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full typing-dot typing-dot-3"></div>
                </div>
              )}
            </div>
          </div>
        ))}
        {/* Remove the separate typing indicator */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-slate-800/50 backdrop-blur-md p-3 sm:p-4 border-t border-slate-700 sticky bottom-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault(); // Prevents newline on Enter
                handleSendMessage();
              }
            }}
            placeholder="Type your message..."
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder-slate-400 text-slate-100 resize-none"
            rows="1"
          />
          <button
            onClick={handleSendMessage}
            disabled={inputValue.trim() === ''}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 sm:px-6 rounded-lg transition-all duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
