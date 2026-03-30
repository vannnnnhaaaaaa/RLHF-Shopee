-- Migration: Add suggested_products column to feedback table
-- Purpose: Track AI-suggested product IDs/links for admin review
-- Date: 2026-03-30

-- Add column if it doesn't exist
ALTER TABLE feedback 
ADD COLUMN IF NOT EXISTS suggested_products VARCHAR(500) NULL;

-- Optional: Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_suggested_products 
ON feedback(suggested_products);

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'feedback' AND column_name = 'suggested_products';
