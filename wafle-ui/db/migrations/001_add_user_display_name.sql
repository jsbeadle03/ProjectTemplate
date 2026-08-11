ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(120) NOT NULL DEFAULT '';

UPDATE users SET display_name = 'Alex Morgan' WHERE email = 'employee@wafle.local' AND display_name = '';
UPDATE users SET display_name = 'Jordan Lee' WHERE email = 'manager@wafle.local' AND display_name = '';
