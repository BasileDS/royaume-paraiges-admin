import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/types/database";

export interface UserFilters {
  role?: "customer" | "admin";
  search?: string;
}

export interface UserWithStats extends Profile {
  totalReceipts?: number;
  totalSpent?: number;
  totalCoupons?: number;
  activeCoupons?: number;
}

export async function getUsers(
  filters?: UserFilters,
  limit = 20,
  offset = 0
): Promise<{ data: Profile[]; count: number }> {
  const supabase = createClient();

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters?.role) {
    query = query.eq("role", filters.role);
  }

  if (filters?.search) {
    query = query.or(
      `email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`
    );
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching users:", error);
    throw error;
  }

  return { data: data || [], count: count || 0 };
}

export async function getUser(userId: string): Promise<Profile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function getUserWithStats(userId: string): Promise<UserWithStats | null> {
  const supabase = createClient();

  type ReceiptAmount = { amount: number };
  type CouponUsed = { is_used: boolean };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileError || !profileData) {
    console.error("Error fetching user:", profileError);
    return null;
  }

  const profile = profileData as Profile;

  const [receiptsResult, couponsResult] = await Promise.all([
    supabase.from("receipts").select("amount").eq("customer_id", userId),
    supabase.from("coupons").select("is_used").eq("customer_id", userId),
  ]);

  const receipts = (receiptsResult.data || []) as ReceiptAmount[];
  const coupons = (couponsResult.data || []) as CouponUsed[];

  const totalReceipts = receipts.length;
  const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => !c.is_used).length;

  return {
    ...profile,
    totalReceipts,
    totalSpent,
    totalCoupons,
    activeCoupons,
  };
}

export async function getUserStats(): Promise<{
  totalUsers: number;
  totalCustomers: number;
  totalAdmins: number;
  newUsersThisMonth: number;
}> {
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [allUsersResult, customersResult, adminsResult, newUsersResult] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "customer"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),
    ]);

  return {
    totalUsers: allUsersResult.count || 0,
    totalCustomers: customersResult.count || 0,
    totalAdmins: adminsResult.count || 0,
    newUsersThisMonth: newUsersResult.count || 0,
  };
}
