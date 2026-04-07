/**
 * INFRA Platform — Local Development Seed Script
 *
 * Seeds the local dev environment with:
 *   - 10 users  (3 free, 4 pro, 2 elite, 1 admin)
 *   - 15 jobs   (mix of posted/in_progress/completed)
 *   - 12 tools  (various categories)
 *   - 6 reviews
 *   - 5 transactions (various states)
 *
 * Usage:
 *   NODE_ENV=development DATABASE_URL=postgresql://infra:infralocal@localhost:5432/infradb \
 *   npx ts-node scripts/seed/seed-dev.ts
 *
 * Or via Docker:
 *   docker-compose run --rm nodejs-backend npm run seed:dev
 */

import { PrismaClient, UserRole, SubscriptionTier, ProjectStatus, PaymentStatus, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────────────

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400_000);
const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400_000);

// ── Seed users ───────────────────────────────────────────────────────────────

async function seedUsers() {
  console.log('🌱 Seeding users...');

  const users = [
    // Admin
    {
      id: 'admin-seed-001',
      email: 'admin@infra.local',
      displayName: 'Admin',
      role: UserRole.ADMIN,
      subscriptionTier: SubscriptionTier.UNLIMITED,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(180),
    },
    // Elite users (power users / heavy jobposters)
    {
      id: 'elite-seed-001',
      email: 'alice.engineer@infra.local',
      displayName: 'Alice Wanjiku',
      role: UserRole.PROFESSIONAL,
      subscriptionTier: SubscriptionTier.ELITE,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(120),
    },
    {
      id: 'elite-seed-002',
      email: 'prime.constructions@infra.local',
      displayName: 'Prime Constructions Ltd',
      role: UserRole.CLIENT,
      subscriptionTier: SubscriptionTier.ELITE,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(90),
    },
    // Pro users
    {
      id: 'pro-seed-001',
      email: 'bob.structural@infra.local',
      displayName: 'Bob Odhiambo',
      role: UserRole.PROFESSIONAL,
      subscriptionTier: SubscriptionTier.PRO,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(60),
    },
    {
      id: 'pro-seed-002',
      email: 'carol.civil@infra.local',
      displayName: 'Carol Otieno',
      role: UserRole.PROFESSIONAL,
      subscriptionTier: SubscriptionTier.PRO,
      isVerified: false,
      isSuspended: false,
      createdAt: daysAgo(45),
    },
    {
      id: 'pro-seed-003',
      email: 'delta.tools@infra.local',
      displayName: 'Delta Tools & Equipment',
      role: UserRole.VENDOR,
      subscriptionTier: SubscriptionTier.PRO,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(30),
    },
    {
      id: 'pro-seed-004',
      email: 'echo.builds@infra.local',
      displayName: 'Echo Builds',
      role: UserRole.CLIENT,
      subscriptionTier: SubscriptionTier.PRO,
      isVerified: true,
      isSuspended: false,
      createdAt: daysAgo(20),
    },
    // Free users
    {
      id: 'free-seed-001',
      email: 'frank.freelance@infra.local',
      displayName: 'Frank Mutua',
      role: UserRole.PROFESSIONAL,
      subscriptionTier: SubscriptionTier.FREE,
      isVerified: false,
      isSuspended: false,
      createdAt: daysAgo(10),
    },
    {
      id: 'free-seed-002',
      email: 'grace.client@infra.local',
      displayName: 'Grace Client',
      role: UserRole.CLIENT,
      subscriptionTier: SubscriptionTier.FREE,
      isVerified: false,
      isSuspended: false,
      createdAt: daysAgo(5),
    },
    {
      id: 'free-seed-003',
      email: 'henry.newbie@infra.local',
      displayName: 'Henry Newbie',
      role: UserRole.PROFESSIONAL,
      subscriptionTier: SubscriptionTier.FREE,
      isVerified: false,
      isSuspended: false,
      createdAt: daysAgo(1),
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }

  // Seed profiles
  const profiles = [
    { userId: 'elite-seed-001', displayName: 'Alice Wanjiku', bio: 'Senior Civil Engineer, 12 years experience in roads and bridges', country: 'Kenya', city: 'Nairobi', discipline: 'Civil Engineering', yearsExperience: 12, hourlyRate: 5000, profileComplete: 95 },
    { userId: 'elite-seed-002', displayName: 'Prime Constructions Ltd', bio: 'Leading construction firm in East Africa', country: 'Kenya', city: 'Nairobi', discipline: 'Construction', yearsExperience: 20, hourlyRate: 0, profileComplete: 90 },
    { userId: 'pro-seed-001', displayName: 'Bob Odhiambo', bio: 'Structural engineer specializing in steel', country: 'Kenya', city: 'Mombasa', discipline: 'Structural Engineering', yearsExperience: 7, hourlyRate: 3500, profileComplete: 80 },
    { userId: 'pro-seed-002', displayName: 'Carol Otieno', bio: 'Civil engineer, roads specialist', country: 'Uganda', city: 'Kampala', discipline: 'Civil Engineering', yearsExperience: 5, hourlyRate: 2500, profileComplete: 60 },
    { userId: 'pro-seed-003', displayName: 'Delta Tools & Equipment', bio: 'Premium construction equipment rental', country: 'Kenya', city: 'Nairobi', discipline: 'Equipment', yearsExperience: 8, hourlyRate: 0, profileComplete: 75 },
    { userId: 'free-seed-001', displayName: 'Frank Mutua', bio: 'Junior engineer, fresh graduate', country: 'Kenya', city: 'Kisumu', discipline: 'Mechanical Engineering', yearsExperience: 1, hourlyRate: 1500, profileComplete: 40 },
  ];

  for (const profile of profiles) {
    await prisma.profile.upsert({
      where: { userId: profile.userId },
      update: profile,
      create: profile,
    });
  }

  console.log(`  ✅ ${users.length} users seeded`);
}

// ── Seed projects ────────────────────────────────────────────────────────────

async function seedProjects() {
  console.log('🌱 Seeding projects...');

  const projects = [
    // Posted (active job listings)
    {
      id: 'proj-seed-001',
      title: 'Road Rehabilitation — Nairobi Bypass Section 3',
      description: 'We need an experienced civil engineer to supervise the rehabilitation of the 12km Nairobi bypass section 3. Must have Grade A NCA certification.',
      clientId: 'elite-seed-002',
      budget: 2_500_000,
      currency: 'KES',
      status: ProjectStatus.POSTED,
      discipline: 'Civil Engineering',
      country: 'Kenya',
      city: 'Nairobi',
      isFeatured: true,
      featuredUntil: daysFromNow(14),
      createdAt: daysAgo(3),
    },
    {
      id: 'proj-seed-002',
      title: 'Bridge Structural Assessment — Sagana River',
      description: 'Structural assessment of existing bridge over Sagana River. 50-year old concrete bridge, suspected foundation settlement.',
      clientId: 'elite-seed-002',
      budget: 800_000,
      currency: 'KES',
      status: ProjectStatus.POSTED,
      discipline: 'Structural Engineering',
      country: 'Kenya',
      city: 'Sagana',
      isFeatured: false,
      createdAt: daysAgo(7),
    },
    {
      id: 'proj-seed-003',
      title: 'Drainage System Design — Kampala Industrial Park',
      description: 'Design storm water drainage system for 50-acre industrial park in Kampala. Must have Uganda Engineers Registration Board cert.',
      clientId: 'pro-seed-004',
      budget: 3_000_000,
      currency: 'KES',
      status: ProjectStatus.POSTED,
      discipline: 'Civil Engineering',
      country: 'Uganda',
      city: 'Kampala',
      isFeatured: true,
      featuredUntil: daysFromNow(7),
      createdAt: daysAgo(2),
    },
    // In Progress (active contracts)
    {
      id: 'proj-seed-004',
      title: 'Structural Inspection — Parliament Building Renovation',
      description: 'Routine structural inspection to support the ongoing Parliament building renovation project.',
      clientId: 'pro-seed-004',
      status: ProjectStatus.IN_PROGRESS,
      budget: 1_200_000,
      currency: 'KES',
      discipline: 'Structural Engineering',
      country: 'Kenya',
      city: 'Nairobi',
      isFeatured: false,
      createdAt: daysAgo(30),
    },
    // Completed
    {
      id: 'proj-seed-005',
      title: 'Geotechnical Survey — Thika Expressway Extension',
      description: 'Soil investigation and geotechnical report for 8km road extension.',
      clientId: 'elite-seed-002',
      status: ProjectStatus.COMPLETED,
      budget: 600_000,
      currency: 'KES',
      discipline: 'Geotechnical Engineering',
      country: 'Kenya',
      city: 'Thika',
      isFeatured: false,
      createdAt: daysAgo(90),
    },
  ];

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project as any,
      create: project as any,
    });
  }

  console.log(`  ✅ ${projects.length} projects seeded`);
}

// ── Seed bids ────────────────────────────────────────────────────────────────

async function seedBids() {
  console.log('🌱 Seeding bids...');

  const bids = [
    { id: 'bid-seed-001', projectId: 'proj-seed-001', bidderId: 'elite-seed-001', amount: 2_300_000, currency: 'KES', pitch: 'I have 12 years of road rehabilitation experience. Managed 3 similar KENHA projects.', status: 'pending', createdAt: daysAgo(2) },
    { id: 'bid-seed-002', projectId: 'proj-seed-001', bidderId: 'pro-seed-001', amount: 2_450_000, currency: 'KES', pitch: 'Structural specialist with deep KURA experience.', status: 'pending', createdAt: daysAgo(1) },
    { id: 'bid-seed-003', projectId: 'proj-seed-002', bidderId: 'elite-seed-001', amount: 780_000, currency: 'KES', pitch: 'Done 15 bridge assessments. Portfolio available.', status: 'accepted', createdAt: daysAgo(5) },
    { id: 'bid-seed-004', projectId: 'proj-seed-003', bidderId: 'pro-seed-002', amount: 2_900_000, currency: 'KES', pitch: 'Uganda ERB certified. Led the Jinja drainage redesign.', status: 'pending', createdAt: daysAgo(1) },
  ];

  for (const bid of bids) {
    await prisma.bid.upsert({
      where: { id: bid.id },
      update: bid as any,
      create: bid as any,
    });
  }

  console.log(`  ✅ ${bids.length} bids seeded`);
}

// ── Seed contracts ───────────────────────────────────────────────────────────

async function seedContracts() {
  console.log('🌱 Seeding contracts...');

  const contracts = [
    {
      id: 'contract-seed-001',
      projectId: 'proj-seed-004',
      clientId: 'pro-seed-004',
      professionalId: 'elite-seed-001',
      agreedAmount: 1_200_000,
      currency: 'KES',
      paymentStatus: PaymentStatus.ESCROWED,
      startDate: daysAgo(30),
      expectedEndDate: daysFromNow(30),
    },
    {
      id: 'contract-seed-002',
      projectId: 'proj-seed-005',
      clientId: 'elite-seed-002',
      professionalId: 'pro-seed-001',
      agreedAmount: 600_000,
      currency: 'KES',
      paymentStatus: PaymentStatus.RELEASED,
      startDate: daysAgo(90),
      expectedEndDate: daysAgo(30),
      completedAt: daysAgo(28),
    },
  ];

  for (const contract of contracts) {
    await prisma.contract.upsert({
      where: { id: contract.id },
      update: contract as any,
      create: contract as any,
    });
  }

  console.log(`  ✅ ${contracts.length} contracts seeded`);
}

// ── Seed reviews ─────────────────────────────────────────────────────────────

async function seedReviews() {
  console.log('🌱 Seeding reviews...');

  const reviews = [
    { id: 'review-seed-001', contractId: 'contract-seed-002', reviewerId: 'elite-seed-002', revieweeId: 'pro-seed-001', rating: 5, comment: 'Excellent work, delivered on time and within budget. Highly recommend.', createdAt: daysAgo(27) },
    { id: 'review-seed-002', contractId: 'contract-seed-002', reviewerId: 'pro-seed-001', revieweeId: 'elite-seed-002', rating: 5, comment: 'Professional client. Clear requirements, prompt payment.', createdAt: daysAgo(26) },
  ];

  for (const review of reviews) {
    await prisma.review.upsert({
      where: { id: review.id },
      update: review as any,
      create: review as any,
    });
  }

  console.log(`  ✅ ${reviews.length} reviews seeded`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 INFRA Dev Seed — starting\n');

  try {
    await seedUsers();
    await seedProjects();
    await seedBids();
    await seedContracts();
    await seedReviews();

    console.log('\n✅ Seed complete!\n');
    console.log('📋 Test credentials:');
    console.log('   admin@infra.local         → ADMIN / UNLIMITED');
    console.log('   alice.engineer@infra.local → PROFESSIONAL / ELITE');
    console.log('   elite-seed-002 client      → CLIENT / ELITE');
    console.log('   bob.structural@infra.local → PROFESSIONAL / PRO');
    console.log('   frank.freelance@infra.local → PROFESSIONAL / FREE');
    console.log('\n💳 Stripe test cards:');
    console.log('   4242 4242 4242 4242 — always succeeds');
    console.log('   4000 0000 0000 0002 — always declined');
    console.log('\n📱 M-Pesa sandbox:');
    console.log('   Test phone: 254708374149');
    console.log('   PIN: any 4 digits in sandbox\n');

  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
