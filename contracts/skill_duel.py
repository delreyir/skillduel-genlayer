# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


class SkillDuel(gl.Contract):
    duel_count: i32
    duels: TreeMap[str, str]

    def __init__(self):
        self.duel_count = i32(0)

    @gl.public.write.payable
    def create_duel(self, category: str, prompt: str) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must stake tokens")

        self.duel_count = i32(int(self.duel_count) + 1)
        duel_id = str(int(self.duel_count))
        now = int(datetime.now(timezone.utc).timestamp())

        duel = {
            "id": duel_id,
            "creator": str(gl.message.sender_address),
            "challenger": "",
            "category": category,
            "prompt": prompt,
            "submission1": "",
            "submission2": "",
            "stake1": str(value),
            "stake2": "0",
            "status": 0,  # 0=open, 1=matched, 2=both_submitted, 3=judged
            "winner": "",
            "judgment": "",
            "created_at": now,
        }
        self.duels[duel_id] = json.dumps(duel)
        return self.duel_count

    @gl.public.write.payable
    def accept_duel(self, duel_id: str) -> None:
        duel = json.loads(self.duels[duel_id])
        if duel["status"] != 0:
            raise gl.vm.UserError("Duel not open")
        if str(gl.message.sender_address) == duel["creator"]:
            raise gl.vm.UserError("Cannot duel yourself")
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must stake tokens")

        duel["challenger"] = str(gl.message.sender_address)
        duel["stake2"] = str(value)
        duel["status"] = 1
        self.duels[duel_id] = json.dumps(duel)

    @gl.public.write
    def submit_answer(self, duel_id: str, answer: str) -> None:
        duel = json.loads(self.duels[duel_id])
        if duel["status"] != 1 and duel["status"] != 2:
            raise gl.vm.UserError("Not accepting submissions")

        sender = str(gl.message.sender_address)
        if sender == duel["creator"]:
            if duel["submission1"]:
                raise gl.vm.UserError("Already submitted")
            duel["submission1"] = answer
        elif sender == duel["challenger"]:
            if duel["submission2"]:
                raise gl.vm.UserError("Already submitted")
            duel["submission2"] = answer
        else:
            raise gl.vm.UserError("Not a participant")

        if duel["submission1"] and duel["submission2"]:
            duel["status"] = 2

        self.duels[duel_id] = json.dumps(duel)

    @gl.public.write
    def judge_duel(self, duel_id: str) -> typing.Any:
        duel = json.loads(self.duels[duel_id])
        if duel["status"] != 2:
            raise gl.vm.UserError("Both must submit first")

        def _score_submissions(category: str, prompt: str, sub1: str, sub2: str) -> dict:
            """Run LLM scoring and return a normalized result dict."""
            scoring_prompt = f"""You are judging a 1v1 skill duel.

CATEGORY: {category}
CHALLENGE PROMPT: {prompt}

SUBMISSION 1 (Player A):
{sub1}

SUBMISSION 2 (Player B):
{sub2}

Judge based on:
1. Correctness — does it solve the challenge?
2. Quality — elegance, clarity, efficiency
3. Creativity — novel approach or solution
4. Completeness — edge cases, thoroughness

You MUST respond with ONLY a valid JSON object, no extra text.
Use exactly these keys and value types:
- "winner": integer, either 1 or 2
- "score1": integer from 1 to 10
- "score2": integer from 1 to 10
- "reasoning": a single short sentence explaining why the winner is better

Example:
{{"winner": 1, "score1": 8, "score2": 6, "reasoning": "Player A's solution is more elegant and handles edge cases."}}"""
            response = gl.nondet.exec_prompt(scoring_prompt)
            # Sanitize: strip markdown fences and whitespace
            cleaned = response.strip()
            if cleaned.startswith("```"):
                lines = cleaned.split("\n")
                lines = [l for l in lines if not l.strip().startswith("```")]
                cleaned = "\n".join(lines).strip()
            parsed = json.loads(cleaned)
            # Normalize fields for consistent comparison
            normalized = {
                "winner": max(1, min(2, int(parsed.get("winner", 1)))),
                "score1": max(1, min(10, int(parsed.get("score1", 5)))),
                "score2": max(1, min(10, int(parsed.get("score2", 5)))),
                "reasoning": str(parsed.get("reasoning", "")).strip(),
            }
            return normalized

        def leader_fn():
            return _score_submissions(duel["category"], duel["prompt"], duel["submission1"], duel["submission2"])

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            leader_data = leader_result.calldata
            # Validate leader result structure
            if not isinstance(leader_data, dict):
                return False
            required_keys = {"winner", "score1", "score2", "reasoning"}
            if not required_keys.issubset(leader_data.keys()):
                return False
            # Run independent scoring
            validator_data = _score_submissions(duel["category"], duel["prompt"], duel["submission1"], duel["submission2"])
            # Compare: winner must match, scores within ±2
            return (leader_data["winner"] == validator_data["winner"]
                    and abs(int(leader_data["score1"]) - int(validator_data["score1"])) <= 2
                    and abs(int(leader_data["score2"]) - int(validator_data["score2"])) <= 2)

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        total = u256(int(duel["stake1"]) + int(duel["stake2"]))
        if result["winner"] == 1:
            duel["winner"] = duel["creator"]
            self._pay(duel["creator"], total)
        else:
            duel["winner"] = duel["challenger"]
            self._pay(duel["challenger"], total)

        duel["status"] = 3
        duel["judgment"] = json.dumps(result)
        self.duels[duel_id] = json.dumps(duel)

    @gl.public.write
    def cancel_duel(self, duel_id: str) -> None:
        duel = json.loads(self.duels[duel_id])
        if duel["status"] != 0:
            raise gl.vm.UserError("Can only cancel open duels")
        if str(gl.message.sender_address) != duel["creator"]:
            raise gl.vm.UserError("Only creator can cancel")
        duel["status"] = 3
        self.duels[duel_id] = json.dumps(duel)
        self._pay(duel["creator"], u256(int(duel["stake1"])))

    @gl.public.view
    def get_duel(self, duel_id: str) -> str:
        return self.duels[duel_id]

    @gl.public.view
    def get_duel_count(self) -> i32:
        return self.duel_count

    def _pay(self, recipient: str, amount: u256) -> None:
        @gl.evm.contract_interface
        class _Recipient:
            class View:
                pass
            class Write:
                pass
        _Recipient(Address(recipient)).emit_transfer(value=amount)
