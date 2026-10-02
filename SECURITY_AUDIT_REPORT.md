# 🛡️ Application Security Audit & Hardening Report
**Target Application:** College ERP Management System (React + Vite, Node.js + Express, MySQL)  
**Date:** October 2026  
**Auditor:** Senior Application Security Engineer  
**Status:** Remediated & Hardened (Regression Tests Passing)  

---

## 1. Executive Summary

A comprehensive, multi-phase application security audit and hardening pass was conducted across the **College ERP Management System**. The audit encompassed fullstack inspection of the React frontend, Express.js REST API, authentication and authorization layers, database interaction layer, file upload processing, rate limiting, error handling, logging, and dependency ecosystems.

### Key Objectives Met:
1. **Preserved User Experience & Core Logic:** Zero modifications were made to the existing Claymorphism visual aesthetics, single-active-session database verification logic (`current_session_token`), or the custom login rate limiter mechanism.
2. **Fixed All 7 Confirmed Critical Issues:** Remediated Insecure Direct Object References (IDOR), unauthenticated file access, leaked git assets, hardcoded admin credentials, error information disclosure, missing registration rate limits, and client-spoofable file uploads.
3. **Full Scope Hardening:** Expanded access control to teacher/student resource ownership (notes, assignments, marks), implemented HTTP security headers via `helmet`, added server-side input validation schemas, stripped sensitive debug logs, fixed package vulnerabilities, and deactivated destructive database seeding on server startup.
4. **Automated Verification:** Authored automated regression suites (`test-security.js` and `test-integration.js`) with 100% pass rates across 18+ automated test assertions.

---

## 2. Summary of Findings

| Finding ID | Vulnerability / Issue | Severity | Status | Affected Component |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Insecure Direct Object Reference (IDOR) on Student Fees | **CRITICAL** | **REMEDIATED** | `backend/controllers/erpController.js` |
| **SEC-02** | Unauthenticated Static Serving of Uploaded User Media | **CRITICAL** | **REMEDIATED** | `backend/server.js`, `backend/middleware/uploadAuth.js` |
| **SEC-03** | User Uploaded Media & Credentials Committed to Git | **HIGH** | **REMEDIATED** *(Manual Purge Req.)* | `backend/uploads/`, `.gitignore` |
| **SEC-04** | Hardcoded Admin Password & Plaintext Credential Logging | **HIGH** | **REMEDIATED** *(Rotation Req.)* | `backend/seed-admin.js` |
| **SEC-05** | Production Data Wiping on Server Start (`seed.js`) | **HIGH** | **REMEDIATED** | `backend/package.json`, `backend/seed.js` |
| **SEC-06** | File Upload MIME-Type Spoofing / Polyglot Execution Risk | **HIGH** | **REMEDIATED** | `backend/middleware/upload.js` |
| **SEC-07** | IDOR / Missing Ownership Verification on Notes & Assignments | **MEDIUM** | **REMEDIATED** | `backend/controllers/erpController.js` |
| **SEC-08** | Horizontal Information Leak on Student Marks API | **MEDIUM** | **REMEDIATED** | `backend/controllers/erpController.js` |
| **SEC-09** | Information Disclosure in Error Responses & Debug Logs | **MEDIUM** | **REMEDIATED** | `server.js`, `authController.js`, `erpController.js` |
| **SEC-10** | Missing Rate Limiting on User Registration | **MEDIUM** | **REMEDIATED** | `backend/middleware/registerRateLimiter.js` |
| **SEC-11** | Missing Missing HTTP Security Headers (Clickjacking, MIME Sniffing) | **MEDIUM** | **REMEDIATED** | `backend/server.js` (`helmet`) |
| **SEC-12** | Input Validation Gaps on Registration, Payments & Complaints | **MEDIUM** | **REMEDIATED** | `backend/controllers/authController.js`, `erpController.js` |
| **SEC-13** | Rate Limiting Gaps on Expensive POST Endpoints | **LOW** | **REMEDIATED** | `backend/middleware/rateLimiters.js` |
| **SEC-14** | Overexposure of Student Contact Info in Directory | **LOW** | **DOCUMENTED** | `GET /api/students` |
| **SEC-15** | Token Storage in LocalStorage (XSS Vulnerability vs UX Tradeoff) | **LOW** | **DOCUMENTED** | `frontend/src/utils/api.js` |
| **SEC-16** | Outdated Dependencies with Known Vulnerabilities | **LOW** | **REMEDIATED** | `frontend/package.json`, `backend/package.json` |

---

## 3. Detailed Technical Findings & Remediation

---

### Finding SEC-01: Insecure Direct Object Reference (IDOR) on Student Fees
- **Severity:** **CRITICAL** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N - 6.5)
- **Affected File:** `backend/controllers/erpController.js` (Route: `GET /api/fees/student/:id`)
- **Evidence:**
  ```javascript
  // BEFORE:
  exports.getStudentFeesById = async (req, res) => {
    const { id } = req.params; // Student user could supply any integer ID here
    const [student] = await db.execute('SELECT * FROM students WHERE user_id = ?', [id]);
    // Returned complete fee, transaction, and balance history of victim student
  ```
- **Root Cause:** The endpoint allowed both `admin` and `student` roles, but omitted checking whether `req.user.id === req.params.id` when the caller held the `student` role.
- **Fix Applied:**
  In `backend/controllers/erpController.js`:
  ```javascript
  if (req.user.role === 'student' && String(req.user.id) !== String(id)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Access forbidden: You cannot view fees for another student' 
    });
  }
  ```
- **Verification:** Verified via `node test-security.js` and `node test-integration.js`. Student querying another student's fee yields HTTP 403. Admin querying any student yields HTTP 200. Student querying own fee yields HTTP 200.
- **Residual Risk:** None on this route.

---

### Finding SEC-02: Unauthenticated Static Serving of Uploaded User Media
- **Severity:** **CRITICAL** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N - 7.5)
- **Affected File:** `backend/server.js`, `backend/middleware/uploadAuth.js`
- **Evidence:**
  ```javascript
  // BEFORE:
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  ```
  Any anonymous internet user possessing the direct link to `/uploads/profile/profile_image-....jpg` or `/uploads/materials/study_material-....pdf` could download private student profile pictures and academic documents without logging in.
- **Root Cause:** Unprotected public directory mounted as raw static Express middleware.
- **Fix Applied:**
  1. Created `backend/middleware/uploadAuth.js` which verifies the caller's JWT token via either the standard `Authorization: Bearer <token>` header or `?token=<token>` query string parameter (required for direct browser media elements and PDF downloads).
  2. Implemented strict path traversal validation against `path.resolve(uploadsRoot)` to prevent directory escape attacks.
  3. Integrated `getMediaUrl(url)` utility in `frontend/src/utils/api.js` to ensure authenticated users seamlessly attach the active token parameter to profile photos and study material downloads across `AdminDashboard.jsx`, `TeacherDashboard.jsx`, and `StudentDashboard.jsx`.
- **Verification:** Verified via `test-security.js`: Unauthenticated requests to `/uploads/*` return HTTP 401. Expired tokens return HTTP 401. Directory traversal payloads (`/uploads/../package.json`) return HTTP 403 Forbidden.
- **Residual Risk:** Query parameter tokens may appear in local browser histories or proxy access logs. Recommend moving to pre-signed URLs or short-lived media ticket tokens in long-term cloud storage.

---

### Finding SEC-03: User Uploaded Media & Credentials Committed to Git
- **Severity:** **HIGH** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N - 7.5)
- **Affected Files:** `backend/uploads/profile/*`, `backend/uploads/materials/*`, `backend/.gitignore`
- **Evidence:** Real JPEG profile pictures and syllabus PDFs from previous test uploads were tracked and committed to git history. Furthermore, `backend/` completely lacked a `.gitignore` file, exposing `.env` files and `node_modules`.
- **Root Cause:** Missing ignore rules in version control configuration.
- **Fix Applied:**
  1. Created `backend/.gitignore` and root `.gitignore` ignoring `/uploads/*` (except placeholder `.gitkeep` files), `node_modules/`, `.env`, and `*.log`.
  2. Untracked existing media files from git staging cache (`git rm --cached`).
- **Residual Risk:** Commits containing the old images/PDFs remain in git commit tree history until purged with history-rewriting tools.
- **Manual Action Required:** Execute the git history rewrite procedure documented in Section 4.

---

### Finding SEC-04: Hardcoded Admin Password & Plaintext Credential Logging
- **Severity:** **HIGH** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H - 9.8)
- **Affected File:** `backend/seed-admin.js`
- **Evidence:**
  ```javascript
  // BEFORE:
  const password = 'Admin@123';
  ...
  console.log(`Password: ${password}`);
  ```
- **Root Cause:** Developer convenience script baked in static administrative credentials and logged them directly to stdout.
- **Fix Applied:**
  Refactored `backend/seed-admin.js` to read `process.env.ADMIN_PASSWORD`, enforced a minimum length of 8 characters, removed console logging of passwords, and added instructions prompting the operator to set `ADMIN_PASSWORD` in the execution environment.
- **Residual Risk:** If `seed-admin.js` was previously executed against a production or shared database, the default password `Admin@123` is active.
- **Manual Action Required:** Immediately rotate the administrative user password in the production MySQL database.

---

### Finding SEC-05: Production Database Truncation on Server Startup
- **Severity:** **HIGH** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:H - 9.1)
- **Affected Files:** `backend/package.json`, `backend/seed.js`
- **Evidence:**
  In `backend/package.json`:
  ```json
  "start": "node seed.js && node server.js"
  ```
  Every time the backend container restarted on Render, `seed.js` executed `TRUNCATE TABLE users, students, teachers, ...`, destroying all production data and re-inserting dummy seed records.
- **Root Cause:** Testing seed workflow mistakenly tied to production start lifecycle.
- **Fix Applied:**
  1. Changed `backend/package.json` `"start"` script to `"node server.js"`. Added dedicated `"seed"` script for manual local setup.
  2. Added an environment guard inside `backend/seed.js` which immediately throws an error and aborts if `NODE_ENV === 'production'`.
- **Verification:** Verified `backend/package.json` scripts and tested startup command.
- **Residual Risk:** None.

---

### Finding SEC-06: File Upload MIME-Type Spoofing / Polyglot Bypass
- **Severity:** **HIGH** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H - 8.8)
- **Affected File:** `backend/middleware/upload.js`
- **Evidence:**
  `multer` fileFilter only checked `file.mimetype === 'image/jpeg' || file.mimetype === 'application/pdf'`. An attacker could upload a web shell (`shell.php`) or HTML script file (`exploit.html`) by simply modifying the client `Content-Type` header.
- **Root Cause:** Sole reliance on client-controlled metadata without inspecting actual binary payload contents.
- **Fix Applied:**
  1. Installed `file-type@16.5.4` (CommonJS compatible).
  2. Implemented `validateUploadedFile` middleware in `upload.js`. After `multer` writes the file, `validateUploadedFile` reads the file's first bytes and verifies the true magic byte signature.
  3. If magic bytes mismatch or fail the whitelist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`), the uploaded file is immediately unlinked (deleted) from disk and an HTTP 400 error is returned.
- **Verification:** Verified via `test-security.js` with a spoofed text payload claiming to be `image/jpeg`. Rejected with HTTP 400 and file deleted.
- **Residual Risk:** Minimal. SVG uploads remain completely disallowed, avoiding SVG-based stored XSS vectors.

---

### Finding SEC-07: IDOR on Study Notes and Assignment Management
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N - 6.5)
- **Affected File:** `backend/controllers/erpController.js`
- **Evidence:**
  `PUT /api/notes/:id`, `DELETE /api/notes/:id`, `PUT /api/assignments/:id`, and `DELETE /api/assignments/:id` checked that the user had role `teacher` or `admin`, but did not check if the requesting teacher actually authored the note or assignment. Any teacher could alter or delete study materials and assignments created by other faculty members.
- **Root Cause:** Role-Based Access Control (RBAC) was present, but Object-Level Access Control (OLAC) was missing.
- **Fix Applied:**
  Updated `updateNote`, `deleteNote`, `updateAssignment`, and `deleteAssignment` in `erpController.js`:
  - When `req.user.role === 'teacher'`, the controller queries the corresponding `teachers` record for `req.user.id`.
  - For notes: verifies `note.uploaded_by === teacher.id`.
  - For assignments: verifies `assignment.teacher_id === teacher.id`.
  - If mismatched, returns HTTP 403 Forbidden.
- **Verification:** Code audit and logic validation against teacher ownership checks.
- **Residual Risk:** Admins retain override access, which is intended behavior.

---

### Finding SEC-08: Horizontal Information Leak on Student Marks API
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N - 4.3)
- **Affected File:** `backend/controllers/erpController.js` (`GET /api/marks`)
- **Evidence:**
  `getMarks` accepted optional query parameters `?student_id=X&exam_type=Y`. If a student caller supplied `?student_id=<other_student_id>`, the endpoint returned the other student's exam results because it did not constrain `student_id` to the logged-in student.
- **Root Cause:** Query parameter filter was applied directly without validating role context.
- **Fix Applied:**
  In `getMarks`:
  ```javascript
  if (req.user.role === 'student') {
    const [currentStudent] = await db.execute('SELECT id FROM students WHERE user_id = ?', [req.user.id]);
    query += ' AND m.student_id = ?';
    params.push(currentStudent[0].id);
  } else if (student_id) {
    query += ' AND m.student_id = ?';
    params.push(student_id);
  }
  ```
- **Verification:** Verified via `test-security.js`: Student cannot access arbitrary `student_id` marks; their query is always forced to their own student profile ID.
- **Residual Risk:** None.

---

### Finding SEC-09: Information Disclosure in Error Responses & Debug Logs
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N - 5.3)
- **Affected Files:** `backend/server.js`, `authController.js`, `erpController.js`
- **Evidence:**
  - Catch blocks returned `res.status(500).json({ message: error.message })`, leaking database schema names, syntax errors, and file paths to users.
  - Server logs printed full student records, fees, and database dumps (`console.log('Student Fees by ID:', rows)`).
- **Root Cause:** Verbose exception formatting and uninhibited debugging output.
- **Fix Applied:**
  1. Created a unified `safeError(res, error, defaultMsg, status)` helper. In production (`NODE_ENV === 'production'`), it returns a generic message (`"Something went wrong, please try again"`) to the client while logging `console.error` server-side for troubleshooting.
  2. Hardened the Express global error handler in `server.js`.
  3. Removed all sensitive console logging of database rows, teacher records, and student financial records.
- **Verification:** Verified via `test-security.js`: Internal database syntax exceptions return masked generic errors in production.
- **Residual Risk:** Server logs in Render will still contain necessary stack traces for developers; ensure Render dashboard access is protected with 2FA.

---

### Finding SEC-10: Missing Rate Limiting on User Registration
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:L/A:L - 6.5)
- **Affected File:** `backend/routes/authRoutes.js`, `backend/middleware/registerRateLimiter.js`
- **Evidence:**
  `POST /api/auth/login` possessed brute-force protection, but `POST /api/auth/register` was completely unmetered, allowing automated bot account spam, database resource exhaustion, and phone number enumeration.
- **Fix Applied:**
  Created `backend/middleware/registerRateLimiter.js` enforcing a limit of 5 registration attempts per 15-minute sliding window per IP address, returning HTTP 429 and `Retry-After` headers when exceeded.
- **Verification:** Verified via `test-security.js`: 6th registration attempt within 15 minutes is blocked with HTTP 429.
- **Residual Risk:** In distributed bot attacks from rotating residential proxies, IP rate limiting may be bypassed. Captcha integration (e.g. Cloudflare Turnstile) is recommended for public registration in high-threat environments.

---

### Finding SEC-11: Missing HTTP Security Headers
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:L/A:N - 4.8)
- **Affected File:** `backend/server.js`
- **Evidence:** Responses were missing essential defensive headers such as `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, and `Referrer-Policy`, leaving the portal susceptible to clickjacking and MIME-type sniffing.
- **Fix Applied:**
  Installed and configured `helmet` in `server.js` with cross-origin resource policy set to `cross-origin` to preserve avatar loading across origins while securing all other response headers.
- **Verification:** Verified via HTTP inspection; security headers present on all endpoints.
- **Residual Risk:** Frontend CSP is managed separately at the hosting layer.

---

### Finding SEC-12: Input Validation Gaps on Registration, Payments & Complaints
- **Severity:** **MEDIUM** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N - 4.3)
- **Affected Files:** `backend/controllers/authController.js`, `backend/controllers/erpController.js`
- **Evidence:**
  - `register` accepted arbitrary string lengths, malformed emails, and invalid phone numbers.
  - `payStudentFee` accepted negative payment numbers (e.g., `-5000`), which could corrupt balance calculations.
  - `submitComplaint` accepted blank/whitespace-only messages.
- **Fix Applied:**
  1. Enforced email regex and 10-digit numeric mobile validation in `authController.register()`.
  2. Enforced password length minimum of 6 characters.
  3. Added numeric bounds check (`parsedAmount > 0`) in `payStudentFee()`.
  4. Added string trimming and length validation on complaints, notices, and assignments.
- **Verification:** Verified via `test-integration.js`: Negative fee payments, blank complaints, and invalid registrations are rejected with HTTP 400 Bad Request.
- **Residual Risk:** None.

---

### Finding SEC-13: Rate Limiting on Secondary Sensitive Endpoints
- **Severity:** **LOW** (CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:L/A:N - 3.5)
- **Affected Files:** `backend/middleware/rateLimiters.js`, `backend/routes/erpRoutes.js`
- **Fix Applied:**
  Created `backend/middleware/rateLimiters.js` containing:
  - `complaintRateLimiter`: 10 complaints per 1 hour per user.
  - `submissionRateLimiter`: 30 assignment uploads per 1 hour per user.
  Mounted on corresponding routes in `erpRoutes.js`.
- **Verification:** Rate limiters active on route declarations.
- **Residual Risk:** None.

---

### Finding SEC-14: Overexposure of Student Contact Info in Directory
- **Severity:** **LOW**
- **Affected Component:** `GET /api/students`
- **Observation:** `getStudents` returns student email addresses and mobile numbers. While this directory data is used by teachers and administrators, it is also accessible by students if granted the student role. In the current frontend, students query `/api/students` solely to look up their own profile details.
- **Recommendation:** Refactor the frontend to use a dedicated `GET /api/students/me` endpoint, and restrict `GET /api/students` strictly to `admin` and `teacher` roles. Do not alter current behavior without stakeholder sign-off on directory visibility.

---

### Finding SEC-15: Token Storage in LocalStorage
- **Severity:** **LOW**
- **Affected Component:** `frontend/src/utils/api.js`
- **Observation:** Authentication tokens are stored in browser `localStorage`. If an XSS vulnerability were introduced into the frontend in the future, the JWT could be read by an attacker. The application currently mitigates session hijacking through the database-backed single-active-session token verification (`current_session_token`).
- **Tradeoff:** Migrating to `httpOnly` cookies requires cross-origin cookie configuration (SameSite=None, Secure) across separate Render frontend and backend domains. Kept `localStorage` as requested to avoid breaking the verified single-session logic.

---

### Finding SEC-16: Outdated Dependencies with Known Vulnerabilities
- **Severity:** **LOW**
- **Affected Components:** `frontend/package.json`, `backend/package.json`
- **Fix Applied:**
  - Ran `npm audit fix` in `frontend/`. Cleaned 3 vulnerabilities (zero vulnerabilities remain; `vite build` completed cleanly).
  - Ran `npm audit` in `backend/` and upgraded vulnerable direct sub-dependencies without breaking changes.
- **Verification:** Both frontend and backend builds compile cleanly.

---

## 4. Manual Actions Required

The following actions cannot be executed automatically and require explicit intervention by the repository owner / infrastructure administrator:

### Action 1: Git History Sanitization (Purge Uploaded Media from Commits)
The user upload files in `backend/uploads/` were committed in previous commits. Although they have been untracked from the current index, historical commits still contain the files. To completely purge them from git history, run either of the following tools:

#### Option A: Using `git-filter-repo` (Recommended by Git)
```bash
# 1. Install git-filter-repo (requires Python)
pip install git-filter-repo

# 2. Make a fresh backup clone of your repository first!
git clone --mirror <repo-url> college-erp-backup.git

# 3. Inside the working repository, strip the uploads directory from all history:
git filter-repo --path backend/uploads/profile --invert-paths --force
git filter-repo --path backend/uploads/materials --invert-paths --force

# 4. Force push to all remote branches (requires repo owner permission)
git push origin --force --all
git push origin --force --tags
```

#### Option B: Using BFG Repo-Cleaner
```bash
# 1. Download bfg.jar from https://rtyley.github.io/bfg-repo-cleaner/
# 2. Delete files larger than 1MB or specific folders
java -jar bfg.jar --delete-files "{*.jpg,*.png,*.pdf}"
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

---

### Action 2: Rotate Production Admin Password
If `backend/seed-admin.js` was previously executed in production or staging, the administrator account currently has the publicly known password `Admin@123`.

**Procedure:**
1. Connect to your production MySQL database:
   ```sql
   -- Generate a bcrypt hash for your new strong password (e.g. using an online bcrypt tool or node script)
   -- Then update the admin user:
   UPDATE users 
   SET password = '<NEW_BCRYPT_HASH>' 
   WHERE email = 'admin@college.com';
   ```
2. In Render, set the `ADMIN_PASSWORD` environment variable to a secure random 20+ character passphrase if you ever re-run `node seed-admin.js`.

---

### Action 3: Review Production Infrastructure & Environment Variables (Render)
Ensure the following settings are properly configured in your Render dashboard:

1. **Environment Variables:**
   - `NODE_ENV=production`
   - `JWT_SECRET`: Ensure this is set to a cryptographically random string (at least 64 hex characters), distinct from any local development key.
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`: Ensure database credentials are set exclusively via Render secrets and never stored in files.
   - `ADMIN_PASSWORD`: Secure passphrase for administrative seeding.
2. **Database User Privileges:**
   - Ensure the MySQL user used by the Express backend only has `SELECT`, `INSERT`, `UPDATE`, `DELETE` privileges.
   - Revoke `DROP`, `ALTER`, `GRANT OPTION`, and `FILE` privileges from the application database user in production.
3. **CORS Origins:**
   - In `backend/server.js`, ensure `allowedOrigins` strictly matches your production frontend URL (e.g. `https://college-erp.onrender.com`). Avoid wildcard `*` origins.

---

## 5. Verification & Test Suite Execution

All fixes have been validated with automated test scripts included in the repository.

### Running the Tests:

1. **Security & Authorization Test Suite:**
   ```bash
   cd backend
   node test-security.js
   ```
   *Covers:* IDOR on fees, IDOR on marks, upload token authentication, path traversal defense, registration rate limiting, magic bytes upload validation, and production error masking.

2. **Integration Test Suite:**
   ```bash
   cd backend
   node test-integration.js
   ```
   *Covers:* Real Express routes (`erpRoutes` + `authRoutes`) with mocked database, validating IDOR rejection (HTTP 403), legitimate fee access (HTTP 200), negative fee rejection (HTTP 400), blank complaint rejection (HTTP 400), and invalid registration rejection (HTTP 400).

3. **Login Rate Limiter Test Suite:**
   ```bash
   cd backend
   node test-rate-limit.js
   ```
   *Covers:* All 6 original login rate limiter scenarios (5 failures, 6th lockout, IP isolation, user isolation, counter reset on success, 60-second expiration).

4. **Frontend Production Build:**
   ```bash
   cd frontend
   npm run build
   ```
   *Result:* Compiles cleanly with zero errors.

---

## 6. Conclusion

The College ERP Management System has been systematically secured against critical vulnerabilities including horizontal privilege escalation (IDOR), unauthorized media exposure, upload spoofing, and credential leakage. All existing features, single-session constraints, and Claymorphism UI designs remain 100% operational.
