# Quizzer

Trivia sets from the [Open Trivia Database](https://opentdb.com), rebuilt with Vue 3 and Convex.

- **On your own**: pick a category, difficulty, kind of question (multiple choice or true/false)
  and how many (1–50). Each answer is marked as soon as you pick it; the end of the set shows
  every question with your answer and the right one. An unfinished set can be picked up again
  later, even after closing the tab.
- **With friends**: one person opens a room (PeerJS, 4-letter code or invite link) and picks the
  set; up to eight people answer the same questions on their own devices, with live standings.
  Nobody is pulled out of a set halfway when the host moves on.
- Keyboard: 1–4 (or A–D) answers, Enter moves on.

## How the answers stay honest (Convex)

Questions are fetched from OpenTDB by a Convex action, and the right answers stay on the server:
the browser only learns a question's answer after answering it. Scores are counted on the server.

The **leaderboard** keeps each name's best set of 10 or more questions, ranked by the share
answered correctly (a longer set wins a tie). Ending a set early counts the rest as wrong, so it
never helps. Quizzes and attempts older than 30 days are pruned daily; the leaderboard stays.

## Setup

```bash
npm install
npx convex dev      # first run links the Convex project and writes .env.local (CONVEX_URL)
npm run dev         # in another terminal
```

Quizzer needs Convex: the questions and answers live there.

| Script           | What it does                               |
| ---------------- | ------------------------------------------ |
| `npm run dev`    | Vite+ dev server                           |
| `npm run convex` | Convex dev watcher                         |
| `npm run build`  | Typecheck + production build               |
| `npm test`       | Decoding, shuffling, settings, scoring     |

## Layout

```
src/quiz/            Settings, OpenTDB decoding, option shuffling, scoring (shared with Convex).
src/net/room.ts      Party lobby (PeerJS): players, the host's settings, which quiz to play.
convex/quizzes.ts    Fetching sets from OpenTDB, category cache.
convex/attempts.ts   Answering, ending early, party standings, leaderboard.
legacy/              The original version, kept for reference.
```
