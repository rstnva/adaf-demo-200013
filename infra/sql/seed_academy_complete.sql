-- ADAF Academy - Complete Seed Data (Checklists, Exercises, Badges, Learning Paths)
-- This continues from seed_academy_lessons.sql

-- Insert Checklists for each lesson
INSERT INTO checklists (lesson_id, title, description, items, min_completion_percentage) VALUES

((SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'KPIs & Guardrails Checklist', 'Practical exploration of the ADAF Control dashboard and guardrail systems.',
'[
  {
    "id": "explore-control-dashboard",
    "text": "Navigate to /control and identify the main KPI sections (Performance, Risk, Limits)",
    "requiresProof": false,
    "points": 5
  },
  {
    "id": "explain-nav-calculation",
    "text": "Explain how NAV is calculated for at least one active strategy",
    "requiresProof": true,
    "points": 10
  },
  {
    "id": "identify-guardrails",
    "text": "List 3 current active guardrails and their threshold values",
    "requiresProof": true,
    "points": 10
  },
  {
    "id": "review-alert-history",
    "text": "Review the last 7 days of alerts and categorize by severity (Critical/Warning/Info)",
    "requiresProof": false,
    "points": 5
  },
  {
    "id": "understand-limits",
    "text": "Document the rationale behind LTV and concentration limits for one strategy",
    "requiresProof": true,
    "points": 15
  }
]'::JSONB, 80),

((SELECT id FROM lessons WHERE code = 'core-1-research'), 'Research Workflow Checklist', 'Hands-on experience with backtesting and strategy promotion process.',
'[
  {
    "id": "locate-research-module",
    "text": "Navigate to /research and familiarize yourself with the strategy library",
    "requiresProof": false,
    "points": 5
  },
  {
    "id": "analyze-backtest-results",
    "text": "Review a completed backtest and document its key performance metrics (Sharpe, Max DD, Hit Rate)",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "understand-promotion-criteria",
    "text": "Identify which backtests meet promotion criteria vs those that don''t and explain why",
    "requiresProof": true,
    "points": 20
  },
  {
    "id": "review-opx-integration",
    "text": "Navigate to /opx and observe how promoted strategies appear in the live trading interface",
    "requiresProof": false,
    "points": 10
  },
  {
    "id": "compare-live-vs-backtest",
    "text": "For one promoted strategy, compare live performance vs backtest projections",
    "requiresProof": true,
    "points": 15
  }
]'::JSONB, 75),

((SELECT id FROM lessons WHERE code = 'core-2-reports'), 'Investment Reporting Checklist', 'Master the report generation process and key financial metrics.',
'[
  {
    "id": "explore-reports-interface",
    "text": "Navigate to /reports and review available report templates and formats",
    "requiresProof": false,
    "points": 5
  },
  {
    "id": "calculate-performance-metrics",
    "text": "Manually calculate IRR, TVPI, and DPI for a sample portfolio over a specific period",
    "requiresProof": true,
    "points": 20
  },
  {
    "id": "review-client-deliverable",
    "text": "Examine a recent client report and identify all required compliance disclosures",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "understand-por-construction",
    "text": "Document how Portfolio of Records (PoR) drives asset allocation decisions",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "validate-report-accuracy",
    "text": "Cross-check report calculations against source data for accuracy verification",
    "requiresProof": false,
    "points": 10
  }
]'::JSONB, 80),

((SELECT id FROM lessons WHERE code = 'core-3-dqp'), 'Data Quality Management Checklist', 'Practical experience with DQP monitoring and issue resolution.',
'[
  {
    "id": "navigate-dqp-dashboard",
    "text": "Access the DQP overview and identify current data quality status across all feeds",
    "requiresProof": false,
    "points": 5
  },
  {
    "id": "categorize-quality-issues",
    "text": "Review recent quality alerts and categorize them by type (Freshness, Completeness, Accuracy, Consistency)",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "understand-fallback-procedures",
    "text": "Document the fallback data sources available for each major data feed",
    "requiresProof": true,
    "points": 20
  },
  {
    "id": "analyze-quality-trends",
    "text": "Review 30-day quality trend charts and identify any recurring patterns or issues",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "practice-escalation",
    "text": "Describe the escalation procedure for a CRITICAL data quality failure",
    "requiresProof": false,
    "points": 10
  }
]'::JSONB, 75),

((SELECT id FROM lessons WHERE code = 'advanced-1-lineage'), 'Data Lineage Analysis Checklist', 'Advanced forensic analysis using lineage tracking tools.',
'[
  {
    "id": "explore-lineage-interface",
    "text": "Access the data lineage tool and navigate through a complete data flow from source to report",
    "requiresProof": false,
    "points": 10
  },
  {
    "id": "trace-calculation-lineage",
    "text": "Select a specific calculated metric and trace its complete lineage back to source data",
    "requiresProof": true,
    "points": 25
  },
  {
    "id": "perform-impact-analysis",
    "text": "For a given data source failure, identify all downstream calculations and reports affected",
    "requiresProof": true,
    "points": 25
  },
  {
    "id": "investigate-discrepancy",
    "text": "Use lineage tools to investigate a historical data discrepancy and document findings",
    "requiresProof": true,
    "points": 30
  },
  {
    "id": "document-forensic-process",
    "text": "Create a step-by-step forensic investigation procedure for future reference",
    "requiresProof": true,
    "points": 20
  }
]'::JSONB, 85),

((SELECT id FROM lessons WHERE code = 'advanced-2-ops'), 'Advanced Operations Checklist', 'Master operational controls for retention, CSP, and rate limiting.',
'[
  {
    "id": "review-retention-policies",
    "text": "Document current retention policies for each major data category and their business justification",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "analyze-csp-configuration",
    "text": "Review current CSP headers and explain how they protect against common attacks",
    "requiresProof": true,
    "points": 20
  },
  {
    "id": "monitor-rate-limit-usage",
    "text": "Analyze API rate limit usage patterns and identify any users approaching limits",
    "requiresProof": true,
    "points": 15
  },
  {
    "id": "plan-retention-execution",
    "text": "Design a retention job execution plan including validation and rollback procedures",
    "requiresProof": true,
    "points": 25
  },
  {
    "id": "test-emergency-procedures",
    "text": "Document emergency procedures for CSP bypass incidents and rate limit evasion attempts",
    "requiresProof": true,
    "points": 25
  }
]'::JSONB, 80);

-- Insert Exercises for hands-on learning
INSERT INTO exercises (lesson_id, title, description, action, action_params, verify_method, verify_params, points, required_role, environment_restriction) VALUES

((SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'Trigger Worker Process', 'Execute a worker process to calculate updated KPIs and generate alerts.', 'triggerWorker', 
'{"workerType": "kpi-calculation", "priority": "normal"}'::JSONB, 'metric', 
'{"metric": "adaf_worker_jobs_completed_total", "labels": {"job_type": "kpi-calculation"}, "min_increase": 1}'::JSONB, 15, 'viewer', NULL),

((SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'Acknowledge Alert', 'Acknowledge a system alert to demonstrate understanding of alert management.', 'ackAlert', 
'{"severity": "WARNING", "category": "guardrails"}'::JSONB, 'api', 
'{"endpoint": "/api/read/alerts", "method": "GET", "expected_field": "acknowledged_count", "min_value": 1}'::JSONB, 10, 'viewer', NULL),

((SELECT id FROM lessons WHERE code = 'core-1-research'), 'Run ETF Backtest', 'Execute a backtest for a preset ETF momentum strategy to understand research workflow.', 'runBacktest', 
'{"preset": "etf-momentum-basic", "startDate": "2023-01-01", "endDate": "2023-12-31"}'::JSONB, 'table', 
'{"table": "backtests", "condition": "status = ''completed'' AND strategy_preset = ''etf-momentum-basic''", "min_count": 1}'::JSONB, 25, 'analyst', NULL),

((SELECT id FROM lessons WHERE code = 'core-1-research'), 'Promote Strategy', 'Promote a successful backtest to live trading in the OP-X system.', 'promoteOpx', 
'{"backtest_id": "auto-select", "criteria": {"min_sharpe": 1.2, "max_drawdown": 0.15}}'::JSONB, 'api', 
'{"endpoint": "/api/opx/strategies", "method": "GET", "expected_field": "active_strategies", "min_count": 1}'::JSONB, 30, 'analyst', NULL),

((SELECT id FROM lessons WHERE code = 'core-2-reports'), 'Generate One-Pager Report', 'Create a comprehensive one-page investment report with all key metrics and compliance information.', 'generateReport', 
'{"template": "one-pager", "portfolio": "flagship", "period": "monthly"}'::JSONB, 'fileHash', 
'{"expected_hash_pattern": "report_onepager_[0-9a-f]{8}", "file_extension": "pdf"}'::JSONB, 20, 'analyst', NULL),

((SELECT id FROM lessons WHERE code = 'core-3-dqp'), 'Simulate Data Quality Issue', 'Trigger a controlled data quality issue to practice the resolution workflow.', 'triggerWorker', 
'{"workerType": "dqp-test", "action": "simulate-stale-data", "duration": 300}'::JSONB, 'metric', 
'{"metric": "adaf_dqp_alerts_total", "labels": {"severity": "WARNING"}, "min_increase": 1}'::JSONB, 15, 'analyst', 'staging'),

((SELECT id FROM lessons WHERE code = 'advanced-1-lineage'), 'Generate Lineage Report', 'Create a comprehensive data lineage report for a specific calculation chain.', 'generateReport', 
'{"template": "lineage-trace", "calculation": "strategy-alpha-nav", "depth": "full"}'::JSONB, 'fileHash', 
'{"expected_hash_pattern": "lineage_trace_[0-9a-f]{8}", "file_extension": "json"}'::JSONB, 25, 'analyst', NULL),

((SELECT id FROM lessons WHERE code = 'advanced-2-ops'), 'Execute Retention Job', 'Run a data retention job to clean up expired data according to policy.', 'retentionJob', 
'{"categories": ["logs", "temp_data"], "dry_run": true}'::JSONB, 'metric', 
'{"metric": "adaf_retention_job_completed_total", "labels": {"category": "logs"}, "min_increase": 1}'::JSONB, 20, 'admin', 'staging'),

((SELECT id FROM lessons WHERE code = 'advanced-2-ops'), 'Enforce CSP Policy', 'Toggle Content Security Policy enforcement to understand security controls.', 'cspEnforce', 
'{"mode": "report-only", "duration": 600}'::JSONB, 'metric', 
'{"metric": "adaf_csp_violations_total", "labels": {"mode": "report-only"}, "min_increase": 0}'::JSONB, 15, 'admin', 'staging');

-- Insert Badges for achievements
INSERT INTO badges (code, name, description, icon, badge_color, rule, points_required, sort_order, enabled) VALUES

('academy.kpis.master', 'KPIs Master', 'Mastered key performance indicators and risk guardrails fundamentals.', 'TrendingUp', 'blue', 
'{"type": "lessons_completed", "lessons": ["intro-1-kpis"], "min_score": 80}'::JSONB, 25, 1, true),

('academy.research.operator', 'Research Operator', 'Demonstrated proficiency in backtesting and strategy promotion workflow.', 'Search', 'green', 
'{"type": "lessons_completed", "lessons": ["core-1-research"], "min_score": 80}'::JSONB, 55, 2, true),

('academy.reports.publisher', 'Reports Publisher', 'Mastered investment reporting and client deliverable generation.', 'FileText', 'purple', 
'{"type": "lessons_completed", "lessons": ["core-2-reports"], "min_score": 80}'::JSONB, 50, 3, true),

('academy.dqp.guardian', 'Data Quality Guardian', 'Expert in data quality monitoring and pipeline management.', 'Shield', 'orange', 
'{"type": "lessons_completed", "lessons": ["core-3-dqp"], "min_score": 75}'::JSONB, 45, 4, true),

('academy.lineage.sleuth', 'Lineage Detective', 'Advanced practitioner of data lineage analysis and forensic investigation.', 'GitBranch', 'red', 
'{"type": "lessons_completed", "lessons": ["advanced-1-lineage"], "min_score": 85}'::JSONB, 110, 5, true),

('academy.ops.sentinel', 'Operations Sentinel', 'Master of advanced operational controls including retention, CSP, and rate limiting.', 'Settings', 'gray', 
'{"type": "lessons_completed", "lessons": ["advanced-2-ops"], "min_score": 85}'::JSONB, 100, 6, true),

('academy.adaf.expert', 'ADAF Expert', 'Complete mastery of all ADAF systems and operational procedures.', 'Award', 'gold', 
'{"type": "lessons_completed", "lessons": ["intro-1-kpis", "core-1-research", "core-2-reports", "core-3-dqp", "advanced-1-lineage", "advanced-2-ops"], "min_score": 80}'::JSONB, 285, 10, true),

('academy.first.steps', 'First Steps', 'Completed your first lesson in the ADAF Academy.', 'Baby', 'cyan', 
'{"type": "lessons_started", "min_count": 1}'::JSONB, 0, 0, true),

('academy.core.graduate', 'Core Graduate', 'Successfully completed all core-level curriculum.', 'GraduationCap', 'indigo', 
'{"type": "lessons_completed", "lessons": ["core-1-research", "core-2-reports", "core-3-dqp"], "min_score": 80}'::JSONB, 150, 8, true),

('academy.advanced.specialist', 'Advanced Specialist', 'Mastered advanced operational and analytical capabilities.', 'Zap', 'yellow', 
'{"type": "lessons_completed", "lessons": ["advanced-1-lineage", "advanced-2-ops"], "min_score": 85}'::JSONB, 210, 9, true);

-- Insert Learning Paths for structured curriculum
INSERT INTO learning_paths (code, name, description, lessons, estimated_hours, difficulty, enabled) VALUES

('fundamentals-30-day', '30-Day Fundamentals Track', 'Complete introduction to ADAF systems covering all essential concepts and operations in 30 days.', 
'["intro-1-kpis", "core-1-research", "core-2-reports"]'::JSONB, 20, 'intro', true),

('professional-60-day', '60-Day Professional Track', 'Comprehensive professional development including data quality management and operational procedures.', 
'["intro-1-kpis", "core-1-research", "core-2-reports", "core-3-dqp"]'::JSONB, 35, 'core', true),

('expert-90-day', '90-Day Expert Certification', 'Complete mastery track including advanced analytics, operations, and forensic capabilities.', 
'["intro-1-kpis", "core-1-research", "core-2-reports", "core-3-dqp", "advanced-1-lineage", "advanced-2-ops"]'::JSONB, 55, 'advanced', true),

('quick-start-ops', 'Operations Quick Start', 'Fast track for operations team members focusing on monitoring, quality, and system management.', 
'["intro-1-kpis", "core-3-dqp", "advanced-2-ops"]'::JSONB, 25, 'core', true),

('research-specialist', 'Research Specialist Path', 'Focused curriculum for research analysts and strategy developers.', 
'["intro-1-kpis", "core-1-research", "core-2-reports", "advanced-1-lineage"]'::JSONB, 30, 'core', true);

-- Create some sample user progress for demonstration (using generic user IDs)
INSERT INTO user_progress (user_id, lesson_id, status, completion_percentage, started_at) VALUES
('demo-user-1', (SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'in_progress', 60.0, NOW() - INTERVAL '2 days'),
('demo-user-1', (SELECT id FROM lessons WHERE code = 'core-1-research'), 'not_started', 0.0, NULL),
('demo-user-2', (SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'passed', 100.0, NOW() - INTERVAL '5 days'),
('demo-user-2', (SELECT id FROM lessons WHERE code = 'core-1-research'), 'in_progress', 45.0, NOW() - INTERVAL '3 days'),
('admin-user', (SELECT id FROM lessons WHERE code = 'intro-1-kpis'), 'passed', 100.0, NOW() - INTERVAL '10 days');

-- Award some sample badges
INSERT INTO user_badges (user_id, badge_id, awarded_at, awarded_by, notes) VALUES
('demo-user-2', (SELECT id FROM badges WHERE code = 'academy.first.steps'), NOW() - INTERVAL '5 days', 'system', 'Auto-awarded for starting first lesson'),
('demo-user-2', (SELECT id FROM badges WHERE code = 'academy.kpis.master'), NOW() - INTERVAL '4 days', 'system', 'Completed KPIs lesson with 85% score'),
('admin-user', (SELECT id FROM badges WHERE code = 'academy.first.steps'), NOW() - INTERVAL '10 days', 'system', 'Auto-awarded for starting first lesson'),
('admin-user', (SELECT id FROM badges WHERE code = 'academy.kpis.master'), NOW() - INTERVAL '9 days', 'system', 'Completed KPIs lesson with 92% score');

-- Insert sample user path progress
INSERT INTO user_path_progress (user_id, path_id, current_lesson_index, started_at) VALUES
('demo-user-1', (SELECT id FROM learning_paths WHERE code = 'fundamentals-30-day'), 0, NOW() - INTERVAL '2 days'),
('demo-user-2', (SELECT id FROM learning_paths WHERE code = 'fundamentals-30-day'), 1, NOW() - INTERVAL '5 days'),
('admin-user', (SELECT id FROM learning_paths WHERE code = 'expert-90-day'), 0, NOW() - INTERVAL '10 days');

-- Update academy stats view to include path progress
CREATE OR REPLACE VIEW academy_detailed_stats AS
SELECT 
    -- Lesson stats
    (SELECT COUNT(*) FROM lessons WHERE enabled = true) as total_lessons,
    (SELECT COUNT(*) FROM badges WHERE enabled = true) as total_badges,
    (SELECT COUNT(*) FROM learning_paths WHERE enabled = true) as total_paths,
    
    -- User engagement stats
    (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE status != 'not_started') as active_learners,
    (SELECT COUNT(*) FROM user_progress WHERE status = 'passed') as total_completions,
    (SELECT COUNT(*) FROM user_badges) as badges_awarded,
    (SELECT COUNT(DISTINCT user_id) FROM user_path_progress) as path_learners,
    
    -- Performance stats
    (SELECT AVG(completion_percentage) FROM user_progress WHERE status IN ('in_progress', 'completed', 'passed')) as avg_completion_rate,
    (SELECT AVG(quiz_score) FROM user_progress WHERE quiz_score IS NOT NULL) as avg_quiz_score,
    (SELECT COUNT(*) FROM user_progress WHERE last_activity_at > NOW() - INTERVAL '7 days') as weekly_active_learners,
    (SELECT COUNT(*) FROM user_progress WHERE last_activity_at > NOW() - INTERVAL '1 day') as daily_active_learners,
    
    -- Content distribution
    (SELECT COUNT(*) FROM lessons WHERE difficulty = 'intro') as intro_lessons,
    (SELECT COUNT(*) FROM lessons WHERE difficulty = 'core') as core_lessons,
    (SELECT COUNT(*) FROM lessons WHERE difficulty = 'advanced') as advanced_lessons;

-- Create function to automatically award badges based on rules
CREATE OR REPLACE FUNCTION auto_award_badges(p_user_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    badge_rec RECORD;
    awarded_count INTEGER := 0;
BEGIN
    -- Check each enabled badge for eligibility
    FOR badge_rec IN 
        SELECT id, code, rule FROM badges 
        WHERE enabled = true 
        AND id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = p_user_id)
    LOOP
        -- Check if user is eligible for this badge
        IF check_badge_eligibility(p_user_id, badge_rec.id) THEN
            -- Award the badge
            INSERT INTO user_badges (user_id, badge_id, awarded_by, notes)
            VALUES (p_user_id, badge_rec.id, 'system', 'Auto-awarded by eligibility check');
            
            awarded_count := awarded_count + 1;
        END IF;
    END LOOP;
    
    RETURN awarded_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;