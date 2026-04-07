'use client';

import Link from 'next/link';
import Image from 'next/image';
import { MapPin, DollarSign, Tag, Star, Shield, Zap, AlertCircle, BadgeCheck } from 'lucide-react';
import { Tool } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ShareButton from '@/components/ui/ShareButton';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';

interface ToolCardProps {
  tool: Tool;
}

const LISTING_LABELS: Record<string, string> = {
  selling: 'For Sale',
  renting: 'For Rent',
  wanted: 'Wanted',
};

const LISTING_BADGE: Record<string, 'success' | 'info' | 'default'> = {
  selling: 'success',
  renting: 'info',
  wanted: 'default',
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
  return diff > 0 && diff < 24 * 60 * 60 * 1000;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const primaryImageUrl = tool.images?.[0]?.url ?? null;
  const priceDisplay =
    tool.listingType === 'renting' && tool.dailyRate
      ? `${formatCurrency(tool.dailyRate, tool.currency ?? 'KES')}/day`
      : tool.price
      ? formatCurrency(tool.price, tool.currency ?? 'KES')
      : null;

  const expiringSoon = isExpiringSoon((tool as any).featuredExpiresAt);

  return (
    <Link href={`/tools/${tool.id}`} className="group block">
      <Card className="h-full transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5">
        {/* Image */}
        <div className="relative h-44 w-full overflow-hidden rounded-t-2xl bg-gray-100">
          {primaryImageUrl ? (
            <Image
              src={primaryImageUrl}
              alt={tool.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-5xl text-gray-300">🔧</div>
          )}
          {/* Overlay badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge variant={LISTING_BADGE[tool.listingType] ?? 'default'}>
              {LISTING_LABELS[tool.listingType] ?? tool.listingType}
            </Badge>
            {tool.isFeatured && !expiringSoon && <Badge variant="warning">⭐ Featured</Badge>}
            {tool.isFeatured && expiringSoon && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Expiring Soon
              </Badge>
            )}
          </div>
          {/* Boost badge — bottom right */}
          {(tool as any).isBoosted && (
            <div className="absolute bottom-2 right-2">
              <Badge variant="info" className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Boosted
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-5">
          {/* Title */}
          <h3 className="line-clamp-1 font-semibold text-gray-900 transition-colors group-hover:text-infra-primary">
            {tool.title}
          </h3>

          {/* Owner */}
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
            <span className="font-medium">{tool.ownerName}</span>
            {tool.isVerified && (
              <Shield className="h-3 w-3 text-emerald-500" aria-label="Verified listing" />
            )}
            {tool.ownerTier && tool.ownerTier !== 'free' && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-infra-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-infra-primary">
                <BadgeCheck className="h-2.5 w-2.5" />
                Verified Vendor
              </span>
            )}
          </div>

          {/* Description */}
          {tool.description && (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-500">{tool.description}</p>
          )}

          {/* Meta */}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
            {(tool.location || tool.country) && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-gray-400" />
                {[locationString(tool.location), tool.country].filter(Boolean).join(', ')}
              </span>
            )}
            {tool.category && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3 text-gray-400" />
                {tool.category}
              </span>
            )}
          </div>

          {/* Price + time */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3.5">
            {priceDisplay ? (
              <span className="flex items-center gap-1 font-semibold text-gray-900">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                {priceDisplay}
              </span>
            ) : (
              <span className="text-xs text-gray-400">Price on request</span>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">{formatRelativeTime(tool.createdAt)}</span>
              <ShareButton
                path={`/tools/${tool.id}`}
                entityId={tool.id}
                type="tool"
                title={tool.title}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

