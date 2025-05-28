import axios from 'axios';
import useStore from '../store/store';

const apiClient = axios.create({
  baseURL: "http://localhost:8000/api",
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

function getCookie(name) {
  // document.cookie is a single string like:
  // "csrftoken=ABC123; sessionid=XYZ789; theme=dark"
  const value = `; ${document.cookie}`;  
  // → "; csrftoken=ABC123; sessionid=XYZ789; theme=dark"
  
  // We split on `; name=` so if name="csrftoken" we end up with:
  // ["; ", "ABC123; sessionid=XYZ789; theme=dark"]
  const parts = value.split(`; ${name}=`);
  
  if (parts.length === 2) {
    // parts.pop() gives "ABC123; sessionid=XYZ789; theme=dark"
    // .split(';').shift() grabs just "ABC123"
    return parts.pop().split(';').shift();
  }
  // if parts.length !== 2, cookie isn’t set
  return undefined;
}


apiClient.interceptors.request.use(async (config) => {
    // Always fetch the latest CSRF token from Zustand store
    const csrfToken = getCookie('csrfToken') || useStore.getState().csrfToken;
    
    if (csrfToken && typeof csrfToken === 'string') {
      config.headers['X-CSRFToken'] = csrfToken; // Correct header name
    }
    else {
      const token = 
      document.cookie
        .split('; ')
        .find(row => row.startsWith('csrfToken='))
        ?.split('=')[1];
      useStore.setState({ csrfToken: token });
      config.headers['X-CSRFToken'] = useStore.getState().csrfToken; // Correct header name
    }
  
    return config;
  });

apiClient.interceptors.response.use(
  (response) => {
    // Return both status and data
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  },
  (error) => {
    if (error.response) {
      // Return error response with status
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    return Promise.reject(error);
  }
);

const apiService = {
  get: async (url, params = {}) => {
    try {
      return await apiClient.get(url, { params });
    } catch (error) {
      throw error;
    }
  },

  post: async (url, data = {}) => {
    try {
      return await apiClient.post(url, data);
    } catch (error) {
      throw error;
    }
  },

  put: async (url, data = {}) => {
    try {
      return await apiClient.put(url, data);
    } catch (error) {
      throw error;
    }
  },

  delete: async (url) => {
    try {
      return await apiClient.delete(url);
    } catch (error) {
      throw error;
    }
  },

  setHeader: (key, value) => {
    apiClient.defaults.headers.common[key] = value;
  },

  removeHeader: (key) => {
    delete apiClient.defaults.headers.common[key];
  }
};

export default apiService;