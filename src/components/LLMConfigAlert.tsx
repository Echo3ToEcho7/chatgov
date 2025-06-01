
interface LLMConfigAlertProps {
  isVisible: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export const LLMConfigAlert = ({ isVisible, onDismiss, onOpenSettings }: LLMConfigAlertProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="alert alert-warning flex items-center gap-4 shadow-lg" role="alert">
        <span className="icon-[tabler--alert-triangle] shrink-0 size-6"></span>
        <div className="flex-1">
          <p className="text-lg font-semibold mb-1">AI Configuration Required</p>
          <p className="text-sm">
            To chat about bills, you need to configure an AI provider. Please set up your API keys or Ollama configuration.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onOpenSettings}
            className="btn btn-sm btn-primary"
          >
            Open Settings
          </button>
          <button 
            onClick={onDismiss}
            className="btn btn-sm btn-ghost"
            data-remove-element
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};