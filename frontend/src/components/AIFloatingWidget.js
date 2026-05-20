import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Minimize2 } from 'lucide-react';
import { chatWithAI } from '../services/api';

export default function AIFloatingWidget() {
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Career Assistant. Ask me anything about jobs, CV tips, interview prep, or career advice! 🚀' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Hide the bubble hint after 5s
  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const history = newMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }));
      const { data } = await chatWithAI(input.trim(), history);
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || data.message || 'I could not process that. Please try again.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button + speech bubble */}
      <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.75rem' }}>
        
        {/* Speech bubble hint */}
        {!open && showBubble && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '16px 16px 4px 16px',
            padding: '0.65rem 1rem',
            fontSize: '0.85rem',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-md)',
            maxWidth: '220px',
            animation: 'fadeInUp 0.4s ease',
            position: 'relative',
          }}>
            <span role="img" aria-label="wave">👋</span> Hello! I am your <strong>AI Career Assistant</strong>.
            <button
              onClick={() => setShowBubble(false)}
              style={{ position: 'absolute', top: '4px', right: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, lineHeight: 1 }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Circular button */}
        <button
          id="ai-floating-btn"
          onClick={() => { setOpen(o => !o); setShowBubble(false); }}
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.5)',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(37,99,235,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,0.5)'; }}
          title="AI Career Assistant"
        >
          {open ? <X size={22} color="#fff" /> : <Sparkles size={22} color="#fff" />}
        </button>
      </div>

      {/* Chat popup */}
      {open && (
        <div style={{
          position: 'fixed',
          bottom: '6.5rem',
          right: '2rem',
          width: '370px',
          maxWidth: 'calc(100vw - 2rem)',
          zIndex: 9998,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeInUp 0.3s ease',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), #7c3aed)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Sparkles size={18} color="#fff" />
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.95rem' }}>AI Career Assistant</div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>Powered by AI</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#fff', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
            >
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-elevated)',
                  color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  maxWidth: '85%',
                  border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', padding: '0.6rem 1rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
            <input
              className="form-input"
              style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.88rem' }}
              placeholder="Ask about jobs, CV, interviews..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              className="btn btn-primary"
              style={{ padding: '0.5rem 0.9rem', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
              disabled={loading || !input.trim()}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
