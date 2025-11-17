import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { apiClient } from '../utils/api';
import { dbManager } from '../utils/indexeddb';
import type { ChatSession, ChatMessage } from '../types';
import 'highlight.js/styles/github-dark.css';
import '../styles/global.css';

interface ChatScreenProps {
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onBack }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initDB();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages]);

  const initDB = async () => {
    try {
      await dbManager.init();
      const allSessions = await dbManager.getAllSessions();
      setSessions(allSessions);
    } catch (err) {
      console.error('Failed to init IndexedDB:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      messages: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    setCurrentSession(newSession);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || loading) return;

    const messageText = input.trim();
    setInput('');
    setError('');
    setLoading(true);

    try {
      // Create session if it doesn't exist
      let session = currentSession;
      if (!session) {
        session = {
          id: `session_${Date.now()}`,
          title: messageText.slice(0, 50) + (messageText.length > 50 ? '...' : ''),
          messages: [],
          created_at: Date.now(),
          updated_at: Date.now()
        };
        setCurrentSession(session);
      } else if (session.messages.length === 0 && session.title === 'New Chat') {
        // Update title from first message if it's still "New Chat"
        session.title = messageText.slice(0, 50) + (messageText.length > 50 ? '...' : '');
      }

      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: Date.now()
      };

      session.messages.push(userMessage);
      session.updated_at = Date.now();
      setCurrentSession({ ...session });

      // Save to IndexedDB
      await dbManager.saveSession(session);
      
      // Update sessions list
      const allSessions = await dbManager.getAllSessions();
      setSessions(allSessions);

      // Get AI response with conversation history
      const conversationHistory = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      const response = await apiClient.chat(messageText, conversationHistory);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };

      session.messages.push(assistantMessage);
      session.updated_at = Date.now();
      setCurrentSession({ ...session });

      // Save to IndexedDB
      await dbManager.saveSession(session);
      
      // Update sessions list
      const updatedSessions = await dbManager.getAllSessions();
      setSessions(updatedSessions);
    } catch (err: any) {
      setError(err?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbManager.deleteSession(sessionId);
      const allSessions = await dbManager.getAllSessions();
      setSessions(allSessions);
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto h-[600px] bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-dark-surface rounded-lg transition-colors duration-200 text-dark-text-secondary hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 hover:bg-dark-surface rounded-lg transition-colors duration-200 text-dark-text-secondary hover:text-white"
              title="Toggle history"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white">AI Chat</h2>
            </div>
          </div>
          <button
            onClick={createNewSession}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sessions sidebar */}
        {showSidebar && (
          <div className="w-64 border-r border-dark-border overflow-y-auto bg-dark-surface custom-scrollbar">
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => loadSession(session)}
              className={`p-3 cursor-pointer border-b border-dark-border text-sm relative group transition-colors duration-200 ${
                currentSession?.id === session.id 
                  ? 'bg-blue-600/20 border-l-2 border-l-blue-500' 
                  : 'hover:bg-dark-hover'
              }`}
            >
              <div className="pr-8 overflow-hidden text-ellipsis whitespace-nowrap text-dark-text">
                {session.title}
              </div>
              <button
                onClick={(e) => deleteSession(session.id, e)}
                className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))}
          </div>
        )}

        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {!currentSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-dark-text-muted p-8 text-center">
              <div className="bg-dark-surface p-6 rounded-full mb-4">
                <svg className="w-12 h-12 text-dark-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-base text-dark-text-secondary">Select a chat or create a new one</p>
              <p className="text-sm text-dark-text-muted mt-2">Ask me about phishing, online security, and URL safety</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {currentSession.messages.map(message => (
                  <div
                    key={message.id}
                    className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-lg text-sm ${
                        message.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-dark-surface text-dark-text border border-dark-border rounded-bl-sm'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            code: ({ node, inline, className, children, ...props }: any) => {
                              return inline ? (
                                <code
                                  className="bg-dark-bg px-1.5 py-0.5 rounded text-cyan-400 font-mono text-xs"
                                  {...props}
                                >
                                  {children}
                                </code>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            },
                            pre: ({ children, ...props }: any) => (
                              <pre
                                className="bg-dark-bg p-3 rounded-lg overflow-x-auto my-2 border border-dark-border text-xs"
                                {...props}
                              >
                                {children}
                              </pre>
                            ),
                            p: ({ children, ...props }: any) => (
                              <p className="my-2 leading-relaxed" {...props}>
                                {children}
                              </p>
                            ),
                            ul: ({ children, ...props }: any) => (
                              <ul className="ml-4 my-2 list-disc space-y-1" {...props}>
                                {children}
                              </ul>
                            ),
                            ol: ({ children, ...props }: any) => (
                              <ol className="ml-4 my-2 list-decimal space-y-1" {...props}>
                                {children}
                              </ol>
                            ),
                            li: ({ children, ...props }: any) => (
                              <li className="leading-relaxed" {...props}>
                                {children}
                              </li>
                            ),
                            a: ({ children, href, ...props }: any) => (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                                {...props}
                              >
                                {children}
                              </a>
                            ),
                            blockquote: ({ children, ...props }: any) => (
                              <blockquote
                                className="border-l-4 border-blue-500 pl-3 my-2 text-dark-text-secondary italic"
                                {...props}
                              >
                                {children}
                              </blockquote>
                            ),
                            h1: ({ children, ...props }: any) => (
                              <h1 className="text-lg font-bold my-3" {...props}>
                                {children}
                              </h1>
                            ),
                            h2: ({ children, ...props }: any) => (
                              <h2 className="text-base font-bold my-2" {...props}>
                                {children}
                              </h2>
                            ),
                            h3: ({ children, ...props }: any) => (
                              <h3 className="text-sm font-semibold my-2" {...props}>
                                {children}
                              </h3>
                            ),
                            table: ({ children, ...props }: any) => (
                              <div className="overflow-x-auto my-2">
                                <table className="border-collapse w-full text-xs" {...props}>
                                  {children}
                                </table>
                              </div>
                            ),
                            th: ({ children, ...props }: any) => (
                              <th
                                className="border border-dark-border p-2 bg-dark-bg font-semibold"
                                {...props}
                              >
                                {children}
                              </th>
                            ),
                            td: ({ children, ...props }: any) => (
                              <td
                                className="border border-dark-border p-2"
                                {...props}
                              >
                                {children}
                              </td>
                            )
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-dark-surface px-4 py-3 rounded-lg text-sm border border-dark-border flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="text-dark-text-secondary">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t border-dark-border bg-dark-surface/50">
                {error && (
                  <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}
                <form onSubmit={sendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about phishing and online security..."
                    disabled={loading}
                    className="flex-1 input-dark text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors duration-200 font-medium text-sm disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

