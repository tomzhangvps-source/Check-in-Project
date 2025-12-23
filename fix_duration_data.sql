-- 时长数据修复脚本
-- 用于修复所有历史打卡记录的时长字段
-- 执行时间: 2025年12月23日

-- 说明:
-- 此脚本会计算并更新所有有配对关系但时长为空的打卡记录
-- 只更新有 pair_check_in_id 但 duration_minutes 为 NULL 的记录

BEGIN;

-- 步骤1: 更新所有结束记录（有pair_check_in_id的记录）的时长
-- 这包括下班、回座等结束类型的打卡
UPDATE check_ins c_end
SET duration_minutes = ROUND(EXTRACT(EPOCH FROM (c_end.check_time - c_start.check_time)) / 60)::INTEGER
FROM check_ins c_start
WHERE c_end.pair_check_in_id = c_start.id
  AND c_end.duration_minutes IS NULL
  AND c_end.check_time > c_start.check_time;  -- 确保结束时间在开始时间之后

-- 步骤2: 更新所有开始记录的时长
-- 通过结束记录的pair_check_in_id反向查找开始记录
UPDATE check_ins c_start
SET duration_minutes = ROUND(EXTRACT(EPOCH FROM (c_end.check_time - c_start.check_time)) / 60)::INTEGER
FROM check_ins c_end
WHERE c_end.pair_check_in_id = c_start.id
  AND c_start.duration_minutes IS NULL
  AND c_end.check_time > c_start.check_time;

-- 查看更新结果统计
SELECT 
  '修复完成' as 状态,
  COUNT(*) as 总记录数,
  COUNT(duration_minutes) as 有时长记录数,
  COUNT(*) - COUNT(duration_minutes) as 无时长记录数,
  ROUND(COUNT(duration_minutes)::NUMERIC / COUNT(*)::NUMERIC * 100, 2) || '%' as 完整度
FROM check_ins;

-- 查看最近10条记录的时长情况
SELECT 
  c.id,
  u.full_name as 员工,
  at.button_text as 类型,
  c.check_time as 打卡时间,
  c.duration_minutes as 时长分钟,
  c.status as 状态,
  c.pair_check_in_id as 配对ID
FROM check_ins c
JOIN users u ON c.user_id = u.id
JOIN action_types at ON c.action_type_id = at.id
ORDER BY c.check_time DESC
LIMIT 10;

COMMIT;

-- 验证异常数据（可选）
-- 查找配对关系中时间倒序的异常记录
SELECT 
  c_start.id as 开始ID,
  c_end.id as 结束ID,
  c_start.check_time as 开始时间,
  c_end.check_time as 结束时间,
  '时间顺序异常' as 问题
FROM check_ins c_start
JOIN check_ins c_end ON c_end.pair_check_in_id = c_start.id
WHERE c_end.check_time < c_start.check_time;
