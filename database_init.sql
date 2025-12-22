-- 员工打卡系统 - 数据库初始化脚本
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 创建打卡类型表
CREATE TABLE IF NOT EXISTS action_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    button_text VARCHAR(50) NOT NULL,
    button_color VARCHAR(20) NOT NULL,
    display_order INT DEFAULT 0,
    action_role INT NOT NULL,
    requires_pair BOOLEAN DEFAULT FALSE,
    pair_action_id INT REFERENCES action_types(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 创建时间规则表
CREATE TABLE IF NOT EXISTS time_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    action_type_id INT REFERENCES action_types(id) ON DELETE CASCADE,
    expected_start_time TIME,  -- 仅用于主进程（上班/下班）
    expected_end_time TIME,    -- 仅用于主进程（上班/下班）
    max_duration_minutes INT,  -- 仅用于临时事件（上厕所/午餐等），超过此时长标记为迟到
    timezone VARCHAR(50) DEFAULT 'Asia/Phnom_Penh',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 创建打卡记录表
CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action_type_id INT REFERENCES action_types(id),
    check_time TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'ongoing',
    pair_check_in_id INT REFERENCES check_ins(id),
    duration_minutes INT,
    note TEXT,
    is_late BOOLEAN DEFAULT FALSE,
    is_early_leave BOOLEAN DEFAULT FALSE,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. 创建系统配置表（可选）
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_desc TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. 插入默认打卡类型
INSERT INTO action_types (name, button_text, button_color, display_order, action_role, requires_pair) VALUES
('clock_in', '上班', '#4CAF50', 1, 1, TRUE),
('clock_out', '下班', '#F44336', 2, 2, FALSE),
('back_to_seat', '回座', '#607D8B', 100, 4, FALSE),
('lunch', '午餐', '#FF9800', 10, 3, TRUE),
('meeting', '开会', '#9C27B0', 11, 3, TRUE),
('restroom', '上厕所', '#03A9F4', 12, 3, TRUE)
ON CONFLICT (name) DO NOTHING;

-- 7. 更新配对关系
UPDATE action_types SET pair_action_id = (SELECT id FROM action_types WHERE name='clock_out') WHERE name='clock_in';
UPDATE action_types SET pair_action_id = (SELECT id FROM action_types WHERE name='back_to_seat') WHERE name IN ('lunch', 'meeting', 'restroom');

-- 8. 插入默认时间规则
INSERT INTO time_rules (rule_name, action_type_id, expected_time, allow_early_minutes, allow_late_minutes) VALUES
('上班时间规则', (SELECT id FROM action_types WHERE name='clock_in'), '09:00:00', 30, 15),
('下班时间规则', (SELECT id FROM action_types WHERE name='clock_out'), '18:00:00', 0, 0)
ON CONFLICT DO NOTHING;

INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes, warning_minutes) VALUES
('午餐时长限制', (SELECT id FROM action_types WHERE name='lunch'), 60, 48),
('会议时长限制', (SELECT id FROM action_types WHERE name='meeting'), 120, 96),
('上厕所时长限制', (SELECT id FROM action_types WHERE name='restroom'), 15, 12)
ON CONFLICT DO NOTHING;

-- 9. 插入系统配置
INSERT INTO system_config (config_key, config_value, config_desc) VALUES
('company_timezone', 'Asia/Phnom_Penh', '公司时区设置'),
('app_version', '1.0.0', '当前应用版本号')
ON CONFLICT (config_key) DO NOTHING;

-- 10. 创建索引
CREATE INDEX IF NOT EXISTS idx_check_ins_user_id ON check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_check_time ON check_ins(check_time);
CREATE INDEX IF NOT EXISTS idx_check_ins_status ON check_ins(status);
CREATE INDEX IF NOT EXISTS idx_check_ins_is_late ON check_ins(is_late);

-- 完成！
-- 现在可以开始使用系统了
-- 首个注册的用户需要手动设置为管理员:
-- UPDATE users SET is_admin = TRUE WHERE username = 'your_username';
