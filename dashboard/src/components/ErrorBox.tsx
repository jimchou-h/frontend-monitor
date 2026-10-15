import { RefreshCw } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBox({ message, onRetry }: Props) {
  return (
    <div className="error-box">
      <span>{message}</span>
      {onRetry && (
        <button className="btn ghost" onClick={onRetry}>
          <RefreshCw size={14} /> 重试
        </button>
      )}
    </div>
  );
}
