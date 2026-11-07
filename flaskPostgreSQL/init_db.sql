-- Create database (run separately if not existing):
-- CREATE DATABASE flask_crud_db;

-- Users table schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    fname VARCHAR(100) NOT NULL,
    lname VARCHAR(100) NOT NULL,
    pet VARCHAR(50) NOT NULL
);

