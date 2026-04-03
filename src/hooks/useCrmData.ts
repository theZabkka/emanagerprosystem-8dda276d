import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { compareRanks, generateRankBefore, generateRankAfter, generateMidpointRank, getInitialRank } from "@/lib/lexoRank";

export interface CrmColumn {
  id: string;
  name: string;
  lexo_rank: string;
  created_at: string | null;
}

export interface CrmDeal {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  assigned_to: string | null;
  client_id: string | null;
  priority: string;
  due_date: string | null;
  is_archived: boolean;
  reminder_active: boolean;
  reminder_trigger_date: string | null;
  lexo_rank: string;
  created_at: string | null;
  updated_at: string | null;
  profiles?: { full_name: string | null } | null;
  clients?: { id: string; name: string } | null;
  labels?: CrmLabel[];
}

export interface CrmLabel {
  id: string;
  name: string;
  color: string;
}

export interface CrmDealComment {
  id: string;
  deal_id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles?: { full_name: string | null } | null;
}

export function useCrmColumns() {
  return useQuery({
    queryKey: ["crm-columns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_columns" as any)
        .select("*")
        .order("lexo_rank");
      if (error) throw error;
      return (data as unknown as CrmColumn[]).sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank));
    },
  });
}

export function useCrmDeals(archived = false) {
  return useQuery({
    queryKey: ["crm-deals", archived],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deals" as any)
        .select("*, profiles:assigned_to(full_name), clients:client_id(id, name)")
        .eq("is_archived", archived)
        .order("lexo_rank");
      if (error) throw error;
      return (data as unknown as CrmDeal[]).sort((a, b) => compareRanks(a.lexo_rank, b.lexo_rank));
    },
  });
}

export function useCrmLabels() {
  return useQuery({
    queryKey: ["crm-labels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("crm_labels" as any).select("*").order("name");
      if (error) throw error;
      return data as unknown as CrmLabel[];
    },
  });
}

export function useCrmDealLabels(dealId: string | null) {
  return useQuery({
    queryKey: ["crm-deal-labels", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_labels" as any)
        .select("label_id, crm_labels(id, name, color)")
        .eq("deal_id", dealId!);
      if (error) throw error;
      return (data as any[]).map((d: any) => d.crm_labels as CrmLabel);
    },
  });
}

export function useCrmDealComments(dealId: string | null) {
  return useQuery({
    queryKey: ["crm-deal-comments", dealId],
    enabled: !!dealId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_deal_comments" as any)
        .select("*, profiles:user_id(full_name)")
        .eq("deal_id", dealId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as CrmDealComment[];
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
      const update: any = { lexo_rank, updated_at: new Date().toISOString() };
      if (column_id) update.column_id = column_id;
      const { error } = await supabase.from("crm_deals" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const updateColumnRank = useMutation({
    mutationFn: async ({ id, lexo_rank }: { id: string; lexo_rank: string }) => {
      const { error } = await supabase.from("crm_columns" as any).update({ lexo_rank }).eq("id", id);
      if (error) throw error;
    },
    onError: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const createDeal = useMutation({
    mutationFn: async (deal: { title: string; column_id: string; priority?: string; due_date?: string; assigned_to?: string; description?: string; lexo_rank: string; reminder_active?: boolean }) => {
      const { error } = await supabase.from("crm_deals" as any).insert(deal as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const updateDeal = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: any }) => {
      const { error } = await supabase.from("crm_deals" as any).update({ ...data, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const createColumn = useMutation({
    mutationFn: async (col: { name: string; lexo_rank: string }) => {
      const { error } = await supabase.from("crm_columns" as any).insert(col as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const updateColumn = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("crm_columns" as any).update({ name } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_columns" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-columns"] }),
  });

  const archiveDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_deals" as any).update({ is_archived: true, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const restoreDeal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_deals" as any).update({ is_archived: false, updated_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const toggleReminder = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const update: any = {
        reminder_active: active,
        reminder_trigger_date: active ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("crm_deals" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deals"] }),
  });

  const addComment = useMutation({
    mutationFn: async ({ deal_id, user_id, content }: { deal_id: string; user_id: string; content: string }) => {
      const { error } = await supabase.from("crm_deal_comments" as any).insert({ deal_id, user_id, content } as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["crm-deal-comments", vars.deal_id] }),
  });

  const updateComment = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase.from("crm_deal_comments" as any).update({ content } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deal-comments"] }),
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_deal_comments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-deal-comments"] }),
  });

  const toggleLabel = useMutation({
    mutationFn: async ({ deal_id, label_id, attach }: { deal_id: string; label_id: string; attach: boolean }) => {
      if (attach) {
        const { error } = await supabase.from("crm_deal_labels" as any).insert({ deal_id, label_id } as any);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("crm_deal_labels" as any).delete().eq("deal_id", deal_id).eq("label_id", label_id);
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
      const { error } = await supabase.from("crm_labels" as any).insert({ name, color } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-labels"] }),
  });

  return {
    updateDealRank, updateColumnRank, createDeal, updateDeal, createColumn, updateColumn, deleteColumn,
    archiveDeal, restoreDeal, toggleReminder, addComment, updateComment, deleteComment, toggleLabel, createLabel,
  };
}
