import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import apiService from "../utils/api";

const useStore = create(
  immer((set, get) => ({
    messages: [],
    chats: [],
    activeChatID: null,
    isAuthenticated: null,
    role: null,
    csrfToken: null,
    _nextModelId: 1, // Initial default, will be properly initialized

    // Unified models array with settings
    models: [
      {
        id: 0,
        name: "DeepSeek R1",
        value: "deepseek-ai/DeepSeek-R1-0528",
        systemPrompt: "You are a helpful AI assistant.",
        temperature: 0.7,
        maxTokens: 16384,
        topP: 1.0,
        minP: 0.0,
        historySource: {} // Dictionary format
      }
    ],

    initializeNextModelId: () => {
      set(state => {
        if (state.models.length > 0) {
          const maxId = Math.max(...state.models.map(m => m.id), 0);
          state._nextModelId = maxId + 1;
        } else {
          state._nextModelId = 1;
        }
      });
    },

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

    addModel: () => { // Existing function for SettingsSidebar
      set((state) => {
        // Ensure _nextModelId is up-to-date if not initialized globally
        // For simplicity, assume initializeNextModelId is called at app start
        const newId = state._nextModelId;
        state._nextModelId++;
        state.models.push({
          id: newId,
          name: "New Model", // Or `Model ${newId}`
          value: "deepseek-ai/DeepSeek-R1-0528", // Consider using modelsList default
          systemPrompt: "You are a helpful AI assistant.",
          temperature: 0.7,
          maxTokens: 16384,
          topP: 1.0,
          minP: 0.0,
          historySource: {}
        });
      });
    },

    // New action for the NewChatModal
    addNewModelFromConfig: (configData) => {
      let newModelIdAssigned;
      set(state => {
        newModelIdAssigned = state._nextModelId;
        state._nextModelId++;
        
        const newModelEntry = {
          ...configData, // Contains name, value, systemPrompt, temp, etc.
          id: newModelIdAssigned,
          historySource: configData.historySource || {}, // Ensure historySource exists
        };
        state.models.push(newModelEntry);
      });
      // Return the newly created model object
      return get().models.find(m => m.id === newModelIdAssigned);
    },

    removeModel: (modelId) => {
      set((state) => {
        if (state.models.length > 1) {
          const modelIndex = state.models.findIndex(m => m.id === modelId);
          if (modelIndex !== -1) {
            state.models.splice(modelIndex, 1);
          }
        }
      });
    },

    updateModelSetting: (modelId, setting, value) => {
      set((state) => {
        const model = state.models.find(m => m.id === modelId);
        if (model) {
          model[setting] = value;
        }
      });
    },

    setActiveChatID: (chatID) => {
      set((state) => {
        state.activeChatID = chatID;
      })
    },

    setChats: (chats) => {
      set((state) => {
        state.chats = chats;
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
          state.chats = response.data.map(id => ({id: id.chat_id, title: id.chat_name || 'Untitled Chat'}));
        });
      } catch (error) {
        console.error("Failed to fetch chat IDs:", error);
      }
    },

    // Remove old model selection and active model logic
    // Keep backward compatibility getters for first model (or provide default values)
    get selectedModel() {
      return this.models[0]?.value || "deepseek-ai/DeepSeek-R1-0528";
    },
    get systemPrompt() {
      return this.models[0]?.systemPrompt || "You are a helpful AI assistant.";
    },
    get temperature() {
      return this.models[0]?.temperature || 0.7;
    },
    get maxTokens() {
      return this.models[0]?.maxTokens || 16384;
    },
    get topP() {
      return this.models[0]?.topP || 1.0;
    },
    get minP() {
      return this.models[0]?.minP || 0.0;
    },

    // Legacy setters for backward compatibility (updates first model)
    setSystemPrompt: (prompt) => set((state) => {
      if (state.models[0]) state.models[0].systemPrompt = prompt;
    }),
    setTemperature: (temp) => set((state) => {
      if (state.models[0]) state.models[0].temperature = temp;
    }),
    setMaxTokens: (maxTokens) => set((state) => {
      if (state.models[0]) state.models[0].maxTokens = maxTokens;
    }),
    setTopP: (topP) => set((state) => {
      if (state.models[0]) state.models[0].topP = topP;
    }),
    setMinP: (minP) => set((state) => {
      if (state.models[0]) state.models[0].minP = minP;
    }),

    resetModelToDefaults: (modelId) => {
      set((state) => ({
        models: state.models.map(model =>
          model.id === modelId
            ? {
                ...model,
                systemPrompt: "You are a helpful AI assistant.",
                temperature: 0.7,
                maxTokens: 16384,
                topP: 1.0,
                minP: 0.0,
                // Don't reset historySource to maintain validation
              }
            : model
        )
      }));
    },
  }))
);

const createModel = (id) => ({
  id,
  name: `Model ${id}`,
  value: Object.values(modelsList)[0],
  systemPrompt: "You are a helpful AI assistant.",
  temperature: 0.7,
  maxTokens: 16384,
  topP: 1.0,
  minP: 0.0,
  historySource: {}
});

export default useStore;
// This store manages the state of tasks in the application.s