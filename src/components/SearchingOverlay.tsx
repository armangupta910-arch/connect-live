import { Users } from 'lucide-react';

const SearchingOverlay = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl">
      <div className="text-center space-y-6">
        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: '0.3s' }} />
          <div className="absolute inset-4 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDelay: '0.6s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
              <Users className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h3 className="font-display text-xl font-bold text-foreground">
            Finding someone...
          </h3>
          <p className="text-sm text-muted-foreground">
            Looking for a random stranger to connect with
          </p>
        </div>
        
        {/* Loading bar */}
        <div className="w-48 h-1 mx-auto bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-shimmer" />
        </div>
      </div>
    </div>
  );
};

export default SearchingOverlay;