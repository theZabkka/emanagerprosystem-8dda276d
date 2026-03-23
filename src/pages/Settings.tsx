import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
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
import { Eye, Bell, Briefcase, Users, Shield, Bot, Settings2, Clock, LayoutList, RotateCcw, Phone } from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { useStaffMembers } from "@/hooks/useStaffMembers";

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

export default function Settings() {
  const { profile, user } = useAuth();
  const { currentRole } = useRole();
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

  const allDays = ["Pn", "Wt", "Śr", "Cz", "Pt", "Sb", "Nd"];

  const toggleWorkDay = (day: string) => {
    setWorkDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleResetDefaults = () => {
    toast.success("Przywrócono domyślne ustawienia");
  };

  return (
    <AppLayout title="Ustawienia">
      <div className="max-w-3xl mx-auto space-y-1 pb-12">
        <p className="text-sm text-muted-foreground mb-6">Zarządzaj preferencjami systemu</p>

        <Card>
          <CardContent className="p-6">
            {/* Appearance */}
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

            <Separator className="my-2" />

            {/* Notifications */}
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

            <Separator className="my-2" />

            {/* Tasks & work */}
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

            <Separator className="my-2" />

            {/* Team & Gamification */}
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

            <Separator className="my-2" />

            {/* Client Portal */}
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

            <Separator className="my-2" />

            {/* AI & Automation */}
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

            <Separator className="my-2" />

            {/* VoIP / Zadarma */}
            {(currentRole === "superadmin" || currentRole === "boss") && (
              <>
                <SectionHeader icon={Phone} title="VoIP — Zadarma" />
                <SipLoginManager />
              </>
            )}

            <Separator className="my-2" />
            <SectionHeader icon={Shield} title="Bezpieczeństwo" />
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
          </CardContent>
        </Card>

        {/* Reset button */}
        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleResetDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Przywróć domyślne
          </Button>
          <p className="text-xs text-muted-foreground">Zmiany zapisywane są automatycznie</p>
        </div>
      </div>
    </AppLayout>
  );
}
