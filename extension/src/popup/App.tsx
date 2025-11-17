import React, { useEffect, useState } from "react";
import { AuthScreen } from '../components/AuthScreen';
import { MainScreen } from '../components/MainScreen';
import { ReportScreen } from '../components/ReportScreen';
import { ChatScreen } from '../components/ChatScreen';
import { CheckUrlScreen } from '../components/CheckUrlScreen';
import { StorageManager } from '../utils/storage';
import type { User } from '../types';
import '../styles/global.css';

type Screen = 'auth' | 'main' | 'report' | 'chat' | 'check';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const storedUser = await StorageManager.getUser();
      if (storedUser) {
        setUser(storedUser);
        setCurrentScreen('main');
      } else {
        setCurrentScreen('auth');
      }
    } catch (e) {
      console.error('Error checking auth:', e);
      setCurrentScreen('auth');
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setCurrentScreen('main');
  };

  const handleLogout = async () => {
    await StorageManager.removeUser();
    await StorageManager.removeAuthToken();
    
    // Remove Chrome identity token
    const token = await StorageManager.getAuthToken();
    if (token) {
      chrome.identity.removeCachedAuthToken({ token }, () => {
        // Token removed
      });
    }
    
    setUser(null);
    setCurrentScreen('auth');
  };

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  if (loading) {
    return (
      <div className="min-w-[400px] min-h-[300px] bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-dark-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  switch (currentScreen) {
    case 'auth':
      return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
    
    case 'main':
      return user ? (
        <MainScreen 
          user={user} 
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      ) : null;
    
    case 'report':
      return <ReportScreen onBack={() => handleNavigate('main')} />;
    
    case 'chat':
      return <ChatScreen onBack={() => handleNavigate('main')} />;
    
    case 'check':
      return <CheckUrlScreen onBack={() => handleNavigate('main')} />;
    
    default:
      return null;
  }
}
