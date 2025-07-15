import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Post from './Post'
import { Post as PostType } from '../types'

const mockPost: PostType = {
  id: 'post1',
  channel_id: 'channel1',
  user_id: 'user1',
  title: 'Test Post Title',
  content: 'This is a test post content that contains multiple lines and should be displayed properly in the post component.',
  created_at: new Date('2024-01-01T10:30:00Z'),
  updated_at: new Date('2024-01-01T10:30:00Z')
}

const mockPostUpdated: PostType = {
  ...mockPost,
  content: 'This is updated content.',
  updated_at: new Date('2024-01-02T15:45:00Z')
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Post Component', () => {
  test('renders post title', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    expect(screen.getByText('Test Post Title')).toBeInTheDocument()
  })

  test('renders post content', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    expect(screen.getByText(/This is a test post content/)).toBeInTheDocument()
  })

  test('renders post author', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    expect(screen.getByText(/user1/)).toBeInTheDocument()
  })

  test('renders post creation timestamp', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    // Should show relative time like "2 days ago"
    expect(screen.getByText(/ago/)).toBeInTheDocument()
  })

  test('renders post as clickable link', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const postLink = screen.getByRole('link')
    expect(postLink).toHaveAttribute('href', `/posts/${mockPost.id}`)
  })

  test('displays updated timestamp when post was edited', () => {
    renderWithRouter(<Post post={mockPostUpdated} />)
    
    expect(screen.getByText(/edited/i)).toBeInTheDocument()
  })

  test('shows post metadata with proper structure', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const metadata = screen.getByTestId('post-metadata')
    expect(metadata).toBeInTheDocument()
    expect(metadata).toHaveTextContent('user1')
  })

  test('renders post content with proper text formatting', () => {
    const postWithLongContent: PostType = {
      ...mockPost,
      content: 'This is a very long content that should be displayed properly. It contains multiple sentences and should wrap correctly.'
    }
    
    renderWithRouter(<Post post={postWithLongContent} />)
    
    const content = screen.getByTestId('post-content')
    expect(content).toHaveTextContent(postWithLongContent.content)
  })

  test('applies correct CSS classes for styling', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const postElement = screen.getByTestId('post-item')
    expect(postElement).toHaveClass('post-item')
  })

  test('renders post title as heading', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const titleElement = screen.getByRole('heading', { level: 3 })
    expect(titleElement).toHaveTextContent('Test Post Title')
  })

  test('supports compact view when compact prop is true', () => {
    renderWithRouter(<Post post={mockPost} compact />)
    
    const postElement = screen.getByTestId('post-item')
    expect(postElement).toHaveClass('post-item--compact')
  })

  test('shows full view by default', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const postElement = screen.getByTestId('post-item')
    expect(postElement).not.toHaveClass('post-item--compact')
  })
})