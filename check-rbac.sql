-- Check roles
SELECT id, name, display_name, description, tenant_id, is_system FROM roles;

-- Check permissions
SELECT id, resource, action, description FROM permissions LIMIT 20;

-- Check role permissions mapping
SELECT r.name as role_name, p.resource, p.action 
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
ORDER BY r.name, p.resource;
