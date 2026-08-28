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
};

export type ReviewAuthor = {
  id: string;
  name: string | null;
  image: string | null;
  username: string | null;
};

export type CategoryRatings = {
  culture: number;
  gastronomy: number;
  safety: number;
  socialLife: number;
  transport: number;
  costOfLiving: number;
};

export type CityReview = CategoryRatings & {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
};

export type ProfileReview = CategoryRatings & {
  id: string;
  content: string;
  createdAt: Date;
  city: {
    name: string;
    slug: string;
  };
};

export type ReviewReply = {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
};

/** A review with everything the shared card renders. */
export type EngagedReview = CategoryRatings & {
  id: string;
  content: string;
  createdAt: Date;
  user: ReviewAuthor | null;
  likeCount: number;
  likedByViewer: boolean;
  replies: ReviewReply[];
  /** Set when the card is shown away from the city's own page. */
  city?: { name: string; slug: string };
};
