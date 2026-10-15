CREATE TABLE IF NOT EXISTS projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  apikey VARCHAR(80) NOT NULL UNIQUE,
  track_key VARCHAR(80) NOT NULL UNIQUE,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS errors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  event_id VARCHAR(64) NOT NULL,
  tracker_id VARCHAR(128) NOT NULL DEFAULT '',
  error_type VARCHAR(64) NOT NULL DEFAULT '',
  message TEXT,
  name VARCHAR(255) NOT NULL DEFAULT '',
  level VARCHAR(16) NOT NULL DEFAULT 'error',
  url TEXT,
  page VARCHAR(512) NOT NULL DEFAULT '',
  fingerprint VARCHAR(64) NOT NULL DEFAULT '',
  stack_json JSON,
  breadcrumbs_json JSON,
  device_json JSON,
  ip VARCHAR(64) NOT NULL DEFAULT '',
  ua VARCHAR(512) NOT NULL DEFAULT '',
  status TINYINT NOT NULL DEFAULT 0,
  release VARCHAR(128) NOT NULL DEFAULT '',
  source_map_applied TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_errors_project_time (project_id, created_at),
  INDEX idx_errors_fingerprint (fingerprint),
  UNIQUE KEY uk_errors_event (project_id, event_id)
);

CREATE TABLE IF NOT EXISTS issues (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  fingerprint VARCHAR(64) NOT NULL DEFAULT '',
  title VARCHAR(512) NOT NULL DEFAULT '',
  error_type VARCHAR(64) NOT NULL DEFAULT '',
  message TEXT,
  level VARCHAR(16) NOT NULL DEFAULT 'error',
  status TINYINT NOT NULL DEFAULT 0,
  first_seen DATETIME(3),
  last_seen DATETIME(3),
  count INT NOT NULL DEFAULT 1,
  sample_error_id BIGINT NOT NULL DEFAULT 0,
  UNIQUE KEY uk_issues_fingerprint (project_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS tracks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  event_id VARCHAR(64) NOT NULL DEFAULT '',
  tracker_id VARCHAR(128) NOT NULL DEFAULT '',
  track_id VARCHAR(128) NOT NULL DEFAULT '',
  action_type VARCHAR(32) NOT NULL DEFAULT 'EVENT',
  page VARCHAR(512) NOT NULL DEFAULT '',
  custom_json JSON,
  value DOUBLE NULL,
  start_time BIGINT NULL,
  track_time BIGINT NOT NULL DEFAULT 0,
  device_json JSON,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_tracks_track_time (track_id, track_time),
  INDEX idx_tracks_project_time (project_id, created_at)
);

CREATE TABLE IF NOT EXISTS vitals (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  event_id VARCHAR(64) NOT NULL DEFAULT '',
  tracker_id VARCHAR(128) NOT NULL DEFAULT '',
  name VARCHAR(64) NOT NULL DEFAULT '',
  value DOUBLE NOT NULL DEFAULT 0,
  rating VARCHAR(32) NOT NULL DEFAULT '',
  page VARCHAR(512) NOT NULL DEFAULT '',
  device_json JSON,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_vitals_name_time (name, created_at),
  INDEX idx_vitals_project_time (project_id, created_at)
);

CREATE TABLE IF NOT EXISTS sourcemaps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  release VARCHAR(128) NOT NULL DEFAULT '',
  file_name VARCHAR(255) NOT NULL DEFAULT '',
  file_path VARCHAR(512) NOT NULL DEFAULT '',
  size INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_sourcemaps_project (project_id)
);
