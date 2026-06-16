"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Duel = { id: string; creator: string; challenger: string; category: string; prompt: string; submission1: string; submission2: string; stake1: string; stake2: string; status: number; winner: string; judgment: string; };
const STATUS = ["OPEN", "MATCHED", "FIGHT!", "K.O."];
const SCOLOR = ["#fbbf24", "#22d3ee", "#f97316", "#ec4899"];
const fighter = (s: string) => `hsl(${parseInt((s || "0x0").slice(2, 8), 16) % 360},85%,60%)`;

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Duel | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ category: "Coding", prompt: "", stake: "" });
  const [answer, setAnswer] = useState("");
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel_count", args: [] }));
      const out: Duel[] = [];
      for (let i = 1; i <= count; i++) { const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel", args: [String(i)] }); out.push(JSON.parse(raw as string)); }
      setDuels(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function handleConnect() { setTx("INSERT COIN…"); try { const w = await connectWallet(); setWallet(w); setTx(""); } catch (e: any) { setTx(e.message); } }
  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ PRESS START TO CONNECT"); return; }
    setLoading(true); setTx(`${fn}…`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx(""); await load(); setSelected(null); setShowCreate(false);
    } catch (e: any) { setTx(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#120016", color: "#fff", fontFamily: "'Trebuchet MS',system-ui,sans-serif", backgroundImage: "repeating-linear-gradient(0deg,#1a0020,#1a0020 2px,transparent 2px,transparent 4px)" }}>
      {/* arcade marquee header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderBottom: "2px solid #ff00aa", boxShadow: "0 4px 20px rgba(255,0,170,0.4)" }}>
        <span style={{ fontWeight: 900, fontSize: 24, fontStyle: "italic", letterSpacing: -1, color: "#ffe600", textShadow: "2px 2px 0 #ff00aa" }}>SKILL✦DUEL</span>
        {wallet.address ? (
          <span style={{ fontSize: 13, color: "#ffe600", fontFamily: "monospace" }}>P1 ◈ {shortAddr(wallet.address)}</span>
        ) : (
          <button onClick={handleConnect} style={{ background: "#ffe600", color: "#120016", border: "3px solid #fff", borderRadius: 4, padding: "8px 18px", cursor: "pointer", fontWeight: 900, fontStyle: "italic", letterSpacing: 1, boxShadow: "0 0 16px #ffe600", animation: "pulse 1.4s infinite" }}>▶ PRESS START</button>
        )}
      </div>

      {tx && <div style={{ textAlign: "center", color: "#ffe600", fontFamily: "monospace", padding: 10, letterSpacing: 1 }}>{tx}</div>}

      {!selected && (
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 22px 80px" }}>
          {/* About + how it works */}
          <div style={{ background: "#1c0024", border: "2px solid #ff00aa", borderRadius: 12, padding: "20px 22px", margin: "10px 0 22px", boxShadow: "0 0 18px rgba(255,0,170,0.25)" }}>
            <div style={{ fontStyle: "italic", color: "#ffe600", fontWeight: 900, fontSize: 18 }}>⚔ What is SkillDuel?</div>
            <p style={{ color: "#e0c0f0", margin: "8px 0 16px", fontSize: 14, lineHeight: 1.6 }}>
              SkillDuel is a 1v1 challenge arena. Pick a category — coding, writing, math, design — stake GEN, and a rival accepts with a matching stake. Both solve the same prompt, then GenLayer's AI validators score the answers and the winner takes the whole pot.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
              {[["1", "Connect your wallet"], ["2", "Create a duel or accept one (stake GEN)"], ["3", "Both fighters submit their answers"], ["4", "AI judges — winner takes the pot"]].map(([n, t]) => (
                <div key={n} style={{ background: "#2a0033", borderRadius: 8, padding: "10px 12px" }}>
                  <span style={{ color: "#ffe600", fontWeight: 900, fontStyle: "italic" }}>STEP {n}</span>
                  <div style={{ color: "#e0c0f0", fontSize: 13, marginTop: 4 }}>{t}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "center", margin: "10px 0 24px" }}>
            <button onClick={() => setShowCreate(true)} style={{ background: "linear-gradient(90deg,#ff00aa,#ffe600)", color: "#120016", border: "3px solid #fff", borderRadius: 6, padding: "12px 28px", cursor: "pointer", fontWeight: 900, fontStyle: "italic", fontSize: 16, letterSpacing: 1 }}>+ NEW CHALLENGER</button>
          </div>
          {/* roster grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 16 }}>
            {duels.length === 0 && <p style={{ color: "#a855c7", fontFamily: "monospace", gridColumn: "1/-1", textAlign: "center" }}>// no fighters in the arena</p>}
            {duels.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer", background: "#1c0024", border: "2px solid #ff00aa", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 14px rgba(255,0,170,0.3)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "#2a0033" }}>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#ffe600" }}>[{d.category}]</span>
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: SCOLOR[d.status] }}>{STATUS[d.status]}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "18px 12px" }}>
                  <span style={{ width: 50, height: 50, borderRadius: 8, background: fighter(d.creator), border: "2px solid #fff" }} />
                  <span style={{ fontWeight: 900, fontStyle: "italic", color: "#fff" }}>VS</span>
                  <span style={{ width: 50, height: 50, borderRadius: 8, background: d.challenger ? fighter(d.challenger) : "#3a2244", border: "2px dashed #6a4a7a", display: "grid", placeItems: "center", color: "#6a4a7a", fontSize: 22 }}>{d.challenger ? "" : "?"}</span>
                </div>
                <div style={{ padding: "0 12px 14px", textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "#e0c0f0", minHeight: 34 }}>{d.prompt.slice(0, 50)}{d.prompt.length > 50 ? "…" : ""}</div>
                  <div style={{ color: "#ffe600", fontFamily: "monospace", fontSize: 13, marginTop: 6 }}>◈ {(Number(BigInt(d.stake1)) / 1e18).toFixed(0)} GEN</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VS matchup screen */}
      {selected && (
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "20px 22px 80px" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#ff00aa", cursor: "pointer", fontFamily: "monospace", marginBottom: 8 }}>← ROSTER</button>
          <div style={{ textAlign: "center", fontFamily: "monospace", color: "#ffe600", letterSpacing: 2 }}>[{selected.category}] · {STATUS[selected.status]}</div>
          {/* big VS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, margin: "18px 0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 90, height: 90, borderRadius: 14, background: fighter(selected.creator), border: `3px solid ${selected.winner === selected.creator ? "#22c55e" : "#fff"}`, margin: "0 auto" }} />
              <div style={{ fontWeight: 900, marginTop: 8, color: "#22d3ee" }}>P1 {selected.winner === selected.creator && "👑"}</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#a855c7" }}>{shortAddr(selected.creator)}</div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 900, fontStyle: "italic", color: "#ff00aa", textShadow: "2px 2px 0 #ffe600" }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 90, height: 90, borderRadius: 14, background: selected.challenger ? fighter(selected.challenger) : "#3a2244", border: `3px solid ${selected.winner === selected.challenger ? "#22c55e" : "#fff"}`, margin: "0 auto", display: "grid", placeItems: "center", fontSize: 40, color: "#6a4a7a" }}>{selected.challenger ? "" : "?"}</div>
              <div style={{ fontWeight: 900, marginTop: 8, color: "#ec4899" }}>{selected.winner === selected.challenger && "👑 "}P2</div>
              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#a855c7" }}>{selected.challenger ? shortAddr(selected.challenger) : "OPEN SLOT"}</div>
            </div>
          </div>

          <div style={{ background: "#1c0024", border: "2px solid #ff00aa", borderRadius: 10, padding: 16, textAlign: "center" }}>
            <div style={{ fontFamily: "monospace", fontSize: 11, color: "#a855c7" }}>CHALLENGE</div>
            <div style={{ fontSize: 16, marginTop: 6 }}>{selected.prompt}</div>
          </div>

          {(selected.submission1 || selected.submission2) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
              <div style={{ background: "#10141c", border: "1px solid #22d3ee", borderRadius: 10, padding: 12 }}><b style={{ color: "#22d3ee" }}>P1</b><pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{selected.submission1 || "…"}</pre></div>
              <div style={{ background: "#1c1014", border: "1px solid #ec4899", borderRadius: 10, padding: 12 }}><b style={{ color: "#ec4899" }}>P2</b><pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#cbd5e1", marginTop: 6 }}>{selected.submission2 || "…"}</pre></div>
            </div>
          )}

          {selected.judgment && <div style={{ marginTop: 14, textAlign: "center", background: "#052e16", border: "2px solid #22c55e", borderRadius: 10, padding: 16 }}><b style={{ color: "#22c55e", fontStyle: "italic" }}>⚔ K.O. — VERDICT</b><br />{JSON.parse(selected.judgment).reasoning}</div>}

          <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10, maxWidth: 480, marginInline: "auto" }}>
            {selected.status === 0 && <button onClick={() => send("accept_duel", [selected.id], BigInt(selected.stake1))} disabled={loading} style={arcadeBtn}>⚔ ENTER THE RING & MATCH STAKE</button>}
            {(selected.status === 1 || selected.status === 2) && (<><textarea placeholder="Your answer…" value={answer} onChange={e => setAnswer(e.target.value)} rows={5} style={inp} /><button onClick={() => { send("submit_answer", [selected.id, answer]); setAnswer(""); }} disabled={loading || !answer} style={arcadeBtn}>📝 SUBMIT</button></>)}
            {selected.status === 2 && <button onClick={() => send("judge_duel", [selected.id])} disabled={loading} style={{ ...arcadeBtn, background: "linear-gradient(90deg,#f97316,#ec4899)" }}>⚖ FIGHT! (AI JUDGE)</button>}
          </div>
        </div>
      )}

      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{ position: "fixed", inset: 0, background: "rgba(18,0,22,0.9)", display: "grid", placeItems: "center", padding: 20 }}>
          <form onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); send("create_duel", [form.category, form.prompt], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={{ background: "#1c0024", border: "2px solid #ff00aa", borderRadius: 12, padding: 26, maxWidth: 460, width: "100%" }}>
            <h2 style={{ marginTop: 0, textAlign: "center", color: "#ffe600", fontStyle: "italic" }}>NEW CHALLENGER</h2>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}><option>Coding</option><option>Writing</option><option>Design</option><option>Trivia</option><option>Math</option></select>
            <textarea placeholder="Challenge prompt…" value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required rows={3} style={inp} />
            <input placeholder="Stake (GEN)" type="number" min="1" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} />
            <button disabled={loading} style={arcadeBtn}>⚔ THROW DOWN</button>
          </form>
        </div>
      )}
      <style>{`body{margin:0}@keyframes pulse{50%{opacity:0.6}}`}</style>
    </div>
  );
}

const inp: React.CSSProperties = { padding: 11, borderRadius: 6, border: "2px solid #4a2a5a", background: "#120016", color: "#fff", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 10 };
const arcadeBtn: React.CSSProperties = { padding: "12px 20px", borderRadius: 6, border: "2px solid #fff", background: "linear-gradient(90deg,#ff00aa,#ffe600)", color: "#120016", fontSize: 14, cursor: "pointer", fontWeight: 900, fontStyle: "italic", letterSpacing: 1 };
