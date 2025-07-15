import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Register from '../Register'
import { useAuthStore } from '../../stores/authStore'

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn()
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  )
}))

describe('Register Component', () => {
  const mockRegister = vi.fn()
  const mockClearErrors = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as any).mockReturnValue({
      register: mockRegister,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: [],
      isAuthenticated: false
    })
  })

  it('renders registration form with all required fields', () => {
    render(<Register />)
    
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })

  it('validates all required fields on submit', async () => {
    render(<Register />)
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/username is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(screen.getByText(/confirm password is required/i)).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('validates username format and length', async () => {
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Test minimum length
    await userEvent.type(usernameInput, 'ab')
    await userEvent.click(submitButton)
    expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
    
    // Test maximum length
    await userEvent.clear(usernameInput)
    await userEvent.type(usernameInput, 'a'.repeat(31))
    await userEvent.click(submitButton)
    expect(screen.getByText(/username must be less than 30 characters/i)).toBeInTheDocument()
    
    // Test invalid characters
    await userEvent.clear(usernameInput)
    await userEvent.type(usernameInput, 'user@name')
    await userEvent.click(submitButton)
    expect(screen.getByText(/username can only contain letters, numbers, hyphens, and underscores/i)).toBeInTheDocument()
  })

  it('validates email format', async () => {
    render(<Register />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(emailInput, 'invalid-email')
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('validates password strength requirements', async () => {
    render(<Register />)
    
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Test minimum length
    await userEvent.type(passwordInput, '123')
    await userEvent.click(submitButton)
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    
    // Test missing uppercase
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'lowercase123!')
    await userEvent.click(submitButton)
    expect(screen.getByText(/password must contain at least one uppercase letter/i)).toBeInTheDocument()
    
    // Test missing lowercase
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'UPPERCASE123!')
    await userEvent.click(submitButton)
    expect(screen.getByText(/password must contain at least one lowercase letter/i)).toBeInTheDocument()
    
    // Test missing number
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'NoNumbers!')
    await userEvent.click(submitButton)
    expect(screen.getByText(/password must contain at least one digit/i)).toBeInTheDocument()
    
    // Test missing special character
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'NoSpecial123')
    await userEvent.click(submitButton)
    expect(screen.getByText(/password must contain at least one special character/i)).toBeInTheDocument()
  })

  it('validates password confirmation match', async () => {
    render(<Register />)
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.type(confirmPasswordInput, 'DifferentPass123!')
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('shows real-time password strength indicator', async () => {
    render(<Register />)
    
    const passwordInput = screen.getByLabelText('Password')
    
    // Weak password
    await userEvent.type(passwordInput, 'weak')
    expect(screen.getByText(/weak/i)).toBeInTheDocument()
    expect(screen.getByTestId('password-strength-weak')).toBeInTheDocument()
    
    // Medium password
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'Medium123')
    expect(screen.getByText(/medium/i)).toBeInTheDocument()
    expect(screen.getByTestId('password-strength-medium')).toBeInTheDocument()
    
    // Strong password
    await userEvent.clear(passwordInput)
    await userEvent.type(passwordInput, 'StrongPass123!')
    expect(screen.getByText(/strong/i)).toBeInTheDocument()
    expect(screen.getByTestId('password-strength-strong')).toBeInTheDocument()
  })

  it('submits form with valid data', async () => {
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.type(confirmPasswordInput, 'ValidPass123!')
    await userEvent.click(submitButton)
    
    expect(mockRegister).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!'
    })
  })

  it('shows loading state during registration', () => {
    ;(useAuthStore as any).mockReturnValue({
      register: mockRegister,
      clearErrors: mockClearErrors,
      isLoading: true,
      errors: [],
      isAuthenticated: false
    })
    
    render(<Register />)
    
    const submitButton = screen.getByRole('button', { name: /creating account.../i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays registration errors from store', () => {
    const authErrors = [
      { message: 'Username already exists', field: 'username' },
      { message: 'Email already registered', field: 'email' },
      { message: 'Server error occurred', field: undefined }
    ]
    
    ;(useAuthStore as any).mockReturnValue({
      register: mockRegister,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: authErrors,
      isAuthenticated: false
    })
    
    render(<Register />)
    
    expect(screen.getByText(/username already exists/i)).toBeInTheDocument()
    expect(screen.getByText(/email already registered/i)).toBeInTheDocument()
    expect(screen.getByText(/server error occurred/i)).toBeInTheDocument()
  })

  it('clears errors when form is modified', async () => {
    const authErrors = [{ message: 'Username already exists' }]
    
    ;(useAuthStore as any).mockReturnValue({
      register: mockRegister,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: authErrors,
      isAuthenticated: false
    })
    
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    await userEvent.type(usernameInput, 'a')
    
    expect(mockClearErrors).toHaveBeenCalled()
  })

  it('redirects after successful registration', async () => {
    ;(useAuthStore as any).mockReturnValue({
      register: mockRegister,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: [],
      isAuthenticated: true
    })
    
    render(<Register />)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows password visibility toggles', async () => {
    render(<Register />)
    
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const passwordToggle = screen.getByRole('button', { name: /show password/i })
    const confirmToggle = screen.getByRole('button', { name: /show confirm password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    
    await userEvent.click(passwordToggle)
    expect(passwordInput).toHaveAttribute('type', 'text')
    
    await userEvent.click(confirmToggle)
    expect(confirmPasswordInput).toHaveAttribute('type', 'text')
  })

  it('handles keyboard navigation through form', async () => {
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    // Tab navigation
    await userEvent.tab()
    expect(usernameInput).toHaveFocus()
    
    await userEvent.tab()
    expect(emailInput).toHaveFocus()
    
    await userEvent.tab()
    expect(passwordInput).toHaveFocus()
    
    await userEvent.tab()
    expect(confirmPasswordInput).toHaveFocus()
    
    await userEvent.tab()
    expect(submitButton).toHaveFocus()
  })

  it('supports Enter key submission', async () => {
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.type(confirmPasswordInput, 'ValidPass123!')
    await userEvent.keyboard('{Enter}')
    
    expect(mockRegister).toHaveBeenCalledWith({
      username: 'testuser',
      email: 'test@example.com',
      password: 'ValidPass123!',
      confirmPassword: 'ValidPass123!'
    })
  })

  it('has proper accessibility attributes', () => {
    render(<Register />)
    
    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Create account form')
    
    const usernameInput = screen.getByLabelText(/username/i)
    expect(usernameInput).toHaveAttribute('aria-required', 'true')
    expect(usernameInput).toHaveAttribute('aria-describedby')
    
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('aria-required', 'true')
    expect(emailInput).toHaveAttribute('aria-describedby')
    
    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toHaveAttribute('aria-required', 'true')
    expect(passwordInput).toHaveAttribute('aria-describedby')
  })

  it('shows terms of service and privacy policy links', () => {
    render(<Register />)
    
    expect(screen.getByText(/by creating an account, you agree to our/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument()
  })

  it('prevents multiple form submissions', async () => {
    render(<Register />)
    
    const usernameInput = screen.getByLabelText(/username/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText('Password')
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(emailInput, 'test@example.com')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.type(confirmPasswordInput, 'ValidPass123!')
    
    // Rapid clicks should only submit once
    await userEvent.click(submitButton)
    await userEvent.click(submitButton)
    await userEvent.click(submitButton)
    
    expect(mockRegister).toHaveBeenCalledTimes(1)
  })
})