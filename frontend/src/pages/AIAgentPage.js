import { useState, useRef, useEffect } from 'react';
import { Sparkles, SendHorizonal } from 'lucide-react';
import { chatWithAI } from '../services/api';

import ReactMarkdown from 'react-markdown';

export default function AIAgentPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Career Assistant. How can I help you today? (e.g. "Find remote frontend jobs")' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    const newHistory = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const { data } = await chatWithAI(userMsg, messages.map(m => ({ role: m.role, content: m.content })));
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, an error occurred or the AI service is currently unavailable.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page container" style={{ maxWidth: '800px' }}>
      <h2 className="section-title">AI Career Assistant</h2>
      
      <div className="ai-chat-container">
        <div className="ai-chat-header">
          <div className="ai-avatar" style={{ background: 'var(--primary)', color: '#fff', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Assistant</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Always active</div>
          </div>
        </div>

        <div className="ai-chat-messages">
          {messages.map((msg, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column' }}>
              <div className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
                {msg.role === 'user' ? (
                  msg.content
                ) : (
                  <ReactMarkdown className="markdown-content">{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message message-ai">
              <div className="typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="ai-chat-input" onSubmit={handleSubmit}>
          <input 
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.95rem' }}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..." 
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={!input.trim() || loading} style={{ padding: '0.5rem 1rem' }}>
            <SendHorizonal size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
