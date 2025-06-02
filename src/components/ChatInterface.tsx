import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { marked } from 'marked';
import type { Bill, ChatMessage } from '../types';
import type { AIService } from '../services/aiService';
import { BillTextService } from '../services/billTextService';
import { EmbeddingService } from '../services/embeddingService';
import type { BillContent } from '../types/bill';

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true, // Convert line breaks to <br>
  gfm: true,    // GitHub flavored markdown
});

interface ChatInterfaceProps {
  bill: Bill;
  onBack: () => void;
  aiService: AIService;
}

export const ChatInterface = ({ bill, onBack, aiService }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [billContent, setBillContent] = useState<BillContent | null>(null);
  const [isLoadingBill, setIsLoadingBill] = useState(true);
  const [billError, setBillError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAiMessageRef = useRef<HTMLDivElement>(null);
  
  // Local cache for bill content with embeddings, keyed by bill + embedding settings
  const [embeddingCache] = useState(new Map<string, BillContent>());
  
  const billTextService = new BillTextService();
  
  // Create embedding service that reacts to aiService changes
  const [embeddingService, setEmbeddingService] = useState(() => new EmbeddingService(aiService.getSettings()));
  
  // Update embedding service when aiService changes
  useEffect(() => {
    setEmbeddingService(new EmbeddingService(aiService.getSettings()));
    // Clear embedding cache when settings change
    embeddingCache.clear();
  }, [aiService, embeddingCache]);
  
  // Create a cache key that includes embedding settings to ensure cache invalidation when settings change
  const getEmbeddingCacheKey = (billId: string) => {
    const settings = aiService.getSettings();
    const embeddingKey = `${settings.embeddingProvider}-${settings.ollamaEmbeddingModel || 'default'}`;
    return `${billId}-${embeddingKey}`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToLastAiMessage = () => {
    if (lastAiMessageRef.current) {
      lastAiMessageRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Remove think tags and content before rendering
  const removeThinkTags = (text: string): string => {
    console.log('🧠 Original text:', text);
    
    // Remove <think>...</think> tags and any content inside them
    // This regex handles multiline content and is case-insensitive
    let cleanedText = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    
    // Also handle potential variations with spaces or newlines in the tags
    cleanedText = cleanedText.replace(/<\s*think\s*>[\s\S]*?<\s*\/\s*think\s*>/gi, '');
    
    // Clean up any extra whitespace
    cleanedText = cleanedText.trim();
    
    console.log('🧠 Cleaned text:', cleanedText);
    
    return cleanedText;
  };

  // Safely render markdown to HTML
  const renderMarkdown = (text: string): string => {
    try {
      // First remove think tags, then parse markdown
      const cleanedText = removeThinkTags(text);
      return marked.parse(cleanedText) as string;
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return removeThinkTags(text); // Fallback to plain text without think tags
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'ai') {
        // For AI messages, scroll to the top of the message
        setTimeout(() => scrollToLastAiMessage(), 100);
      } else {
        // For user messages, scroll to bottom as usual
        scrollToBottom();
      }
    }
  }, [messages]);

  useEffect(() => {
    const loadBillContent = async () => {
      setIsLoadingBill(true);
      setBillError(null);
      
      try {
        const billId = `${bill.congress}-${bill.type}-${bill.number}`;
        const cacheKey = getEmbeddingCacheKey(billId);
        
        // Check if we already have embeddings for this bill with current settings
        if (embeddingCache.has(cacheKey)) {
          const cachedContent = embeddingCache.get(cacheKey)!;
          setBillContent(cachedContent);
          return;
        }
        
        // Load bill text and create embeddings
        const content = await billTextService.getBillContent(bill);
        
        // Create embeddings with current settings
        const finalContent = await embeddingService.createEmbeddings(content);
        
        // Cache the result with current settings
        embeddingCache.set(cacheKey, finalContent);
        setBillContent(finalContent);
        
        // Send welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          text: `Hello! I've loaded the full text of ${bill.type} ${bill.number}: "${bill.title}". I can now answer specific questions about the bill's content, search through its sections, and provide detailed analysis. What would you like to know about this legislation?`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        
      } catch (error) {
        console.error('Failed to load bill content:', error);
        setBillError(error instanceof Error ? error.message : 'Failed to load bill content');
        
        // Send error message
        const errorMessage: ChatMessage = {
          id: 'error',
          text: `I encountered an error loading the full text of this bill: ${error instanceof Error ? error.message : 'Unknown error'}. I can still provide general information about the bill based on its metadata.`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([errorMessage]);
      } finally {
        setIsLoadingBill(false);
      }
    };

    loadBillContent();
  }, [bill]);

  const generateBillContext = (bill: Bill): string => {
    const formatSponsor = (sponsor: any) => {
      const district = sponsor.district ? `-${sponsor.district}` : '';
      return `${sponsor.firstName} ${sponsor.lastName} (${sponsor.party}-${sponsor.state}${district})`;
    };

    return `Bill: ${bill.type} ${bill.number} - ${bill.title}
Introduced: ${new Date(bill.introducedDate).toLocaleDateString()}
Congress: ${bill.congress}
${bill.sponsors ? `Sponsor: ${formatSponsor(bill.sponsors[0])}` : ''}
${bill.latestAction ? `Latest Action: ${bill.latestAction.text} (${new Date(bill.latestAction.actionDate).toLocaleDateString()})` : ''}
${bill.summary ? `Summary: ${bill.summary.text}` : ''}`;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const billContext = generateBillContext(bill);
      let relevantChunks;
      
      // If we have bill content with embeddings, search for relevant sections
      if (billContent && billContent.embeddings.length > 0) {
        try {
          relevantChunks = await embeddingService.searchSimilarChunks(inputMessage, billContent, 3);
        } catch (error) {
          console.warn('Failed to search bill content, proceeding without content search:', error);
        }
      }
      
      const aiResponseText = await aiService.generateResponse(inputMessage, billContext, relevantChunks, billContent?.billId);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please try again or check your AI settings.',
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="card h-[90vh] flex flex-col bg-base-200">
      <div className="card-header">
        <button 
          onClick={onBack} 
          className="btn btn-neutral mb-4"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div>
          <h2 className="card-title">
            {bill.type} {bill.number}
          </h2>
          <p className="text-base-content/70 text-sm leading-relaxed mb-3">
            {bill.title}
          </p>
          
          {/* Sponsor Information */}
          {bill.sponsors && bill.sponsors.length > 0 && (
            <div className="mb-3">
              <div className="text-sm font-medium text-base-content/90 mb-2">
                {bill.sponsors.length === 1 ? 'Sponsor:' : 'Sponsors:'}
              </div>
              <div className="flex flex-wrap gap-2">
                {bill.sponsors.map((sponsor, index) => (
                  <div
                    key={index}
                    className="badge badge-outline badge-lg flex items-center gap-2"
                  >
                    <span className="font-medium">
                      {sponsor.firstName} {sponsor.lastName}
                    </span>
                    <span className="text-xs">
                      ({sponsor.party}-{sponsor.state}{sponsor.district ? `-${sponsor.district}` : ''})
                    </span>
                  </div>
                ))}
              </div>
              {bill.sponsors.length > 3 && (
                <div className="text-xs text-base-content/60 mt-1">
                  and {bill.sponsors.length - 3} other{bill.sponsors.length - 3 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Bill Metadata */}
          <div className="flex flex-wrap gap-3 text-xs text-base-content/60 mb-3">
            <span>Congress {bill.congress}</span>
            <span>•</span>
            <span>Introduced {new Date(bill.introducedDate).toLocaleDateString()}</span>
            {bill.latestAction && (
              <>
                <span>•</span>
                <span>Latest: {new Date(bill.latestAction.actionDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
          {isLoadingBill && (
            <div className="flex items-center gap-2 mt-2 text-warning text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading full bill text and creating embeddings...
            </div>
          )}
          {billError && (
            <div className="alert alert-error mt-2">
              <span>⚠ {billError}</span>
            </div>
          )}
          {billContent && !isLoadingBill && (
            <div className="alert alert-success mt-2">
              <span>✓ Full bill text loaded ({billContent.chunks.length} sections)</span>
            </div>
          )}
        </div>
      </div>

      <div className="card-body flex-1 overflow-y-auto space-y-4 bg-base-200">
        {messages.map((message, index) => {
          const isLastAiMessage = message.sender === 'ai' && index === messages.length - 1;
          return (
            <div 
              key={message.id} 
              className={`chat ${message.sender === 'user' ? 'chat-sender' : 'chat-receiver'}`}
              ref={isLastAiMessage ? lastAiMessageRef : null}
            >
              <div className="chat-bubble">
                {message.sender === 'ai' ? (
                  <div 
                    className="leading-relaxed markdown-content text-left"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
                  />
                ) : (
                  <p className="leading-relaxed text-left">{message.text}</p>
                )}
              </div>
              <div className="chat-footer opacity-50">
                <time className="text-xs">
                  {message.timestamp.toLocaleTimeString()}
                </time>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="chat chat-receiver">
            <div className="chat-bubble">
              <div className="flex items-center gap-2">
                <span className="loading loading-dots loading-sm"></span>
                <span className="text-sm">AI is typing...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="card-footer">
        <div className="flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about this bill..."
            className="textarea textarea-bordered flex-1 resize-none"
            rows={3}
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn btn-primary self-end"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};