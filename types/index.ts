export type City = {
  id: string;
  name: string;
  slug: string;
  country: string;
  regionSlug?: string;
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
