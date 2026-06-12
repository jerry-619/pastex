"use client";

import { use, useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Editor from "react-simple-code-editor";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { QRCodeSVG } from "qrcode.react";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};

const CHUNK_SIZE = 16384; // 16KB

const getPeerName = (id: string) => {
  const adjectives = ["Neon", "Cyber", "Hyper", "Mega", "Cool", "Smart", "Brave", "Chill", "Wild", "Calm", "Epic", "Fast", "Bold", "Swift", "Bright"];
  const nouns = ["Tiger", "Apple", "Mars", "Comet", "Mango", "Wolf", "Pluto", "Shark", "Saturn", "Eagle", "Falcon", "Berry", "Dragon", "Panda", "Nova"];
  
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31) + id.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  const positiveHash = Math.abs(hash);
  
  const adj = adjectives[positiveHash % adjectives.length];
  const noun = nouns[Math.floor(positiveHash / adjectives.length) % nouns.length];
  
  return `${adj} ${noun}`;
};

interface ActiveTransfer {
  id: string;
  name: string;
  progress: number;
  totalSize: number;
  direction: 'sending' | 'receiving';
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'warning' | 'info';
}

export default function RoomDashboard({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const roomId = resolvedParams.id;
  const router = useRouter();
  
  const [clipboardText, setClipboardText] = useState("");
  const [userCount, setUserCount] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [files, setFiles] = useState<{name: string, url: string, size: number, type: string}[]>([]);
  const [peerStates, setPeerStates] = useState<Record<string, string>>({});
  const [roomState, setRoomState] = useState<any>(null);
  const [userId, setUserId] = useState<string>("");
  const [activeTransfers, setActiveTransfers] = useState<ActiveTransfer[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [customAlert, setCustomAlert] = useState<{ title: string, message: string, onConfirm?: () => void } | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [previewFile, setPreviewFile] = useState<{url: string, type: string, name: string} | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const myPermissionsRef = useRef({ canText: false, canFile: false });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setCustomAlert({ title, message, onConfirm });
  };
  
  const showToast = (message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };
  
  useEffect(() => {
    let storedId = localStorage.getItem("pastex_user_id");
    if (!storedId) {
      storedId = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      localStorage.setItem("pastex_user_id", storedId);
    }
    setUserId(storedId);
  }, []);
  
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const dataChannelsRef = useRef<Record<string, RTCDataChannel>>({});
  const receivedBuffersRef = useRef<Record<string, { chunks: ArrayBuffer[], totalSize: number, receivedSize: number, name: string, type: string }>>({});
  const iceCandidateQueueRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const filesEndRef = useRef<HTMLDivElement>(null);
  const activeTransfersEndRef = useRef<HTMLDivElement>(null);
  const activeTransfersLengthRef = useRef(0);

  useEffect(() => {
    if (filesEndRef.current) {
      filesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [files]);

  useEffect(() => {
    if (activeTransfersEndRef.current && activeTransfers.length > activeTransfersLengthRef.current) {
      activeTransfersEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    activeTransfersLengthRef.current = activeTransfers.length;
  }, [activeTransfers.length]);

  /**
   * Handles incoming chunked data from WebRTC DataChannels.
   * If meta data is received, it prepares a buffer.
   * If EOF is received, it assembles the Blob and generates a download URL.
   */
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data === "string") {
      const data = JSON.parse(event.data);
      if (data.type === "meta") {
        receivedBuffersRef.current[data.id] = {
          chunks: [],
          totalSize: data.size,
          receivedSize: 0,
          name: data.name,
          type: data.fileType
        };
        setActiveTransfers(prev => [...prev, { id: data.id, name: data.name, progress: 0, totalSize: data.size, direction: 'receiving' }]);
      } else if (data.type === "eof") {
        const bufferInfo = receivedBuffersRef.current[data.id];
        if (bufferInfo) {
          const blob = new Blob(bufferInfo.chunks, { type: bufferInfo.type });
          const url = URL.createObjectURL(blob);
          setFiles(prev => [...prev, { name: bufferInfo.name, url, size: bufferInfo.totalSize, type: bufferInfo.type }]);
          setActiveTransfers(prev => prev.filter(t => t.id !== data.id));
          delete receivedBuffersRef.current[data.id];
        }
      }
    } else {
      const keys = Object.keys(receivedBuffersRef.current);
      if (keys.length > 0) {
        const activeTransferId = keys[keys.length - 1];
        const bufferInfo = receivedBuffersRef.current[activeTransferId];
        bufferInfo.chunks.push(event.data);
        bufferInfo.receivedSize += event.data.byteLength;
        
        // Update UI every ~1MB to avoid freezing
        if (bufferInfo.chunks.length % 64 === 0) {
          setActiveTransfers(prev => prev.map(t => 
            t.id === activeTransferId ? { ...t, progress: bufferInfo.receivedSize } : t
          ));
        }
      }
    }
  }, []);

  /**
   * Initializes a new WebRTC Peer Connection and its DataChannel.
   * Also binds ICE candidate collection.
   * 
   * @param {string} targetSocketId - The Socket.io ID of the target peer.
   * @param {boolean} isInitiator - Whether this client is creating the offer (true) or answering (false).
   */
  const createPeerConnection = useCallback((targetSocketId: string, isInitiator: boolean) => {
    if (peersRef.current[targetSocketId]) return peersRef.current[targetSocketId];

    const peer = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current[targetSocketId] = peer;
    iceCandidateQueueRef.current[targetSocketId] = [];

    setPeerStates(prev => ({ ...prev, [targetSocketId]: 'new' }));

    peer.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("webrtc-ice-candidate", {
          target: targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    peer.onconnectionstatechange = () => {
      setPeerStates(prev => ({ ...prev, [targetSocketId]: peer.connectionState }));
      console.log(`Peer ${targetSocketId} connection state:`, peer.connectionState);
    };

    if (isInitiator) {
      const channel = peer.createDataChannel("file-transfer");
      dataChannelsRef.current[targetSocketId] = channel;
      channel.onmessage = handleDataChannelMessage;
      channel.onopen = () => setPeerStates(prev => ({ ...prev, [targetSocketId]: 'data-channel-open' }));
    } else {
      peer.ondatachannel = (event) => {
        dataChannelsRef.current[targetSocketId] = event.channel;
        event.channel.onmessage = handleDataChannelMessage;
        if (event.channel.readyState === 'open') {
          setPeerStates(prev => ({ ...prev, [targetSocketId]: 'data-channel-open' }));
        } else {
          event.channel.onopen = () => setPeerStates(prev => ({ ...prev, [targetSocketId]: 'data-channel-open' }));
        }
      };
    }

    return peer;
  }, [handleDataChannelMessage]);

  /**
   * Processes ICE candidates that were received before the RemoteDescription was fully set.
   * Solves race conditions during the WebRTC handshake.
   */
  const processIceQueue = async (targetSocketId: string, peer: RTCPeerConnection) => {
    const queue = iceCandidateQueueRef.current[targetSocketId];
    if (queue && queue.length > 0) {
      for (const candidate of queue) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Failed to add queued ice candidate", e);
        }
      }
      iceCandidateQueueRef.current[targetSocketId] = [];
    }
  };

  useEffect(() => {
    if (!userId) return;

    const socket = io();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      const action = new URLSearchParams(window.location.search).get('action');
      socket.emit("join-room", { roomId, userId, action });
    });

    socket.on("room-error", (msg: string) => {
      showAlert("SYSTEM ERROR", msg, () => router.push("/"));
    });

    socket.on("permissions-updated", (state: any) => {
      setRoomState(state);
      
      const newPerms = state.permissions?.[userId] || { canText: false, canFile: false };
      const oldPerms = myPermissionsRef.current;
      
      if (oldPerms.canText !== undefined) {
        if (newPerms.canText && !oldPerms.canText) showToast("TEXT PERMISSION GRANTED", "success");
        if (!newPerms.canText && oldPerms.canText) showToast("TEXT PERMISSION REVOKED", "warning");
      }
      
      if (oldPerms.canFile !== undefined) {
        if (newPerms.canFile && !oldPerms.canFile) showToast("FILE PERMISSION GRANTED", "success");
        if (!newPerms.canFile && oldPerms.canFile) showToast("FILE PERMISSION REVOKED", "warning");
      }
      
      myPermissionsRef.current = newPerms;
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("room-user-count", (count: number) => {
      setUserCount(count);
    });

    socket.on("text-update", (text: string) => {
      setClipboardText(text);
    });

    socket.on("user-joined", async (targetSocketId: string) => {
      const peer = createPeerConnection(targetSocketId, true);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("webrtc-offer", { target: targetSocketId, caller: socket.id, sdp: peer.localDescription });
    });

    socket.on("webrtc-offer", async ({ caller, sdp }) => {
      const peer = createPeerConnection(caller, false);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      await processIceQueue(caller, peer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("webrtc-answer", { target: caller, sdp: peer.localDescription });
    });

    socket.on("webrtc-answer", async ({ target, sdp }) => {
      const peer = peersRef.current[target];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        await processIceQueue(target, peer);
      }
    });

    socket.on("webrtc-ice-candidate", async ({ target, candidate }) => {
      let peer = peersRef.current[target];
      if (!peer) {
        peer = createPeerConnection(target, false);
      }
      
      if (peer.remoteDescription && peer.remoteDescription.type) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Failed to add ice candidate", e);
        }
      } else {
        if (!iceCandidateQueueRef.current[target]) {
          iceCandidateQueueRef.current[target] = [];
        }
        iceCandidateQueueRef.current[target].push(candidate);
      }
    });

    socket.on("user-left", (targetSocketId: string) => {
      if (peersRef.current[targetSocketId]) {
        peersRef.current[targetSocketId].close();
        delete peersRef.current[targetSocketId];
      }
      if (dataChannelsRef.current[targetSocketId]) {
        delete dataChannelsRef.current[targetSocketId];
      }
      setPeerStates(prev => {
        const newState = { ...prev };
        delete newState[targetSocketId];
        return newState;
      });
    });

    return () => {
      Object.values(peersRef.current).forEach(peer => peer.close());
      socket.emit("leave-room", roomId);
      socket.disconnect();
    };
  }, [roomId, userId, createPeerConnection]);

  const isHost = !!(userId && roomState?.host === userId);
  const myPermissions = (userId && roomState?.permissions?.[userId]) || { canText: false, canFile: false };

  const togglePermission = (targetSocketId: string, type: 'canText' | 'canFile') => {
    if (!isHost || !roomState) return;
    const targetUserId = roomState.sockets[targetSocketId];
    if (!targetUserId) return;
    
    const current = roomState.permissions[targetUserId] || { canText: false, canFile: false };
    const newPerms = { ...current, [type]: !current[type] };
    socketRef.current?.emit("update-permission", {
      roomId,
      targetSocketId,
      canText: newPerms.canText,
      canFile: newPerms.canFile
    });
  };

  const handleTextChange = (text: string) => {
    if (!myPermissions.canText) return;
    setClipboardText(text);
    if (socketRef.current) {
      socketRef.current.emit("text-change", { roomId, text });
    }
  };

  const handleClearText = () => {
    if (!myPermissions.canText) return;
    setClipboardText("");
    if (socketRef.current) {
      socketRef.current.emit("text-change", { roomId, text: "" });
    }
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      showAlert("FILE TOO LARGE", `Maximum allowed size is 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      return;
    }

    const fileId = Math.random().toString(36).substring(7);
    const metaData = JSON.stringify({
      type: "meta",
      id: fileId,
      name: file.name,
      size: file.size,
      fileType: file.type
    });
    const eofData = JSON.stringify({ type: "eof", id: fileId });

    const buffer = await file.arrayBuffer();
    const channels = Object.values(dataChannelsRef.current).filter(c => c.readyState === "open");

    if (channels.length === 0) {
      showAlert("NO CONNECTION", "No active peer connections. Please wait a moment or ensure the other peer is still in the room.");
      return;
    }

    setActiveTransfers(prev => [...prev, { id: fileId, name: file.name, progress: 0, totalSize: file.size, direction: 'sending' }]);
    channels.forEach(channel => channel.send(metaData));

    let offset = 0;
    let chunksSent = 0;

    const sendChunks = async () => {
      while (offset < buffer.byteLength) {
        // Prevent RTCDataChannel "send queue is full" error by checking buffer limit
        let isBufferFull = channels.some(channel => channel.bufferedAmount > 1024 * 1024 * 2); // 2MB limit
        while (isBufferFull) {
          await new Promise(r => setTimeout(r, 50));
          isBufferFull = channels.some(channel => channel.bufferedAmount > 1024 * 1024 * 2);
        }

        const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
        channels.forEach(channel => channel.send(chunk));
        offset += CHUNK_SIZE;
        chunksSent++;

        // Yield to event loop every 1MB (64 chunks) to render UI
        if (chunksSent % 64 === 0) {
          setActiveTransfers(prev => prev.map(t => 
            t.id === fileId ? { ...t, progress: Math.min(offset, file.size) } : t
          ));
          await new Promise(r => setTimeout(r, 1));
        }
      }

      channels.forEach(channel => channel.send(eofData));
      const url = URL.createObjectURL(file);
      setFiles(prev => [...prev, { name: file.name, url, size: file.size, type: file.type }]);
      setActiveTransfers(prev => prev.filter(t => t.id !== fileId));
    };

    sendChunks();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!myPermissions.canFile) {
      showAlert("ACCESS DENIED", "You don't have permission to send files.");
      e.target.value = '';
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (myPermissions.canFile) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!myPermissions.canFile) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-neo-white text-neo-black font-display flex flex-col selection:bg-neo-black selection:text-neo-yellow">
      
      {/* Custom Alert Modal */}
      {customAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-black/80 backdrop-blur-sm p-4">
          <div className="bg-neo-white border-4 border-neo-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full animate-bounce-in">
            <h2 className="text-3xl font-black uppercase mb-4 border-b-4 border-neo-black pb-2 text-neo-red">{customAlert.title}</h2>
            <p className="text-lg font-mono font-bold mb-8">{customAlert.message}</p>
            <button
              onClick={() => {
                const onConfirm = customAlert.onConfirm;
                setCustomAlert(null);
                if (onConfirm) onConfirm();
              }}
              className="w-full bg-neo-yellow text-neo-black border-4 border-neo-black font-black uppercase py-3 text-xl hover:bg-neo-blue hover:text-white transition-colors shadow-hard btn-press"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrCode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neo-black/80 backdrop-blur-sm p-4">
          <div className="bg-neo-white border-4 border-neo-black p-6 md:p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-sm w-full animate-bounce-in flex flex-col items-center">
            <h2 className="text-2xl font-black uppercase mb-6 border-b-4 border-neo-black w-full text-center pb-2 text-neo-blue">SCAN TO JOIN</h2>
            <div className="bg-white border-4 border-neo-black p-4 mb-8 shadow-hard">
              <QRCodeSVG value={typeof window !== "undefined" ? window.location.href : ""} size={200} />
            </div>
            <button
              onClick={() => setShowQrCode(false)}
              className="w-full bg-neo-red text-white border-4 border-neo-black font-black uppercase py-3 text-xl hover:bg-neo-yellow hover:text-neo-black transition-colors shadow-hard btn-press"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-neo-black/90 backdrop-blur-md p-4 md:p-8">
          <div className="bg-neo-white border-4 border-neo-black p-4 md:p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl h-full max-h-[90vh] animate-bounce-in flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b-4 border-neo-black pb-2">
              <h2 className="text-xl md:text-2xl font-black uppercase truncate max-w-[80%] text-neo-blue">{previewFile.name}</h2>
              <button 
                onClick={() => setPreviewFile(null)}
                className="bg-neo-red text-white border-2 border-neo-black px-3 py-1 font-black hover:bg-neo-yellow hover:text-neo-black transition-colors shadow-hard-sm btn-press"
              >
                X
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 border-4 border-neo-black flex items-center justify-center p-2 relative">
              {previewFile.type.startsWith('image/') && (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
              )}
              {previewFile.type.startsWith('video/') && (
                <video src={previewFile.url} controls autoPlay className="max-w-full max-h-full outline-none" />
              )}
              {previewFile.type.startsWith('audio/') && (
                <audio src={previewFile.url} controls autoPlay className="w-full max-w-md" />
              )}
              {previewFile.type === 'application/pdf' && (
                <iframe src={previewFile.url} className="w-full h-full border-none" title={previewFile.name} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`pointer-events-auto border-4 border-neo-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce-in flex items-center gap-3 ${t.type === 'success' ? 'bg-neo-green text-neo-black' : t.type === 'warning' ? 'bg-neo-red text-white' : 'bg-neo-blue text-white'}`}>
            {t.type === 'success' && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
            {t.type === 'warning' && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
            {t.type === 'info' && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>}
            <span className="font-mono font-bold uppercase">{t.message}</span>
          </div>
        ))}
      </div>

      {/* Neo-Brutalism Header */}
      <header className="border-b-4 border-neo-black bg-neo-yellow p-4 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 shadow-hard-lg">
        <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-0 w-full md:w-auto">
          <Link href="/" className="bg-neo-white border-2 border-neo-black p-2 hover:bg-neo-pink transition-colors shadow-hard-sm btn-press flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter">ROOM:</h1>
            <div className="flex items-center gap-2">
              <span className="bg-neo-white text-neo-black px-2 md:px-4 py-1 font-mono font-black text-lg md:text-xl border-2 border-neo-black shadow-hard-sm tracking-widest">
                {roomId}
              </span>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  showToast("ROOM ID COPIED", "success");
                }}
                className="bg-neo-blue text-white border-2 border-neo-black p-1.5 hover:bg-neo-pink transition-colors shadow-hard-sm btn-press"
                title="Copy Room ID"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                  <rect x="9" y="9" width="13" height="13"></rect>
                  <path d="M5 15H4V4h11v1"></path>
                </svg>
              </button>
              <button 
                onClick={() => setShowQrCode(true)}
                className="bg-neo-yellow text-neo-black border-2 border-neo-black p-1.5 hover:bg-neo-green transition-colors shadow-hard-sm btn-press"
                title="Show QR Code"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
                  <rect x="3" y="3" width="6" height="6"></rect>
                  <rect x="15" y="3" width="6" height="6"></rect>
                  <rect x="3" y="15" width="6" height="6"></rect>
                  <rect x="15" y="15" width="2" height="2"></rect>
                  <rect x="19" y="19" width="2" height="2"></rect>
                  <rect x="15" y="19" width="2" height="2"></rect>
                  <rect x="19" y="15" width="2" height="2"></rect>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-bold w-full md:w-auto justify-between md:justify-end">
          <div className={`flex items-center gap-2 border-2 border-neo-black px-2 md:px-3 py-1 font-mono uppercase bg-neo-white shadow-hard-sm`}>
            <div className={`w-3 h-3 border-2 border-neo-black ${isConnected ? 'bg-neo-green' : 'bg-neo-red'}`}></div>
            {isConnected ? 'Signaling: ONLINE' : 'Signaling: OFFLINE'}
          </div>
          <div className="bg-neo-white border-2 border-neo-black px-2 md:px-3 py-1 font-mono uppercase flex items-center gap-2 shadow-hard-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            [ {userCount} ] PEERS
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        
        {/* Text Area Column */}
        <section className="flex flex-col gap-6">
          <h2 className="text-4xl font-black uppercase flex items-center gap-3 bg-neo-white border-4 border-neo-black p-3 shadow-hard w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="text-neo-blue"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            TEXT_BUFFER
          </h2>
          
          <div className={`flex-1 bg-white border-4 border-neo-black flex flex-col shadow-hard-lg transition-colors duration-300 relative ${myPermissions.canText ? 'focus-within:bg-neo-yellow' : 'bg-gray-100'}`}>
            {!myPermissions.canText && (
              <div className="absolute top-0 right-0 bg-neo-red text-white border-b-4 border-l-4 border-neo-black px-4 py-2 font-black uppercase shadow-hard-sm z-10 pointer-events-none">
                READ ONLY
              </div>
            )}
            <div className={`w-full h-[350px] md:h-[400px] lg:h-[450px] bg-transparent overflow-y-auto ${!myPermissions.canText ? 'cursor-not-allowed opacity-80' : ''}`}>
              <Editor
                value={clipboardText}
                onValueChange={handleTextChange}
                highlight={code => hljs.highlightAuto(code).value}
                padding={24}
                className="font-mono text-lg font-medium outline-none min-h-full"
                style={{
                  minHeight: "100%",
                  fontFamily: '"Fira code", "Fira Mono", monospace',
                }}
                disabled={!myPermissions.canText}
              />
            </div>
            <div className="flex justify-end gap-4 p-4 border-t-4 border-neo-black bg-neo-white">
              {myPermissions.canText && (
                <button 
                  onClick={handleClearText}
                  className="bg-neo-red text-white border-4 border-neo-black font-black uppercase px-6 py-2 shadow-hard btn-press hover:bg-neo-yellow hover:text-neo-black transition-colors"
                >
                  CLEAR TEXT
                </button>
              )}
              <button 
                onClick={() => navigator.clipboard.writeText(clipboardText)}
                className="bg-neo-blue text-white border-4 border-neo-black font-black uppercase px-6 py-2 shadow-hard btn-press hover:bg-neo-pink transition-colors"
              >
                COPY TEXT
              </button>
            </div>
          </div>

          {/* Connected Devices */}
          {Object.keys(peerStates).length > 0 && (
            <div className="bg-neo-black border-4 border-neo-black p-4 shadow-hard text-neo-green font-mono">
              <h3 className="text-xs uppercase tracking-widest text-white/50 mb-3 border-b-2 border-white/20 pb-2 flex justify-between items-center">
                <span>CONNECTED_DEVICES</span>
                {isHost && <span className="text-neo-yellow border border-neo-yellow px-1">HOST</span>}
              </h3>
              <div className="flex flex-col gap-2">
                {/* Current User */}
                {userId && (
                  <div className="flex flex-col gap-2 p-2 border-2 border-neo-yellow/30 bg-neo-yellow/10">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{getPeerName(userId)}</span>
                        <span className="bg-neo-blue text-white text-[10px] px-1 font-black">YOU</span>
                        {isHost && <span className="bg-neo-yellow text-neo-black text-[10px] px-1 font-black">HOST</span>}
                      </div>
                      <span className="px-2 py-0.5 border-2 border-neo-green bg-neo-green/20 text-neo-green">
                        [ONLINE]
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Other Peers */}
                {Object.entries(peerStates).map(([id, state]) => {
                  const targetUserId = roomState?.sockets?.[id] || id;
                  const isThisPeerHost = roomState?.host === targetUserId;
                  const targetPerms = roomState?.permissions?.[targetUserId] || { canText: false, canFile: false };
                  
                  const isConnected = state === 'data-channel-open';
                  const isFailed = state === 'failed' || state === 'disconnected';
                  const displayState = isConnected ? 'CONNECTED' : isFailed ? 'DISCONNECTED' : 'CONNECTING...';
                  
                  return (
                    <div key={id} className="flex flex-col gap-2 p-2 border border-white/10">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{getPeerName(targetUserId)}</span>
                          {isThisPeerHost && <span className="bg-neo-yellow text-neo-black text-[10px] px-1 font-black">HOST</span>}
                        </div>
                        <span className={`px-2 py-0.5 border-2 ${isConnected ? 'border-neo-green bg-neo-green/20 text-neo-green' : isFailed ? 'border-neo-red bg-neo-red/20 text-neo-red' : 'border-neo-yellow bg-neo-yellow/20 text-neo-yellow'}`}>
                          [{displayState}]
                        </span>
                      </div>
                      {isHost && roomState?.permissions?.[targetUserId] && (
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => togglePermission(id, 'canText')} className={`px-2 py-1 text-xs font-bold border-2 hover:opacity-80 transition-opacity ${targetPerms.canText ? 'bg-neo-green text-neo-black border-neo-green' : 'bg-transparent text-neo-white border-white/40'}`}>
                            {targetPerms.canText ? 'TEXT: ON' : 'TEXT: OFF'}
                          </button>
                          <button onClick={() => togglePermission(id, 'canFile')} className={`px-2 py-1 text-xs font-bold border-2 hover:opacity-80 transition-opacity ${targetPerms.canFile ? 'bg-neo-pink text-neo-black border-neo-pink' : 'bg-transparent text-neo-white border-white/40'}`}>
                            {targetPerms.canFile ? 'FILE: ON' : 'FILE: OFF'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* File Transfer Column */}
        <section className="flex flex-col gap-6">
          <h2 className="text-4xl font-black uppercase flex items-center gap-3 bg-neo-white border-4 border-neo-black p-3 shadow-hard w-fit">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="text-neo-pink"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            DATA_TRANSFER
          </h2>
          
          <label 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-shrink-0 border-4 border-neo-black bg-neo-white flex flex-col items-center justify-center p-12 text-center transition-colors shadow-hard-lg ${myPermissions.canFile ? (isDragging ? 'bg-neo-yellow border-dashed scale-[1.02]' : 'hover:bg-neo-blue hover:text-white cursor-pointer group btn-press') : 'opacity-60 cursor-not-allowed bg-gray-100'}`}
          >
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={!myPermissions.canFile} />
            <div className={`bg-neo-pink border-4 border-neo-black p-4 mb-6 shadow-hard ${myPermissions.canFile ? 'group-hover:scale-110 transition-transform' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="text-neo-black"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p className="text-3xl font-black uppercase mb-2">{!myPermissions.canFile ? 'NO PERMISSION' : isDragging ? 'DROP FILE HERE' : 'SELECT OR DROP FILE'}</p>
            <p className="text-base font-mono font-bold border-t-2 border-current pt-2 mt-2 w-1/2 mx-auto">
              Max Size: 50MB
            </p>
          </label>

          {/* Active Transfers */}
          {activeTransfers.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xl font-black uppercase bg-neo-yellow text-neo-black px-3 py-1 w-fit border-2 border-neo-black shadow-hard flex items-center gap-2">
                <div className="w-2 h-2 bg-neo-red rounded-full animate-pulse"></div>
                ACTIVE_TRANSFERS
              </h3>
              {activeTransfers.map((t) => {
                const percent = Math.min(100, Math.round((t.progress / t.totalSize) * 100));
                const mbProgress = (t.progress / 1024 / 1024).toFixed(2);
                const mbTotal = (t.totalSize / 1024 / 1024).toFixed(2);
                const isSending = t.direction === 'sending';
                return (
                  <div key={t.id} className="flex flex-col gap-2 bg-neo-white border-4 border-neo-black p-4 shadow-hard">
                    <div className="flex justify-between items-center font-black uppercase">
                      <span className="truncate max-w-[60%]">{t.name}</span>
                      <span className={isSending ? 'text-neo-blue' : 'text-neo-green'}>
                        {isSending ? 'SENDING...' : 'RECEIVING...'}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-gray-200 border-2 border-neo-black relative overflow-hidden">
                      <div className={`h-full ${isSending ? 'bg-neo-blue' : 'bg-neo-green'} transition-all duration-300`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs font-mono font-bold">
                      <span>{mbProgress} MB / {mbTotal} MB</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                );
              })}
              <div ref={activeTransfersEndRef} />
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <h3 className="text-xl font-black uppercase bg-neo-black text-white px-3 py-1 w-fit border-2 border-neo-black shadow-hard">RECEIVED_FILES</h3>
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between bg-neo-white border-4 border-neo-black p-4 shadow-hard">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="bg-neo-green border-2 border-neo-black p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter" className="text-neo-black"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <div className="truncate">
                      <p className="text-lg font-black uppercase truncate">{f.name}</p>
                      <p className="text-sm font-mono font-bold">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/') || f.type === 'application/pdf') && (
                      <button 
                        onClick={() => setPreviewFile(f)}
                        className="bg-neo-yellow border-4 border-neo-black hover:bg-neo-blue hover:text-white text-neo-black p-3 transition-colors shadow-hard btn-press"
                        title="Preview File"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      </button>
                    )}
                    <a href={f.url} download={f.name} className="bg-neo-orange border-4 border-neo-black hover:bg-neo-yellow text-neo-black p-3 transition-colors shadow-hard btn-press" title="Download File">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                    </a>
                  </div>
                </div>
              ))}
              <div ref={filesEndRef} />
            </div>
          )}
        </section>

      </main>
    </div>
  );
}
