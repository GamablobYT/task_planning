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
        historySource: {}, // Dictionary format
        examples: [], // Added for few-shot examples
        initialInputs: {} // Added for pre-filled inputs for a model template
      }
    ],

    initializeNextModelId: () => {
      set(state => {
        if (state.models && state.models.length > 0) {
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

    // Removed old addModel function as NewChatModal will handle additions.

    // New action for the NewChatModal
    addNewModelFromConfig: (configData, replaceExisting = false) => {
      let newModelIdAssigned;
      set(state => {
        if (replaceExisting) {
          state.models = [];
          state._nextModelId = 1; // Reset ID counter for the new set of models
        }
        
        newModelIdAssigned = state._nextModelId;
        state._nextModelId++;
        
        const newModelEntry = {
          ...configData, // Contains name, value, systemPrompt, temp, etc.
          id: newModelIdAssigned,
          historySource: configData.historySource || {}, // Ensure historySource exists
          examples: configData.examples || [], // Ensure examples exists
          initialInputs: configData.initialInputs || {} // Ensure initialInputs exists
        };
        state.models.push(newModelEntry);

        // If not replacing, ensure _nextModelId is correctly set if models were empty before
        if (!replaceExisting && state.models.length === 1) {
           // If this was the first model added to an empty list (not replacing)
           // _nextModelId is already incremented, so it should be fine.
           // Re-evaluate if needed, but current logic seems okay.
        }
      });
      // Return the newly created model object
      return get().models.find(m => m.id === newModelIdAssigned);
    },

    loadModelsFromConfig: (modelsArray) => {
      set(state => {
        state.models = modelsArray && modelsArray.length > 0 
          ? modelsArray.map(m => ({
              ...m,
              examples: m.examples || [], // Ensure examples field
              initialInputs: m.initialInputs || {} // Ensure initialInputs field
            }))
          : [];
        // Re-initialize _nextModelId based on the loaded models
        if (state.models.length > 0) {
          const maxId = Math.max(...state.models.map(m => m.id).filter(id => typeof id === 'number'), 0);
          state._nextModelId = maxId + 1;
        } else {
          // If modelsArray is empty or invalid, models will be empty.
          // Add a default model if state.models must never be empty,
          // or handle this scenario in the UI.
          // For now, allow empty models and set nextId to 1.
          state.models.push({ // Add a default model if loaded config is empty
            id: 0, // Or use _nextModelId logic if preferred for default
            name: "Default Model",
            value: "deepseek-ai/DeepSeek-R1-0528",
            systemPrompt: "You are a helpful AI assistant.",
            temperature: 0.7,
            maxTokens: 16384,
            topP: 1.0,
            minP: 0.0,
            historySource: { prompt: 1 }, // Default history source
            examples: [], // Default examples
            initialInputs: {} // Default initialInputs
          });
          state._nextModelId = Math.max(...state.models.map(m => m.id), 0) + 1;
        }
      });
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
          state.chats = response.data.map(id => ({
            id: id.chat_id, 
            title: id.chat_name || 'Untitled Chat',
            // Ensure new fields are potentially present or defaulted if needed when loading chats
            initialInputs: id.initial_inputs || {}, // Assuming backend might provide this
            examples: id.examples || [] // Assuming backend might provide this
          }));
        });
      } catch (error) {
        console.error("Failed to fetch chat IDs:", error);
      }
    },

    updateChatInitialInput: (chatId, key, value) => {
      set(state => {
        state.models[0].initialInputs[key] = value
      });
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
                examples: [], // Reset examples
                initialInputs: {}, // Reset initial inputs
                // Don't reset historySource to maintain validation
              }
            : model
        )
      }));
    },
  }))
);

// Removed createModel utility function as it's unused.

export default useStore;
// This store manages the state of tasks in the application.s