import { createClient } from "@/lib/supabase/client";
import { Profile, ProfileUpdate, UserRole } from "@/types/database";

export interface UserFilters {
  role?: UserRole;
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
  type CouponUsed = { used: boolean };

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
    supabase.from("coupons").select("used").eq("customer_id", userId),
  ]);

  const receipts = (receiptsResult.data || []) as ReceiptAmount[];
  const coupons = (couponsResult.data || []) as CouponUsed[];

  const totalReceipts = receipts.length;
  const totalSpent = receipts.reduce((sum, r) => sum + r.amount, 0);
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => !c.used).length;

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
  totalClients: number;
  totalEmployees: number;
  totalEstablishments: number;
  totalAdmins: number;
  newUsersThisMonth: number;
}> {
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [allUsersResult, clientsResult, employeesResult, establishmentsResult, adminsResult, newUsersResult] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "client"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "employee"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "establishment"),
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
    totalClients: clientsResult.count || 0,
    totalEmployees: employeesResult.count || 0,
    totalEstablishments: establishmentsResult.count || 0,
    totalAdmins: adminsResult.count || 0,
    newUsersThisMonth: newUsersResult.count || 0,
  };
}

export async function updateUser(
  userId: string,
  data: ProfileUpdate
): Promise<Profile> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: updated, error } = await (supabase as any)
    .from("profiles")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating user:", error);
    throw error;
  }

  return updated as Profile;
}
