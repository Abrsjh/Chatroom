import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { moderationApi } from '../services/api';
import './ModerationPanel.css';

interface ModerationAction {
  id: number;
  action_type: string;
  target_type: string;
  target_id: number;
  moderator_id: number;
  reason: string;
  created_at: string;
}

interface ModerationStats {
  total_actions: number;
  actions_by_type: Record<string, number>;
  actions_by_target_type: Record<string, number>;
  recent_actions: ModerationAction[];
}

export const ModerationPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [flaggedContent, setFlaggedContent] = useState<ModerationAction[]>([]);
  const [bannedUsers, setBannedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    action_type: '',
    target_type: '',
    time_period: 30
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage] = useState(50);

  // Don't render if user is not a moderator
  if (!user?.is_superuser) {
    return null;
  }

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [
        statsResponse,
        actionsResponse,
        flaggedResponse,
        bannedResponse
      ] = await Promise.all([
        moderationApi.getModerationStats(filters.time_period),
        moderationApi.getModerationLogs({
          action_type: filters.action_type || undefined,
          target_type: filters.target_type || undefined,
          limit: itemsPerPage,
          offset: currentPage * itemsPerPage
        }),
        moderationApi.getFlaggedContent(50),
        moderationApi.getBannedUsers()
      ]);

      setStats(statsResponse);
      setActions(actionsResponse.data);
      setFlaggedContent(flaggedResponse.data);
      setBannedUsers(bannedResponse.data);
    } catch (err) {
      console.error('Error fetching moderation data:', err);
      setError('Error loading moderation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters, currentPage]);

  const handleFilterChange = (key: string, value: string | number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportData = () => {
    const dataToExport = {
      stats,
      actions,
      flaggedContent,
      bannedUsers,
      exportedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moderation-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="moderation-panel">
        <div className="moderation-panel-loading">
          Loading moderation data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="moderation-panel">
        <div className="moderation-panel-error">
          {error}
          <button onClick={handleRefresh} className="moderation-panel-retry">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="moderation-panel">
      <div className="moderation-panel-header">
        <h2>Moderation Panel</h2>
        <div className="moderation-panel-actions">
          <button onClick={handleRefresh} className="moderation-panel-refresh">
            Refresh
          </button>
          <button onClick={exportData} className="moderation-panel-export">
            Export
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="moderation-panel-section">
        <h3>Statistics</h3>
        <div className="moderation-panel-filters">
          <label>
            Time period:
            <select 
              value={filters.time_period} 
              onChange={(e) => handleFilterChange('time_period', parseInt(e.target.value))}
            >
              <option value={1}>Last 24 hours</option>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </label>
        </div>
        
        {stats && (
          <div className="moderation-panel-stats">
            <div className="moderation-stat">
              <span className="moderation-stat-label">Total Actions:</span>
              <span className="moderation-stat-value">{stats.total_actions}</span>
            </div>
            <div className="moderation-stat">
              <span className="moderation-stat-label">Deletes:</span>
              <span className="moderation-stat-value">{stats.actions_by_type.delete || 0}</span>
            </div>
            <div className="moderation-stat">
              <span className="moderation-stat-label">Flags:</span>
              <span className="moderation-stat-value">{stats.actions_by_type.flag || 0}</span>
            </div>
            <div className="moderation-stat">
              <span className="moderation-stat-label">Approvals:</span>
              <span className="moderation-stat-value">{stats.actions_by_type.approve || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Actions Section */}
      <div className="moderation-panel-section">
        <h3>Recent Actions</h3>
        <div className="moderation-panel-filters">
          <label>
            Filter by action type:
            <select 
              value={filters.action_type} 
              onChange={(e) => handleFilterChange('action_type', e.target.value)}
            >
              <option value="">All</option>
              <option value="delete">Delete</option>
              <option value="flag">Flag</option>
              <option value="approve">Approve</option>
              <option value="warn">Warn</option>
              <option value="ban">Ban</option>
            </select>
          </label>
          <label>
            Filter by target type:
            <select 
              value={filters.target_type} 
              onChange={(e) => handleFilterChange('target_type', e.target.value)}
            >
              <option value="">All</option>
              <option value="post">Post</option>
              <option value="reply">Reply</option>
              <option value="user">User</option>
            </select>
          </label>
        </div>

        <div className="moderation-panel-actions-list">
          {actions.map(action => (
            <div key={action.id} className="moderation-action-item">
              <div className="moderation-action-header">
                <span className={`moderation-action-type moderation-action-type--${action.action_type}`}>
                  {action.action_type}
                </span>
                <span className="moderation-action-target">
                  {action.target_type} #{action.target_id}
                </span>
                <span className="moderation-action-date">
                  {formatDate(action.created_at)}
                </span>
              </div>
              <div className="moderation-action-reason">
                {action.reason}
              </div>
            </div>
          ))}
        </div>

        {actions.length >= itemsPerPage && (
          <div className="moderation-panel-pagination">
            <button
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span>Page {currentPage + 1}</span>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={actions.length < itemsPerPage}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Flagged Content Section */}
      <div className="moderation-panel-section">
        <h3>Flagged Content</h3>
        <div className="moderation-panel-flagged-list">
          {flaggedContent.map(item => (
            <div key={item.id} className="moderation-flagged-item">
              <div className="moderation-flagged-header">
                <span className="moderation-flagged-target">
                  {item.target_type} #{item.target_id}
                </span>
                <span className="moderation-flagged-date">
                  {formatDate(item.created_at)}
                </span>
              </div>
              <div className="moderation-flagged-reason">
                {item.reason}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};