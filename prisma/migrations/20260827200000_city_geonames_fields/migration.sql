
-- DropIndex
DROP INDEX "City_regionSlug_slug_key";

-- AlterTable
ALTER TABLE "City" DROP COLUMN "regionSlug",
ADD COLUMN     "searchAliases" TEXT[];

