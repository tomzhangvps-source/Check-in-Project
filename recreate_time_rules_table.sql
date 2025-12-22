-- 重建时间规则表（备用方案）
-- 警告：这将删除现有数据！仅在修复脚本无效时使用

-- 备份现有数据
CREATE TABLE IF NOT EXISTS time_rules_backup AS SELECT * FROM time_rules;

-- 删除旧表
DROP TABLE IF EXISTS time_rules CASCADE;

-- 重新创建表（正确的结构）
CREATE TABLE time_rules (
    id SERIAL PRIMARY KEY,
    rule_name VARCHAR(100) NOT NULL,
    action_type_id INT REFERENCES action_types(id) ON DELETE CASCADE,
    expected_start_time TIME,  -- 可选，仅用于主进程（上班/下班）
    expected_end_time TIME,    -- 可选，仅用于主进程（上班/下班）
    max_duration_minutes INT,  -- 可选，仅用于临时事件（上厕所/午餐等）
    timezone VARCHAR(50) DEFAULT 'Asia/Phnom_Penh',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_time_rules_action_type ON time_rules(action_type_id);

-- 刷新 schema cache
NOTIFY pgrst, 'reload schema';

-- 查看新表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_rules' 
ORDER BY ordinal_position;
