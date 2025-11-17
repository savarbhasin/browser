import React, { useState } from "react";
import { apiClient } from '../utils/api';
import { StorageManager } from '../utils/storage';
import { ResultCard } from './ResultCard';
import type { CheckResult } from '../types';
import '../styles/global.css';

interface CheckUrlScreenProps {
  onBack: () => void;
}

export const CheckUrlScreen: React.FC<CheckUrlScreenProps> = ({ onBack }) => {
  const [manualUrl, setManualUrl] = useState<string>("");
  const [manualResult, setManualResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);


  const checkUrl = async (url: string) => {
    setError("");
    setManualResult(null);
    setLoading(true);
    
    try {
      // Check cache first
      const cached = await StorageManager.getCachedResult(url);
      if (cached) {
        setManualResult(cached);
        setLoading(false);
        return;
      }

      const result = await apiClient.checkUrl(url);
      setManualResult(result);
      
      // Cache the result
      await StorageManager.setCachedResult(url, result);
    } catch (e: any) {
      setError(e?.message || "Failed to check URL");
      setManualResult(null);
    } finally {
      setLoading(false);
    }
  };

  const onCheckManual = () => {
    if (!manualUrl.trim()) {
      setError("Please enter a URL");
      return;
    }
    checkUrl(manualUrl);
  };

  return (
    <div className="min-w-[400px] bg-dark-bg p-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-dark-border">
        <button
          onClick={onBack}
          className="p-2 hover:bg-dark-surface rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-cyan-600 to-blue-600 p-2 rounded-lg">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Check URL</h2>
        </div>
      </div>

      {/* Manual Check Section */}
      <div className="p-4 bg-dark-surface border border-dark-border rounded-xl">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-white">
            Check Any URL
          </h3>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 input-dark text-sm"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                onCheckManual();
              }
            }}
          />
          <button
            onClick={onCheckManual}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors duration-200 font-medium text-sm disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Checking
              </>
            ) : (
              "Check"
            )}
          </button>
        </div>
        
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}
        
        {manualResult && <ResultCard result={manualResult} showUrl />}
      </div>
    </div>
  );
};

