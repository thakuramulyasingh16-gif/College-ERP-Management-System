# College ERP System

A full-stack College ERP system built with React, Node.js, Express, and MySQL.

## Project Structure
- ackend/: Node.js server with Express
- rontend/: React application with Vite & Tailwind CSS
- database/: MySQL schema file

## Prerequisites
- Node.js installed
- MySQL Server installed and running

## Setup Instructions
1. **Database Setup**:
   - Open MySQL Workbench or your favorite SQL client.
   - Run the script in database/schema.sql to create the database and tables.
   - Update ackend/.env with your MySQL credentials (DB_USER, DB_PASSWORD).

2. **Run the Project**:
   - Double-click setup.bat (Windows) to automatically install dependencies and start both servers.
   - Or run manually:
     - Backend: cd backend && npm install && npm start
     - Frontend: cd frontend && npm install && npm run dev

## Features
- **Admin**: Manage departments and courses.
- **Teacher**: Upload attendance and results.
- **Student**: View profile, attendance, and fees.
- **Security**: JWT-based authentication and Bcrypt password hashing.
