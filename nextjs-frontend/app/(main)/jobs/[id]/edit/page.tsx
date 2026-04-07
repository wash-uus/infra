'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Job } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const schema = z.object({
  title: z.string().min(5),
  description: z.string().min(20),
  listingType: z.enum(['hiring', 'offering', 'seeking']),
  category: z.string().min(1),
  discipline: z.string().optional(),
  isRemote: z.boolean(),
  country: z.string().optional(),
  city: z.string().optional(),
  budgetMin: z.coerce.number().positive().optional(),
  budgetMax: z.coerce.number().positive().optional(),
  budgetType: z.enum(['fixed', 'hourly', 'negotiable']).optional(),
  currency: z.string().default('KES'),
  deadline: z.string().optional(),
  requirements: z.array(z.object({ value: z.string() })),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES = [
  'Civil Engineering', 'Structural Engineering', 'Mechanical Engineering',
  'Electrical Engineering', 'Architecture', 'Surveying', 'Project Management',
  'Environmental Engineering', 'Other',
];

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['job', id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data.data;
    },
  });

  const {
    register, control, handleSubmit, reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { isRemote: false, currency: 'KES', requirements: [], listingType: 'hiring', category: '' },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'requirements' });

  // Pre-populate form once job loads
  useEffect(() => {
    if (!job) return;
    reset({
      title: job.title,
      description: job.description,
      listingType: job.listingType as 'hiring' | 'offering' | 'seeking',
      category: job.category ?? '',
      discipline: job.disciplineId ?? '',
      isRemote: job.isRemote ?? false,
      country: job.country ?? '',
      city: job.location ?? '',
      budgetMin: job.budget ?? undefined,
      budgetMax: job.budget ?? undefined,
      budgetType: undefined,
      currency: job.currency ?? 'KES',
      deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
      requirements: (job.requirements ?? []).map((v: string) => ({ value: v })),
    });
  }, [job, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const payload = {
        ...data,
        requirements: data.requirements.map((r) => r.value).filter(Boolean),
        location: [data.country, data.city].filter(Boolean).join(', '),
        budget: data.budgetMin ?? undefined,
        budgetMax: data.budgetMax ?? undefined,
        budgetType: data.budgetType ?? undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      };
      return api.put(`/jobs/${id}`, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      router.push(`/jobs/${id}`);
    },
  });

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Edit Job</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Listing Type</label>
          <div className="flex gap-3">
            {[{ value: 'hiring', label: 'I\'m Hiring' }, { value: 'offering', label: 'Offering Service' }, { value: 'seeking', label: 'Seeking Work' }].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={opt.value} {...register('listingType')} className="accent-infra-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="Title" error={errors.title?.message} {...register('title')} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea className="w-full rounded-xl border border-gray-200 p-3 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" rows={5} {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('category')}>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Input label="Discipline" {...register('discipline')} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Country" {...register('country')} />
            <Input placeholder="City" {...register('city')} />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('isRemote')} className="accent-infra-primary" />
            Remote work accepted
          </label>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Budget (optional)</label>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input type="number" placeholder="Min" {...register('budgetMin')} />
            <Input type="number" placeholder="Max" {...register('budgetMax')} />
            <select className="rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('budgetType')}>
              <option value="fixed">Fixed</option>
              <option value="hourly">Hourly</option>
              <option value="negotiable">Negotiable</option>
            </select>
          </div>
        </div>

        <Input label="Application Deadline (optional)" type="date" {...register('deadline')} />

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Requirements</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register(`requirements.${index}.value`)} />
                <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-red-400 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => append({ value: '' })} className="mt-2 flex items-center gap-1 text-sm text-infra-primary hover:text-infra-primary">
            <Plus className="h-4 w-4" /> Add requirement
          </button>
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
