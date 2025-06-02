import type { AIService } from '../services/aiService';

interface NavbarProps {
  currentState: 'search' | 'browse' | 'details' | 'chat';
  onStateChange: (state: 'search' | 'browse') => void;
  onSettingsOpen: () => void;
  aiService: AIService;
}

export const Navbar = ({ currentState, onStateChange, onSettingsOpen, aiService }: NavbarProps) => {
  return (
    <div className="navbar bg-neutral text-neutral-content shadow-lg sticky top-0 z-50">
      <div className="navbar-start">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">ChatGov</h1>
          <span className="ml-2 badge badge-primary badge-sm">Beta</span>
        </div>
      </div>
      
      <div className="navbar-center">
        {(currentState === 'search' || currentState === 'browse') && (
          <div className="flex space-x-2">
            <button
              onClick={() => onStateChange('search')}
              className={`btn ${
                currentState === 'search'
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search Bills
            </button>
            <button
              onClick={() => onStateChange('browse')}
              className={`btn ${
                currentState === 'browse'
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Browse Bills
            </button>
          </div>
        )}
      </div>
      
      <div className="navbar-end">
        <div className="flex items-center space-x-4">
          {/* AI Provider Status */}
          <div className="badge badge-neutral gap-2">
            <div className={`w-2 h-2 rounded-full ${aiService.isConfigured() ? 'bg-success' : 'bg-error'}`}></div>
            <span className="text-xs">{aiService.getProviderName()}</span>
          </div>
          
          {/* GitHub Link */}
          <a
            href="https://github.com/Echo3ToEcho7/chatgov"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-square btn-ghost"
            title="View on GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          
          {/* Settings Button */}
          <button
            type="button"
            onClick={onSettingsOpen}
            className="btn btn-square btn-ghost"
            title="AI Settings"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="settings-modal"
            data-overlay="#settings-modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};