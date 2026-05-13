import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, AlertTriangle, Loader2, ChevronDown, ChevronUp, FileText, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { estimateTokens } from '@/lib/ai/openaiClient';
import { AVAILABLE_MODELS, DEFAULT_MODEL, estimateCostUsd, type ModelId } from '@/lib/ai/models';
import { REPTILE_CARE_SYSTEM_PROMPT } from '@/lib/ai/systemPrompt';
import {
  buildContext,
  getReptileOptions,
  getPairingOptions,
  type ContextOptions,
} from '@/lib/ai/contextBuilder';
import {
  buildAssistantAppContext,
  type AssistantAppContextV1,
} from '@/lib/ai/assistantAppContext';
import {
  buildConversationHistoryForEdge,
  loadProAiChatMessages,
  saveProAiChatMessages,
  clearProAiChatStorage,
  PRO_AI_CHAT_MAX_STORED_MESSAGES,
} from '@/lib/ai/assistantChatMemory';
import { usePlanStatus } from '@/hooks/usePlanStatus';
import { streamProAssistantReply } from '@/lib/ai/proAssistantStream';
import { streamBasicAssistantReply } from '@/lib/ai/basicAssistant';
import { extractActions, stripActionBlocks, type AIAction } from '@/lib/ai/actionParser';
import { QuickScanButtons } from '@/components/QuickScanButtons';
import { ActionReviewCard } from '@/components/ActionReviewCard';
import { createCareEvent } from '@/lib/storage/events';
import { getDB, generateId, getToday } from '@/lib/storage/db';
import { getAllReptiles } from '@/lib/storage/reptiles';
import type { AIMessage, ScheduleItem } from '@/types';

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const initialReptileId = searchParams.get('reptileId') || '';
  const { isPro, isLoadingPlan } = usePlanStatus();

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const memoryMessageCount = useMemo(
    () =>
      messages.filter(
        (m) => m.role === 'user' || (m.role === 'assistant' && m.content.trim().length > 0),
      ).length,
    [messages],
  );
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelId>(DEFAULT_MODEL);
  
  // Context options
  const [contextOpen, setContextOpen] = useState(!!initialReptileId);
  const [selectedReptile, setSelectedReptile] = useState<string>(initialReptileId);
  const [selectedPairing, setSelectedPairing] = useState<string>('');
  const [includeJournal, setIncludeJournal] = useState(false);
  const [includeUpcomingTasks, setIncludeUpcomingTasks] = useState(false);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeWeights, setIncludeWeights] = useState(true);
  
  // Options data
  const [reptileOptions, setReptileOptions] = useState<{ id: string; name: string; species: string }[]>([]);
  const [pairingOptions, setPairingOptions] = useState<{ id: string; label: string }[]>([]);
  const [reptileNameMap, setReptileNameMap] = useState<Map<string, string>>(new Map());
  
  // Token estimate + Pro structured snapshot meta (for indicator)
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [contextSnapMeta, setContextSnapMeta] = useState<AssistantAppContextV1['meta'] | null>(null);
  
  // Actions
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [applyingActions, setApplyingActions] = useState(false);
  
  // Streaming ref
  const streamingRef = useRef<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const [reptiles, pairings, allReptiles] = await Promise.all([
        getReptileOptions(),
        getPairingOptions(),
        getAllReptiles(),
      ]);
      setReptileOptions(reptiles);
      setPairingOptions(pairings);
      setReptileNameMap(new Map(allReptiles.map(r => [r.id, r.name])));
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!isPro) return;
    let cancelled = false;
    void loadProAiChatMessages().then((loaded) => {
      if (cancelled) return;
      setMessages((prev) => (prev.length > 0 ? prev : loaded));
    });
    return () => {
      cancelled = true;
    };
  }, [isPro]);

  useEffect(() => {
    if (!isPro || isLoading) return;
    if (messages.length === 0) return;
    void saveProAiChatMessages(messages);
  }, [messages, isLoading, isPro]);

  // Token estimation + structured context preview (Pro)
  useEffect(() => {
    const updateTokenEstimate = async () => {
      const clientHints = {
        page: 'AI Assistant',
        selectedReptileId:
          selectedReptile && selectedReptile !== '__none__' ? selectedReptile : null,
        selectedPairingId:
          selectedPairing && selectedPairing !== '__none__' ? selectedPairing : null,
      };

      const options: ContextOptions = {
        includeReptile: selectedReptile && selectedReptile !== '__none__' ? selectedReptile : undefined,
        includePairing: selectedPairing && selectedPairing !== '__none__' ? selectedPairing : undefined,
        includeJournal,
        includeUpcomingTasks,
        rangeDays,
        includeNotes,
        includeWeights,
        clientHints,
      };

      const systemTokens = estimateTokens(REPTILE_CARE_SYSTEM_PROMPT);

      if (!isPro) {
        setContextSnapMeta(null);
        if (
          (selectedReptile && selectedReptile !== '__none__') ||
          (selectedPairing && selectedPairing !== '__none__') ||
          includeJournal ||
          includeUpcomingTasks
        ) {
          const context = await buildContext(options);
          setTokenEstimate(context.estimatedTokens + systemTokens);
        } else {
          setTokenEstimate(systemTokens);
        }
        return;
      }

      const { appContext } = await buildAssistantAppContext({
        ...options,
        currentPage: 'ai-assistant',
      });
      setContextSnapMeta(appContext.meta);

      const hasTextSections =
        (selectedReptile && selectedReptile !== '__none__') ||
        (selectedPairing && selectedPairing !== '__none__') ||
        includeJournal ||
        includeUpcomingTasks;

      const snapshotTokens = estimateTokens(JSON.stringify(appContext));
      if (hasTextSections) {
        const context = await buildContext(options);
        setTokenEstimate(context.estimatedTokens + snapshotTokens + systemTokens);
      } else {
        setTokenEstimate(snapshotTokens + systemTokens);
      }
    };
    void updateTokenEstimate();
  }, [
    isPro,
    selectedReptile,
    selectedPairing,
    includeJournal,
    includeUpcomingTasks,
    rangeDays,
    includeNotes,
    includeWeights,
  ]);
  
  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (overrideText?: string) => {
    if (isLoading) return;

    const rawInput = (overrideText ?? inputText).trim();
    if (!rawInput) return;

    const userLine = rawInput;
    const userDisplayContent = userLine;

    const conversationHistoryForEdge = isPro ? buildConversationHistoryForEdge(messages) : undefined;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userDisplayContent,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    if (!overrideText) setInputText('');
    setIsLoading(true);
    setPendingActions([]);
    
    // Create placeholder assistant message for streaming
    const assistantId = crypto.randomUUID();
    const assistantMessage: AIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);
    streamingRef.current = '';

    try {
      if (!isPro) {
        await streamBasicAssistantReply(
          userLine,
          {
            focusReptileId:
              selectedReptile && selectedReptile !== '__none__' ? selectedReptile : undefined,
          },
          (chunk) => {
            streamingRef.current += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: streamingRef.current } : m,
              ),
            );
          },
          () => {
            setIsLoading(false);
          },
          (err) => {
            toast.error(err.message);
            setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMessage.id));
            setIsLoading(false);
          },
        );
        return;
      }

      const clientHints = {
        page: 'AI Assistant',
        selectedReptileId:
          selectedReptile && selectedReptile !== '__none__' ? selectedReptile : null,
        selectedPairingId:
          selectedPairing && selectedPairing !== '__none__' ? selectedPairing : null,
      };

      const contextOptions: ContextOptions = {
        includeReptile: selectedReptile && selectedReptile !== '__none__' ? selectedReptile : undefined,
        includePairing: selectedPairing && selectedPairing !== '__none__' ? selectedPairing : undefined,
        includeJournal,
        includeUpcomingTasks,
        rangeDays,
        includeNotes,
        includeWeights,
        clientHints,
      };

      const [context, { appContext, animalsMinimal }] = await Promise.all([
        buildContext(contextOptions),
        buildAssistantAppContext({
          ...contextOptions,
          currentPage: 'ai-assistant',
          visionAttachmentThisMessage: false,
        }),
      ]);

      const animalName =
        selectedReptile && selectedReptile !== '__none__'
          ? reptileOptions.find((r) => r.id === selectedReptile)?.name ?? null
          : null;

      await streamProAssistantReply(
        {
          userMessage: userLine,
          contextSummary: context.text?.trim(),
          animalName,
          animals: animalsMinimal,
          appContext: appContext as unknown as Record<string, unknown>,
          conversationHistory: conversationHistoryForEdge,
          preferEdgeApi: true,
          onFallbackInfo: (info) => {
            if (!import.meta.env.DEV) return;
            console.warn('[ai-assistant] Cloud path fell back to local preview', {
              reason: info.reason ?? 'Unknown recoverable error',
              statusCode: info.statusCode ?? null,
              errorBody: info.errorBody ?? null,
            });
          },
        },
        (chunk) => {
          streamingRef.current += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamingRef.current } : m,
            ),
          );
        },
        () => {
          const finalText = streamingRef.current;
          const allReptileIds = reptileOptions.map((r) => r.id);
          const actions = extractActions(finalText, allReptileIds);
          if (actions.length > 0) {
            setPendingActions(actions);
          }
          setIsLoading(false);
        },
        (err) => {
          toast.error(err.message);
          setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMessage.id));
          setIsLoading(false);
        },
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== assistantId && m.id !== userMessage.id));
      setIsLoading(false);
    }
  }, [
    messages,
    inputText,
    isLoading,
    isPro,
    selectedReptile,
    selectedPairing,
    includeJournal,
    includeUpcomingTasks,
    rangeDays,
    includeNotes,
    includeWeights,
    reptileOptions,
  ]);

  const handleQuickScan = useCallback((prompt: string) => {
    if (!isPro) return;
    if (!selectedReptile || selectedReptile === '__none__') {
      toast.error('Select an animal first to use Quick Scan.');
      return;
    }
    handleSend(prompt);
  }, [selectedReptile, handleSend, isPro]);

  const handleApplyActions = async () => {
    setApplyingActions(true);
    try {
      const db = await getDB();
      let scheduleCount = 0;
      let eventCount = 0;

      for (const action of pendingActions) {
        if (action.type === 'schedule') {
          const item: ScheduleItem = {
            id: generateId(),
            reptileId: action.reptileId,
            taskType: action.taskType,
            frequencyDays: action.frequencyDays,
            nextDueDate: action.nextDueDate,
            autoGenerated: false,
            updatedAt: new Date().toISOString(),
          };
          await db.put('scheduleItems', item);
          scheduleCount++;
        } else if (action.type === 'event') {
          await createCareEvent({
            reptileId: action.reptileId,
            eventType: action.eventType,
            eventDate: action.eventDate,
            details: action.details,
            weightGrams: action.weightGrams,
            supplements: action.supplements,
          });
          eventCount++;
        }
      }

      const parts: string[] = [];
      if (scheduleCount) parts.push(`${scheduleCount} schedule item${scheduleCount > 1 ? 's' : ''}`);
      if (eventCount) parts.push(`${eventCount} care event${eventCount > 1 ? 's' : ''}`);
      toast.success(`Applied: ${parts.join(' and ')}`);
      setPendingActions([]);
    } catch (error) {
      console.error('Failed to apply actions:', error);
      toast.error('Failed to apply some actions');
    } finally {
      setApplyingActions(false);
    }
  };

  const handleExportVetPdf = async () => {
    if (!selectedReptile) {
      toast.error('Select a reptile first');
      return;
    }
    try {
      const name = reptileNameMap.get(selectedReptile) || 'animal';
      const { downloadVetPdf } = await import('@/lib/export/vetPdf');
      await downloadVetPdf(selectedReptile, name, { rangeDays });
      toast.success('Care summary ready — check the share sheet or downloads');
    } catch (error) {
      console.error('Failed to export care summary PDF:', error);
      const msg = error instanceof Error ? error.message : 'Failed to export PDF';
      toast.error(msg);
    }
  };
  
  const handleClearChat = () => {
    setMessages([]);
    setPendingActions([]);
    if (isPro) void clearProAiChatStorage();
    toast.success('Chat cleared');
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="page-container flex flex-col h-screen">
      <PageHeader title="AI Assistant" />
      
      {/* Disclaimer */}
      <div className="mx-4 mt-2 p-3 bg-warning/10 border border-warning/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
          <p className="text-xs text-foreground/80">
            <strong>Disclaimer:</strong>{' '}
            {isPro
              ? 'Smart assistant answers are educational only — not veterinary advice.'
              : 'Basic assistant shows local summaries only (no cloud AI). Not a substitute for veterinary care.'}{' '}
            Always consult a qualified exotic pet vet for health concerns.
          </p>
        </div>
      </div>

      {isLoadingPlan ? (
        <p className="mx-4 mt-3 text-xs text-muted-foreground">Loading plan status…</p>
      ) : isPro ? (
        <div className="mx-4 mt-3 rounded-lg border border-border/55 bg-muted/35 px-3 py-2.5 space-y-1.5">
          <p className="text-[11px] font-medium text-foreground">Smart assistant (Pro)</p>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Answers stream from Reptilita&apos;s Edge Function with a server-side model key. The assistant is grounded in
            data already saved in this app: animal profiles (including profile photos when stored as accessible URLs),
            tasks, schedules, journal entries, breeding records, and notes — not in ad-hoc uploads from this screen.
          </p>
          {contextSnapMeta ? (
            <div className="pt-1.5 mt-1.5 border-t border-border/50 space-y-0.5">
              <p className="text-[10px] font-medium text-foreground/90">Context included (next message)</p>
              <p className="text-[10px] text-muted-foreground leading-snug">
                {contextSnapMeta.animalCount} animals · Today {contextSnapMeta.tasksDueToday} · Overdue{' '}
                {contextSnapMeta.tasksOverdue} · Next 7d {contextSnapMeta.tasksUpcoming7d} · Journal (14d){' '}
                {contextSnapMeta.journalRecent14d} · Images {contextSnapMeta.imageUrlsAvailable} URL /{' '}
                {contextSnapMeta.imagesLocalOnly} local-only
              </p>
              <p className="text-[10px] text-muted-foreground/85">
                Journal {includeJournal ? 'on' : 'off'} · Tasks {includeUpcomingTasks ? 'on' : 'off'}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mx-4 mt-3 rounded-[var(--radius-xl)] border border-border/60 bg-muted/25 p-4 shadow-[var(--shadow-card)] space-y-3">
          <div className="flex gap-2 items-start">
            <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-foreground">Basic assistant · Local summary</p>
              <p className="text-xs text-muted-foreground leading-snug">
                Replies use only data stored on this device — animals, tasks, journal entries, schedules, and profile
                fields. Add or change photos from each animal&apos;s profile; the assistant reads saved app data, not
                uploads from here.
              </p>
              <p className="text-xs text-muted-foreground leading-snug">
                Upgrade to Pro for the Smart assistant when your account has Pro enabled.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="/settings#reptilita-plans">View plans &amp; Pro features</Link>
          </Button>
        </div>
      )}

      {isPro ? (
        <>
      {/* Quick Scan */}
      <div className="mx-4 mt-2">
        <QuickScanButtons onScan={handleQuickScan} disabled={isLoading} />
      </div>
      
      {/* Context Options */}
      <Collapsible open={contextOpen} onOpenChange={setContextOpen} className="mx-4 mt-2">
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              Context Options
              {tokenEstimate > 0 && (
                <span className="text-xs text-muted-foreground">
                  (~{tokenEstimate} tokens • {estimateCostUsd(tokenEstimate, selectedModel).label})
                </span>
              )}
            </span>
            {contextOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 p-3 bg-card border border-border rounded-lg">
          {/* Reptile Selector */}
          <div className="space-y-1">
            <Label className="text-sm">Include Reptile</Label>
            <Select value={selectedReptile} onValueChange={setSelectedReptile}>
              <SelectTrigger>
                <SelectValue placeholder="Select an animal..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {reptileOptions.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Pairing Selector */}
          <div className="space-y-1">
            <Label className="text-sm">Include Pairing</Label>
            <Select value={selectedPairing} onValueChange={setSelectedPairing}>
              <SelectTrigger>
                <SelectValue placeholder="Select a pairing..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {pairingOptions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Range */}
          <div className="space-y-1">
            <Label className="text-sm">Time Range</Label>
            <Select value={String(rangeDays)} onValueChange={(v) => setRangeDays(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Toggle Options */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-journal" className="text-sm">Include Journal</Label>
            <Switch id="include-journal" checked={includeJournal} onCheckedChange={setIncludeJournal} />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="include-tasks" className="text-sm">Include Upcoming Tasks</Label>
            <Switch id="include-tasks" checked={includeUpcomingTasks} onCheckedChange={setIncludeUpcomingTasks} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-notes" className="text-sm">Include Notes</Label>
            <Switch id="include-notes" checked={includeNotes} onCheckedChange={setIncludeNotes} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="include-weights" className="text-sm">Include Weights</Label>
            <Switch id="include-weights" checked={includeWeights} onCheckedChange={setIncludeWeights} />
          </div>
          
          {/* Model Selector */}
          <div className="space-y-1 pt-2 border-t border-border">
            <Label className="text-sm">Model</Label>
            <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Care summary PDF (for your veterinarian) */}
          {selectedReptile && selectedReptile !== '__none__' && (
            <div className="pt-2 border-t border-border">
              <Button variant="outline" size="sm" className="w-full" onClick={handleExportVetPdf}>
                <FileText className="w-4 h-4 mr-2" />
                Export care summary (PDF)
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
        </>
      ) : (
        <div className="mx-4 mt-3 space-y-2">
          <Label className="text-xs text-muted-foreground">Optional focus animal</Label>
          <Select value={selectedReptile || '__none__'} onValueChange={setSelectedReptile}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder="All animals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">All animals</SelectItem>
              {reptileOptions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.species})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">
              {isPro ? 'Ask about your collection' : 'Ask for a local summary'}
            </p>
            <p className="text-sm max-w-md">
              {isPro
                ? 'Ask about your animals, tasks, genes/hets, journal, breeding, or profile completeness. Context comes from data you already keep in Reptilita.'
                : 'Try: “Summarize my animals”, “What’s due today?”, “What’s overdue?”, “Recent journal entries”, or “help”.'}
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{stripActionBlocks(msg.content)}</p>
              </div>
            </div>
          ))
        )}
        
        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          </div>
        )}

        {/* Actions Review — Pro Smart assistant only */}
        {isPro && pendingActions.length > 0 && (
          <ActionReviewCard
            actions={pendingActions}
            reptileNames={reptileNameMap}
            onApply={handleApplyActions}
            onDismiss={() => setPendingActions([])}
            applying={applyingActions}
          />
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background safe-area-bottom">
        <div className="mb-2 flex items-start justify-between gap-3">
          {isPro ? (
            <p className="text-[10px] text-muted-foreground leading-snug pt-0.5">
              Memory: last {memoryMessageCount} message{memoryMessageCount === 1 ? '' : 's'} · up to{' '}
              {PRO_AI_CHAT_MAX_STORED_MESSAGES} stored on this device (not synced)
            </p>
          ) : (
            <span className="text-[10px] text-muted-foreground pt-0.5">Local chat only (not saved)</span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs px-2.5"
            onClick={handleClearChat}
            disabled={messages.length === 0}
          >
            Clear chat
          </Button>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPro ? 'Type your message…' : 'Ask about your local data…'}
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button onClick={() => handleSend()} disabled={!inputText.trim() || isLoading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
