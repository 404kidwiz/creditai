-- Fix the profile creation trigger to handle errors properly
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert profile with better error handling
    INSERT INTO profiles (id, full_name, phone, subscription_tier, subscription_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        NEW.raw_user_meta_data->>'phone',
        'free',
        'active'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Create initial user progress only if profile was created successfully
    INSERT INTO user_progress (user_id, points, level, achievements, streak_days)
    VALUES (NEW.id, 0, 1, '[]'::jsonb, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ language 'plpgsql';