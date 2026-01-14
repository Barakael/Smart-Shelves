import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import teraLogo from '../resources/images/tera-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [typedText, setTypedText] = useState('');
  const fullText = 'powered by TERATECH';

  useEffect(() => {
    // Typing animation starts after main title animation (0.8s)
    let currentIndex = 0;
    const typingDelay = setTimeout(() => {
      const interval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setTypedText(fullText.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 50); // Typing speed

      return () => clearInterval(interval);
    }, 800); // Delay before typing starts

    return () => clearTimeout(typingDelay);
  }, []);

  useEffect(() => {
    // Complete splash screen after 2.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-gradient-to-b from-[#012169] via-[#011a54] to-white flex items-center justify-center z-[9999]"
    >
      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Main Title - Smart Shelves */}
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            type: 'spring',
            stiffness: 100,
          }}
          className="flex items-center space-x-6"
        >
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="w-48 h-36 rounded-full bg-white/10 backdrop-blur-md border-2 border-blue-900 flex items-center justify-center shadow-2xl overflow-hidden"
          >
            <img
              src={teraLogo}
              alt="TERA Logo"
              className="w-48 h-36 object-cover rounded-full"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            className="text-9xl font-bold text-white tracking-wide"
          >
            Smart Shelves
          </motion.h1>
        </motion.div>

        {/* Subtitle - Powered by TERATECH with typing effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="flex items-center space-x-1 h-8"
        >
          <span className="text-lg text-white font-light tracking-wider">
            {typedText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="inline-block w-0.5 h-5 bg-primary-300 ml-1"
            />
          </span>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.2 }}
          className="flex space-x-2 mt-8"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 0.6,
                delay: i * 0.15,
                repeat: Infinity,
              }}
              className="w-2 h-2 bg-white rounded-full"
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
