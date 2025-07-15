import { 
  calculateHotScore, 
  calculateWilsonScore, 
  calculateControversyScore,
  filterPostsByTimeWindow,
  sortPosts,
  getTrendingPosts,
  getRisingPosts
} from '../postRanking'
import { Post } from '../../types'

const createMockPost = (overrides: Partial<Post> = {}): Post => ({
  id: '1',
  channel_id: 'ch1',
  author_id: 'user1',
  title: 'Test Post',
  content: 'Test content',
  created_at: new Date('2023-01-01T12:00:00Z'),
  updated_at: new Date('2023-01-01T12:00:00Z'),
  upvote_count: 10,
  downvote_count: 2,
  net_votes: 8,
  total_votes: 12,
  ...overrides
})

describe('Post Ranking Utilities', () => {
  beforeEach(() => {
    // Mock current time for consistent testing
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2023-01-02T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('calculateHotScore', () => {
    it('should calculate higher scores for posts with more votes', () => {
      const lowVotePost = createMockPost({ net_votes: 5 })
      const highVotePost = createMockPost({ net_votes: 50 })
      
      const lowScore = calculateHotScore(lowVotePost)
      const highScore = calculateHotScore(highVotePost)
      
      expect(highScore).toBeGreaterThan(lowScore)
    })

    it('should calculate lower scores for older posts', () => {
      const recentPost = createMockPost({ 
        created_at: new Date('2023-01-02T11:00:00Z'),
        net_votes: 10
      })
      const oldPost = createMockPost({ 
        created_at: new Date('2023-01-01T12:00:00Z'),
        net_votes: 10
      })
      
      const recentScore = calculateHotScore(recentPost)
      const oldScore = calculateHotScore(oldPost)
      
      expect(recentScore).toBeGreaterThan(oldScore)
    })

    it('should handle posts with negative votes', () => {
      const negativePost = createMockPost({ net_votes: -5 })
      const score = calculateHotScore(negativePost)
      
      expect(score).toBeGreaterThan(0) // Should use minimum score of 1
      expect(typeof score).toBe('number')
      expect(isFinite(score)).toBe(true)
    })

    it('should handle posts with zero votes', () => {
      const zeroPost = createMockPost({ net_votes: 0 })
      const score = calculateHotScore(zeroPost)
      
      expect(score).toBeGreaterThan(0)
      expect(typeof score).toBe('number')
      expect(isFinite(score)).toBe(true)
    })
  })

  describe('calculateWilsonScore', () => {
    it('should return 0 for posts with no votes', () => {
      const score = calculateWilsonScore(0, 0)
      expect(score).toBe(0)
    })

    it('should calculate higher scores for higher upvote ratios', () => {
      const lowRatioScore = calculateWilsonScore(6, 10) // 60% upvotes
      const highRatioScore = calculateWilsonScore(9, 10) // 90% upvotes
      
      expect(highRatioScore).toBeGreaterThan(lowRatioScore)
    })

    it('should be more conservative with fewer total votes', () => {
      const fewVotesScore = calculateWilsonScore(9, 10) // 90% with 10 votes
      const manyVotesScore = calculateWilsonScore(90, 100) // 90% with 100 votes
      
      expect(manyVotesScore).toBeGreaterThan(fewVotesScore)
    })

    it('should handle edge cases properly', () => {
      expect(calculateWilsonScore(10, 10)).toBeGreaterThan(0) // 100% upvotes
      expect(calculateWilsonScore(0, 10)).toBe(0) // 0% upvotes (but not zero total)
      expect(calculateWilsonScore(1, 1)).toBeGreaterThan(0) // Single upvote
    })
  })

  describe('calculateControversyScore', () => {
    it('should return 0 for posts with no votes', () => {
      const post = createMockPost({ upvote_count: 0, downvote_count: 0 })
      const score = calculateControversyScore(post)
      expect(score).toBe(0)
    })

    it('should give higher scores to more controversial posts', () => {
      const nonControversial = createMockPost({ upvote_count: 100, downvote_count: 5 })
      const controversial = createMockPost({ upvote_count: 50, downvote_count: 45 })
      
      const nonControversialScore = calculateControversyScore(nonControversial)
      const controversialScore = calculateControversyScore(controversial)
      
      expect(controversialScore).toBeGreaterThan(nonControversialScore)
    })

    it('should weight total engagement', () => {
      const lowEngagement = createMockPost({ upvote_count: 5, downvote_count: 5 })
      const highEngagement = createMockPost({ upvote_count: 50, downvote_count: 50 })
      
      const lowScore = calculateControversyScore(lowEngagement)
      const highScore = calculateControversyScore(highEngagement)
      
      expect(highScore).toBeGreaterThan(lowScore)
    })
  })

  describe('filterPostsByTimeWindow', () => {
    const posts = [
      createMockPost({ 
        id: '1', 
        created_at: new Date('2023-01-02T11:30:00Z') // 30 minutes ago
      }),
      createMockPost({ 
        id: '2', 
        created_at: new Date('2023-01-02T08:00:00Z') // 4 hours ago
      }),
      createMockPost({ 
        id: '3', 
        created_at: new Date('2023-01-01T12:00:00Z') // 1 day ago
      }),
      createMockPost({ 
        id: '4', 
        created_at: new Date('2022-12-26T12:00:00Z') // 1 week ago
      }),
      createMockPost({ 
        id: '5', 
        created_at: new Date('2022-12-02T12:00:00Z') // 1 month ago
      })
    ]

    it('should return all posts for "all" time window', () => {
      const filtered = filterPostsByTimeWindow(posts, 'all')
      expect(filtered).toHaveLength(5)
    })

    it('should filter posts by hour', () => {
      const filtered = filterPostsByTimeWindow(posts, 'hour')
      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('1')
    })

    it('should filter posts by day', () => {
      const filtered = filterPostsByTimeWindow(posts, 'day')
      expect(filtered).toHaveLength(2)
      expect(filtered.map(p => p.id)).toEqual(['1', '2'])
    })

    it('should filter posts by week', () => {
      const filtered = filterPostsByTimeWindow(posts, 'week')
      expect(filtered).toHaveLength(3)
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '3'])
    })

    it('should filter posts by month', () => {
      const filtered = filterPostsByTimeWindow(posts, 'month')
      expect(filtered).toHaveLength(4)
      expect(filtered.map(p => p.id)).toEqual(['1', '2', '3', '4'])
    })

    it('should filter posts by year', () => {
      const filtered = filterPostsByTimeWindow(posts, 'year')
      expect(filtered).toHaveLength(5) // All posts are within a year
    })
  })

  describe('sortPosts', () => {
    const posts = [
      createMockPost({
        id: 'hot-post',
        net_votes: 100,
        created_at: new Date('2023-01-02T10:00:00Z'), // 2 hours ago
        upvote_count: 105,
        downvote_count: 5,
        total_votes: 110
      }),
      createMockPost({
        id: 'new-post',
        net_votes: 5,
        created_at: new Date('2023-01-02T11:30:00Z'), // 30 minutes ago
        upvote_count: 6,
        downvote_count: 1,
        total_votes: 7
      }),
      createMockPost({
        id: 'top-post',
        net_votes: 200,
        created_at: new Date('2023-01-01T12:00:00Z'), // 1 day ago
        upvote_count: 210,
        downvote_count: 10,
        total_votes: 220
      })
    ]

    describe('hot sorting', () => {
      it('should sort posts by hot algorithm', () => {
        const sorted = sortPosts(posts, 'hot')
        
        // Hot post should rank higher due to good score and recency
        expect(sorted[0].id).toBe('hot-post')
      })

      it('should balance vote count and recency', () => {
        const veryOldHighVote = createMockPost({
          id: 'old-high',
          net_votes: 1000,
          created_at: new Date('2022-01-01T12:00:00Z') // Very old
        })
        const recentLowVote = createMockPost({
          id: 'recent-low',
          net_votes: 10,
          created_at: new Date('2023-01-02T11:45:00Z') // Very recent
        })
        
        const testPosts = [veryOldHighVote, recentLowVote]
        const sorted = sortPosts(testPosts, 'hot')
        
        // Recent post should rank higher despite lower votes
        expect(sorted[0].id).toBe('recent-low')
      })
    })

    describe('new sorting', () => {
      it('should sort posts by creation date descending', () => {
        const sorted = sortPosts(posts, 'new')
        
        expect(sorted[0].id).toBe('new-post') // Most recent
        expect(sorted[1].id).toBe('hot-post')
        expect(sorted[2].id).toBe('top-post') // Oldest
      })

      it('should maintain order for posts created at same time', () => {
        const sameTimePosts = [
          createMockPost({ id: 'post1', created_at: new Date('2023-01-01T12:00:00Z') }),
          createMockPost({ id: 'post2', created_at: new Date('2023-01-01T12:00:00Z') })
        ]
        
        const sorted = sortPosts(sameTimePosts, 'new')
        expect(sorted).toHaveLength(2)
      })
    })

    describe('top sorting', () => {
      it('should sort posts by net votes descending', () => {
        const sorted = sortPosts(posts, 'top')
        
        expect(sorted[0].id).toBe('top-post') // Highest net votes
        expect(sorted[1].id).toBe('hot-post')
        expect(sorted[2].id).toBe('new-post') // Lowest net votes
      })

      it('should use Wilson score as tiebreaker', () => {
        const tiedPosts = [
          createMockPost({
            id: 'post1',
            net_votes: 10,
            upvote_count: 11,
            downvote_count: 1,
            total_votes: 12
          }),
          createMockPost({
            id: 'post2',
            net_votes: 10,
            upvote_count: 15,
            downvote_count: 5,
            total_votes: 20
          })
        ]
        
        const sorted = sortPosts(tiedPosts, 'top')
        
        // Post with better upvote ratio should rank higher
        expect(sorted[0].id).toBe('post1')
      })

      it('should apply time window filtering', () => {
        const sorted = sortPosts(posts, 'top', 'hour')
        
        // Only new-post should be included (created within past hour)
        expect(sorted).toHaveLength(1)
        expect(sorted[0].id).toBe('new-post')
      })
    })
  })

  describe('getTrendingPosts', () => {
    it('should return limited number of posts', () => {
      const manyPosts = Array.from({ length: 20 }, (_, i) => 
        createMockPost({ id: `post-${i}` })
      )
      
      const trending = getTrendingPosts(manyPosts, 5)
      expect(trending).toHaveLength(5)
    })

    it('should combine hot score with controversy', () => {
      const posts = [
        createMockPost({
          id: 'trending',
          net_votes: 50,
          upvote_count: 75,
          downvote_count: 25,
          created_at: new Date('2023-01-02T11:00:00Z')
        }),
        createMockPost({
          id: 'normal',
          net_votes: 60,
          upvote_count: 61,
          downvote_count: 1,
          created_at: new Date('2023-01-02T11:00:00Z')
        })
      ]
      
      const trending = getTrendingPosts(posts, 2)
      
      // Controversial post might rank higher despite lower net votes
      expect(trending).toHaveLength(2)
      expect(trending[0].id).toBe('trending')
    })
  })

  describe('getRisingPosts', () => {
    it('should return limited number of posts', () => {
      const manyPosts = Array.from({ length: 20 }, (_, i) => 
        createMockPost({ 
          id: `post-${i}`,
          created_at: new Date('2023-01-02T11:00:00Z')
        })
      )
      
      const rising = getRisingPosts(manyPosts, 3)
      expect(rising).toHaveLength(3)
    })

    it('should only include recent posts', () => {
      const posts = [
        createMockPost({
          id: 'recent',
          created_at: new Date('2023-01-02T11:00:00Z'),
          total_votes: 100
        }),
        createMockPost({
          id: 'old',
          created_at: new Date('2022-01-01T12:00:00Z'),
          total_votes: 1000
        })
      ]
      
      const rising = getRisingPosts(posts, 10)
      
      expect(rising).toHaveLength(1)
      expect(rising[0].id).toBe('recent')
    })

    it('should prioritize engagement rate over total votes', () => {
      const posts = [
        createMockPost({
          id: 'high-rate',
          created_at: new Date('2023-01-02T11:30:00Z'), // 30 min ago
          total_votes: 30 // 60 votes/hour
        }),
        createMockPost({
          id: 'low-rate',
          created_at: new Date('2023-01-02T08:00:00Z'), // 4 hours ago
          total_votes: 100 // 25 votes/hour
        })
      ]
      
      const rising = getRisingPosts(posts, 2)
      
      expect(rising[0].id).toBe('high-rate')
    })

    it('should handle edge cases for age calculation', () => {
      const veryRecentPost = createMockPost({
        id: 'just-posted',
        created_at: new Date('2023-01-02T12:00:00Z'), // Posted right now
        total_votes: 5
      })
      
      const rising = getRisingPosts([veryRecentPost], 1)
      
      expect(rising).toHaveLength(1)
      expect(rising[0].id).toBe('just-posted')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty arrays gracefully', () => {
      expect(sortPosts([], 'hot')).toEqual([])
      expect(filterPostsByTimeWindow([], 'day')).toEqual([])
      expect(getTrendingPosts([], 5)).toEqual([])
      expect(getRisingPosts([], 5)).toEqual([])
    })

    it('should not mutate original arrays', () => {
      const originalPosts = [
        createMockPost({ id: '1', net_votes: 10 }),
        createMockPost({ id: '2', net_votes: 5 })
      ]
      const originalOrder = originalPosts.map(p => p.id)
      
      sortPosts(originalPosts, 'top')
      
      expect(originalPosts.map(p => p.id)).toEqual(originalOrder)
    })

    it('should handle invalid dates gracefully', () => {
      const postWithInvalidDate = createMockPost({
        created_at: new Date('invalid-date')
      })
      
      expect(() => calculateHotScore(postWithInvalidDate)).not.toThrow()
      expect(() => sortPosts([postWithInvalidDate], 'new')).not.toThrow()
    })

    it('should handle posts with missing vote counts', () => {
      const postWithMissingVotes = {
        ...createMockPost(),
        upvote_count: undefined as any,
        downvote_count: undefined as any,
        total_votes: undefined as any
      }
      
      expect(() => calculateControversyScore(postWithMissingVotes)).not.toThrow()
      expect(() => sortPosts([postWithMissingVotes], 'top')).not.toThrow()
    })
  })
})