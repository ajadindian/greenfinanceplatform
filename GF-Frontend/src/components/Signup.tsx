import React, { useState, useEffect } from 'react'
import { Button } from './ui/Button.tsx'
import { Input } from './ui/Input.tsx'
import { signup, companySignup, getCompanies } from '../services/api.ts'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export const Signup: React.FC = () => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [designation, setDesignation] = useState('')
  const [error, setError] = useState('')
  const [isCompanySignup, setIsCompanySignup] = useState(false)
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companiesData = await getCompanies()
        setCompanies(companiesData)
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError('Failed to load companies. Please try again.')
      }
    }

    if (!isCompanySignup) {
      fetchCompanies()
    }
  }, [isCompanySignup])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (isCompanySignup) {
        const response = await companySignup({
          name: company,
          email,
          password
        })
        console.log('Company signup successful:', response)
      } else {
        const selectedCompany = companies.find(c => c.name === company)
        if (!selectedCompany) {
          setError('Please select a valid company')
          return
        }
        const response = await signup({
          name,
          email,
          password,
          company_id: selectedCompany.id,
          contact,
          designation
        })
        console.log('Employee signup successful:', response)
      }
      navigate('/login')
    } catch (err) {
      console.error('Signup error:', err)
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message)
      } else {
        setError('Signup failed. Please try again.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            {isCompanySignup ? "Create your company account" : "Create your ConstroMan account"}
          </h2>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-2">
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            />
            {!isCompanySignup && (
              <>
                <div className="relative">
                  <button
                    type="button"
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    {company || "Select a company"}
                    <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </span>
                  </button>
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.ul
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm"
                      >
                        {companies.map((company, index) => (
                          <li
                            key={index}
                            className="text-gray-900 cursor-default select-none relative py-2 pl-3 pr-9 hover:bg-teal-100"
                            onClick={() => {
                              setCompany(company.name)
                              setIsDropdownOpen(false)
                            }}
                          >
                            {company.name}
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <Input
                  id="contact"
                  name="contact"
                  type="tel"
                  required
                  placeholder="Contact Number"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
                <Input
                  id="designation"
                  name="designation"
                  type="text"
                  required
                  placeholder="Designation"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </>
            )}
          </div>

          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

          <div>
            <Button type="submit" className="w-full">
              Sign up
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-teal-600 hover:text-teal-500">
              Sign in
            </Link>
          </p>
          <p className="text-center text-sm text-gray-600">
            <button
              onClick={() => setIsCompanySignup(!isCompanySignup)}
              className="font-medium text-teal-600 hover:text-teal-500"
            >
              {isCompanySignup ? "Switch to Employee Signup" : "Switch to Company Signup"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}