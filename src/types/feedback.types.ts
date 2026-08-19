export type FeedbackType = 'BUG_APP' | 'INCIDENT_TRACK' | 'IDEA';
export type FeedbackStatus = 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'RESOLVED' | 'DONE' | 'REJECTED';
export type FeedbackSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FeedbackAuthor {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

export interface FeedbackItem {
  id: string;
  author_id: string;
  type: FeedbackType;
  category: string;
  title: string;
  description: string;
  severity: FeedbackSeverity;
  status: FeedbackStatus;
  admin_response?: string | null;
  responded_by?: string | null;
  responded_at?: string | null;
  votes_count: number;
  created_at: string;
  updated_at: string;
  // Données jointes / enrichies
  author?: FeedbackAuthor | null;
  has_voted_by_user?: boolean;
  responder?: FeedbackAuthor | null;
}

export interface FeedbackVote {
  id: string;
  feedback_id: string;
  member_id: string;
  created_at: string;
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  category: string;
  title: string;
  description: string;
  severity?: FeedbackSeverity;
}

export interface UpdateFeedbackStatusInput {
  feedbackId: string;
  status: FeedbackStatus;
  adminResponse?: string | null;
}
