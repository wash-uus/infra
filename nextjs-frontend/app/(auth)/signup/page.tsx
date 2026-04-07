'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/lib/analytics';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormValues = z.infer<typeof schema>;

const ROLES = [
  { value: 'professional', label: 'Professional', desc: 'Engineer, surveyor, or specialist' },
  { value: 'client', label: 'Client', desc: 'Post jobs and hire professionals' },
  { value: 'vendor', label: 'Vendor', desc: 'Sell or rent equipment' },
];

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState(searchParams.get('role') ?? 'client');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.displayName, role);
      analytics.signedUp(role);
      toast.success('Account created! Please verify your email.');
      router.push('/dashboard');
    } catch (err: any) {
      const code: string = err?.code ?? '';
      const msg =
        code === 'auth/email-already-in-use' ? 'This email is already registered. Try signing in instead.' :
        code === 'auth/invalid-email' ? 'Invalid email address.' :
        code === 'auth/weak-password' ? 'Password is too weak. Use at least 6 characters.' :
        code === 'auth/operation-not-allowed' ? 'Email/password sign-up is not enabled. Contact support.' :
        err.message ?? 'Registration failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
      <p className="mt-1 text-sm text-gray-500">Join InfraSells and start connecting</p>

      {/* Role selector */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRole(r.value)}
            className={`rounded-xl border p-3 text-left transition-all duration-200 ${
              role === r.value
                ? 'border-infra-primary bg-infra-primary/5 shadow-sm ring-1 ring-infra-primary'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <p className={`text-sm font-semibold ${role === r.value ? 'text-infra-primary' : 'text-gray-900'}`}>{r.label}</p>
            <p className="mt-0.5 text-xs text-gray-500">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Social sign-in buttons */}
      <div className="mt-6 flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogle}
          loading={googleLoading}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative">
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-400"
          >
            <svg className="h-4 w-4 opacity-40" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continue with Facebook
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">Coming soon</span>
          </button>
        </div>
      </div>

      <div className="my-4 flex items-center gap-3">
        <hr className="flex-1 border-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordInput
          label="Password"
          autoComplete="new-password"
          hint="At least 8 characters"
          showStrength
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordInput
          label="Confirm password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-infra-secondary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="mt-3 text-center text-xs text-gray-400">
        By creating an account, you agree to our{' '}
        <Link href="/terms" className="underline">Terms</Link> &amp;{' '}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </>
  );
}
