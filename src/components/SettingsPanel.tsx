import { useState, useEffect } from 'react';
import type { AISettings, ProviderConfig } from '../types/settings';
import { loadSettings, saveSettings, fetchOllamaModels } from '../utils/settings';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AISettings) => void;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    requiresApiKey: true,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    description: 'GPT models from OpenAI'
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    requiresApiKey: true,
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    description: 'Claude models from Anthropic'
  },
  {
    id: 'xai',
    name: 'xAI',
    requiresApiKey: true,
    models: ['grok-beta'],
    description: 'Grok models from xAI'
  },
  {
    id: 'ollama',
    name: 'Ollama',
    requiresApiKey: false,
    models: ['llama2', 'llama3', 'mistral', 'codellama'],
    description: 'Local models via Ollama'
  }
];

export const SettingsPanel = ({ isOpen, onClose, onSettingsChange }: SettingsPanelProps) => {
  const [settings, setSettings] = useState<AISettings>(loadSettings);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [ollamaModels, setOllamaModels] = useState<string[]>(PROVIDERS.find(p => p.id === 'ollama')?.models || []);
  const [ollamaEmbeddingModels, setOllamaEmbeddingModels] = useState<string[]>(['nomic-embed-text', 'all-minilm', 'mxbai-embed-large']);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingEmbeddingModels, setIsLoadingEmbeddingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [embeddingModelsError, setEmbeddingModelsError] = useState<string | null>(null);

  // Reload settings when panel opens to get latest saved values
  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings());
    }
  }, [isOpen]);


  // Auto-select embedding model when models list changes
  useEffect(() => {
    if (ollamaEmbeddingModels.length > 0 && !ollamaEmbeddingModels.includes(settings.ollamaEmbeddingModel)) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ollamaEmbeddingModel: ollamaEmbeddingModels[0]
      }));
    }
  }, [ollamaEmbeddingModels, settings.ollamaEmbeddingModel]);

  // Handle modal events and ensure FlyonUI initialization
  useEffect(() => {
    // Initialize FlyonUI when component mounts
    if (typeof window !== 'undefined' && window.HSStaticMethods) {
      setTimeout(() => {
        if (window.HSStaticMethods && typeof window.HSStaticMethods.autoInit === 'function') {
          window.HSStaticMethods.autoInit();
        }
      }, 100);
    }

    // Listen for modal close events to update React state
    const modalElement = document.getElementById('settings-modal');
    if (modalElement) {
      const handleModalClose = () => {
        // Update React state when FlyonUI closes the modal
        onClose();
      };

      // Listen for the transition end that indicates modal is fully closed
      modalElement.addEventListener('transitionend', (e) => {
        if (e.target === modalElement && modalElement.classList.contains('hidden')) {
          handleModalClose();
        }
      });

      return () => {
        modalElement.removeEventListener('transitionend', handleModalClose);
      };
    }
  }, [onClose]);

  const handleProviderChange = (providerId: string) => {
    const newSettings = { ...settings, provider: providerId as any };
    setSettings(newSettings);
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    const newSettings = {
      ...settings,
      apiKeys: { ...settings.apiKeys, [provider]: value }
    };
    setSettings(newSettings);
  };

  const handleOllamaConfigChange = (field: 'baseUrl' | 'model', value: string) => {
    const newSettings = {
      ...settings,
      ollamaConfig: { ...settings.ollamaConfig, [field]: value }
    };
    setSettings(newSettings);
    
    // Auto-refresh models when base URL changes
    if (field === 'baseUrl' && value !== settings.ollamaConfig.baseUrl) {
      // Debounce the refresh to avoid too many requests
      setTimeout(() => {
        fetchOllamaModels(value)
          .then(models => {
            if (models.length > 0) {
              setOllamaModels(models);
              setModelsError(null);
            }
          })
          .catch(() => {
            // Silently fail for auto-refresh, user can manually refresh if needed
          });
      }, 1000);
    }
  };

  const handleSave = () => {
    saveSettings(settings);
    onSettingsChange(settings);
    onClose();
  };

  const toggleApiKeyVisibility = (provider: string) => {
    setShowApiKey(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const refreshOllamaModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    
    try {
      const models = await fetchOllamaModels(settings.ollamaConfig.baseUrl);
      if (models.length === 0) {
        setModelsError('No models found. Make sure Ollama is running and has models installed.');
        setOllamaModels(PROVIDERS.find(p => p.id === 'ollama')?.models || []);
      } else {
        setOllamaModels(models);
        setModelsError(null);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setModelsError(`Failed to connect to Ollama: ${errorMessage}`);
      setOllamaModels(PROVIDERS.find(p => p.id === 'ollama')?.models || []);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const refreshOllamaEmbeddingModels = async () => {
    setIsLoadingEmbeddingModels(true);
    setEmbeddingModelsError(null);
    
    try {
      const models = await fetchOllamaModels(settings.ollamaConfig.baseUrl);
      if (models.length === 0) {
        setEmbeddingModelsError('No models found. Make sure Ollama is running and has embedding models installed.');
        const defaultModels = ['nomic-embed-text', 'all-minilm', 'mxbai-embed-large'];
        setOllamaEmbeddingModels(defaultModels);
        
        // Auto-select first default model if current model isn't in defaults
        if (!defaultModels.includes(settings.ollamaEmbeddingModel)) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ollamaEmbeddingModel: defaultModels[0]
          }));
        }
      } else {
        // Filter for embedding models (models that typically contain 'embed' in their name)
        const embeddingModels = models.filter(model => 
          model.toLowerCase().includes('embed') || 
          model.toLowerCase().includes('embedding') ||
          ['all-minilm', 'bge-', 'e5-'].some(prefix => model.toLowerCase().includes(prefix))
        );
        
        if (embeddingModels.length > 0) {
          setOllamaEmbeddingModels(embeddingModels);
          
          // Auto-select first model if current model isn't available
          if (!embeddingModels.includes(settings.ollamaEmbeddingModel)) {
            setSettings(prevSettings => ({
              ...prevSettings,
              ollamaEmbeddingModel: embeddingModels[0]
            }));
          }
        } else {
          // If no embedding models found, show all models but with a warning
          setOllamaEmbeddingModels(models);
          setEmbeddingModelsError('No embedding-specific models detected. Showing all models - make sure to select an embedding model.');
          
          // Auto-select first model if current model isn't available
          if (models.length > 0 && !models.includes(settings.ollamaEmbeddingModel)) {
            setSettings(prevSettings => ({
              ...prevSettings,
              ollamaEmbeddingModel: models[0]
            }));
          }
        }
        
        if (!embeddingModelsError) {
          setEmbeddingModelsError(null);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setEmbeddingModelsError(`Failed to connect to Ollama: ${errorMessage}`);
      setOllamaEmbeddingModels(['nomic-embed-text', 'all-minilm', 'mxbai-embed-large']);
    } finally {
      setIsLoadingEmbeddingModels(false);
    }
  };

  return (
    <div 
      id="settings-modal"
      className="overlay modal overlay-open:opacity-100 overlay-open:duration-300 hidden"
      role="dialog" 
      tabIndex={-1}
      data-overlay-options='{"bodyScroll":false}'
    >
      <div className="modal-dialog modal-dialog-lg overlay-open:opacity-100 overlay-open:duration-300">
        <div className="modal-content">
          <div className="modal-header">
            <h3 className="modal-title">AI Settings</h3>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-text btn-circle btn-sm"
              aria-label="Close"
              data-overlay="#settings-modal"
            >
              ×
            </button>
          </div>
          <div className="modal-body">

            <div className="space-y-6">
              {/* Provider Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">AI Provider</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {PROVIDERS.map((provider) => (
                    <label
                      key={provider.id}
                      className={`card card-border cursor-pointer transition-colors ${
                        settings.provider === provider.id
                          ? 'border-primary bg-primary/10'
                          : ''
                      }`}
                    >
                      <div className="card-body">
                        <input
                          type="radio"
                          name="provider"
                          value={provider.id}
                          checked={settings.provider === provider.id}
                          onChange={(e) => handleProviderChange(e.target.value)}
                          className="sr-only"
                        />
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{provider.name}</span>
                          {provider.requiresApiKey && (
                            <span className="badge badge-warning badge-xs">
                              API Key Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-base-content/70">{provider.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* API Keys Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">API Keys</h3>
                <div className="space-y-4">
                  {PROVIDERS.filter(p => p.requiresApiKey).map((provider) => (
                    <div key={provider.id}>
                      <label className="label">
                        <span className="label-text">{provider.name} API Key</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey[provider.id] ? 'text' : 'password'}
                          value={settings.apiKeys[provider.id as keyof typeof settings.apiKeys]}
                          onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                          placeholder={`Enter your ${provider.name} API key`}
                          className="input input-bordered w-full pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => toggleApiKeyVisibility(provider.id)}
                          className="btn btn-ghost btn-sm absolute right-1 top-1/2 transform -translate-y-1/2"
                        >
                          {showApiKey[provider.id] ? (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Embedding Provider Selection */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Embedding Provider</h3>
                <p className="text-sm text-base-content/60 mb-4">
                  Choose which service to use for creating embeddings from bill text. This enables content-based search within bills.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className={`card card-border cursor-pointer transition-colors ${
                    settings.embeddingProvider === 'openai'
                      ? 'border-primary bg-primary/10'
                      : ''
                  }`}>
                    <div className="card-body">
                      <input
                        type="radio"
                        name="embeddingProvider"
                        value="openai"
                        checked={settings.embeddingProvider === 'openai'}
                        onChange={(e) => setSettings({...settings, embeddingProvider: e.target.value as any})}
                        className="sr-only"
                      />
                      <div className="font-medium mb-1">OpenAI</div>
                      <div className="text-sm text-base-content/70">Fast and accurate embeddings</div>
                    </div>
                  </label>
                  <label className={`card card-border cursor-pointer transition-colors ${
                    settings.embeddingProvider === 'ollama'
                      ? 'border-primary bg-primary/10'
                      : ''
                  }`}>
                    <div className="card-body">
                      <input
                        type="radio"
                        name="embeddingProvider"
                        value="ollama"
                        checked={settings.embeddingProvider === 'ollama'}
                        onChange={(e) => setSettings({...settings, embeddingProvider: e.target.value as any})}
                        className="sr-only"
                      />
                      <div className="font-medium mb-1">Ollama</div>
                      <div className="text-sm text-base-content/70">Local embeddings (configurable model)</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Ollama Configuration */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Ollama Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Base URL</span>
                    </label>
                    <input
                      type="text"
                      value={settings.ollamaConfig.baseUrl}
                      onChange={(e) => handleOllamaConfigChange('baseUrl', e.target.value)}
                      placeholder="http://localhost:11434"
                      className="input input-bordered w-full"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label">
                        <span className="label-text">Model</span>
                      </label>
                      <button
                        type="button"
                        onClick={refreshOllamaModels}
                        disabled={isLoadingModels}
                        className="btn btn-primary btn-sm"
                        title="Refresh available models from Ollama"
                      >
                        <svg 
                          className={`w-4 h-4 ${isLoadingModels ? 'animate-spin' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                          />
                        </svg>
                        {isLoadingModels ? 'Loading...' : 'Refresh'}
                      </button>
                    </div>
                    {modelsError && (
                      <div className="alert alert-error mb-2">
                        <span>{modelsError}</span>
                      </div>
                    )}
                    <select
                      value={settings.ollamaConfig.model}
                      onChange={(e) => handleOllamaConfigChange('model', e.target.value)}
                      className="select select-bordered w-full"
                    >
                      {ollamaModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                    {ollamaModels.length > 0 && !modelsError && (
                      <p className="mt-1 text-xs text-base-content/60">
                        {ollamaModels.length} model{ollamaModels.length !== 1 ? 's' : ''} available
                      </p>
                    )}
                  </div>
              
              {/* Ollama Embedding Model Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Embedding Model
                  </label>
                  <button
                    type="button"
                    onClick={refreshOllamaEmbeddingModels}
                    disabled={isLoadingEmbeddingModels}
                    className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
                    title="Refresh available embedding models from Ollama"
                  >
                    <svg 
                      className={`w-4 h-4 ${isLoadingEmbeddingModels ? 'animate-spin' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                      />
                    </svg>
                    {isLoadingEmbeddingModels ? 'Loading...' : 'Refresh'}
                  </button>
                </div>
                {embeddingModelsError && (
                  <div className="mb-2 p-2 bg-yellow-900/50 border border-yellow-700 rounded text-yellow-300 text-sm">
                    {embeddingModelsError}
                  </div>
                )}
                <select
                  value={settings.ollamaEmbeddingModel}
                  onChange={(e) => {
                    setSettings(prevSettings => ({
                      ...prevSettings, 
                      ollamaEmbeddingModel: e.target.value
                    }));
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {ollamaEmbeddingModels.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                {ollamaEmbeddingModels.length > 0 && !embeddingModelsError && (
                  <p className="mt-1 text-xs text-gray-400">
                    {ollamaEmbeddingModels.length} embedding model{ollamaEmbeddingModels.length !== 1 ? 's' : ''} available
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Recommended: nomic-embed-text, all-minilm, or mxbai-embed-large
                </p>
              </div>
            </div>
          </div>

          {/* Congress Configuration */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Congress Configuration</h3>
            <div>
              <label className="label">
                <span className="label-text">Congress Number</span>
                <span className="label-text-alt">Used for browsing passed legislation</span>
              </label>
              <input
                type="number"
                min="1"
                max="150"
                value={settings.congressNumber}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value > 0) {
                    setSettings(prevSettings => ({
                      ...prevSettings,
                      congressNumber: value
                    }));
                  }
                }}
                placeholder="119"
                className="input input-bordered w-full"
              />
              <div className="label">
                <span className="label-text-alt">Current: {settings.congressNumber}th Congress</span>
                <span className="label-text-alt">Default: 119th Congress (2025-2027)</span>
              </div>
            </div>
          </div>

              {/* Current Provider Status */}
              <div className="card bg-neutral text-neutral-content">
                <div className="card-body">
                  <h4 className="card-title">Current Configuration</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Provider:</strong> {PROVIDERS.find(p => p.id === settings.provider)?.name}</p>
                    {settings.provider !== 'ollama' && (
                      <p><strong>API Key:</strong> {settings.apiKeys[settings.provider] ? '✓ Configured' : '⚠ Not configured'}</p>
                    )}
                    {settings.provider === 'ollama' && (
                      <>
                        <p><strong>Ollama URL:</strong> {settings.ollamaConfig.baseUrl}</p>
                        <p><strong>Chat Models Available:</strong> {ollamaModels.length}</p>
                      </>
                    )}
                    <p><strong>Embedding Provider:</strong> {settings.embeddingProvider === 'openai' ? 'OpenAI' : 'Ollama'}</p>
                    {settings.embeddingProvider === 'ollama' && (
                      <>
                        <p><strong>Embedding Model:</strong> {settings.ollamaEmbeddingModel}</p>
                        <p><strong>Embedding Models Available:</strong> {ollamaEmbeddingModels.length}</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              data-overlay="#settings-modal"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary"
              data-overlay="#settings-modal"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};