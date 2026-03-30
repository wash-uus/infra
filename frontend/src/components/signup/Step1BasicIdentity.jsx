import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";

import { step1Schema } from "../../schemas/signupSchemas";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import GoogleAuthButton from "../auth/GoogleAuthButton";

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function Label({ children, required }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
      {children} {required && <span className="text-amber-500">*</span>}
    </label>
  );
}

export default function Step1BasicIdentity({ defaultValues, onNext }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setFocus,
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues,
    mode: "onTouched",
  });

  const password = watch("password", "");
  const [showPw, setShowPw] = useState(false);

  useEffect(() => { setFocus("full_name"); }, [setFocus]);

  return (
    <form id="step-form" onSubmit={handleSubmit(onNext)} className="space-y-4" noValidate>
      {/* Full Name + Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Full Name</Label>
          <input
            {...register("full_name")}
            type="text"
            placeholder="John Okeke"
            className="input-dark"
            autoComplete="name"
          />
          <FieldError message={errors.full_name?.message} />
        </div>
        <div>
          <Label required>Email Address</Label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="input-dark"
            autoComplete="email"
          />
          <FieldError message={errors.email?.message} />
        </div>
      </div>

      {/* Username */}
      <div>
        <Label required>Username</Label>
        <input
          {...register("username")}
          type="text"
          placeholder="washika_1998"
          className="input-dark"
          autoComplete="username"
        />
        <FieldError message={errors.username?.message} />
      </div>

      {/* Password */}
      <div>
        <Label required>Password</Label>
        <div className="relative">
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="Create a strong password"
            className="input-dark pr-10"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            tabIndex={-1}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.956 9.956 0 016.362 2.3M15 12a3 3 0 11-4.5-2.6M3 3l18 18" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        </div>
        <PasswordStrengthMeter password={password} />
        <FieldError message={errors.password?.message} />
      </div>


      {/* Google */}
      <div className="pt-2">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
        <div className="mt-3">
          <GoogleAuthButton label="Sign up with Google" />
        </div>
      </div>
    </form>
  );
}
