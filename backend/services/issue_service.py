"""
Issue Service Layer
-------------------
Handles storage and business logic for road issues.
Temporary Phase 3 storage. This will be replaced by PostgreSQL in Phase 4.
"""
from typing import List, Optional
from datetime import datetime, timezone
from schemas.issue import IssueCreate

# In-memory storage list for Phase 3
# Temporary Phase 3 storage. This will be replaced by PostgreSQL in Phase 4.
_issues_db: List[dict] = [
    {
        "id": "ISS-0001",
        "issueType": "Traffic Signal Failure",
        "description": "Traffic signals stuck on red at Sitabuldi intersection causing heavy congestion.",
        "location": "Sitabuldi Interchange",
        "area": "Sitabuldi",
        "severity": "Critical",
        "reportedAt": "2026-09-10T14:30:00Z",
        "status": "Reported"
    },
    {
        "id": "ISS-0002",
        "issueType": "Pothole",
        "description": "Large deep pothole on right lane posing danger to two-wheelers.",
        "location": "Wardha Road near Metro Pillar 42",
        "area": "Wardha Road",
        "severity": "High",
        "reportedAt": "2026-09-10T14:45:00Z",
        "status": "Reported"
    },
    {
        "id": "ISS-0003",
        "issueType": "Waterlogging",
        "description": "Rainwater accumulation across two lanes near underpass.",
        "location": "Manish Nagar Subway",
        "area": "Manish Nagar",
        "severity": "Medium",
        "reportedAt": "2026-09-10T13:50:00Z",
        "status": "Reported"
    }
]

_next_id_counter = 4

class IssueService:
    @staticmethod
    def get_all_issues() -> List[dict]:
        """Return all road issues, newest first."""
        return list(reversed(_issues_db))

    @staticmethod
    def get_issue_by_id(issue_id: str) -> Optional[dict]:
        """Find an issue by its unique ID."""
        for issue in _issues_db:
            if issue["id"].lower() == issue_id.lower():
                return issue
        return None

    @staticmethod
    def create_issue(issue_in: IssueCreate) -> dict:
        """Create and store a new road issue with backend-generated ID."""
        global _next_id_counter

        issue_id = f"ISS-{_next_id_counter:04d}"
        _next_id_counter += 1

        # Use client timestamp or fallback to current UTC
        reported_time = issue_in.reportedAt or datetime.now(timezone.utc).isoformat()

        new_issue = {
            "id": issue_id,
            "issueType": issue_in.issueType,
            "description": issue_in.description,
            "location": issue_in.location,
            "area": issue_in.area or issue_in.location,
            "severity": issue_in.severity,
            "reportedAt": reported_time,
            "status": "Reported"
        }

        _issues_db.append(new_issue)
        return new_issue
