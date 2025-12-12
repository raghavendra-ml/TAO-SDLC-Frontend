-- TAO SDLC Database Schema
-- PostgreSQL 14+

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    current_phase INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Project stakeholders table
CREATE TABLE project_stakeholders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id, role)
);

-- Phases table (6 phases for complete SDLC)
CREATE TABLE phases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL,
    phase_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'not_started',
    data JSONB DEFAULT '{}',
    ai_confidence_score INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT phases_unique_phase_per_project UNIQUE(project_id, phase_number),
    CONSTRAINT valid_phase_number CHECK (phase_number BETWEEN 1 AND 6),
    CONSTRAINT valid_confidence_score CHECK (ai_confidence_score BETWEEN 0 AND 100)
);

-- Approvals table
CREATE TABLE approvals (
    id SERIAL PRIMARY KEY,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    approver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected', 'conditional'))
);

-- AI interactions table
CREATE TABLE ai_interactions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    user_query TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    confidence_score INTEGER,
    accepted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_ai_confidence CHECK (confidence_score BETWEEN 0 AND 100)
);

-- Indexes for performance
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_phases_project_id ON phases(project_id);
CREATE INDEX idx_phases_status ON phases(status);
CREATE INDEX idx_approvals_phase_id ON approvals(phase_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_project_stakeholders_project_id ON project_stakeholders(project_id);
CREATE INDEX idx_project_stakeholders_user_id ON project_stakeholders(user_id);
CREATE INDEX idx_ai_interactions_project_id ON ai_interactions(project_id);

-- Integration configurations table
CREATE TABLE integration_configs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- jira, github, confluence, slack, etc.
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Automation workflows table
CREATE TABLE automation_workflows (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    phase_id INTEGER REFERENCES phases(id) ON DELETE CASCADE,
    workflow_name VARCHAR(255) NOT NULL,
    workflow_type VARCHAR(50) NOT NULL, -- code_generation, test_generation, deployment, etc.
    trigger_event VARCHAR(100),
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tool integrations log table
CREATE TABLE integration_logs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    request_data JSONB,
    response_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sample data for testing
INSERT INTO users (email, username, full_name, role, hashed_password) VALUES
('john.doe@example.com', 'johndoe', 'John Doe', 'Product Owner', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa'), -- password: secret
('jane.smith@example.com', 'janesmith', 'Jane Smith', 'Solution Architect', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa'),
('bob.johnson@example.com', 'bobjohnson', 'Bob Johnson', 'Tech Lead', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa'),
('alice.williams@example.com', 'alicewilliams', 'Alice Williams', 'Security Architect', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa'),
('charlie.brown@example.com', 'charliebrown', 'Charlie Brown', 'QA Lead', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa'),
('david.miller@example.com', 'davidmiller', 'David Miller', 'DevOps Engineer', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7GN0Mk4aIa');

INSERT INTO projects (name, description, current_phase, status) VALUES
('E-Commerce Platform', 'Modern e-commerce platform with AI recommendations', 1, 'active'),
('Mobile Banking App', 'Secure mobile banking application', 2, 'active'),
('CRM System', 'Customer relationship management system', 3, 'active');

