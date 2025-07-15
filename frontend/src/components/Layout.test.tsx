import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import Layout from './Layout'

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('Layout Component', () => {
  test('renders header section', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const header = screen.getByTestId('layout-header')
    expect(header).toBeInTheDocument()
  })

  test('renders sidebar section', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const sidebar = screen.getByTestId('layout-sidebar')
    expect(sidebar).toBeInTheDocument()
  })

  test('renders main content area', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const main = screen.getByTestId('layout-main')
    expect(main).toBeInTheDocument()
  })

  test('displays site title in header', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const siteTitle = screen.getByText('Reddit Forum')
    expect(siteTitle).toBeInTheDocument()
  })

  test('displays navigation links in sidebar', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const channelsLink = screen.getByText('Channels')
    const messagesLink = screen.getByText('Messages')
    
    expect(channelsLink).toBeInTheDocument()
    expect(messagesLink).toBeInTheDocument()
  })

  test('renders children in main content area', () => {
    const testContent = <div data-testid="child-content">Child Component</div>
    renderWithRouter(<Layout>{testContent}</Layout>)
    
    const main = screen.getByTestId('layout-main')
    const childContent = screen.getByTestId('child-content')
    
    expect(main).toContainElement(childContent)
    expect(childContent).toHaveTextContent('Child Component')
  })

  test('navigation links have correct href attributes', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const channelsLink = screen.getByRole('link', { name: /channels/i })
    const messagesLink = screen.getByRole('link', { name: /messages/i })
    
    expect(channelsLink).toHaveAttribute('href', '/channels')
    expect(messagesLink).toHaveAttribute('href', '/messages')
  })

  test('has proper semantic structure', () => {
    renderWithRouter(<Layout><div>Test Content</div></Layout>)
    
    const header = screen.getByRole('banner')
    const nav = screen.getByRole('navigation')
    const main = screen.getByRole('main')
    
    expect(header).toBeInTheDocument()
    expect(nav).toBeInTheDocument()
    expect(main).toBeInTheDocument()
  })
})