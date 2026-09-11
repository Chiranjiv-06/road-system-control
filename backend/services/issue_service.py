"""
Issue Service Layer
-------------------
Handles PostgreSQL database operations and business logic for road issues
using SQLAlchemy ORM sessions.
"""

from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from models.issue import Issue
from schemas.issue import IssueCreate

class IssueService:
    @staticmethod
    def generate_next_issue_id(db: Session) -> str:
        """
        Generate a human-readable sequential issue ID in the format: ISS-0001, ISS-0002, etc.
        Safely scans existing IDs to avoid any duplicate keys.
        """
        all_ids = db.query(Issue.id).all()
        max_num = 0
        for (existing_id,) in all_ids:
            if existing_id and existing_id.startswith("ISS-"):
                try:
                    num = int(existing_id.split("-")[1])
                    if num > max_num:
                        max_num = num
                except (ValueError, IndexError):
                    continue
        return f"ISS-{max_num + 1:04d}"

    @staticmethod
    def get_all_issues(db: Session) -> List[Issue]:
        """
        Retrieve all road issues from PostgreSQL, ordered with newest issues first.
        """
        return db.query(Issue).order_by(Issue.created_at.desc(), Issue.id.desc()).all()

    @staticmethod
    def get_issue_by_id(db: Session, issue_id: str) -> Optional[Issue]:
        """
        Retrieve a single road issue by its ID (case-insensitive).
        """
        return db.query(Issue).filter(func.lower(Issue.id) == issue_id.strip().lower()).first()

    @staticmethod
    def create_issue(db: Session, issue_in: IssueCreate) -> Issue:
        """
        Create and persist a new road issue to PostgreSQL:
        1. Generates backend-controlled unique ID (e.g. ISS-0001)
        2. Sets initial status to 'Reported'
        3. Commits to PostgreSQL transaction and refreshes ORM instance
        """
        issue_id = IssueService.generate_next_issue_id(db)

        # Fallback to current UTC timestamp if not provided by client
        reported_time = issue_in.reportedAt or datetime.now(timezone.utc).isoformat()

        db_issue = Issue(
            id=issue_id,
            issue_type=issue_in.issueType,
            description=issue_in.description,
            location=issue_in.location,
            area=issue_in.area or issue_in.location,
            severity=issue_in.severity,
            status="Reported",
            reported_at=reported_time
        )

        try:
            db.add(db_issue)
            db.commit()
            db.refresh(db_issue)
            return db_issue
        except Exception:
            db.rollback()
            raise
