import { act, renderHook } from '@testing-library/react'
import { usePostStore } from './postStore'
import { Post } from '../types'

const mockPost: Post = {
  id: '1',
  channel_id: 'channel1',
  user_id: 'user1',
  title: 'Test Post',
  content: 'This is a test post',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01')
}

const mockPost2: Post = {
  id: '2',
  channel_id: 'channel1',
  user_id: 'user2',
  title: 'Another Post',
  content: 'This is another test post',
  created_at: new Date('2024-01-02'),
  updated_at: new Date('2024-01-02')
}

const mockPost3: Post = {
  id: '3',
  channel_id: 'channel2',
  user_id: 'user1',
  title: 'Different Channel Post',
  content: 'This is in a different channel',
  created_at: new Date('2024-01-03'),
  updated_at: new Date('2024-01-03')
}

describe('Post Store', () => {
  beforeEach(() => {
    const { result } = renderHook(() => usePostStore())
    act(() => {
      result.current.clearPosts()
    })
  })

  test('initial state has empty posts array', () => {
    const { result } = renderHook(() => usePostStore())
    
    expect(result.current.posts).toEqual([])
  })

  test('addPost adds a post to the store', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
    })
    
    expect(result.current.posts).toHaveLength(1)
    expect(result.current.posts[0]).toEqual(mockPost)
  })

  test('addPost adds multiple posts', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
      result.current.addPost(mockPost2)
    })
    
    expect(result.current.posts).toHaveLength(2)
    expect(result.current.posts).toContainEqual(mockPost)
    expect(result.current.posts).toContainEqual(mockPost2)
  })

  test('setPosts replaces entire posts array', () => {
    const { result } = renderHook(() => usePostStore())
    const posts = [mockPost, mockPost2, mockPost3]
    
    act(() => {
      result.current.setPosts(posts)
    })
    
    expect(result.current.posts).toEqual(posts)
    expect(result.current.posts).toHaveLength(3)
  })

  test('clearPosts empties the posts array', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
      result.current.addPost(mockPost2)
      result.current.clearPosts()
    })
    
    expect(result.current.posts).toEqual([])
    expect(result.current.posts).toHaveLength(0)
  })

  test('getPostsByChannelId returns posts for specific channel', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
      result.current.addPost(mockPost2)
      result.current.addPost(mockPost3)
    })
    
    const channel1Posts = result.current.getPostsByChannelId('channel1')
    expect(channel1Posts).toHaveLength(2)
    expect(channel1Posts).toContainEqual(mockPost)
    expect(channel1Posts).toContainEqual(mockPost2)
    
    const channel2Posts = result.current.getPostsByChannelId('channel2')
    expect(channel2Posts).toHaveLength(1)
    expect(channel2Posts).toContainEqual(mockPost3)
    
    const emptyChannelPosts = result.current.getPostsByChannelId('nonexistent')
    expect(emptyChannelPosts).toEqual([])
  })

  test('getPostById returns correct post', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
      result.current.addPost(mockPost2)
    })
    
    const foundPost = result.current.getPostById('1')
    expect(foundPost).toEqual(mockPost)
    
    const notFoundPost = result.current.getPostById('999')
    expect(notFoundPost).toBeUndefined()
  })

  test('updatePost updates existing post', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
    })
    
    const updatedPost = {
      ...mockPost,
      title: 'Updated Title',
      content: 'Updated content',
      updated_at: new Date('2024-01-05')
    }
    
    act(() => {
      result.current.updatePost(updatedPost)
    })
    
    expect(result.current.posts).toHaveLength(1)
    expect(result.current.posts[0]).toEqual(updatedPost)
    expect(result.current.posts[0].title).toBe('Updated Title')
  })

  test('updatePost does nothing if post not found', () => {
    const { result } = renderHook(() => usePostStore())
    
    act(() => {
      result.current.addPost(mockPost)
    })
    
    const nonExistentPost = {
      ...mockPost,
      id: '999',
      title: 'Non-existent post'
    }
    
    act(() => {
      result.current.updatePost(nonExistentPost)
    })
    
    expect(result.current.posts).toHaveLength(1)
    expect(result.current.posts[0]).toEqual(mockPost)
  })
})