-- Ratings become optional: a review can be text only, and an unrated category
-- is simply left out of the averages.
ALTER TABLE "Review" ALTER COLUMN "culture" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "gastronomy" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "safety" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "socialLife" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "transport" DROP NOT NULL;
ALTER TABLE "Review" ALTER COLUMN "costOfLiving" DROP NOT NULL;
