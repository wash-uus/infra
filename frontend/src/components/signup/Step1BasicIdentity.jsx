import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import { step1Schema, COUNTRIES } from "../../schemas/signupSchemas";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import CityCombobox from "./CityCombobox";

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
    setValue,
    formState: { errors },
    setFocus,
  } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues,
    mode: "onTouched",
  });

  const password = watch("password", "");
  const country = watch("country", "");
  const cityValue = watch("city", "");

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

      {/* Password */}
      <div>
        <Label required>Password</Label>
        <input
          {...register("password")}
          type="password"
          placeholder="Create a strong password"
          className="input-dark"
          autoComplete="new-password"
        />
        <PasswordStrengthMeter password={password} />
        <FieldError message={errors.password?.message} />
      </div>

      {/* Confirm Password */}
      <div>
        <Label required>Confirm Password</Label>
        <input
          {...register("confirm_password")}
          type="password"
          placeholder="Re-enter your password"
          className="input-dark"
          autoComplete="new-password"
        />
        <FieldError message={errors.confirm_password?.message} />
      </div>

      {/* Country + City */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Country</Label>
          <select {...register("country")} className="input-dark">
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <FieldError message={errors.country?.message} />
        </div>
        <div>
          <Label>City / Town / Market</Label>
          <CityCombobox
            country={country}
            value={cityValue}
            onChange={(val) => setValue("city", val, { shouldValidate: true })}
          />
          {country && (
            <p className="mt-1 text-[10px] text-zinc-600">
              Type to filter or enter any location name
            </p>
          )}
        </div>
      </div>

      {/* Phone + Gender */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Phone <span className="text-zinc-600 normal-case font-normal">(optional)</span></Label>
          <input
            {...register("phone")}
            type="tel"
            placeholder="+234 800 000 0000"
            className="input-dark"
          />
          <FieldError message={errors.phone?.message} />
        </div>
        <div>
          <Label>Gender <span className="text-zinc-600 normal-case font-normal">(optional)</span></Label>
          <select {...register("gender")} className="input-dark">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Google placeholder */}
      <div className="pt-2">
        <div className="relative flex items-center gap-2">
          <div className="flex-1 h-px bg-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 h-px bg-zinc-800" />
        </div>
        <button
          type="button"
          disabled
          className="mt-3 w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900/60 py-2.5 text-sm font-medium text-zinc-400 opacity-50 cursor-not-allowed"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google (coming soon)
        </button>
      </div>
    </form>
  );
}
