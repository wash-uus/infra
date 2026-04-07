'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Tool } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const schema = z.object({
  name: z.string().min(3),
  description: z.string().min(10),
  listingType: z.enum(['selling', 'renting', 'wanted']),
  category: z.string().min(1),
  condition: z.enum(['new', 'like_new', 'good', 'fair', 'for_parts']).optional(),
  price: z.coerce.number().positive().optional(),
  dailyRate: z.coerce.number().positive().optional(),
  currency: z.string().default('KES'),
  country: z.string().optional(),
  city: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES = [
  'Surveying Equipment', 'Earthmoving Equipment', 'Concrete Equipment',
  'Lifting Equipment', 'Drilling Equipment', 'Compaction Equipment',
  'Safety Equipment', 'Measuring Tools', 'Power Tools', 'Other',
];

const CATEGORY_API: Record<string, string> = {
  'Surveying Equipment': 'surveying',
  'Earthmoving Equipment': 'construction',
  'Concrete Equipment': 'construction',
  'Lifting Equipment': 'construction',
  'Drilling Equipment': 'construction',
  'Compaction Equipment': 'construction',
  'Safety Equipment': 'safety',
  'Measuring Tools': 'testing',
  'Power Tools': 'construction',
  'Other': 'other',
};

const CONDITION_API: Record<string, string> = {
  new: 'new',
  like_new: 'excellent',
  good: 'good',
  fair: 'fair',
  for_parts: 'poor',
};

export default function EditToolPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: tool, isLoading } = useQuery<Tool>({
    queryKey: ['tool', id],
    queryFn: async () => {
      const res = await api.get(`/tools/${id}`);
      return res.data.data;
    },
  });

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { listingType: 'selling', currency: 'KES', category: '' },
  });

  const listingType = watch('listingType');

  useEffect(() => {
    if (!tool) return;
    reset({
      name: tool.title,
      description: tool.description ?? '',
      listingType: tool.listingType as 'selling' | 'renting' | 'wanted',
      category: tool.category ?? '',
      condition: tool.condition as FormValues['condition'],
      price: tool.price,
      dailyRate: tool.dailyRate,
      currency: tool.currency ?? 'KES',
      country: tool.country,
      city: tool.location,
    });
  }, [tool, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.put(`/tools/${id}`, {
        ...data,
        title: data.name,
        category: CATEGORY_API[data.category] ?? 'other',
        condition: data.condition ? (CONDITION_API[data.condition] ?? data.condition) : undefined,
        location: [data.country, data.city].filter(Boolean).join(', '),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tool', id] });
      router.push(`/tools/${id}`);
    },
  });

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Edit Listing</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Listing Type</label>
          <div className="flex gap-3">
            {[{ value: 'selling', label: 'Selling' }, { value: 'renting', label: 'Renting Out' }, { value: 'wanted', label: 'Wanted' }].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={opt.value} {...register('listingType')} className="accent-orange-500" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="Equipment Name" error={errors.name?.message} {...register('name')} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea className="w-full rounded-xl border border-gray-200 p-3 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" rows={4} {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('category')}>
              <option value="">Select...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Condition</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('condition')}>
              <option value="">Select...</option>
              <option value="new">New</option>
              <option value="like_new">Like New</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="for_parts">For Parts</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3">
          {listingType === 'renting' ? (
            <Input label="Daily Rate" type="number" className="flex-1" {...register('dailyRate')} />
          ) : (
            <Input label="Price" type="number" className="flex-1" {...register('price')} />
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
            <select className="rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('currency')}>
              {['KES', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Country" {...register('country')} />
          <Input label="City" {...register('city')} />
        </div>

        {mutation.isError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">Update failed. Please try again.</p>}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending}>Save Changes</Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
