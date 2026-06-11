"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

interface MagneticProps {
  children: ReactNode;
  intensity?: number;
  className?: string;
  isGlobal?: boolean;
}

export default function Magnetic({ children, intensity = 0.2, className = "", isGlobal = false }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isGlobal) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse position between -1 and 1
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setPosition({ x: x * intensity * 100, y: y * intensity * 100 });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isGlobal, intensity]);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isGlobal || !ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * intensity, y: middleY * intensity });
  };

  const reset = () => {
    if (isGlobal) return;
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      className={className}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        transition: "transform 0.15s cubic-bezier(0.2, 0, 0.2, 1)",
      }}
    >
      {children}
    </div>
  );
}
