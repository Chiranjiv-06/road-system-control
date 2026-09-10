from fastapi import APIRouter, HTTPException, status
from typing import List
from schemas.issue import IssueCreate, IssueResponse
from services.issue_service import IssueService

router = APIRouter(prefix="/api/issues", tags=["Road Issues"])

@router.get(
    "",
    response_model=List[IssueResponse],
    summary="Get all road issues",
    description="Returns a list of all reported road issues, ordered from newest to oldest."
)
def get_all_issues():
    """Retrieve all road issues."""
    return IssueService.get_all_issues()

@router.post(
    "",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Report a road issue",
    description="Validate incoming report, assign a unique backend ID, and record the issue."
)
def create_issue(issue_in: IssueCreate):
    """Create a new road issue report."""
    created_issue = IssueService.create_issue(issue_in)
    return created_issue

@router.get(
    "/{issue_id}",
    response_model=IssueResponse,
    summary="Get road issue by ID",
    description="Fetch full details for a specific road issue."
)
def get_issue_by_id(issue_id: str):
    """Retrieve an issue by ID or return 404 if not found."""
    issue = IssueService.get_issue_by_id(issue_id)
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Issue with ID '{issue_id}' not found."
        )
    return issue
