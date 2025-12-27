import { Loader2, Check, AlertCircle, Search, Wifi, WifiOff } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusConfig = () => {
    if (status === 'connected') {
      return {
        icon: <Check className="w-4 h-4" />,
        text: 'Connected',
        className: 'bg-success/20 text-success border-success/30',
        indicatorClass: 'status-connected'
      };
    }
    if (status === 'peer-disconnected') {
      return {
        icon: <WifiOff className="w-4 h-4" />,
        text: 'Disconnected',
        className: 'bg-destructive/20 text-destructive border-destructive/30',
        indicatorClass: 'status-disconnected'
      };
    }
    if (status === 'queued' || status === 'searching') {
      return {
        icon: <Search className="w-4 h-4 animate-pulse" />,
        text: 'Searching...',
        className: 'bg-warning/20 text-warning border-warning/30',
        indicatorClass: 'status-searching'
      };
    }
    if (status === 'matched' || status === 'verified') {
      return {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        text: 'Connecting...',
        className: 'bg-primary/20 text-primary border-primary/30',
        indicatorClass: 'status-searching'
      };
    }
    if (status.includes('error')) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        text: 'Error',
        className: 'bg-destructive/20 text-destructive border-destructive/30',
        indicatorClass: 'status-disconnected'
      };
    }
    return {
      icon: <Wifi className="w-4 h-4" />,
      text: status,
      className: 'bg-muted text-muted-foreground border-border',
      indicatorClass: ''
    };
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${config.className}`}>
      <div className={`status-indicator ${config.indicatorClass}`} />
      {config.icon}
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
};

export default StatusBadge;