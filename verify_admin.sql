-- 验证管理员账号是否存在
SELECT 
    id,
    username,
    full_name,
    is_admin,
    password_hash,
    created_at
FROM users 
WHERE username = 'admin';

-- 如果管理员不存在，创建或更新
-- 用户名: admin, 密码: admin123
INSERT INTO users (username, password_hash, full_name, is_admin) 
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '系统管理员', TRUE)
ON CONFLICT (username) 
DO UPDATE SET 
    password_hash = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    is_admin = TRUE,
    full_name = '系统管理员';

-- 再次验证
SELECT 
    id,
    username,
    full_name,
    is_admin,
    LEFT(password_hash, 20) || '...' as password_hash_preview,
    created_at
FROM users 
WHERE username = 'admin';
