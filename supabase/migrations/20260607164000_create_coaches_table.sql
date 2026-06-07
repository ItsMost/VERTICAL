-- Create lab_coaches table
CREATE TABLE IF NOT EXISTS lab_coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add coach_id to lab_players table with foreign key constraint referencing lab_coaches(id)
ALTER TABLE lab_players 
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES lab_coaches(id);

-- Seed default coach
INSERT INTO lab_coaches (id, full_name)
VALUES ('d3b07384-d113-4956-a5db-630d7830be1e', 'Bypassed Coach')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
