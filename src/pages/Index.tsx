import { useState, useRef, useEffect, useCallback } from "react";
import SimplePeer from "simple-peer";
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
      toast({ title: "📤 Signal sent", description: `Type: ${payload.data?.type}, To: ${payload.target}` });
    } else {
      pendingSignalsRef.current.push(payload);
      console.log("[sendSignal] Queued (WS not ready or not verified):", payload.data?.type);
      toast({ title: "⏳ Signal queued", description: `WS ready: ${ws?.readyState === WebSocket.OPEN}, Verified: ${isVerifiedRef.current}` });
    }
  }, [toast]);

  // Flush pending signals
  const flushPendingSignals = useCallback(() => {
    const ws = signalWsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const pending = pendingSignalsRef.current;
    if (pending.length > 0) {
      console.log(`[flushPendingSignals] Flushing ${pending.length} queued signals`);
      toast({ title: "📤 Flushing signals", description: `Sending ${pending.length} queued signals` });
      
      pending.forEach(payload => {
        ws.send(JSON.stringify(payload));
        console.log("[flushPendingSignals] Sent queued:", payload.data?.type);
      });
      pendingSignalsRef.current = [];
    }
  }, [toast]);

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
        console.log(`[cleanup] Stopped ${track.kind} track`);
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
    toast({ title: "🔍 Searching", description: "Looking for a new match..." });
    
    try {
      const resp = await fetch("http://localhost:8000/registerForMatching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      const body = await resp.json();
      console.log("[findNext] register resp:", body);
      setStatus("queued");
      toast({ title: "📋 Queued", description: "You're in the queue, waiting for match..." });
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
    toast({ title: "🚀 Initiator", description: "Creating WebRTC connection as initiator..." });
    
    const peerObj = new SimplePeer({
      initiator: true,
      trickle: true,
      stream
    });

    peerObj.on("signal", (data) => {
      console.log("[initiator] Signal event fired:", data.type, "-> target:", peer);
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
      toast({ title: "🎥 Remote stream!", description: "Received video from stranger" });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => {});
      }
    });

    peerObj.on("connect", () => {
      console.log("[peer] Connected!");
      setStatus("connected");
      toast({ title: "✅ Connected!", description: `You are now chatting with ${peer}` });
    });

    peerObj.on("error", (err) => {
      console.error("[peer] error:", err);
      toast({ title: "❌ Peer error", description: err.message, variant: "destructive" });
      setStatus("peer-error: " + err.message);
    });

    peerObj.on("close", () => {
      console.log("[peer] Connection closed by peer");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
      toast({ title: "Peer disconnected", description: "The other person has left", variant: "destructive" });
    });

    peerRef.current = peerObj;
  }, [cleanupPeerConnection, toast, sendSignal, name]);

  // Create peer connection for responder
  const createResponderPeer = useCallback((stream: MediaStream, signalData: any, room_code: string, fromPeer: string) => {
    console.log("[webrtc] Creating peer as responder");
    toast({ title: "📡 Responder", description: "Creating WebRTC connection as responder..." });
    
    const peerObj = new SimplePeer({
      initiator: false,
      trickle: true,
      stream
    });

    peerObj.on("signal", (data) => {
      console.log("[responder] Signal event fired:", data.type, "-> target:", fromPeer);
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
      toast({ title: "🎥 Remote stream!", description: "Received video from stranger" });
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        void remoteVideoRef.current.play().catch(() => {});
      }
    });

    peerObj.on("connect", () => {
      console.log("[peer] Connected!");
      setStatus("connected");
      toast({ title: "✅ Connected!", description: "You are now chatting with a stranger" });
    });

    peerObj.on("error", (err) => {
      console.error("[peer] error:", err);
      toast({ title: "❌ Peer error", description: err.message, variant: "destructive" });
      setStatus("peer-error: " + err.message);
    });

    peerObj.on("close", () => {
      console.log("[peer] Connection closed by peer");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
      toast({ title: "Peer disconnected", description: "The other person has left", variant: "destructive" });
    });

    peerRef.current = peerObj;

    // Process the initial signal data
    toast({ title: "📥 Processing signal", description: "Processing initial signal from initiator..." });
    try {
      peerObj.signal(signalData);
    } catch (e) {
      console.error("[peer] initial signal error:", e);
      toast({ title: "❌ Signal error", description: "Failed to process signal", variant: "destructive" });
    }
  }, [cleanupPeerConnection, toast, sendSignal, name]);

  // Handle signaling messages - this will be called from websocket onmessage
  const handleSignalMessage = useCallback((msg: any) => {
    if (!msg || !msg.event) return;

    console.log("[sigws] Received message:", msg.event);
    toast({ title: "📨 WS Message", description: `Event: ${msg.event}` });

    if (msg.event === "verified") {
      console.log("[sigws] verified", msg);
      setStatus("verified");
      isVerifiedRef.current = true;
      toast({ title: "✓ Verified", description: "Room verified, flushing pending signals..." });
      flushPendingSignals();
    }

    if (msg.event === "signal") {
      console.log("[sigws] signal received, peerRef:", !!peerRef.current, "initiatorFlag:", initiatorFlagRef.current);
      toast({ title: "📥 Signal received", description: `From: ${msg.from || 'unknown'}, hasPeer: ${!!peerRef.current}` });
      
      // If we're the responder and don't have a peer yet, create one
      if (!peerRef.current && initiatorFlagRef.current === false) {
        console.log("[sigws] Creating peer as responder (receiving first signal)");
        toast({ title: "🔧 Creating responder peer", description: "First signal received, creating peer..." });

        const stream = localStreamRef.current;
        
        if (!stream) {
          console.error("[responder] No local stream available - this shouldn't happen");
          toast({ title: "❌ No stream!", description: "Local stream not available", variant: "destructive" });
          return;
        }

        createResponderPeer(stream, msg.data, msg.room_code || roomCodeRef.current, msg.from || peerNameRef.current);
        return;
      }

      // If we already have a peer, just signal it
      if (peerRef.current) {
        try {
          console.log("[sigws] Signaling existing peer");
          toast({ title: "📤 Relaying signal", description: "Passing signal to existing peer" });
          peerRef.current.signal(msg.data);
        } catch (e) {
          console.error("[peer] signal error:", e);
          toast({ title: "❌ Signal relay error", description: String(e), variant: "destructive" });
        }
      } else {
        toast({ title: "⚠️ No peer yet", description: `initiator: ${initiatorFlagRef.current}, waiting...` });
      }
    }

    if (msg.event === "error") {
      console.error("Signaling error:", msg.message || msg);
      toast({ title: "❌ Signaling error", description: msg.message || "Unknown error", variant: "destructive" });
      setStatus("error: " + (msg.message || "unknown"));
    }

    if (msg.event === "peer-disconnected") {
      console.log("[sigws] Peer disconnected notification from server");
      toast({ title: "👋 Peer left", description: "The other user disconnected" });
      setStatus("peer-disconnected");
      cleanupPeerConnection();
    }
  }, [cleanupPeerConnection, toast, createResponderPeer, flushPendingSignals]);

  // Store the latest handleSignalMessage in a ref so websocket always uses latest version
  const handleSignalMessageRef = useRef(handleSignalMessage);
  useEffect(() => {
    handleSignalMessageRef.current = handleSignalMessage;
  }, [handleSignalMessage]);

  const openSignalingWS = useCallback((username: string) => {
    if (signalWsRef.current) return;
    
    toast({ title: "🔌 Signaling WS", description: "Connecting to signaling server..." });
    const ws = new WebSocket(`ws://localhost:4000/ws/${encodeURIComponent(username)}`);
    
    ws.onopen = () => {
      console.log("[sigws] connected");
      toast({ title: "✅ Signaling connected", description: "WebSocket to signaling server open" });
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        // Use the ref to always call the latest version of the handler
        handleSignalMessageRef.current(msg);
      } catch (e) {
        console.error("Invalid JSON on signaling ws:", ev.data);
      }
    };
    
    ws.onclose = () => {
      console.log("[sigws] closed");
      toast({ title: "🔌 Signaling closed", description: "WebSocket connection closed" });
    };
    
    ws.onerror = (e) => {
      console.error("[sigws] err", e);
      toast({ title: "❌ Signaling error", description: "WebSocket error", variant: "destructive" });
    };
    
    signalWsRef.current = ws;
  }, [toast]);

  const openMatchingWS = useCallback((username: string) => {
    if (matchWsRef.current) return;
    
    toast({ title: "🔌 Matching WS", description: "Connecting to matching server..." });
    const ws = new WebSocket(`ws://localhost:8000/ws/${encodeURIComponent(username)}`);
    
    ws.onopen = () => {
      console.log("[matchws] connected");
      toast({ title: "✅ Matching connected", description: "WebSocket to matching server open" });
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        
        if (msg.event === "matched") {
          console.log("[matchws] matched", msg);
          const rc = msg.room_code;
          const initiator = Boolean(msg.initiator);
          
          toast({ 
            title: "🎉 Matched!", 
            description: `Room: ${rc.slice(0,8)}..., Role: ${initiator ? 'Initiator' : 'Responder'}` 
          });
          
          // Store in both state and refs
          setRoomCode(rc);
          roomCodeRef.current = rc;
          
          const parts = rc.split("_");
          const peer = parts.find((p: string) => p !== username) || "";
          setPeerName(peer);
          peerNameRef.current = peer;
          
          setIsInitiator(initiator);
          initiatorFlagRef.current = initiator;
          setStatus("matched");

          // Get media FIRST before joining signaling, to prevent race condition
          const setupAndJoin = async () => {
            toast({ title: "📹 Requesting media", description: "Asking for camera/mic access..." });
            try {
              // Acquire media before anything else
              const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                void localVideoRef.current.play().catch(() => {});
              }
              console.log("[matchws] Media acquired successfully, initiator:", initiator);
              toast({ title: "✅ Media acquired", description: "Camera and mic ready" });
            } catch (e) {
              console.error("[matchws] getUserMedia failed:", e);
              toast({
                title: "❌ Camera/Mic denied",
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
                
                console.log("[matchws] Signaling WS ready, sending join event");
                toast({ title: "📤 Joining room", description: `Sending join event as ${initiator ? 'initiator' : 'responder'}` });
                signalWsRef.current.send(JSON.stringify({
                  event: "join",
                  room_code: rc,
                  target: peer,
                  role: initiator ? "initiator" : "responder"
                }));
                
                // Only initiator creates peer immediately
                // Responder waits for signal to arrive
                if (initiator) {
                  createInitiatorPeer(localStreamRef.current!, rc, peer);
                } else {
                  toast({ title: "⏳ Waiting for offer", description: "Responder waiting for initiator signal..." });
                }
              }
            }, 100);
          };

          setupAndJoin();
        } else {
          console.log("[matchws] msg", msg);
          toast({ title: "📨 Match WS", description: `Event: ${msg.event || 'unknown'}` });
        }
      } catch (e) {
        console.error("[matchws] bad message", ev.data);
      }
    };
    
    ws.onclose = () => {
      console.log("[matchws] closed");
      toast({ title: "🔌 Matching closed", description: "WebSocket connection closed" });
      setStatus("matching-service-disconnected");
    };
    
    ws.onerror = (e) => {
      console.error("[matchws] err", e);
      toast({ title: "❌ Matching error", description: "WebSocket error", variant: "destructive" });
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
    <div className="min-h-screen bg-background relative overflow-hidden">
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
