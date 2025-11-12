/*
  Warnings:

  - A unique constraint covering the columns `[external_game_id]` on the table `games` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `games_external_game_id_key` ON `games`(`external_game_id`);
