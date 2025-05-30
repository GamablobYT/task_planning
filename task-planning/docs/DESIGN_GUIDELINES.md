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
- **Settings Sidebar**: Width transition with content slide (300ms ease-in-out)
  ```css
  .w-0 { width: 0; }
  .w-96 { width: 24rem; }
  overflow: hidden; /* Prevents content overflow during transition */
  ```

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

### SettingsSidebar

- **Purpose**: Provides a collapsible sidebar for configuring AI model parameters
- **Layout**:
  - Flex layout that pushes main content to the left when open
  - Floating settings button positioned fixed right-6 top-24
  - Sidebar width: w-96 when open, w-0 when closed
  - No overlay - content slides alongside main chat area
- **Visual Design**:
  - Background: bg-slate-800/95 backdrop-blur-md
  - Border: border-l border-slate-600/80
  - Header with sky-400 title color and close button
  - Form controls with slate-700 backgrounds
- **Animation**:
  - Width transition: w-0 to w-96 with overflow-hidden
  - Duration: 300ms ease-in-out
  - Main content slides with transition-all duration-300
- **Interactions**:
  - Escape key to close
  - Close button in header
  - Floating button with hover scale effect (hover:scale-105)
- **Form Controls**:
  - Textarea for system prompt: h-24 with resize-none
  - Range sliders with custom thumb styling
  - Number input for max tokens
  - Reset button with full width
- **Accessibility**:
  - Proper ARIA labels
  - Keyboard navigation support
  - Focus management when opening/closing

### ConfirmationModal

- **Purpose**: Provides a modal dialog for confirming destructive actions like deleting chats
- **Layout**:
  - Fixed overlay covering entire viewport: fixed inset-0 z-50
  - Centered content with backdrop blur: bg-slate-900/75 backdrop-blur-sm
  - Modal content: max-w-md w-full mx-4
- **Visual Design**:
  - Background: bg-slate-800 with border-slate-600
  - Shadow: shadow-xl for depth
  - Rounded corners: rounded-lg
  - Padding: p-6
- **Header**:
  - Title: text-lg font-semibold text-slate-100
  - Close button with hover states
- **Content**:
  - Message text: text-slate-300
  - Bottom margin: mb-6
- **Actions**:
  - Button container: flex gap-3 justify-end
  - Cancel button: bg-slate-700 hover:bg-slate-600
  - Delete button: bg-red-600 hover:bg-red-700 with hover:scale-105
  - Both buttons: py-2 px-4 rounded-lg font-medium
- **Interactions**:
  - Escape key to close
  - Backdrop click to close
  - Body scroll lock when open
- **Accessibility**:
  - Proper focus management
  - ARIA labels for close button
  - Keyboard navigation support

### Sidebar Chat Items

- **Layout**:
  - Group container with relative positioning for delete button
  - Chat button with flex layout and proper spacing
  - Delete button positioned absolutely in top-right
- **Delete Button**:
  - Icon: TrashIcon w-4 h-4
  - Colors: text-slate-400 hover:text-red-400
  - Background: hover:bg-slate-700/70
  - Visibility: opacity-0 group-hover:opacity-100
  - Positioning: absolute right-2 top-1/2 transform -translate-y-1/2
  - Padding: p-1.5 rounded-lg
  - Focus states: focus:opacity-100 focus:ring-2 focus:ring-red-500
- **Interactions**:
  - Click stops propagation to prevent chat selection
  - Hover reveals delete button
  - Focus makes delete button visible

### Error Toast / Notification

- **Purpose**: Displays transient error messages, such as JSON validation failures from the backend.
- **Positioning**:
  - Fixed to the viewport, typically in the top-right corner (e.g., `top-4 right-4`).
  - High z-index (e.g., `z-[100]`) to appear above other content.
- **Visual Design**:
  - Background: Error-indicating color (e.g., `bg-red-600`).
  - Text Color: Contrasting color for readability (e.g., `text-white`).
  - Padding: Adequate padding for content (e.g., `p-4`).
  - Corners: Rounded (e.g., `rounded-lg`).
  - Shadow: Subtle shadow for depth (e.g., `shadow-xl`).
  - Max Width: To prevent overly wide toasts on large screens (e.g., `max-w-md`).
- **Content**:
  - Title/Header: Bold text indicating the type of message (e.g., "Validation Error").
  - Message Body: Detailed error information.
  - Close Button: Allows users to dismiss the toast manually.
- **Animation**:
  - Slide-in: From the right or top (e.g., `transform translateX(100%) to translateX(0)`).
  - Duration: Quick and smooth (e.g., `300ms ease-in-out`).
  - Slide-out: Can be the reverse of slide-in or a fade-out.
- **Behavior**:
  - Auto-dismiss: Automatically hides after a set duration (e.g., 5 seconds).
  - Manual Dismiss: Can be closed by clicking a close icon.
- **Accessibility**:
  - `role="alert"` for assertive announcements to screen readers.
  - `aria-label` for close button.
