"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    {
      urls: "turn:global.relay.metered.ca:80",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:80?transport=tcp",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    },
    {
      urls: "turn:global.relay.metered.ca:443",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    },
    {
      urls: "turns:global.relay.metered.ca:443?transport=tcp",
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    },
  ]
};

const REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👀", "🥵","🍑","💦","🤚","🍆"];

interface ReactionEvent {
  id: number;
  emoji: string;
  x: number;
}

export default function KibiVideoCall({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();
  
  const [userId, setUserId] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [latencies, setLatencies] = useState<Record<string, number>>({});

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let storedId = localStorage.getItem("pastex_user_id");
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      localStorage.setItem("pastex_user_id", storedId);
    }
    setUserId(storedId);
  }, []);

  const createPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean) => {
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = peer;

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", {
          target: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      setRemoteStreams(prev => ({ ...prev, [targetSocketId]: event.streams[0] }));
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peer.addTrack(track, localStreamRef.current!);
      });
    }

    if (isInitiator) {
      peer.createOffer().then(offer => {
        return peer.setLocalDescription(offer);
      }).then(() => {
        socketRef.current?.emit("webrtc-offer", { target: targetSocketId, caller: socketRef.current?.id, sdp: peer.localDescription });
      }).catch(err => console.error("Offer error", err));
    }

    return peer;
  }, []);

  useEffect(() => {
    if (!roomId || !userId) return;

    // Start local media first
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Connect Socket
      const socket = io();
      socketRef.current = socket;

      socket.on("connect", () => {
        setIsConnected(true);
        socket.emit("join-room", { roomId, userId, action: 'create' });
      });

      socket.on("user-joined", (socketId) => {
        createPeerConnection(socketId, true);
      });

      socket.on("webrtc-offer", async ({ caller, sdp }) => {
        const peer = createPeerConnection(caller, false);
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit("webrtc-answer", { target: caller, sdp: peer.localDescription });
      });

      socket.on("webrtc-answer", async ({ target, sdp }) => {
        const peer = peersRef.current[target];
        if (peer) {
          await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      });

      socket.on("webrtc-ice-candidate", async ({ target, candidate }) => {
        const peer = peersRef.current[target];
        if (peer && candidate) {
          try {
            await peer.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error("ICE candidate error", e);
          }
        }
      });

      socket.on("user-left", (socketId) => {
        if (peersRef.current[socketId]) {
          peersRef.current[socketId].close();
          delete peersRef.current[socketId];
        }
        setRemoteStreams(prev => {
          const newState = { ...prev };
          delete newState[socketId];
          return newState;
        });
      });

      socket.on("receive-reaction", ({ reaction }) => {
        triggerReaction(reaction);
      });

    }).catch(err => {
      console.error("Failed to get local media", err);
      alert("Failed to access camera/microphone.");
    });

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      Object.values(peersRef.current).forEach(peer => peer.close());
      socketRef.current?.disconnect();
    };
  }, [roomId, userId, createPeerConnection]);

  // Track WebRTC latency
  useEffect(() => {
    const interval = setInterval(() => {
      Object.entries(peersRef.current).forEach(async ([socketId, peer]) => {
        try {
          const stats = await peer.getStats();
          let currentLatency = 0;
          stats.forEach(report => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              if (report.currentRoundTripTime !== undefined) {
                currentLatency = report.currentRoundTripTime * 1000;
              }
            }
          });
          if (currentLatency > 0) {
            setLatencies(prev => ({ ...prev, [socketId]: Math.round(currentLatency) }));
          }
        } catch (e) {
          // ignore
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled;
        setIsVideoOn(videoTracks[0].enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled;
        setIsAudioOn(audioTracks[0].enabled);
      }
    }
  };

  const endCall = () => {
    router.push("/");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("Invite link copied to clipboard!");
  };

  const sendReaction = (emoji: string) => {
    socketRef.current?.emit("send-reaction", { roomId, reaction: emoji });
    triggerReaction(emoji);
    setShowReactionMenu(false);
  };

  const triggerReaction = (emoji: string) => {
    const newReaction = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10 // random horizontal position (10% to 90%)
    };
    setReactions(prev => [...prev, newReaction]);
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== newReaction.id));
    }, 4000); // Remove after animation
  };

  const attachVideo = (el: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (el && stream && el.srcObject !== stream) {
      el.srcObject = stream;
      // Essential for Safari iOS autoplay policies
      el.play().catch(e => console.error("Play failed", e));
    }
  };

  return (
    <div className="h-screen w-screen bg-neo-black text-neo-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Reaction Animation Container */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {reactions.map(r => (
          <div 
            key={r.id} 
            className="absolute bottom-20 text-6xl animate-bounce"
            style={{ left: `${r.x}%`, animation: 'float-up 4s ease-out forwards' }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 w-full p-2 md:p-4 flex flex-col md:flex-row flex-wrap gap-2 md:gap-4 overflow-hidden content-center justify-center">
        {/* Local Video */}
        <div className="relative flex-1 w-full h-full min-h-[30vh] md:min-h-[50vh] border-4 md:border-8 border-neo-white shadow-hard-light bg-neo-black overflow-hidden flex items-center justify-center">
          {isVideoOn ? (
            <video 
              ref={el => attachVideo(el, localStream)} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover scale-x-[-1]" 
            />
          ) : (
            <div className="flex flex-col items-center opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
              <span className="font-mono mt-4 text-xl">CAMERA OFF</span>
            </div>
          )}
          <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-neo-black text-neo-green font-mono px-2 md:px-3 py-1 border-2 border-neo-green z-10 text-xs md:text-sm">
            0 ms
          </div>
          <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-neo-blue text-white font-black px-2 md:px-4 py-1 md:py-2 border-2 md:border-4 border-neo-black z-10 text-xs md:text-base">
            YOU {isAudioOn ? '' : '(MUTED)'}
          </div>
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <div key={socketId} className="relative flex-1 w-full h-full min-h-[30vh] md:min-h-[50vh] border-4 md:border-8 border-neo-white shadow-hard-light bg-neo-black overflow-hidden flex items-center justify-center">
            <video 
              ref={el => attachVideo(el, stream)} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover" 
            />
            <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-neo-black text-neo-green font-mono px-2 md:px-3 py-1 border-2 border-neo-green z-10 text-xs md:text-sm">
              {latencies[socketId] ? `${latencies[socketId]} ms` : '...'}
            </div>
            <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-neo-yellow text-neo-black font-black px-2 md:px-4 py-1 md:py-2 border-2 md:border-4 border-neo-black z-10 text-xs md:text-base">
              PEER
            </div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div className="w-full bg-neo-white border-t-8 border-neo-black p-4 md:p-6 flex items-center justify-center gap-4 z-40 relative">
        <button 
          onClick={toggleAudio}
          className={`p-4 border-4 border-neo-black shadow-hard btn-press transition-colors ${isAudioOn ? 'bg-neo-black text-white hover:bg-neo-red' : 'bg-neo-red text-white'}`}
          title="Toggle Mic"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
            {isAudioOn ? (
              <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
            ) : (
              <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>
            )}
          </svg>
        </button>

        <button 
          onClick={toggleVideo}
          className={`p-4 border-4 border-neo-black shadow-hard btn-press transition-colors ${isVideoOn ? 'bg-neo-black text-white hover:bg-neo-red' : 'bg-neo-red text-white'}`}
          title="Toggle Video"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
            {isVideoOn ? (
              <><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>
            ) : (
              <><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></>
            )}
          </svg>
        </button>

        <div className="relative">
          <button 
            onClick={() => setShowReactionMenu(!showReactionMenu)}
            className="p-4 border-4 border-neo-black shadow-hard btn-press bg-neo-yellow text-neo-black hover:bg-neo-orange transition-colors"
            title="Send Reaction"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
              <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>
          
          {showReactionMenu && (
            <div className="absolute bottom-[120%] left-1/2 -translate-x-1/2 bg-neo-white border-4 border-neo-black shadow-hard p-2 flex gap-2">
              {REACTIONS.map(emoji => (
                <button 
                  key={emoji} 
                  onClick={() => sendReaction(emoji)}
                  className="text-2xl hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={copyLink}
          className="p-4 border-4 border-neo-black shadow-hard btn-press bg-neo-blue text-white hover:bg-neo-black transition-colors hidden sm:block"
          title="Copy Link"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        </button>

        <button 
          onClick={endCall}
          className="px-6 py-4 border-4 border-neo-black shadow-hard btn-press bg-neo-red text-white hover:opacity-80 transition-opacity font-black uppercase md:text-xl ml-auto md:ml-4"
        >
          END CALL
        </button>
      </div>

    </div>
  );
}
