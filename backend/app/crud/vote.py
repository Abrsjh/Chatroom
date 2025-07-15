from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from backend.app.models.models import Vote, Post, Reply, VoteType


def create_vote(db: Session, user_id: int, vote_type: str, post_id: Optional[int] = None, reply_id: Optional[int] = None) -> Vote:
    """Create a new vote or update existing vote"""
    
    # Validate vote_type
    if vote_type not in [VoteType.upvote.value, VoteType.downvote.value]:
        raise ValueError(f"Invalid vote type: {vote_type}")
    
    # Ensure exactly one target (post or reply)
    if (post_id is None and reply_id is None) or (post_id is not None and reply_id is not None):
        raise ValueError("Vote must target exactly one post or reply")
    
    # Check if post/reply exists
    if post_id:
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise ValueError(f"Post with id {post_id} not found")
    
    if reply_id:
        reply = db.query(Reply).filter(Reply.id == reply_id).first()
        if not reply:
            raise ValueError(f"Reply with id {reply_id} not found")
    
    # Check for existing vote
    existing_vote = get_user_vote(db, user_id, post_id, reply_id)
    
    if existing_vote:
        if existing_vote.vote_type.value == vote_type:
            # Same vote type - remove vote
            db.delete(existing_vote)
            db.commit()
            return None
        else:
            # Different vote type - update vote
            existing_vote.vote_type = VoteType(vote_type)
            db.commit()
            db.refresh(existing_vote)
            return existing_vote
    else:
        # Create new vote
        vote = Vote(
            user_id=user_id,
            post_id=post_id,
            reply_id=reply_id,
            vote_type=VoteType(vote_type)
        )
        db.add(vote)
        db.commit()
        db.refresh(vote)
        return vote


def get_user_vote(db: Session, user_id: int, post_id: Optional[int] = None, reply_id: Optional[int] = None) -> Optional[Vote]:
    """Get user's vote on a specific post or reply"""
    if post_id:
        return db.query(Vote).filter(
            and_(Vote.user_id == user_id, Vote.post_id == post_id)
        ).first()
    elif reply_id:
        return db.query(Vote).filter(
            and_(Vote.user_id == user_id, Vote.reply_id == reply_id)
        ).first()
    return None


def get_votes_for_post(db: Session, post_id: int, skip: int = 0, limit: int = 100) -> List[Vote]:
    """Get all votes for a specific post"""
    return db.query(Vote).filter(Vote.post_id == post_id).offset(skip).limit(limit).all()


def get_votes_for_reply(db: Session, reply_id: int, skip: int = 0, limit: int = 100) -> List[Vote]:
    """Get all votes for a specific reply"""
    return db.query(Vote).filter(Vote.reply_id == reply_id).offset(skip).limit(limit).all()


def get_user_votes(db: Session, user_id: int, skip: int = 0, limit: int = 100) -> List[Vote]:
    """Get all votes by a specific user"""
    return db.query(Vote).filter(Vote.user_id == user_id).offset(skip).limit(limit).all()


def get_vote_counts_for_post(db: Session, post_id: int) -> dict:
    """Get aggregated vote counts for a post"""
    votes = db.query(Vote).filter(Vote.post_id == post_id).all()
    
    upvotes = len([v for v in votes if v.vote_type == VoteType.upvote])
    downvotes = len([v for v in votes if v.vote_type == VoteType.downvote])
    
    return {
        "post_id": post_id,
        "upvote_count": upvotes,
        "downvote_count": downvotes,
        "net_votes": upvotes - downvotes,
        "total_votes": upvotes + downvotes
    }


def get_vote_counts_for_reply(db: Session, reply_id: int) -> dict:
    """Get aggregated vote counts for a reply"""
    votes = db.query(Vote).filter(Vote.reply_id == reply_id).all()
    
    upvotes = len([v for v in votes if v.vote_type == VoteType.upvote])
    downvotes = len([v for v in votes if v.vote_type == VoteType.downvote])
    
    return {
        "reply_id": reply_id,
        "upvote_count": upvotes,
        "downvote_count": downvotes,
        "net_votes": upvotes - downvotes,
        "total_votes": upvotes + downvotes
    }


def delete_vote(db: Session, vote_id: int) -> bool:
    """Delete a specific vote"""
    vote = db.query(Vote).filter(Vote.id == vote_id).first()
    if vote:
        db.delete(vote)
        db.commit()
        return True
    return False


def delete_user_votes(db: Session, user_id: int) -> int:
    """Delete all votes by a user (for cleanup)"""
    votes = db.query(Vote).filter(Vote.user_id == user_id).all()
    count = len(votes)
    for vote in votes:
        db.delete(vote)
    db.commit()
    return count


def get_top_voted_posts(db: Session, limit: int = 10, time_period_hours: Optional[int] = None) -> List[tuple]:
    """Get posts with highest net votes"""
    query = db.query(Post).join(Vote, Post.id == Vote.post_id, isouter=True)
    
    if time_period_hours:
        from datetime import datetime, timedelta
        cutoff_time = datetime.utcnow() - timedelta(hours=time_period_hours)
        query = query.filter(Vote.created_at >= cutoff_time)
    
    # This is a simplified version - in production, you'd want to use proper aggregation
    posts_with_votes = []
    for post in query.distinct().all():
        vote_counts = get_vote_counts_for_post(db, post.id)
        posts_with_votes.append((post, vote_counts["net_votes"]))
    
    # Sort by net votes (descending)
    posts_with_votes.sort(key=lambda x: x[1], reverse=True)
    
    return posts_with_votes[:limit]


def get_top_voted_replies(db: Session, post_id: Optional[int] = None, limit: int = 10) -> List[tuple]:
    """Get replies with highest net votes"""
    query = db.query(Reply).join(Vote, Reply.id == Vote.reply_id, isouter=True)
    
    if post_id:
        query = query.filter(Reply.post_id == post_id)
    
    # This is a simplified version - in production, you'd want to use proper aggregation
    replies_with_votes = []
    for reply in query.distinct().all():
        vote_counts = get_vote_counts_for_reply(db, reply.id)
        replies_with_votes.append((reply, vote_counts["net_votes"]))
    
    # Sort by net votes (descending)
    replies_with_votes.sort(key=lambda x: x[1], reverse=True)
    
    return replies_with_votes[:limit]


def get_vote_history(db: Session, user_id: int, target_type: str = "all", skip: int = 0, limit: int = 50) -> List[Vote]:
    """Get user's voting history with optional filtering"""
    query = db.query(Vote).filter(Vote.user_id == user_id)
    
    if target_type == "posts":
        query = query.filter(Vote.post_id.isnot(None))
    elif target_type == "replies":
        query = query.filter(Vote.reply_id.isnot(None))
    
    return query.order_by(Vote.created_at.desc()).offset(skip).limit(limit).all()


def bulk_update_vote_aggregates(db: Session) -> dict:
    """Update vote aggregates for all posts and replies (for maintenance)"""
    # This would typically be run as a background job
    posts_updated = 0
    replies_updated = 0
    
    # Update post vote counts
    posts = db.query(Post).all()
    for post in posts:
        vote_counts = get_vote_counts_for_post(db, post.id)
        # In a real implementation, you might store these counts in the database
        posts_updated += 1
    
    # Update reply vote counts  
    replies = db.query(Reply).all()
    for reply in replies:
        vote_counts = get_vote_counts_for_reply(db, reply.id)
        # In a real implementation, you might store these counts in the database
        replies_updated += 1
    
    return {
        "posts_updated": posts_updated,
        "replies_updated": replies_updated
    }


def get_controversial_content(db: Session, min_total_votes: int = 10, limit: int = 20) -> dict:
    """Get posts and replies with high controversy (similar upvotes and downvotes)"""
    controversial_posts = []
    controversial_replies = []
    
    # Get posts with high vote counts
    posts = db.query(Post).all()
    for post in posts:
        counts = get_vote_counts_for_post(db, post.id)
        if counts["total_votes"] >= min_total_votes:
            # Calculate controversy score (closer to 0.5 ratio = more controversial)
            if counts["total_votes"] > 0:
                upvote_ratio = counts["upvote_count"] / counts["total_votes"]
                controversy_score = 1 - abs(upvote_ratio - 0.5) * 2  # 0-1 scale
                if controversy_score > 0.7:  # Highly controversial
                    controversial_posts.append((post, controversy_score, counts))
    
    # Get replies with high vote counts
    replies = db.query(Reply).all()
    for reply in replies:
        counts = get_vote_counts_for_reply(db, reply.id)
        if counts["total_votes"] >= min_total_votes:
            if counts["total_votes"] > 0:
                upvote_ratio = counts["upvote_count"] / counts["total_votes"]
                controversy_score = 1 - abs(upvote_ratio - 0.5) * 2
                if controversy_score > 0.7:
                    controversial_replies.append((reply, controversy_score, counts))
    
    # Sort by controversy score
    controversial_posts.sort(key=lambda x: x[1], reverse=True)
    controversial_replies.sort(key=lambda x: x[1], reverse=True)
    
    return {
        "posts": controversial_posts[:limit//2],
        "replies": controversial_replies[:limit//2]
    }