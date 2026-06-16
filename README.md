# 🎯 SkillDuel

**Same challenge. Two players. AI picks the winner. Loser pays.**

🔗 **Live app:** https://skillduel.pages.dev
📜 **Contract (GenLayer Studionet):** `0xB95f58bcb95A7807FB462923c8aD23804C0C1608`

---

## The Problem

Online skill competitions either have no stakes (boring) or rely on a centralized judge (biased, slow). Coding contests take weeks for results, writing competitions are subjective with no accountability, and there's no instant, fair, money-on-the-line way to prove you're better than someone at a skill.

SkillDuel makes it instant, fair, and profitable: same challenge, same rules, judged by decentralized AI consensus — no human referee.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet — no Snap required)
2. **Create a duel** — pick a category, write a challenge prompt, stake GEN. Or **accept** an open duel and match its stake.
3. **Both players submit** their answers independently.
4. **AI judges** — multiple GenLayer validators score both submissions on correctness, quality, creativity, and completeness. The higher score wins the entire prize pool.

---

## Categories

| Category | Example challenge |
|----------|-------------------|
| Coding | "Write a function that finds the longest palindromic substring" |
| Writing | "Write a compelling product description for a smart water bottle" |
| Design | "Describe a UI layout for a meditation app's home screen" |
| Math | "Prove that the sum of the first n odd numbers equals n²" |
| Trivia | "Explain the TCP three-way handshake in plain English" |

---

## Why GenLayer?

Judging code quality or creative writing is inherently subjective — a normal smart contract can't read a solution and decide which is more elegant. GenLayer's validators run LLMs and reach **consensus** on subjective outcomes. Both leader and validators score independently; the winner must match and scores must land within ±2 for the result to finalize, so no single model can swing a match.

---

## Wallet & Network

The app connects a standard EVM wallet and signs transactions through the normal wallet popup — **no GenLayer Snap install**. On connect, it adds/switches your wallet to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `create_duel(category, prompt)` | payable | Create a challenge and stake GEN |
| `accept_duel(duel_id)` | payable | Accept and match the stake |
| `submit_answer(duel_id, answer)` | write | Submit your solution |
| `judge_duel(duel_id)` | write (AI) | Trigger AI scoring & payout |
| `cancel_duel(duel_id)` | write | Cancel an open duel and refund |
| `get_duel(duel_id)` | view | Get a duel's full state |
| `get_duel_count()` | view | Total duels created |

**Consensus rule:** winner must match exactly; `score1` and `score2` within ±2 across validators.

---

## Project Structure

```
skillduel-genlayer/
├── contracts/
│   └── skill_duel.py        # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # Fighting-game VS roster UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js       # Static export config
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
# 1. Install the GenLayer CLI (for deploying your own copy)
npm install -g genlayer
genlayer network set studionet

# 2. Deploy the contract (or use the address above)
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/skill_duel.py

# 3. Frontend
cd frontend
npm install
npm run dev          # local dev
npm run build        # static export → ./out (deploy to any static host)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| AI consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## License

MIT
