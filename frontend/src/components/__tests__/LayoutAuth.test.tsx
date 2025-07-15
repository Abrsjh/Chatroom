import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout';
import { useUser } from '../../contexts/UserContext';

// Mock the useUser hook
jest.mock('../../contexts/UserContext');
const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe('Layout with Authentication', () => {
  const mockLogout = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show user info when user is authenticated', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      error: null
    });

    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByText('Welcome, testuser')).toBeInTheDocument();
    expect(screen.getByTestId('logout-button')).toBeInTheDocument();
  });

  it('should not show user info when user is not authenticated', async () => {
    mockUseUser.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      error: null
    });

    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.queryByText(/Welcome,/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', async () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      error: null
    });

    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it('should render navigation links', () => {
    mockUseUser.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com' },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: mockLogout,
      error: null
    });

    render(
      <MemoryRouter>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByText('Channels')).toBeInTheDocument();
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });
});