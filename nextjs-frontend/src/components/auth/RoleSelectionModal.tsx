'use client';

import React from 'react';
import { Briefcase, HardHat, Wrench } from 'lucide-react';

interface Props {
  /** Called when the user picks a role. The caller handles the API write + modal close. */
  onSelectRole: (role: 'client' | 'professional' | 'vendor') => void;
  /** Whether the API call to save the role is in flight. */
  loading?: boolean;
}

const ROLES = [
  {
    value: 'client' as const,
    label: 'Client',
    description: 'I want to hire engineers or rent equipment for my project.',
    Icon: Briefcase,
  },
  {
    value: 'professional' as const,
    label: 'Professional',
    description: 'I am a licensed engineer or skilled contractor offering services.',
    Icon: HardHat,
  },
  {
    value: 'vendor' as const,
    label: 'Vendor',
    description: 'I supply construction equipment, tools, or materials for hire.',
    Icon: Wrench,
  },
];

export default function RoleSelectionModal({ onSelectRole, loading }: Props) {
  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900">How will you use INFRA?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose your role — you can update it later from your profile settings.
        </p>

        <div className="mt-6 space-y-3">
          {ROLES.map(({ value, label, description, Icon }) => (
            <button
              key={value}
              disabled={loading}
              onClick={() => onSelectRole(value)}
              className="flex w-full items-start gap-4 rounded-xl border-2 border-gray-200 p-4 text-left transition-all hover:border-infra-primary hover:bg-infra-primary/5 disabled:opacity-60"
            >
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-infra-primary/10 text-infra-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-semibold text-gray-900">{label}</span>
                <span className="mt-0.5 block text-sm text-gray-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
