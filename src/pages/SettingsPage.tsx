import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Download,
  FileText,
  Calendar,
  Database,
  Info,
  Trash2,
  Calculator,
  Bot,
  Share2,
  Sparkles,
  User,
  LogOut,
  Palette,
  Upload,
  FolderInput,
  Cloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import {
  getSettings,
  updateSettings,
  loadDemoData,
  clearAllData,
  getAllReptiles,
  getAllScheduleItems,
  getAllCareEvents,
  seedExpoDemo,
  clearDemoData,
  isSampleDatasetEnabled,
} from '@/lib/storage';
import { exportFullBackupJson, type ReptilitaBackupV1 } from '@/lib/backup/fullBackup';
import { applyReptilitaBackupMerge, parseBackupFileText } from '@/lib/backup/importBackup';
import { generateICS } from '@/lib/export/ics';
import { generatePDFReport } from '@/lib/export/pdf';
import { downloadPromoCard } from '@/lib/export/promoCard';
import { ProBadge } from '@/components/plan/ProBadge';
import { FEATURE_SMART_INSIGHTS_PLACEHOLDER } from '@/lib/plan/mockSubscription';
import { usePlanStatus } from '@/hooks/usePlanStatus';
import { useAuth } from '@/hooks/useAuth';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import type { AppSettings } from '@/types';
import {
  notifyIndexedDbDataChanged,
  pullCloudIntoLocal,
  pushLocalIntoCloud,
  REPTILES_CLOUD_SYNC_EVENT,
  syncCurrentUserReptiles,
  fetchCloudReptiles,
} from '@/lib/reptiles/cloudSync';
import { readLastSuccessfulCloudSyncMs } from '@/lib/sync/syncTelemetry';

type ThemeValue = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeValue; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { isPro, isLoadingPlan } = usePlanStatus();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>({
    feedingReminders: true,
    overdueReminders: true,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [clearDataOpen, setClearDataOpen] = useState(false);
  const [clearingData, setClearingData] = useState(false);

  // Auth state
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Expo demo mode
  const [seedingExpo, setSeedingExpo] = useState(false);
  const [exportingPromo, setExportingPromo] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [importReview, setImportReview] = useState<ReptilitaBackupV1 | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [uploadAfterImport, setUploadAfterImport] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [cloudBusyAction, setCloudBusyAction] = useState<'sync' | 'pull' | 'push' | null>(null);
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(() => readLastSuccessfulCloudSyncMs());
  const [localReptileCount, setLocalReptileCount] = useState(0);
  const [cloudReptileCount, setCloudReptileCount] = useState<number | null>(null);
  const [advancedCloudOpen, setAdvancedCloudOpen] = useState(false);
  const [lastCloudSyncHadError, setLastCloudSyncHadError] = useState(false);
  const [offline, setOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await getSettings();
        setSettings(stored);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const onLine = () => setOffline(false);
    const offLine = () => setOffline(true);
    window.addEventListener('online', onLine);
    window.addEventListener('offline', offLine);
    return () => {
      window.removeEventListener('online', onLine);
      window.removeEventListener('offline', offLine);
    };
  }, []);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (!supabase) {
      setProfile(null);
      return;
    }

    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .single();
        if (data) setProfile(data);
      };
      fetchProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const handleToggle = async (key: keyof AppSettings) => {
    const newValue = !settings[key];

    if (key === 'expoDemoMode' && newValue && !isSampleDatasetEnabled()) {
      toast.error('Sample datasets are disabled in this build.');
      return;
    }

    setSettings((prev) => ({ ...prev, [key]: newValue }));

    try {
      await updateSettings({ [key]: newValue });

      // Handle expo demo mode toggle
      if (key === 'expoDemoMode' && newValue) {
        setSeedingExpo(true);
        try {
          await seedExpoDemo();
          toast.success('Sample data ready');
          setTimeout(() => window.location.reload(), 800);
        } catch (e) {
          console.error('Seed expo failed:', e);
        } finally {
          setSeedingExpo(false);
        }
      } else {
        toast.success('Settings updated');
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettings(prev => ({ ...prev, [key]: !newValue }));
      toast.error('Failed to update settings');
    }
  };

  const handleExportICS = async () => {
    setExporting(true);
    try {
      const scheduleItems = await getAllScheduleItems();
      const reptiles = await getAllReptiles();
      if (scheduleItems.length === 0) { toast.error('No schedule items to export'); return; }
      const icsContent = generateICS(scheduleItems, reptiles);
      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reptilita-care-schedule.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Schedule exported successfully');
    } catch (error) {
      console.error('Failed to export ICS:', error);
      toast.error('Failed to export schedule');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const [reptiles, events] = await Promise.all([getAllReptiles(), getAllCareEvents()]);
      if (reptiles.length === 0) { toast.error('No animals to export'); return; }
      const htmlContent = generatePDFReport(reptiles, events);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        toast.success('Report opened in new tab — use Print to save as PDF');
      } else {
        toast.error('Please allow popups to generate the report');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await loadDemoData();
      toast.success('Extended sample data loaded — refreshing…');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to load demo data:', error);
      toast.error('Failed to load sample data');
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleClearData = async () => {
    setClearingData(true);
    try {
      await clearAllData();
      toast.success('All data cleared');
      setClearDataOpen(false);
      navigate('/reptiles');
    } catch (error) {
      console.error('Failed to clear data:', error);
      toast.error('Failed to clear data');
    } finally {
      setClearingData(false);
    }
  };

  const handleSharePromo = async () => {
    setExportingPromo(true);
    try {
      await downloadPromoCard();
      toast.success('Promo card exported');
    } catch (error) {
      console.error('Failed to export promo card:', error);
      toast.error('Failed to export promo card');
    } finally {
      setExportingPromo(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setSignOutOpen(false);
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  const formatLastSync = (ms: number | null): string => {
    if (ms === null || !Number.isFinite(ms)) return 'Never synced';
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(ms);
    } catch {
      return new Date(ms).toLocaleString();
    }
  };

  const refreshLastSyncBadge = () => {
    const v = readLastSuccessfulCloudSyncMs();
    setLastSyncMs(v);
  };

  /** Signed in + Supabase env + navigator online — controls enabled. */
  const syncControlsEnabled =
    !!(user && isSupabaseConfigured && supabase && !offline);

  const conservativeCloudStatus = useMemo(() => {
    if (!syncControlsEnabled) {
      return {
        headline: 'Not connected',
        hint: '',
        detail:
          !user || !isSupabaseConfigured || !supabase
            ? 'Sign in with a configured build to sync.'
            : 'Connect to the internet to sync.',
      } as const;
    }
    if (lastCloudSyncHadError) {
      return {
        headline: 'Needs review',
        hint: 'Last sync did not finish — try Sync now again.',
        detail: '',
      } as const;
    }
    if (cloudReptileCount === null) {
      return {
        headline: 'Needs review',
        hint: 'Cloud summary could not be loaded.',
        detail: 'Check your connection, then tap Sync now.',
      } as const;
    }
    if (lastSyncMs === null) {
      const hasAny = localReptileCount > 0 || cloudReptileCount > 0;
      if (!hasAny) {
        return {
          headline: 'Up to date',
          hint: 'Nothing queued on this quick check.',
          detail: '',
        } as const;
      }
      return {
        headline: 'Pending changes',
        hint: 'This device has not completed a sync yet.',
        detail: '',
      } as const;
    }
    if (localReptileCount !== cloudReptileCount) {
      return {
        headline: 'Pending changes',
        hint: 'Local and cloud animal counts differ on this snapshot.',
        detail: '',
      } as const;
    }
    return {
      headline: 'Up to date',
      hint: '',
      detail: '',
    } as const;
  }, [
    syncControlsEnabled,
    user,
    lastCloudSyncHadError,
    cloudReptileCount,
    lastSyncMs,
    localReptileCount,
  ]);

  const dispatchSyncCompletedUiRefresh = (reptileCountGuess: number) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent(REPTILES_CLOUD_SYNC_EVENT, {
        detail: { ok: true, reptileCount: reptileCountGuess, scheduleCount: 0 },
      }),
    );
  };

  const refreshReptileCounts = async (): Promise<number> => {
    try {
      const local = await getAllReptiles();
      setLocalReptileCount(local.length);

      if (user && supabase && isSupabaseConfigured) {
        const cloudRows = await fetchCloudReptiles(user.id);
        setCloudReptileCount(cloudRows.length);
      } else {
        setCloudReptileCount(null);
      }

      return local.length;
    } catch {
      if (!(user && supabase && isSupabaseConfigured)) {
        setCloudReptileCount(null);
      }
      try {
        const localOnly = await getAllReptiles();
        setLocalReptileCount(localOnly.length);
        return localOnly.length;
      } catch {
        return 0;
      }
    }
  };

  useEffect(() => {
    void refreshReptileCounts();
    refreshLastSyncBadge();
     
  }, [user?.id, offline, isSupabaseConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSyncedAction = async (
    uiName: string,
    busyKind: 'sync' | 'pull' | 'push',
    fn: () => Promise<void>,
  ) => {
    console.log('[CloudSync UI]', uiName, 'start');
    if (!syncControlsEnabled || !user) {
      console.log('[CloudSync UI]', uiName, 'skipped (sign in required or offline)');
      toast.error(!user ? 'Sign in to enable sync.' : 'Connect to the internet to sync.');
      return;
    }

    setCloudBusyAction(busyKind);
    try {
      await fn();
      setLastCloudSyncHadError(false);
      refreshLastSyncBadge();
      const localLen = await refreshReptileCounts();
      toast.success('Sync completed');
      dispatchSyncCompletedUiRefresh(localLen);
      console.log('[CloudSync UI]', uiName, 'end');
    } catch (error) {
      setLastCloudSyncHadError(true);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      console.log('[CloudSync UI]', uiName, 'error:', message);
    } finally {
      setCloudBusyAction(null);
    }
  };

  const handleBackupExport = async () => {
    setBackupBusy(true);
    try {
      const json = await exportFullBackupJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reptilita-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup file downloaded');
    } catch (e) {
      console.error(e);
      toast.error('Backup export failed');
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImportPick = async (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseBackupFileText(text);
      if (!parsed.ok) {
        toast.error(parsed.error);
        return;
      }
      setImportReview(parsed.data);
      setUploadAfterImport(!!user && syncControlsEnabled);
      setImportDialogOpen(true);
    } catch {
      toast.error('Could not read file');
    } finally {
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importReview) return;
    setApplyingImport(true);
    try {
      const counts = await applyReptilitaBackupMerge(importReview);
      toast.success(
        `Imported (${counts.schedulesWritten} schedules, ${counts.eventsWritten} journal rows, reptile merges: ${counts.reptileAliases})`,
      );
      notifyIndexedDbDataChanged();
      await refreshReptileCounts();
      setImportDialogOpen(false);
      setImportReview(null);

      if (uploadAfterImport && user && syncControlsEnabled) {
        console.log('[CloudSync UI]', 'upload after backup import', 'start');
        await pushLocalIntoCloud(user.id).catch(() => {});
        console.log('[CloudSync UI]', 'upload after backup import', 'end');
        refreshLastSyncBadge();
        await refreshReptileCounts();
        toast.success('Cloud upload finished');
        notifyIndexedDbDataChanged();
      }
    } catch (error) {
      console.error(error);
      toast.error('Import failed');
    } finally {
      setApplyingImport(false);
    }
  };

  const sampleGate = isSampleDatasetEnabled();

  if (loading || authLoading || (!!user?.id && isSupabaseConfigured && isLoadingPlan)) {
    return (
      <div className="page-container">
        <PageHeader title="Settings" />
        <div className="page-content page-content-top loading-min-height flex items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <PageMotion className="page-container">
      <PageHeader 
        title="Settings" 
      />

      <div className="page-content page-content-top space-y-7 pb-10">
        {/* Account */}
        <section>
          <h2 className="section-header mb-2.5">Account</h2>
          <div className="premium-surface-elevated rounded-[var(--radius-xl)] overflow-hidden">
            <div className="p-4 sm:p-5">
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 ring-1 ring-border/20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {profile?.display_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-card-title text-foreground truncate">
                    {profile?.display_name || user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-secondary truncate text-[13px]">{user.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSignOutOpen(true)}
                  className="shrink-0"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-card-title text-foreground">Not signed in</p>
                    <p className="text-secondary text-[13px]">Sign in for account profile features</p>
                  </div>
                </div>
                <Link to="/auth">
                  <Button variant="default" size="sm">Sign In</Button>
                </Link>
              </div>
            )}
            </div>
          </div>
        </section>

        {/* Cloud Sync */}
        <section>
          <h2 className="section-header mb-2.5">Cloud Sync</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden divide-y divide-border/70">
            <div className="px-4 sm:px-5 py-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Cloud className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-card-title text-foreground">{conservativeCloudStatus.headline}</span>
                    {offline && (
                      <span className="text-xs font-medium uppercase tracking-wide text-amber-800/85 dark:text-amber-200/85">
                        Offline
                      </span>
                    )}
                  </div>
                  {[conservativeCloudStatus.hint, conservativeCloudStatus.detail].some(Boolean) && (
                    <p className="text-secondary text-[13px] leading-snug">
                      {[conservativeCloudStatus.hint, conservativeCloudStatus.detail].filter(Boolean).join(' ')}
                    </p>
                  )}
                  <p className="text-secondary text-[13px]">
                    Last sync: <span className="text-foreground tabular-nums">{formatLastSync(lastSyncMs)}</span>
                  </p>
                  <p className="text-secondary text-[13px]">
                    Animals — local <span className="tabular-nums text-foreground font-medium">{localReptileCount}</span>
                    {syncControlsEnabled ? (
                      <>
                        {' '}
                        · cloud{' '}
                        <span className="tabular-nums text-foreground font-medium">
                          {cloudReptileCount === null ? '—' : cloudReptileCount}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground"> · cloud unavailable</span>
                    )}
                  </p>
                  {!user && (
                    <p className="text-sm text-amber-800/90 dark:text-amber-200/90 pt-0.5">Sign in to enable sync.</p>
                  )}
                  {user && !isSupabaseConfigured && (
                    <p className="text-sm text-muted-foreground pt-0.5">
                      Cloud sync isn’t available in this edition of the app.
                    </p>
                  )}
                  {syncControlsEnabled && (
                    <p className="text-caption pt-1">
                      Changes merge when you reconnect. Your animals stay editable offline.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 px-4 sm:px-5 py-4">
              <Button
                className="w-full sm:w-auto sm:self-start"
                variant="default"
                size="default"
                disabled={!syncControlsEnabled || !!cloudBusyAction}
                onClick={() =>
                  void runSyncedAction('sync now', 'sync', () => syncCurrentUserReptiles(user!.id))
                }
              >
                {cloudBusyAction === 'sync' ? 'Working…' : 'Sync now'}
              </Button>
            </div>

            <Collapsible open={advancedCloudOpen} onOpenChange={setAdvancedCloudOpen} className="border-t border-border/70">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 min-h-[52px] px-4 sm:px-5 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/30 active:bg-muted/40 transition-colors">
                <span>Manual sync</span>
                {advancedCloudOpen ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="divide-y divide-border/70 border-t border-border/70">
                  <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium text-foreground">Upload local data to cloud</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!syncControlsEnabled || !!cloudBusyAction}
                      onClick={() =>
                        void runSyncedAction(
                          'upload local to cloud',
                          'push',
                          () => pushLocalIntoCloud(user!.id),
                        )
                      }
                    >
                      {cloudBusyAction === 'push' ? 'Working…' : 'Upload'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
                    <span className="text-sm font-medium text-foreground">Download cloud data</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!syncControlsEnabled || !!cloudBusyAction}
                      onClick={() =>
                        void runSyncedAction(
                          'download cloud data',
                          'pull',
                          () => pullCloudIntoLocal(user!.id),
                        )
                      }
                    >
                      {cloudBusyAction === 'pull' ? 'Working…' : 'Download'}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="section-header mb-2.5">Appearance</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <div className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                  <Palette className="w-4 h-4 text-primary shrink-0" />
                </div>
                <div>
                  <span className="text-card-title text-foreground block">Theme</span>
                  <span className="text-secondary text-[13px]">Light, dark, or follow system</span>
                </div>
              </div>
              <Select
                value={theme ?? 'system'}
                onValueChange={(value: ThemeValue) => setTheme(value)}
              >
                <SelectTrigger className="w-[120px] shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="section-header mb-2.5">Notifications</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <div className="divide-y divide-border/70">
              <label htmlFor="feeding-reminders" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 cursor-pointer active:bg-muted/30 transition-colors duration-200">
                <div className="min-w-0 flex-1">
                  <span className="text-card-title text-foreground block">Feeding Reminders</span>
                  <span className="text-secondary text-[13px]">When feedings are due</span>
                </div>
                <Switch id="feeding-reminders" checked={settings.feedingReminders} onCheckedChange={() => handleToggle('feedingReminders')} />
              </label>
              <label htmlFor="overdue-reminders" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 cursor-pointer active:bg-muted/30 transition-colors duration-200">
                <div className="min-w-0 flex-1">
                  <span className="text-card-title text-foreground block">Overdue Reminders</span>
                  <span className="text-secondary text-[13px]">About overdue tasks</span>
                </div>
                <Switch id="overdue-reminders" checked={settings.overdueReminders} onCheckedChange={() => handleToggle('overdueReminders')} />
              </label>
            </div>
            <p className="text-caption px-4 sm:px-5 pb-4 pt-2">
              Notifications require permission. In-app reminders show on the Today screen.
            </p>
          </div>
        </section>

        {/* AI Assistant */}
        <section id="reptilita-plans-assistant">
          <h2 className="section-header mb-2.5">AI Assistant</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden divide-y divide-border/70 border border-border/60 shadow-[var(--shadow-card)]">
            <div className="p-4 sm:p-5">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Bot className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-card-title text-foreground">Assistant</span>
                    {isPro ? (
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Pro
                      </span>
                    ) : (
                      <ProBadge />
                    )}
                  </div>
                  <p className="text-caption text-muted-foreground">
                    Current plan:{' '}
                    <span className="font-medium text-foreground">{isPro ? 'Pro' : 'Free'}</span>
                  </p>
                  <p className="text-secondary text-[13px] leading-snug">
                    {isPro
                      ? 'Smart AI assistant unlocked — cloud-powered replies when you’re signed in with Pro on your profile.'
                      : 'Basic assistant summarizes animals, tasks, and journal entries stored on this device — no cloud AI.'}
                  </p>
                  {!isPro && (
                    <p className="text-secondary text-[13px] leading-snug">
                      Upgrade to unlock smart AI assistant
                    </p>
                  )}
                  {isPro && FEATURE_SMART_INSIGHTS_PLACEHOLDER && (
                    <p className="text-muted-foreground text-[13px] leading-snug">
                      Smart summaries for your herd are rolling out progressively on Pro.
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Link
              to="/ai"
              className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 hover:bg-muted/25 active:bg-muted/35 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-card-title text-foreground block">Open assistant</span>
                  <span className="text-secondary text-[13px]">
                    {isPro ? 'Smart assistant with cloud AI' : 'Local basic assistant chat'}
                  </span>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Open
              </Button>
            </Link>
          </div>
        </section>

        {/* Plans (monetization preview — no storefront yet) */}
        <section id="reptilita-plans">
          <h2 className="section-header mb-2.5">What’s included</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="premium-surface rounded-[var(--radius-xl)] border border-border/60 p-4 sm:p-5 space-y-3">
              <p className="text-card-title text-foreground">Free</p>
              <ul className="space-y-2 text-[13px] text-secondary leading-snug list-none">
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Care for plenty of animals (limits may apply later).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Full cloud sync when you&apos;re signed in.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Backup, export, and import — keep portable copies anytime.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Basic assistant experiences without a subscription.</span>
                </li>
              </ul>
            </div>
            <div className="premium-surface-elevated rounded-[var(--radius-xl)] border border-amber-500/25 bg-amber-500/[0.04] p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <p className="text-card-title text-foreground">Reptilita Pro</p>
                <ProBadge />
              </div>
              <ul className="space-y-2 text-[13px] text-secondary leading-snug list-none">
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Smart AI assistant with deep context from your collection.</span>
                </li>
                <li className="space-y-1">
                  <div className="flex gap-2">
                    <span className="text-foreground shrink-0" aria-hidden>
                      ·
                    </span>
                    <div className="min-w-0 space-y-1">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span>Advanced genetics insights</span>
                        <ProBadge className="normal-case tracking-normal px-2 py-0.5 text-[10px]" />
                      </span>
                      <p className="text-muted-foreground text-[12px] leading-snug">
                        Richer lineage and probability tooling — arriving on Pro.
                      </p>
                    </div>
                  </div>
                </li>
                <li className="flex gap-2">
                  <span className="text-foreground shrink-0" aria-hidden>
                    ·
                  </span>
                  <span>Herd-level smart summaries and insights.{FEATURE_SMART_INSIGHTS_PLACEHOLDER ? ' Coming soon.' : ''}</span>
                </li>
              </ul>
              <Button variant="secondary" size="sm" disabled className="w-full opacity-80">
                Pro checkout — coming soon
              </Button>
            </div>
          </div>
        </section>

        {/* Backup (offline JSON snapshot) */}
        <section>
          <h2 className="section-header mb-2.5">Backup</h2>
          <p className="text-caption mb-2 -mt-1 leading-relaxed">
            Backup is a portable JSON file of your animals, care tasks and journal entries, breeding notes, reminders, and
            app preferences (anything the export includes for your build). Creating and restoring backup files works{' '}
            <span className="text-foreground/90 font-medium">fully offline</span>. When you import, existing rows merge by{' '}
            <span className="text-foreground/90 font-medium">newest timestamps</span> so data from two sources can coexist
            intelligently—double-check unfamiliar imports. Private credentials{' '}
            <span className="text-foreground/90 font-medium">stay on-device</span> and are not placed in backups. To keep multiple devices
            aligned that are signed into the same account, use{' '}
            <span className="text-foreground/90 font-medium">Cloud Sync</span> above in addition to occasional backups.
          </p>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden divide-y divide-border/70 mb-6">
            <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Database className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium block">Full backup (.json)</span>
                  <span className="text-sm text-muted-foreground">Animals, tasks, journal, breeding, settings</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void handleBackupExport()} disabled={backupBusy}>
                {backupBusy ? 'Preparing…' : <><Download className="w-4 h-4 mr-1" />Export</>}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FolderInput className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium block">Restore from backup (.json)</span>
                  <span className="text-sm text-muted-foreground">Merged by newest timestamps; avoids duplicate IDs where possible.</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => importInputRef.current?.click()} disabled={applyingImport}>
                <Upload className="w-4 h-4 mr-1" />Choose file
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => void handleImportPick(e.target.files)}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-header mb-2.5 mt-2">Exports</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <div className="divide-y divide-border/70">
              <div className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="text-card-title text-foreground block">Export Schedule (.ics)</span>
                    <span className="text-secondary text-[13px]">Next 30 days to calendar</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleExportICS} disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="text-card-title text-foreground block">Export PDF Report</span>
                    <span className="text-secondary text-[13px]">Care/vet card, last 30 days</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleExportPDF} disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Breeding Tools */}
        <section>
          <h2 className="section-header mb-2.5">Breeding Tools</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <Link to="/genetics" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 hover:bg-muted/20 active:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Calculator className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-card-title text-foreground block">Genetics calculator</span>
                  <span className="text-secondary text-[13px]">Predict offspring outcomes · deeper tools on Pro</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Open</Button>
            </Link>
          </div>
        </section>

        {/* Sample dataset — gated off in production unless VITE_ENABLE_SAMPLE_DATASETS */}
        {sampleGate && (
        <section>
          <h2 className="section-header mb-2.5">Advanced</h2>
          <p className="text-caption mb-2.5 -mt-1">Optional tools for testing and screenshots. Not required for everyday use.</p>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <label htmlFor="sample-dataset-toggle" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <span className="font-medium block">Sample dataset</span>
                  <span className="text-sm text-muted-foreground">
                    Loads example animals, schedules, journal entries, pairings (local-only)
                  </span>
                </div>
              </div>
              <Switch
                id="sample-dataset-toggle"
                checked={!!settings.expoDemoMode}
                onCheckedChange={() => handleToggle('expoDemoMode')}
                disabled={seedingExpo}
              />
            </label>
            {settings.expoDemoMode && (
              <>
                <Separator />
                <div className="divide-y divide-border/70">
                  <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Share2 className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-medium block">Share promo card</span>
                        <span className="text-sm text-muted-foreground">PDF with QR code</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleSharePromo} disabled={exportingPromo}>
                      {exportingPromo ? 'Generating…' : 'Generate'}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                      <div>
                        <span className="font-medium block">Clear sample data</span>
                        <span className="text-sm text-muted-foreground">Removes only tagged sample rows</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        try {
                          await clearDemoData();
                          await updateSettings({ expoDemoMode: false });
                          setSettings(prev => ({ ...prev, expoDemoMode: false }));
                          toast.success('Sample data cleared');
                          setTimeout(() => window.location.reload(), 800);
                        } catch (e) {
                          console.error('Failed to clear sample data:', e);
                          toast.error('Failed to clear sample data');
                        }
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </>
            )}
            <p className="text-caption px-4 sm:px-5 pb-4 pt-2">
              When the sample dataset is on, peripheral preview integrations stay minimal so the core workflow stays in focus.
            </p>
          </div>
        </section>
        )}

        {/* Data */}
        {sampleGate && (
        <section>
          <h2 className="section-header mb-2.5">Data</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <div className="divide-y divide-border/70">
              <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Database className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-medium block">Extended sample pack</span>
                    <span className="text-sm text-muted-foreground">Extra reptiles and events for edge-case testing</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLoadDemo} disabled={loadingDemo}>
                  {loadingDemo ? 'Loading…' : 'Load'}
                </Button>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Danger Zone */}
        <section>
          <h2 className="section-header mb-2.5 text-destructive">Danger Zone</h2>
          <div className="rounded-[var(--radius-xl)] border border-destructive/35 bg-destructive/5 overflow-hidden">
            <div className="divide-y divide-destructive/20">
              <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3 active:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                  <div>
                    <span className="font-medium block">Clear All Data</span>
                    <span className="text-sm text-muted-foreground">
                      Removes reptiles, care events, schedules, and related data stored{' '}
                      <span className="text-foreground/90">on this device only</span>. Signed-in copies in the cloud are not
                      deleted by this action.
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => setClearDataOpen(true)}
                >
                  Clear Data
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="section-header mb-2.5">About</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-medium block">Reptilita</span>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Version 2.1.0 · Premium reptile &amp; amphibian care companion
                </p>
                <p className="text-xs text-muted-foreground/90 mt-1.5">
                  For keepers, breeders, rescue teams, and enthusiasts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AlertDialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) setImportReview(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Import backup?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-muted-foreground text-sm pt-2">
                {importReview && (
                  <p>
                    Merging:&nbsp;
                    <span className="text-foreground font-medium tabular-nums">{importReview.reptiles.length}</span>
                    {' '}animal{importReview.reptiles.length === 1 ? '' : 's'},{' '}
                    <span className="text-foreground font-medium tabular-nums">{importReview.scheduleItems.length}</span>
                    {' '}schedule item{importReview.scheduleItems.length === 1 ? '' : 's'},{' '}
                    <span className="text-foreground font-medium tabular-nums">{importReview.careEvents.length}</span>
                    {' '}journal entr{importReview.careEvents.length === 1 ? 'y' : 'ies'}. Existing rows with the same id are
                    merged by newest timestamps; animals with the same name and species may be combined.
                  </p>
                )}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                  <span className="text-foreground text-sm">Upload to cloud after import</span>
                  <Switch
                    checked={uploadAfterImport}
                    onCheckedChange={setUploadAfterImport}
                    disabled={!user || !syncControlsEnabled}
                  />
                </div>
                {(!user || !syncControlsEnabled) && (
                  <p className="text-xs">Sign in with network access to enable cloud upload after import.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applyingImport}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmImport();
              }}
              disabled={applyingImport}
            >
              {applyingImport ? 'Importing…' : 'Import'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Data Confirmation */}
      <AlertDialog open={clearDataOpen} onOpenChange={setClearDataOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all local data?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  This will permanently erase animals, journal entries, tasks, reminders, and other app data saved in local
                  storage on <span className="text-foreground font-medium">this device</span>.
                </p>
                <p>
                  Cloud copies linked to your account are <span className="text-foreground font-medium">not</span> deleted
                  here; use cloud or account tooling separately if your project supports that later. This cannot be undone
                  locally.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingData}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearData} disabled={clearingData} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {clearingData ? 'Clearing...' : 'Clear All Data'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign Out Confirmation */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be signed out of your account. Local animal data on this device is not removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageMotion>
  );
}
