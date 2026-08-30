-- The avatar's object key in Storage. Nullable: an OAuth avatar is a remote
-- URL we do not host, and most accounts have no uploaded avatar at all.
--
-- Needed because the key is no longer derived from the user id: it is random,
-- so without storing it there is nothing to delete when an avatar is replaced.
ALTER TABLE "User" ADD COLUMN "imagePath" TEXT;
