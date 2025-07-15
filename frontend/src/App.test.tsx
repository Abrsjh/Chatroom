import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  )
}

test('renders reddit forum title in header', () => {
  renderWithRouter()
  const titleElement = screen.getByText(/Reddit Forum/i)
  expect(titleElement).toBeInTheDocument()
})

test('renders welcome message on home page', () => {
  renderWithRouter(['/'])
  const welcomeElement = screen.getByText(/Welcome to Reddit Forum/i)
  expect(welcomeElement).toBeInTheDocument()
})

test('renders navigation links', () => {
  renderWithRouter()
  const channelsLink = screen.getByText(/Channels/i)
  const messagesLink = screen.getByText(/Messages/i)
  
  expect(channelsLink).toBeInTheDocument()
  expect(messagesLink).toBeInTheDocument()
})

test('renders channels page when navigating to /channels', () => {
  renderWithRouter(['/channels'])
  
  // Should show the ChannelList component
  expect(screen.getByText('Channels')).toBeInTheDocument()
  // Should show some mock channels
  expect(screen.getByText('general')).toBeInTheDocument()
})

test('renders channel view when navigating to specific channel', () => {
  renderWithRouter(['/channels/1'])
  
  expect(screen.getByText('#general')).toBeInTheDocument()
  expect(screen.getByText('Posts')).toBeInTheDocument()
})

test('renders post view when navigating to specific post', () => {
  renderWithRouter(['/posts/post1'])
  
  expect(screen.getByText(/Back to Channel/i)).toBeInTheDocument()
})

test('renders create post page when navigating to /create-post', () => {
  renderWithRouter(['/create-post'])
  
  expect(screen.getByText('Create New Post')).toBeInTheDocument()
})

test('renders messages placeholder when navigating to /messages', () => {
  renderWithRouter(['/messages'])
  
  expect(screen.getByText('Messages')).toBeInTheDocument()
  expect(screen.getByText(/Direct messages will be implemented later/i)).toBeInTheDocument()
})