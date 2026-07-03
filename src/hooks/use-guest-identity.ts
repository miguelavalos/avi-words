import { useCallback, useEffect, useState } from "react";
import { randomId } from "@/game/word-rules";

const guestIdKey = "aviWordsGuestPlayerId";
const nicknameKey = "aviWordsNickname";

function readInitialGuestId(): string {
  if (typeof localStorage === "undefined") return randomId("guest");
  const stored = localStorage.getItem(guestIdKey);
  if (stored) return stored;
  const created = randomId("guest");
  localStorage.setItem(guestIdKey, created);
  return created;
}

function readInitialNickname(): string {
  if (typeof localStorage === "undefined") return "Guest Avi";
  return localStorage.getItem(nicknameKey) ?? "Guest Avi";
}

export function useGuestIdentity() {
  const [guestPlayerId] = useState(readInitialGuestId);
  const [nickname, setNicknameState] = useState(readInitialNickname);

  const setNickname = useCallback((value: string) => {
    const next = value.trim().slice(0, 22) || "Guest Avi";
    setNicknameState(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(nicknameKey, next);
    }
  }, []);

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(guestIdKey, guestPlayerId);
    }
  }, [guestPlayerId]);

  return {
    guestPlayerId,
    nickname,
    setNickname,
    playerKind: "guest" as const
  };
}
