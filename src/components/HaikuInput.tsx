import * as React from "react"
import { motion } from "framer-motion"
import { PenTool } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface HaikuInputProps {
  onSubmit: (haiku: string) => void;
  isSubmitting: boolean;
}

export function HaikuInput({ onSubmit, isSubmitting }: HaikuInputProps) {
  const [haiku, setHaiku] = React.useState("")

  // Approximate morae count (kana count)
  // This is a rough estimation. Gemini does the real check.
  const count = React.useMemo(() => {
    return haiku.replace(/\s/g, '').length;
  }, [haiku]);

  const handleSubmit = () => {
    if (!haiku.trim()) return;
    onSubmit(haiku);
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-card/50 backdrop-blur-sm border-primary/20">
      <CardContent className="p-6 flex flex-col items-center gap-6">
        <div className="relative w-full h-64 bg-background/50 rounded-lg p-4 border border-border shadow-inner flex justify-center items-center">
            {/* Vertical Writing Text Area */}
            <textarea
                value={haiku}
                onChange={(e) => setHaiku(e.target.value)}
                placeholder="五七五を詠む..."
                className="w-full h-full bg-transparent resize-none border-none focus:ring-0 text-xl font-serif text-center"
                style={{
                    writingMode: "vertical-rl",
                    textOrientation: "upright",
                    letterSpacing: "0.2em",
                    lineHeight: "2em",
                }}
                disabled={isSubmitting}
            />

            {/* Background decoration lines (optional) */}
            <div className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                    backgroundImage: "linear-gradient(to left, transparent 49%, currentColor 50%, transparent 51%)",
                    backgroundSize: "2em 100%"
                }}
            />
        </div>

        <div className="flex justify-between items-center w-full px-2">
            <span className={cn("text-sm", count > 17 ? "text-red-400" : "text-muted-foreground")}>
                {count} / 17 音
            </span>
            <Button
                onClick={handleSubmit}
                disabled={isSubmitting || haiku.length === 0}
                className="bg-[#E6B422] hover:bg-[#C59B1F] text-black font-bold px-8"
            >
                {isSubmitting ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                        <PenTool className="w-4 h-4" />
                    </motion.div>
                ) : (
                    <>
                        <PenTool className="w-4 h-4 mr-2" />
                        詠む
                    </>
                )}
            </Button>
        </div>
      </CardContent>
    </Card>
  )
}
