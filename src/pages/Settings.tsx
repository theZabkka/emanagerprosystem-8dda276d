import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, Bell, Briefcase, Users, Shield, Bot, Settings2, Clock, LayoutList, RotateCcw, Phone, Tag, User, Lock } from "lucide-react";
import { useRole, STAFF_ROLES } from "@/hooks/useRole";
import { useStaffMembers } from "@/hooks/useStaffMembers";
import { SipLoginManager } from "@/components/settings/SipLoginManager";
import { CrmLabelManager } from "@/components/crm/CrmLabelManager";
import { cn } from "@/lib/utils";

const ADMIN_ROLES = ["superadmin", "boss", "koordynator"];

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-6 pb-3">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Tab definitions ───
interface SettingsTab {
  id: string;
  label: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const SETTINGS_TABS: SettingsTab[] = [
  { id: "profile", label: "Profil", icon: User },
  { id: "notifications", label: "Powiadomienia", icon: Bell },
  { id: "security", label: "Bezpieczeństwo", icon: Shield },
  { id: "appearance", label: "Wygląd", icon: Eye, adminOnly: false },
  // Admin-only tabs below
  { id: "tasks", label: "Zadania i praca", icon: Briefcase, adminOnly: true },
  { id: "team", label: "Zespół", icon: Users, adminOnly: true },
  { id: "client-portal", label: "Portal klienta", icon: LayoutList, adminOnly: true },
  { id: "ai", label: "AI i automatyzacja", icon: Bot, adminOnly: true },
  { id: "voip", label: "VoIP — Zadarma", icon: Phone, adminOnly: true },
  { id: "crm-labels", label: "Etykiety CRM", icon: Tag, adminOnly: true },
];

function ContactProfileEditor({ profile }: { profile: any }) {
  const [firstName, setFirstName] = useState(profile?.contact_first_name || "");
  const [lastName, setLastName] = useState(profile?.contact_last_name || "");
  const [phone, setPhone] = useState(profile?.contact_phone || "");
  const [position, setPosition] = useState(profile?.contact_position || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Imię i nazwisko są wymagane.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("customer_contacts")
      .update({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        position: position.trim() || null,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error("Błąd zapisu: " + error.message);
      return;
    }
    toast.success("Dane zaktualizowane!");
    // Reload to reflect changes in header
    window.location.reload();
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Imię *</Label>
          <Input className="mt-1" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Imię" />
        </div>
        <div>
          <Label className="text-sm">Nazwisko *</Label>
          <Input className="mt-1" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nazwisko" />
        </div>
      </div>
      <div>
        <Label className="text-sm">Email</Label>
        <Input className="mt-1" value={profile?.email || ""} disabled />
        <p className="text-xs text-muted-foreground mt-1">Email nie może być zmieniony.</p>
      </div>
      <div>
        <Label className="text-sm">Telefon</Label>
        <Input className="mt-1" value={phone} onChange={e => setPhone(e.target.value)} placeholder="np. +48 123 456 789" />
      </div>
      <div>
        <Label className="text-sm">Stanowisko</Label>
        <Input className="mt-1" value={position} onChange={e => setPosition(e.target.value)} placeholder="np. Dyrektor Marketingu" />
      </div>
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Zapisywanie..." : "Zapisz zmiany"}
      </Button>
    </div>
  );
}

export default function Settings() {
  const { profile, user } = useAuth();
  const { currentRole } = useRole();
  const isAdmin = ADMIN_ROLES.includes(currentRole);

  const visibleTabs = SETTINGS_TABS.filter(t => !t.adminOnly || isAdmin);
  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id || "profile");

  // Appearance
  const [theme, setTheme] = useState("system");
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [tableDensity, setTableDensity] = useState("normal");
  const [startPage, setStartPage] = useState("dashboard");

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [mentionAlerts, setMentionAlerts] = useState(true);
  const [deadlineReminders, setDeadlineReminders] = useState(true);
  const [preDeadlineHours, setPreDeadlineHours] = useState("24");
  const [sounds, setSounds] = useState(true);
  const [digestFrequency, setDigestFrequency] = useState("daily");
  const [digestTime, setDigestTime] = useState("08:00");

  // Tasks & work
  const [defaultTaskView, setDefaultTaskView] = useState("list");
  const [defaultPriority, setDefaultPriority] = useState("medium");
  const [showSubtaskProgress, setShowSubtaskProgress] = useState(true);
  const [timeLogReminder, setTimeLogReminder] = useState(true);
  const [reminderInterval, setReminderInterval] = useState("60");
  const [requireTimeLog, setRequireTimeLog] = useState(false);

  // Team & gamification
  const [gamification, setGamification] = useState(true);
  const [streaks, setStreaks] = useState(true);
  const [leaderboardVisibility, setLeaderboardVisibility] = useState(true);
  const [morningBriefing, setMorningBriefing] = useState(true);
  const [briefingTime, setBriefingTime] = useState("08:30");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [workDays, setWorkDays] = useState(["Pn", "Wt", "Śr", "Cz", "Pt"]);

  // Client portal
  const [clientChat, setClientChat] = useState(true);
  const [clientPermissions, setClientPermissions] = useState(true);
  const [clientFiles, setClientFiles] = useState(true);
  const [feedbackForm, setFeedbackForm] = useState(true);
  const [autoClientNotif, setAutoClientNotif] = useState(true);
  const [weeklyClientReport, setWeeklyClientReport] = useState(true);

  // AI & automation
  const [aiSuggestions, setAiSuggestions] = useState(true);
  const [autoTranscription, setAutoTranscription] = useState(true);
  const [smartDigest, setSmartDigest] = useState(true);
  const [meetingSummary, setMeetingSummary] = useState(true);
  const [spamThreshold, setSpamThreshold] = useState("75");

  // Security
  const [sessionTimeout, setSessionTimeout] = useState("480");
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [loginHistory, setLoginHistory] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const allDays = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  const toggleWorkDay = (day: string) => {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleResetDefaults = () => {
    toast.success("Przywrócono domyślne ustawienia");
  };

  const handlePasswordChange = async () => {
    if (!currentPassword) { toast.error("Wprowadź obecne hasło"); return; }
    if (newPassword.length < 6) { toast.error("Nowe hasło musi mieć min. 6 znaków"); return; }
    if (newPassword !== confirmPassword) { toast.error("Hasła nie są identyczne"); return; }
    setChangingPassword(true);
    try {
      // Re-authenticate with current password
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) { toast.error("Nie można pobrać danych użytkownika"); setChangingPassword(false); return; }
      const { error: authError } = await supabase.auth.signInWithPassword({ email: currentUser.email, password: currentPassword });
      if (authError) { toast.error("Obecne hasło jest nieprawidłowe"); setChangingPassword(false); return; }
      // Update password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) { toast.error("Błąd zmiany hasła: " + error.message); setChangingPassword(false); return; }
      toast.success("Hasło zostało zmienione. Zaloguj się ponownie nowym hasłem.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (e) {
      toast.error("Wystąpił nieoczekiwany błąd");
      setChangingPassword(false);
    }
  };

  return (
    <AppLayout title="Ustawienia">
      <div className="flex gap-6 max-w-5xl mx-auto pb-12">
        {/* Sidebar tabs */}
        <nav className="w-56 shrink-0 space-y-1 pt-2 hidden md:block">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Mobile tab select */}
        <div className="md:hidden w-full mb-4">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {visibleTabs.map(tab => (
                <SelectItem key={tab.id} value={tab.id}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <Card>
            <CardContent className="p-6">

              {/* ─── PROFILE ─── */}
              {activeTab === "profile" && (
                <>
                  <SectionHeader icon={User} title="Profil" />
                  {profile?.is_contact ? (
                    <ContactProfileEditor profile={profile} />
                  ) : (
                    <>
                      <SettingRow label="Imię i nazwisko">
                        <span className="text-sm text-foreground">{profile?.full_name || "—"}</span>
                      </SettingRow>
                      <SettingRow label="Email">
                        <span className="text-sm text-foreground">{profile?.email || "—"}</span>
                      </SettingRow>
                      <SettingRow label="Rola">
                        <Badge variant="outline">{currentRole.toUpperCase()}</Badge>
                      </SettingRow>
                      <SettingRow label="Departament">
                        <span className="text-sm text-foreground">{profile?.department || "—"}</span>
                      </SettingRow>
                    </>
                  )}
                </>
              )}

              {/* ─── NOTIFICATIONS ─── */}
              {activeTab === "notifications" && (
                <>
                  <SectionHeader icon={Bell} title="Powiadomienia" />
                  <SettingRow label="Powiadomienia email" description="Otrzymuj maile o ważnych zdarzeniach">
                    <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
                  </SettingRow>
                  <SettingRow label="Powiadomienia push" description="Natychmiastowe powiadomienia w przeglądarce">
                    <Switch checked={pushNotif} onCheckedChange={setPushNotif} />
                  </SettingRow>
                  <SettingRow label="Alerty o wspomnieniach (@)" description="Powiadomienia gdy ktoś Cię wspomni">
                    <Switch checked={mentionAlerts} onCheckedChange={setMentionAlerts} />
                  </SettingRow>
                  <SettingRow label="Przypomnienia o deadline'ach" description="Automatyczne przypomnienia przed terminem">
                    <Switch checked={deadlineReminders} onCheckedChange={setDeadlineReminders} />
                  </SettingRow>
                  <SettingRow label="Czas przed deadline'em" description="Na ile godzin przed terminem przypominać">
                    <div className="flex items-center gap-2">
                      <Input className="w-16 text-center" value={preDeadlineHours} onChange={e => setPreDeadlineHours(e.target.value)} />
                      <span className="text-xs text-muted-foreground">godz.</span>
                    </div>
                  </SettingRow>
                  <SettingRow label="Dźwięki" description="Efekty dźwiękowe przy powiadomieniach">
                    <Switch checked={sounds} onCheckedChange={setSounds} />
                  </SettingRow>
                  <SettingRow label="Częstotliwość digestu" description="Podsumowanie zdarzeń mailowe">
                    <Select value={digestFrequency} onValueChange={setDigestFrequency}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Codziennie</SelectItem>
                        <SelectItem value="weekly">Co tydzień</SelectItem>
                        <SelectItem value="never">Nigdy</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Godzina wysyłki digestu">
                    <Input type="time" className="w-28" value={digestTime} onChange={e => setDigestTime(e.target.value)} />
                  </SettingRow>
                </>
              )}

              {/* ─── SECURITY ─── */}
              {activeTab === "security" && (
                <>
                  <SectionHeader icon={Shield} title="Bezpieczeństwo" />
                   <div className="space-y-4 py-4">
                     <div>
                       <Label className="text-sm">Obecne hasło</Label>
                       <Input type="password" className="mt-1" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Twoje aktualne hasło" />
                     </div>
                     <div>
                       <Label className="text-sm">Nowe hasło</Label>
                       <Input type="password" className="mt-1" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 6 znaków" />
                     </div>
                     <div>
                       <Label className="text-sm">Potwierdź nowe hasło</Label>
                       <Input type="password" className="mt-1" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Powtórz nowe hasło" />
                     </div>
                     <Button onClick={handlePasswordChange} disabled={changingPassword}>
                       {changingPassword ? "Zmieniam..." : "Zmień hasło"}
                     </Button>
                   </div>
                  {isAdmin && (
                    <>
                      <Separator className="my-4" />
                      <SettingRow label="Timeout sesji" description="Automatyczne wylogowanie po braku aktywności">
                        <div className="flex items-center gap-2">
                          <Input className="w-16 text-center" value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} />
                          <span className="text-xs text-muted-foreground">min</span>
                        </div>
                      </SettingRow>
                      <SettingRow label="Wymuszaj zmianę hasła" description="Co pewien czas wymagaj zmiany hasła">
                        <Switch checked={forcePasswordChange} onCheckedChange={setForcePasswordChange} />
                      </SettingRow>
                      <SettingRow label="Historia logowań" description="Zapisuj historię logowań użytkowników">
                        <Switch checked={loginHistory} onCheckedChange={setLoginHistory} />
                      </SettingRow>
                    </>
                  )}
                </>
              )}

              {/* ─── APPEARANCE ─── */}
              {activeTab === "appearance" && (
                <>
                  <SectionHeader icon={Eye} title="Wygląd i interfejs" />
                  <SettingRow label="Motyw kolorystyczny" description="Jasny, ciemny lub automatyczny">
                    <Select value={theme} onValueChange={setTheme}>
                      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">🌓 Systemowy</SelectItem>
                        <SelectItem value="light">☀️ Jasny</SelectItem>
                        <SelectItem value="dark">🌙 Ciemny</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Kompaktowy sidebar" description="Mniejsza nawigacja boczna w zwiniętej formie">
                    <Switch checked={compactSidebar} onCheckedChange={setCompactSidebar} />
                  </SettingRow>
                  <SettingRow label="Animacje" description="Efekty i animacje w interfejsie">
                    <Switch checked={animations} onCheckedChange={setAnimations} />
                  </SettingRow>
                  <SettingRow label="Gęstość tabel" description="Ilość pustej przestrzeni w wierszach tabel">
                    <Select value={tableDensity} onValueChange={setTableDensity}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Kompaktowa</SelectItem>
                        <SelectItem value="normal">Normalna</SelectItem>
                        <SelectItem value="comfortable">Wygodna</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Strona startowa" description="Domyślna strona po zalogowaniu">
                    <Select value={startPage} onValueChange={setStartPage}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dashboard">Pulpit</SelectItem>
                        <SelectItem value="my-day">Mój dzień</SelectItem>
                        <SelectItem value="tasks">Zadania</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </>
              )}

              {/* ─── TASKS (Admin only) ─── */}
              {activeTab === "tasks" && isAdmin && (
                <>
                  <SectionHeader icon={Briefcase} title="Zadania i czas pracy" />
                  <SettingRow label="Domyślny widok zadań" description="Lista, kanban lub kalendarz">
                    <Select value={defaultTaskView} onValueChange={setDefaultTaskView}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="list">📋 Lista</SelectItem>
                        <SelectItem value="kanban">📊 Kanban</SelectItem>
                        <SelectItem value="calendar">📅 Kalendarz</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Domyślny priorytet" description="Priorytet nowych zadań">
                    <Select value={defaultPriority} onValueChange={setDefaultPriority}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niski</SelectItem>
                        <SelectItem value="medium">Średni</SelectItem>
                        <SelectItem value="high">Wysoki</SelectItem>
                        <SelectItem value="critical">Krytyczny</SelectItem>
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Pokazuj postęp podzadań" description="Pasek postępu na kartach zadań">
                    <Switch checked={showSubtaskProgress} onCheckedChange={setShowSubtaskProgress} />
                  </SettingRow>
                  <SettingRow label="Przypomnienie o rejestracji czasu" description="Okresowe przypomnienia o wpisach czasu">
                    <Switch checked={timeLogReminder} onCheckedChange={setTimeLogReminder} />
                  </SettingRow>
                  <SettingRow label="Interwał przypomnienia" description="Co ile minut przypominać">
                    <div className="flex items-center gap-2">
                      <Input className="w-16 text-center" value={reminderInterval} onChange={e => setReminderInterval(e.target.value)} />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                  </SettingRow>
                  <SettingRow label="Wymagaj wpisu czasu" description="Nie pozwalaj zamykać zadania bez wpisu czasu">
                    <Switch checked={requireTimeLog} onCheckedChange={setRequireTimeLog} />
                  </SettingRow>
                </>
              )}

              {/* ─── TEAM (Admin only) ─── */}
              {activeTab === "team" && isAdmin && (
                <>
                  <SectionHeader icon={Users} title="Zespół i gamifikacja" />
                  <SettingRow label="Gamifikacja" description="System punktów, odznak i nagród za aktywność">
                    <Switch checked={gamification} onCheckedChange={setGamification} />
                  </SettingRow>
                  <SettingRow label="Śledzenie serii logowań" description="Streaki — seria dni z aktywnością">
                    <Switch checked={streaks} onCheckedChange={setStreaks} />
                  </SettingRow>
                  <SettingRow label="Widoczność leaderboardu" description="Ranking, statystyki zbiorowe dla zespołu">
                    <Switch checked={leaderboardVisibility} onCheckedChange={setLeaderboardVisibility} />
                  </SettingRow>
                  <SettingRow label="Poranny briefing" description="Automatyczne podsumowanie na start dnia">
                    <Switch checked={morningBriefing} onCheckedChange={setMorningBriefing} />
                  </SettingRow>
                  <SettingRow label="Godzina briefingu">
                    <Input type="time" className="w-28" value={briefingTime} onChange={e => setBriefingTime(e.target.value)} />
                  </SettingRow>
                  <SettingRow label="Godziny pracy" description="Domyślny zakres godzin pracy zespołu">
                    <div className="flex items-center gap-2">
                      <Input type="time" className="w-24" value={workStart} onChange={e => setWorkStart(e.target.value)} />
                      <span className="text-muted-foreground">—</span>
                      <Input type="time" className="w-24" value={workEnd} onChange={e => setWorkEnd(e.target.value)} />
                    </div>
                  </SettingRow>
                  <div className="py-3">
                    <Label className="text-sm font-medium">Dni robocze</Label>
                    <div className="flex gap-2 mt-2">
                      {allDays.map(day => (
                        <button
                          key={day}
                          onClick={() => toggleWorkDay(day)}
                          className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                            workDays.includes(day)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── CLIENT PORTAL (Admin only) ─── */}
              {activeTab === "client-portal" && isAdmin && (
                <>
                  <SectionHeader icon={LayoutList} title="Portal klienta" />
                  <SettingRow label="Chat z klientami" description="Moduł czatu w portalu klienta">
                    <Switch checked={clientChat} onCheckedChange={setClientChat} />
                  </SettingRow>
                  <SettingRow label="Permisje klientów" description="Klienci mogą edytować priorytety">
                    <Switch checked={clientPermissions} onCheckedChange={setClientPermissions} />
                  </SettingRow>
                  <SettingRow label="Pliki w portalu" description="Klienci mają dostęp do swoich plików">
                    <Switch checked={clientFiles} onCheckedChange={setClientFiles} />
                  </SettingRow>
                  <SettingRow label="Formularz feedbacku" description="Ankieta satysfakcji dla klientów">
                    <Switch checked={feedbackForm} onCheckedChange={setFeedbackForm} />
                  </SettingRow>
                  <SettingRow label="Auto-powiadomienia do klientów" description="Klient dostaje maile o zmianach statusu">
                    <Switch checked={autoClientNotif} onCheckedChange={setAutoClientNotif} />
                  </SettingRow>
                  <SettingRow label="Cotygodniowy raport dla klienta" description="Automatyczny raport o postępach projektów">
                    <Switch checked={weeklyClientReport} onCheckedChange={setWeeklyClientReport} />
                  </SettingRow>
                </>
              )}

              {/* ─── AI (Admin only) ─── */}
              {activeTab === "ai" && isAdmin && (
                <>
                  <SectionHeader icon={Bot} title="AI i automatyzacja" />
                  <SettingRow label="Sugestie AI" description="Inteligentne podpowiedzi przy przypisaniu i szacowaniu">
                    <Switch checked={aiSuggestions} onCheckedChange={setAiSuggestions} />
                  </SettingRow>
                  <SettingRow label="Automatyczna transkrypcja" description="Transkrypcja nagrań spotkań">
                    <Switch checked={autoTranscription} onCheckedChange={setAutoTranscription} />
                  </SettingRow>
                  <SettingRow label="Smart Digest AI" description="AI analizuje powiadomienia i rekomenduje ważne">
                    <Switch checked={smartDigest} onCheckedChange={setSmartDigest} />
                  </SettingRow>
                  <SettingRow label="Podsumowania spotkań AI" description="Automatyczne notatki i action items po spotkaniach">
                    <Switch checked={meetingSummary} onCheckedChange={setMeetingSummary} />
                  </SettingRow>
                  <SettingRow label="Próg detekcji spamu" description="Punkt powyżej którego wiadomość jest traktowana jako spam">
                    <div className="flex items-center gap-2">
                      <Input className="w-16 text-center" value={spamThreshold} onChange={e => setSpamThreshold(e.target.value)} />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </SettingRow>
                </>
              )}

              {/* ─── VoIP (Admin only) ─── */}
              {activeTab === "voip" && isAdmin && (
                <>
                  <SectionHeader icon={Phone} title="VoIP — Zadarma" />
                  <SipLoginManager />
                </>
              )}

              {/* ─── CRM Labels (Admin only) ─── */}
              {activeTab === "crm-labels" && isAdmin && (
                <>
                  <SectionHeader icon={Tag} title="Etykiety (Lejek sprzedaży)" />
                  <CrmLabelManager />
                </>
              )}

            </CardContent>
          </Card>

          {/* Reset button - admin only */}
          {isAdmin && (
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleResetDefaults}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Przywróć domyślne
              </Button>
              <p className="text-xs text-muted-foreground">Zmiany zapisywane są automatycznie</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
