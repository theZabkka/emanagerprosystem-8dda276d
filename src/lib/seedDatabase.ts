import { supabase } from "@/integrations/supabase/client";

export async function seedSupabaseDatabase() {
  const { data, error } = await supabase.functions.invoke("seed-database");

  if (error) {
    throw new Error(error.message ?? "Nieznany błąd edge function");
  }

  if (!data?.success) {
    throw new Error(data?.error ?? "Nieznany błąd zasilania");
  }

  return data;
}
