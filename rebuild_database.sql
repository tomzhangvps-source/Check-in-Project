-- 完整重建数据库 - 员工打卡系统
-- 警告：这将删除所有现有数据！适用于开发阶段
-- 在 Supabase SQL Editor 中执行此脚本

-- ========================================
-- 删除现有表（按依赖顺序）
-- ========================================
DROP TABLE IF EXISTS check_ins CASCADE;
DROP TABLE IF EXISTS time_rules CASCADE;
DROP TABLE IF EXISTS action_types CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- ========================================
-- 1. 创建用户表
-- ========================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. 创建打卡类型表
-- ========================================
CREATE TABLE action_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    button_text VARCHAR(50) NOT NULL,
    button_color VARCHAR(20) NOT NULL,
    display_order INT DEFAULT 0,
    action_role INT NOT NULL,  -- 1:上班, 2:下班, 3:临时事件, 4:回座
    requires_pair BOOLEAN DEFAULT FALSE,
    pair_action_id INT REFERENCES action_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 3. 创建时间规则表（正确的结构）
-- ========================================
CREATE TABLE time_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    action_type_id INT REFERENCES action_types(id) ON DELETE CASCADE,
    expected_start_time TIME,           -- 可选，仅用于主进程（上班/下班）
    expected_end_time TIME,             -- 可选，仅用于主进程（上班/下班）
    max_duration_minutes INT,           -- 可选，仅用于临时事件（上厕所/午餐等）
    timezone VARCHAR(50) DEFAULT 'Asia/Phnom_Penh',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 4. 创建打卡记录表
-- ========================================
CREATE TABLE check_ins (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action_type_id INT REFERENCES action_types(id),
    check_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ongoing',  -- ongoing, completed, late
    pair_check_in_id INT REFERENCES check_ins(id),
    duration_minutes INT,
    note TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    is_early_leave BOOLEAN DEFAULT FALSE,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 5. 创建系统配置表
-- ========================================
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_desc TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 6. 插入默认打卡类型
-- ========================================
INSERT INTO action_types (name, button_text, button_color, display_order, action_role, requires_pair) VALUES
('clock_in', '上班', '#4CAF50', 1, 1, TRUE),
('clock_out', '下班', '#F44336', 2, 2, FALSE),
('lunch', '午餐', '#FF9800', 10, 3, TRUE),
('meeting', '开会', '#9C27B0', 11, 3, TRUE),
('restroom', '上厕所', '#03A9F4', 12, 3, TRUE),
('back_to_seat', '回座', '#607D8B', 100, 4, FALSE);

-- ========================================
-- 7. 更新配对关系
-- ========================================
UPDATE action_types 
SET pair_action_id = (SELECT id FROM action_types WHERE name='clock_out') 
WHERE name='clock_in';

UPDATE action_types 
SET pair_action_id = (SELECT id FROM action_types WHERE name='back_to_seat') 
WHERE name IN ('lunch', 'meeting', 'restroom');

-- ========================================
-- 8. 插入默认时间规则
-- ========================================
-- 上班规则（主进程）
INSERT INTO time_rules (rule_name, action_type_id, expected_start_time, expected_end_time) 
VALUES (
    '上班时间', 
    (SELECT id FROM action_types WHERE name='clock_in'), 
    '09:00:00', 
    '09:15:00'
);

-- 下班规则（主进程）
INSERT INTO time_rules (rule_name, action_type_id, expected_start_time, expected_end_time) 
VALUES (
    '下班时间', 
    (SELECT id FROM action_types WHERE name='clock_out'), 
    '18:00:00', 
    '19:00:00'
);

-- 午餐规则（临时事件）
INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes) 
VALUES (
    '午餐时长限制', 
    (SELECT id FROM action_types WHERE name='lunch'), 
    60
);

-- 会议规则（临时事件）
INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes) 
VALUES (
    '会议时长限制', 
    (SELECT id FROM action_types WHERE name='meeting'), 
    120
);

-- 上厕所规则（临时事件）
INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes) 
VALUES (
    '上厕所时长限制', 
    (SELECT id FROM action_types WHERE name='restroom'), 
    15
);

-- ========================================
-- 9. 创建默认管理员账号
-- ========================================
-- 用户名: admin, 密码: admin123 (SHA256哈希)
INSERT INTO users (username, password_hash, full_name, is_admin) VALUES
('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '系统管理员', TRUE);

-- ========================================
-- 10. 插入系统配置
-- ========================================
INSERT INTO system_config (config_key, config_value, config_desc) VALUES
('company_timezone', 'Asia/Phnom_Penh', '公司时区设置'),
('app_version', '1.0.0', '当前应用版本号');

-- ========================================
-- 11. 创建索引
-- ========================================
CREATE INDEX idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX idx_check_ins_check_time ON check_ins(check_time);
CREATE INDEX idx_check_ins_status ON check_ins(status);
CREATE INDEX idx_check_ins_is_late ON check_ins(is_late);
CREATE INDEX idx_time_rules_action_type ON time_rules(action_type_id);
CREATE INDEX idx_action_types_display_order ON action_types(display_order);

-- ========================================
-- 12. 刷新 schema cache（重要！）
-- ========================================
NOTIFY pgrst, 'reload schema';

-- ========================================
-- 13. 验证表结构
-- ========================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('users', 'action_types', 'time_rules', 'check_ins', 'system_config')
ORDER BY table_name, ordinal_position;

-- ========================================
-- 完成！
-- ========================================
SELECT 
    'users' as table_name, COUNT(*) as record_count FROM users
UNION ALL
SELECT 'action_types', COUNT(*) FROM action_types
UNION ALL
SELECT 'time_rules', COUNT(*) FROM time_rules
UNION ALL
SELECT 'check_ins', COUNT(*) FROM check_ins
UNION ALL
SELECT 'system_config', COUNT(*) FROM system_config;
