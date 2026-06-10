import { generateId } from "@/lib/id";
import { STARTING_COINS } from "@/lib/storage";
import type { User } from "@/lib/types";

const SESSION_KEY = "goalguru_user";
const ACCOUNTS_KEY = "goalguru_local_accounts";

interface LocalAccount {
  email: string;
  password: string;
  user: User;
}

function readAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as LocalAccount[]) : [];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: LocalAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadLocalUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function saveLocalUser(user: User | null) {
  if (!user) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));

  const accounts = readAccounts();
  const idx = accounts.findIndex((a) => a.email === user.email);
  if (idx >= 0) {
    accounts[idx].user = user;
    writeAccounts(accounts);
  }
}

export function localGoogleSignIn(displayName: string, email?: string): User {
  const existing = loadLocalUser();
  if (existing) return existing;

  const user: User = {
    id: generateId(),
    displayName: displayName.trim() || "Google žaidėjas",
    email: email?.trim() || "google@goalguru.local",
    coinBalance: STARTING_COINS,
    totalPoints: 0,
    defaultOddsMode: "fixed",
  };
  saveLocalUser(user);
  return user;
}

export function localSignUp(
  displayName: string,
  email: string,
  password: string,
): { user?: User; error?: string } {
  const trimmedEmail = email.trim().toLowerCase();
  if (!displayName.trim()) return { error: "Įveskite slapyvardį." };
  if (!trimmedEmail) return { error: "Įveskite el. paštą." };
  if (password.length < 6) return { error: "Slaptažodis — min. 6 simboliai." };

  const accounts = readAccounts();
  if (accounts.some((a) => a.email === trimmedEmail)) {
    return { error: "Šis el. paštas jau registruotas." };
  }

  const user: User = {
    id: generateId(),
    displayName: displayName.trim(),
    email: trimmedEmail,
    coinBalance: STARTING_COINS,
    totalPoints: 0,
    defaultOddsMode: "fixed",
  };

  accounts.push({ email: trimmedEmail, password, user });
  writeAccounts(accounts);
  saveLocalUser(user);
  return { user };
}

export function localSignIn(
  email: string,
  password: string,
): { user?: User; error?: string } {
  const trimmedEmail = email.trim().toLowerCase();
  const account = readAccounts().find(
    (a) => a.email === trimmedEmail && a.password === password,
  );

  if (!account) {
    return { error: "Neteisingas el. paštas arba slaptažodis." };
  }

  saveLocalUser(account.user);
  return { user: account.user };
}
