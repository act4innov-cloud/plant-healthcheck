-- ============================================================================
-- PlantHealthCheck Database Schema - PostgreSQL
-- Version: 1.0
-- Date: 2026-02-05
-- ============================================================================

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: users
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'inspector',
    -- Roles: admin, manager, inspector, viewer
    department VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- TABLE: equipments
-- ============================================================================
CREATE TABLE equipments (
    id VARCHAR(20) PRIMARY KEY,
    -- Format: COMP-A-101, PUMP-B-205, etc.
    name VARCHAR(200) NOT NULL,
    type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    -- compression, pumping, transport, chemical_process, power_generation, heat_transfer, separation, storage, filtration, mixing, valves
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Location
    building VARCHAR(100) NOT NULL,
    zone VARCHAR(100) NOT NULL,
    floor VARCHAR(50),
    coordinates JSONB,
    -- {lat: 33.0875, lng: -8.5833}
    
    -- Status & Health
    status VARCHAR(30) NOT NULL DEFAULT 'operational',
    -- operational, maintenance, critical, outOfService
    health_score INTEGER CHECK (health_score >= 0 AND health_score <= 100),
    
    -- Dates
    install_date DATE,
    warranty_expiry_date DATE,
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    
    -- Maintenance
    maintenance_frequency VARCHAR(30),
    -- daily, weekly, biweekly, monthly, quarterly, semiannual, annual
    operating_hours INTEGER DEFAULT 0,
    
    -- Safety & Criticality
    criticality_level VARCHAR(20),
    -- low, medium, high, critical
    critical_gases TEXT[],
    -- {H2S, SO2, H3PO4, CO2, etc}
    safety_equipment TEXT[],
    required_ppe TEXT[],
    
    -- Specifications (flexible JSON)
    specifications JSONB,
    -- {power: "90 kW", pressure: "8 bar", flowRate: "16.5 m³/min"}
    
    -- Responsible Person
    responsible_person VARCHAR(200),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Documents & Notes
    documents TEXT[],
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_equipments_category ON equipments(category);
CREATE INDEX idx_equipments_status ON equipments(status);
CREATE INDEX idx_equipments_building ON equipments(building);
CREATE INDEX idx_equipments_zone ON equipments(zone);
CREATE INDEX idx_equipments_criticality ON equipments(criticality_level);
CREATE INDEX idx_equipments_next_maintenance ON equipments(next_maintenance_date);

-- ============================================================================
-- TABLE: checklist_templates
-- ============================================================================
CREATE TABLE checklist_templates (
    id VARCHAR(20) PRIMARY KEY,
    -- Format: TPL_COMP_001, TPL_PUMP_002
    equipment_type VARCHAR(50) NOT NULL,
    -- Match with equipments.category
    title VARCHAR(200) NOT NULL,
    description TEXT,
    version VARCHAR(10) NOT NULL DEFAULT '1.0',
    
    -- Scheduling
    frequency VARCHAR(30),
    -- monthly, biweekly, weekly, etc.
    estimated_duration INTEGER,
    -- in minutes
    
    -- Safety Requirements
    required_certifications TEXT[],
    required_ppe TEXT[],
    
    -- Checklist Structure (stored as JSON)
    sections JSONB NOT NULL,
    /*
    [
      {
        "id": "S1",
        "name": "Inspection visuelle",
        "order": 1,
        "items": [
          {
            "id": "C1",
            "order": 1,
            "check": "État des fixations",
            "description": "...",
            "type": "boolean|number|select|textarea|file",
            "mandatory": true,
            "criticalityLevel": "critical|high|medium|low",
            "unit": "bars",  // pour type=number
            "range": {"min": 6, "max": 8},  // pour type=number
            "options": [...]  // pour type=select
          }
        ]
      }
    ]
    */
    
    -- Scoring Rules
    scoring_rules JSONB,
    /*
    {
      "totalItems": 21,
      "mandatoryItems": 18,
      "passingScore": 85,
      "criticalItemsRequired": true
    }
    */
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP
);

CREATE INDEX idx_templates_equipment_type ON checklist_templates(equipment_type);
CREATE INDEX idx_templates_is_active ON checklist_templates(is_active);

-- ============================================================================
-- TABLE: checklists (completed inspections)
-- ============================================================================
CREATE TABLE checklists (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    template_id VARCHAR(20) NOT NULL REFERENCES checklist_templates(id),
    
    -- Inspector Info
    inspector_id UUID NOT NULL REFERENCES users(id),
    inspector_name VARCHAR(255),
    
    -- Dates
    scheduled_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    -- pending, in_progress, completed, cancelled
    
    -- Results
    responses JSONB NOT NULL,
    /*
    {
      "C1": {"value": true, "note": "..."},
      "C2": {"value": false, "note": "Fuite détectée"},
      "C6": {"value": 7.2, "unit": "bars"},
      "C19": {"value": "Observations diverses..."},
      "C20": {"value": "path/to/photo.jpg"}
    }
    */
    
    -- Scoring
    total_items INTEGER,
    completed_items INTEGER,
    passed_items INTEGER,
    failed_items INTEGER,
    score REAL,
    -- percentage
    final_status VARCHAR(30),
    -- conforme, à_vérifier, critique, en_attente
    
    -- Next Inspection
    next_check_date DATE,
    
    -- Attachments
    photos TEXT[],
    documents TEXT[],
    
    -- Notes
    inspector_notes TEXT,
    manager_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklists_equipment ON checklists(equipment_id);
CREATE INDEX idx_checklists_inspector ON checklists(inspector_id);
CREATE INDEX idx_checklists_status ON checklists(status);
CREATE INDEX idx_checklists_completed_at ON checklists(completed_at);
CREATE INDEX idx_checklists_final_status ON checklists(final_status);
CREATE INDEX idx_checklists_next_check ON checklists(next_check_date);

-- ============================================================================
-- TABLE: alerts
-- ============================================================================
CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) REFERENCES equipments(id) ON DELETE CASCADE,
    checklist_id INTEGER REFERENCES checklists(id),
    
    alert_type VARCHAR(50) NOT NULL,
    -- maintenance_due, critical_failure, health_score_low, inspection_overdue, safety_issue
    severity VARCHAR(20) NOT NULL,
    -- low, medium, high, critical
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'active',
    -- active, acknowledged, resolved, dismissed
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_equipment ON alerts(equipment_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(alert_type);

-- ============================================================================
-- TABLE: documents
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipment_id VARCHAR(20) REFERENCES equipments(id) ON DELETE CASCADE,
    checklist_id INTEGER REFERENCES checklists(id),
    
    document_type VARCHAR(50) NOT NULL,
    -- manual, certificate, photo, report, other
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- File Info
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    -- in bytes
    mime_type VARCHAR(100),
    
    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    allowed_roles TEXT[]
);

CREATE INDEX idx_documents_equipment ON documents(equipment_id);
CREATE INDEX idx_documents_checklist ON documents(checklist_id);
CREATE INDEX idx_documents_type ON documents(document_type);

-- ============================================================================
-- TABLE: maintenance_history
-- ============================================================================
CREATE TABLE maintenance_history (
    id SERIAL PRIMARY KEY,
    equipment_id VARCHAR(20) NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    
    maintenance_type VARCHAR(50) NOT NULL,
    -- preventive, corrective, emergency, calibration
    description TEXT NOT NULL,
    
    -- Dates
    scheduled_date DATE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    
    -- Personnel
    performed_by VARCHAR(255),
    validated_by UUID REFERENCES users(id),
    
    -- Details
    parts_replaced TEXT[],
    cost NUMERIC(10, 2),
    downtime_hours REAL,
    
    -- Status
    status VARCHAR(30) DEFAULT 'planned',
    -- planned, in_progress, completed, cancelled
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_equipment ON maintenance_history(equipment_id);
CREATE INDEX idx_maintenance_status ON maintenance_history(status);
CREATE INDEX idx_maintenance_start_date ON maintenance_history(start_date);

-- ============================================================================
-- TABLE: notifications
-- ============================================================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50) NOT NULL,
    -- inspection_due, alert_created, checklist_completed, equipment_status_changed
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related Entities
    equipment_id VARCHAR(20) REFERENCES equipments(id),
    checklist_id INTEGER REFERENCES checklists(id),
    alert_id INTEGER REFERENCES alerts(id),
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- ============================================================================
-- TABLE: audit_logs
-- ============================================================================
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    
    action VARCHAR(100) NOT NULL,
    -- equipment_created, equipment_updated, checklist_completed, etc.
    entity_type VARCHAR(50),
    -- equipment, checklist, user, etc.
    entity_id VARCHAR(100),
    
    -- Changes (before/after)
    changes JSONB,
    
    -- Request Info
    ip_address INET,
    user_agent TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipments_updated_at BEFORE UPDATE ON equipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checklists_updated_at BEFORE UPDATE ON checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON alerts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON maintenance_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VIEWS: Dashboard Statistics
-- ============================================================================
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM equipments WHERE status = 'operational') as operational_equipments,
    (SELECT COUNT(*) FROM equipments WHERE status = 'maintenance') as maintenance_equipments,
    (SELECT COUNT(*) FROM equipments WHERE status = 'critical') as critical_equipments,
    (SELECT COUNT(*) FROM equipments WHERE status = 'outOfService') as out_of_service_equipments,
    (SELECT COUNT(*) FROM equipments) as total_equipments,
    (SELECT AVG(health_score) FROM equipments WHERE health_score IS NOT NULL) as avg_health_score,
    (SELECT COUNT(*) FROM checklists WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days') as checklists_completed_month,
    (SELECT COUNT(*) FROM alerts WHERE status = 'active') as active_alerts,
    (SELECT COUNT(*) FROM equipments WHERE next_maintenance_date <= CURRENT_DATE + INTERVAL '7 days') as upcoming_maintenance_week;

-- ============================================================================
-- FUNCTIONS: Calculate Equipment Health Score
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_equipment_health_score(p_equipment_id VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER;
    v_recent_checklists_avg REAL;
    v_days_since_maintenance INTEGER;
    v_operating_hours INTEGER;
BEGIN
    -- Get average score from last 3 checklists
    SELECT AVG(score) INTO v_recent_checklists_avg
    FROM (
        SELECT score FROM checklists 
        WHERE equipment_id = p_equipment_id 
        AND status = 'completed'
        ORDER BY completed_at DESC 
        LIMIT 3
    ) recent;
    
    -- Get days since last maintenance
    SELECT EXTRACT(DAY FROM (CURRENT_DATE - last_maintenance_date)) INTO v_days_since_maintenance
    FROM equipments
    WHERE id = p_equipment_id;
    
    -- Get operating hours
    SELECT operating_hours INTO v_operating_hours
    FROM equipments
    WHERE id = p_equipment_id;
    
    -- Calculate weighted score
    v_score := COALESCE(v_recent_checklists_avg, 0)::INTEGER;
    
    -- Penalize if maintenance overdue
    IF v_days_since_maintenance > 90 THEN
        v_score := v_score - 20;
    ELSIF v_days_since_maintenance > 60 THEN
        v_score := v_score - 10;
    END IF;
    
    -- Ensure score is between 0 and 100
    v_score := GREATEST(0, LEAST(100, v_score));
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA: Insert default admin user
-- ============================================================================
INSERT INTO users (firebase_uid, email, display_name, role, department) 
VALUES 
('admin-firebase-uid', 'admin@ocp.ma', 'Administrateur OCP', 'admin', 'IT & Safety'),
('inspector-firebase-uid', 'h.alami@ocp.ma', 'Hassan Alami', 'inspector', 'Maintenance'),
('inspector-firebase-uid-2', 'f.zahra@ocp.ma', 'Fatima Zahra', 'inspector', 'Process'),
('manager-firebase-uid', 'k.elfassi@ocp.ma', 'Dr. Karim El Fassi', 'manager', 'Safety')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE equipments IS 'Équipements industriels OCP - Jorf Lasfar & Safi';
COMMENT ON TABLE checklist_templates IS 'Templates de checklists par type d équipement';
COMMENT ON TABLE checklists IS 'Inspections complétées avec résultats';
COMMENT ON TABLE alerts IS 'Alertes de maintenance et sécurité';
COMMENT ON TABLE documents IS 'Documents techniques et photos';
COMMENT ON TABLE maintenance_history IS 'Historique des interventions de maintenance';
COMMENT ON TABLE notifications IS 'Notifications utilisateurs';
COMMENT ON TABLE audit_logs IS 'Logs d audit pour traçabilité';
