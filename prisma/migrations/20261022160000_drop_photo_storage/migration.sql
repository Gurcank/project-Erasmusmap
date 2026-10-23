-- The site stores no photo of anyone: people pick one of its own avatars
-- (User.avatar), and trip galleries are gone. Nothing reads or writes these any
-- more, so they go. Run only after the code that stopped using them is deployed
-- and the avatars and trip-media Storage buckets have been emptied.
--
-- DESTRUCTIVE: removes the Google/uploaded photo URLs on User and the TripPhoto
-- table with its rows. There is no way back without a backup.
DROP TABLE "TripPhoto";

ALTER TABLE "User" DROP COLUMN "image",
                   DROP COLUMN "imagePath";
