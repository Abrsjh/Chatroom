import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import '../index.css' // Import global styles
import Layout from '../components/Layout'
import ChannelList from '../components/ChannelList'
import PostCreate from '../components/PostCreate'
import Post from '../components/Post'
import { Post as PostType } from '../types'

const mockPost: PostType = {
  id: 'post1',
  channel_id: 'channel1',
  user_id: 'user1',
  title: 'Test Post',
  content: 'Test content',
  created_at: new Date(),
  updated_at: new Date()
}

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('CSS Styling Tests', () => {
  test('Layout component has proper CSS classes applied', () => {
    renderWithRouter(
      <Layout>
        <div>Test content</div>
      </Layout>
    )
    
    const layoutElement = screen.getByTestId('layout-header')
    expect(layoutElement).toHaveClass('layout-header')
    
    const sidebar = screen.getByTestId('layout-sidebar')
    expect(sidebar).toHaveClass('layout-sidebar')
    
    const main = screen.getByTestId('layout-main')
    expect(main).toHaveClass('layout-main')
  })

  test('ChannelList component has proper CSS structure', () => {
    renderWithRouter(<ChannelList />)
    
    const channelList = document.querySelector('.channel-list')
    expect(channelList).toBeInTheDocument()
    
    const title = document.querySelector('.channel-list__title')
    expect(title).toBeInTheDocument()
  })

  test('PostCreate component has form styling', () => {
    renderWithRouter(<PostCreate />)
    
    const postCreate = document.querySelector('.post-create')
    expect(postCreate).toBeInTheDocument()
    
    const form = document.querySelector('.post-create__form')
    expect(form).toBeInTheDocument()
  })

  test('Post component has card-like styling', () => {
    renderWithRouter(<Post post={mockPost} />)
    
    const postItem = screen.getByTestId('post-item')
    expect(postItem).toHaveClass('post-item')
    
    const postLink = document.querySelector('.post-item__link')
    expect(postLink).toBeInTheDocument()
  })

  test('Typography classes are available globally', () => {
    render(<div className="text-center">Centered text</div>)
    
    const element = document.querySelector('.text-center')
    expect(element).toBeInTheDocument()
  })

  test('Button classes are available globally', () => {
    render(<button className="btn btn--primary">Test Button</button>)
    
    const button = document.querySelector('.btn')
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('btn--primary')
  })

  test('Form input classes are available globally', () => {
    render(<input className="form-input" />)
    
    const input = document.querySelector('.form-input')
    expect(input).toBeInTheDocument()
  })

  test('Layout spacing utilities are available', () => {
    render(<div className="mb-4 p-2">Spaced content</div>)
    
    const element = document.querySelector('.mb-4')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('p-2')
  })

  test('Color utilities are available', () => {
    render(<div className="text-muted bg-light">Colored content</div>)
    
    const element = document.querySelector('.text-muted')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('bg-light')
  })

  test('Responsive classes are available', () => {
    render(<div className="d-block d-md-flex">Responsive content</div>)
    
    const element = document.querySelector('.d-block')
    expect(element).toBeInTheDocument()
    expect(element).toHaveClass('d-md-flex')
  })
})