from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.issue import IssueCreate, IssueResponse
from services.issue_service import IssueService

router = APIRouter(prefix="/api/issues", tags=["Road Issues"])

@router.get(
    "",
    response_model=List[IssueResponse],
    summary="Get all road issues",
    description="Returns all road issues from PostgreSQL, newest first."
)
def get_all_issues(db: Session = Depends(get_db)):
    """Retrieve all reported road issues from PostgreSQL."""
    return IssueService.get_all_issues(db)

@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a road issue",
    description="Validate incoming report, assign a unique backend ID, and persist to PostgreSQL."
)
def create_issue(issue_in: IssueCreate, db: Session = Depends(get_db)):
    """Create a new road issue and save it to the database."""
    try:
        created_issue = IssueService.create_issue(db, issue_in)
        return created_issue
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save issue to the database."
        )

@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Get road issue by ID",
    description="Fetch full details for a specific road issue from PostgreSQL."
)
def get_issue_by_id(issue_id: str, db: Session = Depends(get_db)):
    """Retrieve an issue by ID from PostgreSQL or return 404 if not found."""
    issue = IssueService.get_issue_by_id(db, issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID '{issue_id}' not found."
        )
    return issue
