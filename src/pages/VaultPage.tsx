import { useState, useEffect, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
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
  Eye, EyeOff, Copy, Plus, Trash2, Edit, ShieldCheck, Clock, User,
  KeyRound, Loader2,
} from "lucide-react";
import { format } from "date-fns";
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

function VaultPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: "", username: "", password: "", url: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Revealed passwords state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchCredentials = useCallback(async () => {
    const { data } = await supabase
      .from("vault_credentials")
      .select("*")
      .order("created_at", { ascending: false });
    setCredentials((data as any[]) || []);
    setLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data: logs } = await supabase
      .from("vault_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!logs || logs.length === 0) { setAuditLogs([]); return; }

    // Enrich with credential titles and user names
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
  }, []);

  useEffect(() => {
    fetchCredentials();
    fetchAuditLogs();
  }, [fetchCredentials, fetchAuditLogs]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, []);

  const handleSave = async () => {
    if (!formData.title || !formData.username || !formData.password) {
      toast.error("Wypełnij tytuł, login i hasło");
      return;
    }
    setSaving(true);
    try {
      // Encrypt via edge function
      const { data: encData, error: encErr } = await supabase.functions.invoke("vault-manager", {
        body: { action: "ENCRYPT", password: formData.password },
      });

      if (encErr || !encData?.encrypted_password) {
        toast.error("Błąd szyfrowania hasła");
        setSaving(false);
        return;
      }

      const record = {
        title: formData.title,
        username: formData.username,
        encrypted_password: encData.encrypted_password,
        iv: encData.iv,
        auth_tag: encData.auth_tag,
        url: formData.url || null,
        notes: formData.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("vault_credentials")
          .update(record as any)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Zaktualizowano wpis");
      } else {
        const { error } = await supabase.from("vault_credentials").insert(record as any);
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
    else { toast.success("Usunięto wpis"); fetchCredentials(); }
    setDeleteId(null);
  };

  const handleReveal = async (cred: Credential) => {
    setRevealingId(cred.id);
    try {
      const { data, error } = await supabase.functions.invoke("vault-manager", {
        body: {
          action: "DECRYPT",
          credential_id: cred.id,
          encrypted_password: cred.encrypted_password,
          iv: cred.iv,
          auth_tag: cred.auth_tag,
        },
      });
      if (error || !data?.password) {
        toast.error("Nie udało się odszyfrować hasła");
        setRevealingId(null);
        return;
      }
      setRevealedPasswords((prev) => ({ ...prev, [cred.id]: data.password }));

      // Auto-hide after 10 seconds
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
      // Async audit log for COPIED
      supabase.from("vault_audit_logs").insert({
        credential_id: cred.id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        action: "COPIED",
      } as any);
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
      password: "", // won't overwrite if empty
      url: cred.url || "",
      notes: cred.notes || "",
    });
    setFormOpen(true);
  };

  const actionLabel = (a: string) => {
    if (a === "REVEALED") return "Odkryto";
    if (a === "COPIED") return "Skopiowano";
    return a;
  };

  const actionColor = (a: string) => {
    if (a === "REVEALED") return "bg-amber-500/10 text-amber-700";
    if (a === "COPIED") return "bg-blue-500/10 text-blue-700";
    return "";
  };

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
              Bezpieczne przechowywanie haseł z szyfrowaniem AES-256-GCM
            </p>
          </div>
          <Button onClick={() => { setEditingId(null); setFormData({ title: "", username: "", password: "", url: "", notes: "" }); setFormOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Dodaj wpis
          </Button>
        </div>

        <Tabs defaultValue="credentials">
          <TabsList>
            <TabsTrigger value="credentials" className="gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Hasła
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Logi audytu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zapisane dane dostępowe</CardTitle>
                <CardDescription>Kliknij ikonę oka, aby odszyfrować hasło. Hasło ukryje się po 10 sekundach.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : credentials.length === 0 ? (
                  <p className="text-center py-12 text-muted-foreground">Sejf jest pusty. Dodaj pierwszy wpis.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Login</TableHead>
                        <TableHead>Hasło</TableHead>
                        <TableHead>URL</TableHead>
                        <TableHead className="text-right">Akcje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {credentials.map((cred) => {
                        const isRevealed = !!revealedPasswords[cred.id];
                        const isRevealing = revealingId === cred.id;
                        return (
                          <TableRow key={cred.id}>
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleReveal(cred)}
                                    disabled={isRevealing}
                                    title="Odkryj hasło"
                                  >
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
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cred)} title="Edytuj">
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(cred.id)} title="Usuń">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logi audytu sejfu</CardTitle>
                <CardDescription>Pełna historia kto i kiedy odkrywał lub kopiował hasła</CardDescription>
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
        </Tabs>

        {/* Add/Edit Dialog */}
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

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Usunąć wpis?</AlertDialogTitle>
              <AlertDialogDescription>
                Ta operacja jest nieodwracalna. Zaszyfrowane hasło zostanie trwale usunięte.
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
