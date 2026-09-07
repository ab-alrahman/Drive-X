// Item 7: customers can request maintenance for ANY Drive X car and pick a
// preferred workshop from the verified network. Stores the customer's chosen
// workshop separately from assigned_partner_id (which the admin sets during triage).
exports.up = (pgm) => {
  pgm.sql(`
ALTER TABLE maintenance_requests
  ADD COLUMN IF NOT EXISTS preferred_partner_id UUID REFERENCES technicians(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_preferred_partner
  ON maintenance_requests (preferred_partner_id);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP INDEX IF EXISTS idx_maintenance_requests_preferred_partner;
ALTER TABLE maintenance_requests DROP COLUMN IF EXISTS preferred_partner_id;
`);
};
