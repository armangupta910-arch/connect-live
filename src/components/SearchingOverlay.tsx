import { Users, Link2 } from 'lucide-react';

interface SearchingOverlayProps {
  isConnecting?: boolean;
}

const SearchingOverlay = ({ isConnecting = false }: SearchingOverlayProps) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
      <div className="text-center space-y-6">
        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto">
          {isConnecting ? (
            <>
              {/* Connection animation - pulsing link icon */}
              <div className="absolute inset-0 rounded-full border-2 border-secondary/40 animate-pulse" />
              <div className="absolute inset-4 rounded-full border-2 border-secondary/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/50">
                  <Link2 className="w-8 h-8 text-secondary animate-pulse" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Search animation - expanding rings */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute inset-4 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDelay: '0.6s' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                  <Users className="w-8 h-8 text-primary" />
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-foreground">
            {isConnecting ? 'Connecting to stranger...' : 'Finding someone...'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {isConnecting 
              ? 'Establishing video connection, please wait' 
              : 'Looking for a random stranger to connect with'}
          </p>
        </div>
        
        {/* Loading bar */}
        <div className="w-48 h-1 mx-auto bg-muted rounded-full overflow-hidden">
          <div className={`h-full rounded-full animate-shimmer ${isConnecting ? 'bg-secondary' : 'bg-primary'}`} />
        </div>
      </div>
    </div>
  );
};

export default SearchingOverlay;