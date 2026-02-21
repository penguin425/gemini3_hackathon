import * as React from "react"
import { motion } from "framer-motion"

interface PenBashoProps {
  state: "idle" | "analyzing" | "result";
  score?: number;
}

export function PenBasho({ state, score = 0 }: PenBashoProps) {

  const getExpression = () => {
    if (state === "analyzing") return "🤔"; // Thinking/Walking
    if (state === "result") {
      if (score >= 80) return "🤩"; // Amazed
      if (score >= 50) return "😌"; // Nodding
      return "🤨"; // Tilting head
    }
    return "😐"; // Neutral/Idle
  }

  // Simple SVG Penguin Character
  // This is a very abstract representation for the hackathon MVP.
  return (
    <div className="relative w-32 h-32 flex justify-center items-center">
      <motion.div
        animate={state === "analyzing" ? { y: [0, -5, 0], x: [0, 2, 0, -2, 0] } : {}}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="w-full h-full relative"
      >
        {/* Body */}
        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            {/* Outline/Body */}
            <path d="M20,90 Q10,50 50,10 Q90,50 80,90 Z" fill="#2C3E50" />
            <path d="M25,90 Q20,50 50,20 Q80,50 75,90 Z" fill="#ECF0F1" />

            {/* Basho Hat (Zukin) */}
            <path d="M15,40 Q50,-10 85,40 L90,50 L10,50 Z" fill="#34495E" />

            {/* Eyes */}
            <circle cx="40" cy="45" r="3" fill="#000" />
            <circle cx="60" cy="45" r="3" fill="#000" />

            {/* Beak */}
            <path d="M45,50 L55,50 L50,58 Z" fill="#F1C40F" />

            {/* Haori (Coat) details - simplified */}
            <rect x="20" y="70" width="60" height="20" fill="none" stroke="#2C3E50" strokeWidth="2" />
        </svg>

        {/* Expression Emoji Overlay (Quick way to show emotion) */}
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 text-2xl">
           {/* We can use eyes change in SVG, but emoji is funny and clear for MVP */}
        </div>
      </motion.div>

        {/* Speech Bubble for Feedback if needed, or just expression */}
        <div className="absolute -top-4 -right-4 bg-white text-black rounded-full px-2 py-1 text-xs shadow-lg border border-gray-200">
            {getExpression()}
        </div>
    </div>
  )
}
