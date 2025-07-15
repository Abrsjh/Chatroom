import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { LoginFormData, FormValidationState } from '../types'
import './Login.css'

const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, clearErrors, isLoading, errors, isAuthenticated } = useAuthStore()
  
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: ''
  })
  
  const [validation, setValidation] = useState<FormValidationState>({
    isValid: false,
    errors: {}
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  // Clear errors when form data changes
  useEffect(() => {
    if (errors.length > 0) {
      clearErrors()
    }
  }, [formData, clearErrors, errors.length])

  const validateForm = (): FormValidationState => {
    const newErrors: Record<string, string[]> = {}

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = ['Username or email is required']
    } else if (formData.username.length < 3) {
      newErrors.username = ['Username must be at least 3 characters long']
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = ['Password is required']
    } else if (formData.password.length < 8) {
      newErrors.password = ['Password must be at least 8 characters long']
    }

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear validation errors for this field
    if (validation.errors[name]) {
      setValidation(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: [] }
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)

    const formValidation = validateForm()
    setValidation(formValidation)

    if (!formValidation.isValid) {
      return
    }

    try {
      await login(formData)
      // Navigation handled by useEffect when isAuthenticated changes
    } catch (error) {
      // Error handling is managed by the store
      console.error('Login failed:', error)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const getFieldErrors = (fieldName: string): string[] => {
    return validation.errors[fieldName] || []
  }

  const hasFieldError = (fieldName: string): boolean => {
    return getFieldErrors(fieldName).length > 0
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>Sign In</h1>
          <p>Welcome back! Please sign in to your account.</p>
        </div>

        <form 
          className="login-form" 
          onSubmit={handleSubmit}
          role="form"
          aria-label="Sign in form"
          noValidate
        >
          {/* Display authentication errors */}
          {errors.length > 0 && (
            <div className="error-container" role="alert">
              {errors.map((error, index) => (
                <div key={index} className="error-message">
                  {error.message}
                </div>
              ))}
            </div>
          )}

          {/* Username/Email Field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username or Email
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`form-input ${hasFieldError('username') ? 'error' : ''}`}
              placeholder="Enter your username or email"
              aria-required="true"
              aria-describedby="username-error username-help"
              disabled={isLoading}
            />
            <div id="username-help" className="form-help">
              You can use either your username or email address
            </div>
            {hasFieldError('username') && (
              <div id="username-error" className="field-errors" role="alert">
                {getFieldErrors('username').map((error, index) => (
                  <span key={index} className="field-error">{error}</span>
                ))}
              </div>
            )}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`form-input ${hasFieldError('password') ? 'error' : ''}`}
                placeholder="Enter your password"
                aria-required="true"
                aria-describedby="password-error password-help"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={isLoading}
              >
                {showPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            <div id="password-help" className="form-help">
              Enter your account password
            </div>
            {hasFieldError('password') && (
              <div id="password-error" className="field-errors" role="alert">
                {getFieldErrors('password').map((error, index) => (
                  <span key={index} className="field-error">{error}</span>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner" data-testid="loading-spinner" aria-hidden="true">
                  ⏳
                </span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Registration Link */}
        <div className="login-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login