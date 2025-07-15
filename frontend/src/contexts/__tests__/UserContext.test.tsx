import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider, useUser } from '../UserContext';
import { useAuthStore } from '../../stores/authStore';

// Mock the auth store
jest.mock('../../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Test component that uses the user context
const TestComponent = () => {
  const { user, isAuthenticated, login, logout, isLoading } = useUser();
  
  return (
    <div>
      <div data-testid="auth-status">
        {isAuthenticated ? 'authenticated' : 'not-authenticated'}
      </div>
      <div data-testid="loading-status">
        {isLoading ? 'loading' : 'not-loading'}
      </div>
      {user && (
        <div data-testid="user-info">
          {user.username} - {user.email}
        </div>
      )}
      <button onClick={login} data-testid="login-button">Login</button>
      <button onClick={logout} data-testid="logout-button">Logout</button>
    </div>
  );
};

describe('UserContext', () => {
  const mockAuthStore = {
    isAuthenticated: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
    initialize: jest.fn(),
    isLoading: false,
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue(mockAuthStore);
  });

  it('should provide authentication state to children', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { id: 1, username: 'testuser', email: 'test@example.com' };

    render(
      <MemoryRouter>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user-info')).toHaveTextContent('testuser - test@example.com');
  });

  it('should handle unauthenticated state', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.user = null;

    render(
      <MemoryRouter>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('not-authenticated');
    expect(screen.queryByTestId('user-info')).not.toBeInTheDocument();
  });

  it('should handle loading state', async () => {
    mockAuthStore.isLoading = true;

    render(
      <MemoryRouter>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('loading-status')).toHaveTextContent('loading');
  });

  it('should initialize auth store on mount', async () => {
    render(
      <MemoryRouter>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1);
    });
  });

  it('should provide login and logout functions', async () => {
    render(
      <MemoryRouter>
        <UserProvider>
          <TestComponent />
        </UserProvider>
      </MemoryRouter>
    );

    const loginButton = screen.getByTestId('login-button');
    const logoutButton = screen.getByTestId('logout-button');

    expect(loginButton).toBeInTheDocument();
    expect(logoutButton).toBeInTheDocument();
  });

  it('should throw error when used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useUser must be used within a UserProvider');
    
    consoleError.mockRestore();
  });
});