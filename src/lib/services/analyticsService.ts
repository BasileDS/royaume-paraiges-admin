import { createClient } from "@/lib/supabase/client";

export interface CouponStats {
  totalCoupons: number;
  activeCoupons: number;
  usedCoupons: number;
  expiredCoupons: number;
  totalValueDistributed: number;
  totalValueUsed: number;
  usageRate: number;
  expirationRate: number;
}

export interface DistributionStats {
  date: string;
  count: number;
  type: string;
}

export interface DailyCashback {
  date: string;
  credited: number;
  spent: number;
}

export async function getCouponStats(): Promise<CouponStats> {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_coupon_stats");

  if (error) throw error;
  return data as CouponStats;
}

export async function getDistributionsByPeriod(
  startDate: string,
  endDate: string
): Promise<DistributionStats[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coupon_distribution_logs")
    .select("distributed_at, distribution_type")
    .gte("distributed_at", startDate)
    .lte("distributed_at", endDate)
    .order("distributed_at");

  if (error) throw error;

  type LogEntry = { distributed_at: string; distribution_type: string };

  // Group by date and type
  const grouped = ((data || []) as LogEntry[]).reduce((acc, log) => {
    const date = log.distributed_at.split("T")[0];
    const key = `${date}-${log.distribution_type}`;

    if (!acc[key]) {
      acc[key] = { date, type: log.distribution_type, count: 0 };
    }
    acc[key].count++;

    return acc;
  }, {} as Record<string, DistributionStats>);

  return Object.values(grouped);
}

export async function getTopUsers(limit = 10) {
  const supabase = createClient();
  type CouponData = { customer_id: string; used: boolean };
  const { data: couponsData, error } = await supabase
    .from("coupons")
    .select("customer_id, used");

  if (error) throw error;

  const typedCouponsData = (couponsData || []) as CouponData[];

  if (typedCouponsData.length === 0) {
    return [];
  }

  // Get unique customer IDs
  const customerIds = Array.from(new Set(typedCouponsData.map((c) => c.customer_id)));

  // Fetch profiles separately
  type ProfileData = { id: string; first_name: string | null; last_name: string | null; email: string | null };
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", customerIds);

  const profilesMap = new Map(((profilesData || []) as ProfileData[]).map((p) => [p.id, p] as const));

  // Group by user
  const grouped = typedCouponsData.reduce(
    (acc, coupon) => {
      const key = coupon.customer_id;
      const profile = profilesMap.get(key);

      if (!acc[key]) {
        acc[key] = {
          customerId: key,
          name: profile
            ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email || "Inconnu"
            : "Inconnu",
          received: 0,
          used: 0,
        };
      }

      acc[key].received++;
      if (coupon.used) acc[key].used++;

      return acc;
    },
    {} as Record<string, { customerId: string; name: string; received: number; used: number }>
  );

  return Object.values(grouped)
    .sort((a, b) => b.received - a.received)
    .slice(0, limit);
}

export async function getDashboardStats() {
  const supabase = createClient();
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get counts for different metrics
  const [
    { count: totalActive },
    { count: usedThisWeek },
    { count: distributedThisMonth },
    { count: pendingPeriods },
  ] = await Promise.all([
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("used", false)
      .or(`expires_at.is.null,expires_at.gte.${now.toISOString()}`),
    supabase
      .from("coupons")
      .select("*", { count: "exact", head: true })
      .eq("used", true),
    supabase
      .from("coupon_distribution_logs")
      .select("*", { count: "exact", head: true })
      .gte("distributed_at", startOfMonth.toISOString()),
    supabase
      .from("period_reward_configs")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    totalActiveCoupons: totalActive || 0,
    couponsUsedThisWeek: usedThisWeek || 0,
    distributionsThisMonth: distributedThisMonth || 0,
    pendingDistributions: pendingPeriods || 0,
  };
}

/**
 * Count receipts (sales) within a date range.
 */
export async function getSalesCount(
  startDate: string,
  endDate: string
): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("receipts")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (error) throw error;
  return count || 0;
}

/**
 * Get total sales amount (in centimes) within a date range.
 */
export async function getSalesTotal(
  startDate: string,
  endDate: string
): Promise<number> {
  const supabase = createClient();
  type ReceiptAmount = { amount: number };
  const { data, error } = await supabase
    .from("receipts")
    .select("amount")
    .gte("created_at", startDate)
    .lt("created_at", endDate);

  if (error) throw error;
  return ((data || []) as ReceiptAmount[]).reduce((sum, r) => sum + (r.amount || 0), 0);
}

/**
 * Get daily cashback credited (gains) and spent (receipt_lines) within a date range.
 * Returns an array sorted by date with both values in centimes.
 */
export async function getDailyCashbackStats(
  startDate: string,
  endDate: string
): Promise<DailyCashback[]> {
  const supabase = createClient();

  type GainRow = { created_at: string; cashback_money: number | null };
  type LineRow = { created_at: string; amount: number };

  const [gainsRes, spentRes] = await Promise.all([
    supabase
      .from("gains")
      .select("created_at, cashback_money")
      .gte("created_at", startDate)
      .lt("created_at", endDate)
      .not("cashback_money", "is", null)
      .order("created_at", { ascending: true }),
    (supabase.from("receipt_lines") as any)
      .select("created_at, amount")
      .eq("payment_method", "cashback")
      .gte("created_at", startDate)
      .lt("created_at", endDate)
      .order("created_at", { ascending: true }),
  ]);

  if (gainsRes.error) throw gainsRes.error;
  if (spentRes.error) throw spentRes.error;

  const creditedByDay: Record<string, number> = {};
  for (const row of (gainsRes.data || []) as GainRow[]) {
    const date = row.created_at.split("T")[0];
    creditedByDay[date] = (creditedByDay[date] || 0) + (row.cashback_money || 0);
  }

  const spentByDay: Record<string, number> = {};
  for (const row of (spentRes.data || []) as LineRow[]) {
    const date = row.created_at.split("T")[0];
    spentByDay[date] = (spentByDay[date] || 0) + (row.amount || 0);
  }

  // Fill in all days in range
  const result: DailyCashback[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  while (current < end) {
    const dateStr = current.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      credited: creditedByDay[dateStr] || 0,
      spent: spentByDay[dateStr] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return result;
}

/**
 * Get total unspent cashback across all users.
 * Queries the user_stats materialized view (cashback_available = earned - spent).
 * Returns amount in centimes.
 */
export async function getUnspentCashbackTotal(): Promise<number> {
  const supabase = createClient();
  type StatsRow = { cashback_available: number | string | null };
  const { data, error } = await (supabase.from("user_stats") as any)
    .select("cashback_available");

  if (error) throw error;
  // user_stats columns are bigint (from SUM), PostgREST returns bigints as strings
  return ((data || []) as StatsRow[]).reduce(
    (sum, row) => sum + (Number(row.cashback_available) || 0),
    0
  );
}
