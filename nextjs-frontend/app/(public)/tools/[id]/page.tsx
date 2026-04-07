'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, DollarSign, Tag, Star, Shield, Bookmark, BookmarkCheck,
  ArrowLeft, MessageSquare, Pencil, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '@/lib/api';
import { Tool } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const LISTING_LABELS: Record<string, string> = { selling: 'For Sale', renting: 'For Rent', wanted: 'Wanted' };
const LISTING_BADGE: Record<string, 'success' | 'info' | 'default'> = { selling: 'success', renting: 'info', wanted: 'default' };

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [imgIndex, setImgIndex] = useState(0);

  const { data: tool, isLoading } = useQuery<Tool>({
    queryKey: ['tool', id],
    queryFn: async () => {
      const res = await api.get(`/tools/${id}`);
      return res.data.data;
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => api.post(`/tools/${id}/bookmark`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tool', id] }),
    onError: () => toast.error('Failed to update bookmark.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tools/${id}`),
    onSuccess: () => router.push('/tools'),
    onError: () => toast.error('Failed to delete listing.'),
  });

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!tool) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Equipment listing not found.</p>
      <Link href="/tools"><Button variant="outline">Back to Equipment</Button></Link>
    </div>
  );

  const isOwner = user?.uid === tool.ownerId;
  const isBookmarked = false; // bookmark state tracked server-side; toggle via API
  const images = tool.images ?? [];
  const priceDisplay = tool.listingType === 'renting' && tool.dailyRate
    ? `${formatCurrency(tool.dailyRate, tool.currency ?? 'KES')}/day`
    : tool.price ? formatCurrency(tool.price, tool.currency ?? 'KES') : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/tools" className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-infra-primary">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Equipment
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image carousel */}
          {images.length > 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-gray-100" style={{ height: 360 }}>
              <Image src={images[imgIndex].url} alt={tool.title} fill className="object-cover" sizes="100vw" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
                  ><ChevronLeft className="h-5 w-5" /></button>
                  <button
                    onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl"
                  ><ChevronRight className="h-5 w-5" /></button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-black/20 px-3 py-1.5 backdrop-blur-sm">
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIndex(i)} className={`h-2 w-2 rounded-full transition-all ${i === imgIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/70'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 text-6xl text-gray-300">🔧</div>
          )}

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant={LISTING_BADGE[tool.listingType] ?? 'default'}>{LISTING_LABELS[tool.listingType]}</Badge>
                    {tool.condition && <Badge variant="outline" className="capitalize">{tool.condition}</Badge>}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{tool.title}</h1>
                  <p className="mt-1 text-sm text-gray-500">{tool.ownerName} · {formatRelativeTime(tool.createdAt)}</p>
                </div>
                {user && !isOwner && (
                  <button onClick={() => bookmarkMutation.mutate()} className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-infra-primary">
                    {isBookmarked ? <BookmarkCheck className="h-5 w-5 text-infra-primary" /> : <Bookmark className="h-5 w-5" />}
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                {priceDisplay && (
                  <span className="flex items-center gap-1 font-semibold text-gray-900">
                    <DollarSign className="h-4 w-4 text-green-500" />{priceDisplay}
                  </span>
                )}
                {(tool.location || tool.country) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    {[tool.location, tool.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {tool.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="h-4 w-4 text-gray-400" />{tool.category}
                  </span>
                )}
              </div>

              <hr className="my-5" />
              <p className="whitespace-pre-wrap text-sm text-gray-700">{tool.description}</p>

              {isOwner ? (
                <div className="mt-6 flex gap-3">
                  <Link href={`/tools/${id}/edit`}><Button variant="outline" className="gap-1"><Pencil className="h-4 w-4" /> Edit</Button></Link>
                  <Button variant="danger" className="gap-1" loading={deleteMutation.isPending}
                    onClick={() => { if (confirm('Delete this listing?')) deleteMutation.mutate(); }}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>
              ) : user ? (
                <Button className="mt-6 gap-1" onClick={() => router.push(`/messages?with=${tool.ownerId}`)}>
                  <MessageSquare className="h-4 w-4" /> Contact Owner
                </Button>
              ) : (
                <Link href="/login" className="mt-6 inline-block"><Button>Sign in to Contact</Button></Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 font-semibold text-gray-800">Owner</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-infra-primary text-white font-semibold shadow-md shadow-infra-primary/20">
                  {(tool.ownerName ?? 'U')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{tool.ownerName}</p>
                  {tool.isVerified && (
                    <div className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-infra-primary" />
                      <span className="text-xs text-gray-500">Verified</span>
                    </div>
                  )}
                </div>
              </div>
              {user && !isOwner && (
                <Link href={`/profile/${tool.ownerId}`} className="mt-4 block">
                  <Button variant="outline" className="w-full text-sm">View Profile</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
