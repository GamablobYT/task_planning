import React from 'react';
import Markdown from 'react-markdown';
import TypingIndicator from './TypingIndicator';

const Message = ({ message }) => {
  const { sender, text, isTyping } = message;
  
  return (
    <div
      className={`flex animate-fadeInUp ${
        sender === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-xl shadow-md break-words ${
          sender === 'user'
            ? 'bg-sky-600 rounded-br-none'
            : 'bg-slate-700 rounded-bl-none'
        }`}
      >
        {text ? (
          <div className="markdown text-sm">
            <Markdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-bold" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-bold" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-bold" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                b: ({node, ...props}) => <b className="font-bold" {...props} />,
                p: ({node, ...props}) => <p className="leading-relaxed" {...props} />
              }}
            >
              {text}
            </Markdown>
          </div>
        ) : null}
        
        {isTyping && <TypingIndicator />}
      </div>
    </div>
  );
};

export default Message;
