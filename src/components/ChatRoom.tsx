import { RefObject } from 'react';
import { SkipForward, Video } from 'lucide-react';
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
  status,
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
              <Video className="w-5 h-5 text-primary" />
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
                Next
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
          <div className="w-full max-w-5xl relative">
            {/* Remote Video - Main focus */}
            <div className="relative animate-fade-in">
              <VideoPanel
                ref={remoteVideoRef}
                label="Stranger"
                name={peerName}
                isConnected={isConnected}
                isLarge
              />
              
              {/* Searching/Connecting overlay */}
              {(isSearching || isConnecting) && !isConnected && (
                <SearchingOverlay isConnecting={isConnecting} />
              )}
            </div>

            {/* Local Video - Floating picture-in-picture */}
            <div 
              className="absolute bottom-4 right-4 w-48 md:w-64 animate-fade-in z-20"
              style={{ animationDelay: '100ms' }}
            >
              <VideoPanel
                ref={localVideoRef}
                label="You"
                name={name}
                isLocal
                isConnected={isConnected}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatRoom;
