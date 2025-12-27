import { UserX, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DisconnectedCardProps {
  onFindNext: () => void;
}

const DisconnectedCard = ({ onFindNext }: DisconnectedCardProps) => {
  return (
    <div className="glass-card p-8 text-center space-y-6 animate-scale-in max-w-md mx-auto">
      <div className="w-20 h-20 mx-auto rounded-full bg-warning/20 flex items-center justify-center border border-warning/30">
        <UserX className="w-10 h-10 text-warning" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-display text-2xl font-bold text-foreground">
          Peer Disconnected
        </h3>
        <p className="text-muted-foreground">
          The other person has left the chat. Ready for your next conversation?
        </p>
      </div>
      
      <Button 
        onClick={onFindNext} 
        variant="glow" 
        size="lg"
        className="w-full"
      >
        Find Next Match
        <ArrowRight className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default DisconnectedCard;