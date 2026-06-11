"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Magnetic from "./components/Magnetic";

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
    <div className="min-h-screen flex flex-col font-display p-6">
      
      {/* Left Side Decoration (Hidden on smaller screens) */}
      <Magnetic intensity={0.3} className="hidden lg:flex fixed left-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4 z-50 rotate-[-4deg]">
        <div className="bg-neo-black text-neo-white font-mono font-bold px-4 py-2 border-4 border-neo-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          100% SECURE
        </div>
        <div className="bg-neo-green border-4 border-neo-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </Magnetic>

      {/* Right Side Decoration (GitHub Link) */}
      <Magnetic intensity={0.4} className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 z-50">
        <a href="https://github.com/jerry-619/pastex" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-4 rotate-[4deg] hover:scale-110 transition-transform btn-press cursor-hover group">
          <div className="bg-neo-white text-neo-black font-mono font-bold px-4 py-2 border-4 border-neo-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-neo-yellow transition-colors">
            STAR US
          </div>
        <div className="bg-neo-blue border-4 border-neo-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:bg-neo-pink transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-neo-black">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.699-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
        </div>
        </a>
      </Magnetic>

      <div className="flex-grow flex flex-col items-center justify-center relative w-full">
        <main className="relative z-10 flex flex-col items-center max-w-4xl w-full">
          {/* Floating Accent */}
          <Magnetic isGlobal intensity={0.4} className="absolute -top-12 -left-8 hidden md:block z-[-1]">
            <div className="w-24 h-24 bg-neo-pink border-4 border-neo-black shadow-hard animate-pulse"></div>
          </Magnetic>
          <Magnetic isGlobal intensity={-0.3} className="absolute -bottom-12 -right-8 hidden md:block z-[-1]">
            <div className="w-32 h-32 bg-neo-blue border-4 border-neo-black shadow-hard rounded-full"></div>
          </Magnetic>

          <div className="text-center mb-16 relative">
            <div className="inline-block bg-neo-white border-4 border-neo-black px-4 py-2 mb-6 shadow-hard rotate-[-2deg]">
              <span className="font-mono font-bold text-neo-green bg-neo-black px-2 mr-2">●</span>
              <span className="font-mono font-bold uppercase tracking-widest text-sm md:text-base">System Online</span>
            </div>
            
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 mix-blend-darken text-neo-black">
              PasteX<span className="text-neo-yellow" style={{ WebkitTextStroke: '4px #121212' }}>_</span>
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
      </div>

      <footer className="mt-8 mb-6 w-full flex flex-col items-center gap-3 font-mono text-neo-black text-sm font-bold z-20">
        <div className="flex flex-wrap justify-center gap-3">
          <div className="bg-neo-white border-2 border-neo-black px-4 py-2 shadow-hard-sm">
             Developed by <a href="https://fardeenbeigh.netlify.app/" target="_blank" rel="noopener noreferrer"><span className="text-neo-pink font-black text-base tracking-wider">Fardeen Beigh</span></a>
          </div>
          <div className="bg-neo-yellow border-2 border-neo-black px-4 py-2 shadow-hard-sm">
            &copy; {new Date().getFullYear()} Pastex.app
          </div>
          <a href="https://github.com/jerry-619/pastex" target="_blank" rel="noopener noreferrer" className="bg-neo-blue text-white hover:bg-neo-pink border-2 border-neo-black px-4 py-2 shadow-hard-sm transition-colors btn-press">
            Open Source
          </a>
        </div>
      </footer>
    </div>
  );
}
