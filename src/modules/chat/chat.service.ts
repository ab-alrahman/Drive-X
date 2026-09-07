import { query, withTransaction } from '../../config/db';
import { forbidden, notFound } from '../../shared/errors';

type SenderType = 'CUSTOMER' | 'VENDOR';

interface ThreadViewer {
  type: SenderType | 'ADMIN';
}

function mapMessage(row: any) {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderType: row.sender_type as SenderType,
    senderId: row.sender_id,
    body: row.body,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at
  };
}

function mapThread(row: any) {
  return {
    id: row.id,
    carId: row.car_id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? undefined,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name ?? undefined,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    lastMessagePreview: row.last_message_preview ?? undefined,
    unreadCount: row.unread_count != null ? Number(row.unread_count) : 0,
    car: row.brand
      ? {
          brand: row.brand,
          model: row.model,
          year: row.year,
          imageUrl: row.primary_image ?? undefined
        }
      : undefined
  };
}

/**
 * `unreadFor` decides which side's unread counter is computed:
 *  - 'CUSTOMER' counts unread VENDOR messages, and vice-versa.
 *  - 'ADMIN' always yields 0 (oversight view, nothing to "read").
 */
function threadSelect(unreadFor: ThreadViewer['type']) {
  const unreadExpr =
    unreadFor === 'ADMIN'
      ? '0'
      : `(SELECT COUNT(*) FROM chat_messages m
           WHERE m.thread_id = ct.id
             AND m.sender_type <> '${unreadFor}'
             AND m.read_at IS NULL)`;

  return `
    SELECT ct.*,
      cu.full_name AS customer_name,
      v.name AS vendor_name,
      c.brand, c.model, c.year, ci.image_url AS primary_image,
      (SELECT body FROM chat_messages m WHERE m.thread_id = ct.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
      ${unreadExpr} AS unread_count
    FROM chat_threads ct
    JOIN customer_users cu ON cu.id = ct.customer_id
    JOIN vendors v ON v.id = ct.vendor_id
    JOIN cars c ON c.id = ct.car_id
    LEFT JOIN (
      SELECT car_id, image_url, ROW_NUMBER() OVER (PARTITION BY car_id ORDER BY is_primary DESC, position ASC) AS rn
      FROM car_images
    ) ci ON ci.car_id = c.id AND ci.rn = 1
  `;
}

export async function createOrGetThreadForCustomer(customerId: string, carId: string) {
  const thread = await withTransaction(async (client) => {
    const car = await client.query(
      `SELECT id, vendor_id FROM cars WHERE id = $1 AND deleted_at IS NULL`,
      [carId]
    );
    if (!car.rows[0]) {
      throw notFound('Car not found');
    }

    const existing = await client.query(
      `SELECT id FROM chat_threads WHERE car_id = $1 AND customer_id = $2`,
      [carId, customerId]
    );
    if (existing.rows[0]) {
      return existing.rows[0].id as string;
    }

    const inserted = await client.query(
      `INSERT INTO chat_threads (car_id, customer_id, vendor_id) VALUES ($1, $2, $3) RETURNING id`,
      [carId, customerId, car.rows[0].vendor_id]
    );
    return inserted.rows[0].id as string;
  });

  return hydrateThread(thread, 'CUSTOMER');
}

async function hydrateThread(threadId: string, unreadFor: ThreadViewer['type']) {
  const result = await query(`${threadSelect(unreadFor)} WHERE ct.id = $1`, [threadId]);
  if (!result.rows[0]) {
    throw notFound('Conversation not found');
  }
  return mapThread(result.rows[0]);
}

export async function listCustomerThreads(customerId: string) {
  const result = await query(
    `${threadSelect('CUSTOMER')} WHERE ct.customer_id = $1 ORDER BY ct.last_message_at DESC`,
    [customerId]
  );
  return result.rows.map(mapThread);
}

export async function listVendorThreads(vendorId: string) {
  const result = await query(
    `${threadSelect('VENDOR')} WHERE ct.vendor_id = $1 ORDER BY ct.last_message_at DESC`,
    [vendorId]
  );
  return result.rows.map(mapThread);
}

export async function listAllThreads() {
  const result = await query(
    `${threadSelect('ADMIN')} ORDER BY ct.last_message_at DESC`
  );
  return result.rows.map(mapThread);
}

async function loadThreadWithAccess(
  threadId: string,
  actor: { type: SenderType | 'ADMIN'; id?: string; vendorId?: string | null }
) {
  const result = await query(`SELECT * FROM chat_threads WHERE id = $1`, [threadId]);
  const row = result.rows[0];
  if (!row) {
    throw notFound('Conversation not found');
  }
  if (actor.type === 'CUSTOMER' && row.customer_id !== actor.id) {
    throw forbidden('This conversation is not yours.');
  }
  if (actor.type === 'VENDOR' && row.vendor_id !== actor.vendorId) {
    throw forbidden('This conversation belongs to another seller.');
  }
  return row;
}

export async function getThreadMessages(
  threadId: string,
  actor: { type: SenderType | 'ADMIN'; id?: string; vendorId?: string | null }
) {
  await loadThreadWithAccess(threadId, actor);

  // Reading marks the *other* side's messages as read (admins never mark anything).
  if (actor.type === 'CUSTOMER' || actor.type === 'VENDOR') {
    await query(
      `UPDATE chat_messages SET read_at = NOW()
       WHERE thread_id = $1 AND sender_type <> $2 AND read_at IS NULL`,
      [threadId, actor.type]
    );
  }

  const messages = await query(
    `SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId]
  );

  const unreadFor = actor.type;
  const thread = await hydrateThread(threadId, unreadFor);

  return { thread, messages: messages.rows.map(mapMessage) };
}

export async function postMessage(
  threadId: string,
  actor: { type: SenderType; id: string; vendorId?: string | null },
  body: string
) {
  await loadThreadWithAccess(threadId, actor);

  const inserted = await withTransaction(async (client) => {
    const message = await client.query(
      `INSERT INTO chat_messages (thread_id, sender_type, sender_id, body) VALUES ($1, $2, $3, $4) RETURNING *`,
      [threadId, actor.type, actor.id, body]
    );
    await client.query(`UPDATE chat_threads SET last_message_at = NOW() WHERE id = $1`, [threadId]);
    return message.rows[0];
  });

  return mapMessage(inserted);
}
