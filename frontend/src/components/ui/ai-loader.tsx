import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface AILoaderProps {
  text?: string;
  className?: string;
}

export const AILoader = ({ text = "Loading", className }: AILoaderProps) => {
  const letters = text.split("");

  useEffect(() => {
    // Inject keyframes if not already present
    if (typeof document !== "undefined" && !document.getElementById("loader-keyframes")) {
      const style = document.createElement("style");
      style.id = "loader-keyframes";
      style.textContent = `
        @keyframes loader-bounce {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-10px);
            opacity: 0.7;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className={cn("loader-wrapper flex items-center justify-center gap-1", className)}>
      {letters.map((letter, index) => (
        <span
          key={index}
          className="loader-letter text-white text-2xl md:text-3xl font-bold"
          style={{
            animation: `loader-bounce 1.4s ease-in-out infinite`,
            animationDelay: `${index * 0.1}s`,
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </span>
      ))}
      <div className="loader ml-2 w-1 h-8 bg-gradient-to-b from-purple-400 via-pink-400 to-cyan-400 rounded-full animate-pulse" />
    </div>
  );
};
