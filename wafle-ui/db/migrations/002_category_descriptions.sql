ALTER TABLE categories ADD COLUMN IF NOT EXISTS description VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE categories ADD UNIQUE INDEX IF NOT EXISTS categories_name_unique (name);

UPDATE categories SET name = 'Tools & Equipment', description = 'The systems and resources you use every day.' WHERE name = 'Tools';
UPDATE categories SET name = 'Process & Workflow', description = 'How work moves from idea to done.' WHERE name = 'Process';
UPDATE categories SET name = 'Management & Communication', description = 'Clarity, support, and information sharing.' WHERE name = 'Management';
UPDATE categories SET name = 'Culture & Team', description = 'Belonging, recognition, and collaboration.' WHERE name = 'Culture';

INSERT IGNORE INTO categories (name, description, requires_response) VALUES
  ('Workload & Balance', 'Capacity, focus time, and sustainable work.', 0),
  ('Compensation & Benefits', 'Pay, benefits, and employee support.', 0);
