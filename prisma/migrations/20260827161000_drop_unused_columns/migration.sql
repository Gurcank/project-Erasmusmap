-- Columns that were declared but never written or read by the application.
-- All of them are NULL for every existing row: the seed never populates
-- City.description/latitude/longitude, and no code path has ever set
-- Review.ipAddress/userAgent.
ALTER TABLE "Review" DROP COLUMN "ipAddress",
DROP COLUMN "userAgent";

ALTER TABLE "City" DROP COLUMN "description",
DROP COLUMN "latitude",
DROP COLUMN "longitude";
