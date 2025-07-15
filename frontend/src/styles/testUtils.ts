import { Post, Channel } from '../types'

export const mockPost: Post = {
  id: 'test-post-1',
  channel_id: 'test-channel-1',
  user_id: 'test-user',
  title: 'Test Post Title',
  content: 'Test post content for styling tests',
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z')
}

export const mockChannel: Channel = {
  id: 'test-channel-1',
  name: 'test-channel',
  description: 'Test channel for styling tests',
  created_by: 'test-user',
  created_at: new Date('2024-01-01T10:00:00Z')
}