import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationPanel } from '../ModerationPanel';
import { useAuthStore } from '../../stores/authStore';
import { moderationApi } from '../../services/api';

// Mock the auth store
jest.mock('../../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock the API
jest.mock('../../services/api', () => ({
  moderationApi: {
    getModerationLogs: jest.fn(),
    getModerationStats: jest.fn(),
    getFlaggedContent: jest.fn(),
    getBannedUsers: jest.fn(),
  }
}));

describe('ModerationPanel', () => {
  const mockAuthStore = {
    user: { id: 1, username: 'moderator', email: 'mod@example.com', is_superuser: true },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    initialize: jest.fn(),
    error: null
  };

  const mockModerationLogs = [
    {
      id: 1,
      action_type: 'delete',
      target_type: 'post',
      target_id: 1,
      moderator_id: 1,
      reason: 'Spam content',
      created_at: '2024-01-01T10:00:00Z'
    },
    {
      id: 2,
      action_type: 'flag',
      target_type: 'reply',
      target_id: 2,
      moderator_id: 1,
      reason: 'Inappropriate content',
      created_at: '2024-01-01T11:00:00Z'
    }
  ];

  const mockModerationStats = {
    total_actions: 10,
    actions_by_type: {
      delete: 5,
      flag: 3,
      approve: 2
    },
    actions_by_target_type: {
      post: 6,
      reply: 4
    },
    recent_actions: mockModerationLogs
  };

  const mockFlaggedContent = [
    {
      id: 1,
      action_type: 'flag',
      target_type: 'post',
      target_id: 1,
      reason: 'Needs review',
      created_at: '2024-01-01T10:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue(mockAuthStore);
    (moderationApi.getModerationLogs as jest.Mock).mockResolvedValue({ data: mockModerationLogs });
    (moderationApi.getModerationStats as jest.Mock).mockResolvedValue(mockModerationStats);
    (moderationApi.getFlaggedContent as jest.Mock).mockResolvedValue({ data: mockFlaggedContent });
    (moderationApi.getBannedUsers as jest.Mock).mockResolvedValue({ data: [] });
  });

  it('should render moderation panel for moderators', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Moderation Panel')).toBeInTheDocument();
    });

    expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Flagged Content')).toBeInTheDocument();
  });

  it('should not render moderation panel for non-moderators', () => {
    mockAuthStore.user.is_superuser = false;
    mockUseAuthStore.mockReturnValue(mockAuthStore);

    render(<ModerationPanel />);

    expect(screen.queryByText('Moderation Panel')).not.toBeInTheDocument();
  });

  it('should display moderation statistics', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Total Actions: 10')).toBeInTheDocument();
    });

    expect(screen.getByText('Deletes: 5')).toBeInTheDocument();
    expect(screen.getByText('Flags: 3')).toBeInTheDocument();
    expect(screen.getByText('Approvals: 2')).toBeInTheDocument();
  });

  it('should display recent moderation actions', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('delete')).toBeInTheDocument();
      expect(screen.getByText('flag')).toBeInTheDocument();
    });

    expect(screen.getByText('Spam content')).toBeInTheDocument();
    expect(screen.getByText('Inappropriate content')).toBeInTheDocument();
  });

  it('should display flagged content awaiting review', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Flagged Content')).toBeInTheDocument();
    });

    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('should allow filtering logs by action type', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText('Filter by action type:');
    fireEvent.change(filterSelect, { target: { value: 'delete' } });

    await waitFor(() => {
      expect(moderationApi.getModerationLogs).toHaveBeenCalledWith({
        action_type: 'delete',
        limit: 50,
        offset: 0
      });
    });
  });

  it('should allow filtering logs by target type', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    const filterSelect = screen.getByLabelText('Filter by target type:');
    fireEvent.change(filterSelect, { target: { value: 'post' } });

    await waitFor(() => {
      expect(moderationApi.getModerationLogs).toHaveBeenCalledWith({
        target_type: 'post',
        limit: 50,
        offset: 0
      });
    });
  });

  it('should show loading state while fetching data', () => {
    (moderationApi.getModerationLogs as jest.Mock).mockReturnValue(new Promise(() => {}));

    render(<ModerationPanel />);

    expect(screen.getByText('Loading moderation data...')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    (moderationApi.getModerationLogs as jest.Mock).mockRejectedValue(new Error('API Error'));

    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Error loading moderation data')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(moderationApi.getModerationLogs).toHaveBeenCalledTimes(2);
      expect(moderationApi.getModerationStats).toHaveBeenCalledTimes(2);
    });
  });

  it('should display time filters for actions', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
  });

  it('should update stats when time period changes', async () => {
    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    const periodSelect = screen.getByLabelText('Time period:');
    fireEvent.change(periodSelect, { target: { value: '7' } });

    await waitFor(() => {
      expect(moderationApi.getModerationStats).toHaveBeenCalledWith(7);
    });
  });

  it('should show pagination for large datasets', async () => {
    const largeModerationLogs = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      action_type: 'delete',
      target_type: 'post',
      target_id: i + 1,
      moderator_id: 1,
      reason: `Reason ${i + 1}`,
      created_at: `2024-01-01T${(i % 24).toString().padStart(2, '0')}:00:00Z`
    }));

    (moderationApi.getModerationLogs as jest.Mock).mockResolvedValue({ data: largeModerationLogs });

    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeInTheDocument();
  });

  it('should export moderation data', async () => {
    const mockExportData = jest.fn();
    global.URL.createObjectURL = jest.fn();
    global.URL.revokeObjectURL = jest.fn();

    render(<ModerationPanel />);

    await waitFor(() => {
      expect(screen.getByText('Recent Actions')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(screen.getByText('Export moderation data')).toBeInTheDocument();
    });
  });
});