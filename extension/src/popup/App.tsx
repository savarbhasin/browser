import React, { useState, useEffect } from "react";
import { MainScreen } from '../components/MainScreen';
import { ReportScreen } from '../components/ReportScreen';
import { ChatScreen } from '../components/ChatScreen';
import { CheckUrlScreen } from '../components/CheckUrlScreen';
import '../styles/global.css';

type Screen = 'main' | 'report' | 'chat' | 'check';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Popup] App mounted');
  }, []);

  const handleNavigate = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  if (error) {
    return (
      <div style={{ padding: '20px', width: '400px', minHeight: '500px' }}>
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  try {
    switch (currentScreen) {
      case 'main':
        return <MainScreen onNavigate={handleNavigate} />;
      
      case 'report':
        return <ReportScreen onBack={() => handleNavigate('main')} />;
      
      case 'chat':
        return <ChatScreen onBack={() => handleNavigate('main')} />;
      
      case 'check':
        return <CheckUrlScreen onBack={() => handleNavigate('main')} />;
      
      default:
        return <div style={{ padding: '20px', width: '400px' }}>Loading...</div>;
    }
  } catch (err) {
    console.error('[Popup] Render error:', err);
    return (
      <div style={{ padding: '20px', width: '400px', minHeight: '500px' }}>
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{String(err)}</p>
      </div>
    );
  }
}
