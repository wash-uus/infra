'use client';

import { InputHTMLAttributes, forwardRef, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// ── Strength calculator ─────────────────────────────────────────────────────

interface StrengthResult {
  score: number;   // 0-4
  label: string;
  color: string;   // Tailwind bg class
  textColor: string;
}

function getPasswordStrength(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  // Clamp to 0-4
  score = Math.min(score, 4);

  const levels: StrengthResult[] = [
    { score: 0, label: 'Too weak', color: 'bg-gray-200', textColor: 'text-gray-400' },
    { score: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-600' },
    { score: 2, label: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-600' },
    { score: 3, label: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { score: 4, label: 'Strong', color: 'bg-infra-success', textColor: 'text-infra-success' },
  ];

  return levels[score];
}

// ── Component ────────────────────────────────────────────────────────────────

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
  showStrength?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, label, error, hint, showStrength = false, id, onChange, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  const strength = useMemo(() => getPasswordStrength(value), [value]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 pr-11 text-sm text-gray-900',
            'placeholder:text-gray-400',
            'shadow-sm transition-all duration-200',
            'hover:border-gray-300',
            'focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-400/10',
            className,
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          onChange={(e) => {
            setValue(e.target.value);
            onChange?.(e);
          }}
          {...props}
        />

        {/* Toggle visibility button */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            /* Eye-off icon */
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            /* Eye icon */
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Strength meter */}
      {showStrength && value.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-300',
                  i < strength.score ? strength.color : 'bg-gray-200',
                )}
              />
            ))}
          </div>
          <span className={cn('text-xs font-medium', strength.textColor)}>
            {strength.label}
          </span>
        </div>
      )}

      {error && (
        <p id={`${inputId}-error`} className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
      {hint && !error && !(showStrength && value.length > 0) && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
export default PasswordInput;
