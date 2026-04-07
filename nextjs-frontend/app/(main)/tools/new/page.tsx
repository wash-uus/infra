'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUploader from '@/components/ui/ImageUploader';
import PostSuccessModal from '@/components/ui/PostSuccessModal';
import UpgradeModal from '@/components/ui/UpgradeModal';
import LocationPickerModal, { LocationResult } from '@/components/ui/LocationPickerModal';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  listingType: z.enum(['selling', 'renting', 'wanted']),
  category: z.string().min(1, 'Category is required'),
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

// Map UI display labels → API enum values
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

export default function NewToolPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LocationResult | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [imageUploadWarning, setImageUploadWarning] = useState<{ id: string; message: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ id: string; title: string } | null>(null);
  const [upgradeModal, setUpgradeModal] = useState(false);
  const {
    register, handleSubmit, watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { listingType: 'selling', currency: 'KES' },
  });

  const listingType = watch('listingType');

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload = {
        ...data,
        title: data.name,       // API expects 'title', form field is 'name'
        category: CATEGORY_API[data.category] ?? 'other',
        condition: data.condition ? (CONDITION_API[data.condition] ?? data.condition) : undefined,
        location: pickedLocation?.formattedAddress ?? [data.country, data.city].filter(Boolean).join(', '),
        country: pickedLocation?.country ?? data.country,
        city: pickedLocation?.city ?? data.city,
        lat: pickedLocation?.lat,
        lng: pickedLocation?.lng,
        continent: pickedLocation?.continent,
        town: pickedLocation?.town,
        placeName: pickedLocation?.placeName,
      };
      const createRes = await api.post('/tools', payload);
      const toolId = createRes.data.data.id as string;

      let imagesFailed = false;
      if (imageFiles.length > 0) {
        setUploadProgress({ current: 0, total: imageFiles.length });
        for (let i = 0; i < imageFiles.length; i++) {
          try {
            const fd = new FormData();
            fd.append('image', imageFiles[i]);
            await api.post(`/tools/${toolId}/images`, fd);
          } catch {
            imagesFailed = true;
          }
          setUploadProgress({ current: i + 1, total: imageFiles.length });
        }
      }

      return { id: toolId, imagesFailed };
    },
    onSuccess: ({ id, imagesFailed }) => {
      setUploadProgress(null);
      if (imagesFailed) {
        setImageUploadWarning({
          id,
          message: 'Listing created! Some images could not be uploaded — Storage may not be enabled yet. You can add them later from the edit page.',
        });
      }
      // Always show share modal after posting
      setShareModal({ id, title: (mutation.variables as any)?.name ?? 'Your tool' });
    },
    onError: (err: any) => {
      setUploadProgress(null);
      const code = err?.response?.data?.code;
      if (err?.response?.status === 403 && (code === 'LIMIT_HIT' || code === 'UPGRADE_REQUIRED')) {
        setUpgradeModal(true);
      }
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">List Equipment</h1>

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Listing Type</label>
          <div className="flex gap-3">
            {[{ value: 'selling', label: 'Selling' }, { value: 'renting', label: 'Renting Out' }, { value: 'wanted', label: 'Wanted' }].map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2">
                <input type="radio" value={opt.value} {...register('listingType')} className="accent-infra-primary" />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <Input label="Equipment Name *" placeholder="e.g. Leica Total Station TS06" error={errors.name?.message} {...register('name')} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description *</label>
          <textarea className="w-full rounded-xl border border-gray-200 p-3 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" rows={4} placeholder="Describe the equipment, its features and condition..." {...register('description')} />
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Category *</label>
            <select className="w-full rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('category')}>
              <option value="">Select...</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>}
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

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {listingType === 'renting' ? 'Daily Rate' : 'Price'} (optional)
          </label>
          <div className="flex gap-3">
            {listingType === 'renting' ? (
              <Input type="number" placeholder="Daily rate" className="flex-1" {...register('dailyRate')} />
            ) : (
              <Input type="number" placeholder="Price" className="flex-1" {...register('price')} />
            )}
            <select className="rounded-xl border border-gray-200 p-2.5 text-sm shadow-sm focus:border-infra-primary focus:outline-none focus:ring-4 focus:ring-infra-primary/10 transition-all" {...register('currency')}>
              {['KES', 'USD', 'EUR', 'GBP'].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Photos <span className="text-gray-400 font-normal">(up to 5)</span>
          </label>
          <ImageUploader onFilesChange={setImageFiles} maxImages={5} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Location</label>
          {pickedLocation ? (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-infra-primary/20 bg-infra-primary/5 p-3">
              <div className="flex items-start gap-2 min-w-0">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-infra-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{pickedLocation.formattedAddress}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[pickedLocation.continent, pickedLocation.country].filter(Boolean).join(' · ')}
                    {pickedLocation.lat ? ` · ${pickedLocation.lat.toFixed(4)}, ${pickedLocation.lng.toFixed(4)}` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setLocationModalOpen(true)} className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-infra-primary hover:bg-infra-primary/10 transition-colors">
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

        {mutation.isError && (
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
            {(mutation.error as Error & { status?: number })?.message ?? 'Failed to create listing. Please try again.'}
          </p>
        )}

        {imageUploadWarning && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">{imageUploadWarning.message}</p>
            <button
              type="button"
              onClick={() => router.push(`/tools/${imageUploadWarning.id}`)}
              className="mt-2 text-sm font-medium text-amber-900 underline hover:no-underline"
            >
              Go to listing →
            </button>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending}>
            {uploadProgress
              ? `Uploading images (${uploadProgress.current}/${uploadProgress.total})…`
              : 'Create Listing'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>

      {shareModal && (
        <PostSuccessModal
          isOpen
          onClose={() => { setShareModal(null); router.push(`/tools/${shareModal.id}`); }}
          type="tool"
          entityId={shareModal.id}
          title={shareModal.title}
          referralCode={(profile as any)?.referralCode}
        />
      )}

      {upgradeModal && (
        <UpgradeModal
          action="list unlimited equipment"
          currentTier={(profile as any)?.subscription?.tier ?? 'free'}
          code="LIMIT_HIT"
          onClose={() => setUpgradeModal(false)}
        />
      )}
    </div>
  );
}
