-- 修复时间规则表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 步骤 1: 查看当前表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_rules' 
ORDER BY ordinal_position;

-- 步骤 2: 添加 max_duration_minutes 列（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_rules' AND column_name = 'max_duration_minutes'
    ) THEN
        ALTER TABLE time_rules ADD COLUMN max_duration_minutes INT;
        RAISE NOTICE 'Column max_duration_minutes added successfully';
    ELSE
        RAISE NOTICE 'Column max_duration_minutes already exists';
    END IF;
END $$;

-- 步骤 3: 移除 NOT NULL 约束
DO $$ 
BEGIN
    ALTER TABLE time_rules ALTER COLUMN expected_start_time DROP NOT NULL;
    ALTER TABLE time_rules ALTER COLUMN expected_end_time DROP NOT NULL;
    RAISE NOTICE 'NOT NULL constraints removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Constraints may already be nullable';
END $$;

-- 步骤 4: 验证表结构
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'time_rules' 
ORDER BY ordinal_position;

-- 步骤 5: 刷新 schema cache (重要!)
NOTIFY pgrst, 'reload schema';
