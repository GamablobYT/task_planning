import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

const useStore = create(
  immer((set) => ({
    messages: [
      { id: Date.now(), text: "Hello! I'm your friendly chat assistant. How can I help you today?", sender: "bot" }
    ],
    selectedModel: "Deepseek-R1",

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

    setModel: (model) => {
      set((state) => {
        state.selectedModel = model;
      });
    },
  }))
);

export default useStore;
// This store manages the state of tasks in the application.s