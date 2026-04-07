'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  MapPin, Briefcase, Star, Shield, UserPlus, MessageSquare, Award, ArrowLeft,
} from 'lucide-react';
import api from '@/lib/api';
import { UserProfile } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { analytics } from '@/lib/analytics';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ShareButton from '@/components/ui/ShareButton';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Review {
  id: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const qc = useQueryClient();

  // Review form state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile', id],
    queryFn: async () => {
      const res = await api.get(`/users/profile/${id}`);
      analytics.profileViewed(id, res.data.data?.displayName);
      return res.data.data;
    },
  });

  const { data: reviewStats } = useQuery<ReviewStats>({
    queryKey: ['review-stats', id],
    queryFn: async () => {
      const res = await api.get(`/reviews/user/${id}/stats`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery<Review[]>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const res = await api.get(`/reviews/user/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const connectMutation = useMutation({
    mutationFn: () => api.post('/comms/connections', { receiverId: id }),
    onSuccess: () => {
      analytics.connectClicked(id);
      qc.invalidateQueries({ queryKey: ['profile', id] });
    },
    onError: () => toast.error('Failed to send connection request.'),
  });

  const reviewMutation = useMutation({
    mutationFn: () => api.post('/reviews', {
      reviewedUserId: id,
      rating: reviewRating,
      comment: reviewComment,
      reviewType: 'general',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', id] });
      qc.invalidateQueries({ queryKey: ['review-stats', id] });
      setReviewRating(0);
      setReviewComment('');
      setShowReviewForm(false);
    },
    onError: () => toast.error('Failed to submit review. Please try again.'),
  });

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!profile) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <p className="text-gray-500">Profile not found.</p>
      <Link href="/search"><Button variant="outline">Explore Professionals</Button></Link>
    </div>
  );

  const isOwnProfile = user?.uid === id;
  const verificationBadge = profile.verificationStatus !== 'unverified';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/search?tab=professionals" className="group mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-infra-primary">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 text-center">
              {/* Avatar */}
              <div className="relative mx-auto mb-4 h-24 w-24">
                {profile.photoURL ? (
                  <Image src={profile.photoURL} alt={profile.displayName} fill className="rounded-2xl object-cover" sizes="96px" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-infra-primary to-infra-primary text-3xl font-semibold text-white shadow-lg shadow-infra-primary/20">
                    {getInitials(profile.displayName)}
                  </div>
                )}
                {verificationBadge && (
                  <div className="absolute -bottom-1 -right-1 rounded-xl bg-white p-1 shadow-md">
                    <Shield className="h-5 w-5 text-emerald-500" />
                  </div>
                )}
              </div>

              <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
              {profile.jobTitle && <p className="mt-1 text-sm text-gray-500">{profile.jobTitle}</p>}

              <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                {verificationBadge && <Badge variant="success">Verified</Badge>}
                {profile.role && <Badge variant="default" className="capitalize">{profile.role}</Badge>}
              </div>

              {reviewStats && reviewStats.totalReviews > 0 && (
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-amber-700">{reviewStats.averageRating.toFixed(1)}</span>
                  <span className="text-gray-500">({reviewStats.totalReviews} reviews)</span>
                </div>
              )}

              {(profile.city || profile.country) && (
                <p className="mt-2 flex items-center justify-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3.5 w-3.5" />
                  {profile.city ? `${profile.city}, ` : ''}{profile.country}
                </p>
              )}

              {user && !isOwnProfile && (
                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    className="w-full gap-1"
                    onClick={() => connectMutation.mutate()}
                    loading={connectMutation.isPending}
                    variant="outline"
                  >
                    <UserPlus className="h-4 w-4" /> Connect
                  </Button>
                  <Link href={`/messages?with=${id}`} className="block">
                    <Button className="w-full gap-1">
                      <MessageSquare className="h-4 w-4" /> Message
                    </Button>
                  </Link>
                </div>
              )}

              {isOwnProfile && (
                <Link href="/profile" className="mt-4 block">
                  <Button variant="outline" className="w-full">Edit Profile</Button>
                </Link>
              )}

              {/* Share this profile */}
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-400">
                <span>Share profile</span>
                <ShareButton
                  path={`/profile/${id}`}
                  entityId={id as string}
                  type="profile"
                  title={profile.displayName}
                />
              </div>
            </CardContent>
          </Card>

          {/* Disciplines */}
          {profile.disciplines && profile.disciplines.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-2 text-sm font-semibold text-gray-700">Disciplines</h3>
                <div className="flex flex-wrap gap-1.5">
                  {profile.disciplines.map((d: string) => (
                    <Badge key={d} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Bio */}
          {profile.bio && (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-2 font-semibold text-gray-800 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" /> About
                </h2>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{profile.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Certifications */}
          {profile.certifications && profile.certifications.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-3 font-semibold text-gray-800 flex items-center gap-2">
                  <Award className="h-4 w-4 text-gray-400" /> Certifications
                </h2>
                <ul className="space-y-2">
                  {profile.certifications.map((cert, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-infra-primary shrink-0" />
                      {cert.certificationName}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Reviews */}
          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Star className="h-4 w-4 text-gray-400" /> Reviews
                  {reviewStats && reviewStats.totalReviews > 0 && (
                    <span className="text-sm text-gray-500">({reviewStats.totalReviews})</span>
                  )}
                </h2>
                {user && !isOwnProfile && !showReviewForm && (
                  <Button variant="outline" size="sm" onClick={() => setShowReviewForm(true)}>
                    Write a Review
                  </Button>
                )}
              </div>

              {/* Write Review Form */}
              {showReviewForm && (
                <div className="mb-5 rounded-xl border border-infra-primary/20 bg-infra-primary/5/40 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-700">Your Review</p>

                  {/* Star picker */}
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        onMouseEnter={() => setReviewHover(star)}
                        onMouseLeave={() => setReviewHover(0)}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            star <= (reviewHover || reviewRating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-infra-primary focus:outline-none focus:ring-2 focus:ring-infra-primary/20"
                    rows={3}
                    placeholder="Share your experience working with this professional..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                  />

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => reviewMutation.mutate()}
                      disabled={reviewRating === 0 || !reviewComment.trim() || reviewMutation.isPending}
                      loading={reviewMutation.isPending}
                    >
                      Submit Review
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowReviewForm(false)}>
                      Cancel
                    </Button>
                  </div>
                  {reviewMutation.isError && (
                    <p className="mt-2 text-xs text-red-600">{(reviewMutation.error as Error).message}</p>
                  )}
                </div>
              )}

              {reviews && reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{review.reviewerName}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No reviews yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
