import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { SovereignIntelligenceOrchestrator, AgentResponse } from '../../application/intelligence/SovereignIntelligenceOrchestrator';
import { HealthLog } from '../../lib/oracle_engine';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isEmergency?: boolean;
}

interface OracleTerminalProps {
  logs: HealthLog[];
}

/**
 * OracleTerminal
 * Presentation component for interacting with the Sovereign Intelligence mesh.
 */
const OracleTerminal: React.FC<OracleTerminalProps> = ({ logs }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Sovereign Sentinel initialized. How can I assist with your trajectory analysis today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const orchestrator = useRef(new SovereignIntelligenceOrchestrator());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response: AgentResponse = await orchestrator.current.processIntent(logs, input);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.content,
        isEmergency: response.isEmergency 
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Signal connection lost to local inference engine.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="obsidian-card" style={{ display: 'flex', flexDirection: 'column', height: '400px', padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bot size={16} style={{ color: 'var(--hs-primary)' }} />
        <span className="technical" style={{ fontSize: '0.7rem' }}>SOVEREIGN_TERMINAL_V1.4</span>
      </div>

      {/* Message List */}
      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            style={{ 
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              background: msg.role === 'user' ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: msg.isEmergency ? '1px solid #FF5050' : '1px solid rgba(255, 255, 255, 0.05)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              {msg.role === 'user' ? <User size={12} style={{ color: '#849495' }} /> : <Bot size={12} style={{ color: 'var(--hs-primary)' }} />}
              <span className="technical" style={{ fontSize: '0.5rem', color: '#849495' }}>{msg.role.toUpperCase()}</span>
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.5, color: msg.isEmergency ? '#FF5050' : '#FFF' }}>
              {msg.content}
            </p>
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', background: 'rgba(255, 255, 255, 0.02)', padding: '0.8rem 1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--hs-primary)' }} />
            <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>SYNTHESIZING...</span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', display: 'flex', gap: '10px' }}>
        <input 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask the Oracle about your trajectory..."
          style={{ 
            flex: 1, 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            color: '#FFF',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button 
          onClick={handleSend}
          disabled={isLoading}
          className="hs-btn-primary" 
          style={{ width: '40px', height: '40px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default OracleTerminal;
