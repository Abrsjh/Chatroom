import { 
  Channel, 
  Post, 
  Message, 
  Conversation, 
  Reply, 
  VoteCounts, 
  VoteCreateData, 
  VoteResponse, 
  VoteRemovalResponse, 
  Vote,
  AuthResponse,
  LoginFormData,
  RegisterFormData,
  AuthUser
} from '../types'

const API_BASE_URL = 'http://localhost:8000/api'

// Enhanced error handling utility
class ApiError extends Error {
  constructor(
    message: string, 
    public status?: number,
    public details?: any,
    public requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Error message mapping for user-friendly messages
const getErrorMessage = (status: number, errorData?: any): string => {
  const errorMessage = errorData?.error || ''
  const details = errorData?.details || {}

  switch (status) {
    case 400:
      return errorMessage || 'Invalid request. Please check your input and try again.'
    
    case 401:
      return 'Authentication required. Please log in again.'
    
    case 403:
      return 'You do not have permission to access this resource.'
    
    case 404:
      if (errorMessage.includes('Channel')) {
        return 'The requested channel was not found.'
      }
      if (errorMessage.includes('Post')) {
        return 'The requested post was not found.'
      }
      return 'The requested resource was not found.'
    
    case 409:
      if (errorMessage.includes('already exists')) {
        const name = details.name || 'item'
        return `A ${errorMessage.includes('channel') ? 'channel' : 'resource'} with the name "${name}" already exists.`
      }
      if (errorMessage.includes('modified')) {
        return 'The data has been updated by another user. Please refresh and try again.'
      }
      return 'There was a conflict with your request. Please try again.'
    
    case 422:
      if (details && typeof details === 'object') {
        const fieldErrors = Object.entries(details)
          .map(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors : [errors]
            return `• ${field.charAt(0).toUpperCase() + field.slice(1)}: ${errorList.join(', ')}`
          })
          .join('\n')
        
        return `Validation failed. Please fix the following issues:\n${fieldErrors}`
      }
      return errorMessage || 'Please check your input and try again.'
    
    case 429:
      const retryAfter = details.retryAfter || 60
      const minutes = Math.ceil(retryAfter / 60)
      return `Rate limit exceeded. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`
    
    case 500:
      return 'Something went wrong on our end. Please try again later.'
    
    case 502:
      return 'Service temporarily unavailable. Please try again.'
    
    case 503:
      const estimatedDuration = details.estimatedDuration || 300
      const estimatedMinutes = Math.ceil(estimatedDuration / 60)
      return `Service is temporarily under maintenance. Please try again in ${estimatedMinutes} minute${estimatedMinutes > 1 ? 's' : ''}.`
    
    default:
      return errorMessage || 'An unexpected error occurred. Please try again.'
  }
}

// Network error message mapping
const getNetworkErrorMessage = (error: Error): string => {
  const message = error.message.toLowerCase()
  
  if (message.includes('timeout') || message.includes('request timeout')) {
    return 'Request timed out. Please check your connection and try again.'
  }
  
  if (message.includes('network request failed') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.'
  }
  
  if (message.includes('failed to fetch')) {
    return 'Unable to reach the server. Please try again later.'
  }
  
  if (message.includes('cors') || message.includes('access-control-allow-origin')) {
    return 'Unable to access the service due to security restrictions.'
  }
  
  if (message.includes('json') || message.includes('unexpected token')) {
    return 'Received invalid response from server. Please try again.'
  }
  
  return 'Unable to connect to the server. Please check your internet connection.'
}

// Enhanced API request function with comprehensive error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const requestId = response.headers.get('X-Request-ID')

    if (!response.ok) {
      let errorData: any = {}
      
      try {
        errorData = await response.json()
      } catch {
        // If JSON parsing fails, use status-based message
      }
      
      const userMessage = getErrorMessage(response.status, errorData)
      const enhancedMessage = requestId ? `${userMessage} (Request ID: ${requestId})` : userMessage
      
      throw new ApiError(
        enhancedMessage,
        response.status,
        errorData.details,
        requestId
      )
    }

    const data = await response.json()
    
    // Validate response data
    if (data === null || data === undefined) {
      throw new ApiError('No data received from server.')
    }
    
    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    
    // Handle network and parsing errors
    const message = error instanceof Error ? error.message : 'Unknown error'
    const userMessage = getNetworkErrorMessage(error as Error)
    
    throw new ApiError(userMessage)
  }
}

// Retry logic for specific error conditions
async function apiRequestWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<T> {
  let lastError: ApiError
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiRequest<T>(endpoint, options)
    } catch (error) {
      lastError = error as ApiError
      
      // Don't retry on client errors (4xx) except 429
      if (lastError.status && lastError.status >= 400 && lastError.status < 500 && lastError.status !== 429) {
        throw lastError
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Calculate exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  // If all retries failed
  throw new ApiError(
    'Service is currently unavailable after multiple attempts. Please try again later.',
    lastError.status,
    lastError.details,
    lastError.requestId
  )
}

// Channel API functions
export async function getChannels(): Promise<Channel[]> {
  try {
    return await apiRequest<Channel[]>('/channels', {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch channels: ${message}`)
  }
}

export async function getChannelsWithRetry(): Promise<Channel[]> {
  try {
    return await apiRequestWithRetry<Channel[]>('/channels', {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch channels: ${message}`)
  }
}

export async function getChannel(id: string): Promise<Channel> {
  try {
    return await apiRequest<Channel>(`/channels/${id}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch channel: ${message}`)
  }
}

export interface CreateChannelData {
  name: string
  description: string
}

export async function createChannel(data: CreateChannelData): Promise<Channel> {
  try {
    return await apiRequest<Channel>('/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to create channel: ${message}`)
  }
}

// Post API functions
export async function getChannelPosts(channelId: string): Promise<Post[]> {
  try {
    return await apiRequestWithRetry<Post[]>(`/channels/${channelId}/posts`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch channel posts: ${message}`)
  }
}

export async function getPost(id: string): Promise<Post> {
  try {
    return await apiRequest<Post>(`/posts/${id}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch post: ${message}`)
  }
}

export interface CreatePostData {
  title: string
  content: string
}

export async function createPost(channelId: string, data: CreatePostData): Promise<Post> {
  try {
    return await apiRequest<Post>(`/channels/${channelId}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to create post: ${message}`)
  }
}

// Message API functions
export async function getConversation(
  otherUserId: string, 
  options: { skip?: number; limit?: number } = {}
): Promise<Message[]> {
  const { skip = 0, limit = 50 } = options
  
  try {
    return await apiRequestWithRetry<Message[]>(`/messages?other_user_id=${otherUserId}&skip=${skip}&limit=${limit}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch conversation: ${message}`)
  }
}

export async function sendMessage(otherUserId: string, content: string): Promise<Message> {
  try {
    return await apiRequest<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify({
        recipient_id: otherUserId,
        content
      }),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send message: ${message}`)
  }
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    return await apiRequestWithRetry<Conversation[]>('/conversations', {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch conversations: ${message}`)
  }
}

export async function markAsRead(otherUserId: string): Promise<{ marked_as_read: number }> {
  try {
    return await apiRequest<{ marked_as_read: number }>(`/messages/read?other_user_id=${otherUserId}`, {
      method: 'PUT',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to mark messages as read: ${message}`)
  }
}

export async function getUnreadCount(): Promise<{ unread_count: number }> {
  try {
    return await apiRequest<{ unread_count: number }>('/messages/unread-count', {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to get unread count: ${message}`)
  }
}

export async function deleteMessage(messageId: string): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(`/messages/${messageId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to delete message: ${message}`)
  }
}

export async function searchMessages(
  otherUserId: string, 
  query: string, 
  limit: number = 50
): Promise<Message[]> {
  try {
    return await apiRequest<Message[]>(`/messages/search?other_user_id=${otherUserId}&query=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to search messages: ${message}`)
  }
}

// Response transformation utilities
export function transformChannelDates(channel: any): Channel {
  return {
    ...channel,
    created_at: new Date(channel.created_at),
  }
}

export function transformPostDates(post: any): Post {
  return {
    ...post,
    created_at: new Date(post.created_at),
    updated_at: new Date(post.updated_at),
  }
}

// Utility function to transform API responses with date parsing
export function transformChannelResponse(data: any): Channel {
  return transformChannelDates(data)
}

export function transformChannelsResponse(data: any[]): Channel[] {
  return data.map(transformChannelDates)
}

export function transformPostResponse(data: any): Post {
  return transformPostDates(data)
}

export function transformPostsResponse(data: any[]): Post[] {
  return data.map(transformPostDates)
}

// Reply API functions
export async function getPostReplies(
  postId: string, 
  options: { threaded?: boolean; skip?: number; limit?: number } = {}
): Promise<Reply[]> {
  const { threaded = true, skip = 0, limit = 100 } = options
  
  try {
    const params = new URLSearchParams({
      threaded: threaded.toString(),
      skip: skip.toString(),
      limit: limit.toString()
    })
    
    return await apiRequestWithRetry<Reply[]>(`/posts/${postId}/replies?${params}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch replies: ${message}`)
  }
}

export interface CreateReplyData {
  content: string
  parentId?: string
}

export async function createReply(postId: string, data: CreateReplyData): Promise<Reply> {
  try {
    const requestData = {
      content: data.content,
      author_id: 1, // Mock user ID - in real app this would come from auth
      parent_id: data.parentId ? parseInt(data.parentId) : undefined
    }
    
    return await apiRequest<Reply>(`/posts/${postId}/replies`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to create reply: ${message}`)
  }
}

export async function getReply(replyId: string): Promise<Reply> {
  try {
    return await apiRequest<Reply>(`/replies/${replyId}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch reply: ${message}`)
  }
}

export interface UpdateReplyData {
  content: string
}

export async function updateReply(replyId: string, data: UpdateReplyData): Promise<Reply> {
  try {
    return await apiRequest<Reply>(`/replies/${replyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to update reply: ${message}`)
  }
}

export async function deleteReply(replyId: string): Promise<{ message: string }> {
  try {
    return await apiRequest<{ message: string }>(`/replies/${replyId}`, {
      method: 'DELETE',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to delete reply: ${message}`)
  }
}

export async function getReplyThread(replyId: string): Promise<Reply[]> {
  try {
    return await apiRequest<Reply[]>(`/replies/${replyId}/thread`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch reply thread: ${message}`)
  }
}

export async function getReplyChildren(
  replyId: string,
  options: { skip?: number; limit?: number } = {}
): Promise<Reply[]> {
  const { skip = 0, limit = 100 } = options
  
  try {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString()
    })
    
    return await apiRequest<Reply[]>(`/replies/${replyId}/children?${params}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to fetch reply children: ${message}`)
  }
}

export async function searchReplies(
  postId: string,
  searchTerm: string,
  options: { skip?: number; limit?: number } = {}
): Promise<{ replies: Reply[]; total_count: number; search_term: string }> {
  const { skip = 0, limit = 100 } = options
  
  try {
    const params = new URLSearchParams({
      q: searchTerm,
      skip: skip.toString(),
      limit: limit.toString()
    })
    
    return await apiRequest<{ replies: Reply[]; total_count: number; search_term: string }>(`/posts/${postId}/replies/search?${params}`, {
      method: 'GET',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to search replies: ${message}`)
  }
}

// Voting API functions
export async function voteOnPost(postId: string, voteData: VoteCreateData): Promise<VoteResponse | VoteRemovalResponse> {
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/vote`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(voteData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function voteOnReply(replyId: string, voteData: VoteCreateData): Promise<VoteResponse | VoteRemovalResponse> {
  const response = await fetch(`${API_BASE_URL}/replies/${replyId}/vote`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(voteData),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getUserVoteOnPost(postId: string, userId: string): Promise<Vote> {
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/vote/${userId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getUserVoteOnReply(replyId: string, userId: string): Promise<Vote> {
  const response = await fetch(`${API_BASE_URL}/replies/${replyId}/vote/${userId}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getPostVoteCounts(postId: string): Promise<VoteCounts> {
  const response = await fetch(`${API_BASE_URL}/posts/${postId}/votes`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getReplyVoteCounts(replyId: string): Promise<VoteCounts> {
  const response = await fetch(`${API_BASE_URL}/replies/${replyId}/votes`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getUserVoteHistory(userId: string, options: { skip?: number; limit?: number; target_type?: string } = {}): Promise<Vote[]> {
  const { skip = 0, limit = 50, target_type = 'all' } = options
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
    target_type
  })

  const response = await fetch(`${API_BASE_URL}/users/${userId}/votes?${queryParams}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  const data = await response.json()
  return data.votes
}

export async function getTopVotedPosts(options: { limit?: number; time_period_hours?: number } = {}): Promise<Post[]> {
  const { limit = 10, time_period_hours } = options
  const queryParams = new URLSearchParams({
    limit: limit.toString()
  })
  
  if (time_period_hours) {
    queryParams.append('time_period_hours', time_period_hours.toString())
  }

  const response = await fetch(`${API_BASE_URL}/votes/top-posts?${queryParams}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

export async function getTopVotedReplies(options: { post_id?: string; limit?: number } = {}): Promise<Reply[]> {
  const { post_id, limit = 10 } = options
  const queryParams = new URLSearchParams({
    limit: limit.toString()
  })
  
  if (post_id) {
    queryParams.append('post_id', post_id)
  }

  const response = await fetch(`${API_BASE_URL}/votes/top-replies?${queryParams}`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new ApiError(
      getErrorMessage(response.status, errorData),
      response.status,
      errorData
    )
  }

  return response.json()
}

// Authentication API functions
export const authApi = {
  async register(userData: Pick<RegisterFormData, 'username' | 'email' | 'password'>): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async login(credentials: LoginFormData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }
  },

  async refreshToken(refreshToken: string): Promise<Omit<AuthResponse, 'refresh_token'>> {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async getCurrentUser(accessToken: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async updateUser(accessToken: string, userData: Partial<Pick<AuthUser, 'email' | 'is_active'>>): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async changePassword(accessToken: string, passwordData: { current_password: string; new_password: string }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(passwordData)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async deactivateAccount(accessToken: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  }
}

// Moderation API functions
export const moderationApi = {
  async deletePost(postId: number, reason: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async deleteReply(replyId: number, reason: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/replies/${replyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async flagPost(postId: number, reason: string, metadata?: any): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/posts/${postId}/flag`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, metadata })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async flagReply(replyId: number, reason: string, metadata?: any): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/replies/${replyId}/flag`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason, metadata })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async approvePost(postId: number, reason: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/posts/${postId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async approveReply(replyId: number, reason: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/moderation/replies/${replyId}/approve`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async getModerationLogs(filters: any = {}): Promise<{ data: any[] }> {
    const params = new URLSearchParams()
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString())
      }
    })

    const response = await fetch(`${API_BASE_URL}/moderation/logs?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async getModerationStats(days: number = 30): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/moderation/stats?days=${days}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async getFlaggedContent(limit: number = 50): Promise<{ data: any[] }> {
    const response = await fetch(`${API_BASE_URL}/moderation/flagged?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  },

  async getBannedUsers(): Promise<{ data: any[] }> {
    const response = await fetch(`${API_BASE_URL}/moderation/banned-users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        getErrorMessage(response.status, errorData),
        response.status,
        errorData
      )
    }

    return response.json()
  }
}

// Helper function to get auth token
function getAuthToken(): string {
  // This should be implemented based on your auth system
  const token = localStorage.getItem('access_token')
  return token || ''
}