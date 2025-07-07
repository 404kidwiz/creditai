-- Create profiles for existing users who don't have one
-- This handles cases where users existed before the profile trigger was created

INSERT INTO profiles (id, full_name, phone, subscription_tier, subscription_status)
SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
    au.raw_user_meta_data->>'phone' as phone,
    'free' as subscription_tier,
    'active' as subscription_status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
WHERE p.id IS NULL
  AND au.deleted_at IS NULL
ON CONFLICT (id) DO NOTHING;

-- Create user_progress for existing profiles that don't have progress records
INSERT INTO user_progress (user_id, points, level, achievements, streak_days)
SELECT 
    p.id,
    0 as points,
    1 as level,
    '[]'::jsonb as achievements,
    0 as streak_days
FROM profiles p
LEFT JOIN user_progress up ON p.id = up.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;