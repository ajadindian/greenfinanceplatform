import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { CompanyLogin } from './components/CompanyLogin.tsx'
import { CompanySignup } from './components/CompanySignup.tsx'
import { ProjectSelector } from './components/ProjectSelector.tsx'
import { ProjectDetails } from './components/ProjectDetails'
import './index.css'
import Chat from './components/Chat.tsx'
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
        <ToastProvider>
      <AnimatePresence mode="wait">
        <Router>
          <div className="min-h-screen bg-gray-100">
            <Routes>
              <Route path="/company-login" element={<CompanyLogin />} />
              <Route path="/company-signup" element={<CompanySignup />} />
              <Route path="/projects" element={<ProjectSelector />} />
              <Route path="/project/:projectId" element={<ProjectDetails />} />
              <Route path="/chat/:projectId" element={<Chat />} />
              <Route path="/" element={<CompanyLogin />} />
            </Routes>
          </div>
        </Router>
      </AnimatePresence>
      </ToastProvider>
    </ThemeProvider>
  )
}

export default App
