# Design Guidelines

This document outlines the design aesthetics and expectations for components in the Task Planning application. These guidelines ensure visual consistency across the application.

## General Principles

- **Responsive Design**: All components should adapt gracefully to different screen sizes
- **Consistency**: Maintain consistent spacing, typography, and color usage
- **Accessibility**: Components should be accessible to all users, including those with disabilities
- **Performance**: Optimize components for performance, especially with animations and transitions

## Color Palette

- **Primary**: #0ea5e9 (sky-500) - Used for buttons, focus rings, and interactive elements
- **Background**: Gradient from #0f172a (slate-900) to #1e293b (slate-800)
- **Text**: #f1f5f9 (slate-100) for primary text
- **Borders**: #334155 (slate-700) and #475569 (slate-600)
- **Input Background**: #334155 (slate-700)
- **Typing Indicator**: #38bdf8 (sky-400)
- **Link Color**: #38bdf8 (sky-400)
- **Code Block Background**: #1a2234 (custom dark slate)

## Typography

- **Font Family**: System UI stack (font-sans in Tailwind)
- **Base Size**: 16px (1rem)
- **Markdown Headings**: 
  - h1: 1.5em, bold
  - h2: 1.3em, bold
  - h3: 1.17em, bold
  - h4: 1.05em, bold
- **Line Height**: 1.5 for body text (default)

## Spacing

- **Base Unit**: 0.25rem (4px)
- **Component Spacing**:
  - p-3 (0.75rem/12px) to p-4 (1rem/16px)
  - On larger screens: sm:p-4 to sm:p-6 (1.5rem/24px)
  - Space between messages: space-y-4 (1rem/16px)
- **Button Padding**: py-3 px-4 (vertical 0.75rem, horizontal 1rem)

## Components

### MessageList

- **Purpose**: Displays a scrollable list of messages
- **Layout**:
  - Flex-grow container to fill available space
  - Vertical scrolling with overflow-y-auto
  - Messages stacked with space-y-4 (1rem spacing)
- **Spacing**:
  - Padding: p-4 (1rem) on mobile, sm:p-6 (1.5rem) on larger screens
- **Behavior**:
  - Auto-scrolls to bottom when new messages arrive using scrollIntoView with smooth behavior
- **Accessibility**:
  - Custom scrollbar styling for better visibility

### Message

- **Design**:
  - Different visual styling for user vs bot messages
  - Support for typing indicators in bot messages
- **Responsive Design**:
  - Adapts to different screen sizes

### ChatInput

- **Design**:
  - Semi-transparent background with backdrop blur: bg-slate-800/50 backdrop-blur-md
  - Border top: border-t border-slate-700
  - Sticky positioning: sticky bottom-0
  - Padding: p-3 sm:p-4
- **Input Field**:
  - Background: bg-slate-700
  - Border: border border-slate-600
  - Rounded corners: rounded-lg
  - Focus state: focus:ring-2 focus:ring-sky-500
  - Placeholder color: placeholder-slate-400
  - Text color: text-slate-100
- **Send Button**:
  - Background: bg-sky-500 hover:bg-sky-600
  - Disabled state: disabled:bg-sky-800 disabled:cursor-not-allowed
  - Text: text-white font-semibold
  - Padding: py-3 px-4 sm:px-6
  - Rounded corners: rounded-lg
  - Hover animation: transform hover:scale-105
  - Transition: transition-all duration-200 ease-in-out

### TypingIndicator

- **Design**:
  - Three dots in a row with space-x-1.5
  - Each dot: w-2 h-2 bg-sky-400 rounded-full
- **Animation**:
  - Bouncing effect using typing-dot-bounce keyframes
  - Different animation delays for each dot (0s, 0.2s, 0.4s)

## Animations and Transitions

- **Message Appearance**: fadeInUp animation (0.4s ease-out)
  ```css
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(15px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  ```
- **Typing Indicator**: Bouncing animation (1.4s infinite)
  ```css
  @keyframes typing-dot-bounce {
    0%, 60%, 100% { transform: translateY(0); }
    30% { transform: translateY(-4px); }
  }
  ```
- **Button Hover**: Scale effect (transform hover:scale-105)
- **Focus States**: Ring effect with focus:ring-2

## Responsive Breakpoints

- **Small (sm)**: 640px and above
  - Used for padding adjustments and button sizing

## Accessibility Features

- **Custom Scrollbars**: 
  - Width: 8px
  - Track: #1e293b (slate-800)
  - Thumb: #475569 (slate-600)
  - Hover: #64748b (slate-500)
  - Firefox support with scrollbar-width and scrollbar-color

## Markdown Styling

- **Text Formatting**:
  - Headings with appropriate sizing and margin
  - Bold text with font-weight: bold
  - Lists with 1.5em left margin
  - Paragraphs with 0.5em bottom margin
- **Code Blocks**:
  - Background: #1a2234
  - Border: 1px solid #2d3748
  - Border radius: 5px
  - Max height: 400px with overflow scrolling
  - Language indicator in top-right corner
- **Inline Code**:
  - Background: rgba(0, 0, 0, 0.2)
  - Padding: 0.1em 0.2em
  - Border radius: 3px
  - Font size: 0.9em
- **Blockquotes**:
  - Left border: 3px solid #64748b
  - Text color: #94a3b8
- **Links**:
  - Color: #38bdf8
  - Text decoration: underline
