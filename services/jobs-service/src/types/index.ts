import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    uid:     string;
    email?:  string;
    isAdmin?: boolean;
    subscriptionTier?: string;
  };
}

export interface Job {
  id?:                string;
  title:              string;
  description:        string;
  postedBy:           string;
  status:             'draft' | 'posted' | 'closed' | 'archived';
  listingType:        'full_time' | 'contract' | 'part_time' | 'freelance';
  category:           string;
  disciplines?:       string[];
  requiredDisciplines?: string[];
  requiredSpecialties?: string[];
  minExperience?:     number;
  country?:           string;
  city?:              string;
  isRemote?:          boolean;
  isFeatured?:        boolean;
  featuredExpiresAt?: any;
  applicationsCount?: number;
  currency?:          string;
  budgetMin?:         number;
  budgetMax?:         number;
  createdAt?:         any;
  updatedAt?:         any;
}

export interface JobApplication {
  id?:               string;
  jobId:             string;
  jobTitle:          string;
  applicantId:       string;
  applicantName:     string;
  applicantPhoto?:   string;
  coverLetter?:      string;
  proposedRate?:     number;
  currency?:         string;
  status:            'pending' | 'shortlisted' | 'rejected' | 'hired';
  matchScore?:       number;
  matchGrade?:       string;
  matchBreakdown?:   any[];
  matchScoredAt?:    string;
  appliedDateKey:    string;
  createdAt?:        any;
  updatedAt?:        any;
}
