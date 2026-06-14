"use client";
import { useState, useEffect, useCallback } from "react";
import {
  CONTRACT_ADDRESS,
  connectWallet,
  readClient,
  hasWallet,
  shortAddr,
  type WalletState,
} from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Duel = {
  id: string; creator: string; challenger: string; category: string; prompt: string;
  submission1: string; submission2: string; stake1: string; stake2: string;
  status: number; winner: string; judgment: string;
};

const STATUS = ["OPEN", "MATCHED", "LOCKED IN", "JUDGED"];
const SCOLOR = ["#39ff14", "#00e5ff", "#ff9f1c", "#bf5af2"];

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Duel | null>(null);
  const [form, setForm] = useState({ category: "Coding", prompt: "", stake: "" });
  const [answer, setAnswer] = useState("");
  const [tx, setTx] = useState("");

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel_count", args: [] }));
      const loaded: Duel[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_duel", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setDuels(loaded.reverse());
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleConnect() {
    setTx("Connecting wallet...");
    try {
      const w = await connectWallet();
      setWallet(w);
      setTx(`Connected: ${shortAddr(w.address!)}`);
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("⚠ Connect your wallet first"); return; }
    setLoading(true); setTx(`⚡ ${fn}...`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("✓ Confirmed!"); await load(); setSelected(null);
    } catch (e: any) { setTx(`⚠ ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(ellipse at top, #1a0b2e 0%, #0a0a0f 60%)", color: "#e8e8f0" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 900, letterSpacing: -1, background: "linear-gradient(90deg,#39ff14,#00e5ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            ⚔ SKILLDUEL
          </h1>
          {wallet.address ? (
            <div style={{ ...pill, borderColor: "#39ff14", color: "#39ff14" }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={neonBtn}>Connect Wallet</button>
          )}
        </div>
        <p style={{ color: "#8a8aa0", marginTop: 0, fontFamily: "monospace", fontSize: 13 }}>
          {">"} 1v1 challenges · stake GEN · AI judges the winner · loser pays
        </p>

        {tx && <div style={statusBar}>{tx}</div>}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, margin: "20px 0" }}>
          <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>◆ ARENA</button>
          <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>+ NEW DUEL</button>
        </div>

        {tab === "create" && (
          <form onSubmit={e => { e.preventDefault(); send("create_duel", [form.category, form.prompt], BigInt(form.stake || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>CATEGORY</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
              <option>Coding</option><option>Writing</option><option>Design</option><option>Trivia</option><option>Math</option>
            </select>
            <label style={lbl}>CHALLENGE PROMPT</label>
            <textarea placeholder="Write a function that reverses a linked list..." value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })} required rows={3} style={inp} />
            <label style={lbl}>STAKE (GEN)</label>
            <input type="number" min="1" placeholder="10" value={form.stake} onChange={e => setForm({ ...form, stake: e.target.value })} required style={inp} />
            <button type="submit" disabled={loading} style={{ ...neonBtn, marginTop: 14, width: "100%" }}>⚔ THROW DOWN</button>
          </form>
        )}

        {tab === "browse" && !selected && (
          <div style={{ display: "grid", gap: 12 }}>
            {duels.length === 0 && <p style={{ color: "#6a6a80", fontFamily: "monospace" }}>{">"} no duels in the arena yet. start one.</p>}
            {duels.map(d => (
              <div key={d.id} onClick={() => setSelected(d)} style={{ ...card, cursor: "pointer", padding: 16, transition: "transform .1s", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontFamily: "monospace", color: "#00e5ff", fontSize: 12 }}>[{d.category}]</span>
                  <div style={{ marginTop: 4 }}>{d.prompt.slice(0, 56)}{d.prompt.length > 56 ? "…" : ""}</div>
                  <div style={{ color: "#39ff14", fontFamily: "monospace", fontSize: 13, marginTop: 4 }}>◈ {(Number(BigInt(d.stake1)) / 1e18).toFixed(0)} GEN</div>
                </div>
                <span style={{ ...pill, borderColor: SCOLOR[d.status], color: SCOLOR[d.status] }}>{STATUS[d.status]}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "browse" && selected && (
          <div style={card}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#00e5ff", cursor: "pointer", fontFamily: "monospace" }}>← back to arena</button>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <h3 style={{ margin: 0 }}><span style={{ color: "#00e5ff" }}>[{selected.category}]</span> Duel #{selected.id}</h3>
              <span style={{ ...pill, borderColor: SCOLOR[selected.status], color: SCOLOR[selected.status] }}>{STATUS[selected.status]}</span>
            </div>
            <div style={{ background: "#0d0d1a", border: "1px solid #2a2a40", padding: 16, borderRadius: 10, marginTop: 14, fontFamily: "monospace", fontSize: 14 }}>
              <span style={{ color: "#6a6a80" }}>{">"} CHALLENGE</span><br />{selected.prompt}
            </div>

            {(selected.submission1 || selected.submission2) && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                <div style={{ background: selected.winner === selected.creator ? "#0d2818" : "#12121f", border: `1px solid ${selected.winner === selected.creator ? "#39ff14" : "#2a2a40"}`, padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: "#00e5ff" }}>PLAYER A</strong> {selected.winner === selected.creator && "👑"}
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8, color: "#c0c0d0" }}>{selected.submission1 || "…waiting"}</pre>
                </div>
                <div style={{ background: selected.winner === selected.challenger ? "#0d2818" : "#12121f", border: `1px solid ${selected.winner === selected.challenger ? "#39ff14" : "#2a2a40"}`, padding: 12, borderRadius: 10 }}>
                  <strong style={{ color: "#ff2e97" }}>PLAYER B</strong> {selected.winner === selected.challenger && "👑"}
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8, color: "#c0c0d0" }}>{selected.submission2 || "…waiting"}</pre>
                </div>
              </div>
            )}

            {selected.judgment && (
              <div style={{ marginTop: 14, background: "#0d2818", border: "1px solid #39ff14", padding: 14, borderRadius: 10 }}>
                <strong style={{ color: "#39ff14" }}>⚖ VERDICT</strong><br />{JSON.parse(selected.judgment).reasoning}
              </div>
            )}

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {selected.status === 0 && <button onClick={() => send("accept_duel", [selected.id], BigInt(selected.stake1))} disabled={loading} style={neonBtn}>⚔ ACCEPT & MATCH STAKE</button>}
              {(selected.status === 1 || selected.status === 2) && (
                <>
                  <textarea placeholder="Your answer..." value={answer} onChange={e => setAnswer(e.target.value)} rows={5} style={{ ...inp, fontFamily: "monospace" }} />
                  <button onClick={() => { send("submit_answer", [selected.id, answer]); setAnswer(""); }} disabled={loading || !answer} style={neonBtn}>📝 SUBMIT ANSWER</button>
                </>
              )}
              {selected.status === 2 && <button onClick={() => send("judge_duel", [selected.id])} disabled={loading} style={{ ...neonBtn, background: "linear-gradient(90deg,#ff9f1c,#ff2e97)", color: "#0a0a0f" }}>⚖ JUDGE DUEL</button>}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 60, textAlign: "center", color: "#4a4a60", fontFamily: "monospace", fontSize: 11 }}>
          powered by GenLayer · AI consensus · contract {shortAddr(CONTRACT_ADDRESS)}
        </footer>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: "rgba(20,20,35,0.7)", backdropFilter: "blur(10px)", border: "1px solid #2a2a40", borderRadius: 14, padding: 20 };
const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #2a2a40", background: "#0d0d1a", color: "#e8e8f0", fontSize: 14, width: "100%", boxSizing: "border-box", marginBottom: 6 };
const lbl: React.CSSProperties = { fontFamily: "monospace", fontSize: 11, color: "#6a6a80", letterSpacing: 1, marginTop: 8, display: "block" };
const neonBtn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "linear-gradient(90deg,#39ff14,#00e5ff)", color: "#0a0a0f", fontSize: 14, cursor: "pointer", fontWeight: 800, letterSpacing: 0.5 };
const pill: React.CSSProperties = { padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: "monospace", border: "1px solid", background: "rgba(0,0,0,0.3)" };
const statusBar: React.CSSProperties = { background: "rgba(0,229,255,0.08)", border: "1px solid #00e5ff44", padding: 12, borderRadius: 8, fontSize: 13, fontFamily: "monospace", marginTop: 12 };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 20px", background: a ? "linear-gradient(90deg,#39ff14,#00e5ff)" : "transparent", border: a ? "none" : "1px solid #2a2a40", borderRadius: 8, color: a ? "#0a0a0f" : "#8a8aa0", cursor: "pointer", fontWeight: 700, fontFamily: "monospace" });
