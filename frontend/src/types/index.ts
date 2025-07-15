// Core entity interfaces following database schema patterns

export interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at?: string
}

export interface AuthUser extends User {
  last_login?: string
}

export interface Channel {
  id: string
  name: string
  description: string
  created_by: string
  created_at: Date
}

export interface Post {
  id: string
  channel_id: string
  author_id: string
  title: string
  content: string
  created_at: Date
  updated_at: Date
  upvote_count: number
  downvote_count: number
  net_votes: number
  total_votes: number
}

export interface Reply {
  id: string
  post_id: string
  author_id: string
  parent_id?: string
  content: string
  created_at: Date
  updated_at: Date
  is_edited: boolean
  depth: number
  upvote_count: number
  downvote_count: number
  net_votes: number
  can_reply_to: boolean
}

export type VoteType = 'upvote' | 'downvote'

export interface Vote {
  id: string
  user_id: string
  post_id?: string
  reply_id?: string
  vote_type: VoteType
  created_at: Date
  updated_at: Date
}

export interface VoteCounts {
  upvote_count: number
  downvote_count: number
  net_votes: number
  total_votes: number
}

export interface PostVoteCounts extends VoteCounts {
  post_id: string
}

export interface ReplyVoteCounts extends VoteCounts {
  reply_id: string
}

export interface VoteCreateData {
  user_id: string
  vote_type: VoteType
}

export interface VoteResponse {
  id: string
  user_id: string
  post_id?: string
  reply_id?: string
  vote_type: VoteType
  created_at: Date
  updated_at: Date
}

export interface VoteRemovalResponse {
  message: string
  previous_vote_type: VoteType
}

export interface Message {
  id: string
  content: string
  sender_id: string
  recipient_id: string
  created_at: Date
  read_at?: Date
  deleted_at?: Date
}

export interface Conversation {
  other_user_id: string
  other_username: string
  latest_message: {
    id: string
    content: string
    sender_id: string
    created_at: Date
  }
  unread_count: number
}

// Additional types for API responses and UI state
export interface ApiResponse<T> {
  data: T
  success: boolean
  message: string
  timestamp: string
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
  success: false
  timestamp: string
}

export type PostSortType = 'hot' | 'new' | 'top'

export interface PostSortOptions {
  sortType: PostSortType
  timeWindow?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
}

// Authentication types
export interface LoginFormData {
  username: string
  password: string
}

export interface RegisterFormData {
  username: string
  email: string
  password: string
  confirmPassword: string
}

export interface AuthTokens {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  user: AuthUser
}

export interface AuthError {
  message: string
  field?: string
}

export interface PasswordValidation {
  isValid: boolean
  errors: string[]
}

export interface UsernameValidation {
  isValid: boolean
  errors: string[]
}

export interface FormValidationState {
  isValid: boolean
  errors: Record<string, string[]>
}

export interface AuthFormState {
  isLoading: boolean
  errors: AuthError[]
  isSubmitted: boolean
}