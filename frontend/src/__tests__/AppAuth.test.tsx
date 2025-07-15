import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { useAuthStore } from '../stores/authStore';

// Mock the auth store
jest.mock('../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock the useMockData hook
jest.mock('../hooks/useMockData', () => ({
  useMockData: jest.fn()
}));

describe('App with Protected Routes', () => {
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

  it('should redirect unauthenticated users to login from protected routes', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/channels']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should allow authenticated users to access protected routes', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { id: 1, username: 'testuser', email: 'test@example.com' };
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/channels']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
    });
  });

  it('should show loading state while authentication is being checked', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/channels']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should allow access to public routes without authentication', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login')).toBeInTheDocument();
    });
  });

  it('should allow access to register route without authentication', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });
  });

  it('should initialize auth store on mount', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockAuthStore.initialize).toHaveBeenCalledTimes(1);
    });
  });
});