import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationDialog } from '../ModerationDialog';

describe('ModerationDialog', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render delete confirmation dialog', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this post?')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('should render flag confirmation dialog', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="flag"
        contentType="reply"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Flag Content')).toBeInTheDocument();
    expect(screen.getByText('Flag this reply for review')).toBeInTheDocument();
  });

  it('should render approve confirmation dialog', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="approve"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Approve Content')).toBeInTheDocument();
    expect(screen.getByText('Approve this post and remove any flags')).toBeInTheDocument();
  });

  it('should not render when isOpen is false', () => {
    render(
      <ModerationDialog
        isOpen={false}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
  });

  it('should require reason input for deletion', async () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Reason is required')).toBeInTheDocument();
    });

    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('should call onConfirm with reason when valid', async () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Spam content' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalledWith('Spam content');
    });
  });

  it('should call onCancel when cancel is clicked', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should close dialog when clicking outside', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const overlay = screen.getByTestId('dialog-overlay');
    fireEvent.click(overlay);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should not close dialog when clicking on modal content', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const modal = screen.getByTestId('dialog-modal');
    fireEvent.click(modal);

    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('should handle escape key to close dialog', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should show loading state when isLoading is true', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeDisabled();
  });

  it('should validate minimum reason length', async () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'ab' } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Reason must be at least 3 characters')).toBeInTheDocument();
    });
  });

  it('should validate maximum reason length', async () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const longReason = 'a'.repeat(1001);
    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: longReason } });

    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText('Reason must be less than 1000 characters')).toBeInTheDocument();
    });
  });

  it('should show character count for reason input', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    expect(screen.getByText('11 / 1000')).toBeInTheDocument();
  });

  it('should focus on reason input when dialog opens', () => {
    render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    expect(reasonInput).toHaveFocus();
  });

  it('should clear reason when dialog closes and reopens', () => {
    const { rerender } = render(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const reasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    fireEvent.change(reasonInput, { target: { value: 'Test reason' } });

    rerender(
      <ModerationDialog
        isOpen={false}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    rerender(
      <ModerationDialog
        isOpen={true}
        type="delete"
        contentType="post"
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const newReasonInput = screen.getByPlaceholderText('Enter reason for deletion...');
    expect(newReasonInput).toHaveValue('');
  });
});