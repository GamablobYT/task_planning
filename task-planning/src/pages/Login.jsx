import { useState } from 'react';
import { Link } from 'react-router-dom';
import useStore from '../store/store';
import { useNavigate } from 'react-router-dom';
import apiService from '../utils/api';

const Login = () => {
  const { setAuthentication } = useStore();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await apiService.post('/users/login/', formData);
      if (response.status === 200) {
        setAuthentication(true);
        setErrors({ success: "Login successful!" });
        setTimeout(() => {
            navigate('/chat');
        }, 1000);
      } else {
        setErrors({ general: 'Invalid username or password' });
      }
    } catch (error) {
      setErrors({ failure: `Login failed: ${error.data.error}` });
      console.error('Login failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-lg p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome Back</h1>
            <p className="text-slate-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-200 mb-2">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                placeholder="Enter your username"
                disabled={isSubmitting}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-400">{errors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-200 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200"
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-500 hover:bg-sky-600 disabled:bg-sky-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>

            {errors.success && (
              <p className="mt-4 text-sm text-green-400 text-center">{errors.success}</p>
            )}

            {errors.failure && (
              <p className="mt-4 text-sm text-red-400 text-center">{errors.failure}</p>
            )}
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-sky-400 hover:text-sky-300 transition-colors duration-200 underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
