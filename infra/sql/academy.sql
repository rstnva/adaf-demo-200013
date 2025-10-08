-- ADAF Academy Learning System - Database Schema
-- Creates tables for lessons, quizzes, exercises, progress tracking and badges

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Lessons table: core learning content
CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. "intro-1-kpis", "core-2-reports"
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('intro', 'core', 'advanced')),
    est_minutes INTEGER NOT NULL CHECK (est_minutes > 0),
    content_md TEXT NOT NULL, -- Markdown content for the lesson
    kind VARCHAR(20) NOT NULL CHECK (kind IN ('lesson', 'runbook', 'template')),
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- e.g. ['kpis', 'guardrails', 'ops']
    prerequisites TEXT[] DEFAULT ARRAY[]::TEXT[], -- lesson codes that should be completed first
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    enabled BOOLEAN DEFAULT true
);

-- Quizzes table: assessments for lessons
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::JSONB, 
    -- Format: [{"question": "What is NAV?", "choices": ["A", "B", "C"], "answerIdx": 0, "explanation": "..."}]
    pass_percentage INTEGER NOT NULL DEFAULT 80 CHECK (pass_percentage >= 0 AND pass_percentage <= 100),
    time_limit_minutes INTEGER, -- NULL = no time limit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checklists table: step-by-step validation items
CREATE TABLE checklists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    items JSONB NOT NULL DEFAULT '[]'::JSONB,
    -- Format: [{"id": "check-1", "text": "Review KPI dashboard", "requiresProof": true, "points": 5}]
    min_completion_percentage INTEGER NOT NULL DEFAULT 80 CHECK (min_completion_percentage >= 0 AND min_completion_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises table: hands-on practice activities
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN (
        'runBacktest', 'promoteOpx', 'generateReport', 
        'triggerWorker', 'ackAlert', 'retentionJob', 'cspEnforce'
    )),
    action_params JSONB DEFAULT '{}'::JSONB, -- Parameters for the action
    verify_method VARCHAR(20) NOT NULL CHECK (verify_method IN ('api', 'metric', 'table', 'fileHash')),
    verify_params JSONB NOT NULL DEFAULT '{}'::JSONB, -- Parameters for verification
    points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
    required_role VARCHAR(20) DEFAULT 'viewer', -- RBAC requirement
    environment_restriction VARCHAR(20), -- 'staging', 'production', NULL for both
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL, -- Can be user ID or API key
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'passed')),
    completion_percentage FLOAT NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    quiz_score FLOAT DEFAULT NULL CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
    total_points INTEGER DEFAULT 0 CHECK (total_points >= 0),
    checklist_state JSONB DEFAULT '{}'::JSONB, -- Format: {"itemId": {"completed": true, "proof": "url", "completedAt": "timestamp"}}
    exercise_results JSONB DEFAULT '{}'::JSONB, -- Format: {"exerciseId": {"completed": true, "points": 10, "attempts": 2}}
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, lesson_id)
);

-- Badges system for achievements
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. "academy.kpis.master"
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100), -- Lucide icon name or emoji
    badge_color VARCHAR(20) DEFAULT 'blue', -- for UI styling
    rule JSONB NOT NULL, -- Rule for awarding: {"type": "lessons_completed", "lessons": ["intro-1"], "min_score": 80}
    points_required INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User badges (awarded badges)
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    awarded_by VARCHAR(255), -- system, admin user, etc.
    notes TEXT,
    
    UNIQUE(user_id, badge_id)
);

-- Learning paths: structured sequences of lessons
CREATE TABLE learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. "30-day-fundamentals"
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    lessons JSONB NOT NULL DEFAULT '[]'::JSONB, -- Ordered array of lesson codes
    estimated_hours INTEGER,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('intro', 'core', 'advanced')),
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress on learning paths
CREATE TABLE user_path_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
    current_lesson_index INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, path_id)
);

-- Create indexes for performance
CREATE INDEX idx_lessons_code ON lessons(code);
CREATE INDEX idx_lessons_difficulty ON lessons(difficulty);
CREATE INDEX idx_lessons_kind ON lessons(kind);
CREATE INDEX idx_lessons_enabled ON lessons(enabled);
CREATE INDEX idx_lessons_tags ON lessons USING GIN(tags);

CREATE INDEX idx_quizzes_lesson_id ON quizzes(lesson_id);
CREATE INDEX idx_checklists_lesson_id ON checklists(lesson_id);
CREATE INDEX idx_exercises_lesson_id ON exercises(lesson_id);
CREATE INDEX idx_exercises_action ON exercises(action);

CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX idx_user_progress_status ON user_progress(status);
CREATE INDEX idx_user_progress_composite ON user_progress(user_id, status, last_activity_at);

CREATE INDEX idx_badges_code ON badges(code);
CREATE INDEX idx_badges_enabled ON badges(enabled);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_user_badges_awarded_at ON user_badges(awarded_at);

CREATE INDEX idx_learning_paths_code ON learning_paths(code);
CREATE INDEX idx_learning_paths_difficulty ON learning_paths(difficulty);
CREATE INDEX idx_user_path_progress_user_id ON user_path_progress(user_id);
CREATE INDEX idx_user_path_progress_path_id ON user_path_progress(path_id);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON lessons 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Academy stats view for dashboards
CREATE OR REPLACE VIEW academy_stats AS
SELECT 
    (SELECT COUNT(*) FROM lessons WHERE enabled = true) as total_lessons,
    (SELECT COUNT(*) FROM badges WHERE enabled = true) as total_badges,
    (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE status != 'not_started') as active_learners,
    (SELECT COUNT(*) FROM user_progress WHERE status = 'passed') as total_completions,
    (SELECT COUNT(*) FROM user_badges) as badges_awarded,
    (SELECT AVG(completion_percentage) FROM user_progress WHERE status IN ('in_progress', 'completed', 'passed')) as avg_completion_rate,
    (SELECT COUNT(*) FROM user_progress WHERE last_activity_at > NOW() - INTERVAL '7 days') as weekly_active_learners;

-- Function to calculate user level based on total points
CREATE OR REPLACE FUNCTION calculate_user_level(total_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- Level 1: 0-99 points
    -- Level 2: 100-299 points  
    -- Level 3: 300-599 points
    -- Level 4: 600-999 points
    -- Level 5: 1000+ points
    CASE 
        WHEN total_points < 100 THEN RETURN 1;
        WHEN total_points < 300 THEN RETURN 2;
        WHEN total_points < 600 THEN RETURN 3;
        WHEN total_points < 1000 THEN RETURN 4;
        ELSE RETURN 5;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check badge eligibility
CREATE OR REPLACE FUNCTION check_badge_eligibility(p_user_id VARCHAR, p_badge_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    badge_rule JSONB;
    rule_type VARCHAR;
    required_lessons TEXT[];
    min_score INTEGER;
    points_required INTEGER;
    user_total_points INTEGER;
    completed_lessons INTEGER;
BEGIN
    -- Get badge rule
    SELECT rule, points_required INTO badge_rule, points_required 
    FROM badges WHERE id = p_badge_id;
    
    rule_type := badge_rule->>'type';
    
    -- Check points requirement
    SELECT COALESCE(SUM(total_points), 0) INTO user_total_points 
    FROM user_progress WHERE user_id = p_user_id;
    
    IF user_total_points < COALESCE(points_required, 0) THEN
        RETURN FALSE;
    END IF;
    
    -- Check rule-specific requirements
    IF rule_type = 'lessons_completed' THEN
        required_lessons := ARRAY(SELECT jsonb_array_elements_text(badge_rule->'lessons'));
        min_score := COALESCE((badge_rule->>'min_score')::INTEGER, 80);
        
        SELECT COUNT(*) INTO completed_lessons
        FROM user_progress up
        JOIN lessons l ON l.id = up.lesson_id
        WHERE up.user_id = p_user_id 
        AND l.code = ANY(required_lessons)
        AND up.status = 'passed'
        AND COALESCE(up.quiz_score, 100) >= min_score;
        
        RETURN completed_lessons >= array_length(required_lessons, 1);
    END IF;
    
    -- Add more rule types as needed
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMIT;