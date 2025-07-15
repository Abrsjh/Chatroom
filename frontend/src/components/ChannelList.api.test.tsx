import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import ChannelList from './ChannelList'
import { useChannelStore } from '../stores'
import { Channel } from '../types'
import * as api from '../services/api'

// Mock the API service
jest.mock('../services/api')
const mockApi = api as jest.Mocked<typeof api>

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
  }
]

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('ChannelList Component - API Integration', () => {
  const mockSetCurrentChannel = jest.fn()
  const mockAddChannel = jest.fn()
  const mockSetChannels = jest.fn()
  const mockClearChannels = jest.fn()
  const mockGetChannelById = jest.fn()
  const mockSetLoading = jest.fn()
  const mockSetError = jest.fn()

  const defaultStoreState = {
    channels: [],
    currentChannel: null,
    loading: false,
    error: null,
    setCurrentChannel: mockSetCurrentChannel,
    addChannel: mockAddChannel,
    setChannels: mockSetChannels,
    clearChannels: mockClearChannels,
    getChannelById: mockGetChannelById,
    setLoading: mockSetLoading,
    setError: mockSetError,
    fetchChannels: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChannelStore.mockReturnValue(defaultStoreState)
  })

  describe('Loading States', () => {
    test('displays loading spinner when fetching channels', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        loading: true
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-loading')).toBeInTheDocument()
      expect(screen.getByText('Loading channels...')).toBeInTheDocument()
    })

    test('hides loading spinner when loading is complete', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: mockChannels,
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.queryByTestId('channel-list-loading')).not.toBeInTheDocument()
      expect(screen.getByText('general')).toBeInTheDocument()
    })

    test('calls fetchChannels on component mount', async () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        fetchChannels: mockFetchChannels
      })

      renderWithRouter(<ChannelList />)

      await waitFor(() => {
        expect(mockFetchChannels).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Error Handling', () => {
    test('displays error message when API call fails', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Failed to fetch channels: Network error',
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByTestId('channel-list-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to fetch channels: Network error')).toBeInTheDocument()
    })

    test('displays retry button when there is an error', () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Network error',
        loading: false,
        fetchChannels: mockFetchChannels
      })

      renderWithRouter(<ChannelList />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()
      
      fireEvent.click(retryButton)
      expect(mockFetchChannels).toHaveBeenCalledTimes(1)
    })

    test('clears error when retrying', () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        error: 'Network error',
        fetchChannels: mockFetchChannels
      })

      renderWithRouter(<ChannelList />)
      
      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)
      
      expect(mockSetError).toHaveBeenCalledWith(null)
    })
  })

  describe('Success States', () => {
    test('displays channels after successful API call', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: mockChannels,
        loading: false,
        error: null
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByText('general')).toBeInTheDocument()
      expect(screen.getByText('random')).toBeInTheDocument()
      expect(screen.getByText('General discussion')).toBeInTheDocument()
      expect(screen.getByText('Random chat')).toBeInTheDocument()
    })

    test('displays empty state when API returns empty array', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: [],
        loading: false,
        error: null
      })

      renderWithRouter(<ChannelList />)
      
      expect(screen.getByText('No channels available')).toBeInTheDocument()
      expect(screen.getByText('Channels will appear here once they are created.')).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    test('clicking channel sets current channel and navigates', async () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: mockChannels,
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      const generalLink = screen.getByRole('link', { name: /general/i })
      fireEvent.click(generalLink)
      
      expect(mockSetCurrentChannel).toHaveBeenCalledWith(mockChannels[0])
    })

    test('highlights current channel correctly', () => {
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: mockChannels,
        currentChannel: mockChannels[0],
        loading: false
      })

      renderWithRouter(<ChannelList />)
      
      const currentChannelItem = screen.getByTestId('channel-item-1')
      expect(currentChannelItem).toHaveClass('channel-item--current')
      
      const otherChannelItem = screen.getByTestId('channel-item-2')
      expect(otherChannelItem).not.toHaveClass('channel-item--current')
    })
  })

  describe('Component Lifecycle', () => {
    test('only fetches channels once on mount', async () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        fetchChannels: mockFetchChannels
      })

      const { rerender } = renderWithRouter(<ChannelList />)
      
      await waitFor(() => {
        expect(mockFetchChannels).toHaveBeenCalledTimes(1)
      })

      // Re-render component
      rerender(
        <BrowserRouter>
          <ChannelList />
        </BrowserRouter>
      )
      
      // Should not fetch again
      expect(mockFetchChannels).toHaveBeenCalledTimes(1)
    })

    test('does not fetch if channels already exist', async () => {
      const mockFetchChannels = jest.fn()
      mockUseChannelStore.mockReturnValue({
        ...defaultStoreState,
        channels: mockChannels,
        fetchChannels: mockFetchChannels
      })

      renderWithRouter(<ChannelList />)

      // Should not call fetchChannels if channels already exist
      await waitFor(() => {
        expect(mockFetchChannels).not.toHaveBeenCalled()
      })
    })
  })
})