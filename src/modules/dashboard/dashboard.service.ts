import { query } from '../../config/db';

// vendorScopeId undefined = Platform Admin viewing platform-wide totals; a vendor's own
// OWNER/STAFF always pass their vendor_id so every number here reflects only their business.
export async function summary(vendorScopeId?: string) {
  const carVendorFilter = vendorScopeId ? `AND vendor_id = $1` : '';
  const leadVendorFilter = vendorScopeId ? `AND car_id IN (SELECT id FROM cars WHERE vendor_id = $1)` : '';
  const dealVendorFilter = vendorScopeId ? `AND car_id IN (SELECT id FROM cars WHERE vendor_id = $1)` : '';
  const params = vendorScopeId ? [vendorScopeId] : [];

  const [result, recentLeads, recentCars, leadsByStatus, dealsThisMonth, commissionByMonth] = await Promise.all([
    query<{
      total_cars: string;
      available_cars: string;
      active_leads: string;
      closed_deals: string;
      monthly_commission: string | null;
    }>(
      `SELECT
      (SELECT COUNT(*) FROM cars WHERE deleted_at IS NULL ${carVendorFilter}) AS total_cars,
      (SELECT COUNT(*) FROM cars WHERE deleted_at IS NULL AND status = 'AVAILABLE' ${carVendorFilter}) AS available_cars,
      (SELECT COUNT(*) FROM leads WHERE status NOT IN ('CLOSED', 'REJECTED') ${leadVendorFilter}) AS active_leads,
      (SELECT COUNT(*) FROM deals WHERE TRUE ${dealVendorFilter}) AS closed_deals,
      (SELECT COALESCE(SUM(commission_amount), 0) FROM deals WHERE created_at >= date_trunc('month', NOW()) ${dealVendorFilter}) AS monthly_commission`,
      params
    ),
    query(
      `SELECT id, car_id, intent, status, full_name, phone, created_at FROM leads
       WHERE TRUE ${leadVendorFilter} ORDER BY created_at DESC LIMIT 5`,
      params
    ),
    query(
      `SELECT id, brand, model, year, status, created_at FROM cars
       WHERE deleted_at IS NULL ${carVendorFilter} ORDER BY created_at DESC LIMIT 5`,
      params
    ),
    query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) FROM leads WHERE TRUE ${leadVendorFilter} GROUP BY status ORDER BY status`,
      params
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) FROM deals WHERE created_at >= date_trunc('month', NOW()) ${dealVendorFilter}`,
      params
    ),
    query<{ month: string; amount: string }>(
      `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month,
        COALESCE(SUM(commission_amount), 0) AS amount
       FROM deals
       WHERE created_at >= date_trunc('month', NOW()) - INTERVAL '11 months' ${dealVendorFilter}
       GROUP BY date_trunc('month', created_at)
       ORDER BY date_trunc('month', created_at)`,
      params
    )
  ]);
  const row = result.rows[0];
  const totalLeads = await query<{ count: string }>(`SELECT COUNT(*) FROM leads WHERE TRUE ${leadVendorFilter}`, params);
  const leadCount = Number(totalLeads.rows[0].count);
  const closedDeals = Number(row.closed_deals);

  return {
    totalCars: Number(row.total_cars),
    availableCars: Number(row.available_cars),
    activeLeads: Number(row.active_leads),
    closedDeals,
    monthlyCommission: { amount: Number(row.monthly_commission ?? 0), currency: 'USD' },
    conversionRate: leadCount ? closedDeals / leadCount : 0,
    recentLeads: recentLeads.rows.map((lead: any) => ({
      id: lead.id,
      carId: lead.car_id,
      intent: lead.intent,
      status: lead.status,
      fullName: lead.full_name,
      phone: lead.phone,
      createdAt: lead.created_at
    })),
    recentCars: recentCars.rows.map((car: any) => ({
      id: car.id,
      brand: car.brand,
      model: car.model,
      year: car.year,
      status: car.status,
      createdAt: car.created_at
    })),
    leadsByStatus: Object.fromEntries(leadsByStatus.rows.map((item) => [item.status, Number(item.count)])),
    dealsThisMonth: Number(dealsThisMonth.rows[0]?.count ?? 0),
    commissionByMonth: commissionByMonth.rows.map((item) => ({
      month: item.month,
      amount: Number(item.amount),
      currency: 'USD'
    }))
  };
}
