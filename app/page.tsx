"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const handleCreateRoom = () => {
    // Generate a random 6-character room code
    const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${newRoomCode}?action=create`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      router.push(`/room/${roomCode.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden font-display p-6">
      <main className="relative z-10 flex flex-col items-center max-w-4xl w-full">
        {/* Floating Accent */}
        <div className="absolute -top-12 -left-8 w-24 h-24 bg-neo-pink border-4 border-neo-black shadow-hard animate-pulse hidden md:block"></div>
        <div className="absolute -bottom-12 -right-8 w-32 h-32 bg-neo-blue border-4 border-neo-black shadow-hard rounded-full hidden md:block"></div>

        <div className="text-center mb-16 relative">
          <div className="inline-block bg-neo-white border-4 border-neo-black px-4 py-2 mb-6 shadow-hard rotate-[-2deg]">
            <span className="font-mono font-bold text-neo-green bg-neo-black px-2 mr-2">●</span>
            <span className="font-mono font-bold uppercase tracking-widest text-sm md:text-base">System Online</span>
          </div>
          
          <h1 className="text-7xl md:text-9xl font-black uppercase tracking-tighter mb-6 mix-blend-darken text-neo-black">
            PASTEX<span className="text-neo-yellow" style={{ WebkitTextStroke: '4px #121212' }}>_</span>
          </h1>
          
          <p className="font-mono text-lg md:text-2xl max-w-2xl mx-auto bg-neo-green border-4 border-neo-black p-4 shadow-hard rotate-1 font-bold">
            Share clipboard text and transfer files peer-to-peer instantly. <br/>
            NO LOGINS. NO LIMITS.
          </p>
        </div>

        <div className="w-full max-w-xl bg-neo-white border-4 border-neo-black p-8 shadow-hard-lg">
          <button
            onClick={handleCreateRoom}
            className="w-full bg-neo-yellow text-neo-black border-4 border-neo-black font-black py-5 px-6 text-xl uppercase transition-all shadow-hard btn-press flex items-center justify-center gap-3 mb-10 cursor-hover hover:bg-neo-pink"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Room
          </button>

          <div className="relative flex items-center mb-10">
            <div className="flex-grow border-t-4 border-neo-black"></div>
            <span className="flex-shrink-0 mx-4 text-xl text-neo-black font-black uppercase bg-neo-white px-2">OR JOIN</span>
            <div className="flex-grow border-t-4 border-neo-black"></div>
          </div>

          <form onSubmit={handleJoinRoom} className="flex flex-col gap-6">
            <div className="relative">
              <label htmlFor="roomCode" className="absolute -top-3 left-4 bg-neo-white px-2 font-mono font-bold text-sm border-x-2 border-neo-white">ENTER ROOM CODE</label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="XXXXXX"
                className="w-full bg-white border-4 border-neo-black text-neo-black placeholder-neutral-400 p-6 focus:outline-none focus:bg-neo-blue focus:text-white focus:placeholder-white/50 transition-colors text-center uppercase tracking-[0.5em] font-mono text-3xl font-black shadow-hard-sm"
                maxLength={6}
              />
            </div>
            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="w-full bg-neo-black text-neo-white border-4 border-neo-black font-black py-5 px-6 text-xl uppercase transition-all shadow-hard btn-press disabled:opacity-50 disabled:shadow-none disabled:translate-y-1 disabled:translate-x-1 cursor-hover hover:text-neo-yellow"
            >
              Initialize Connection
            </button>
          </form>
        </div>
      </main>

      <footer className="absolute bottom-6 font-mono text-neo-black text-sm font-bold bg-neo-white border-2 border-neo-black px-4 py-2 shadow-hard-sm">
        SECURE // P2P // INSTANT
      </footer>
    </div>
  );
}
