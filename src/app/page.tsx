"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

import { HaikuInput } from "@/components/HaikuInput"
import { ResultDisplay } from "@/components/ResultDisplay"
import { PenBasho } from "@/components/PenBasho"
import { Leaderboard } from "@/components/Leaderboard"
import { Button } from "@/components/ui/button"
import { HaikuResult, HaikuAnalysis, ScoreDetails } from "@/types"

type AppState = "idle" | "analyzing" | "generating" | "scoring" | "result"

export default function Home() {
  const [state, setState] = React.useState<AppState>("idle")
  const [user, setUser] = React.useState<User | null>(null)

  // Data holders
  const [haiku, setHaiku] = React.useState("")
  const [analysis, setAnalysis] = React.useState<HaikuAnalysis | null>(null)
  const [audioUrl, setAudioUrl] = React.useState<string>("")
  const [scoreData, setScoreData] = React.useState<{ scores: ScoreDetails, totalScore: number, feedback: string } | null>(null)
  const [resultId, setResultId] = React.useState<string>("")

  // Auth initialization
  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else if (auth) {
        signInAnonymously(auth).catch((error) => {
          console.error("Auth Error", error);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (inputHaiku: string) => {
    setHaiku(inputHaiku);
    setState("analyzing");

    try {
        // 1. Analyze
        const analyzeRes = await fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ haiku: inputHaiku }),
        });
        const analyzeJson = await analyzeRes.json();
        setAnalysis(analyzeJson);

        // 2. Generate Music
        setState("generating");
        const generateRes = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: analyzeJson.music_prompt }),
        });
        const generateJson = await generateRes.json();
        setAudioUrl(generateJson.audioUrl);

        // 3. Score
        setState("scoring");
        const scoreRes = await fetch("/api/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ haiku: inputHaiku, music_prompt: analyzeJson.music_prompt }),
        });
        const scoreJson = await scoreRes.json();
        setScoreData(scoreJson);

        // 4. Save to Firestore (Client-side submission)
        if (user && db) {
            try {
                const docRef = await addDoc(collection(db, "haikus"), {
                    userId: user.uid,
                    displayName: user.displayName || "名無し",
                    haiku: inputHaiku,
                    score: scoreJson.totalScore,
                    scores: scoreJson.scores,
                    feedback: scoreJson.feedback,
                    audioUrl: generateJson.audioUrl,
                    emotion: analyzeJson.emotion,
                    season: analyzeJson.season,
                    colors: analyzeJson.colors,
                    createdAt: serverTimestamp()
                });
                setResultId(docRef.id);
            } catch (e) {
                console.error("Firestore save error", e);
            }
        }

        setState("result");

    } catch (error) {
        console.error("Process error:", error);
        alert("エラーが発生しました。もう一度お試しください。");
        setState("idle");
    }
  };

  const handleReset = () => {
    setHaiku("");
    setAnalysis(null);
    setAudioUrl("");
    setScoreData(null);
    setState("idle");
  };

  // Background Gradient based on season/analysis
  const getBackgroundStyle = () => {
      if (!analysis) return { background: "#0F0F1A" };
      const colors = analysis.colors;
      if (colors && colors.length >= 2) {
          return {
              background: `linear-gradient(135deg, ${colors[0]} 0%, #0F0F1A 100%)`
          };
      }
      return { background: "#0F0F1A" };
  };

  return (
    <main
        className="min-h-screen flex flex-col items-center py-10 px-4 transition-colors duration-1000 ease-in-out font-sans text-white overflow-x-hidden"
        style={getBackgroundStyle()}
    >
      {/* Header / Hero */}
      <header className="mb-12 flex flex-col items-center gap-4 z-10">
        <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#E6B422] to-[#F5F0E8] drop-shadow-sm">
          音詠
        </h1>
        <p className="text-sm md:text-base text-muted-foreground tracking-widest">
            OTO-YOMI
        </p>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl z-10 flex-1 flex flex-col justify-center min-h-[500px]">
        <AnimatePresence mode="wait">

            {/* Input State */}
            {state === "idle" && (
                <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{
                        opacity: 0,
                        scale: 1.1,
                        filter: "blur(8px)",
                        transition: { duration: 1.5, ease: "easeInOut" }
                    }}
                    className="w-full flex justify-center"
                >
                    <div className="flex flex-col items-center gap-8 w-full">
                        <PenBasho state="idle" />
                        <div className="text-center space-y-2">
                             <p className="text-lg">五七五を詠み、音を奏でる。</p>
                             <p className="text-sm text-muted-foreground">あなたの句から、AIが音楽と情景を生成します。</p>
                        </div>
                        <HaikuInput onSubmit={handleSubmit} isSubmitting={false} />
                    </div>
                </motion.div>
            )}

            {/* Loading States */}
            {(state === "analyzing" || state === "generating" || state === "scoring") && (
                <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full flex flex-col items-center justify-center gap-8"
                >
                    <PenBasho state="analyzing" />
                    <div className="text-xl font-serif animate-pulse">
                        {state === "analyzing" && "句の情景を読み解いております..."}
                        {state === "generating" && "音色を奏でております..."}
                        {state === "scoring" && "採点中でござる..."}
                    </div>
                    {/* Ripple Effect Animation */}
                    <div className="relative w-32 h-32">
                         <motion.div
                            className="absolute inset-0 border-2 border-primary/50 rounded-full"
                            animate={{ scale: [1, 2], opacity: [1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                         />
                         <motion.div
                            className="absolute inset-0 border-2 border-primary/30 rounded-full"
                            animate={{ scale: [1, 2], opacity: [1, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                         />
                    </div>
                </motion.div>
            )}

            {/* Result State */}
            {state === "result" && analysis && scoreData && (
                <motion.div
                    key="result"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 0.8 }}
                    className="w-full"
                >
                    <ResultDisplay
                        result={{
                            id: resultId,
                            userId: user?.uid || "",
                            displayName: user?.displayName || "名無し",
                            haiku: haiku,
                            score: scoreData.totalScore,
                            scores: scoreData.scores,
                            feedback: scoreData.feedback,
                            audioUrl: audioUrl,
                            analysis: analysis,
                            createdAt: new Date()
                        }}
                        onReset={handleReset}
                    />
                </motion.div>
            )}

        </AnimatePresence>
      </div>

      {/* Leaderboard Section */}
      <section className="mt-20 w-full max-w-md z-10">
        <Leaderboard />
      </section>

      {/* Footer */}
      <footer className="mt-20 text-xs text-muted-foreground z-10">
        <p>&copy; 2024 Oto-Yomi Project. Powered by Gemini & Firebase.</p>
      </footer>
    </main>
  )
}
