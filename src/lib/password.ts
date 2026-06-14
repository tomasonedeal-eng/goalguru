export type PasswordStrength = "weak" | "fair" | "strong" | "very-strong";

export function checkPasswordStrength(pwd: string): {
  score: number;
  label: PasswordStrength;
  labelLt: string;
  color: string;
} {
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: "weak", labelLt: "Silpnas", color: "bg-rose-500" };
  if (score <= 3) return { score, label: "fair", labelLt: "Vidutinis", color: "bg-amber-400" };
  if (score <= 4) return { score, label: "strong", labelLt: "Stiprus", color: "bg-emerald-400" };
  return { score, label: "very-strong", labelLt: "Labai stiprus", color: "bg-emerald-500" };
}

export function generateStrongPassword(length = 14): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  const pwd: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)],
  ];

  for (let i = pwd.length; i < length; i++) {
    pwd.push(all[Math.floor(Math.random() * all.length)]);
  }

  return pwd.sort(() => Math.random() - 0.5).join("");
}
