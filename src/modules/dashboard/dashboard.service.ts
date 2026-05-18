import { query } from '../../config/db';

export async function summary() {
  const result = await query<{
    total_cars: string;
    available_cars: string;
    active_leads: string;
    closed_deals: string;
    monthly_commission: string | null;
  }>(
    `SELECT
      (SELECT COUNT(*) FROM cars WHERE deleted_at IS NULL) AS total_cars,
      (SELECT COUNT(*) FROM cars WHERE deleted_at IS NULL AND status = 'AVAILABLE') AS available_cars,
      (SELECT COUNT(*) FROM leads WHERE status NOT IN ('CLOSED', 'REJECTED')) AS active_leads,
      (SELECT COUNT(*) FROM deals) AS closed_deals,
      (SELECT COALESCE(SUM(commission_amount), 0) FROM deals WHERE created_at >= date_trunc('month', NOW())) AS monthly_commission`
  );
  const row = result.rows[0];
  const totalLeads = await query<{ count: string }>(`SELECT COUNT(*) FROM leads`);
  const leadCount = Number(totalLeads.rows[0].count);
  const closedDeals = Number(row.closed_deals);

  return {
    totalCars: Number(row.total_cars),
    availableCars: Number(row.available_cars),
    activeLeads: Number(row.active_leads),
    closedDeals,
    monthlyCommission: { amount: Number(row.monthly_commission ?? 0), currency: 'USD' },
    conversionRate: leadCount ? closedDeals / leadCount : 0
  };
}

