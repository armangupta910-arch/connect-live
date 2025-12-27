import { forwardRef } from 'react';
import { User, Volume2 } from 'lucide-react';

interface VideoPanelProps {
  label: string;
  name?: string;
  isLocal?: boolean;
  isConnected?: boolean;
}

const VideoPanel = forwardRef<HTMLVideoElement, VideoPanelProps>(
  ({ label, name, isLocal = false, isConnected = false }, ref) => {
    return (
      <div className="relative group">
        {/* Glow effect */}
        <div className={`absolute -inset-1 rounded-2xl blur-xl transition-opacity duration-500 ${
          isConnected ? 'opacity-60' : 'opacity-30'
        } ${isLocal ? 'bg-primary/30' : 'bg-secondary/30'}`} />
        
        {/* Video container */}
        <div className="relative video-container aspect-video">
          <video
            ref={ref}
            autoPlay
            playsInline
            muted={isLocal}
            onLoadedMetadata={(e) => {
              void e.currentTarget.play().catch(() => {
                // Autoplay can be blocked until a user gesture.
              });
            }}
            onClick={(e) => {
              if (!isLocal) e.currentTarget.muted = false;
              void e.currentTarget.play().catch(() => {
                // Autoplay can be blocked until a user gesture.
              });
            }}
            className="w-full h-full object-cover rounded-2xl"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-2xl" />
          
          {/* User info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isLocal ? 'bg-primary/20 border border-primary/50' : 'bg-secondary/20 border border-secondary/50'
                }`}>
                  <User className={`w-5 h-5 ${isLocal ? 'text-primary' : 'text-secondary'}`} />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">
                    {name || label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isLocal ? 'You' : 'Stranger'}
                  </p>
                </div>
              </div>
              
              {!isLocal && isConnected && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/20 border border-success/30">
                  <Volume2 className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">Live</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Border glow effect */}
          <div className={`absolute inset-0 rounded-2xl pointer-events-none ${
            isConnected ? 'glow-border' : ''
          }`} />
        </div>
      </div>
    );
  }
);

VideoPanel.displayName = 'VideoPanel';

export default VideoPanel;