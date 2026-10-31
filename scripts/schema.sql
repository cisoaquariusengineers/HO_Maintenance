-- HO Housekeeping & Maintenance Helpdesk - MySQL schema (works on MySQL 8 and TiDB)
-- All timestamps are stored in UTC.

CREATE TABLE IF NOT EXISTS staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL
);

-- Ticket ids come from the counters table, not AUTO_INCREMENT: TiDB Serverless skips
-- large blocks of auto ids whenever it scales down, which would break HO-001, HO-002, ...
CREATE TABLE IF NOT EXISTS counters (
  name VARCHAR(30) PRIMARY KEY,
  value INT NOT NULL
);

CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type VARCHAR(20) NOT NULL,
  floor VARCHAR(20) NOT NULL,
  area VARCHAR(60) NOT NULL,
  location_detail VARCHAR(150) NULL,
  category VARCHAR(60) NOT NULL,
  description TEXT NOT NULL,
  photo_url VARCHAR(500) NULL,
  employee_name VARCHAR(100) NOT NULL,
  employee_email VARCHAR(150) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Open',
  assigned_to VARCHAR(100) NULL,
  pending_reason VARCHAR(500) NULL,
  attended_by VARCHAR(100) NULL,
  action_taken TEXT NULL,
  closed_by VARCHAR(100) NULL,
  closed_at DATETIME NULL,
  reopen_count INT NOT NULL DEFAULT 0,
  reopen_token CHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_reopen_token (reopen_token),
  KEY idx_status (status),
  KEY idx_created (created_at),
  KEY idx_location (floor, area, category)
) /*T![auto_id_cache] AUTO_ID_CACHE=1 */;

CREATE TABLE IF NOT EXISTS ticket_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id INT NOT NULL,
  action VARCHAR(40) NOT NULL,
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NULL,
  note TEXT NULL,
  done_by VARCHAR(100) NULL,
  created_at DATETIME NOT NULL,
  KEY idx_ticket (ticket_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  ticket_id INT NULL,
  message VARCHAR(300) NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  KEY idx_role_read (role, is_read)
);
