-- Guarantees one review per user per city. The application-level check in
-- submitReview loses the race when two submissions land concurrently.
--
-- If this fails with a duplicate key error, list the offending rows first:
--   SELECT "cityId", "userId", COUNT(*) FROM "Review"
--   WHERE "userId" IS NOT NULL
--   GROUP BY "cityId", "userId" HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX "Review_cityId_userId_key" ON "Review"("cityId", "userId");
