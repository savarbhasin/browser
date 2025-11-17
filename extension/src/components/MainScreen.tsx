import React, { useEffect, useState } from "react";
import { apiClient } from '../utils/api';
import { StorageManager } from '../utils/storage';
import { ResultCard } from './ResultCard';
import type { CheckResult, User } from '../types';
import '../styles/global.css';

interface MainScreenProps {
  user: User;
  onNavigate: (screen: 'report' | 'chat' | 'check') => void;
  onLogout: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({ user, onNavigate, onLogout }) => {
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [currentResult, setCurrentResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [clearingCache, setClearingCache] = useState<boolean>(false);

  const handleClearCache = async () => {
    setClearingCache(true);
    try {
      await StorageManager.clearUrlCache();
      // Re-check current URL if it exists
      if (currentUrl) {
        await checkUrl(currentUrl);
      }
    } catch (e) {
      console.error("Failed to clear cache:", e);
    } finally {
      setClearingCache(false);
    }
  };

  const checkUrl = async (url: string) => {
    setCurrentResult(null);
    setLoading(true);
    
    try {
      // Check cache first
      const cached = await StorageManager.getCachedResult(url);
      if (cached) {
        setCurrentResult(cached);
        setLoading(false);
        return;
      }

      const result = await apiClient.checkUrl(url);
      setCurrentResult(result);
      
      // Cache the result
      await StorageManager.setCachedResult(url, result);
    } catch (e: any) {
      console.error("Failed to check URL:", e);
      setCurrentResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadCurrentTab = async () => {
      try {
        if ((chrome as any)?.tabs) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          const u = (tabs?.[0] as any)?.url || "";
          setCurrentUrl(u);
          
          if (u) {
            checkUrl(u);
          }
        }
      } catch (e) {
        console.error("Error loading current tab:", e);
      }
    };
    
    loadCurrentTab();
  }, []);

  return (
    <div className="min-w-[400px] bg-dark-bg p-4 animate-fade-in">
      {/* Header with user info */}
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Phishing Shield</h2>
        </div>
        <div className="flex items-center gap-2">
          <img 
            src={user.picture} 
            alt={user.name}
            className="w-8 h-8 rounded-full border-2 border-dark-border"
          />
          <button
            onClick={onLogout}
            className="px-3 py-1.5 text-xs text-dark-text-secondary hover:text-white bg-dark-surface hover:bg-dark-hover border border-dark-border rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => onNavigate('check')}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-sm bg-dark-surface hover:bg-dark-hover text-dark-text border border-dark-border rounded-lg transition-all duration-200 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs">Check URL</span>
        </button>
        <button
          onClick={() => onNavigate('report')}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-sm bg-dark-surface hover:bg-dark-hover text-dark-text border border-dark-border rounded-lg transition-all duration-200 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs">Report</span>
        </button>
        <button
          onClick={() => onNavigate('chat')}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2.5 text-sm bg-dark-surface hover:bg-dark-hover text-dark-text border border-dark-border rounded-lg transition-all duration-200 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="text-xs">AI Chat</span>
        </button>
      </div>

      {/* Clear Cache Button */}
      <div className="mb-4">
        <button
          onClick={handleClearCache}
          disabled={clearingCache}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearingCache ? (
            <>
              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Clearing Cache...</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear Cache & Re-check</span>
            </>
          )}
        </button>
      </div>
      
      {/* Current Page Section */}
      <div className="p-4 bg-dark-surface border border-dark-border rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
          </svg>
          <h3 className="text-sm font-semibold text-white">
            Current Page
          </h3>
        </div>
        <div className="text-xs text-dark-text-muted mb-3 break-all bg-dark-bg px-3 py-2 rounded-lg border border-dark-border">
          {currentUrl || "Loading..."}
        </div>
        {currentResult && <ResultCard result={currentResult} />}
        {!currentResult && currentUrl && !loading && (
          <div className="flex items-center gap-2 text-sm text-dark-text-secondary">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing URL...
          </div>
        )}
      </div>
    </div>
  );
};

