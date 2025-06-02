
interface LLMConfigAlertProps {
  isVisible: boolean;
  onDismiss: () => void;
  onOpenSettings: () => void;
}

export const LLMConfigAlert = ({ isVisible, onDismiss, onOpenSettings }: LLMConfigAlertProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="alert alert-soft alert-warning shadow-lg" role="alert">
        <span className="icon-[tabler--alert-triangle] shrink-0 size-6"></span>
        <div className="flex-1">
          <p className="font-semibold">AI Configuration Required</p>
          <p className="text-sm mt-1">
            To chat about bills, you need to configure an AI provider. Please set up your API keys or Ollama configuration.
          </p>
          <div className="mt-4 flex gap-2">
            <button 
              onClick={onOpenSettings}
              className="btn btn-primary btn-sm"
            >
              Open Settings
            </button>
            <button 
              onClick={onDismiss}
              className="btn btn-outline btn-secondary btn-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};