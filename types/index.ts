export type City = {
  id: string;
  name: string;
  slug: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
};

/** Search results only need what the suggestion row renders. */
export type CitySuggestion = {
  id: string;
  name: string;
  slug: string;
  country: string;
  /** Used by the trip planner to bias place search towards the city. */
  latitude?: number | null;
  longitude?: number | null;
};

export type ReviewAuthor = {
  id: string;
  name: string | null;
  avatar: string | null;
  username: string | null;
};

// City-level averages: every category resolves to a number (an unrated one
// defaults to 0), so this stays non-nullable.
export type CategoryRatings = {
  culture: number;
  gastronomy: number;
  safety: number;
  socialLife: number;
  transport: number;
  costOfLiving: number;
};

// A single review's ratings: any category may be unset, so a stored value is
// a number or null.
export type ReviewRatings = {
  culture: number | null;
  gastronomy: number | null;
  safety: number | null;
  socialLife: number | null;
  transport: number | null;
  costOfLiving: number | null;
};

export type CityReview = ReviewRatings & {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
};

/**
 * A comment on a review. Two levels only: a top-level comment carries its
 * replies, and a reply's own `replies` is always empty — replying to a reply
 * attaches to the same parent, the way Instagram does it.
 */
export type ReviewComment = {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
  likeCount: number;
  likedByViewer: boolean;
  replies: ReviewComment[];
};

/** A review with everything the shared card renders. */
export type EngagedReview = ReviewRatings & {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
  likeCount: number;
  likedByViewer: boolean;
  comments: ReviewComment[];
  /** Set when the card is shown away from the city's own page. */
  city?: { name: string; slug: string };
  /** The reviewer's recorded stay in this city, if they gave dates. */
  stayStart?: Date | null;
  stayEnd?: Date | null;
};
