import { useState, useRef, useEffect, useCallback } from "react";
import SimplePeer from "simple-peer-light";
import BackgroundEffects from "@/components/BackgroundEffects";
import WelcomeScreen from "@/components/WelcomeScreen";
import ChatRoom from "@/components/ChatRoom";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [name, setName] = useState("");
  const [registered, setRegistered] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [peerName, setPeerName] = useState("");
  const [isInitiator, setIsInitiator] = useState<boolean | null>(null);
  const [status, setStatus] = useState("idle");
  
  const matchWsRef = useRef<WebSocket | null>(null);
  const signalWsRef = useRef<WebSocket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const initiatorFlagRef = useRef<boolean | null>(null);
  const roomCodeRef = useRef<string>("");
  const peerNameRef = useRef<string>("");
  const pendingSignalsRef = useRef<any[]>([]);
  const isVerifiedRef = useRef<boolean>(false);

  const { toast } = useToast();

  // Helper to send signal - queues if WS not ready
  const sendSignal = useCallback((payload: any) => {
    const ws = signalWsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN && isVerifiedRef.current) {
      ws.send(JSON.stringify(payload));
      console.log("[sendSignal] Sent:", payload.data?.type || payload.type);
    } else {
      pendingSignalsRef.current.push(payload);
      console.log("[sendSignal] Queued (WS not ready or not verified):", payload.data?.type);
    }
  }, []);

  // Flush pending signals
  const flushPendingSignals = useCallback(() => {
    const ws = signalWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const pending = pendingSignalsRef.current;
    if (pending.length > 0) {
      console.log(`[flushPendingSignals] Flushing ${pending.length} queued signals`);
      pending.forEach(payload => {
        ws.send(JSON.stringify(payload));
      });
      pendingSignalsRef.current = [];
    }
  }, []);

  // Cleanup function for peer disconnection
  const cleanupPeerConnection = useCallback(() => {
    console.log("[cleanup] Cleaning up peer connection");
    
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (e) {
        console.error("[cleanup] peer destroy error:", e);
      }
      peerRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (signalWsRef.current) {
      try {
        signalWsRef.current.close();
      } catch (e) {
        console.error("[cleanup] signaling ws close error:", e);
      }
      signalWsRef.current = null;
    }
    
    setRoomCode("");
    setPeerName("");
    setIsInitiator(null);
    initiatorFlagRef.current = null;
    roomCodeRef.current = "";
    peerNameRef.current = "";
    pendingSignalsRef.current = [];
    isVerifiedRef.current = false;
  }, []);

  // Find next match
  const findNextMatch = useCallback(async () => {
    cleanupPeerConnection();
    setStatus("searching");
    
    try {
      const resp = await fetch("http://localhost:8000/registerForMatching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const body = await resp.json();
      console.log("[findNext] register resp:", body);
      setStatus("queued");
    } catch (e) {
      console.error("[findNext] Register failed", e);
      setStatus("register-failed");
      toast({
        title: "Connection failed",
        description: "Could not connect to matching service",
        variant: "destructive",
      });
    }
  }, [cleanupPeerConnection, name, toast]);

  // Create peer connection for initiator
  const createInitiatorPeer = useCallback((stream: MediaStream, room_code: string, peer: string) => {
    console.log("[webrtc] Creating peer as initiator");
    
    const peerObj = new SimplePeer({
      initiator: true,
      trickle: true,
      stream
    });

    peerObj.on("signal", (data) => {
      console.log("[initiator] Signal event fired:", data.type);
      sendSignal({
        event: "signal",
        room_code,
        target: peer,
        from: name,
        data
      });
    });

    peerObj.on("stream", (remoteStream) => {
      console.log("[peer] Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => {});
      }
    });

    peerObj.on("connect", () => {
      console.log("[peer] Connected!");
      setStatus("connected");
      toast({ title: "Connected!", description: `You are now chatting with ${peer}` });
    });

    peerObj.on("error", (err) => {
      console.error("[peer] error:", err);
      toast({ title: "Connection error", description: "Something went wrong", variant: "destructive" });
      setStatus("peer-error: " + err.message);
    });

    peerObj.on("close", () => {
      console.log("[peer] Connection closed by peer");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
      // Auto-restart matching when peer leaves
      setTimeout(() => findNextMatch(), 500);
    });

    peerRef.current = peerObj;
  }, [cleanupPeerConnection, toast, sendSignal, name, findNextMatch]);

  // Create peer connection for responder
  const createResponderPeer = useCallback((stream: MediaStream, signalData: any, room_code: string, fromPeer: string) => {
    console.log("[webrtc] Creating peer as responder");
    
    const peerObj = new SimplePeer({
      initiator: false,
      trickle: true,
      stream
    });

    peerObj.on("signal", (data) => {
      console.log("[responder] Signal event fired:", data.type);
      sendSignal({
        event: "signal",
        room_code,
        target: fromPeer,
        from: name,
        data
      });
    });

    peerObj.on("stream", (remoteStream) => {
      console.log("[peer] Received remote stream");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => {});
      }
    });

    peerObj.on("connect", () => {
      console.log("[peer] Connected!");
      setStatus("connected");
      toast({ title: "Connected!", description: "You are now chatting with a stranger" });
    });

    peerObj.on("error", (err) => {
      console.error("[peer] error:", err);
      toast({ title: "Connection error", description: "Something went wrong", variant: "destructive" });
      setStatus("peer-error: " + err.message);
    });

    peerObj.on("close", () => {
      console.log("[peer] Connection closed by peer");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
      // Auto-restart matching when peer leaves
      setTimeout(() => findNextMatch(), 500);
    });

    peerRef.current = peerObj;

    try {
      peerObj.signal(signalData);
    } catch (e) {
      console.error("[peer] initial signal error:", e);
    }
  }, [cleanupPeerConnection, toast, sendSignal, name, findNextMatch]);

  // Handle signaling messages
  const handleSignalMessage = useCallback((msg: any) => {
    if (!msg || !msg.event) return;

    console.log("[sigws] Received message:", msg.event);

    if (msg.event === "verified") {
      console.log("[sigws] verified", msg);
      setStatus("verified");
      isVerifiedRef.current = true;
      flushPendingSignals();
    }

    if (msg.event === "signal") {
      console.log("[sigws] signal received, peerRef:", !!peerRef.current, "initiatorFlag:", initiatorFlagRef.current);
      
      if (!peerRef.current && initiatorFlagRef.current === false) {
        console.log("[sigws] Creating peer as responder (receiving first signal)");
        const stream = localStreamRef.current;
        
        if (!stream) {
          console.error("[responder] No local stream available");
          return;
        }

        createResponderPeer(stream, msg.data, msg.room_code || roomCodeRef.current, msg.from || peerNameRef.current);
        return;
      }

      if (peerRef.current) {
        try {
          peerRef.current.signal(msg.data);
        } catch (e) {
          console.error("[peer] signal error:", e);
        }
      }
    }

    if (msg.event === "error") {
      console.error("Signaling error:", msg.message || msg);
      toast({ title: "Connection error", description: msg.message || "Unknown error", variant: "destructive" });
      setStatus("error: " + (msg.message || "unknown"));
    }

    if (msg.event === "peer-disconnected") {
      console.log("[sigws] Peer disconnected notification from server");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
      // Auto-restart matching when peer leaves
      setTimeout(() => findNextMatch(), 500);
    }
  }, [cleanupPeerConnection, toast, createResponderPeer, flushPendingSignals, findNextMatch]);

  // Store the latest handleSignalMessage in a ref
  const handleSignalMessageRef = useRef(handleSignalMessage);
  useEffect(() => {
    handleSignalMessageRef.current = handleSignalMessage;
  }, [handleSignalMessage]);

  const openSignalingWS = useCallback((username: string) => {
    if (signalWsRef.current) return;
    
    const ws = new WebSocket(`ws://localhost:4000/ws/${encodeURIComponent(username)}`);
    
    ws.onopen = () => {
      console.log("[sigws] connected");
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleSignalMessageRef.current(msg);
      } catch (e) {
        console.error("Invalid JSON on signaling ws:", ev.data);
      }
    };
    
    ws.onclose = () => {
      console.log("[sigws] closed");
    };
    
    ws.onerror = (e) => {
      console.error("[sigws] err", e);
    };
    
    signalWsRef.current = ws;
  }, []);

  const openMatchingWS = useCallback((username: string) => {
    if (matchWsRef.current) return;
    
    const ws = new WebSocket(`ws://localhost:8000/ws/${encodeURIComponent(username)}`);
    
    ws.onopen = () => {
      console.log("[matchws] connected");
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        
        if (msg.event === "matched") {
          console.log("[matchws] matched", msg);
          const rc = msg.room_code;
          const initiator = Boolean(msg.initiator);
          
          toast({ title: "Match found!", description: "Connecting you now..." });
          
          setRoomCode(rc);
          roomCodeRef.current = rc;
          
          const parts = rc.split("_");
          const peer = parts.find((p: string) => p !== username) || "";
          setPeerName(peer);
          peerNameRef.current = peer;
          
          setIsInitiator(initiator);
          initiatorFlagRef.current = initiator;
          setStatus("matched");

          const setupAndJoin = async () => {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                void localVideoRef.current.play().catch(() => {});
              }
              console.log("[matchws] Media acquired successfully");
            } catch (e) {
              console.error("[matchws] getUserMedia failed:", e);
              toast({
                title: "Camera/Mic access needed",
                description: "Please allow access to your camera and microphone",
                variant: "destructive",
              });
              setStatus("media-error");
              return;
            }

            openSignalingWS(username);
            
            const waitForSig = setInterval(() => {
              if (signalWsRef.current && signalWsRef.current.readyState === WebSocket.OPEN) {
                clearInterval(waitForSig);
                
                signalWsRef.current.send(JSON.stringify({
                  event: "join",
                  room_code: rc,
                  target: peer,
                  role: initiator ? "initiator" : "responder"
                }));
                
                if (initiator) {
                  createInitiatorPeer(localStreamRef.current!, rc, peer);
                }
              }
            }, 100);
          };

          setupAndJoin();
        } else {
          console.log("[matchws] msg", msg);
        }
      } catch (e) {
        console.error("[matchws] bad message", ev.data);
      }
    };
    
    ws.onclose = () => {
      console.log("[matchws] closed");
      setStatus("matching-service-disconnected");
    };
    
    ws.onerror = (e) => {
      console.error("[matchws] err", e);
    };
    
    matchWsRef.current = ws;
  }, [openSignalingWS, createInitiatorPeer, toast]);

  const register = useCallback(async (userName: string) => {
    if (!userName) return;
    
    setName(userName);
    
    try {
      openMatchingWS(userName);
      
      const resp = await fetch("http://localhost:8000/registerForMatching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName })
      });
      
      const body = await resp.json();
      console.log("register resp:", body);
      setRegistered(true);
      setStatus("queued");
      toast({
        title: "You're in the queue!",
        description: "Looking for someone to match with...",
      });
    } catch (e) {
      console.error("Register failed", e);
      setStatus("register-failed");
      toast({
        title: "Connection failed",
        description: "Could not connect to matching service. Make sure it's running.",
        variant: "destructive",
      });
    }
  }, [openMatchingWS, toast]);

  const handleSkip = useCallback(() => {
    if (window.confirm("Are you sure you want to skip this person?")) {
      findNextMatch();
    }
  }, [findNextMatch]);

  useEffect(() => {
    return () => {
      try {
        if (matchWsRef.current) matchWsRef.current.close();
        if (signalWsRef.current) signalWsRef.current.close();
        if (peerRef.current) peerRef.current.destroy();
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <BackgroundEffects />
      
      <div className="relative z-10">
        {!registered ? (
          <WelcomeScreen onRegister={register} />
        ) : (
          <ChatRoom
            name={name}
            peerName={peerName}
            roomCode={roomCode}
            status={status}
            isInitiator={isInitiator}
            localVideoRef={localVideoRef}
            remoteVideoRef={remoteVideoRef}
            onSkip={handleSkip}
            onFindNext={findNextMatch}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
