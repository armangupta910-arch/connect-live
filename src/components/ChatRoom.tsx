import { RefObject } from 'react';
import { SkipForward, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from './StatusBadge';
import SearchingOverlay from './SearchingOverlay';

interface ChatRoomProps {
  name: string;
  peerName: string;
  roomCode: string;
  status: string;
  isInitiator: boolean | null;
  localVideoRef: RefObject<HTMLVideoElement>;
  remoteVideoRef: RefObject<HTMLVideoElement>;
  onSkip: () => void;
  onFindNext: () => void;
}

const ChatRoom = ({
  name,
  peerName,
  status,
  localVideoRef,
  remoteVideoRef,
  onSkip,
}: ChatRoomProps) => {
  const isConnected = status === 'connected';
  const isSearching = status === 'queued' || status === 'searching' || status === 'peer-disconnected';
  const isConnecting = status === 'matched' || status === 'verified';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">
                <span className="gradient-text">Nexus</span> Chat
              </h1>
              {peerName && isConnected && (
                <p className="text-xs text-muted-foreground">
                  Chatting with {peerName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <StatusBadge status={status} />
            
            {isConnected && (
              <Button
                onClick={onSkip}
                variant="destructive"
                size="sm"
                className="gap-2"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto p-4 flex items-center justify-center">
        <div className="w-full max-w-5xl relative">
          {/* Remote Video - Full size */}
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-muted/30 animate-fade-in">
            {/* Remote video glow */}
            <div className={`absolute -inset-1 rounded-2xl blur-xl transition-opacity duration-500 ${
              isConnected ? 'opacity-60 bg-secondary/30' : 'opacity-20 bg-muted/30'
            }`} />
            
            <div className="relative w-full h-full">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                onClick={(e) => {
                  e.currentTarget.muted = false;
                  void e.currentTarget.play().catch(() => {});
                }}
                onLoadedMetadata={(e) => {
                  void e.currentTarget.play().catch(() => {});
                }}
                className="w-full h-full object-cover rounded-2xl"
              />
              
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent rounded-2xl" />
              
              {/* Stranger info overlay */}
              {isConnected && peerName && (
                <div className="absolute bottom-4 left-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary/50 flex items-center justify-center">
                    <User className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-foreground">{peerName}</p>
                    <p className="text-xs text-muted-foreground">Stranger</p>
                  </div>
                </div>
              )}
              
              {/* Searching/Connecting overlay */}
              {(isSearching || isConnecting) && !isConnected && (
                <SearchingOverlay isConnecting={isConnecting} />
              )}
              
              {/* Border glow effect when connected */}
              {isConnected && (
                <div className="absolute inset-0 rounded-2xl pointer-events-none glow-border" />
              )}
            </div>
          </div>

          {/* Local Video - Floating small */}
          <div className="absolute bottom-4 right-4 w-40 md:w-56 aspect-video rounded-xl overflow-hidden shadow-2xl border-2 border-background/50 animate-fade-in" style={{ animationDelay: '100ms' }}>
            {/* Local video glow */}
            <div className={`absolute -inset-1 rounded-xl blur-md transition-opacity duration-500 ${
              isConnected ? 'opacity-40 bg-primary/30' : 'opacity-20 bg-primary/20'
            }`} />
            
            <div className="relative w-full h-full">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  void e.currentTarget.play().catch(() => {});
                }}
                className="w-full h-full object-cover rounded-xl"
              />
              
              {/* Your name label */}
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-background/70 backdrop-blur-sm">
                <p className="text-xs font-medium text-foreground">{name} (You)</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatRoom;
