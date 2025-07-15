import React, { useState, useEffect, useRef } from 'react';
import './ModerationDialog.css';

interface ModerationDialogProps {
  isOpen: boolean;
  type: 'delete' | 'flag' | 'approve';
  contentType: 'post' | 'reply';
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ModerationDialog: React.FC<ModerationDialogProps> = ({
  isOpen,
  type,
  contentType,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && reasonInputRef.current) {
      reasonInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  const handleConfirm = () => {
    setError('');
    
    if (!reason.trim()) {
      setError('Reason is required');
      return;
    }

    if (reason.length < 3) {
      setError('Reason must be at least 3 characters');
      return;
    }

    if (reason.length > 1000) {
      setError('Reason must be less than 1000 characters');
      return;
    }

    onConfirm(reason.trim());
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getDialogTitle = () => {
    switch (type) {
      case 'delete':
        return 'Confirm Delete';
      case 'flag':
        return 'Flag Content';
      case 'approve':
        return 'Approve Content';
      default:
        return 'Confirm Action';
    }
  };

  const getDialogMessage = () => {
    switch (type) {
      case 'delete':
        return `Are you sure you want to delete this ${contentType}?`;
      case 'flag':
        return `Flag this ${contentType} for review`;
      case 'approve':
        return `Approve this ${contentType} and remove any flags`;
      default:
        return `Confirm action on this ${contentType}`;
    }
  };

  const getPlaceholder = () => {
    switch (type) {
      case 'delete':
        return 'Enter reason for deletion...';
      case 'flag':
        return 'Enter reason for flagging...';
      case 'approve':
        return 'Enter reason for approval...';
      default:
        return 'Enter reason...';
    }
  };

  const getConfirmButtonText = () => {
    if (isLoading) return 'Processing...';
    return 'Confirm';
  };

  const getWarningMessage = () => {
    if (type === 'delete') {
      return 'This action cannot be undone.';
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <div 
      className="moderation-dialog-overlay"
      data-testid="dialog-overlay"
      onClick={handleOverlayClick}
    >
      <div 
        className="moderation-dialog-modal"
        data-testid="dialog-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="moderation-dialog-header">
          <h3>{getDialogTitle()}</h3>
          <button 
            className="moderation-dialog-close"
            onClick={onCancel}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>

        <div className="moderation-dialog-content">
          <p className="moderation-dialog-message">
            {getDialogMessage()}
          </p>
          
          {getWarningMessage() && (
            <p className="moderation-dialog-warning">
              {getWarningMessage()}
            </p>
          )}

          <div className="moderation-dialog-input-group">
            <textarea
              ref={reasonInputRef}
              className="moderation-dialog-textarea"
              placeholder={getPlaceholder()}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
            <div className="moderation-dialog-char-count">
              {reason.length} / 1000
            </div>
          </div>

          {error && (
            <div className="moderation-dialog-error">
              {error}
            </div>
          )}
        </div>

        <div className="moderation-dialog-actions">
          <button
            className="moderation-dialog-cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`moderation-dialog-confirm moderation-dialog-confirm--${type}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {getConfirmButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
};