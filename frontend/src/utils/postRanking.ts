import { Post, PostSortType } from '../types'

/**
 * Reddit-style hot algorithm that balances score and recency
 * Based on Reddit's ranking algorithm with time decay
 */
export function calculateHotScore(post: Post): number {
  const { net_votes, created_at } = post
  const score = Math.max(net_votes, 1) // Minimum score of 1
  const now = new Date().getTime()
  const postTime = new Date(created_at).getTime()
  const ageInHours = (now - postTime) / (1000 * 60 * 60)
  
  // Time decay factor - posts lose ranking power over time
  // Using log base to give diminishing returns to vote count
  // and exponential decay for time
  const timeDecay = Math.exp(-ageInHours / 24) // Decay over 24 hours
  const voteWeight = Math.log10(score + 1)
  
  return voteWeight * timeDecay
}

/**
 * Calculates Wilson score confidence interval for ranking
 * This is more robust than simple net votes for low vote counts
 */
export function calculateWilsonScore(upvotes: number, totalVotes: number): number {
  if (totalVotes === 0) return 0
  
  const z = 1.96 // 95% confidence interval
  const phat = upvotes / totalVotes
  const denominator = 1 + (z * z) / totalVotes
  const adjustment = z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * totalVotes)) / totalVotes)
  
  return (phat + (z * z) / (2 * totalVotes) - adjustment) / denominator
}

/**
 * Controversial score - posts with high engagement but mixed votes
 */
export function calculateControversyScore(post: Post): number {
  const { upvote_count, downvote_count } = post
  
  if (upvote_count + downvote_count === 0) return 0
  
  // Balance factor - closer to 0.5 means more controversial
  const balance = Math.min(upvote_count, downvote_count) / Math.max(upvote_count, downvote_count)
  const totalEngagement = upvote_count + downvote_count
  
  return balance * Math.log10(totalEngagement + 1)
}

/**
 * Filters posts by time window for "top" sorting
 */
export function filterPostsByTimeWindow(
  posts: Post[], 
  timeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
): Post[] {
  if (timeWindow === 'all') return posts
  
  const now = new Date().getTime()
  const timeThresholds = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000
  }
  
  const threshold = timeThresholds[timeWindow]
  
  return posts.filter(post => {
    const postTime = new Date(post.created_at).getTime()
    return (now - postTime) <= threshold
  })
}

/**
 * Main sorting function that applies the specified algorithm
 */
export function sortPosts(
  posts: Post[], 
  sortType: PostSortType, 
  timeWindow: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'all'
): Post[] {
  let filteredPosts = posts

  // Apply time filter for top sorting
  if (sortType === 'top') {
    filteredPosts = filterPostsByTimeWindow(posts, timeWindow)
  }

  switch (sortType) {
    case 'hot':
      return [...filteredPosts].sort((a, b) => {
        const scoreA = calculateHotScore(a)
        const scoreB = calculateHotScore(b)
        return scoreB - scoreA // Descending order
      })
    
    case 'new':
      return [...filteredPosts].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime()
        const timeB = new Date(b.created_at).getTime()
        return timeB - timeA // Newest first
      })
    
    case 'top':
      return [...filteredPosts].sort((a, b) => {
        // Primary sort by net votes
        if (a.net_votes !== b.net_votes) {
          return b.net_votes - a.net_votes
        }
        // Secondary sort by Wilson score for ties
        const wilsonA = calculateWilsonScore(a.upvote_count, a.total_votes)
        const wilsonB = calculateWilsonScore(b.upvote_count, b.total_votes)
        if (wilsonA !== wilsonB) {
          return wilsonB - wilsonA
        }
        // Tertiary sort by total engagement
        return b.total_votes - a.total_votes
      })
    
    default:
      return filteredPosts
  }
}

/**
 * Get trending posts using a combination of hot and controversy scores
 */
export function getTrendingPosts(posts: Post[], limit: number = 10): Post[] {
  return [...posts]
    .sort((a, b) => {
      const hotA = calculateHotScore(a)
      const hotB = calculateHotScore(b)
      const controversyA = calculateControversyScore(a)
      const controversyB = calculateControversyScore(b)
      
      // Combine hot score with controversy for trending calculation
      const trendingA = hotA + (controversyA * 0.3)
      const trendingB = hotB + (controversyB * 0.3)
      
      return trendingB - trendingA
    })
    .slice(0, limit)
}

/**
 * Get rising posts - new posts with good engagement
 */
export function getRisingPosts(posts: Post[], limit: number = 10): Post[] {
  const recentThreshold = 24 * 60 * 60 * 1000 // 24 hours
  const now = new Date().getTime()
  
  return [...posts]
    .filter(post => {
      const postTime = new Date(post.created_at).getTime()
      return (now - postTime) <= recentThreshold
    })
    .sort((a, b) => {
      // Calculate engagement rate (votes per hour)
      const ageA = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60)
      const ageB = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60)
      const engagementA = a.total_votes / Math.max(ageA, 1)
      const engagementB = b.total_votes / Math.max(ageB, 1)
      
      return engagementB - engagementA
    })
    .slice(0, limit)
}