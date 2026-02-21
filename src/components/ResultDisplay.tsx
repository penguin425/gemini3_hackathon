import * as React from "react"
import { motion, animate } from "framer-motion"
import { Play, Pause, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { HaikuResult } from "@/types"
import { PenBasho } from "./PenBasho"

interface ResultDisplayProps {
  result: HaikuResult;
  onReset: () => void;
}

function CountUp({ value, className }: { value: number; className?: string }) {
    const nodeRef = React.useRef<HTMLSpanElement>(null);
    const prevValue = React.useRef(0);

    React.useEffect(() => {
      const node = nodeRef.current;
      if (!node) return;

      const controls = animate(prevValue.current, value, {
        duration: 2.0,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = Math.round(v).toString();
        },
      });

      prevValue.current = value;
      return () => controls.stop();
    }, [value]);

    return <span ref={nodeRef} className={className}>{Math.round(prevValue.current)}</span>;
}

export function ResultDisplay({ result, onReset }: ResultDisplayProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      setProgress((current / duration) * 100);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const duration = audioRef.current.duration || 1;
      audioRef.current.currentTime = (value[0] / 100) * duration;
      setProgress(value[0]);
    }
  };

  // Emotion/Score Based Styles
  const getScoreColor = (score: number) => {
      if (score >= 80) return "text-[#4ECDC4]"; // High
      if (score >= 50) return "text-[#E6B422]"; // Medium
      return "text-gray-400"; // Low
  }

  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 p-4">
      {/* Left: Haiku & Audio */}
      <div className="flex flex-col gap-6">
        <Card className="bg-card/30 backdrop-blur-md border-primary/20 overflow-hidden relative">
             {/* Seasonal Background hint */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundColor: result.analysis.colors[0] || "#000"
            }} />

            <CardContent className="p-8 min-h-[300px] flex justify-center items-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.5, delay: 0.5 }}
                    className="text-3xl font-serif leading-loose tracking-widest text-center h-full flex items-center justify-center whitespace-pre-wrap"
                    style={{ writingMode: "vertical-rl", textOrientation: "upright" }}
                >
                    {result.haiku}
                </motion.div>
            </CardContent>
        </Card>

        {/* Audio Player */}
        <Card className="p-4 bg-card/50 border-primary/10">
            <div className="flex items-center gap-4">
                <Button size="icon" variant="ghost" onClick={togglePlay} className="rounded-full w-12 h-12">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </Button>
                <div className="flex-1">
                    <Slider
                        value={[progress]}
                        max={100}
                        step={1}
                        onValueChange={handleSeek}
                        className="cursor-pointer"
                    />
                </div>
                <audio
                    ref={audioRef}
                    src={result.audioUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={handleEnded}
                    loop={false}
                />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center font-mono">
                Generated: {result.analysis.music_prompt.substring(0, 50)}...
            </p>
        </Card>
      </div>

      {/* Right: Score & Feedback */}
      <div className="flex flex-col gap-6">
        <Card className="border-primary/20 bg-card/40">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>採点結果</span>
                    <span className={cn("text-4xl font-bold font-mono", getScoreColor(result.score))}>
                        <CountUp value={result.score} />
                        <span className="text-lg text-muted-foreground">/100</span>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                        <span>韻律</span>
                        <span className="font-mono">{result.scores.rhythm}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>情緒</span>
                        <span className="font-mono">{result.scores.emotion}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>独創性</span>
                        <span className="font-mono">{result.scores.originality}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>調和</span>
                        <span className="font-mono">{result.scores.harmony}</span>
                    </div>
                </div>

                {/* Feedback Section */}
                <div className="mt-6 flex gap-4 items-start">
                    <div className="shrink-0">
                         <PenBasho state="result" score={result.score} />
                    </div>
                    <div className="bg-secondary/50 p-4 rounded-br-2xl rounded-tr-2xl rounded-bl-2xl text-sm leading-relaxed relative border border-secondary">
                        <div className="absolute top-0 left-0 w-3 h-3 bg-secondary/50 transform -translate-x-1/2 rotate-45 border-l border-b border-secondary"></div>
                        <p>「{result.feedback}」</p>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" size="sm" onClick={() => {
                    // Quick Share Logic (Mock)
                    alert("Sharing to Twitter/X...");
                }}>
                    <Share2 className="w-4 h-4 mr-2" />
                    共有する
                </Button>
                <Button onClick={onReset}>
                    もう一度詠む
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  )
}
