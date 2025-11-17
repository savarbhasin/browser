import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { StorageManager } from '../utils/storage';
import type { User } from '../types';
import '../styles/global.css';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

// Detect authentication method:
// - Standard Chrome/Edge: Use chrome.identity API (simpler, built-in)
// - Electron-based browsers: Use popup OAuth flow with User-Agent spoofing
//   (Google blocks Electron browsers, so we modify the User-Agent header to appear as Chrome)
const hasChromeIdentity = typeof chrome !== 'undefined' && 
                         chrome.identity && 
                         typeof chrome.identity.getAuthToken === 'function';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Listen for OAuth callback messages (for popup flow)
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'OAUTH_SUCCESS') {
        try {
          const { token, userInfo } = event.data;
          await completeAuthentication(token, userInfo);
        } catch (err: any) {
          console.error('Auth completion error:', err);
          setError(err?.message || 'Authentication failed.');
        }
      } else if (event.data.type === 'OAUTH_ERROR') {
        setError(event.data.error || 'Authentication failed.');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const completeAuthentication = async (token: string, googleUser: any) => {
    // Register/login user in backend
    let user: User;
    try {
      user = await apiClient.getUser(googleUser.email);
    } catch (e) {
      // User doesn't exist, register them
      user = await apiClient.registerUser({
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      });
    }

    // Store user and token
    await StorageManager.setUser(user);
    await StorageManager.setAuthToken(token);

    onAuthSuccess(user);
  };

  const handleChromeIdentityAuth = async () => {
    // Use Chrome Identity API
    const token = await new Promise<string>((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else if (token) {
          resolve(token);
        } else {
          reject(new Error('No token received'));
        }
      });
    });

    // Get user info from Google
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Failed to get user info');
    }

    const googleUser = await response.json();
    await completeAuthentication(token, googleUser);
  };

  const handlePopupAuth = async () => {
    // Use popup-based OAuth flow for Electron-based browsers
    // This sends a message to the background script to handle OAuth
    const response = await chrome.runtime.sendMessage({ 
      type: 'START_OAUTH' 
    });

    if (response.error) {
      throw new Error(response.error);
    }

    // The background script will open a popup and we'll receive
    // a message when authentication completes
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");

    try {
      if (hasChromeIdentity) {
        // Standard Chrome/Edge with Identity API
        await handleChromeIdentityAuth();
      } else {
        // Electron-based browser or other - use popup flow
        await handlePopupAuth();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-w-[400px] min-h-[300px] bg-dark-bg p-6 flex flex-col items-center justify-center text-center animate-fade-in">
      {/* Shield icon */}
      <div className="mb-6 relative">
        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"></div>
        <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-2xl shadow-xl">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Phishing Shield
        </h1>
        <p className="text-dark-text-secondary text-sm">
          Protect yourself from malicious websites
        </p>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="group relative flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.582c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.582 9 3.582z"/>
        </svg>
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          </span>
        ) : (
          "Sign in with Google"
        )}
      </button>

      {error && (
        <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm animate-slide-up">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-dark-text-muted max-w-[320px]">
        By signing in, you agree to allow this extension to check URLs and report suspicious websites.
      </div>

      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl"></div>
    </div>
  );
};

