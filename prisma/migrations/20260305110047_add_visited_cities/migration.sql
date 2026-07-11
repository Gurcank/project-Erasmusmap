-- CreateTable
CREATE TABLE "_VisitedCities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_VisitedCities_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_VisitedCities_B_index" ON "_VisitedCities"("B");

-- AddForeignKey
ALTER TABLE "_VisitedCities" ADD CONSTRAINT "_VisitedCities_A_fkey" FOREIGN KEY ("A") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_VisitedCities" ADD CONSTRAINT "_VisitedCities_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
