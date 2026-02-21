export interface HaikuAnalysis {
  emotion: string;
  season: string;
  colors: string[];
  music_prompt: string;
  visual_keywords: string[];
}

export interface ScoreDetails {
  rhythm: number;
  emotion: number;
  originality: number;
  harmony: number;
}

export interface HaikuResult {
  id: string;
  userId: string;
  displayName: string;
  haiku: string;
  score: number;
  scores: ScoreDetails;
  feedback: string;
  audioUrl: string;
  analysis: HaikuAnalysis;
  createdAt: number | Date;
}
