// Split into its own migration (separate transaction) because adding an enum value and then
// *using* it in the same transaction is a Postgres restriction on enum additions - same
// pattern as the 20260805 vendors pair.
exports.up = (pgm) => {
  pgm.sql(`
ALTER TYPE inspection_round_status ADD VALUE IF NOT EXISTS 'FLAGGED_FRAUDULENT';
`);
};

exports.down = (pgm) => {
  // Postgres cannot drop enum values; the value simply remains unused after a rollback.
  pgm.sql(`
-- no-op: ALTER TYPE ... DROP VALUE is not supported by Postgres
`);
};
