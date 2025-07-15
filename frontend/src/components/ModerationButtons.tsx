import React, { useState } from 'react';
import { ModerationDialog } from './ModerationDialog';
import { useAuthStore } from '../stores/authStore';
import { moderationApi } from '../services/api';
import './ModerationButtons.css';

interface ModerationButtonsProps {
  contentType: 'post' | 'reply';
  contentId: number;
  authorId: number;
  isLoading?: boolean;
  onSuccess?: (action: string) => void;
}

export const ModerationButtons: React.FC<ModerationButtonsProps> = ({
  contentType,
  contentId,
  authorId,
  isLoading = false,
  onSuccess
}) => {
  const { user } = useAuthStore();
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'delete' | 'flag' | 'approve';
  }>({
    isOpen: false,
    type: 'delete'
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Don't render if user is not a moderator
  if (!user?.is_superuser) {
    return null;
  }

  const showDialog = (type: 'delete' | 'flag' | 'approve') => {
    setDialogState({ isOpen: true, type });
    setMessage(null);
  };

  const hideDialog = () => {
    setDialogState({ isOpen: false, type: 'delete' });
    setActionLoading(false);
  };

  const handleAction = async (reason: string) => {
    setActionLoading(true);
    setMessage(null);

    try {
      switch (dialogState.type) {
        case 'delete':
          if (contentType === 'post') {
            await moderationApi.deletePost(contentId, reason);
          } else {
            await moderationApi.deleteReply(contentId, reason);
          }
          setMessage({ type: 'success', text: 'Content deleted successfully' });
          break;
        
        case 'flag':
          if (contentType === 'post') {
            await moderationApi.flagPost(contentId, reason);
          } else {
            await moderationApi.flagReply(contentId, reason);
          }
          setMessage({ type: 'success', text: 'Content flagged successfully' });
          break;
        
        case 'approve':
          if (contentType === 'post') {
            await moderationApi.approvePost(contentId, reason);
          } else {
            await moderationApi.approveReply(contentId, reason);
          }
          setMessage({ type: 'success', text: 'Content approved successfully' });
          break;
      }

      onSuccess?.(dialogState.type);
      hideDialog();
    } catch (error) {
      console.error('Moderation action failed:', error);
      setMessage({ type: 'error', text: 'Failed to perform action' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <div className="moderation-buttons">
        <button
          className="moderation-button moderation-button--delete"
          onClick={() => showDialog('delete')}
          disabled={isLoading}
          title="Delete content"
        >
          Delete
        </button>
        
        <button
          className="moderation-button moderation-button--flag"
          onClick={() => showDialog('flag')}
          disabled={isLoading}
          title="Flag for review"
        >
          Flag
        </button>
        
        <button
          className="moderation-button moderation-button--approve"
          onClick={() => showDialog('approve')}
          disabled={isLoading}
          title="Approve content"
        >
          Approve
        </button>
      </div>

      {message && (
        <div className={`moderation-message moderation-message--${message.type}`}>
          {message.text}
        </div>
      )}

      <ModerationDialog
        isOpen={dialogState.isOpen}
        type={dialogState.type}
        contentType={contentType}
        onConfirm={handleAction}
        onCancel={hideDialog}
        isLoading={actionLoading}
      />
    </>
  );
};