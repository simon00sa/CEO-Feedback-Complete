-- Migration: Add the inviterId column to the Invitation table

ALTER TABLE "Invitation" ADD COLUMN "inviterId" VARCHAR NOT NULL;
