-- Reviews publish immediately and no approval flow exists; the column was
-- always written as true and never read. Moderation uses Review.flagged.
ALTER TABLE "Review" DROP COLUMN "isApproved";
