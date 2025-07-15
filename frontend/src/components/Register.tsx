import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { RegisterFormData, FormValidationState, PasswordValidation } from '../types'
import './Register.css'

const Register: React.FC = () => {
  const navigate = useNavigate()
  const { register, clearErrors, isLoading, errors, isAuthenticated } = useAuthStore()
  
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  
  const [validation, setValidation] = useState<FormValidationState>({
    isValid: false,
    errors: {}
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')
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

  // Update password strength indicator
  useEffect(() => {
    if (formData.password) {
      const strength = calculatePasswordStrength(formData.password)
      setPasswordStrength(strength)
    }
  }, [formData.password])

  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let score = 0
    
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++
    
    if (score <= 2) return 'weak'
    if (score <= 4) return 'medium'
    return 'strong'
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateUsername = (username: string): string[] => {
    const errors: string[] = []
    
    if (!username.trim()) {
      errors.push('Username is required')
    } else {
      if (username.length < 3) {
        errors.push('Username must be at least 3 characters long')
      }
      if (username.length > 30) {
        errors.push('Username must be less than 30 characters')
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        errors.push('Username can only contain letters, numbers, hyphens, and underscores')
      }
    }
    
    return errors
  }

  const validatePassword = (password: string): string[] => {
    const errors: string[] = []
    
    if (!password) {
      errors.push('Password is required')
    } else {
      if (password.length < 8) {
        errors.push('Password must be at least 8 characters long')
      }
      if (password.length > 128) {
        errors.push('Password must be less than 128 characters')
      }
      if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter')
      }
      if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter')
      }
      if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit')
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors.push('Password must contain at least one special character')
      }
    }
    
    return errors
  }

  const validateForm = (): FormValidationState => {
    const newErrors: Record<string, string[]> = {}

    // Username validation
    const usernameErrors = validateUsername(formData.username)
    if (usernameErrors.length > 0) {
      newErrors.username = usernameErrors
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = ['Email is required']
    } else if (!validateEmail(formData.email)) {
      newErrors.email = ['Please enter a valid email address']
    }

    // Password validation
    const passwordErrors = validatePassword(formData.password)
    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = ['Confirm password is required']
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = ['Passwords do not match']
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
      await register(formData)
      // Navigation handled by useEffect when isAuthenticated changes
    } catch (error) {
      // Error handling is managed by the store
      console.error('Registration failed:', error)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword)
  }

  const getFieldErrors = (fieldName: string): string[] => {
    return validation.errors[fieldName] || []
  }

  const hasFieldError = (fieldName: string): boolean => {
    return getFieldErrors(fieldName).length > 0
  }

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 'weak': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'strong': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <h1>Create Account</h1>
          <p>Join our community and start sharing your thoughts!</p>
        </div>

        <form 
          className="register-form" 
          onSubmit={handleSubmit}
          role="form"
          aria-label="Create account form"
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

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className={`form-input ${hasFieldError('username') ? 'error' : ''}`}
              placeholder="Choose a unique username"
              aria-required="true"
              aria-describedby="username-error username-help"
              disabled={isLoading}
            />
            <div id="username-help" className="form-help">
              3-30 characters, letters, numbers, hyphens and underscores only
            </div>
            {hasFieldError('username') && (
              <div id="username-error" className="field-errors" role="alert">
                {getFieldErrors('username').map((error, index) => (
                  <span key={index} className="field-error">{error}</span>
                ))}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`form-input ${hasFieldError('email') ? 'error' : ''}`}
              placeholder="Enter your email address"
              aria-required="true"
              aria-describedby="email-error email-help"
              disabled={isLoading}
            />
            <div id="email-help" className="form-help">
              We'll use this for account verification and important updates
            </div>
            {hasFieldError('email') && (
              <div id="email-error" className="field-errors" role="alert">
                {getFieldErrors('email').map((error, index) => (
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
                placeholder="Create a strong password"
                aria-required="true"
                aria-describedby="password-error password-help password-strength"
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
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div id="password-strength" className="password-strength">
                <div className="strength-label">
                  Password strength: 
                  <span 
                    className={`strength-text ${passwordStrength}`}
                    style={{ color: getPasswordStrengthColor() }}
                    data-testid={`password-strength-${passwordStrength}`}
                  >
                    {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                  </span>
                </div>
                <div className="strength-bar">
                  <div 
                    className={`strength-fill ${passwordStrength}`}
                    style={{ backgroundColor: getPasswordStrengthColor() }}
                  />
                </div>
              </div>
            )}
            
            <div id="password-help" className="form-help">
              Must be 8+ characters with uppercase, lowercase, number and special character
            </div>
            {hasFieldError('password') && (
              <div id="password-error" className="field-errors" role="alert">
                {getFieldErrors('password').map((error, index) => (
                  <span key={index} className="field-error">{error}</span>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Confirm Password
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`form-input ${hasFieldError('confirmPassword') ? 'error' : ''}`}
                placeholder="Confirm your password"
                aria-required="true"
                aria-describedby="confirmPassword-error confirmPassword-help"
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                disabled={isLoading}
              >
                {showConfirmPassword ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>
            <div id="confirmPassword-help" className="form-help">
              Re-enter your password to confirm
            </div>
            {hasFieldError('confirmPassword') && (
              <div id="confirmPassword-error" className="field-errors" role="alert">
                {getFieldErrors('confirmPassword').map((error, index) => (
                  <span key={index} className="field-error">{error}</span>
                ))}
              </div>
            )}
          </div>

          {/* Terms and Privacy */}
          <div className="terms-container">
            <p className="terms-text">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="terms-link">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/privacy" className="terms-link">Privacy Policy</Link>
            </p>
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
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register