-- Clean existing data to avoid foreign key conflicts
DELETE FROM picks;
DELETE FROM games;
DELETE FROM weeks;
DELETE FROM users;
DELETE FROM teams;
-- Insert teams
REPLACE INTO teams (id, code, name, conference, division) VALUES
(1,'BUF','Buffalo Bills','AFC','East'),
(2,'KC','Kansas City Chiefs','AFC','West'),
(3,'PHI','Philadelphia Eagles','NFC','East'),
(4,'DAL','Dallas Cowboys','NFC','East');

-- Insert users
REPLACE INTO users (id, email, password_hash, display_name, role, created_at) VALUES
(1,'jordan@example.com','abc123','Jordan','USER','2025-10-21 14:26:39'),
(2,'kaleb@example.com','xyz456','Kaleb','USER','2025-10-21 14:26:39'),
(3,'testuser@example.com','$2b$10$MspzY36Dbv3nstRMZ/mlqu9GYoxvHRIUt8DSb7Pruu2Yk5eokMJfe','Kaleb the Myth','USER','2025-10-23 21:54:05'),
(4,'admin@example.com','$2b$10$tzj9WYyhBLbwAPnXBcSNa.AUH0hSVFCd9WDIwYyViaZbV76S9/1Iy','Admin User','ADMIN','2025-11-05 05:11:02'),
(5,'jason@example.com','$2b$10$n2GUjGo4ZHLDHOwuAfBW5e1MoUvPS9OSyZtFuL4w7tc5b76Hq9jt2','Jason\'s Jumping Team','USER','2025-11-05 23:17:09');

-- Insert weeks
REPLACE INTO weeks (id, season, week_number, open_at, lock_at, is_finalized, created_at) VALUES
(1,2025,1,'2025-09-01 05:00:00','2025-09-07 17:45:00',1,'2025-10-21 18:20:14'),
(2,2025,2,'2025-09-08 05:00:00','2025-09-14 17:45:00',0,'2025-10-21 18:20:14'),
(3,2025,3,NULL,NULL,0,'2025-11-08 11:05:00');

-- Insert games
REPLACE INTO games (id, week_id, home_team_id, away_team_id, kickoff_at, status, created_at) VALUES
(6,1,1,2,'2025-09-07 18:00:00','SCHEDULED','2025-10-21 18:20:59'),
(7,1,3,4,'2025-09-07 21:25:00','SCHEDULED','2025-10-21 18:20:59'),
(8,1,4,3,'2025-10-27 21:00:00','SCHEDULED','2025-10-26 18:00:00'),
(9,1,1,3,'2025-11-27 22:00:00','SCHEDULED','2025-10-26 18:00:00');

-- Insert picks
REPLACE INTO picks (id, user_id, game_id, winner, margin, score, submitted_at, updated_at) VALUES
(4,1,6,'HOME',0,NULL,'2025-10-21 18:32:01','2025-10-21 18:32:01'),
(5,1,7,'AWAY',0,NULL,'2025-10-21 18:32:01','2025-10-21 18:32:01'),
(6,2,6,'AWAY',0,NULL,'2025-10-21 18:32:01','2025-10-21 18:32:01'),
(7,2,7,'HOME',0,NULL,'2025-10-21 18:32:01','2025-10-21 18:32:01'),
(8,2,8,'AWAY',0,NULL,'2025-10-29 00:55:15','2025-10-29 00:55:15'),
(9,1,8,'HOME',0,NULL,'2025-10-29 00:57:35','2025-10-29 00:57:35'),
(10,2,9,'HOME',0,NULL,'2025-10-29 00:59:57','2025-10-29 00:59:57'),
(11,3,9,'AWAY',0,NULL,'2025-10-30 22:31:42','2025-11-05 05:30:27'),
(12,3,6,'HOME',0,NULL,'2025-11-05 10:51:35','2025-11-05 10:51:35'),
(14,3,8,'HOME',0,NULL,'2025-11-05 10:55:09','2025-11-05 10:55:09');
