import { describe, expect, it } from "vitest";
import {
  advanceChainRoom,
  CHAIN_COUNTDOWN_MS,
  CHAIN_TURN_MS,
  CHAIN_WIN_SCORE,
  createLocalChainRoom,
  joinLocalChainRoom,
  makeSprintPrompt,
  setChainReady,
  submitChainWord,
  validateChainWord,
  validateSprintAnswer
} from "../src/game/word-rules";

describe("Avi Words chain rules", () => {
  it("validates chain words with simple V0 rules", () => {
    const room = createLocalChainRoom("p1", "Mia", "es", 1000, 2);
    const expected = room.requiredLetter;
    expect(validateChainWord(room, `${expected}esa`).valid).toBe(true);
    expect(validateChainWord(room, "xesa").reason).toBe("wrong_letter");
    expect(validateChainWord({ ...room, usedWords: [`${expected}esa`] }, `${expected}esa`).reason).toBe("repeated");
  });

  it("starts after two players are ready and finishes at five points", () => {
    let room = createLocalChainRoom("p1", "Mia", "es", 1000, 4);
    room = joinLocalChainRoom(room, "p2", "Leo", 1100);
    room = setChainReady(room, "p1", true, 1200);
    room = setChainReady(room, "p2", true, 1300);
    expect(room.status).toBe("countdown");
    room = advanceChainRoom(room, 1300 + CHAIN_COUNTDOWN_MS + 1);
    expect(room.status).toBe("active");

    let guard = 0;
    while (room.status !== "finished" && guard < CHAIN_WIN_SCORE * 3) {
      const currentPlayerId = room.currentTurnPlayerId ?? "p1";
      const word = `${room.requiredLetter}word${guard}`;
      room = submitChainWord(room, currentPlayerId, word, 5000 + guard * CHAIN_TURN_MS);
      guard += 1;
    }

    expect(room.status).toBe("finished");
    expect(room.players.some((player) => player.score >= CHAIN_WIN_SCORE)).toBe(true);
  });
});

describe("Avi Words sprint rules", () => {
  it("scores valid prompts and rejects broken rules", () => {
    const prompt = makeSprintPrompt("en", 0, 12345);
    const validWord =
      prompt.kind === "starts_with" || prompt.kind === "combo"
        ? `${prompt.letter}sample`
        : prompt.kind === "contains"
          ? `a${prompt.syllable}a`
          : prompt.kind === "avoids"
            ? "rhythm"
            : "longword";

    expect(validateSprintAnswer(prompt, validWord, 3).valid).toBe(true);
    expect(validateSprintAnswer(prompt, "a", 3).valid).toBe(false);
  });
});
