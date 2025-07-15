import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Login from '../Login'
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

describe('Login Component', () => {
  const mockLogin = vi.fn()
  const mockClearErrors = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: [],
      isAuthenticated: false
    })
  })

  it('renders login form with all required fields', () => {
    render(<Login />)
    
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/username or email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
  })

  it('validates required fields on submit', async () => {
    render(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/username or email is required/i)).toBeInTheDocument()
    expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates minimum username length', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await userEvent.type(usernameInput, 'ab')
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('validates password minimum length', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(passwordInput, '123')
    await userEvent.click(submitButton)
    
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.click(submitButton)
    
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'ValidPass123!'
    })
  })

  it('submits form with email as username', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await userEvent.type(usernameInput, 'test@example.com')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.click(submitButton)
    
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'ValidPass123!'
    })
  })

  it('shows loading state during login', () => {
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: true,
      errors: [],
      isAuthenticated: false
    })
    
    render(<Login />)
    
    const submitButton = screen.getByRole('button', { name: /signing in.../i })
    expect(submitButton).toBeDisabled()
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('displays authentication errors from store', () => {
    const authErrors = [
      { message: 'Invalid credentials', field: 'username' },
      { message: 'Account is locked', field: undefined }
    ]
    
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: authErrors,
      isAuthenticated: false
    })
    
    render(<Login />)
    
    expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    expect(screen.getByText(/account is locked/i)).toBeInTheDocument()
  })

  it('clears errors when form is modified', async () => {
    const authErrors = [{ message: 'Invalid credentials' }]
    
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: authErrors,
      isAuthenticated: false
    })
    
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    await userEvent.type(usernameInput, 'a')
    
    expect(mockClearErrors).toHaveBeenCalled()
  })

  it('redirects after successful login', async () => {
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: [],
      isAuthenticated: true
    })
    
    render(<Login />)
    
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('shows password visibility toggle', async () => {
    render(<Login />)
    
    const passwordInput = screen.getByLabelText(/password/i)
    const toggleButton = screen.getByRole('button', { name: /show password/i })
    
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    await userEvent.click(toggleButton)
    
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('handles keyboard navigation', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    // Tab navigation
    await userEvent.tab()
    expect(usernameInput).toHaveFocus()
    
    await userEvent.tab()
    expect(passwordInput).toHaveFocus()
    
    await userEvent.tab()
    expect(submitButton).toHaveFocus()
  })

  it('supports Enter key submission', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(passwordInput, 'ValidPass123!')
    await userEvent.keyboard('{Enter}')
    
    expect(mockLogin).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'ValidPass123!'
    })
  })

  it('has proper accessibility attributes', () => {
    render(<Login />)
    
    const form = screen.getByRole('form')
    expect(form).toHaveAttribute('aria-label', 'Sign in form')
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    expect(usernameInput).toHaveAttribute('aria-required', 'true')
    expect(usernameInput).toHaveAttribute('aria-describedby')
    
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('aria-required', 'true')
    expect(passwordInput).toHaveAttribute('aria-describedby')
  })

  it('handles network errors gracefully', () => {
    const networkError = [{ message: 'Network error. Please try again.' }]
    
    ;(useAuthStore as any).mockReturnValue({
      login: mockLogin,
      clearErrors: mockClearErrors,
      isLoading: false,
      errors: networkError,
      isAuthenticated: false
    })
    
    render(<Login />)
    
    expect(screen.getByText(/network error/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('prevents multiple form submissions', async () => {
    render(<Login />)
    
    const usernameInput = screen.getByLabelText(/username or email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await userEvent.type(usernameInput, 'testuser')
    await userEvent.type(passwordInput, 'ValidPass123!')
    
    // Rapid clicks should only submit once
    await userEvent.click(submitButton)
    await userEvent.click(submitButton)
    await userEvent.click(submitButton)
    
    expect(mockLogin).toHaveBeenCalledTimes(1)
  })
})