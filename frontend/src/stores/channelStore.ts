import { create } from 'zustand'
import { Channel } from '../types'
import * as api from '../services/api'

interface ChannelState {
  channels: Channel[]
  currentChannel: Channel | null
  loading: boolean
  error: string | null
  addChannel: (channel: Channel) => void
  setChannels: (channels: Channel[]) => void
  setCurrentChannel: (channel: Channel | null) => void
  clearChannels: () => void
  getChannelById: (id: string) => Channel | undefined
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchChannels: () => Promise<void>
  createChannel: (data: api.CreateChannelData) => Promise<void>
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [],
  currentChannel: null,
  loading: false,
  error: null,
  
  addChannel: (channel: Channel) => {
    set((state) => ({
      channels: [...state.channels, channel]
    }))
  },
  
  setChannels: (channels: Channel[]) => {
    set({ channels })
  },
  
  setCurrentChannel: (channel: Channel | null) => {
    set({ currentChannel: channel })
  },
  
  clearChannels: () => {
    set({ channels: [], currentChannel: null })
  },
  
  getChannelById: (id: string) => {
    return get().channels.find(channel => channel.id === id)
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  fetchChannels: async () => {
    set({ loading: true, error: null })
    try {
      const channels = await api.getChannels()
      set({ channels, loading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch channels'
      set({ error: errorMessage, loading: false })
    }
  },

  createChannel: async (data: api.CreateChannelData) => {
    set({ loading: true, error: null })
    try {
      const newChannel = await api.createChannel(data)
      set((state) => ({
        channels: [...state.channels, newChannel],
        loading: false
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create channel'
      set({ error: errorMessage, loading: false })
    }
  }
}))