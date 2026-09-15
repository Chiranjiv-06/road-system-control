"""
Demo Users Seeding Script for Phase 11
--------------------------------------
Seeds standard command-center operator accounts for all 4 roles:
- admin (ADMIN)
- traffic_op (TRAFFIC_OPERATOR)
- emergency_op (EMERGENCY_OPERATOR)
- road_insp (ROAD_INSPECTOR)
"""

import sys
from database import SessionLocal, engine, Base
import models.user
from services.auth_service import AuthService

def main():
    print("Ensuring tables are created in PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        created = AuthService.ensure_default_users(db)
        print(f"User seeding complete: {created} new accounts provisioned.")
        users = AuthService.list_users(db)
        print("\nRegistered Operators in Database:")
        print(f"{'ID':<4} {'Username':<15} {'Role':<20} {'Active':<8} {'Email'}")
        print("-" * 65)
        for u in users:
            print(f"{u.id:<4} {u.username:<15} {u.role:<20} {str(u.is_active):<8} {u.email}")
    except Exception as e:
        print(f"Error seeding users: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    main()
