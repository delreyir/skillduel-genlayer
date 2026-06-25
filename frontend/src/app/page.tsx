"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { CONTRACT_ADDRESS, connectWallet, disconnectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Duel = { id: string; creator: string; challenger: string; category: string; prompt: string; submission1: string; submission2: string; stake1: string; stake2: string; status: number; winner: string; judgment: string; };

const STATUS = ["Open", "Matched", "In Progress", "Completed"];
const SCOLOR = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6"];
const CAT_ICON: Record<string, string> = { Coding: "⌨", Writing: "✍", Design: "◆", Math: "∑", Trivia: "?" };
const avatarColor = (s: string) => `hsl(${parseInt((s || "0x0").slice(2, 8), 16) % 360},65%,55%)`;
const gen = (wei: string) => (Number(BigInt(wei || "0")) / 1e18).toFixed(0);

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Duel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ category: "Coding", prompt: "", stake: "" });
  const [answer, setAnswer] = useState("");
  const [tx, setTx] = useState("");
  const [walletOpen, setWalletOpen] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (walletRef.current && !walletRef.current.contains(e.target as Node)) setWalletOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel_count", args: [] }));
      const out: Duel[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setDuels(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting…");
    try { const w = await connectWallet(); setWallet(w); setTx(""); setWalletOpen(false); }
    catch (e: any) { setTx(e.message); }
  }
  function handleDisconnect() {
    setWallet(disconnectWallet()); setWalletOpen(false); setTx("");
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx("Submitting transaction…");
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      setTx("Waiting for AI consensus…");
      const receipt = await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      if (receipt && (receipt as any).status === TransactionStatus.CANCELED) {
        setTx("⚠ Draw — the AI judges disagreed on the scores. No winner declared. Please try again.");
        setLoading(false); return;
      }
      setTx("✓ Done!"); await load();
      setTimeout(() => setTx(""), 2500);
      setSelected(null); setShowCreate(false);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (/consensus|abort|canceled|timeout/i.test(msg)) {
        setTx("⚠ The AI panel could not reach consensus. Validators disagreed on the scores. Please retry the judgment.");
      } else if (/insufficient funds/i.test(msg)) {
        setTx("⚠ Insufficient GEN balance. Get tokens from the faucet.");
      } else if (/user rejected|rejected/i.test(msg)) {
        setTx("Transaction rejected.");
      } else { setTx(`Error: ${msg.slice(0, 100)}`); }
    }
    setLoading(false);
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo" onClick={() => setSelected(null)}>
            <span className="logo-mark">⚔</span>
            <span className="logo-text">SkillDuel</span>
          </div>
          <div className="nav-right" ref={walletRef}>
            {wallet.address ? (
              <div className="wallet-wrap">
                <button className="wallet-btn connected" onClick={() => setWalletOpen(!walletOpen)}>
                  <span className="wallet-dot" />{shortAddr(wallet.address)}
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
                {walletOpen && (
                  <div className="wallet-dropdown">
                    <div className="wd-addr">{wallet.address}</div>
                    <div className="wd-net">GenLayer Studionet</div>
                    <button className="wd-disconnect" onClick={handleDisconnect}>Disconnect</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="wallet-btn" onClick={handleConnect}>Connect Wallet</button>
            )}
          </div>
        </div>
      </nav>

      {tx && <div className="toast">{tx}</div>}

      {!selected && (
        <>
          <header className="hero">
            <div className="hero-badge">Powered by GenLayer AI Consensus</div>
            <h1 className="hero-title">Prove Your Skill.<br/>Winner Takes the Pot.</h1>
            <p className="hero-desc">
              1v1 skill challenges judged by decentralized AI. Same prompt, two players, GEN on the line. Multiple validators score both answers — the higher score wins the entire stake. No human referee, no bias.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => setShowCreate(true)}>Create a Duel</button>
              <a href="https://testnet-faucet.genlayer.foundation/" target="_blank" rel="noopener" className="btn-secondary">Get GEN Tokens</a>
            </div>
            <div className="hero-stats">
              <div className="stat"><span className="stat-num">{duels.length}</span><span className="stat-label">Total Duels</span></div>
              <div className="stat"><span className="stat-num">{duels.filter(d => d.status === 0).length}</span><span className="stat-label">Open</span></div>
              <div className="stat"><span className="stat-num">{duels.filter(d => d.status === 3).length}</span><span className="stat-label">Completed</span></div>
            </div>
          </header>

          <main className="main">
            <div className="section-head">
              <h2 className="section-title">Arena</h2>
              <button className="btn-ghost" onClick={() => setShowCreate(true)}>+ New Duel</button>
            </div>
            {duels.length === 0 && <p className="empty">No duels yet. Create the first challenge.</p>}
            <div className="grid">
              {duels.map(d => (
                <div key={d.id} className="card" onClick={() => setSelected(d)}>
                  <div className="card-top">
                    <span className="cat"><span className="cat-icon">{CAT_ICON[d.category] || "◆"}</span>{d.category}</span>
                    <span className="status" style={{ color: SCOLOR[d.status], background: `${SCOLOR[d.status]}18` }}>{STATUS[d.status]}</span>
                  </div>
                  <div className="vs-row">
                    <div className="avatar" style={{ background: avatarColor(d.creator) }} />
                    <span className="vs">VS</span>
                    <div className="avatar" style={{ background: d.challenger ? avatarColor(d.challenger) : "transparent", border: d.challenger ? "none" : "2px dashed #334155" }}>{!d.challenger && <span className="q">?</span>}</div>
                  </div>
                  <p className="prompt">{d.prompt.slice(0, 60)}{d.prompt.length > 60 ? "…" : ""}</p>
                  <div className="pot">💰 {gen(d.stake1)} GEN</div>
                </div>
              ))}
            </div>
          </main>
        </>
      )}

      {selected && (
        <main className="main detail">
          <button className="back" onClick={() => setSelected(null)}>← Back to Arena</button>
          <div className="detail-head">
            <span className="cat"><span className="cat-icon">{CAT_ICON[selected.category] || "◆"}</span>{selected.category}</span>
            <span className="status" style={{ color: SCOLOR[selected.status], background: `${SCOLOR[selected.status]}18` }}>{STATUS[selected.status]}</span>
          </div>

          <div className="matchup">
            <div className="player">
              <div className="avatar lg" style={{ background: avatarColor(selected.creator), borderColor: selected.winner === selected.creator ? "#10b981" : "transparent" }} />
              <div className="player-label">Player 1 {selected.winner === selected.creator && "👑"}</div>
              <div className="player-addr">{shortAddr(selected.creator)}</div>
            </div>
            <div className="vs-big">VS</div>
            <div className="player">
              <div className="avatar lg" style={{ background: selected.challenger ? avatarColor(selected.challenger) : "transparent", borderColor: selected.winner === selected.challenger ? "#10b981" : selected.challenger ? "transparent" : "#334155", borderStyle: selected.challenger ? "solid" : "dashed" }}>{!selected.challenger && <span className="q lg">?</span>}</div>
              <div className="player-label">{selected.winner === selected.challenger && "👑 "}Player 2</div>
              <div className="player-addr">{selected.challenger ? shortAddr(selected.challenger) : "Open slot"}</div>
            </div>
          </div>

          <div className="challenge-box">
            <div className="cb-label">Challenge</div>
            <div className="cb-text">{selected.prompt}</div>
            <div className="cb-pot">Prize pool: {gen(String(BigInt(selected.stake1 || "0") + BigInt(selected.stake2 || "0")))} GEN</div>
          </div>

          {(selected.submission1 || selected.submission2) && (
            <div className="subs">
              <div className="sub">
                <div className="sub-head p1">Player 1</div>
                <pre className="sub-body">{selected.submission1 || "Not submitted yet"}</pre>
              </div>
              <div className="sub">
                <div className="sub-head p2">Player 2</div>
                <pre className="sub-body">{selected.submission2 || "Not submitted yet"}</pre>
              </div>
            </div>
          )}

          {selected.judgment && (
            <div className="verdict">
              <div className="verdict-head">⚖ AI Verdict</div>
              <div className="verdict-scores">
                <span>P1: {JSON.parse(selected.judgment).score1}/10</span>
                <span>P2: {JSON.parse(selected.judgment).score2}/10</span>
              </div>
              <p className="verdict-reason">{JSON.parse(selected.judgment).reasoning}</p>
            </div>
          )}

          <div className="actions">
            {selected.status === 0 && <button onClick={() => send("accept_duel", [selected.id], BigInt(selected.stake1))} disabled={loading} className="btn-primary full">⚔ Accept Challenge & Match Stake</button>}
            {(selected.status === 1 || selected.status === 2) && (
              <>
                <textarea placeholder="Write your answer…" value={answer} onChange={e => setAnswer(e.target.value)} rows={6} className="textarea" />
                <button onClick={() => { send("submit_answer", [selected.id, answer]); setAnswer(""); }} disabled={loading || !answer} className="btn-primary full">Submit Answer</button>
              </>
            )}
            {selected.status === 2 && <button onClick={() => send("judge_duel", [selected.id])} disabled={loading} className="btn-judge full">⚖ Trigger AI Judgment</button>}
          </div>
        </main>
      )}

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <form className="modal" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); send("create_duel", [form.category, form.prompt], BigInt(form.stake || "0") * BigInt(10 ** 18)); }}>
            <div className="modal-head">
              <h2>Create a Duel</h2>
              <button type="button" className="modal-close" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <p className="modal-desc">Set a challenge, stake your GEN, and wait for a challenger to match it.</p>
            <div className="field">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option>Coding</option><option>Writing</option><option>Design</option><option>Math</option><option>Trivia</option>
              </select>
            </div>
            <div className="field">
              <label>Challenge Prompt</label>
              <textarea placeholder="e.g. Write a function that reverses a linked list" value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required rows={3} />
            </div>
            <div className="field">
              <label>Stake (GEN)</label>
              <input type="number" min="1" placeholder="10" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary full">{loading ? "Creating…" : "Create Duel"}</button>
          </form>
        </div>
      )}

      <footer className="footer">
        <span>Built on <a href="https://docs.genlayer.com" target="_blank" rel="noopener">GenLayer</a></span>
        <span>·</span>
        <span>AI Consensus Judging</span>
        <span>·</span>
        <a href="https://github.com/delreyir/skillduel-genlayer" target="_blank" rel="noopener">GitHub</a>
      </footer>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0f1a; color: #e2e8f0; font-family: 'Inter', -apple-system, sans-serif; }
a { color: #6366f1; text-decoration: none; }
a:hover { text-decoration: underline; }
.app { min-height: 100vh; display: flex; flex-direction: column; }

/* Nav */
.nav { position: sticky; top: 0; z-index: 50; background: rgba(10,15,26,0.9); backdrop-filter: blur(12px); border-bottom: 1px solid #1e293b; }
.nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; height: 64px; display: flex; align-items: center; justify-content: space-between; }
.logo { display: flex; align-items: center; gap: 10px; cursor: pointer; }
.logo-mark { font-size: 22px; color: #6366f1; }
.logo-text { font-size: 19px; font-weight: 700; color: #f1f5f9; letter-spacing: -0.5px; }

/* Wallet */
.nav-right { position: relative; }
.wallet-wrap { position: relative; }
.wallet-btn { background: #6366f1; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.wallet-btn:hover { background: #4f46e5; transform: translateY(-1px); }
.wallet-btn.connected { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; display: flex; align-items: center; gap: 8px; }
.wallet-btn.connected:hover { border-color: #475569; }
.wallet-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; }
.wallet-dropdown { position: absolute; top: calc(100% + 8px); right: 0; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 16px; width: 280px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
.wd-addr { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8; word-break: break-all; margin-bottom: 8px; }
.wd-net { font-size: 12px; color: #6366f1; margin-bottom: 12px; padding: 4px 8px; background: #6366f118; border-radius: 4px; display: inline-block; }
.wd-disconnect { width: 100%; background: #ef444420; color: #ef4444; border: 1px solid #ef444440; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.wd-disconnect:hover { background: #ef444430; }

/* Toast */
.toast { text-align: center; padding: 12px 20px; margin: 12px auto 0; max-width: 700px; font-size: 14px; color: #fbbf24; background: #78350f20; border: 1px solid #78350f40; border-radius: 8px; }

/* Hero */
.hero { text-align: center; padding: 72px 24px 56px; max-width: 760px; margin: 0 auto; }
.hero-badge { display: inline-block; padding: 6px 14px; background: #6366f118; border: 1px solid #6366f130; border-radius: 20px; font-size: 12px; font-weight: 500; color: #818cf8; margin-bottom: 24px; }
.hero-title { font-size: clamp(34px, 5vw, 54px); font-weight: 800; line-height: 1.1; letter-spacing: -1.5px; background: linear-gradient(135deg, #f1f5f9, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 20px; }
.hero-desc { font-size: 16px; color: #94a3b8; line-height: 1.7; max-width: 580px; margin: 0 auto 32px; }
.hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 48px; }
.hero-stats { display: flex; justify-content: center; gap: 48px; }
.stat { display: flex; flex-direction: column; align-items: center; }
.stat-num { font-size: 28px; font-weight: 700; color: #f1f5f9; }
.stat-label { font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }

/* Buttons */
.btn-primary { background: #6366f1; color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary:hover { background: #4f46e5; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.35); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.btn-primary.full { width: 100%; }
.btn-secondary { padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 500; border: 1px solid #334155; color: #e2e8f0; transition: all 0.2s; display: inline-block; }
.btn-secondary:hover { border-color: #475569; background: #1e293b; text-decoration: none; }
.btn-ghost { background: #1e293b; color: #e2e8f0; border: 1px solid #334155; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.btn-ghost:hover { border-color: #6366f1; color: #818cf8; }
.btn-judge { background: linear-gradient(90deg, #f59e0b, #ef4444); color: #fff; border: none; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-judge:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245,158,11,0.35); }
.btn-judge:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-judge.full { width: 100%; }

/* Main */
.main { flex: 1; max-width: 1100px; margin: 0 auto; padding: 24px 24px 80px; width: 100%; }
.section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.section-title { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
.empty { color: #64748b; text-align: center; padding: 40px; }

/* Cards */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.card { background: #111827; border: 1px solid #1e293b; border-radius: 14px; padding: 18px; cursor: pointer; transition: all 0.2s; }
.card:hover { border-color: #6366f150; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.cat { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #cbd5e1; }
.cat-icon { color: #818cf8; }
.status { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.vs-row { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 8px 0 16px; }
.avatar { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; }
.avatar.lg { width: 88px; height: 88px; border-radius: 18px; border: 3px solid transparent; }
.q { color: #475569; font-size: 22px; font-weight: 700; }
.q.lg { font-size: 36px; }
.vs { font-weight: 800; font-style: italic; color: #6366f1; font-size: 15px; }
.prompt { font-size: 14px; color: #94a3b8; line-height: 1.5; min-height: 42px; text-align: center; }
.pot { text-align: center; margin-top: 12px; font-size: 14px; font-weight: 600; color: #fbbf24; }

/* Detail */
.detail { max-width: 760px; }
.back { background: none; border: none; color: #6366f1; cursor: pointer; font-size: 14px; margin-bottom: 16px; padding: 0; }
.back:hover { text-decoration: underline; }
.detail-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.matchup { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; margin-bottom: 28px; }
.player { text-align: center; }
.player .avatar { margin: 0 auto; }
.player-label { font-weight: 700; margin-top: 10px; color: #f1f5f9; }
.player-addr { font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #64748b; margin-top: 2px; }
.vs-big { font-size: 36px; font-weight: 800; font-style: italic; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.challenge-box { background: #111827; border: 1px solid #1e293b; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 16px; }
.cb-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; }
.cb-text { font-size: 17px; color: #f1f5f9; line-height: 1.5; }
.cb-pot { margin-top: 12px; font-size: 14px; font-weight: 600; color: #fbbf24; }

/* Submissions */
.subs { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
.sub { background: #111827; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
.sub-head { padding: 10px 14px; font-size: 13px; font-weight: 700; }
.sub-head.p1 { color: #3b82f6; background: #3b82f612; }
.sub-head.p2 { color: #ec4899; background: #ec489912; }
.sub-body { padding: 14px; font-size: 13px; color: #cbd5e1; white-space: pre-wrap; font-family: 'JetBrains Mono', monospace; line-height: 1.5; max-height: 240px; overflow-y: auto; }

/* Verdict */
.verdict { background: #052e1620; border: 1px solid #10b98140; border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 16px; }
.verdict-head { font-size: 14px; font-weight: 700; color: #10b981; margin-bottom: 12px; }
.verdict-scores { display: flex; justify-content: center; gap: 32px; font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 12px; }
.verdict-reason { font-size: 14px; color: #cbd5e1; line-height: 1.6; }

/* Actions */
.actions { display: flex; flex-direction: column; gap: 12px; max-width: 480px; margin: 0 auto; }
.textarea { width: 100%; padding: 12px 14px; background: #0a0f1a; border: 1px solid #334155; border-radius: 10px; color: #e2e8f0; font-size: 14px; font-family: inherit; resize: vertical; outline: none; transition: border-color 0.2s; }
.textarea:focus { border-color: #6366f1; }

/* Overlay & Modal */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 20px; z-index: 100; }
.modal { background: #111827; border: 1px solid #1e293b; border-radius: 16px; padding: 28px; max-width: 480px; width: 100%; }
.modal-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
.modal-head h2 { font-size: 20px; font-weight: 700; color: #f1f5f9; }
.modal-close { background: none; border: none; color: #64748b; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
.modal-close:hover { background: #1e293b; color: #e2e8f0; }
.modal-desc { font-size: 14px; color: #94a3b8; margin-bottom: 20px; }
.field { margin-bottom: 16px; }
.field label { display: block; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.field input, .field select, .field textarea { width: 100%; padding: 12px 14px; background: #0a0f1a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.field input:focus, .field select:focus, .field textarea:focus { border-color: #6366f1; }
.field textarea { resize: vertical; }

/* Footer */
.footer { border-top: 1px solid #1e293b; padding: 24px; display: flex; justify-content: center; gap: 12px; font-size: 13px; color: #64748b; flex-wrap: wrap; }

@media (max-width: 768px) {
  .hero { padding: 48px 16px 40px; }
  .hero-stats { gap: 24px; }
  .grid { grid-template-columns: 1fr; }
  .subs { grid-template-columns: 1fr; }
  .matchup { gap: 10px; }
  .avatar.lg { width: 64px; height: 64px; }
}
`;
