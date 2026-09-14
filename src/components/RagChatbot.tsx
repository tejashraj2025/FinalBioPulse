import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Database, 
  ShieldCheck, 
  FileText, 
  ExternalLink, 
  RotateCcw, 
  Copy, 
  Check, 
  AlertCircle,
  HelpCircle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Markdown from 'react-markdown';
import { ChatMessage, ChatSource, AnalyzeResponse, CaseRecord } from '../types';

interface RagChatbotProps {
  activeCase: AnalyzeResponse | null;
  cases: CaseRecord[];
  onSelectCase?: (caseId: string) => void;
  initialQuery?: string;
  onClearInitialQuery?: () => void;
}

const DEFAULT_SUGGESTIONS = [
  "Explain why the current case was classified in its risk tier",
  "What adverse event signals exist for Pembrolizumab in FAERS?",
  "How does the safety mesh prevent prompt injection attacks?",
  "What are the FDA 15-day expedited reporting criteria?",
  "Explain the 12 features evaluated by the XGBoost model",
  "Show high-risk cases currently in the audit ledger",
];

export const RagChatbot: React.FC<RagChatbotProps> = ({
  activeCase,
  cases,
  onSelectCase,
  initialQuery,
  onClearInitialQuery,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useActiveContext, setUseActiveContext] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [loadingStep, setLoadingStep] = useState<string>('Querying FAERS signals...');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Handle initialQuery if passed (e.g. from "Ask Copilot" button on Analysis screen)
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleSendMessage(initialQuery);
      if (onClearInitialQuery) {
        onClearInitialQuery();
      }
    }
  }, [initialQuery]);

  // Cycle loading step messages during processing
  useEffect(() => {
    if (!isLoading) return;
    const steps = [
      'Scanning FDA FAERS signal repository...',
      'Retrieving matching cases from SQLite audit ledger...',
      'Synthesizing grounded clinical reasoning with Safety Mesh...',
    ];
    let i = 0;
    setLoadingStep(steps[0]);
    const interval = setInterval(() => {
      i = (i + 1) % steps.length;
      setLoadingStep(steps[i]);
    }, 1200);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) {
      setInputQuery('');
    }
    setIsLoading(true);

    try {
      // Build active case payload if context is enabled
      let activeCasePayload = null;
      if (useActiveContext && activeCase) {
        activeCasePayload = {
          case_id: activeCase.case_id,
          clinical_note: (activeCase as any).clinical_note || '',
          clinical_extraction: activeCase.clinical_extraction,
          ml_result: activeCase.ml_result,
          stratification: activeCase.stratification,
          human_review_status: activeCase.human_review_status,
        };
      }

      // Format previous history for contextual turns (last 4 messages)
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          active_case: activeCasePayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No explanation generated.',
        timestamp: data.timestamp || new Date().toISOString(),
        sources: data.sources || [],
        suggested_questions: data.suggested_questions || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error('Chatbot error:', err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `**Clinical Safety Notice:** An issue occurred while querying the pharmacovigilance mesh. Details: ${err.message || 'Network communication error'}.`,
        timestamp: new Date().toISOString(),
        isError: true,
        sources: [],
        suggested_questions: DEFAULT_SUGGESTIONS.slice(0, 3),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetChat = () => {
    setMessages([]);
  };

  return (
    <div id="rag-copilot-container" className="w-full max-w-5xl mx-auto space-y-4">
      {/* Copilot Header Card */}
      <div className="p-5 sm:p-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-400 text-white flex items-center justify-center shadow-md shadow-teal-500/20">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                BioPulse Safety Copilot
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                RAG Grounded
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Evidence retrieval across FDA FAERS Signals, Patient Audit SQLite Store, and XGBoost Risk Mesh
            </p>
          </div>
        </div>

        {/* Clear and Status Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {messages.length > 0 && (
            <button
              id="clear-chat-button"
              onClick={handleResetChat}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Active Case Context Banner (if an active analysis exists) */}
      {activeCase && (
        <motion.div
          initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.3 }}
          className="p-3.5 sm:p-4 ios-glass-card rounded-2xl border border-teal-500/30 dark:border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 border border-teal-500/20">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-white">Active Case Loaded:</span>{' '}
              <span className="font-mono text-teal-700 dark:text-teal-300 font-medium">{activeCase.case_id}</span>
              <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
              <span className="text-slate-700 dark:text-slate-300">
                {activeCase.clinical_extraction?.drug || 'Unknown Drug'}
              </span>
              <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
              <span className={`font-semibold ${
                activeCase.stratification?.risk_category === 'HIGH RISK'
                  ? 'text-rose-600 dark:text-rose-400'
                  : activeCase.stratification?.risk_category === 'MODERATE RISK'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}>
                {activeCase.stratification?.risk_category || 'Stratified'} ({(activeCase.ml_result?.risk_probability * 100).toFixed(1)}%)
              </span>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setUseActiveContext(!useActiveContext)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              useActiveContext
                ? 'bg-teal-600 text-white shadow-xs ios-specular'
                : 'bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-white/5'
            }`}
          >
            <Sliders className="w-3 h-3" />
            {useActiveContext ? 'Active Context Linked' : 'Context Unlinked'}
          </motion.button>
        </motion.div>
      )}

      {/* Main Chat Conversation Window */}
      <motion.div
        initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="ios-glass ios-specular rounded-3xl border border-white/70 dark:border-white/10 shadow-md overflow-hidden flex flex-col h-[600px]"
      >
        
        {/* Messages Feed Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-white/70 dark:bg-slate-800/70 border border-white/70 dark:border-white/10 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-xs">
                <Bot className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  Ask the BioPulse Safety Mesh
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Ground questions in real FDA FAERS signal reports, patient audit logs, 
                  and the mathematical reasoning behind the XGBoost risk engine.
                </p>
              </div>

              {/* Starter Suggested Questions */}
              <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {DEFAULT_SUGGESTIONS.map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    id={`suggested-prompt-${idx}`}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSendMessage(suggestion)}
                    className="p-3 text-left rounded-2xl text-xs font-medium text-slate-700 dark:text-slate-300 ios-glass-card hover:bg-white dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-300 border border-white/70 dark:border-white/10 transition-all hover:border-teal-300 dark:hover:border-teal-700 cursor-pointer shadow-2xs"
                  >
                    "{suggestion}"
                  </motion.button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === 'user';
              const isExpanded = expandedSources[message.id];

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10, filter: 'blur(3px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Assistant Avatar */}
                  {!isUser && (
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-1 ios-specular">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div className={`max-w-[85%] sm:max-w-[78%] space-y-2.5 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-4 sm:p-5 rounded-3xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-slate-900 dark:bg-teal-600 text-white rounded-tr-sm shadow-sm ios-specular'
                          : message.isError
                          ? 'bg-rose-50/90 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200 border border-rose-200/80 dark:border-rose-800/80 rounded-tl-sm backdrop-blur-xs'
                          : 'ios-glass-card text-slate-800 dark:text-slate-100 border border-white/70 dark:border-white/10 rounded-tl-sm shadow-xs'
                      }`}
                    >
                      {/* Markdown rendered body */}
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-slate-900 dark:prose-headings:text-white prose-p:my-1.5 prose-ul:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-slate-900 dark:prose-strong:text-teal-200">
                        <Markdown>{message.content}</Markdown>
                      </div>

                      {/* Footer Actions for Assistant Messages */}
                      {!isUser && (
                        <div className="mt-3 pt-3 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                          <span>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(message.id, message.content)}
                              className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-300 transition-colors p-1 rounded cursor-pointer"
                              title="Copy clinical explanation"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Retrieved Sources Accordion (Assistant only) */}
                    {!isUser && message.sources && message.sources.length > 0 && (
                      <div className="w-full ios-glass-card rounded-2xl border border-white/70 dark:border-white/10 shadow-2xs overflow-hidden text-xs">
                        <button
                          onClick={() => toggleSources(message.id)}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between font-medium text-slate-700 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Database className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            <span>Retrieved Evidence ({message.sources.length} sources)</span>
                          </div>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="p-3 bg-slate-50/70 dark:bg-slate-950/40 border-t border-slate-200/80 dark:border-slate-800 space-y-2"
                            >
                              {message.sources.map((src, sIdx) => {
                                const badgeColor =
                                  src.type === 'faers'
                                    ? 'bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                                    : src.type === 'audit_db'
                                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                                    : src.type === 'active_case'
                                    ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                                    : 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';

                                const label =
                                  src.type === 'faers'
                                    ? 'FDA FAERS'
                                    : src.type === 'audit_db'
                                    ? 'Audit DB'
                                    : src.type === 'active_case'
                                    ? 'Active Session'
                                    : 'Regulatory Rule';

                                return (
                                  <div
                                    key={sIdx}
                                    className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                                        {src.title}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wide shrink-0 ${badgeColor}`}>
                                        {label}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] leading-relaxed">
                                      {src.snippet}
                                    </p>
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Follow-up Suggestion Chips (Assistant only) */}
                    {!isUser && message.suggested_questions && message.suggested_questions.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {message.suggested_questions.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => handleSendMessage(q)}
                            className="px-3 py-1 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 hover:text-teal-600 dark:hover:text-teal-300 hover:border-teal-300 dark:hover:border-teal-700 border border-slate-200/80 dark:border-slate-700 transition-all shadow-xs"
                          >
                            ↳ {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}

          {/* Loading Pulse State */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 items-start"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-1 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-3xl rounded-tl-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    BioPulse Grounding Engine Active
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                  {loadingStep}
                </p>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white/40 dark:bg-slate-950/40 backdrop-blur-md border-t border-slate-200/50 dark:border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-end gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-slate-200/70 dark:border-white/10 focus-within:border-teal-500 dark:focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all shadow-xs"
          >
            <textarea
              ref={textareaRef}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Copilot about risk scores, FAERS adverse reactions, FDA 15-day rules, or injection defense..."
              rows={1}
              className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 dark:text-white bg-transparent resize-none focus:outline-none placeholder:text-slate-400 max-h-24"
            />
            <motion.button
              id="send-chat-button"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              whileTap={{ scale: 0.94 }}
              className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-medium flex items-center justify-center transition-all shadow-xs shrink-0 cursor-pointer ios-specular"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </form>
          <div className="mt-2 px-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Press Enter to send, Shift + Enter for new line</span>
            <span>Grounding: FAERS • SQLite • XGBoost</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
