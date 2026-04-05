import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { compareRanks, generateRankBefore, generateRankAfter, generateMidpointRank, getInitialRank } from "@/lib/lexoRank";
import type {
  CrmColumn,
  CrmDeal,
  CrmDealWithRelations,
  CrmLabel,
  CrmDealCommentWithProfile,
  CrmDealInsert,
  CrmDealUpdate,
} from "@/types/models";

// Re-export for backward compatibility with existing imports
export type { CrmColumn, CrmLabel, CrmDealCommentWithProfile as CrmDealComment } from "@/types/models";
export type { CrmDealWithRelations as CrmDeal } from "@/types/models";

export function useCrmColumns() {
  return useQuery({
    queryKey: ["crm-columns"],
    queryFn: async (): Promise<CrmColumn[]> => {
      const { data, error } = await supabase
        .from("crm_columns")
        .select("*")
        .order("lexo_rank");
      if (error) throw error;
      return (data ?? []).sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank));
    },
  });
}

export function useCrmDeals(archived = false) {
  return useQuery({
    queryKey: ["crm-deals", archived],
    queryFn: async (): Promise<CrmDealWithRelations[]> => {
      const query = supabase
        .from("crm_deals")
        .select("*, profiles:assigned_to(full_name), clients:client_id(id, name)")
        .eq("is_archived", archived);
      if (archived) {
        query.order("created_at", { ascending: false });
      } else {
        query.order("lexo_rank");
      }
      const { data, error } = await query;
      if (error) throw error;
      // The joined shape matches CrmDealWithRelations
      const deals = (data ?? []) as unknown as CrmDealWithRelations[];
      return archived ? deals : deals.sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank));
    },
  });
}

export function useCrmLabels() {
  return useQuery({
    queryKey: ["crm-labels"],
    queryFn: async (): Promise<CrmLabel[]> => {
      const { data, error } = await supabase.from("crm_labels").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCrmDealLabels(dealId: string | null) {
  return useQuery({
    queryKey: ["crm-deal-labels", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<CrmLabel[]> => {
      const { data, error } = await supabase
        .from("crm_deal_labels")
        .select("label_id, crm_labels(id, name, color)")
        .eq("deal_id", dealId!);
      if (error) throw error;
      return (data ?? []).map((d) => (d as any).crm_labels as CrmLabel);
    },
  });
}

export function useCrmDealComments(dealId: string | null) {
  return useQuery({
    queryKey: ["crm-deal-comments", dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<CrmDealCommentWithProfile[]> => {
      const { data, error } = await supabase
        .from("crm_deal_comments")
        .select("*, profiles:user_id(full_name)")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as CrmDealCommentWithProfile[];
    },
  });
}

export function useCrmRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("crm-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_deals" }, () => {
        qc.invalidateQueries({ queryKey: ["crm-deals"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_columns" }, () => {
        qc.invalidateQueries({ queryKey: ["crm-columns"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}

export function useCrmMutations() {
  const qc = useQueryClient();

  const updateDealRank = useMutation({
    mutationFn: async ({ id, lexo_rank, column_id }: { id: string; lexo_rank: string; column_id?: string }) => {
      const update: CrmDealUpdate = { lexo_rank, updated_at: new Date().toISOString() };
      if (column_id) update.column_id = column_id;
      const { error } = await supabase.from("crm_deals").update(update).eq("id", id);
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const updateColumnRank = useMutation({
    mutationFn: async ({ id, lexo_rank }: { id: string; lexo_rank: string }) => {
      const { error } = await supabase.from("crm_columns").update({ lexo_rank }).eq("id", id);
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const createDeal = useMutation({
    mutationFn: async (deal: CrmDealInsert) => {
      const { error } = await supabase.from("crm_deals").insert(deal);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...data }: CrmDealUpdate & { id: string }) => {
      const { error } = await supabase
        .from("crm_deals")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const createColumn = useMutation({
    mutationFn: async (col: { name: string; lexo_rank: string }) => {
      const { error } = await supabase.from("crm_columns").insert(col);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_columns").update({ name }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_columns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const archiveDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_deals")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const restoreDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_deals")
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const update: CrmDealUpdate = {
        reminder_active: active,
        reminder_trigger_date: active ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("crm_deals").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const addComment = useMutation({
    mutationFn: async ({ deal_id, user_id, content }: { deal_id: string; user_id: string; content: string }) => {
      const { error } = await supabase.from("crm_deal_comments").insert({ deal_id, user_id, content });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm-deal-comments", vars.deal_id] }),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("crm_deal_comments").update({ content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deal-comments"] }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_deal_comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deal-comments"] }),
  });

  const toggleLabel = useMutation({
    mutationFn: async ({ deal_id, label_id, attach }: { deal_id: string; label_id: string; attach: boolean }) => {
      if (attach) {
        const { error } = await supabase.from("crm_deal_labels").insert({ deal_id, label_id });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_deal_labels").delete().eq("deal_id", deal_id).eq("label_id", label_id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["crm-deal-labels", vars.deal_id] });
      qc.invalidateQueries({ queryKey: ["crm-deals"] });
    },
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      const { error } = await supabase.from("crm_labels").insert({ name, color });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-labels"] }),
  });

  return {
    updateDealRank, updateColumnRank, createDeal, updateDeal, createColumn, updateColumn, deleteColumn,
    archiveDeal, restoreDeal, toggleReminder, addComment, updateComment, deleteComment, toggleLabel, createLabel,
  };
}
