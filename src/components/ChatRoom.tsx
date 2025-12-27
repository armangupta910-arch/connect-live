import { RefObject } from 'react';
import { SkipForward, PhoneOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VideoPanel from './VideoPanel';
import StatusBadge from './StatusBadge';
import SearchingOverlay from './SearchingOverlay';
import DisconnectedCard from './DisconnectedCard';

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
  roomCode,
  status,
  isInitiator,
  localVideoRef,
  remoteVideoRef,
  onSkip,
  onFindNext,
}: ChatRoomProps) => {
  const isConnected = status === 'connected';
  const isDisconnected = status === 'peer-disconnected';
  const isSearching = status === 'queued' || status === 'searching';
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
              <p className="text-xs text-muted-foreground">
                {roomCode ? `Room: ${roomCode.slice(0, 8)}...` : 'Finding match...'}
              </p>
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
        {isDisconnected ? (
          <DisconnectedCard onFindNext={onFindNext} />
        ) : (
          <div className="w-full max-w-6xl">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Local Video */}
              <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                <VideoPanel
                  ref={localVideoRef}
                  label="You"
                  name={name}
                  isLocal
                  isConnected={isConnected}
                />
              </div>

              {/* Remote Video */}
              <div className="relative animate-fade-in" style={{ animationDelay: '200ms' }}>
                <VideoPanel
                  ref={remoteVideoRef}
                  label="Stranger"
                  name={peerName}
                  isConnected={isConnected}
                />
                
                {/* Searching/Connecting overlay */}
                {(isSearching || isConnecting) && !isConnected && (
                  <SearchingOverlay isConnecting={isConnecting} />
                )}
              </div>
            </div>

            {/* Info bar */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">Role:</span>
                <span className="px-2 py-1 rounded-md bg-muted">
                  {isInitiator === null ? 'Waiting...' : isInitiator ? 'Initiator' : 'Responder'}
                </span>
              </div>
              {peerName && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Talking to:</span>
                  <span className="px-2 py-1 rounded-md bg-secondary/20 text-secondary">
                    {peerName}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-border/50">
        <div className="container mx-auto text-center text-xs text-muted-foreground">
          <p>
            Matching service: <code className="px-1 py-0.5 rounded bg-muted">localhost:8000</code>
            {' · '}
            Signaling: <code className="px-1 py-0.5 rounded bg-muted">localhost:4000</code>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ChatRoom;