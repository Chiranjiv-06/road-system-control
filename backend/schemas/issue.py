from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal

# Allowed severity levels
SeverityType = Literal["Low", "Medium", "High", "Critical"]

# Established issue categories
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
    # Maps internal ORM snake_case 'issue_type' to API camelCase 'issueType'
    issueType: IssueCategory = Field(
        ...,
        alias="issue_type",
        serialization_alias="issueType",
        description="Category of the road issue"
    )
    description: str = Field(..., min_length=5, description="Detailed problem description")
    location: str = Field(..., min_length=2, description="Specific road or landmark reference")
    area: Optional[str] = Field(default=None, description="City sector, ward, or neighborhood")
    severity: SeverityType = Field(..., description="Urgency / hazard severity level")
    
    # Maps internal ORM snake_case 'reported_at' to API camelCase 'reportedAt'
    reportedAt: Optional[str] = Field(
        default=None,
        alias="reported_at",
        serialization_alias="reportedAt",
        description="ISO timestamp of report"
    )

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True
    )

class IssueCreate(IssueBase):
    """Schema for incoming issue creation requests."""
    pass

class IssueResponse(IssueBase):
    """Schema for issue responses returned by the API."""
    id: str = Field(..., description="Unique backend-generated issue identifier")
    status: str = Field(default="Reported", description="Current lifecycle status")
