import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Eye, EyeOff, Copy, Plus, Trash2, Edit, ShieldCheck, Clock, User,
  KeyRound, Loader2, Share2, ChevronDown, X, Timer, Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";

interface Credential {
  id: string;
  title: string;
  username: string;
  encrypted_password: string;
  iv: string;
  auth_tag: string;
  url: string | null;
  notes: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  credential_id: string;
  user_id: string;
  action: string;
  created_at: string;
  credential_title?: string;
  user_name?: string;
  user_email?: string;
}

interface AccessGrant {
  id: string;
  credential_id: string;
  user_id: string;
  granted_by: string | null;
  expires_at: string | null;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

function VaultPage() {
  const { profile } = useAuth();
  const { currentRole } = useRole();
  const isAdmin = ["superadmin", "boss", "koordynator"].includes(currentRole);

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", username: "", password: "", url: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Revealed passwords
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Access grants state
  const [grants, setGrants] = useState<Record<string, AccessGrant[]>>({});
  const [shareOpen, setShareOpen] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [ttl, setTtl] = useState("none");
  const [granting, setGranting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // User's own grants (for non-admin view)
  const [myGrants, setMyGrants] = useState<Record<string, AccessGrant>>({});

  const fetchCredentials = useCallback(async () => {
    const { data } = await supabase
      .from("vault_credentials")
      .select("*")
      .order("created_at", { ascending: false });
    setCredentials((data as any[]) || []);
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    const { data: logs } = await supabase
      .from("vault_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!logs || logs.length === 0) { setAuditLogs([]); return; }

    const credIds = [...new Set((logs as any[]).map((l) => l.credential_id))];
    const userIds = [...new Set((logs as any[]).map((l) => l.user_id).filter(Boolean))];

    const [{ data: creds }, { data: profiles }] = await Promise.all([
      supabase.from("vault_credentials").select("id, title").in("id", credIds),
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const credMap = Object.fromEntries((creds || []).map((c: any) => [c.id, c.title]));
    const profileMap = Object.fromEntries(
      (profiles || []).map((p: any) => [p.id, { name: p.full_name, email: p.email }])
    );

    setAuditLogs(
      (logs as any[]).map((l) => ({
        ...l,
        credential_title: credMap[l.credential_id] || "(usunięte)",
        user_name: profileMap[l.user_id]?.name || "Nieznany",
        user_email: profileMap[l.user_id]?.email || "",
      }))
    );
  }, [isAdmin]);

  const fetchGrants = useCallback(async () => {
    const { data } = await supabase
      .from("vault_access_grants")
      .select("*");

    if (!data || data.length === 0) {
      setGrants({});
      setMyGrants({});
      return;
    }

    const typedData = data as any[];
    const userIds = [...new Set(typedData.map((g) => g.user_id).filter(Boolean))];
    const { data: profiles } = userIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] };

    const profileMap = Object.fromEntries(
      (profiles || []).map((p: any) => [p.id, { name: p.full_name, email: p.email }])
    );

    const enriched: AccessGrant[] = typedData.map((g) => ({
      ...g,
      user_name: profileMap[g.user_id]?.name || "Nieznany",
      user_email: profileMap[g.user_id]?.email || "",
    }));

    // Group by credential_id for admin view
    const grouped: Record<string, AccessGrant[]> = {};
    enriched.forEach((g) => {
      if (!grouped[g.credential_id]) grouped[g.credential_id] = [];
      grouped[g.credential_id].push(g);
    });
    setGrants(grouped);

    // My grants for non-admin view
    if (profile?.id) {
      const mine: Record<string, AccessGrant> = {};
      enriched.filter((g) => g.user_id === profile.id).forEach((g) => {
        mine[g.credential_id] = g;
      });
      setMyGrants(mine);
    }
  }, [profile?.id]);

  const fetchStaff = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["superadmin", "boss", "koordynator", "specjalista", "praktykant"])
      .neq("status", "inactive")
      .order("full_name");
    setStaffList((data as StaffProfile[]) || []);
  }, [isAdmin]);

  useEffect(() => {
    fetchCredentials();
    fetchAuditLogs();
    fetchGrants();
    fetchStaff();
  }, [fetchCredentials, fetchAuditLogs, fetchGrants, fetchStaff]);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.username || (!editingId && !formData.password)) {
      toast.error("Wypełnij tytuł, login i hasło");
      return;
    }
    setSaving(true);
    try {
      let record: any = {
        title: formData.title,
        username: formData.username,
        url: formData.url || null,
        notes: formData.notes || null,
      };

      if (formData.password) {
        const { data: encData, error: encErr } = await supabase.functions.invoke("vault-manager", {
          body: { action: "ENCRYPT", password: formData.password },
        });
        if (encErr || !encData?.encrypted_password) {
          toast.error("Błąd szyfrowania hasła");
          setSaving(false);
          return;
        }
        record = {
          ...record,
          encrypted_password: encData.encrypted_password,
          iv: encData.iv,
          auth_tag: encData.auth_tag,
        };
      }

      if (editingId) {
        const { error } = await supabase.from("vault_credentials").update(record).eq("id", editingId);
        if (error) throw error;
        toast.success("Zaktualizowano wpis");
      } else {
        const { error } = await supabase.from("vault_credentials").insert(record);
        if (error) throw error;
        toast.success("Dodano nowy wpis do sejfu");
      }

      setFormOpen(false);
      setEditingId(null);
      setFormData({ title: "", username: "", password: "", url: "", notes: "" });
      fetchCredentials();
    } catch (err: any) {
      toast.error(err.message || "Błąd zapisu");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("vault_credentials").delete().eq("id", deleteId);
    if (error) toast.error("Błąd usuwania");
    else { toast.success("Usunięto wpis"); fetchCredentials(); fetchGrants(); }
    setDeleteId(null);
  };

  const handleReveal = async (cred: Credential) => {
    setRevealingId(cred.id);
    try {
      const { data, error } = await supabase.functions.invoke("vault-manager", {
        body: {
          action: "DECRYPT_REVEAL",
          credential_id: cred.id,
          encrypted_password: cred.encrypted_password,
          iv: cred.iv,
          auth_tag: cred.auth_tag,
        },
      });
      if (error || !data?.password) {
        const errMsg = data?.error || "Nie udało się odszyfrować hasła";
        toast.error(errMsg);
        setRevealingId(null);
        return;
      }
      setRevealedPasswords((prev) => ({ ...prev, [cred.id]: data.password }));

      if (timersRef.current[cred.id]) clearTimeout(timersRef.current[cred.id]);
      timersRef.current[cred.id] = setTimeout(() => {
        setRevealedPasswords((prev) => {
          const next = { ...prev };
          delete next[cred.id];
          return next;
        });
      }, 10000);
    } catch {
      toast.error("Błąd odszyfrowania");
    }
    setRevealingId(null);
  };

  const handleCopy = async (cred: Credential) => {
    const pw = revealedPasswords[cred.id];
    if (!pw) return;
    try {
      await navigator.clipboard.writeText(pw);
      toast.success("Skopiowano do schowka");
      // COPY always logs for everyone (including admins)
      await supabase.functions.invoke("vault-manager", {
        body: {
          action: "COPY_TO_CLIPBOARD",
          credential_id: cred.id,
        },
      });
    } catch {
      toast.error("Nie udało się skopiować");
    }
  };

  const handleHide = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  };

  const openEdit = (cred: Credential) => {
    setEditingId(cred.id);
    setFormData({
      title: cred.title,
      username: cred.username,
      password: "",
      url: cred.url || "",
      notes: cred.notes || "",
    });
    setFormOpen(true);
  };

  // --- PAM: Grant access ---
  const handleGrantAccess = async () => {
    if (!shareOpen || !selectedStaff) return;
    setGranting(true);

    let expiresAt: string | null = null;
    if (ttl !== "none") {
      const hours = parseInt(ttl);
      const exp = new Date();
      exp.setHours(exp.getHours() + hours);
      expiresAt = exp.toISOString();
    }

    try {
      const { data, error } = await supabase.functions.invoke("vault-manager", {
        body: {
          action: "GRANT_ACCESS",
          credential_id: shareOpen,
          target_user_id: selectedStaff,
          expires_at: expiresAt,
        },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed");
      toast.success("Nadano dostęp");
      setSelectedStaff("");
      setTtl("none");
      setShareOpen(null);
      fetchGrants();
    } catch (err: any) {
      toast.error(err.message || "Błąd nadawania dostępu");
    }
    setGranting(false);
  };

  const handleRevokeAccess = async (credentialId: string, targetUserId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("vault-manager", {
        body: {
          action: "REVOKE_ACCESS",
          credential_id: credentialId,
          target_user_id: targetUserId,
        },
      });
      if (error || data?.error) throw new Error(data?.error || "Failed");
      toast.success("Odebrano dostęp");
      fetchGrants();
    } catch (err: any) {
      toast.error(err.message || "Błąd odbierania dostępu");
    }
  };

  const actionLabel = (a: string) => {
    switch (a) {
      case "REVEALED": return "Odkryto";
      case "COPIED": return "Skopiowano";
      case "GRANTED_ACCESS": return "Nadano dostęp";
      case "REVOKED_ACCESS": return "Odebrano dostęp";
      default: return a;
    }
  };

  const actionColor = (a: string) => {
    switch (a) {
      case "REVEALED": return "bg-amber-500/10 text-amber-700";
      case "COPIED": return "bg-blue-500/10 text-blue-700";
      case "GRANTED_ACCESS": return "bg-green-500/10 text-green-700";
      case "REVOKED_ACCESS": return "bg-red-500/10 text-red-700";
      default: return "";
    }
  };

  // For non-admin: filter credentials that have expired grants
  const visibleCredentials = isAdmin
    ? credentials
    : credentials.filter((c) => {
        const grant = myGrants[c.id];
        if (!grant) return false;
        if (grant.expires_at && new Date(grant.expires_at) < new Date()) return false;
        return true;
      });

  return (
    <AppLayout title="Sejf firmowy">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Firmowy Sejf
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin
                ? "Zarządzanie hasłami z kontrolą dostępu (PAM)"
                : "Twoje przydzielone dane dostępowe"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingId(null); setFormData({ title: "", username: "", password: "", url: "", notes: "" }); setFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Dodaj wpis
            </Button>
          )}
        </div>

        <Tabs defaultValue="credentials">
          <TabsList>
            <TabsTrigger value="credentials" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Hasła
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="audit" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Logi audytu
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isAdmin ? "Wszystkie dane dostępowe" : "Przydzielone hasła"}
                </CardTitle>
                <CardDescription>
                  Kliknij ikonę oka, aby odszyfrować hasło. Hasło ukryje się po 10 sekundach.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : visibleCredentials.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">
                    {isAdmin ? "Sejf jest pusty. Dodaj pierwszy wpis." : "Nie masz przydzielonych haseł."}
                  </p>
                ) : (
                  <div className="space-y-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tytuł</TableHead>
                          <TableHead>Login</TableHead>
                          <TableHead>Hasło</TableHead>
                          <TableHead>URL</TableHead>
                          {!isAdmin && <TableHead>Wygasa</TableHead>}
                          <TableHead className="text-right">Akcje</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {visibleCredentials.map((cred) => {
                          const isRevealed = !!revealedPasswords[cred.id];
                          const isRevealing = revealingId === cred.id;
                          const credGrants = grants[cred.id] || [];
                          const isExpanded = expandedRow === cred.id;
                          const myGrant = myGrants[cred.id];

                          return (
                            <Collapsible key={cred.id} open={isExpanded} onOpenChange={() => setExpandedRow(isExpanded ? null : cred.id)} asChild>
                              <>
                                <TableRow className={isExpanded ? "border-b-0" : ""}>
                                  <TableCell className="font-medium">{cred.title}</TableCell>
                                  <TableCell className="font-mono text-sm">{cred.username}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-sm min-w-[80px]">
                                        {isRevealed ? revealedPasswords[cred.id] : "••••••••"}
                                      </span>
                                      {isRevealed ? (
                                        <>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleHide(cred.id)} title="Ukryj">
                                            <EyeOff className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(cred)} title="Kopiuj">
                                            <Copy className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      ) : (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReveal(cred)} disabled={isRevealing} title="Odkryj hasło">
                                          {isRevealing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {cred.url ? (
                                      <a href={cred.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm truncate block max-w-[200px]">
                                        {cred.url}
                                      </a>
                                    ) : (
                                      <span className="text-muted-foreground text-sm">—</span>
                                    )}
                                  </TableCell>
                                  {!isAdmin && (
                                    <TableCell>
                                      {myGrant?.expires_at ? (
                                        <Badge variant="outline" className="gap-1 text-amber-700 bg-amber-500/10">
                                          <Timer className="h-3 w-3" />
                                          {formatDistanceToNow(new Date(myGrant.expires_at), { locale: pl, addSuffix: true })}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-green-700 bg-green-500/10">Bezterminowo</Badge>
                                      )}
                                    </TableCell>
                                  )}
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      {isAdmin && (
                                        <>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShareOpen(cred.id)} title="Udostępnij">
                                            <Share2 className="h-3.5 w-3.5" />
                                          </Button>
                                          <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Zarządzaj dostępami">
                                              <Users className="h-3.5 w-3.5" />
                                              {credGrants.length > 0 && (
                                                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                                                  {credGrants.length}
                                                </span>
                                              )}
                                            </Button>
                                          </CollapsibleTrigger>
                                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cred)} title="Edytuj">
                                            <Edit className="h-3.5 w-3.5" />
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(cred.id)} title="Usuń">
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                                {isAdmin && (
                                  <CollapsibleContent asChild>
                                    <tr>
                                      <td colSpan={5} className="p-0">
                                        <div className="bg-muted/50 px-6 py-3 border-b">
                                          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                                            Osoby z dostępem ({credGrants.length})
                                          </p>
                                          {credGrants.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">Nikt nie ma przyznanego dostępu.</p>
                                          ) : (
                                            <div className="space-y-2">
                                              {credGrants.map((g) => {
                                                const isExpired = g.expires_at && new Date(g.expires_at) < new Date();
                                                return (
                                                  <div key={g.id} className="flex items-center justify-between bg-background rounded-md px-3 py-2 border">
                                                    <div className="flex items-center gap-2">
                                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                      <div>
                                                        <p className="text-sm font-medium">{g.user_name}</p>
                                                        <p className="text-xs text-muted-foreground">{g.user_email}</p>
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                      {g.expires_at ? (
                                                        <Badge
                                                          variant="outline"
                                                          className={isExpired ? "text-destructive bg-destructive/10" : "text-amber-700 bg-amber-500/10"}
                                                        >
                                                          <Timer className="h-3 w-3 mr-1" />
                                                          {isExpired
                                                            ? "Wygasł"
                                                            : formatDistanceToNow(new Date(g.expires_at), { locale: pl, addSuffix: true })}
                                                        </Badge>
                                                      ) : (
                                                        <Badge variant="outline" className="text-green-700 bg-green-500/10">
                                                          Bezterminowo
                                                        </Badge>
                                                      )}
                                                      <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleRevokeAccess(g.credential_id, g.user_id)}
                                                      >
                                                        <X className="h-3.5 w-3.5 mr-1" />
                                                        Zabierz
                                                      </Button>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  </CollapsibleContent>
                                )}
                              </>
                            </Collapsible>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isAdmin && (
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Logi audytu sejfu</CardTitle>
                  <CardDescription>Pełna historia dostępu do haseł i zmian uprawnień</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLogs.length === 0 ? (
                    <p className="text-center py-12 text-muted-foreground">Brak logów audytu.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kto</TableHead>
                          <TableHead>Akcja</TableHead>
                          <TableHead>Hasło</TableHead>
                          <TableHead>Kiedy</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{log.user_name}</p>
                                  <p className="text-xs text-muted-foreground">{log.user_email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={actionColor(log.action)}>
                                {actionLabel(log.action)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-sm">{log.credential_title}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(log.created_at), "dd.MM.yyyy, HH:mm:ss", { locale: pl })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Share / Grant Access Dialog */}
        <Dialog open={!!shareOpen} onOpenChange={() => { setShareOpen(null); setSelectedStaff(""); setTtl("none"); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Udostępnij hasło
              </DialogTitle>
              <DialogDescription>
                Nadaj dostęp pracownikowi do wybranego hasła z opcjonalnym limitem czasowym.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Pracownik *</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz pracownika..." />
                  </SelectTrigger>
                   <SelectContent className="max-h-[200px] overflow-y-auto">
                    {staffList
                      .filter((s) => s.id !== profile?.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name || s.email} ({s.role})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Wygasa za:</Label>
                <Select value={ttl} onValueChange={setTtl}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Bez limitu</SelectItem>
                    <SelectItem value="1">1 godzina</SelectItem>
                    <SelectItem value="8">8 godzin</SelectItem>
                    <SelectItem value="24">24 godziny</SelectItem>
                    <SelectItem value="72">3 dni</SelectItem>
                    <SelectItem value="168">7 dni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShareOpen(null); setSelectedStaff(""); setTtl("none"); }}>
                Anuluj
              </Button>
              <Button onClick={handleGrantAccess} disabled={granting || !selectedStaff}>
                {granting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Nadaj dostęp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Dialog */}
        {isAdmin && (
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edytuj wpis" : "Dodaj nowy wpis"}</DialogTitle>
                <DialogDescription>
                  {editingId ? "Zmień dane. Zostaw hasło puste, aby zachować obecne." : "Wypełnij dane dostępowe. Hasło zostanie zaszyfrowane AES-256-GCM."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Tytuł *</Label>
                  <Input placeholder="np. Panel hostingu" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Login / E-mail *</Label>
                  <Input placeholder="admin@firma.pl" value={formData.username} onChange={(e) => setFormData((p) => ({ ...p, username: e.target.value }))} />
                </div>
                <div>
                  <Label>Hasło {editingId ? "(zostaw puste = bez zmian)" : "*"}</Label>
                  <Input type="password" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} />
                </div>
                <div>
                  <Label>URL</Label>
                  <Input placeholder="https://panel.hosting.pl" value={formData.url} onChange={(e) => setFormData((p) => ({ ...p, url: e.target.value }))} />
                </div>
                <div>
                  <Label>Notatki</Label>
                  <Textarea placeholder="Dodatkowe informacje..." value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFormOpen(false)}>Anuluj</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Zapisz zmiany" : "Zaszyfruj i zapisz"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć wpis?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna. Zaszyfrowane hasło i wszystkie nadane dostępy zostaną trwale usunięte.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Anuluj</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Usuń
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

export default VaultPage;
