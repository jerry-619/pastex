"use client";

import Link from "next/link";
import Magnetic from "./components/Magnetic";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neo-red text-neo-white font-display flex flex-col items-center justify-center p-6 selection:bg-neo-white selection:text-neo-red relative overflow-hidden">
      
      {/* Background Glitch Elements */}
      <div className="absolute top-10 left-10 w-32 h-32 border-8 border-neo-black opacity-20 rotate-12"></div>
      <div className="absolute bottom-20 right-20 w-64 h-64 bg-neo-black opacity-10 rounded-full"></div>
      
      <Magnetic intensity={0.5} className="z-10 relative">
        <div className="bg-neo-yellow border-4 border-neo-black p-8 md:p-16 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center transform rotate-[-2deg] max-w-3xl">
          
          <div className="bg-neo-black text-neo-white font-mono font-black px-4 py-2 text-xl mb-8 border-2 border-neo-black shadow-hard uppercase tracking-widest animate-pulse">
            System Error
          </div>

          <h1 className="text-8xl md:text-[150px] font-black tracking-tighter leading-none mb-6 text-neo-black mix-blend-darken">
            404
          </h1>
          
          <h2 className="text-2xl md:text-4xl font-black uppercase text-neo-black mb-6">
            Connection Severed
          </h2>
          
          <p className="font-mono text-neo-black text-lg md:text-xl font-bold mb-10 border-t-4 border-b-4 border-neo-black py-4">
            The room or page you are looking for does not exist in this dimension. It may have been destroyed, or it never existed at all.
          </p>
          
          <Link 
            href="/"
            className="bg-neo-blue text-white border-4 border-neo-black font-black py-5 px-10 text-2xl uppercase transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-2 hover:translate-x-2 hover:shadow-none hover:bg-neo-pink"
          >
            Return to Base
          </Link>
        </div>
      </Magnetic>
    </div>
  );
}
