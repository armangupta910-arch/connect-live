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

  const { toast } = useToast();

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
      toast({
        title: "Searching for match",
        description: "Looking for someone to connect with...",
      });
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

  const startWebRTC = useCallback(async (initiatorFlag: boolean, room_code: string, peer: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        void localVideoRef.current.play().catch(() => {
          // Autoplay can be blocked; user can click the video to start playback.
        });
      }
      localStreamRef.current = stream;

      if (initiatorFlag) {
        console.log("[webrtc] Creating peer as initiator");
        const peerObj = new SimplePeer({
          initiator: true,
          trickle: true,
          stream
        });

        peerObj.on("signal", (data) => {
          if (signalWsRef.current && signalWsRef.current.readyState === WebSocket.OPEN) {
            signalWsRef.current.send(JSON.stringify({
              event: "signal",
              room_code,
              target: peer,
              type: "signal",
              data
            }));
          }
        });

        peerObj.on("stream", (remoteStream) => {
          console.log("[peer] Received remote stream");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            void remoteVideoRef.current.play().catch(() => {
              // Autoplay with audio may be blocked until a user gesture.
            });
          }
        });

        peerObj.on("connect", () => {
          console.log("[peer] Connected!");
          setStatus("connected");
          toast({
            title: "Connected!",
            description: `You are now chatting with ${peer}`,
          });
        });

        peerObj.on("error", (err) => {
          console.error("[peer] error:", err);
          setStatus("peer-error: " + err.message);
        });

        peerObj.on("close", () => {
          console.log("[peer] Connection closed by peer");
          setStatus("peer-disconnected");
          cleanupPeerConnection();
          toast({
            title: "Peer disconnected",
            description: "The other person has left the chat",
            variant: "destructive",
          });
        });

        peerRef.current = peerObj;
      }
    } catch (e) {
      console.error("getUserMedia failed:", e);
      setStatus("media-error: " + (e as Error).message);
      toast({
        title: "Camera/Mic access denied",
        description: "Please allow access to your camera and microphone",
        variant: "destructive",
      });
    }
  }, [cleanupPeerConnection, toast]);

  const handleSignalMessage = useCallback((msg: any) => {
    if (!msg || !msg.event) return;

    if (msg.event === "verified") {
      console.log("[sigws] verified", msg);
      setStatus("verified");
    }

    if (msg.event === "signal") {
      if (!peerRef.current && !initiatorFlagRef.current) {
        console.log("[sigws] Creating peer as responder (receiving first signal)");

        // For responder, we need to get media first if we don't have it
        const createResponderPeer = async () => {
          let stream = localStreamRef.current;

          if (!stream) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              localStreamRef.current = stream;
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                void localVideoRef.current.play().catch(() => {
                  // Autoplay can be blocked; user can click the video to start playback.
                });
              }
            } catch (e) {
              console.error("[responder] getUserMedia failed:", e);
              toast({
                title: "Camera/Mic access denied",
                description: "Please allow access to your camera and microphone",
                variant: "destructive",
              });
              return;
            }
          }

          const peerObj = new SimplePeer({
            initiator: false,
            trickle: true,
            stream
          });

          peerObj.on("signal", (data) => {
            if (signalWsRef.current && signalWsRef.current.readyState === WebSocket.OPEN) {
              signalWsRef.current.send(JSON.stringify({
                event: "signal",
                room_code: msg.room_code,
                target: msg.from,
                type: "signal",
                data
              }));
            }
          });

          peerObj.on("stream", (remoteStream) => {
            console.log("[peer] Received remote stream");
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              void remoteVideoRef.current.play().catch(() => {
                // Autoplay with audio may be blocked until a user gesture.
              });
            }
          });

          peerObj.on("connect", () => {
            console.log("[peer] Connected!");
            setStatus("connected");
            toast({
              title: "Connected!",
              description: "You are now chatting with a stranger",
            });
          });

          peerObj.on("error", (err) => {
            console.error("[peer] error:", err);
            setStatus("peer-error: " + err.message);
          });

          peerObj.on("close", () => {
            console.log("[peer] Connection closed by peer");
            setStatus("peer-disconnected");
            cleanupPeerConnection();
            toast({
              title: "Peer disconnected",
              description: "The other person has left the chat",
              variant: "destructive",
            });
          });

          peerRef.current = peerObj;

          // Now signal with the received data
          try {
            peerObj.signal(msg.data);
          } catch (e) {
            console.error("[peer] signal error:", e);
          }
        };

        createResponderPeer();
        return; // Don't signal below, we handle it in createResponderPeer
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
      setStatus("error: " + (msg.message || "unknown"));
    }

    if (msg.event === "peer-disconnected") {
      console.log("[sigws] Peer disconnected notification from server");
      setStatus("peer-disconnected");
      cleanupPeerConnection();
    }
  }, [cleanupPeerConnection, toast]);


  const openSignalingWS = useCallback((username: string) => {
    if (signalWsRef.current) return;
    
    const ws = new WebSocket(`ws://localhost:4000/ws/${encodeURIComponent(username)}`);
    
    ws.onopen = () => {
      console.log("[sigws] connected");
    };
    
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleSignalMessage(msg);
      } catch (e) {
        console.error("Invalid JSON on signaling ws:", ev.data);
      }
    };
    
    ws.onclose = () => {
      console.log("[sigws] closed");
    };
    
    ws.onerror = (e) => console.error("[sigws] err", e);
    
    signalWsRef.current = ws;
  }, [handleSignalMessage]);

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
          
          setRoomCode(rc);
          const parts = rc.split("_");
          const peer = parts.find((p: string) => p !== username) || "";
          setPeerName(peer);
          setIsInitiator(initiator);
          initiatorFlagRef.current = initiator;
          setStatus("matched");

          openSignalingWS(username);
          
          const waitForSig = setInterval(() => {
            if (signalWsRef.current && signalWsRef.current.readyState === WebSocket.OPEN) {
              clearInterval(waitForSig);
              
              signalWsRef.current.send(JSON.stringify({
                event: "join",
                room_code: rc,
                target: peer,
                type: initiator ? "offer" : "answer"
              }));
              
              startWebRTC(initiator, rc, peer);
            }
          }, 100);
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
    
    ws.onerror = (e) => console.error("[matchws] err", e);
    
    matchWsRef.current = ws;
  }, [openSignalingWS, startWebRTC]);

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