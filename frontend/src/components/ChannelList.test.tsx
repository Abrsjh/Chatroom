import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChannelList from './ChannelList'
import { useChannelStore } from '../stores'
import { Channel } from '../types'

// Mock the store
jest.mock('../stores', () => ({
  useChannelStore: jest.fn()
}))

const mockUseChannelStore = useChannelStore as jest.MockedFunction<typeof useChannelStore>

const mockChannels: Channel[] = [
  {
    id: '1',
    name: 'general',
    description: 'General discussion',
    created_by: 'user1',
    created_at: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'random',
    description: 'Random chat',
    created_by: 'user2',
    created_at: new Date('2024-01-02')
  },
  {
    id: '3',
    name: 'tech-talk',
    description: 'Technology discussions',
    created_by: 'user1',
    created_at: new Date('2024-01-03')
  }
]

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('ChannelList Component', () => {
  const mockSetCurrentChannel = jest.fn()
  const mockAddChannel = jest.fn()
  const mockSetChannels = jest.fn()
  const mockClearChannels = jest.fn()
  const mockGetChannelById = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChannelStore.mockReturnValue({
      channels: mockChannels,
      currentChannel: null,
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: mockAddChannel,
      setChannels: mockSetChannels,
      clearChannels: mockClearChannels,
      getChannelById: mockGetChannelById
    })
  })

  test('renders channel list title', () => {
    renderWithRouter(<ChannelList />)
    
    const title = screen.getByText('Channels')
    expect(title).toBeInTheDocument()
  })

  test('displays all channels from store', () => {
    renderWithRouter(<ChannelList />)
    
    expect(screen.getByText('general')).toBeInTheDocument()
    expect(screen.getByText('random')).toBeInTheDocument()
    expect(screen.getByText('tech-talk')).toBeInTheDocument()
  })

  test('displays channel descriptions', () => {
    renderWithRouter(<ChannelList />)
    
    expect(screen.getByText('General discussion')).toBeInTheDocument()
    expect(screen.getByText('Random chat')).toBeInTheDocument()
    expect(screen.getByText('Technology discussions')).toBeInTheDocument()
  })

  test('renders channels as clickable links', () => {
    renderWithRouter(<ChannelList />)
    
    const generalLink = screen.getByRole('link', { name: /general/i })
    const randomLink = screen.getByRole('link', { name: /random/i })
    
    expect(generalLink).toHaveAttribute('href', '/channels/1')
    expect(randomLink).toHaveAttribute('href', '/channels/2')
  })

  test('calls setCurrentChannel when channel is clicked', () => {
    renderWithRouter(<ChannelList />)
    
    const generalLink = screen.getByRole('link', { name: /general/i })
    fireEvent.click(generalLink)
    
    expect(mockSetCurrentChannel).toHaveBeenCalledWith(mockChannels[0])
  })

  test('displays empty state when no channels', () => {
    mockUseChannelStore.mockReturnValue({
      channels: [],
      currentChannel: null,
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: mockAddChannel,
      setChannels: mockSetChannels,
      clearChannels: mockClearChannels,
      getChannelById: mockGetChannelById
    })

    renderWithRouter(<ChannelList />)
    
    expect(screen.getByText('No channels available')).toBeInTheDocument()
    expect(screen.getByText('Channels will appear here once they are created.')).toBeInTheDocument()
  })

  test('highlights current channel when selected', () => {
    mockUseChannelStore.mockReturnValue({
      channels: mockChannels,
      currentChannel: mockChannels[0],
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: mockAddChannel,
      setChannels: mockSetChannels,
      clearChannels: mockClearChannels,
      getChannelById: mockGetChannelById
    })

    renderWithRouter(<ChannelList />)
    
    const currentChannelItem = screen.getByTestId('channel-item-1')
    expect(currentChannelItem).toHaveClass('channel-item--current')
  })

  test('does not highlight non-current channels', () => {
    mockUseChannelStore.mockReturnValue({
      channels: mockChannels,
      currentChannel: mockChannels[0],
      setCurrentChannel: mockSetCurrentChannel,
      addChannel: mockAddChannel,
      setChannels: mockSetChannels,
      clearChannels: mockClearChannels,
      getChannelById: mockGetChannelById
    })

    renderWithRouter(<ChannelList />)
    
    const nonCurrentChannelItem = screen.getByTestId('channel-item-2')
    expect(nonCurrentChannelItem).not.toHaveClass('channel-item--current')
  })

  test('renders proper list structure', () => {
    renderWithRouter(<ChannelList />)
    
    const list = screen.getByRole('list')
    const listItems = screen.getAllByRole('listitem')
    
    expect(list).toBeInTheDocument()
    expect(listItems).toHaveLength(3)
  })

  test('displays channel member count placeholder', () => {
    renderWithRouter(<ChannelList />)
    
    // Since we don't have member count in the Channel interface yet,
    // we'll test for the placeholder text
    const memberCounts = screen.getAllByText(/members/i)
    expect(memberCounts.length).toBeGreaterThan(0)
  })

  test('loads mock channels on component mount', () => {
    renderWithRouter(<ChannelList />)
    
    // Component should load mock data on mount
    expect(mockSetChannels).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ name: expect.any(String) })
    ]))
  })
})