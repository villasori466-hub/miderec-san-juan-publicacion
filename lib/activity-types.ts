export const dateStatuses = ["confirmed", "tbd"] as const;
export const eventStatuses = ["scheduled", "postponed", "cancelled"] as const;
export const editorialStatuses = ["draft", "scheduled", "published", "archived"] as const;
export const submissionStatuses = ["pending", "accepted", "rejected"] as const;

export type DateStatus = (typeof dateStatuses)[number];
export type EventStatus = (typeof eventStatuses)[number];
export type EditorialStatus = (typeof editorialStatuses)[number];
export type SubmissionStatus = (typeof submissionStatuses)[number];

export type ActivityInput = {
  slug: string;
  title: string;
  sport: string;
  municipality: string;
  venue: string;
  summary: string;
  dateStatus: DateStatus;
  startAt: number | null;
  endAt: number | null;
  eventStatus: EventStatus;
  editorialStatus: EditorialStatus;
  publishAt: number | null;
  unpublishAt: number | null;
  featured: boolean;
  imageUrl: string;
  videoUrl: string;
  registrationUrl: string;
};

export type ActivityChanges = Partial<ActivityInput>;

export type Activity = ActivityInput & {
  id: string;
  createdBy: string;
  updatedBy: string;
  createdAt: number;
  updatedAt: number;
  version: number;
};

export type PublicActivity = Omit<
  Activity,
  "createdBy" | "updatedBy" | "version"
>;

export type ActivitySubmissionInput = {
  title: string;
  sport: string;
  municipality: string;
  venue: string;
  summary: string;
  dateStatus: DateStatus;
  startAt: number | null;
  endAt: number | null;
  imageUrl: string;
  videoUrl: string;
  registrationUrl: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  consent: true;
};

export type SubmissionReviewInput = {
  action: "accept" | "reject";
  adminNote: string;
  activity: ActivityChanges;
};

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };
