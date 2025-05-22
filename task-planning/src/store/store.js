import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useStore = create(
  immer((set) => ({
    messages: [],
    selectedModel: "deepseek-ai/DeepSeek-R1",
    chats: [],
    activeChatID: null,

    addMessage: (message) => {
      set((state) => {
        state.messages.push(message);
      });
    },

    updateMessage: (id, updates) => {
      set((state) => {
        const index = state.messages.findIndex(msg => msg.id === id);
        if (index !== -1) {
          state.messages[index] = { ...state.messages[index], ...updates };
        }
      });
    },

    setMessages: (messages) => {
      set((state) => {
        state.messages = messages;
      });
    },

    clearMessages: () => {
      set((state) => {
        state.messages = [];
      });
    },

    setModel: (model) => {
      set((state) => {
        state.selectedModel = model;
      });
    },

    setChats: (chats) => {
      set((state) => {
        state.chats = chats;
      });
    },

    setActiveChatID: (chatID) => {
      set((state) => {
        state.activeChatID = chatID;
      });
    },

    fetchMessagesForID: async (chatID) => {
      const response = await fetch(`http://127.0.01:5000/fetch-messages/${chatID}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        },
      });
      if (!response.ok) {
        console.error("Failed to fetch messages");
        return;
      }
      const data = await response.json();
      set((state) => {
        state.messages = data.messages;
      });
    }
  }))
);

export default useStore;
// This store manages the state of tasks in the application.s