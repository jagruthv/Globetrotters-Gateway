-- ======================================================================
-- GLOBETROTTER GATEWAY: AWS RDS CIRCUIT PASS TICKETING SYSTEM MIGRATION
-- Target: AWS PostgreSQL RDS Instance (globetrotter-db.cx2cek6kon94.ap-south-1.rds.amazonaws.com)
-- ======================================================================

-- 1. Update users table with assigned_location_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'assigned_location_id'
    ) THEN
        ALTER TABLE users ADD COLUMN assigned_location_id BIGINT REFERENCES places(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create circuit_passes table
CREATE TABLE IF NOT EXISTS circuit_passes (
    pass_id VARCHAR(32) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_circuit_pass_user ON circuit_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_circuit_pass_status ON circuit_passes(status);
CREATE INDEX IF NOT EXISTS idx_circuit_pass_expiry ON circuit_passes(valid_until);

-- 3. Create pass_locations table with unique index idx_pass_location_lookup
CREATE TABLE IF NOT EXISTS pass_locations (
    id BIGSERIAL PRIMARY KEY,
    pass_id VARCHAR(32) NOT NULL REFERENCES circuit_passes(pass_id) ON DELETE CASCADE,
    location_id BIGINT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    guest_count INT NOT NULL DEFAULT 1 CHECK (guest_count > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'UNUSED',
    redeemed_at TIMESTAMP WITH TIME ZONE NULL,
    redeemed_by_agent_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT idx_pass_location_lookup UNIQUE (pass_id, location_id)
);
CREATE INDEX IF NOT EXISTS idx_pass_loc_status ON pass_locations(status);
CREATE INDEX IF NOT EXISTS idx_pass_loc_location ON pass_locations(location_id);

-- 4. Create scan_audit_logs table
CREATE TABLE IF NOT EXISTS scan_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    pass_id VARCHAR(32) NULL,
    location_id BIGINT NOT NULL REFERENCES places(id),
    agent_id BIGINT NOT NULL REFERENCES users(id),
    result VARCHAR(32) NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_scan_audit_pass ON scan_audit_logs(pass_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_loc ON scan_audit_logs(location_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_agent ON scan_audit_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_scan_audit_time ON scan_audit_logs(scanned_at);
