from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import Post, Reply, Vote
from backend.app.schemas.vote import (
    VoteCreate, VoteResponse, VoteRemovalResponse, 
    PostVoteCountsResponse, ReplyVoteCountsResponse,
    UserVoteHistoryResponse, VoteErrorResponse
)
from backend.app.crud import vote as vote_crud

router = APIRouter(prefix="/api", tags=["votes"])


@router.put("/posts/{post_id}/vote", response_model=VoteResponse | VoteRemovalResponse)
async def vote_on_post(
    post_id: int,
    vote_data: VoteCreate,
    db: Session = Depends(get_db)
):
    """Vote on a post (upvote or downvote)"""
    try:
        # Check if post exists
        post = db.query(Post).filter(Post.id == post_id).first()
        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Post not found"
            )
        
        # Create or update vote
        result = vote_crud.create_vote(
            db=db,
            user_id=vote_data.user_id,
            vote_type=vote_data.vote_type.value,
            post_id=post_id
        )
        
        if result is None:
            # Vote was removed
            return VoteRemovalResponse(
                message="Vote removed",
                previous_vote_type=vote_data.vote_type
            )
        
        return VoteResponse.from_orm(result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process vote"
        )


@router.put("/replies/{reply_id}/vote", response_model=VoteResponse | VoteRemovalResponse)
async def vote_on_reply(
    reply_id: int,
    vote_data: VoteCreate,
    db: Session = Depends(get_db)
):
    """Vote on a reply (upvote or downvote)"""
    try:
        # Check if reply exists
        reply = db.query(Reply).filter(Reply.id == reply_id).first()
        if not reply:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reply not found"
            )
        
        # Create or update vote
        result = vote_crud.create_vote(
            db=db,
            user_id=vote_data.user_id,
            vote_type=vote_data.vote_type.value,
            reply_id=reply_id
        )
        
        if result is None:
            # Vote was removed
            return VoteRemovalResponse(
                message="Vote removed",
                previous_vote_type=vote_data.vote_type
            )
        
        return VoteResponse.from_orm(result)
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process vote"
        )


@router.get("/posts/{post_id}/vote/{user_id}", response_model=VoteResponse)
async def get_user_vote_on_post(
    post_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user's current vote on a post"""
    vote = vote_crud.get_user_vote(db=db, user_id=user_id, post_id=post_id)
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    return VoteResponse.from_orm(vote)


@router.get("/replies/{reply_id}/vote/{user_id}", response_model=VoteResponse)
async def get_user_vote_on_reply(
    reply_id: int,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get user's current vote on a reply"""
    vote = vote_crud.get_user_vote(db=db, user_id=user_id, reply_id=reply_id)
    if not vote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    return VoteResponse.from_orm(vote)


@router.get("/posts/{post_id}/votes", response_model=PostVoteCountsResponse)
async def get_post_vote_counts(
    post_id: int,
    db: Session = Depends(get_db)
):
    """Get aggregated vote counts for a post"""
    # Check if post exists
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found"
        )
    
    vote_counts = vote_crud.get_vote_counts_for_post(db=db, post_id=post_id)
    return PostVoteCountsResponse(**vote_counts)


@router.get("/replies/{reply_id}/votes", response_model=ReplyVoteCountsResponse)
async def get_reply_vote_counts(
    reply_id: int,
    db: Session = Depends(get_db)
):
    """Get aggregated vote counts for a reply"""
    # Check if reply exists
    reply = db.query(Reply).filter(Reply.id == reply_id).first()
    if not reply:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reply not found"
        )
    
    vote_counts = vote_crud.get_vote_counts_for_reply(db=db, reply_id=reply_id)
    return ReplyVoteCountsResponse(**vote_counts)


@router.get("/users/{user_id}/votes", response_model=UserVoteHistoryResponse)
async def get_user_vote_history(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    target_type: str = "all",
    db: Session = Depends(get_db)
):
    """Get user's voting history"""
    if target_type not in ["all", "posts", "replies"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_type must be 'all', 'posts', or 'replies'"
        )
    
    votes = vote_crud.get_vote_history(
        db=db, 
        user_id=user_id, 
        target_type=target_type,
        skip=skip, 
        limit=limit
    )
    
    # Get total count for pagination
    all_votes = vote_crud.get_user_votes(db=db, user_id=user_id)
    total_count = len(all_votes)
    
    vote_responses = [VoteResponse.from_orm(vote) for vote in votes]
    
    return UserVoteHistoryResponse(
        votes=vote_responses,
        total_count=total_count,
        skip=skip,
        limit=limit
    )


@router.delete("/votes/{vote_id}")
async def delete_vote(
    vote_id: int,
    db: Session = Depends(get_db)
):
    """Delete a specific vote"""
    success = vote_crud.delete_vote(db=db, vote_id=vote_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vote not found"
        )
    return {"message": "Vote deleted successfully"}


@router.get("/votes/top-posts")
async def get_top_voted_posts(
    limit: int = 10,
    time_period_hours: int = None,
    db: Session = Depends(get_db)
):
    """Get posts with highest net votes"""
    if limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit cannot exceed 100"
        )
    
    top_posts = vote_crud.get_top_voted_posts(
        db=db, 
        limit=limit, 
        time_period_hours=time_period_hours
    )
    
    results = []
    for post, net_votes in top_posts:
        vote_counts = vote_crud.get_vote_counts_for_post(db=db, post_id=post.id)
        results.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "author_id": post.author_id,
            "channel_id": post.channel_id,
            "created_at": post.created_at,
            **vote_counts
        })
    
    return results


@router.get("/votes/top-replies")
async def get_top_voted_replies(
    post_id: int = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """Get replies with highest net votes"""
    if limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit cannot exceed 100"
        )
    
    top_replies = vote_crud.get_top_voted_replies(
        db=db, 
        post_id=post_id, 
        limit=limit
    )
    
    results = []
    for reply, net_votes in top_replies:
        vote_counts = vote_crud.get_vote_counts_for_reply(db=db, reply_id=reply.id)
        results.append({
            "id": reply.id,
            "content": reply.content,
            "author_id": reply.author_id,
            "post_id": reply.post_id,
            "parent_id": reply.parent_id,
            "created_at": reply.created_at,
            **vote_counts
        })
    
    return results


@router.get("/votes/controversial")
async def get_controversial_content(
    min_total_votes: int = 10,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get controversial content (high vote count with close upvote/downvote ratio)"""
    if limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit cannot exceed 100"
        )
    
    controversial = vote_crud.get_controversial_content(
        db=db,
        min_total_votes=min_total_votes,
        limit=limit
    )
    
    return controversial


@router.get("/votes/stats")
async def get_voting_stats(db: Session = Depends(get_db)):
    """Get overall voting statistics"""
    all_votes = db.query(Vote).all()
    upvotes = len([v for v in all_votes if v.vote_type.value == "upvote"])
    downvotes = len([v for v in all_votes if v.vote_type.value == "downvote"])
    
    active_voters = len(set([v.user_id for v in all_votes]))
    posts_with_votes = len(set([v.post_id for v in all_votes if v.post_id]))
    replies_with_votes = len(set([v.reply_id for v in all_votes if v.reply_id]))
    
    return {
        "total_votes": len(all_votes),
        "total_upvotes": upvotes,
        "total_downvotes": downvotes,
        "active_voters": active_voters,
        "posts_with_votes": posts_with_votes,
        "replies_with_votes": replies_with_votes
    }