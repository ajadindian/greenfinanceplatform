import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui/Button.tsx'
import { Input } from './ui/Input.tsx'
import { motion } from 'framer-motion'
import { companySignup } from '../services/api.ts'
import { Sun, Moon } from 'lucide-react'
import { Theme, themes } from '../utils/theme'
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ERROR_MESSAGES } from '../constants/errorMessages';

export const CompanySignup: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { currentTheme, setCurrentTheme } = useTheme();
  const themeStyles = themes[currentTheme]
  const navigate = useNavigate()
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      showToast('Company name is required', 'error');
      return;
    }

    try {
      await companySignup({ name, email, password });
      showToast('Registration successful! Please log in.', 'success');
      navigate('/company-login');
    } catch (err: any) {
      showToast(err.message || ERROR_MESSAGES.VALIDATION_ERROR, 'error');
    }
  }

  return (
    <div 
      className={`min-h-screen flex items-center justify-center ${themeStyles.background}`}
      style={{ 
        backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
        backgroundBlendMode: 'soft-light',
        opacity: 0.98
      }}
    >
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
      >
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setCurrentTheme(currentTheme === 'light' ? 'dark' : 'light')}
            className={`w-10 h-10 rounded-full ${themeStyles.cardBg} shadow-lg flex items-center justify-center`}
          >
            <motion.div
              initial={false}
              animate={{
                rotate: currentTheme === 'light' ? 0 : 180,
                scale: currentTheme === 'light' ? 1 : 0
              }}
              transition={{ duration: 0.3 }}
              className="absolute"
            >
              <Sun className={themeStyles.subtext} />
            </motion.div>
            <motion.div
              initial={false}
              animate={{
                rotate: currentTheme === 'light' ? -180 : 0,
                scale: currentTheme === 'light' ? 0 : 1
              }}
              transition={{ duration: 0.3 }}
              className="absolute"
            >
              <Moon className={themeStyles.subtext} />
            </motion.div>
          </button>
        </div>

        <div className="space-y-6">
          <h2 className={`text-center text-3xl font-extrabold ${themeStyles.text}`}>
            Create Company Account
          </h2>
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            Sign up your company for ConstroMan
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <Input
              id="company-name"
              name="name"
              type="text"
              required
              placeholder="Company Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor}`}
            />
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor}`}
            />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor}`}
            />
          </div>

          <div>
            <Button 
              type="submit" 
              className={`w-full ${themeStyles.buttonBg} ${themeStyles.buttonHoverBg} ${themeStyles.buttonText}`}
            >
              Sign up
            </Button>
          </div>
        </form>
        
        <div className="space-y-2">
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            Already have an account?{' '}
            <Link 
              to="/company-login" 
              className={`font-medium ${themeStyles.linkColor} ${themeStyles.linkHoverColor}`}
            >
              Sign in
            </Link>
          </p>
          <p className={`text-center text-sm ${themeStyles.subtext}`}>
            <Link 
              to="/signup" 
              className={`font-medium ${themeStyles.linkColor} ${themeStyles.linkHoverColor}`}
            >
              Employee Signup
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
