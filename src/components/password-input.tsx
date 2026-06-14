"use client";

import { useState } from "react";
import { checkPasswordStrength, generateStrongPassword } from "@/lib/password";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  showGenerator?: boolean;
  required?: boolean;
}

export function PasswordInput({
  value,
  onChange,
  placeholder = "Slaptažodis",
  showStrength = true,
  showGenerator = true,
  required,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const strength = value ? checkPasswordStrength(value) : null;

  const generate = () => {
    onChange(generateStrongPassword());
    setVisible(true);
  };

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            minLength={8}
            required={required}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-10 font-mono text-white outline-none focus:border-emerald-400"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            tabIndex={-1}
          >
            {visible ? "🙈" : "👁"}
          </button>
        </div>
        {showGenerator && (
          <button
            type="button"
            onClick={generate}
            title="Sugeneruoti stiprų slaptažodį"
            className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            Generuoti
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={copy}
            className="rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-slate-300 hover:bg-white/10"
          >
            {copied ? "✓" : "Kopijuoti"}
          </button>
        )}
      </div>

      {showStrength && value && strength && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  strength.score >= i * 1.5
                    ? strength.color
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>
          <p className={`text-xs ${strength.score <= 2 ? "text-rose-400" : strength.score <= 3 ? "text-amber-400" : "text-emerald-400"}`}>
            {strength.labelLt}
            {strength.label === "weak" && " — pridėkite didžiąsias raides, skaičius ir simbolius"}
          </p>
        </div>
      )}
    </div>
  );
}
