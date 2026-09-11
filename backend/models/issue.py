"""
Road Issue SQLAlchemy ORM Model
-------------------------------
Represents the 'issues' table in PostgreSQL.
"""

from sqlalchemy import Column, String, Text, DateTime, func
from database import Base

class Issue(Base):
    __tablename__ = "issues"

    # Application public issue identifier: ISS-0001, ISS-0002, etc.
    id = Column(String(20), primary_key=True, index=True, nullable=False)
    
    issue_type = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String(255), nullable=False)
    area = Column(String(100), nullable=True)
    severity = Column(String(20), nullable=False)
    status = Column(String(50), nullable=False, default="Reported")
    reported_at = Column(String(50), nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<Issue id='{self.id}' type='{self.issue_type}' status='{self.status}'>"
