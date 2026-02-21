"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brush, Play, Pause, Trophy, Music, Wind, Send } from "lucide-react";
import { db, storage, auth, signInWithGoogle, logout, signInAnon } from "@/lib/firebase";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";

type ScoreData = {
  rhythm: number;
  emotion: number;
  originality: number;
  harmony: number;
};

type HaikuResult = {
  haiku: string;
  emotion: string;
  season: string;
  colors: string[];
  music_prompt: string;
  audioUrl: string;
  imageUrl?: string;
  total_score: number;
  scores: ScoreData;
  feedback: string;
  displayName?: string; // Add displayName to result
};

export default function Home() {
  const [haiku, setHaiku] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"input" | "loading" | "result">("input");
  const [result, setResult] = useState<HaikuResult | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  
  // Track Firebase User
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [loadingMsg, setLoadingMsg] = useState("ビートを準備中... 🎧");

  // Toggle debug alerts and console logs
  const DEBUG = false;

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      
      // If not logged in, fallback to anonymous auth automatically
      if (!currentUser && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
         signInAnon().catch(e => { if (DEBUG) console.error(e) });
      }
    });

    const q = query(collection(db, "haikus"), orderBy("score", "desc"), limit(10));
    const unsubscribeDB = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRanking(docs);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDB();
    };
  }, []);

  const handleSubmit = async () => {
    if (!haiku.trim()) return;

    setIsSubmitting(true);
    setStep("loading");
    setLoadingMsg("DJ ペン芭蕉がヴァイブスを分析中... 🐧🔍");

    try {
      // Step 1: Analyze
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        body: JSON.stringify({ haiku }),
      });
      
      let analyzeData;
      const analyzeText = await analyzeRes.text();
      try {
        analyzeData = JSON.parse(analyzeText);
      } catch (e) {
        throw new Error(`API Error (Analyze): ${analyzeRes.status} ${analyzeRes.statusText}`);
      }
      
      if (!analyzeRes.ok || analyzeData.error) {
        throw new Error(analyzeData.error || "Analysis failed");
      }

      setLoadingMsg("エモいトラックを作曲中... 🎵✨");
      // Step 2: Generate Music and Image in parallel
      const [musicRes, imageRes] = await Promise.all([
        fetch("/api/generate", {
          method: "POST",
          body: JSON.stringify({
            music_prompt: analyzeData.music_prompt,
            season: analyzeData.season,
          }),
        }),
        fetch("/api/image", {
          method: "POST",
          body: JSON.stringify({
            image_prompt: analyzeData.image_prompt,
          }),
        })
      ]);
      
      let musicData;
      let imageData;
      
      try {
        musicData = await musicRes.json();
      } catch (e) {
        throw new Error(`API Error (Generate Music): ${musicRes.status} ${musicRes.statusText}`);
      }

      try {
        imageData = await imageRes.json();
      } catch (e) {
        if (DEBUG) console.error("Image gen failed", e);
        imageData = { imageUrl: "" }; // Image is optional
      }

      if (!musicRes.ok || musicData.error) {
        throw new Error(musicData.error || "Music generation failed");
      }

      setLoadingMsg("完成したビートを聴き込んでいます... 🎧🐧");
      // Step 3: Score
      const scoreRes = await fetch("/api/score", {
        method: "POST",
        body: JSON.stringify({
          haiku,
          music_prompt: analyzeData.music_prompt,
          season: analyzeData.season,
          audioUrl: musicData.audioUrl // Base64 audio string passing to Gemini
        }),
      });
      
      let scoreData;
      const scoreText = await scoreRes.text();
      try {
        scoreData = JSON.parse(scoreText);
      } catch (e) {
        throw new Error(`API Error (Score): ${scoreRes.status} ${scoreRes.statusText}`);
      }

      if (!scoreRes.ok || scoreData.error) {
         throw new Error(scoreData.error || "Scoring failed");
      }

      // Step 4: Upload Audio & Image to Storage & Submit to DB
      let finalAudioUrl = musicData.audioUrl;
      let finalImageUrl = imageData.imageUrl;
      
      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('@/lib/firebase');
      
      const uploadBase64ToStorage = async (base64Url: string, type: 'audio' | 'image') => {
        try {
          const response = await fetch(base64Url);
          const blob = await response.blob();
          
          const ext = type === 'audio' ? 'wav' : 'jpg';
          const filename = `haikus/${type}-${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const storageRef = ref(storage, filename);
          
          await uploadBytes(storageRef, blob);
          return await getDownloadURL(storageRef);
        } catch (uploadError) {
          if (DEBUG) console.error(`Storage upload failed for ${type}:`, uploadError);
          return "local_only";
        }
      };

      setLoadingMsg("トラックとアートをクラウドに保存中... ☁️");
      
      if (finalAudioUrl && finalAudioUrl.startsWith('data:audio/')) {
         finalAudioUrl = await uploadBase64ToStorage(finalAudioUrl, 'audio');
      }
      
      if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
         finalImageUrl = await uploadBase64ToStorage(finalImageUrl, 'image');
      }

      // Update the result object with the correct URL
      const finalResult: HaikuResult = {
        haiku,
        ...analyzeData,
        audioUrl: finalAudioUrl, 
        imageUrl: finalImageUrl,
        ...scoreData,
      };

      setResult(finalResult);

      setLoadingMsg("ランキングに登録中... 🏆");
      const submitRes = await fetch("/api/submit", {
        method: "POST",
        body: JSON.stringify({
          userId: user?.uid || "anonymous",
          displayName: user && !user.isAnonymous ? user.displayName : "さすらいのペンペン",
          haiku,
          score: finalResult.total_score,
          scores: finalResult.scores,
          feedback: finalResult.feedback,
          audioUrl: finalAudioUrl, 
          imageUrl: finalImageUrl, 
          emotion: finalResult.emotion,
          season: finalResult.season,
          colors: finalResult.colors,
        }),
      });

      if (!submitRes.ok) {
        throw new Error("Failed to save the track to the database.");
      }
      
      setStep("result");
    } catch (error: any) {
      if (DEBUG) {
        console.error(error);
        alert(`エラーが発生しました: ${error.message}`);
      } else {
        alert("エラーが発生しました。もう一度お試しください。");
      }
      setStep("input");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRankingClick = (item: any) => {
    setResult({
      haiku: item.haiku,
      emotion: item.emotion || "",
      season: item.season || "",
      colors: item.colors || ["#2C3E50", "#ECF0F1", "#BDC3C7"],
      music_prompt: "", 
      audioUrl: item.audioUrl,
      imageUrl: item.imageUrl,
      total_score: item.score,
      scores: item.scores,
      feedback: item.feedback,
    });
    setStep("result");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetRanking = async () => {
    const password = prompt("リセット用パスワードを入力してください (ヒント: basho-...)");
    if (!password) return;

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(`リセット完了！ ${data.deletedCount} 件のトラックを削除しました。`);
        setResult(null);
        setHaiku(""); // Clear input on reset
        setStep("input");
      } else {
        if (DEBUG) alert(`エラー: ${data.error}`);
        else alert("リセットに失敗しました");
      }
    } catch (e) {
      if (DEBUG) console.error(e);
      alert("通信エラーが発生しました");
    }
  };

  return (
    <main className="min-h-screen bg-[#0F0F1A] text-[#F5F0E8] font-sans p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-12 relative">
        
        {/* Auth Section */}
        <div className="absolute top-0 right-0 flex items-center gap-3 text-sm z-50">
          {!loadingAuth && user && !user.isAnonymous ? (
            <div className="flex items-center gap-3">
              <span className="text-[#8B8B9E] hidden md:inline">
                {user.displayName} <span className="text-xs">としてログイン中</span>
              </span>
              <img 
                src={user.photoURL || ""} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-[#E6B422]/50" 
              />
              <button onClick={logout} className="text-[#E6B422] hover:text-[#C59B1D] transition-colors underline">
                ログアウト
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle} 
              className="bg-white text-black px-4 py-2 rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Googleでログイン
            </button>
          )}
        </div>

        {/* Header */}
        <header className="text-center space-y-4 pt-12">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-[#E6B422] tracking-widest"
          >
            俳句DJ 🐧
          </motion.h1>
          <p className="text-[#8B8B9E] text-lg font-bold mt-2">〜 ペン芭蕉のビートチャレンジ 〜</p>
          <p className="text-[#8B8B9E]/80 text-sm">五七五を詠んで、ペン芭蕉にオリジナルビートを作らせよう！</p>
        </header>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.section
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05, filter: "blur(10px)" }}
              className="flex flex-col items-center space-y-8"
            >
              <div className="relative w-full max-w-md bg-[#1A1A2E] p-8 rounded-lg border border-[#E6B422]/20 shadow-2xl">
                <div className="flex justify-center h-80">
                  <Textarea
                    value={haiku}
                    onChange={(e) => setHaiku(e.target.value)}
                    placeholder="五七五を詠む..."
                    className="w-full h-full text-3xl font-brush bg-transparent border-none resize-none focus-visible:ring-0 text-center [writing-mode:vertical-rl] placeholder:opacity-30"
                  />
                </div>
                <div className="absolute bottom-4 right-4 text-[#8B8B9E]">
                  {haiku.length} 音
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!haiku || isSubmitting}
                className="bg-[#E6B422] hover:bg-[#C59B1D] text-[#0F0F1A] px-12 py-6 text-xl rounded-full transition-all transform hover:scale-105 font-bold"
              >
                <Music className="mr-2" /> トラックをドロップ
              </Button>
            </motion.section>
          )}

          {step === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-8"
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-32 h-32 bg-[#E6B422]/20 rounded-full absolute -inset-4"
                />
                <div className="text-6xl">🐧</div>
              </div>
              <p className="text-2xl font-serif animate-pulse">{loadingMsg}</p>
            </motion.section>
          )}

          {step === "result" && result && (
            <motion.section
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Haiku & Cover Art Display */}
                <Card className="bg-[#1A1A2E] border-[#E6B422]/30 text-[#F5F0E8] overflow-hidden relative">
                  {result.imageUrl && result.imageUrl !== "local_only" && (
                    <div 
                      className="absolute inset-0 bg-cover bg-center opacity-40 z-0" 
                      style={{ backgroundImage: `url(${result.imageUrl})` }}
                    />
                  )}
                  <CardContent className="p-8 flex flex-col items-center space-y-6 relative z-10 bg-black/30 h-full justify-between">
                    <div className="h-64 [writing-mode:vertical-rl] text-4xl font-brush leading-loose tracking-widest drop-shadow-md">
                      {result.haiku}
                    </div>
                    <div className="flex gap-4">
                      {result.colors.map((c) => (
                        <div key={c} className="w-8 h-8 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                    {result.audioUrl && result.audioUrl !== "local_only" && (
                      <audio key={result.audioUrl} src={result.audioUrl} controls className="w-full opacity-80" />
                    )}
                  </CardContent>
                </Card>

                {/* Score & Feedback */}
                <Card className="bg-[#1A1A2E] border-[#E6B422]/30 text-[#F5F0E8]">
                  <CardContent className="p-8 space-y-6">
                    <div className="flex justify-between items-end">
                      <h3 className="text-2xl font-serif text-[#E6B422]">鑑定結果</h3>
                      <div className="text-5xl font-bold text-[#4ECDC4]">{result.total_score} <span className="text-sm">点</span></div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>フロウ (Rhythm)</span><span>{result.scores.rhythm}/25</span></div>
                        <Progress value={(result.scores.rhythm / 25) * 100} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>エモさ (Emotion)</span><span>{result.scores.emotion}/25</span></div>
                        <Progress value={(result.scores.emotion / 25) * 100} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>ドープ度 (Originality)</span><span>{result.scores.originality}/25</span></div>
                        <Progress value={(result.scores.originality / 25) * 100} className="h-1" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1"><span>ビートとシンクロ (Harmony)</span><span>{result.scores.harmony}/25</span></div>
                        <Progress value={(result.scores.harmony / 25) * 100} className="h-1" />
                      </div>
                    </div>

                    <div className="bg-[#0F0F1A] p-4 rounded border-l-4 border-[#E6B422] relative">
                      <div className="absolute -top-3 -left-3 text-2xl">🐧</div>
                      <p className="text-sm leading-relaxed italic">「{result.feedback}」</p>
                    </div>

                    <Button 
                      onClick={() => {
                        setHaiku(""); // Clear the input field for the next turn
                        setStep("input");
                      }}
                      className="w-full bg-transparent border border-[#E6B422] text-[#E6B422] hover:bg-[#E6B422]/10 font-bold"
                    >
                      もう一度ドロップする
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Ranking */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="text-[#E6B422]" />
              <h2 className="text-2xl font-serif">全国 ビート番付 (トップ10)</h2>
            </div>
            <button 
              onClick={handleResetRanking}
              className="text-xs text-[#8B8B9E] hover:text-red-400 transition-colors px-2 py-1 border border-transparent hover:border-red-400/30 rounded"
            >
              🔄 リセット
            </button>
          </div>
          <div className="bg-[#1A1A2E] rounded-lg overflow-hidden border border-[#E6B422]/10">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0F0F1A] text-[#8B8B9E] text-sm uppercase">
                  <th className="p-4">順位</th>
                  <th className="p-4 hidden md:table-cell">DJ</th>
                  <th className="p-4">リリック</th>
                  <th className="p-4">バイブス(得点)</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((item, index) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleRankingClick(item)}
                    className="border-t border-[#E6B422]/5 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <td className="p-4 font-bold text-[#E6B422]">#{index + 1}</td>
                    <td className="p-4 text-sm text-[#8B8B9E] hidden md:table-cell truncate max-w-[120px]">
                      {item.displayName || "さすらいのペンペン"}
                    </td>
                    <td className="p-4 font-brush text-lg truncate max-w-[150px] md:max-w-md">{item.haiku}</td>
                    <td className="p-4 font-bold text-[#4ECDC4]">{item.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}