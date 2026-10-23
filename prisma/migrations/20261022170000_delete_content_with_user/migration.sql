-- A person who deletes their account takes their reviews and comments with
-- them, instead of leaving them behind as anonymous text. Reviews and comments
-- were SET NULL on user delete; they now cascade.
--
-- Rows already orphaned by an earlier delete (userId NULL) are removed first,
-- comments before the reviews they hang off.
DELETE FROM "ReviewComment" WHERE "userId" IS NULL;
DELETE FROM "Review" WHERE "userId" IS NULL;

ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewComment" DROP CONSTRAINT "ReviewComment_userId_fkey";
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
