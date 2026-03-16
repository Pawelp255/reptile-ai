import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Send, Trash2, Settings, AlertTriangle, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react';
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
import {
  sendStreamingResponse,
  estimateTokens,
  type ChatMessage,
} from '@/lib/ai/openaiClient';
import { AVAILABLE_MODELS, DEFAULT_MODEL, estimateCostUsd, type ModelId } from '@/lib/ai/models';
import { REPTILE_CARE_SYSTEM_PROMPT } from '@/lib/ai/systemPrompt';
import {
  buildContext,
  getReptileOptions,
  getPairingOptions,
  type ContextOptions,
} from '@/lib/ai/contextBuilder';
import { getApiKey, isNativePlatform } from '@/lib/ai/secureKey';
import { extractActions, stripActionBlocks, type AIAction } from '@/lib/ai/actionParser';
import { downloadVetPdf } from '@/lib/export/vetPdf';
import { QuickScanButtons } from '@/components/QuickScanButtons';
import { ActionReviewCard } from '@/components/ActionReviewCard';
import { createCareEvent } from '@/lib/storage/events';
import { getDB, generateId, getToday } from '@/lib/storage/db';
import { getAllReptiles } from '@/lib/storage/reptiles';
import type { AIMessage, ScheduleItem } from '@/types';

export default function AIAssistantPage() {
  const [searchParams] = useSearchParams();
  const initialReptileId = searchParams.get('reptileId') || '';

  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKeyState] = useState<string | null>(null);
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
  
  // Token estimate
  const [tokenEstimate, setTokenEstimate] = useState(0);
  
  // Actions
  const [pendingActions, setPendingActions] = useState<AIAction[]>([]);
  const [applyingActions, setApplyingActions] = useState(false);
  
  // Streaming ref
  const streamingRef = useRef<string>('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Load API key and options
  useEffect(() => {
    const loadData = async () => {
      const key = await getApiKey();
      setApiKeyState(key);
      
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
  
  // Token estimation
  useEffect(() => {
    const updateTokenEstimate = async () => {
      const options: ContextOptions = {
        includeReptile: (selectedReptile && selectedReptile !== '__none__') ? selectedReptile : undefined,
        includePairing: (selectedPairing && selectedPairing !== '__none__') ? selectedPairing : undefined,
        includeJournal,
        includeUpcomingTasks,
        rangeDays,
        includeNotes,
        includeWeights,
      };
      
      if (selectedReptile || selectedPairing || includeJournal || includeUpcomingTasks) {
        const context = await buildContext(options);
        const systemTokens = estimateTokens(REPTILE_CARE_SYSTEM_PROMPT);
        setTokenEstimate(context.estimatedTokens + systemTokens);
      } else {
        setTokenEstimate(estimateTokens(REPTILE_CARE_SYSTEM_PROMPT));
      }
    };
    updateTokenEstimate();
  }, [selectedReptile, selectedPairing, includeJournal, includeUpcomingTasks, rangeDays, includeNotes, includeWeights]);
  
  // Scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText || inputText.trim();
    if (!text || isLoading) return;
    
    if (!apiKey) {
      toast.error('Please add your OpenAI API key in Settings first.');
      return;
    }
    
    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
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
      const contextOptions: ContextOptions = {
        includeReptile: (selectedReptile && selectedReptile !== '__none__') ? selectedReptile : undefined,
        includePairing: (selectedPairing && selectedPairing !== '__none__') ? selectedPairing : undefined,
        includeJournal,
        includeUpcomingTasks,
        rangeDays,
        includeNotes,
        includeWeights,
      };
      
      const context = await buildContext(contextOptions);
      
      const apiMessages: ChatMessage[] = [
        { role: 'system', content: REPTILE_CARE_SYSTEM_PROMPT },
      ];
      
      if (context.text) {
        apiMessages.push({
          role: 'system',
          content: `Current user data context:\n\n${context.text}`,
        });
      }
      
      // Add conversation history (last 20 messages to stay in budget)
      const historyMessages = messages.slice(-20);
      for (const msg of historyMessages) {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
      
      apiMessages.push({ role: 'user', content: text });
      
      await sendStreamingResponse(
        apiKey,
        selectedModel,
        apiMessages,
        // onChunk
        (chunk) => {
          streamingRef.current += chunk;
          setMessages(prev => 
            prev.map(m => m.id === assistantId 
              ? { ...m, content: streamingRef.current }
              : m
            )
          );
        },
        // onDone
        () => {
          const finalText = streamingRef.current;
          // Check for proposed actions
          const allReptileIds = reptileOptions.map(r => r.id);
          const actions = extractActions(finalText, allReptileIds);
          if (actions.length > 0) {
            setPendingActions(actions);
          }
          setIsLoading(false);
        },
        // onError
        (error) => {
          toast.error(error.message);
          setMessages(prev => prev.filter(m => m.id !== assistantId && m.id !== userMessage.id));
          setIsLoading(false);
        },
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== assistantId && m.id !== userMessage.id));
      setIsLoading(false);
    }
  }, [inputText, isLoading, apiKey, selectedModel, selectedReptile, selectedPairing, includeJournal, includeUpcomingTasks, rangeDays, includeNotes, includeWeights, messages, reptileOptions]);

  const handleQuickScan = useCallback((prompt: string) => {
    if (!selectedReptile) {
      toast.error('Select an animal first to use Quick Scan.');
      return;
    }
    handleSend(prompt);
  }, [selectedReptile, handleSend]);

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
      await downloadVetPdf(selectedReptile, name, { rangeDays });
      toast.success('Vet PDF exported');
    } catch (error) {
      console.error('Failed to export vet PDF:', error);
      toast.error('Failed to export PDF');
    }
  };
  
  const handleClearChat = () => {
    setMessages([]);
    setPendingActions([]);
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
            <strong>Disclaimer:</strong> AI is for educational purposes only. Not a substitute for veterinary care. Always consult a qualified exotic pet vet for health concerns.
          </p>
        </div>
      </div>

      {/* Web-only security warning */}
      {!isNativePlatform() && apiKey && (
        <div className="mx-4 mt-2 p-2 bg-muted border border-border rounded-lg">
          <p className="text-[11px] text-muted-foreground">
            ⚠️ Web mode: API key stored in browser storage. Use native app for secure Keychain/Keystore storage.
          </p>
        </div>
      )}
      
      {/* No API Key */}
      {!apiKey && (
        <div className="mx-4 mt-2 p-3 bg-muted border border-border rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            Add your OpenAI API key in Settings to use the AI Assistant.
          </p>
          <Link to="/settings">
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Quick Scan */}
      {apiKey && (
        <div className="mx-4 mt-2">
          <QuickScanButtons onScan={handleQuickScan} disabled={isLoading || !apiKey} />
        </div>
      )}
      
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

          {/* Vet PDF Export */}
          {selectedReptile && selectedReptile !== '__none__' && (
            <div className="pt-2 border-t border-border">
              <Button variant="outline" size="sm" className="w-full" onClick={handleExportVetPdf}>
                <FileText className="w-4 h-4 mr-2" />
                Export Vet PDF
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
      
      {/* Chat Messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">Ask me anything about reptile and amphibian care!</p>
            <p className="text-sm max-w-md">
              Select an animal and use Quick Scan buttons for instant analysis, or ask your own questions.
              Use context options to include data from your collection.
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

        {/* Actions Review */}
        {pendingActions.length > 0 && (
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
        <div className="flex items-end gap-2">
          <Button variant="outline" size="icon" onClick={handleClearChat} disabled={messages.length === 0} title="Clear chat">
            <Trash2 className="w-4 h-4" />
          </Button>
          
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[44px] max-h-[120px] resize-none"
            disabled={!apiKey || isLoading}
          />
          
          <Button onClick={() => handleSend()} disabled={!inputText.trim() || !apiKey || isLoading} size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
