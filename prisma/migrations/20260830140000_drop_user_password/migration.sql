-- Sign-in is Google only, so there is no password to store. Dropped rather
-- than left nullable: an unused password column invites something to start
-- writing to it again, and the point of the change is that this database
-- holds no credential to leak.
ALTER TABLE "User" DROP COLUMN "password";
