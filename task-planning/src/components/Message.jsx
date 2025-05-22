import React, { useState } from 'react';
import Markdown from 'react-markdown';
import TypingIndicator from './TypingIndicator';

const Message = ({ message }) => {
  const { role, content, isTyping } = message;
  
  // Parse text to extract thinking content
  const parseThinkingContent = (content) => {
    if (!content) return { regularText: '', thinkingText: '' };
    
    // Check for opening <think> tag
    const thinkOpenIndex = content.indexOf('<think>');
    
    // If no opening tag, all text is regular
    if (thinkOpenIndex === -1) return { regularText: content, thinkingText: '' };
    
    // Find closing tag if it exists
    const thinkCloseIndex = content.indexOf('</think>', thinkOpenIndex);
    
    let thinkingText = '';
    let regularText = '';
    
    // Extract content before the opening tag as regularText
    regularText = content.substring(0, thinkOpenIndex).trim();
    
    // If closing tag exists, extract thinking text between tags and add text after closing tag to regularText
    if (thinkCloseIndex !== -1) {
      thinkingText = content.substring(thinkOpenIndex + 7, thinkCloseIndex).trim();
      
      // Add text after closing tag to regularText if any
      const afterClosingTag = content.substring(thinkCloseIndex + 8).trim();
      if (afterClosingTag) {
        regularText = regularText ? `${regularText} ${afterClosingTag}` : afterClosingTag;
      }
    } else {
      // No closing tag yet, everything after opening tag is thinking text
      thinkingText = content.substring(thinkOpenIndex + 7).trim();
    }
    
    return { regularText, thinkingText };
  };
  
  const { regularText, thinkingText } = parseThinkingContent(content);
  
  // Function to handle copying code to clipboard
  const copyToClipboard = (code) => {
    navigator.clipboard.writeText(code).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="space-y-2">
      {thinkingText && (
        <div
          className={`flex animate-fadeInUp ${
            role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl max-h-25 overflow-auto px-4 py-2 rounded-xl shadow-md break-words border-2 border-slate-800
              ${role === 'user' 
                ? 'bg-indigo-500' 
                : 'bg-#2a2234'
              }`}
          >
            <div className="flex items-center mb-1 text-xs text-slate-300 font-semibold">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12zm-1-5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zm0-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              THINKING
            </div>
            <div className="markdown text-sm">
              <Markdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-md font-bold" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  b: ({node, ...props}) => <b className="font-bold" {...props} />,
                  p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                  pre: ({node, children, ...props}) => {
                    const code = node.children[0].children[0]?.value || '';
                    return (
                      <div className="code-block-container">
                        <button 
                          className="copy-code-button"
                          onClick={() => copyToClipboard(code)}
                          aria-label="Copy code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                          </svg>
                        </button>
                        <pre {...props}>{children}</pre>
                      </div>
                    );
                  }
                }}
              >
                {thinkingText}
              </Markdown>
            </div>
          </div>
        </div>
      )}

      {regularText && (
        <div
          className={`flex animate-fadeInUp ${
            role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-xl shadow-md break-words ${
              role === 'user'
                ? 'bg-sky-600 rounded-br-none'
                : 'bg-slate-700 rounded-bl-none'
            }`}
          >
            <div className="markdown text-sm">
              <Markdown
                components={{
                  h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-lg font-bold" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-md font-bold" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                  b: ({node, ...props}) => <b className="font-bold" {...props} />,
                  p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                  pre: ({node, children, ...props}) => {
                    const code = node.children[0].children[0]?.value || '';
                    return (
                      <div className="code-block-container">
                        <button 
                          className="copy-code-button"
                          onClick={() => copyToClipboard(code)}
                          aria-label="Copy code"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                            <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                          </svg>
                        </button>
                        <pre {...props}>{children}</pre>
                      </div>
                    );
                  }
                }}
              >
                {regularText}
              </Markdown>
            </div>
          </div>
        </div>
      )}
      {isTyping && <TypingIndicator />}
    </div>
  );
};

export default Message;
