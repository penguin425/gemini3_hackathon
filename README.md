# 俳句DJ 🐧 〜 ペン芭蕉のビートチャレンジ 〜
(Haiku DJ: Pen-Basho's Beat Challenge)

五七五の俳句を詠むと、AIがその世界観を解析し、**オリジナルビート（音楽）**と**情景画像**を自動生成して鑑定してくれる新感覚のWebアプリケーションです。

## 🌟 主な機能 (Features)

1. **AI俳句鑑定 & スコアリング**
   入力された俳句を「リズム」「エモさ」「独創性」「調和」の4項目でAIが評価・採点し、講評を返します。季語や色彩も自動で抽出します。
2. **情景の画像生成 (Image Generation)**
   俳句から読み取れる情景や色彩を元に、その句の世界観を表す画像を生成します。
3. **オリジナルビート生成 (Music Generation)**
   俳句の感情や季節感に合わせてプロンプトを構築し、AIがマッチする短い音楽（ビート）を生成します。
4. **全国ビート番付 (Leaderboard)**
   高得点を叩き出した俳句は、ランキングボードに掲載され、他のユーザーが生成したビートや画像を鑑賞することができます。
5. **Google認証対応**
   Googleアカウントでのログインに対応し、自分の名前でランキングに挑戦できます（匿名利用も可能）。

## 🛠️ 技術スタック & AIモデル (Tech Stack & AI Models)

**Frontend:**
* [Next.js 15](https://nextjs.org/) (App Router, React 19)
* [Tailwind CSS v4](https://tailwindcss.com/)
* [Framer Motion](https://www.framer.com/motion/) (アニメーション)
* [Radix UI](https://www.radix-ui.com/) / [Lucide Icons](https://lucide.dev/)

**Backend & BaaS:**
* **Firebase** (Authentication, Firestore, Cloud Storage)
* **Next.js API Routes** (Serverless backend)

**AI Models & SDK:**
* **Text Analysis & Scoring**: `gemini-2.5-pro` (via `@google/genai` SDK)
* **Image Generation**: `gemini-3-pro-image-preview`
* **Audio Generation**: `lyria-002` (via Vertex AI REST API)

---

## 🚀 開発環境の構築 (Getting Started)

### 1. リポジトリのクローンとパッケージのインストール
```bash
git clone https://github.com/penguin425/gemini3_hackathon.git
cd gemini3_hackathon
npm install
# or yarn install / pnpm install
```

### 2. 環境変数の設定
プロジェクトルートにある `.env.example` をコピーして `.env.local` を作成します。

```bash
cp .env.example .env.local
```

`.env.local` を開き、以下のAPIキーや設定値を入力してください。
* **Google AI Studio (Gemini API)** のAPIキー
* **Firebase** プロジェクトの設定値
* **Google Cloud / Vertex AI** のプロジェクトID (Lyria音楽生成用)
* ※ Vertex AI を利用する場合は、認証用の `service-account-key.json` をルートディレクトリに配置する必要があります。

### 3. 開発サーバーの起動
```bash
npm run dev
# or yarn dev / pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスするとアプリケーションが起動します。

## 📁 プロジェクト構成 (Project Structure)

* `src/app/page.tsx` - メインUI・フロントエンドロジック
* `src/app/api/analyze/route.ts` - 俳句の分析・スコアリングAPI (Gemini 3.1 Pro)
* `src/app/api/image/route.ts` - 画像生成API (Gemini 3 Pro Image)
* `src/app/api/generate/route.ts` - 音楽・ビート生成API (Lyria 002 via Vertex AI)
* `src/lib/firebase.ts` / `firebase-admin.ts` - Firebaseの設定と管理
* `src/components/ui/` - 共通UIコンポーネント (ボタン、カードなど)
