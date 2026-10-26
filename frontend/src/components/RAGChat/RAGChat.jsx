import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Volume2, VolumeX, Loader2, MessageSquareText, ExternalLink, Sparkles } from 'lucide-react';
import axios from 'axios';
import useAuraStore from '../../store/auraStore';
import { useSpeech } from '../../hooks/useSpeech';

const API = import.meta.env.VITE_API_URL || '';

const SUGGESTIONS = ['ragChat.suggestions.k8sHealth', 'ragChat.suggestions.terraformWaste', 'ragChat.suggestions.alertsToday', 'ragChat.suggestions.costOptimization'];

function ConfidenceIndicator({ value, label }) {
  const color = value >= 80 ? 'text-emerald-400' : value >= 60 ? 'text-amber-400' : 'text-red-400';
  const bg = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] text-aura-muted">{label}</span>
      <div className="w-20 h-1 bg-aura-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bg}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[10px] font-bold ${color}`}>{value}%</span>
    </div>
  );
}

export default function RAGChat() {
  const { t } = useTranslation();
  const { ttsEnabled, language, chatHistory, addChatMessage, clearChat } = useAuraStore();
  const { speak, stopSpeaking, isSpeaking } = useSpeech();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = chatHistory;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    addChatMessage(userMsg);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/rag/query`, { query: text, language }, { timeout: 30000 });
      const data = res.data;
      const aiMsg = {
        role: 'assistant',
        content: data.answer || data.response,
        sources: data.sources || [],
        confidence: data.confidence ?? 0,
        reasoning: data.reasoning,
        decisionMode: data.decisionMode || 'suggestion-only',
        mode: data.mode,
        timestamp: new Date().toISOString(),
      };
      addChatMessage(aiMsg);
      if (ttsEnabled) speak(aiMsg.content, language);
    } catch {
      const aiMsg = {
        role: 'assistant',
        content: t('ragChat.offline'),
        sources: [],
        confidence: 0,
        reasoning: 'The backend did not respond.',
        decisionMode: 'suggestion-only',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(aiMsg);
      if (ttsEnabled) speak(aiMsg.content, language);
    }

    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (key) => sendMessage(t(key));

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-aura-border bg-aura-surface flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gradient-cyan flex items-center gap-2">
            <MessageSquareText className="w-5 h-5" />
            {t('ragChat.title')}
          </h1>
          <p className="text-xs text-aura-subtext mt-0.5">ChromaDB · RAG · Multi-language</p>
        </div>
        <div className="flex items-center gap-3">
          {ttsEnabled && (
            <button
              onClick={isSpeaking ? stopSpeaking : undefined}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${
                isSpeaking ? 'bg-aura-violet/20 text-aura-violet border-aura-violet/40 animate-pulse' : 'bg-aura-card text-aura-subtext border-aura-border'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              {isSpeaking ? 'Speaking...' : t('ragChat.ttsEnabled')}
            </button>
          )}
          <button onClick={clearChat} className="btn-secondary text-xs py-1.5">Clear</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="p-4 rounded-2xl bg-aura-card border border-aura-border">
              <Sparkles className="w-10 h-10 text-aura-cyan mx-auto" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-aura-text">Ask AURA anything</h2>
              <p className="text-sm text-aura-subtext mt-1">About your cloud infrastructure, alerts, performance, or costs</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl">
              {SUGGESTIONS.map((key) => (
                <button
                  key={key}
                  onClick={() => handleSuggestion(key)}
                  className="text-left px-4 py-3 rounded-xl bg-aura-card border border-aura-border hover:border-aura-cyan/40 hover:bg-aura-cyan/5 transition-all duration-200 text-sm text-aura-subtext"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-2xl ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-semibold text-aura-muted">
                    {msg.role === 'user' ? t('ragChat.you') : t('ragChat.assistant')}
                  </span>
                  <span className="text-[10px] text-aura-muted">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-gradient-cyan text-white'
                    : 'bg-aura-card border border-aura-border text-aura-text'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                  {msg.role === 'assistant' && (
                    <>
                      {msg.confidence !== undefined && <ConfidenceIndicator value={msg.confidence} label={t('ragChat.retrievalMatch')} />}
                      {msg.reasoning && <p className="text-[11px] text-aura-muted mt-2">{t('ragChat.reason')}: {msg.reasoning}</p>}
                      {msg.decisionMode && <p className="text-[10px] text-aura-cyan mt-1">{t('ragChat.mode')}: {msg.decisionMode === 'suggestion-only' ? t('ragChat.suggestionOnly') : msg.decisionMode}</p>}
                      {msg.sources?.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-aura-border/50">
                          <p className="text-[10px] label-text mb-1.5">{t('ragChat.sources')}</p>
                          {msg.sources.map((src, j) => (
                            <div key={j} className="flex items-center gap-2 text-[11px] text-aura-subtext mb-1">
                              <ExternalLink className="w-3 h-3 text-aura-cyan flex-shrink-0" />
                              <span>{src.title}</span>
                              <span className="text-aura-muted">({src.collection})</span>
                              <span className="ml-auto text-aura-cyan font-semibold">{Math.round(src.score * 100)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-aura-card border border-aura-border rounded-2xl px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-aura-cyan animate-spin" />
              <span className="text-sm text-aura-subtext">{t('ragChat.thinking')}</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-aura-border bg-aura-surface">
        {/* Quick suggestions (when has messages) */}
        {messages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {SUGGESTIONS.map((key) => (
              <button
                key={key}
                onClick={() => handleSuggestion(key)}
                className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full bg-aura-card border border-aura-border hover:border-aura-cyan/40 text-aura-subtext hover:text-aura-cyan transition-all duration-200"
              >
                {t(key)}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('ragChat.placeholder')}
            disabled={loading}
            className="input-field flex-1"
            aria-label={t('ragChat.placeholder')}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary px-4 flex items-center gap-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('ragChat.send')}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">{t('ragChat.send')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
