import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout, ChannelList, PostCreate, Post } from '../components'
import { mockPost, mockChannel } from './testUtils'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Component Styling Tests', () => {
  test('Layout component has proper CSS classes applied', () => {
    const { container } = renderWithRouter(
      <Layout>
        <div>Test content</div>
      </Layout>
    )
    
    const layoutElement = container.querySelector('.layout')
    expect(layoutElement).toBeInTheDocument()
    expect(layoutElement).toHaveClass('layout')
    
    const header = container.querySelector('.layout-header')
    expect(header).toBeInTheDocument()
    
    const sidebar = container.querySelector('.layout-sidebar')
    expect(sidebar).toBeInTheDocument()
    
    const main = container.querySelector('.layout-main')
    expect(main).toBeInTheDocument()
  })

  test('ChannelList has proper styling classes', () => {
    const { container } = renderWithRouter(<ChannelList />)
    
    const channelList = container.querySelector('.channel-list')
    expect(channelList).toBeInTheDocument()
    
    const title = container.querySelector('.channel-list__title')
    expect(title).toBeInTheDocument()
  })

  test('PostCreate has proper form styling', () => {
    const { container } = renderWithRouter(<PostCreate />)
    
    const postCreate = container.querySelector('.post-create')
    expect(postCreate).toBeInTheDocument()
    
    const form = container.querySelector('.post-create__form')
    expect(form).toBeInTheDocument()
  })

  test('Post component has proper card styling', () => {
    const { container } = renderWithRouter(
      <Post post={mockPost} />
    )
    
    const postItem = container.querySelector('.post-item')
    expect(postItem).toBeInTheDocument()
    
    const postLink = container.querySelector('.post-item__link')
    expect(postLink).toBeInTheDocument()
    
    const postTitle = container.querySelector('.post-item__title')
    expect(postTitle).toBeInTheDocument()
  })

  test('components use consistent button styling', () => {
    const { container } = renderWithRouter(<PostCreate />)
    
    const button = container.querySelector('.btn')
    expect(button).toBeInTheDocument()
    
    const primaryButton = container.querySelector('.btn--primary')
    expect(primaryButton).toBeInTheDocument()
  })

  test('form components have consistent styling', () => {
    const { container } = renderWithRouter(<PostCreate />)
    
    const formGroup = container.querySelector('.form-group')
    expect(formGroup).toBeInTheDocument()
    
    const formLabel = container.querySelector('.form-label')
    expect(formLabel).toBeInTheDocument()
    
    const formInput = container.querySelector('.form-input')
    expect(formInput).toBeInTheDocument()
  })

  test('navigation has proper styling', () => {
    const { container } = renderWithRouter(
      <Layout>
        <div>Test</div>
      </Layout>
    )
    
    const navList = container.querySelector('.nav-list')
    expect(navList).toBeInTheDocument()
    
    const navLink = container.querySelector('.nav-link')
    expect(navLink).toBeInTheDocument()
  })

  test('responsive design classes are present', () => {
    const { container } = renderWithRouter(
      <Layout>
        <ChannelList />
      </Layout>
    )
    
    // Check that components have mobile-friendly structure
    const layoutBody = container.querySelector('.layout-body')
    expect(layoutBody).toBeInTheDocument()
    
    const sidebar = container.querySelector('.layout-sidebar')
    expect(sidebar).toBeInTheDocument()
  })
})