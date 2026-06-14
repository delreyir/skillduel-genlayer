# 🎯 SkillDuel

**Same challenge. Two players. AI picks the winner. Loser pays.**

SkillDuel is a 1v1 competitive arena on GenLayer. You create a challenge — coding, writing, math, anything — stake tokens, and wait for someone to accept. Both players solve the same prompt independently. When both submit, AI validators score the answers and the better submission takes the full prize pool.

---

## The Problem

Online skill competitions either have no stakes (boring) or rely on centralized judges (biased). Coding contests take weeks for results. Writing competitions are subjective with no accountability. There's no instant, fair, money-on-the-line way to prove you're better than someone at something.

SkillDuel makes it instant, fair, and profitable. Same challenge, same rules, AI consensus decides — no human judges, no waiting.

---

## How It Works

1. **Create Duel** — Pick a category, write a challenge prompt, stake GEN
2. **Opponent Accepts** — Matches your stake, both now locked
3. **Both Submit** — Each player submits their answer independently
4. **AI Judges** — Multiple validators independently score both submissions
5. **Winner Takes All** — Higher score wins the combined stake

---

## Categories

| Category | Example Challenges |
|----------|-------------------|
| **Coding** | "Write a function that finds the longest palindrome substring" |
| **Writing** | "Write a compelling product description for a smart water bottle" |
| **Design** | "Describe a UI layout for a meditation app's home screen" |
| **Math** | "Prove that the sum of first n odd numbers equals n²" |
| **Trivia** | "Explain how TCP three-way handshake works in plain English" |

---

## Scoring Criteria

AI validators evaluate each submission on four dimensions:

1. **Correctness** (does it actually solve the challenge?)
2. **Quality** (elegance, clarity, efficiency)
3. **Creativity** (novel approach or unexpected solution)
4. **Completeness** (edge cases handled, thorough)

Each dimension contributes to a final score of 1-10.

---

## Consensus Model

| Field | Rule |
|-------|------|
| Winner (1 or 2) | Must match exactly |
| Score 1 | Within ±2 tolerance |
| Score 2 | Within ±2 tolerance |

Multiple AI models judge independently. If they disagree on who won, the transaction retries with different validators until consensus is reached.

---

## Why GenLayer?

Judging code quality, writing skill, or creative solutions is inherently subjective. A function can be "correct" in many ways — but which is more elegant? Which explanation is clearer? Traditional smart contracts can't evaluate text. GenLayer's AI validators can, and they must agree.

---

## Deployed Contract

```
Network:  GenLayer Studionet
Address:  0xB95f58bcb95A7807FB462923c8aD23804C0C1608
Status:   MAJORITY AGREE ✓
```

---

## Project Structure

```
skillduel-genlayer/
├── contracts/
│   └── skill_duel.py          # Intelligent Contract (166 lines)
├── frontend/
│   ├── src/app/
│   │   ├── layout.tsx
│   │   └── page.tsx           # Duel UI
│   ├── src/lib/genlayer.ts
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
└── README.md
```

---

## Quick Start

```bash
# Install
npm install -g genlayer

# Deploy (or use deployed address above)
genlayer network set studionet
genlayer account create --name duelist --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/skill_duel.py

# Frontend
cd frontend
npm install
echo "NEXT_PUBLIC_CONTRACT_ADDRESS=0xB95f58bcb95A7807FB462923c8aD23804C0C1608" > .env.local
npm run dev
```

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `create_duel(category, prompt)` | payable | Create challenge + stake |
| `accept_duel(duel_id)` | payable | Accept + match stake |
| `submit_answer(duel_id, answer)` | write | Submit your solution |
| `judge_duel(duel_id)` | write (AI) | Trigger AI scoring |
| `cancel_duel(duel_id)` | write | Cancel open duel, refund |
| `get_duel(duel_id)` | view | Get duel details |
| `get_duel_count()` | view | Total duels created |

---

## Example Flow

```bash
# Player A creates a coding duel (stakes 10 GEN)
genlayer write --contract 0xB95f58... create_duel "Coding" "Write a function that checks if a string is a valid IPv4 address" --fee-value 10000000000000000000

# Player B accepts (stakes 10 GEN)
genlayer write --contract 0xB95f58... accept_duel "1" --fee-value 10000000000000000000

# Player A submits
genlayer write --contract 0xB95f58... submit_answer "1" "def is_valid_ipv4(s): parts = s.split('.'); return len(parts)==4 and all(p.isdigit() and 0<=int(p)<=255 for p in parts)"

# Player B submits
genlayer write --contract 0xB95f58... submit_answer "1" "import re; is_valid_ipv4 = lambda s: bool(re.match(r'^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$', s))"

# Judge
genlayer write --contract 0xB95f58... judge_duel "1"
# → AI scores both, winner gets 20 GEN
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Contract | Python (GenLayer Intelligent Contract) |
| AI Consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js + TypeScript |
| SDK | GenLayerJS |

---

## License

MIT
