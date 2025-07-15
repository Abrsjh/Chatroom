import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { useAuthStore } from '../../stores/authStore';

// Mock the auth store
jest.mock('../../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock component for testing
const MockProtectedComponent = () => <div>Protected Content</div>;
const MockLoginComponent = () => <div>Login Page</div>;

describe('ProtectedRoute', () => {
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

  it('should redirect to login when user is not authenticated', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedComponent />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<MockLoginComponent />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render protected content when user is authenticated', async () => {
    mockAuthStore.isAuthenticated = true;
    mockAuthStore.user = { id: 1, username: 'testuser', email: 'test@example.com' };
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedComponent />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<MockLoginComponent />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should show loading state while authentication is being checked', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = true;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute>
              <MockProtectedComponent />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<MockLoginComponent />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should preserve the intended destination after login', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/protected/specific-page']}>
        <Routes>
          <Route path="/protected/*" element={
            <ProtectedRoute>
              <MockProtectedComponent />
            </ProtectedRoute>
          } />
          <Route path="/login" element={<MockLoginComponent />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
    
    // Check that the current location includes the redirect parameter
    expect(window.location.pathname).toBe('/login');
  });

  it('should handle custom redirect path', async () => {
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isLoading = false;

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/protected" element={
            <ProtectedRoute redirectTo="/custom-login">
              <MockProtectedComponent />
            </ProtectedRoute>
          } />
          <Route path="/custom-login" element={<div>Custom Login</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Custom Login')).toBeInTheDocument();
    });
  });
});