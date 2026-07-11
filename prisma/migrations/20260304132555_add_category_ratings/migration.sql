/*
  Warnings:

  - You are about to drop the column `rating` on the `Review` table. All the data in the column will be lost.
  - Added the required column `gastronomi` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `geceHayati` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guvenlik` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kultur` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ulasim` to the `Review` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yasamMaliyeti` to the `Review` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "rating",
ADD COLUMN     "gastronomi" INTEGER NOT NULL,
ADD COLUMN     "geceHayati" INTEGER NOT NULL,
ADD COLUMN     "guvenlik" INTEGER NOT NULL,
ADD COLUMN     "kultur" INTEGER NOT NULL,
ADD COLUMN     "ulasim" INTEGER NOT NULL,
ADD COLUMN     "yasamMaliyeti" INTEGER NOT NULL;
