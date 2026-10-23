-- Two things the schema cannot say on its own.
--
-- 1. CHECK constraints. Prisma has no syntax for them, so they live only here.
--    Each one is a backstop for a rule the application already enforces (see the
--    schemas in lib/): a request that gets past the form code, or a script run
--    by hand, still cannot write a rating of 40 or a trip that ends before it
--    starts. They are deliberately limited to rules that cannot change with a
--    product decision; limits that are tuned in code (how many items a trip may
--    hold, how long a title may be) are not repeated here.
--
-- 2. Indexes on foreign keys that had none. Deleting a user (an account delete,
--    now) or a city (scripts/prune-cities.ts) cascades into these tables, and
--    without an index each cascade scans the whole table.

-- ─── Reviews ────────────────────────────────────────────────────────────────
-- Stored on a 1-10 scale (10 = 5 stars); an unrated category is NULL.
ALTER TABLE "Review" ADD CONSTRAINT "Review_ratings_range_check" CHECK (
  ("culture"      IS NULL OR "culture"      BETWEEN 1 AND 10) AND
  ("gastronomy"   IS NULL OR "gastronomy"   BETWEEN 1 AND 10) AND
  ("safety"       IS NULL OR "safety"       BETWEEN 1 AND 10) AND
  ("socialLife"   IS NULL OR "socialLife"   BETWEEN 1 AND 10) AND
  ("transport"    IS NULL OR "transport"    BETWEEN 1 AND 10) AND
  ("costOfLiving" IS NULL OR "costOfLiving" BETWEEN 1 AND 10)
);

-- ─── Visits, favourites, social graph ───────────────────────────────────────
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_dates_order_check" CHECK (
  "startDate" IS NULL OR "endDate" IS NULL OR "startDate" <= "endDate"
);

-- Four slots, numbered 0-3 (MAX_FAVORITE_CITIES in lib/profile.ts is 4).
ALTER TABLE "FavoriteCity" ADD CONSTRAINT "FavoriteCity_position_range_check" CHECK (
  "position" BETWEEN 0 AND 3
);

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_not_self_check" CHECK (
  "followerId" <> "followingId"
);
ALTER TABLE "Block" ADD CONSTRAINT "Block_not_self_check" CHECK (
  "blockerId" <> "blockedId"
);

-- ─── Trips ──────────────────────────────────────────────────────────────────
-- Money is in minor units (cents) and is never negative.
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_dates_order_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_budget_check" CHECK ("budget" >= 0);
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_currency_check" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_amount_check" CHECK ("amount" >= 0);

ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_times_order_check" CHECK (
  "endAt" IS NULL OR "endAt" >= "startAt"
);
-- A point is a latitude and a longitude together, or neither.
ALTER TABLE "TripItem" ADD CONSTRAINT "TripItem_coordinates_check" CHECK (
  ("lat" IS NULL) = ("lng" IS NULL) AND
  ("toLat" IS NULL) = ("toLng" IS NULL) AND
  ("lat"   IS NULL OR "lat"   BETWEEN -90  AND 90)  AND
  ("lng"   IS NULL OR "lng"   BETWEEN -180 AND 180) AND
  ("toLat" IS NULL OR "toLat" BETWEEN -90  AND 90)  AND
  ("toLng" IS NULL OR "toLng" BETWEEN -180 AND 180)
);

-- ─── Cities ─────────────────────────────────────────────────────────────────
ALTER TABLE "City" ADD CONSTRAINT "City_coordinates_check" CHECK (
  ("latitude"  IS NULL OR "latitude"  BETWEEN -90  AND 90) AND
  ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180)
);

-- ─── Usernames ──────────────────────────────────────────────────────────────
-- The shape lib/username.ts enforces, and the lowercase mirror every lookup and
-- the unique index go through: "Ada" and "ada" must never both exist.
ALTER TABLE "User" ADD CONSTRAINT "User_username_format_check" CHECK (
  "username" IS NULL OR "username" ~ '^[A-Za-z0-9_-]{3,20}$'
);
ALTER TABLE "User" ADD CONSTRAINT "User_usernameLower_mirror_check" CHECK (
  "usernameLower" IS NOT DISTINCT FROM lower("username")
);

-- ─── Indexes on foreign keys ────────────────────────────────────────────────
CREATE INDEX "Account_userId_idx" ON "Account"("userId");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "FavoriteCity_cityId_idx" ON "FavoriteCity"("cityId");
CREATE INDEX "TripCity_cityId_idx" ON "TripCity"("cityId");
CREATE INDEX "TripExpense_cityId_idx" ON "TripExpense"("cityId");
CREATE INDEX "TripItem_cityId_idx" ON "TripItem"("cityId");
CREATE INDEX "TripItem_toCityId_idx" ON "TripItem"("toCityId");
