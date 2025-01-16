import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui/Button.tsx'
import { Input } from './ui/Input.tsx'
import { motion, AnimatePresence } from 'framer-motion'
import { login } from '../services/api.ts'
import { Sun, Moon } from 'lucide-react'
import { Theme, themes } from '../utils/theme'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [currentTheme, setCurrentTheme] = useState<Theme>('light')
  const themeStyles = themes[currentTheme]
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const response = await login(email, password)
      console.log('Login successful:', response)
      localStorage.setItem('token', response.token)
      localStorage.setItem('userType', 'employee')
      navigate('/projects')
    } catch (err) {
      console.error('Login error:', err)
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message)
      } else {
        setError('Invalid email or password')
      }
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div 
        className={`min-h-screen flex items-center justify-center ${themeStyles.background}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        style={{ 
          backgroundImage: currentTheme === 'light' ? `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.25' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` : 'none',
          backgroundBlendMode: 'soft-light',
          opacity: 0.98
        }}
      >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`max-w-md w-full space-y-8 ${themeStyles.cardBg} p-10 rounded-xl shadow-2xl relative`}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setCurrentTheme(current => current === 'light' ? 'dark' : 'light')}
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
              Employee Login
            </h2>
            <p className={`text-center text-sm ${themeStyles.subtext}`}>
              Sign in to ConstroMan
            </p>
          </div>

          {error && <p className="text-red-500 text-center">{error}</p>}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-t-md`}
              />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${themeStyles.inputBg} ${themeStyles.text} border-${themeStyles.borderColor} rounded-b-md`}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className={`h-4 w-4 ${themeStyles.buttonBg} focus:ring-offset-2 focus:ring-${themeStyles.buttonBg}`}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-teal-600 hover:text-teal-500">
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${themeStyles.buttonBg} ${themeStyles.buttonHoverBg} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${themeStyles.buttonBg}`}
              >
                Sign in
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-center text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-teal-600 hover:text-teal-500">
                Sign up
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              <Link to="/company-login" className="font-medium text-teal-600 hover:text-teal-500">
                Company Login
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}