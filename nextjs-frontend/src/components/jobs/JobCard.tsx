'use client';

import Link from 'next/link';
import { MapPin, Clock, DollarSign, Users, Star, Shield, Zap, AlertCircle } from 'lucide-react';
import { Job } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ShareButton from '@/components/ui/ShareButton';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface JobCardProps {
  job: Job;
}

const listingTypeColor: Record<string, string> = {
  hiring: 'info',
  offering: 'success',
  seeking: 'warning',
};

// Coerce location to string in case Firestore stored it as {city, country}
function locationString(loc: unknown): string {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  const o = loc as Record<string, unknown>;
  return [o.city, o.country].filter(Boolean).join(', ');
}

function isExpiringSoon(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return false;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < 24 * 60 * 60 * 1000; // <24h remaining
}

export default function JobCard({ job }: JobCardProps) {
  const expiringSoon = isExpiringSoon((job as any).featuredExpiresAt);

  return (
    <Link href={`/jobs/${job.id}`} className="group block">
      <Card className="h-full cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
        <CardContent className="py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={(listingTypeColor[job.listingType] as any) ?? 'default'}>
                  {job.listingType === 'hiring' ? 'Hiring' : job.listingType === 'offering' ? 'Service' : 'Seeking Work'}
                </Badge>
                {job.isFeatured && !expiringSoon && <Badge variant="warning">⭐ Featured</Badge>}
                {job.isFeatured && expiringSoon && (
                  <Badge variant="danger" className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Expiring Soon
                  </Badge>
                )}
                {(job as any).isApplicationBoosted && (
                  <Badge variant="info" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Boosted
                  </Badge>
                )}
                {job.isVerified && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <Shield className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>

              <h3 className="mt-2.5 text-base font-semibold text-gray-900 line-clamp-2 transition-colors group-hover:text-infra-primary">{job.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-500 line-clamp-2">{job.description}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {locationString(job.location)}{job.country ? `, ${job.country}` : ''}
              {job.isRemote && ' · Remote OK'}
            </span>
            {job.budget && (
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                {formatCurrency(job.budget, job.currency)}
              </span>
            )}
            {job.applicationsCount > 0 && (
              <span className="flex items-center gap-1 font-medium text-infra-primary">
                <Users className="h-3.5 w-3.5" />
                {job.applicationsCount} applicant{job.applicationsCount !== 1 ? 's' : ''}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {formatRelativeTime(job.createdAt)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3.5 text-xs text-gray-500">
            <div className="flex items-center gap-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-infra-primary text-[10px] font-bold text-white shadow-sm shadow-infra-primary/20">
                {job.postedByName[0]?.toUpperCase()}
              </div>
              <span className="font-medium">{job.postedByName}</span>
            </div>
            <ShareButton
              path={`/jobs/${job.id}`}
              entityId={job.id}
              type="job"
              title={job.title}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
