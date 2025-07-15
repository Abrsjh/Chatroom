import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationButtons } from '../ModerationButtons';
import { useAuthStore } from '../../stores/authStore';
import { moderationApi } from '../../services/api';

// Mock the auth store
jest.mock('../../stores/authStore');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock the API
jest.mock('../../services/api', () => ({
  moderationApi: {
    deletePost: jest.fn(),
    flagPost: jest.fn(),
    approvePost: jest.fn(),
    deleteReply: jest.fn(),
    flagReply: jest.fn(),
    approveReply: jest.fn(),
  }
}));

describe('ModerationButtons', () => {
  const mockAuthStore = {
    user: { id: 1, username: 'moderator', email: 'mod@example.com', is_superuser: true },
    isAuthenticated: true,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    initialize: jest.fn(),
    error: null
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthStore.mockReturnValue(mockAuthStore);
  });

  it('should render moderation buttons for moderators', () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Flag')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('should not render moderation buttons for non-moderators', () => {
    mockAuthStore.user.is_superuser = false;
    mockUseAuthStore.mockReturnValue(mockAuthStore);

    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Flag')).not.toBeInTheDocument();
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
  });

  it('should show confirmation dialog when delete is clicked', async () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this post?')).toBeInTheDocument();
    });
  });

  it('should call deletePost API when delete is confirmed', async () => {
    const mockDeletePost = jest.fn().mockResolvedValue({ success: true });
    (moderationApi.deletePost as jest.Mock) = mockDeletePost;

    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Spam content' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDeletePost).toHaveBeenCalledWith(1, 'Spam content');
    });
  });

  it('should show flag dialog when flag is clicked', async () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const flagButton = screen.getByText('Flag');
    fireEvent.click(flagButton);

    await waitFor(() => {
      expect(screen.getByText('Flag Content')).toBeInTheDocument();
      expect(screen.getByText('Flag this post for review')).toBeInTheDocument();
    });
  });

  it('should call flagPost API when flag is submitted', async () => {
    const mockFlagPost = jest.fn().mockResolvedValue({ success: true });
    (moderationApi.flagPost as jest.Mock) = mockFlagPost;

    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const flagButton = screen.getByText('Flag');
    fireEvent.click(flagButton);

    await waitFor(() => {
      expect(screen.getByText('Flag Content')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Enter reason for flagging...');
    fireEvent.change(reasonInput, { target: { value: 'Inappropriate content' } });

    const submitButton = screen.getByText('Flag');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFlagPost).toHaveBeenCalledWith(1, 'Inappropriate content');
    });
  });

  it('should handle reply content type', () => {
    render(
      <ModerationButtons 
        contentType="reply" 
        contentId={1} 
        authorId={2} 
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Flag')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
  });

  it('should disable buttons when loading', () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
        isLoading={true}
      />
    );

    expect(screen.getByText('Delete')).toBeDisabled();
    expect(screen.getByText('Flag')).toBeDisabled();
    expect(screen.getByText('Approve')).toBeDisabled();
  });

  it('should validate reason input before submitting', async () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Reason is required')).toBeInTheDocument();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    });
  });

  it('should show success message after successful action', async () => {
    const mockDeletePost = jest.fn().mockResolvedValue({ success: true });
    (moderationApi.deletePost as jest.Mock) = mockDeletePost;

    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Spam content' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Content deleted successfully')).toBeInTheDocument();
    });
  });

  it('should show error message when API call fails', async () => {
    const mockDeletePost = jest.fn().mockRejectedValue(new Error('API Error'));
    (moderationApi.deletePost as jest.Mock) = mockDeletePost;

    render(
      <ModerationButtons 
        contentType="post" 
        contentId={1} 
        authorId={2} 
      />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    });

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Spam content' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete content')).toBeInTheDocument();
    });
  });
});