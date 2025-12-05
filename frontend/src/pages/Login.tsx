import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        // Sign up logic would go here
        setError('Sign up functionality coming soon');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#012169] via-[#011a54] to-transparent dark:from-[#000715] dark:via-[#01143f] dark:to-transparent">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl"
      >
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex min-h-[600px] relative">
          {/* Form Section - Switches position based on isLogin */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`form-${isLogin}`}
              initial={{ x: isLogin ? 0 : '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isLogin ? '-100%' : '100%', opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className={`flex-1 p-12 flex flex-col justify-center relative z-10 ${
                isLogin ? 'order-1' : 'order-2'
              }`}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-[#012169]"></div>
              
              <div className="mb-8">
                <motion.h1
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
                >
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 dark:text-gray-400"
                >
                  {isLogin
                    ? 'Sign in to continue to Smart Shelves'
                    : 'Register to start managing your shelves'}
                </motion.p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#012169]" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required={!isLogin}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#012169] focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-700 transition-all"
                        placeholder="Full Name"
                      />
                    </div>
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: isLogin ? 0.1 : 0.2 }}
                >
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#012169]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#012169] focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-700 transition-all"
                      placeholder="Email"
                    />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: isLogin ? 0.2 : 0.3 }}
                >
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#012169]" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-[#012169] focus:ring-2 focus:ring-primary-300 dark:focus:ring-primary-700 transition-all"
                      placeholder="Password"
                    />
                  </div>
                </motion.div>

                {isLogin && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-end"
                  >
                    <a
                      href="#"
                      className="text-sm text-[#012169] dark:text-primary-300 hover:text-[#011a54] dark:hover:text-primary-200 transition-colors"
                    >
                      Forgot Password?
                    </a>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 bg-[#012169] text-white rounded-xl font-semibold shadow-lg hover:bg-[#011a54] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 mt-6"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                    <>
                      {isLogin ? (
                        <>
                          <LogIn className="w-5 h-5" />
                          <span>Sign In</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-5 h-5" />
                          <span>Sign Up</span>
                        </>
                      )}
                    </>
                  )}
                </motion.button>
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Welcome Panel - Switches position based on isLogin */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`welcome-${isLogin}`}
              initial={{ x: isLogin ? 0 : '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isLogin ? '100%' : '-100%', opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeInOut' }}
              className={`flex-1 bg-[#012169] p-12 flex flex-col justify-center items-center text-white relative overflow-hidden cursor-pointer ${
                isLogin ? 'order-2' : 'order-1'
              }`}
              onClick={() => setIsLogin(!isLogin)}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

              <motion.div
                key={isLogin ? 'login-welcome' : 'signup-welcome'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="text-center z-10"
              >
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-5xl font-bold mb-4"
                >
                  {isLogin ? 'Hello, Friend!' : 'Welcome Back!'}
                </motion.h2>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg text-primary-100 mb-8 max-w-sm"
                >
                  {isLogin
                    ? 'Enter your personal details to start your journey with us'
                    : 'Already have an account? Sign in to continue managing your shelves'}
                </motion.p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLogin(!isLogin);
                  }}
                  className="px-8 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl font-semibold hover:bg-white/30 transition-all"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </motion.button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
