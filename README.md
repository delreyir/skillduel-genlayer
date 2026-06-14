# 🎯 SkillDuel

**1v1 skill battles. Same prompt. Both submit. AI picks the winner.**

Pick a category — coding, writing, design, math, trivia. Set a challenge prompt. Stake tokens. Your opponent accepts, matches your stake, and you both solve the same challenge independently. AI validators score both submissions and the better answer takes the full pot.

---

## How It Works

1. **Create Duel** — Pick category, write challenge prompt, stake GEN
2. **Opponent Accepts** — Matches your stake
3. **Both Submit** — Each player submits their answer (code, text, solution)
4. **AI Judges** — Validators score on correctness, quality, creativity, completeness
5. **Winner Takes All** — Higher score wins the combined prize pool

---

## Categories

- **Coding** — Write functions, algorithms, solve problems
- **Writing** — Creative writing, copy, persuasion
- **Design** — UI descriptions, system architecture
- **Trivia** — Knowledge questions, explanations
- **Math** — Proofs, calculations, optimization

---

## Consensus

Validators must agree on:
- Winner (must match exactly)
- Scores within ±2 tolerance

---

## Quick Start

```bash
npm install -g genlayer
genlayer network set studionet
genlayer deploy --contract contracts/skill_duel.py

cd frontend && npm install && npm run dev
```

---

## License

MIT
