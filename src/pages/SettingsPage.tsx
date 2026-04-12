import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Download, FileText, Calendar, Database, Info, Trash2, Calculator, Key, Eye, EyeOff, Bot, Share2, Sparkles, Globe, User, LogOut, Palette } from 'lucide-react';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/PageHeader';
import { PageMotion } from '@/components/motion/PageMotion';
import { DemoBadge } from '@/components/DemoBadge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
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
} from '@/lib/storage';
import { generateICS } from '@/lib/export/ics';
import { generatePDFReport } from '@/lib/export/pdf';
import { downloadPromoCard } from '@/lib/export/promoCard';
import { validateApiKey } from '@/lib/ai/openaiClient';
import { getApiKey, setApiKey, removeApiKey, isNativePlatform } from '@/lib/ai/secureKey';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { AppSettings } from '@/types';

type ThemeValue = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeValue; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsPage() {
  const navigate = useNavigate();
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
  
  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [hasApiKeyState, setHasApiKeyState] = useState(false);
  const [webConfirmOpen, setWebConfirmOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState('');

  // Auth state
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [signOutOpen, setSignOutOpen] = useState(false);

  // Expo demo mode
  const [seedingExpo, setSeedingExpo] = useState(false);
  const [exportingPromo, setExportingPromo] = useState(false);

  // Share link base URL
  const [publicBaseUrl, setPublicBaseUrl] = useState('');
  const [savingPublicUrl, setSavingPublicUrl] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await getSettings();
        setSettings(stored);
        setPublicBaseUrl(stored.publicBaseUrl || '');
        const key = await getApiKey();
        setHasApiKeyState(!!key);
        if (key) setApiKeyInput('sk-••••••••••••••••');
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
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

  const doSaveApiKey = async (key: string) => {
    setSavingApiKey(true);
    try {
      const isValid = await validateApiKey(key);
      if (!isValid) {
        toast.error('Invalid API key. Please check and try again.');
        return;
      }
      await setApiKey(key);
      setHasApiKeyState(true);
      setApiKeyInput('sk-••••••••••••••••');
      setShowApiKey(false);
      toast.success(isNativePlatform() ? 'API key saved in secure storage' : 'API key saved');
    } catch (error) {
      console.error('Failed to save API key:', error);
      toast.error('Failed to save API key');
    } finally {
      setSavingApiKey(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput || apiKeyInput.startsWith('sk-••')) {
      toast.error('Please enter a valid API key');
      return;
    }
    if (!isNativePlatform()) {
      setPendingKey(apiKeyInput);
      setWebConfirmOpen(true);
    } else {
      await doSaveApiKey(apiKeyInput);
    }
  };

  const handleWebConfirm = async () => {
    setWebConfirmOpen(false);
    await doSaveApiKey(pendingKey);
    setPendingKey('');
  };

  const handleRemoveApiKey = async () => {
    try {
      await removeApiKey();
      setHasApiKeyState(false);
      setApiKeyInput('');
      toast.success('API key removed');
    } catch (error) {
      console.error('Failed to remove API key:', error);
      toast.error('Failed to remove API key');
    }
  };

  const handleToggle = async (key: keyof AppSettings) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    
    try {
      await updateSettings({ [key]: newValue });

      // Handle expo demo mode toggle
      if (key === 'expoDemoMode' && newValue) {
        setSeedingExpo(true);
        try {
          await seedExpoDemo();
          toast.success('Expo demo data loaded!');
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
      toast.success('Demo data loaded! Refresh to see changes.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to load demo data:', error);
      toast.error('Failed to load demo data');
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

  if (loading || authLoading) {
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
        rightContent={settings.expoDemoMode ? <DemoBadge /> : undefined}
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
        <section>
          <h2 className="section-header mb-2.5">AI Assistant</h2>
          <div className="bg-card/95 backdrop-blur-[2px] rounded-[var(--radius-xl)] border border-border/60 shadow-[var(--shadow-card)] overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium">OpenAI API Key</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Add your API key to use the AI Assistant. {isNativePlatform() 
                  ? 'Stored securely in device Keychain/Keystore.' 
                  : 'Stored locally on your device.'}
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="pr-10 bg-muted/30"
                  />
                  <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button onClick={handleSaveApiKey} disabled={savingApiKey || !apiKeyInput || apiKeyInput.startsWith('sk-••')} className="shrink-0">
                  {savingApiKey ? 'Saving…' : 'Save'}
                </Button>
              </div>
              {hasApiKeyState && (
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <span className="text-sm text-muted-foreground">Key configured</span>
                  <Button variant="ghost" size="sm" onClick={handleRemoveApiKey} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Remove Key
                  </Button>
                </div>
              )}
              {!isNativePlatform() && (
                <p className="text-xs text-muted-foreground p-3 bg-muted/40 rounded-lg">
                  ⚠️ On web, your key is stored in browser storage. Use the native app for Keychain/Keystore storage.
                </p>
              )}
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="text-xs font-medium text-foreground mb-1">Cost control</p>
                <p className="text-xs text-muted-foreground">
                  GPT-4o Mini is cost-efficient. Limit context in the Assistant to reduce usage.
                </p>
              </div>
            </div>
            <Separator />
            <Link to="/ai" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 hover:bg-muted/20 active:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <Bot className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="text-card-title text-foreground block">Open AI Assistant</span>
                  <span className="text-secondary text-[13px]">AI-powered care advice</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Open</Button>
            </Link>
          </div>
        </section>

        {/* Export */}
        <section>
          <h2 className="section-header mb-2.5">Export</h2>
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

        {/* Sharing */}
        <section>
          <h2 className="section-header mb-2.5">Sharing</h2>
          <div className="glass-panel rounded-[var(--radius-xl)] p-4 sm:p-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-primary" />
                <span className="font-medium">Share Link Base URL (optional)</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                If you host this web app, set the base URL used in copied links. Animal data is still stored on this device unless you export or share an image.
              </p>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://my-reptile-app.example.com"
                  value={publicBaseUrl}
                  onChange={(e) => setPublicBaseUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingPublicUrl}
                  onClick={async () => {
                    setSavingPublicUrl(true);
                    try {
                      await updateSettings({ publicBaseUrl: publicBaseUrl.trim() || undefined });
                      toast.success(publicBaseUrl.trim() ? 'Share link base URL saved' : 'Share link base URL cleared');
                    } catch {
                      toast.error('Failed to save URL');
                    } finally {
                      setSavingPublicUrl(false);
                    }
                  }}
                >
                  {savingPublicUrl ? 'Saving…' : 'Save'}
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
                    <span className="text-card-title text-foreground block">Genetics Calculator</span>
                    <span className="text-secondary text-[13px]">Predicted offspring genetics</span>
                </div>
              </div>
              <Button variant="ghost" size="sm">Open</Button>
            </Link>
          </div>
        </section>

        {/* Expo Demo Mode */}
        <section>
          <h2 className="section-header mb-2.5">Expo Mode</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <label htmlFor="expo-demo" className="flex items-center justify-between gap-4 min-h-[56px] px-4 sm:px-5 py-3 cursor-pointer">
              <div className="flex items-center gap-3 min-w-0">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <span className="font-medium block">Expo Demo Mode</span>
                  <span className="text-sm text-muted-foreground">Demo data for presentations</span>
                </div>
              </div>
              <Switch
                id="expo-demo"
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
                        <span className="font-medium block">Share Promo Card</span>
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
                        <span className="font-medium block">Reset Demo Data</span>
                        <span className="text-sm text-muted-foreground">Remove demo data only</span>
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
                          toast.success('Demo data cleared');
                          setTimeout(() => window.location.reload(), 800);
                        } catch (e) {
                          console.error('Failed to clear demo data:', e);
                          toast.error('Failed to clear demo data');
                        }
                      }}
                    >
                      Reset
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="section-header mb-2.5">Data</h2>
          <div className="premium-surface rounded-[var(--radius-xl)] overflow-hidden">
            <div className="divide-y divide-border/70">
              <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Database className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <span className="font-medium block">Load Demo Data</span>
                    <span className="text-sm text-muted-foreground">Sample reptiles and events</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLoadDemo} disabled={loadingDemo}>
                  {loadingDemo ? 'Loading…' : 'Load Demo'}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-4 min-h-[52px] px-4 sm:px-5 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Trash2 className="w-4 h-4 text-destructive shrink-0" />
                  <div>
                    <span className="font-medium block">Clear All Data</span>
                    <span className="text-sm text-muted-foreground">Permanently delete everything</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setClearDataOpen(true)}>
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

      {/* Clear Data Confirmation */}
      <AlertDialog open={clearDataOpen} onOpenChange={setClearDataOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all your reptiles, care events, and schedules. This action cannot be undone.
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
