import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OnboardingProfile = {
  business_type: string | null;
  primary_goal: string | null;
  business_name: string | null;
  service_area: string | null;
  industry: string | null;
  onboarded_at: string | null;
};

export const getOnboardingProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingProfile> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "business_type, primary_goal, business_name, service_area, industry, onboarded_at",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return {
      business_type: data?.business_type ?? null,
      primary_goal: data?.primary_goal ?? null,
      business_name: data?.business_name ?? null,
      service_area: data?.service_area ?? null,
      industry: data?.industry ?? null,
      onboarded_at: data?.onboarded_at ?? null,
    };
  });

export type SaveOnboardingInput = {
  business_type: string;
  primary_goal: string;
  business_name: string;
  service_area: string;
  industry: string;
};

export const saveOnboardingProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveOnboardingInput) => {
    const trim = (s: unknown) =>
      typeof s === "string" ? s.trim().slice(0, 200) : "";
    return {
      business_type: trim(input.business_type),
      primary_goal: trim(input.primary_goal),
      business_name: trim(input.business_name),
      service_area: trim(input.service_area),
      industry: trim(input.industry),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({
        business_type: data.business_type || null,
        primary_goal: data.primary_goal || null,
        business_name: data.business_name || null,
        service_area: data.service_area || null,
        industry: data.industry || null,
        onboarded_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true as const };
  });

export const resetOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ onboarded_at: null })
      .eq("user_id", userId);
    if (error) throw error;
    return { ok: true as const };
  });
