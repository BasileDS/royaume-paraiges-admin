import { createClient } from "@/lib/supabase/client";
import type {
  CouponTemplate,
  CouponTemplateInsert,
  CouponTemplateUpdate,
} from "@/types/database";

export async function getTemplates() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coupon_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getTemplate(id: number): Promise<CouponTemplate | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coupon_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CouponTemplate | null;
}

export async function getActiveTemplates(): Promise<CouponTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coupon_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data || []) as CouponTemplate[];
}

export async function createTemplate(template: CouponTemplateInsert) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("coupon_templates") as any)
    .insert(template)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTemplate(id: number, template: CouponTemplateUpdate) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("coupon_templates") as any)
    .update({ ...template, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleTemplateActive(id: number, isActive: boolean) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("coupon_templates") as any)
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTemplate(id: number) {
  const supabase = createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase
    .from("coupon_templates") as any)
    .delete()
    .eq("id", id);

  if (error) throw error;
}
