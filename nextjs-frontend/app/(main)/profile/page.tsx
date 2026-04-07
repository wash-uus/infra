'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Camera, Upload, Check, Loader2, FileText, Clock, CheckCircle, XCircle, MapPin } from 'lucide-react';
import api from '@/lib/api';
import { UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import LocationPickerModal, { LocationResult } from '@/components/ui/LocationPickerModal';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  headline: z.string().optional(),
  bio: z.string().optional(),
  phone: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  portfolioUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  yearsOfExperience: z.coerce.number().min(0).optional(),
});

type FormValues = z.infer<typeof schema>;

const TABS = ['Info', 'Documents', 'Certifications'] as const;
type Tab = typeof TABS[number];

const DOC_TYPES = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
  { value: 'license', label: 'Professional Licence' },
  { value: 'certificate', label: 'Certificate / Degree' },
  { value: 'other', label: 'Other' },
] as const;

type DocType = typeof DOC_TYPES[number]['value'];

export default function OwnProfilePage() {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('Info');
  const [saved, setSaved] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocFile, setPendingDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocType>('national_id');
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<LocationResult | null>(null);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/users/me');
      return res.data.data;
    },
  });

  const { data: docs } = useQuery({
    queryKey: ['my-docs'],
    queryFn: async () => {
      const res = await api.get('/users/me/documents');
      return res.data.data as { id: string; title: string; fileUrl: string; documentType: string; status: string }[];
    },
    enabled: activeTab === 'Documents',
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      displayName: profile?.displayName ?? '',
      headline: profile?.jobTitle ?? '',
      bio: profile?.bio ?? '',
      phone: profile?.phoneNumber ?? '',
      country: profile?.country ?? '',
      city: profile?.city ?? '',
      linkedinUrl: profile?.linkedinUrl ?? '',
      portfolioUrl: profile?.portfolioUrl ?? '',
      yearsOfExperience: profile?.yearsExperience ?? 0,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      api.put('/users/me', {
        displayName: data.displayName,
        jobTitle: data.headline,
        bio: data.bio,
        phoneNumber: data.phone,
        country: pickedLocation?.country ?? data.country,
        city: pickedLocation?.city ?? data.city,
        continent: pickedLocation?.continent,
        lat: pickedLocation?.lat,
        lng: pickedLocation?.lng,
        town: pickedLocation?.town,
        location: pickedLocation?.formattedAddress,
        yearsExperience: data.yearsOfExperience,
        linkedinUrl: data.linkedinUrl || undefined,
        portfolioUrl: data.portfolioUrl || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    onError: () => toast.error('Failed to save profile. Please try again.'),
  });

  const photoMutation = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('photo', file);
      return api.post('/users/me/photo', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-profile'] });
      refreshProfile();
    },
    onError: () => toast.error('Failed to upload photo. Please try again.'),
  });

  const docMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) => {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('documentType', type);
      return api.post('/users/me/documents', fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-docs'] });
      setPendingDocFile(null);
    },
    onError: () => toast.error('Failed to upload document. Please try again.'),
  });

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">My Profile</h1>

      {/* Photo card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              {profile?.photoURL ? (
                <Image src={profile.photoURL} alt="Profile" width={80} height={80} className="rounded-2xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-infra-primary to-infra-primary text-2xl font-semibold text-white shadow-lg shadow-infra-primary/20">
                  {getInitials(profile?.displayName ?? user?.email ?? 'U')}
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoMutation.isPending}
                className="absolute -bottom-1 -right-1 rounded-xl bg-white p-1.5 shadow-md transition-transform hover:scale-110 border border-gray-100 disabled:pointer-events-none"
              >
                {photoMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 text-gray-600" />}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) photoMutation.mutate(file);
                }}
              />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile?.displayName}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <div className="mt-1 flex gap-1.5">
                <Badge variant={profile?.verificationStatus !== 'unverified' ? 'success' : 'default'} className="capitalize">
                  {profile?.verificationStatus ?? 'Unverified'}
                </Badge>
                {profile?.role && <Badge variant="outline" className="capitalize">{profile.role}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-infra-background p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-infra-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Info tab */}
      {activeTab === 'Info' && (
        <form onSubmit={handleSubmit((d) => updateMutation.mutate(d))} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full Name *" error={errors.displayName?.message} {...register('displayName')} />
            <Input label="Years of Experience" type="number" {...register('yearsOfExperience')} />
          </div>

          <Input label="Headline" placeholder="e.g. Senior Civil Engineer · Bridge Specialist" {...register('headline')} />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
            <textarea className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20" rows={4} placeholder="Tell others about your experience and expertise..." {...register('bio')} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone" placeholder="+254..." {...register('phone')} />
            <Input label="LinkedIn URL" placeholder="https://linkedin.com/in/..." error={errors.linkedinUrl?.message} {...register('linkedinUrl')} />
            <Input label="Portfolio URL" placeholder="https://your-portfolio.com" error={errors.portfolioUrl?.message} {...register('portfolioUrl')} className="sm:col-span-2" />
          </div>

          {/* Location picker */}
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
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setLocationModalOpen(true)} className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-infra-primary hover:bg-infra-primary/10 transition-colors">
                  Change
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-infra-primary hover:text-infra-primary transition-colors mb-2"
                >
                  <MapPin className="h-4 w-4" />
                  Set location on map
                </button>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Country" {...register('country')} />
                  <Input label="City" {...register('city')} />
                </div>
              </>
            )}
          </div>

          <LocationPickerModal
            open={locationModalOpen}
            initial={pickedLocation ?? (profile?.country ? {
              country: profile.country,
              city: profile.city ?? '',
            } : undefined)}
            onSelect={(loc) => { setPickedLocation(loc); setLocationModalOpen(false); }}
            onClose={() => setLocationModalOpen(false)}
          />

          <div className="flex items-center gap-3">
            <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <Check className="h-4 w-4" /> Saved!
              </span>
            )}
          </div>
        </form>
      )}

      {/* Documents tab */}
      {activeTab === 'Documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Upload your professional documents for verification.</p>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => docInputRef.current?.click()}
              loading={docMutation.isPending}
            >
              <Upload className="h-4 w-4" /> Upload Document
            </Button>
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPendingDocFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Document type selector shown after file is picked */}
          {pendingDocFile && (
            <div className="rounded-xl border border-infra-primary/20 bg-infra-primary/5/40 p-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Selected: <span className="text-gray-900">{pendingDocFile.name}</span>
              </p>
              <label className="mb-1 block text-sm font-medium text-gray-700">Document Type</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-infra-primary focus:outline-none"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => docMutation.mutate({ file: pendingDocFile, type: docType })}
                  loading={docMutation.isPending}
                >
                  Upload
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPendingDocFile(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {docs && docs.length > 0 ? (
            <div className="space-y-2">
              {docs.map((doc) => {
                const StatusIcon = doc.status === 'approved' ? CheckCircle
                  : doc.status === 'rejected' ? XCircle
                  : Clock;
                const statusColor = doc.status === 'approved' ? 'text-green-600'
                  : doc.status === 'rejected' ? 'text-red-500'
                  : 'text-yellow-600';
                return (
                  <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.title}</p>
                      <p className="text-xs text-gray-500 capitalize">{doc.documentType?.replace('_', ' ')}</p>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium capitalize ${statusColor}`}>
                      <StatusIcon className="h-4 w-4" />
                      {doc.status}
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-infra-primary hover:underline">
                      View
                    </a>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-gray-500">No documents uploaded yet.</div>
          )}
        </div>
      )}

      {/* Certifications tab */}
      {activeTab === 'Certifications' && (
        <div className="space-y-3">
          {profile?.certifications && profile.certifications.length > 0 ? (
            profile.certifications.map((cert, i) => (
              <Card key={i}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-2 w-2 rounded-full bg-infra-primary shrink-0" />
                  <p className="text-sm text-gray-800">{cert.certificationName}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="mt-8 text-center text-sm text-gray-500">No certifications added yet. Update your profile to add certifications.</div>
          )}
        </div>
      )}
    </div>
  );
}
