-- Migration to support four distinct test types: 'cmj', 'approach', 'rsi', 'fvp'
-- Dynamically detect and drop any existing check constraint on test_type, then apply the updated constraint.

DO $$
DECLARE
    constraint_name_var text;
BEGIN
    SELECT c.constraint_name 
    INTO constraint_name_var
    FROM information_schema.table_constraints tc 
    JOIN information_schema.constraint_column_usage c 
      ON c.constraint_name = tc.constraint_name 
    WHERE tc.table_name = 'lab_jump_measurements' 
      AND c.column_name = 'test_type' 
      AND tc.constraint_type = 'CHECK';

    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE lab_jump_measurements DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
END $$;

ALTER TABLE lab_jump_measurements 
ADD CONSTRAINT chk_lab_jump_measurements_test_type 
CHECK (test_type IN ('cmj', 'approach', 'rsi', 'fvp', 'standard'));
