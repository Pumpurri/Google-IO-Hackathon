# WorldMog - Demo Script (~2 minutes)

## Opening (15s)

What if celebrating a goal was a competitive sport? We built **WorldMog** — a real-time 1v1 web app where two players go head-to-head replicating iconic soccer celebrations, judged live by AI.

## How It Works (30s)

Players enter their name and get matched instantly through our **FastAPI WebSocket** backend. Once matched, you're assigned a random celebration — Ronaldo's SIUUUU, Haaland's Zen meditation, Neymar's heart, Lamine Yamal's sauce — and given 10 seconds to study the reference video in a full-screen popup. Then a countdown hits, and you have 15 seconds to perform while the reference stays on screen.

Here's where it gets wild. While you're performing, the AI is watching — and roasting you in real time.

## The AI Stack (45s)

We use three layers of AI judging, all running simultaneously through **Google Cloud Vertex AI**:

**Gemini Live API** streams your webcam frames in real-time to Gemini 2.5 Flash Native Audio. It acts as a chaotic sports commentator — narrating the battle, trash-talking bad poses, hyping up great ones, and calling out live scores. You hear it as live voice commentary streamed directly to your browser.

**GMI Cloud** powers our accuracy judge. After the performance, it takes your key frames and the reference image, runs them through GPT-4o vision on GMI's infrastructure, and scores how precisely your body matched the celebration pose.

**Gemini 2.5 Flash** handles the style judge — evaluating energy, expressiveness, and vibes. Because accuracy without sauce is just standing weird.

The final score blends 65% accuracy from GMI with 35% style from Gemini. Both judges run in parallel and deliver hilarious, unhinged feedback roasting or hyping your performance.

## The Result (15s)

After a dramatic three-stage judging sequence, you get a massive results screen — ABSOLUTELY MOGGED, SENT TO THE SHADOW REALM — with AI-generated roasts explaining exactly why you won or lost. Then you smash rematch and run it back.

## Close (15s)

WorldMog turns AI judging into entertainment. Vertex AI, GMI Cloud, real-time streaming, instant feedback — all in the browser. Thanks for watching.
