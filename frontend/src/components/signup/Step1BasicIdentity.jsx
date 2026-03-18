import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";

import { step1Schema, COUNTRIES } from "../../schemas/signupSchemas";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import CityCombobox from "./CityCombobox";
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
