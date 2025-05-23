import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import apiService from "../utils/api";

const useStore = create(
  immer((set) => ({
    messages: [],
    selectedModel: "deepseek-ai/DeepSeek-R1",
    chats: [],
    activeChatID: null,
    isAuthenticated: null,
    role: null,
    csrfToken: null,

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
    },

    setAuthentication: (isAuthenticated) => {
      set((state) => {
        state.isAuthenticated = isAuthenticated;
      });
    },

    setRole: (role) => {
      set((state) => {
        state.role = role;
      });
    },

    fetchCsrfToken: async () => {
      try {
        set((state) => { state.isLoading = true; });
        const response = await apiService.get('/users/csrf/');
        set((state) => {
          state.csrfToken = response.data.csrfToken;
        });
      } catch (error) {
        set((state) => { state.errorMessage = 'Failed to fetch CSRF token'; });
      } finally {
        set((state) => { state.isLoading = false; });
      }
    },

    fetchChatIDs: async () => {
      try {
        const response = await apiService.get('/chats/get-chat-ids/');
        set((state) => {
          state.chats = response.data;
        });
      } catch (error) {
        console.error("Failed to fetch chat IDs:", error);
      }
    }
  }))
);

export default useStore;
// This store manages the state of tasks in the application.s