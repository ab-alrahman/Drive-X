// Item 6: 1:1 chat between a customer and a seller (vendor) about a specific car.
// Platform Admin gets read-only oversight of every thread (handled in the service
// layer, not here). Messages are delivered immediately - no approval step.
exports.up = (pgm) => {
  pgm.sql(`
CREATE TABLE IF NOT EXISTS chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (car_id, customer_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'VENDOR')),
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_threads_customer ON chat_threads (customer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_threads_vendor ON chat_threads (vendor_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages (thread_id, created_at);
`);
};

exports.down = (pgm) => {
  pgm.sql(`
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_threads;
`);
};
