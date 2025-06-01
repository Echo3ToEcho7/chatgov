import { useState, useEffect } from 'react';

import { BillSearch } from './components/BillSearch';
import { BillDetails } from './components/BillDetails';
import { ChatInterface } from './components/ChatInterface';
import { SettingsPanel } from './components/SettingsPanel';
import { BrowseBills } from './components/BrowseBills';
import { Navbar } from './components/Navbar';
import { AIService } from './services/aiService';
import type { Bill } from './types';
import type { AISettings } from './types/settings';
import { loadSettings } from './utils/settings';

async function loadFlyonUI() {
  return import('flyonui/flyonui');
}

type AppState = 'search' | 'browse' | 'details' | 'chat';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('search');
  const [previousState, setPreviousState] = useState<AppState>('search');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiService, setAiService] = useState<AIService>(new AIService(loadSettings()));

  useEffect(() => {
    const initFlyonUI = async () => {
      await loadFlyonUI();
    };

    initFlyonUI();
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (
        window.HSStaticMethods &&
        typeof window.HSStaticMethods.autoInit === 'function'
      ) {
        window.HSStaticMethods.autoInit();
      }
    }, 100);
  }, []);

  useEffect(() => {
    const settings = loadSettings();
    setAiService(new AIService(settings));
  }, []);

  const handleBillSelect = (bill: Bill) => {
    setPreviousState(currentState);
    setSelectedBill(bill);
    setCurrentState('chat');
  };

  const handleBackToPrevious = () => {
    setCurrentState(previousState);
    setSelectedBill(null);
  };

  const handleSettingsChange = (newSettings: AISettings) => {
    setAiService(new AIService(newSettings));
  };

  const handleNavStateChange = (newState: 'search' | 'browse') => {
    setPreviousState(currentState);
    setCurrentState(newState);
  };


  return (
    <div className="min-h-screen bg-base-100">
      <Navbar 
        currentState={currentState}
        onStateChange={handleNavStateChange}
        onSettingsOpen={() => setShowSettings(true)}
        aiService={aiService}
      />

      <div className="max-w-6xl mx-auto p-5">
        {currentState === 'search' && (
          <BillSearch onBillSelect={handleBillSelect} />
        )}
        
        {currentState === 'browse' && (
          <BrowseBills onBillSelect={handleBillSelect} />
        )}
        
        {currentState === 'details' && selectedBill && (
          <BillDetails 
            bill={selectedBill} 
            onBack={handleBackToPrevious}
          />
        )}
        
        {currentState === 'chat' && selectedBill && (
          <ChatInterface 
            bill={selectedBill} 
            onBack={handleBackToPrevious}
            aiService={aiService}
          />
        )}
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}

export default App;
