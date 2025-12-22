-- 为"上厕所"添加时间规则
-- 解决"上厕所"没有记录时长的问题

-- 插入上厕所的时间规则（最大15分钟，12分钟警告）
INSERT INTO time_rules (rule_name, action_type_id, max_duration_minutes) 
VALUES (
    '上厕所时长限制', 
    (SELECT id FROM action_types WHERE name='restroom'), 
    15
)
ON CONFLICT DO NOTHING;

-- 验证插入结果
SELECT 
    tr.id,
    tr.rule_name,
    at.name as action_type_name,
    tr.max_duration_minutes
FROM time_rules tr
JOIN action_types at ON tr.action_type_id = at.id
WHERE at.name = 'restroom';
