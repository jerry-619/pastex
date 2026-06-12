import Link from "next/link";
import Magnetic from "../components/Magnetic";

export const metadata = {
  title: "How It Works | PasteX",
  description: "Learn about the architecture and security behind PasteX's real-time sharing.",
};

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-neo-white text-neo-black font-display flex flex-col items-center selection:bg-neo-black selection:text-neo-yellow p-6 md:p-12 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-neo-pink border-4 border-neo-black rounded-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-0 opacity-50"></div>
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-neo-yellow border-4 border-neo-black rotate-45 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] z-0"></div>

      <header className="relative z-10 w-full max-w-4xl flex justify-between items-center mb-12">
        <Link href="/" className="bg-neo-yellow border-4 border-neo-black p-3 hover:bg-neo-pink transition-colors shadow-hard btn-press">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square" strokeLinejoin="miter">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </Link>
        <div className="bg-neo-black text-neo-white px-6 py-2 border-4 border-neo-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono font-black uppercase text-xl">
          Architecture
        </div>
      </header>

      <main className="relative z-10 max-w-4xl w-full flex flex-col gap-12 mb-20">
        
        <div className="text-center mb-4">
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mix-blend-darken text-neo-black mb-4">
            How It Works_
          </h1>
          <p className="font-mono text-xl md:text-2xl font-bold bg-neo-blue text-white border-4 border-neo-black p-4 inline-block shadow-hard rotate-[-1deg]">
            100% Peer-to-Peer. Zero Data Storage.
          </p>
        </div>

        {/* The Stack */}
        <section className="bg-white border-4 border-neo-black p-8 shadow-hard-lg relative">
          <div className="absolute -top-6 -left-6 bg-neo-green border-4 border-neo-black px-4 py-2 font-black text-xl uppercase shadow-hard transform rotate-[-3deg]">
            1. The Stack
          </div>
          <h2 className="text-3xl font-black uppercase mb-4 mt-4">Built for Speed & Reliability</h2>
          <p className="font-mono text-lg font-medium leading-relaxed mb-6">
            PasteX is built on a modern hybrid architecture designed to be incredibly fast while respecting your privacy:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono font-bold">
            <li className="flex items-center gap-3 bg-gray-100 border-2 border-neo-black p-3">
              <span className="bg-neo-black text-neo-white px-2 py-1">UI</span> Next.js 15 (React)
            </li>
            <li className="flex items-center gap-3 bg-gray-100 border-2 border-neo-black p-3">
              <span className="bg-neo-black text-neo-white px-2 py-1">CSS</span> TailwindCSS (Neo-Brutalism)
            </li>
            <li className="flex items-center gap-3 bg-gray-100 border-2 border-neo-black p-3">
              <span className="bg-neo-black text-neo-white px-2 py-1">SIGNALING</span> Socket.io (Node.js)
            </li>
            <li className="flex items-center gap-3 bg-gray-100 border-2 border-neo-black p-3">
              <span className="bg-neo-black text-neo-white px-2 py-1">DATA</span> WebRTC (RTCDataChannel)
            </li>
          </ul>
        </section>

        {/* How Data Moves */}
        <section className="bg-white border-4 border-neo-black p-8 shadow-hard-lg relative transform rotate-[1deg]">
          <div className="absolute -top-6 -left-6 bg-neo-pink border-4 border-neo-black px-4 py-2 font-black text-xl uppercase shadow-hard transform rotate-[-2deg]">
            2. WebRTC Peer-to-Peer
          </div>
          <h2 className="text-3xl font-black uppercase mb-4 mt-4">Direct Browser Connection</h2>
          <p className="font-mono text-lg font-medium leading-relaxed mb-6">
            Unlike traditional file sharing apps (like Google Drive or WeTransfer), PasteX <strong>never uploads your files to a server</strong>.
          </p>
          <div className="border-4 border-neo-black p-4 bg-neo-yellow/20 flex flex-col gap-4 font-mono font-medium">
            <p><strong>Step A:</strong> When you join a room, our Socket.io server introduces your browser to the other person's browser (Signaling).</p>
            <p><strong>Step B:</strong> Your browsers negotiate a direct connection using WebRTC.</p>
            <p><strong>Step C:</strong> Once connected, files are broken into chunks and streamed <strong>directly</strong> between the devices.</p>
          </div>
        </section>

        {/* Security & Privacy */}
        <section className="bg-white border-4 border-neo-black p-8 shadow-hard-lg relative transform rotate-[-1deg]">
          <div className="absolute -top-6 -left-6 bg-neo-yellow border-4 border-neo-black px-4 py-2 font-black text-xl uppercase shadow-hard transform rotate-[2deg]">
            3. Privacy by Design
          </div>
          <h2 className="text-3xl font-black uppercase mb-4 mt-4">No Trace Left Behind</h2>
          <p className="font-mono text-lg font-medium leading-relaxed mb-6">
            PasteX rooms are completely ephemeral. 
          </p>
          <ul className="list-disc list-inside font-mono text-lg font-medium space-y-2">
            <li>No databases are connected to this application.</li>
            <li>No files are ever stored on a server disk.</li>
            <li>Once all peers leave a room, the shared text buffer is instantly destroyed.</li>
          </ul>
        </section>

        <Magnetic intensity={0.2} className="mx-auto mt-8">
          <Link 
            href="/"
            className="inline-flex bg-neo-black text-neo-white border-4 border-neo-black font-black py-5 px-10 text-2xl uppercase transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-y-2 hover:translate-x-2 hover:shadow-none hover:bg-neo-green hover:text-neo-black"
          >
            Create A Room Now
          </Link>
        </Magnetic>

      </main>
    </div>
  );
}
