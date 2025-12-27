import { useState } from 'react';
import { Video, Users, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WelcomeScreenProps {
  onRegister: (name: string) => void;
}

const WelcomeScreen = ({ onRegister }: WelcomeScreenProps) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onRegister(name.trim());
    }
  };

  const features = [
    { icon: Video, text: 'HD Video Calls' },
    { icon: Users, text: 'Random Matching' },
    { icon: Zap, text: 'Instant Connect' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8 opacity-0 animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/20 border border-primary/30 mb-4">
            <Video className="w-10 h-10 text-primary" />
          </div>
          <h1 className="font-display text-5xl font-bold">
            <span className="gradient-text">Nexus</span>
            <span className="text-foreground"> Chat</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Connect with random strangers through instant video calls
          </p>
        </div>

        {/* Features */}
        <div className="flex justify-center gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.text}
              className="flex flex-col items-center gap-2 opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">{feature.text}</span>
            </div>
          ))}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="glass-card p-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground mb-2 block">
                Enter your display name
              </span>
              <Input
                type="text"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 text-lg bg-muted/50 border-border/50 focus:border-primary/50 rounded-xl"
              />
            </label>
            
            <Button 
              type="submit" 
              variant="glow" 
              size="lg" 
              className="w-full"
              disabled={!name.trim()}
            >
              Start Matching
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </form>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          By starting, you agree to connect with random strangers respectfully
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;