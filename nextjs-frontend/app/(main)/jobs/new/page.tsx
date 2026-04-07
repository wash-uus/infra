'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, MapPin, X } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploader from '@/components/ui/ImageUploader';
import PostSuccessModal from '@/components/ui/PostSuccessModal';
import LocationPickerModal, { LocationResult } from '@/components/ui/LocationPickerModal';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  listingType: z.enum(['hiring', 'offering', 'seeking']),
  category: z.string().min(1, 'Category is required'),
  discipline: z.string().optional(),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'any']).optional(),
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

export default function NewJobPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LocationResult | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [imageUploadWarning, setImageUploadWarning] = useState<{ id: string; message: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      listingType: 'hiring',
      isRemote: false,
      currency: 'KES',
      requirements: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'requirements' });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        ...data,
        requirements: data.requirements.map((r) => r.value).filter(Boolean),
        location: pickedLocation?.formattedAddress ?? [data.country, data.city].filter(Boolean).join(', '),
        country: pickedLocation?.country ?? data.country,
        city: pickedLocation?.city ?? data.city,
        lat: pickedLocation?.lat,
        lng: pickedLocation?.lng,
        continent: pickedLocation?.continent,
        town: pickedLocation?.town,
        placeName: pickedLocation?.placeName,
        budget: data.budgetMin ?? undefined,
        budgetMax: data.budgetMax ?? undefined,
        budgetType: data.budgetType ?? undefined,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : undefined,
      };
      const createRes = await api.post('/jobs', payload);
      const jobId = createRes.data.data.id as string;

      let imagesFailed = false;
      if (imageFiles.length > 0) {
        setUploadProgress({ current: 0, total: imageFiles.length });
        for (let i = 0; i < imageFiles.length; i++) {
          try {
            const fd = new FormData();
            fd.append('image', imageFiles[i]);
            await api.post(`/jobs/${jobId}/images`, fd);
          } catch {
            imagesFailed = true;
          }
          setUploadProgress({ current: i + 1, total: imageFiles.length });
        }
      }

      return { id: jobId, imagesFailed };
    },
    onSuccess: ({ id, imagesFailed }) => {
      setUploadProgress(null);
      if (imagesFailed) {
        setImageUploadWarning({
          id,
          message: 'Job posted! Some images could not be uploaded — Storage may not be enabled yet. You can add them later from the edit page.',
        });
      }
      // Always show the share modal after posting
      setShareModal({ id, title: (mutation.variables as any)?.title ?? 'Your job' });
    },
    onError: () => setUploadProgress(null),
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Post a Job</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* Listing type */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Listing Type</label>
          <div className="flex gap-3">
            {[
              { value: 'hiring', label: 'I\'m Hiring' },
              { value: 'offering', label: 'Offering Service' },
              { value: 'seeking', label: 'Seeking Work' },
            ].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={opt.value} {...register('listingType')} className="accent-infra-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="Title" placeholder="e.g. Senior Civil Engineer needed for bridge project" error={errors.title?.message} {...register('title')} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="w-full rounded-xl border border-gray-200 p-3 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all"
            rows={5}
            placeholder="Describe the job, responsibilities, and what you're looking for..."
            {...register('description')}
          />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        {/* Photos */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Photos <span className="text-gray-400 font-normal">(optional, up to 5)</span>
          </label>
          <ImageUploader onFilesChange={setImageFiles} maxImages={5} />
        </div>

        {/* Category + Discipline */}
        <div className="grid gap-5 sm:grid-cols-2">          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('category')}>
              <option value="">Select category...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Discipline</label>
            <Input placeholder="e.g. Bridge Engineering" {...register('discipline')} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
          {pickedLocation ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-infra-primary/20 bg-infra-primary/5 p-3">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-infra-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">
                    {pickedLocation.formattedAddress}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[pickedLocation.continent, pickedLocation.country].filter(Boolean).join(' · ')}
                    {pickedLocation.lat ? ` · ${pickedLocation.lat.toFixed(4)}, ${pickedLocation.lng.toFixed(4)}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-infra-primary hover:bg-infra-primary/10 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-4 text-sm text-gray-500 hover:border-infra-primary hover:text-infra-primary transition-colors"
            >
              <MapPin className="h-4 w-4" />
              Click to set location — continent, country, city &amp; pin
            </button>
          )}
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" {...register('isRemote')} className="accent-infra-primary" />
            Remote work accepted
          </label>
          {/* Fallback manual inputs if no location picked yet */}
          {!pickedLocation && (
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Input placeholder="Country (optional)" {...register('country')} />
              <Input placeholder="City (optional)" {...register('city')} />
            </div>
          )}
        </div>

        <LocationPickerModal
          open={locationModalOpen}
          initial={pickedLocation ?? undefined}
          onSelect={(loc) => { setPickedLocation(loc); setLocationModalOpen(false); }}
          onClose={() => setLocationModalOpen(false)}
        />

        {/* Budget */}
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
          <div className="mt-2 flex gap-3">
            {['KES', 'USD', 'EUR', 'GBP'].map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="radio" value={c} {...register('currency')} className="accent-infra-primary" />
                {c}
              </label>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <Input label="Application Deadline (optional)" type="date" {...register('deadline')} />

        {/* Requirements */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Requirements</label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all"
                  placeholder={`Requirement ${index + 1}`}
                  {...register(`requirements.${index}.value`)}
                />
                <button type="button" onClick={() => remove(index)} className="rounded-lg p-2 text-red-400 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => append({ value: '' })}
            className="mt-2 flex items-center gap-1 text-sm text-infra-primary hover:text-infra-primary"
          >
            <Plus className="h-4 w-4" /> Add requirement
          </button>
        </div>

        {mutation.isError && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {(mutation.error as Error & { status?: number })?.message ?? 'Failed to post job. Please try again.'}
          </p>
        )}

        {imageUploadWarning && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">{imageUploadWarning.message}</p>
            <button
              type="button"
              onClick={() => router.push(`/jobs/${imageUploadWarning.id}`)}
              className="mt-2 text-sm font-medium text-amber-900 underline hover:no-underline"
            >
              Go to job →
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending}>
            {uploadProgress
              ? `Uploading images (${uploadProgress.current}/${uploadProgress.total})…`
              : 'Post Job'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>

      {shareModal && (
        <PostSuccessModal
          isOpen
          onClose={() => { setShareModal(null); router.push(`/jobs/${shareModal.id}`); }}
          type="job"
          entityId={shareModal.id}
          title={shareModal.title}
          referralCode={(profile as any)?.referralCode}
        />
      )}
    </div>
  );
}
