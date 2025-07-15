import { User, Channel, Post, Reply, Vote } from './index'

describe('Core Entity Types', () => {
  test('User interface has required properties', () => {
    const user: User = {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
      password_hash: 'hashedpassword',
      created_at: new Date()
    }
    
    expect(user.id).toBe('1')
    expect(user.username).toBe('testuser')
    expect(user.email).toBe('test@example.com')
    expect(user.password_hash).toBe('hashedpassword')
    expect(user.created_at).toBeInstanceOf(Date)
  })

  test('Channel interface has required properties', () => {
    const channel: Channel = {
      id: '1',
      name: 'general',
      description: 'General discussion',
      created_by: 'user1',
      created_at: new Date()
    }
    
    expect(channel.id).toBe('1')
    expect(channel.name).toBe('general')
    expect(channel.description).toBe('General discussion')
    expect(channel.created_by).toBe('user1')
    expect(channel.created_at).toBeInstanceOf(Date)
  })

  test('Post interface has required properties', () => {
    const post: Post = {
      id: '1',
      channel_id: 'channel1',
      user_id: 'user1',
      title: 'Test Post',
      content: 'This is a test post',
      created_at: new Date(),
      updated_at: new Date()
    }
    
    expect(post.id).toBe('1')
    expect(post.channel_id).toBe('channel1')
    expect(post.user_id).toBe('user1')
    expect(post.title).toBe('Test Post')
    expect(post.content).toBe('This is a test post')
    expect(post.created_at).toBeInstanceOf(Date)
    expect(post.updated_at).toBeInstanceOf(Date)
  })

  test('Reply interface has required properties', () => {
    const reply: Reply = {
      id: '1',
      post_id: 'post1',
      user_id: 'user1',
      content: 'This is a reply',
      created_at: new Date()
    }
    
    expect(reply.id).toBe('1')
    expect(reply.post_id).toBe('post1')
    expect(reply.user_id).toBe('user1')
    expect(reply.content).toBe('This is a reply')
    expect(reply.created_at).toBeInstanceOf(Date)
  })

  test('Vote interface has required properties', () => {
    const vote: Vote = {
      id: '1',
      post_id: 'post1',
      user_id: 'user1',
      vote_type: 'upvote',
      created_at: new Date()
    }
    
    expect(vote.id).toBe('1')
    expect(vote.post_id).toBe('post1')
    expect(vote.user_id).toBe('user1')
    expect(vote.vote_type).toBe('upvote')
    expect(vote.created_at).toBeInstanceOf(Date)
  })

  test('Vote type only allows upvote or downvote', () => {
    const upvote: Vote = {
      id: '1',
      post_id: 'post1',
      user_id: 'user1',
      vote_type: 'upvote',
      created_at: new Date()
    }
    
    const downvote: Vote = {
      id: '2',
      post_id: 'post1',
      user_id: 'user1',
      vote_type: 'downvote',
      created_at: new Date()
    }
    
    expect(upvote.vote_type).toBe('upvote')
    expect(downvote.vote_type).toBe('downvote')
  })
})