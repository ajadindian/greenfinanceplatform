import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, LogOut, UserCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { SettingsDialog } from './SettingsDialog';
import { logout } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { currentTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      navigate('/login');
    }
  };

  return (
    <>
      <motion.div
        className="fixed top-4 right-4 z-50"
        onHoverStart={() => setIsOpen(true)}
        onHoverEnd={() => setIsOpen(false)}
      >
        <motion.div
          className={`rounded-full shadow-lg ${
            currentTheme === 'light' ? 'bg-white' : 'bg-gray-800'
          }`}
        >
          <motion.button
            className="p-2 rounded-full"
            whileHover={{ backgroundColor: currentTheme === 'light' ? '#f3f4f6' : '#374151' }}
          >
            <UserCircle 
              className={`w-6 h-6 ${
                currentTheme === 'light' ? 'text-gray-600' : 'text-gray-300'
              }`}
            />
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg ${
                  currentTheme === 'light' ? 'bg-white' : 'bg-gray-800'
                } overflow-hidden`}
              >
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className={`w-full p-3 flex items-center gap-3 ${
                    currentTheme === 'light' 
                      ? 'text-gray-700 hover:bg-gray-100' 
                      : 'text-gray-200 hover:bg-gray-700'
                  } transition-colors`}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className={`w-full p-3 flex items-center gap-3 ${
                    currentTheme === 'light' 
                      ? 'text-red-600 hover:bg-gray-100' 
                      : 'text-red-400 hover:bg-gray-700'
                  } transition-colors`}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      <SettingsDialog 
        open={isSettingsOpen} 
        onOpenChange={setIsSettingsOpen} 
      />
    </>
  );
}