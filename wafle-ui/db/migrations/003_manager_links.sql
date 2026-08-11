ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id INT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS link_status ENUM('pending','accepted') NULL;
ALTER TABLE users ADD CONSTRAINT users_manager_fk FOREIGN KEY IF NOT EXISTS (manager_id) REFERENCES users(id);

-- Nullable on purpose: feedback submitted before manager links existed has no
-- manager and stays invisible rather than being attributed to someone who never
-- received it.
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS manager_id INT NULL;
ALTER TABLE feedback ADD CONSTRAINT feedback_manager_fk FOREIGN KEY IF NOT EXISTS (manager_id) REFERENCES users(id);

-- Stamped for the same reason as feedback: the dashboard can aggregate a team's
-- mood without ever joining check-ins back to users.
ALTER TABLE mood_checkins ADD COLUMN IF NOT EXISTS manager_id INT NULL;
ALTER TABLE mood_checkins ADD CONSTRAINT mood_manager_fk FOREIGN KEY IF NOT EXISTS (manager_id) REFERENCES users(id);

-- Give the seeded accounts a working link so a fresh install has a usable pair.
UPDATE users e
   JOIN users m ON m.email = 'manager@wafle.local'
   SET e.manager_id = m.id, e.link_status = 'accepted'
 WHERE e.email = 'employee@wafle.local' AND e.manager_id IS NULL;
