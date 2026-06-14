"use client";
import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Duel = { id: string; creator: string; challenger: string; category: string; prompt: string; submission1: string; submission2: string; stake1: string; stake2: string; status: number; winner: string; judgment: string; };

const STATUS = ["Open", "Matched", "Submissions In", "Judged"];
const COLORS = ["#4caf50", "#2196f3", "#ff9800", "#9c27b0"];

export default function Home() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Duel | null>(null);
  const [form, setForm] = useState({ category: "Coding", prompt: "", stake: "" });
  const [answer, setAnswer] = useState("");
  const [tx, setTx] = useState("");

  useEffect(() => { if (CONTRACT_ADDRESS) load(); }, []);

  async function load() {
    try {
      const count = Number(await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_duel_count", args: [] }));
      const loaded: Duel[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_duel", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setDuels(loaded);
    } catch (e) { console.error(e); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    setLoading(true); setTx(`${fn}...`);
    try {
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args, ...(value ? { value } : {}) });
      await client.waitForTransactionReceipt({ hash });
      setTx("✓ Done!"); await load(); setSelected(null);
    } catch (e: any) { setTx(`Error: ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>🎯 SkillDuel</h1>
      <p style={{ textAlign: "center", color: "#888" }}>1v1 challenges. Stake tokens. AI judges who's better.</p>

      {tx && <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{tx}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Duels</button>
        <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>Create Duel</button>
      </div>

      {tab === "create" && (
        <form onSubmit={e => { e.preventDefault(); send("create_duel", [form.category, form.prompt], BigInt(form.stake) * BigInt(10**18)); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} style={inp}>
            <option>Coding</option><option>Writing</option><option>Design</option><option>Trivia</option><option>Math</option>
          </select>
          <textarea placeholder="Challenge prompt (e.g. 'Write a function that reverses a linked list')" value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} required rows={3} style={inp} />
          <input placeholder="Stake (GEN)" type="number" min="1" value={form.stake} onChange={e => setForm({...form, stake: e.target.value})} required style={inp} />
          <button type="submit" disabled={loading} style={btn}>⚔️ Create Duel</button>
        </form>
      )}

      {tab === "browse" && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {duels.length === 0 && <p style={{ color: "#888" }}>No duels yet.</p>}
          {duels.map(d => (
            <div key={d.id} onClick={() => setSelected(d)} style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, cursor: "pointer", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span><strong>[{d.category}]</strong> {d.prompt.slice(0, 50)}{d.prompt.length > 50 ? "..." : ""}</span>
                <span style={{ background: COLORS[d.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[d.status]}</span>
              </div>
              <small style={{ color: "#aaa" }}>Stake: {(Number(BigInt(d.stake1)) / 1e18).toFixed(1)} GEN</small>
            </div>
          ))}
        </div>
      )}

      {tab === "browse" && selected && (
        <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6c5ce7", cursor: "pointer" }}>← Back</button>
          <h3>[{selected.category}] Duel #{selected.id}</h3>
          <span style={{ background: COLORS[selected.status], padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{STATUS[selected.status]}</span>
          <div style={{ background: "#0d0d1a", padding: 16, borderRadius: 8, marginTop: 16 }}>
            <strong>Challenge:</strong><br />{selected.prompt}
          </div>

          {(selected.submission1 || selected.submission2) && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div style={{ background: selected.winner === selected.creator ? "#1a2a1a" : "#12122a", padding: 12, borderRadius: 8 }}>
                <strong>Player A</strong> {selected.winner === selected.creator && "👑"}
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}>{selected.submission1 || "..."}</pre>
              </div>
              <div style={{ background: selected.winner === selected.challenger ? "#1a2a1a" : "#12122a", padding: 12, borderRadius: 8 }}>
                <strong>Player B</strong> {selected.winner === selected.challenger && "👑"}
                <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, marginTop: 8 }}>{selected.submission2 || "..."}</pre>
              </div>
            </div>
          )}

          {selected.judgment && (
            <div style={{ marginTop: 12, background: "#1a2a1a", padding: 12, borderRadius: 8 }}>
              <strong>⚖️ Verdict:</strong> {JSON.parse(selected.judgment).reasoning}
            </div>
          )}

          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {selected.status === 0 && (
              <button onClick={() => send("accept_duel", [selected.id], BigInt(Number(BigInt(selected.stake1))))} disabled={loading} style={btn}>⚔️ Accept & Match Stake</button>
            )}
            {(selected.status === 1 || selected.status === 2) && !selected.submission1 && (
              <>
                <textarea placeholder="Your answer..." value={answer} onChange={e => setAnswer(e.target.value)} rows={5} style={{ ...inp, fontFamily: "monospace" }} />
                <button onClick={() => { send("submit_answer", [selected.id, answer]); setAnswer(""); }} disabled={loading || !answer} style={btn}>📝 Submit Answer</button>
              </>
            )}
            {selected.status === 2 && (
              <button onClick={() => send("judge_duel", [selected.id])} disabled={loading} style={{ ...btn, background: "#ff9800" }}>⚖️ Judge Duel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 14 };
const btn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#6c5ce7", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: "bold" };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 20px", background: a ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" });
