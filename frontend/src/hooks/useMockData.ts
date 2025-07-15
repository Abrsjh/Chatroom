import { useEffect } from 'react'
import { usePostStore } from '../stores'
import { Post } from '../types'

// Mock posts data for development
const mockPostsData: Post[] = [
  {
    id: 'post1',
    channel_id: '1',
    user_id: 'alice_dev',
    title: 'Welcome to the General Channel!',
    content: 'This is the first post in our general discussion channel. Feel free to introduce yourself and share what brings you to our community. We\'re excited to have you here!',
    created_at: new Date('2024-01-01T10:00:00Z'),
    updated_at: new Date('2024-01-01T10:00:00Z')
  },
  {
    id: 'post2',
    channel_id: '1',
    user_id: 'bob_admin',
    title: 'Community Guidelines and Best Practices',
    content: 'Here are some guidelines to help keep our discussions productive:\n\n1. Be respectful and kind to all members\n2. Stay on topic within each channel\n3. Use the search function before posting duplicate questions\n4. Share knowledge and help others when possible\n\nThanks for being part of our community!',
    created_at: new Date('2024-01-01T14:30:00Z'),
    updated_at: new Date('2024-01-01T15:00:00Z')
  },
  {
    id: 'post3',
    channel_id: '2',
    user_id: 'charlie_user',
    title: 'Random thought of the day',
    content: 'Why do we park in driveways and drive on parkways? 🤔\n\nShare your random thoughts and observations here!',
    created_at: new Date('2024-01-01T16:45:00Z'),
    updated_at: new Date('2024-01-01T16:45:00Z')
  },
  {
    id: 'post4',
    channel_id: '3',
    user_id: 'david_tech',
    title: 'Introduction to React Hooks',
    content: 'React Hooks have revolutionized how we write functional components. Let\'s discuss the most useful hooks and their best practices:\n\n• useState for component state\n• useEffect for side effects\n• useContext for consuming context\n• useMemo for expensive calculations\n\nWhat\'s your favorite hook and why?',
    created_at: new Date('2024-01-01T09:15:00Z'),
    updated_at: new Date('2024-01-01T09:15:00Z')
  },
  {
    id: 'post5',
    channel_id: '1',
    user_id: 'eve_user',
    title: 'Question about posting etiquette',
    content: 'Hi everyone! I\'m new here and wondering about the best practices for posting. Should I search for existing topics before creating a new post? How detailed should my questions be?',
    created_at: new Date('2024-01-02T08:20:00Z'),
    updated_at: new Date('2024-01-02T08:20:00Z')
  }
]

export function useMockData() {
  const { posts, setPosts } = usePostStore()

  useEffect(() => {
    // Only load mock data if store is empty
    if (posts.length === 0) {
      setPosts(mockPostsData)
    }
  }, [posts.length, setPosts])
}