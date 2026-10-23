-- The avatar a person picked from the site's own set. Additive only: the old
-- image columns stay until the code that stopped using them is deployed.
ALTER TABLE "User" ADD COLUMN "avatar" TEXT;
