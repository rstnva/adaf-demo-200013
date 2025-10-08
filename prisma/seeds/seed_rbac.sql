-- RBAC Seed Data - Roles, Users, and API Keys for Testing

-- Insert base roles (if they don't exist)
INSERT INTO roles (id, name) VALUES 
  ('role_viewer', 'viewer'),
  ('role_analyst', 'analyst'), 
  ('role_admin', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Insert test users
INSERT INTO users (id, email, "roleId") VALUES
  ('user_admin', 'admin@adaf.example', 'role_admin'),
  ('user_analyst', 'analyst@adaf.example', 'role_analyst'),
  ('user_viewer', 'viewer@adaf.example', 'role_viewer')
ON CONFLICT (email) DO NOTHING;

-- Insert test API keys (these are hashed tokens for testing)
-- Admin key: ak_admin_test_123456789 (hashed)
INSERT INTO api_keys (id, "tokenHash", preview, "roleId", active, "createdBy", "createdAt") VALUES
  ('key_admin_test', 
   '$2b$12$rQgmGcm4ySk8yO5zL.Pm6OHBEx5d3vFVBBYqVgZ0jXwA0xSgpZZBy', 
   'ak_admin_', 
   'role_admin', 
   true, 
   'seed-data', 
   NOW())
ON CONFLICT (id) DO NOTHING;

-- Analyst key: ak_analyst_test_123456789 (hashed)  
INSERT INTO api_keys (id, "tokenHash", preview, "roleId", active, "createdBy", "createdAt") VALUES
  ('key_analyst_test',
   '$2b$12$rQgmGcm4ySk8yO5zL.Pm6OHBEx5d3vFVBBYqVgZ0jXwA0xSgpZZBy',
   'ak_analyst_',
   'role_analyst', 
   true,
   'seed-data',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- Viewer key: ak_viewer_test_123456789 (hashed)
INSERT INTO api_keys (id, "tokenHash", preview, "roleId", active, "createdBy", "createdAt") VALUES
  ('key_viewer_test',
   '$2b$12$rQgmGcm4ySk8yO5zL.Pm6OHBEx5d3vFVBBYqVgZ0jXwA0xSgpZZBy', 
   'ak_viewer_',
   'role_viewer',
   true,
   'seed-data', 
   NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify insertions
SELECT 
  'RBAC Setup Complete' AS status,
  (SELECT COUNT(*) FROM roles) AS roles_count,
  (SELECT COUNT(*) FROM users) AS users_count,
  (SELECT COUNT(*) FROM api_keys WHERE active = true) AS active_keys_count;

-- Show test keys for reference (previews only)
SELECT 
  preview || '***' AS token_preview,
  r.name AS role,
  ak."createdBy",
  ak."createdAt"
FROM api_keys ak
JOIN roles r ON ak."roleId" = r.id  
WHERE ak."createdBy" = 'seed-data'
ORDER BY r.name;