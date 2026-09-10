from pydantic import BaseModel, Field
from typing import Optional, Literal

# Allowed severity levels
SeverityType = Literal["Low", "Medium", "High", "Critical"]

# Established issue categories from Phase 2
IssueCategory = Literal[
    "Pothole",
    "Damaged Road",
    "Traffic Signal Failure",
    "Waterlogging",
    "Accident",
    "Street Light",
    "Road Obstruction",
    "Other"
]

class IssueBase(BaseModel):
    issueType: IssueCategory = Field(..., description="Category of the road issue")
    description: str = Field(..., min_length=5, description="Detailed problem description")
    location: str = Field(..., min_length=2, description="Specific road or landmark reference")
    area: Optional[str] = Field(default=None, description="City sector, ward, or neighborhood")
    severity: SeverityType = Field(..., description="Urgency / hazard severity level")
    reportedAt: Optional[str] = Field(default=None, description="ISO timestamp of report")

class IssueCreate(IssueBase):
    """Schema for incoming issue creation requests."""
    pass

class IssueResponse(IssueBase):
    """Schema for issue responses returned by the API."""
    id: str = Field(..., description="Unique backend-generated issue identifier")
    status: str = Field(default="Reported", description="Current lifecycle status")
