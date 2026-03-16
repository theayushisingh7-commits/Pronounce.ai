# AI Pronunciation Coach - PRD

## Original Problem Statement
Build a web application called AI Pronunciation Coach that helps users improve their English pronunciation with speech recognition, word-by-word comparison, visual feedback, and audio pronunciation playback.

## User Personas
- English language learners
- Students preparing for English exams
- Professionals wanting to improve pronunciation

## Core Requirements (Static)
1. Display paragraphs from random sentence pools
2. Record user speech via Web Speech API
3. Compare spoken text with original word-by-word
4. Highlight correct words (green) / incorrect words (red)
5. Play correct pronunciation using SpeechSynthesis API
6. Calculate pronunciation score
7. Support difficulty levels (Easy/Medium/Hard)
8. Track progress history

## What's Been Implemented (Mar 2026)
- **Backend API** (FastAPI + MongoDB):
  - GET /api/sentences - Random sentences by difficulty
  - POST /api/attempts - Save pronunciation attempts
  - GET /api/attempts - Retrieve history
  - GET /api/stats - Statistics aggregation
  - DELETE /api/attempts - Clear history

- **Frontend** (React + Tailwind):
  - Dark "Cyber-Linguist" theme with cyan/violet accents
  - Practice tab with sentence display and recording
  - Real-time word-by-word comparison
  - Feedback panel with score and incorrect words
  - "Hear Correct Pronunciation" buttons
  - History tab with bento-grid layout
  - Statistics dashboard
  - Difficulty selector (Easy/Medium/Hard)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, Lucide icons
- Backend: FastAPI, Motor (async MongoDB)
- APIs: Web Speech API, SpeechSynthesis API

## Prioritized Backlog
### P0 (Done)
- [x] Core pronunciation practice flow
- [x] Speech-to-text comparison
- [x] Visual feedback (green/red highlighting)
- [x] Audio pronunciation playback
- [x] Difficulty levels
- [x] Progress tracking

### P1 (Future)
- [ ] User authentication
- [ ] Custom sentence input
- [ ] Spaced repetition for difficult words
- [ ] Export progress reports

### P2 (Nice to Have)
- [ ] Leaderboard
- [ ] Daily practice streaks
- [ ] Multiple language support
