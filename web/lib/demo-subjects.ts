import type { StoredCredential } from "./passkey";

const STORAGE_KEY = "likenesslock:subjects";

export function listDemoSubjects(): StoredCredential[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredCredential[];
  } catch {
    return [];
  }
}

export function saveDemoSubject(subject: StoredCredential): void {
  if (typeof window === "undefined") return;
  const existing = listDemoSubjects().filter((s) => s.subjectId !== subject.subjectId);
  existing.push(subject);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getDemoSubject(subjectId: string): StoredCredential | undefined {
  return listDemoSubjects().find((s) => s.subjectId === subjectId);
}
