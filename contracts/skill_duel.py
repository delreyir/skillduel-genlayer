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

        def leader_fn():
            prompt = f"""You are judging a 1v1 skill duel.

CATEGORY: {duel['category']}
CHALLENGE PROMPT: {duel['prompt']}

SUBMISSION 1 (Player A):
{duel['submission1']}

SUBMISSION 2 (Player B):
{duel['submission2']}

Judge based on:
1. Correctness — does it solve the challenge?
2. Quality — elegance, clarity, efficiency
3. Creativity — novel approach or solution
4. Completeness — edge cases, thoroughness

Return JSON:
{{
    "winner": 1 or 2,
    "score1": 1-10,
    "score2": 1-10,
    "reasoning": "brief explanation of why the winner's submission is superior"
}}"""
            response = gl.nondet.exec_prompt(prompt)
            return json.loads(response)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_data = leader_fn()
            leader_data = leader_result.calldata
            return (leader_data["winner"] == validator_data["winner"]
                    and abs(leader_data["score1"] - validator_data["score1"]) <= 2
                    and abs(leader_data["score2"] - validator_data["score2"]) <= 2)

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
