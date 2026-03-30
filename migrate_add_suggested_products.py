"""
Migration script to add suggested_products column to feedback table
Run: python migrate_add_suggested_products.py
"""

from sqlalchemy import text
from src.backend.connect_database import engine

def run_migration():
    """Add suggested_products column to feedback table"""
    with engine.connect() as conn:
        try:
            # Check if column already exists
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name='feedback' AND column_name='suggested_products'
            """))
            
            if result.fetchone():
                print("✅ Column 'suggested_products' already exists in feedback table")
                return True
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE feedback 
                ADD COLUMN suggested_products VARCHAR(500) NULL
            """))
            conn.commit()
            print("✅ Successfully added 'suggested_products' column to feedback table")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            return False

def rollback_migration():
    """Remove suggested_products column from feedback table (if needed)"""
    with engine.connect() as conn:
        try:
            conn.execute(text("""
                ALTER TABLE feedback 
                DROP COLUMN IF EXISTS suggested_products
            """))
            conn.commit()
            print("✅ Successfully removed 'suggested_products' column from feedback table")
            return True
        except Exception as e:
            print(f"❌ Rollback failed: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    print("🔄 Running database migration...")
    success = run_migration()
    if success:
        print("\n✨ Migration complete! Your database is now in sync with models.py")
    else:
        print("\n⚠️  Migration failed. Check your database connection.")
