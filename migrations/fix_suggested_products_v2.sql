-- Migration: Fix suggested_products placement
-- Purpose: Move suggested_products from Feedback to ChatMessage as suggested_product_ids (JSONB array)
-- Date: 2026-03-30

-- Step 1: Drop suggested_products from feedback table (if it exists)
ALTER TABLE feedback 
DROP COLUMN IF EXISTS suggested_products;

-- Step 2: Add suggested_product_ids to chat_message table (JSONB array)
ALTER TABLE chatmessage 
ADD COLUMN IF NOT EXISTS suggested_product_ids JSONB NULL;

-- Step 3: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chatmessage_suggested_products 
ON chatmessage USING GIN (suggested_product_ids);

-- Step 4: Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('feedback', 'chatmessage')
ORDER BY table_name, ordinal_position;
