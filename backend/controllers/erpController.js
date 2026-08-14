const db = require("../config/db");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// --- UTILS ---
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error("BCRYPT_ERROR: Password must be a non-empty string.");
  }
  return await bcrypt.hash(password, 10);
};

// --- ADMIN CONTROLLERS ---

exports.getDashboardStats = async (req, res) => {
  try {
    const [users] = await db.execute("SELECT role, COUNT(*) as count FROM users GROUP BY role");
    const [depts] = await db.execute("SELECT COUNT(*) as count FROM departments");
    const [courses] = await db.execute("SELECT COUNT(*) as count FROM courses");
    res.status(200).json({ 
      success: true, 
      data: { users, departments: depts[0].count, courses: courses[0].count } 
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Sessions
exports.getSessions = async (req, res) => {
  console.log("API HIT: GET /api/sessions");
  try {
    const [rows] = await db.execute("SELECT * FROM sessions ORDER BY session_name DESC");
    console.log("Sessions Data:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createSession = async (req, res) => {
  const { session_name, duration_years } = req.body;
  try {
    const [result] = await db.execute("INSERT INTO sessions (session_name, duration_years) VALUES (?, ?)", [session_name, duration_years]);
    res.status(201).json({ success: true, data: { id: result.insertId, session_name } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Departments
exports.getDepartments = async (req, res) => {
  console.log("API HIT: GET /api/departments");
  try {
    const [rows] = await db.execute("SELECT * FROM departments");
    console.log("Departments Data:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createDepartment = async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.execute("INSERT INTO departments (name) VALUES (?)", [name]);
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    await db.execute("UPDATE departments SET name = ? WHERE id = ?", [name, id]);
    res.status(200).json({ success: true, message: "Department updated" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM departments WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Department deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Courses
exports.getCourses = async (req, res) => {
  let query = "SELECT c.*, d.name as department_name FROM courses c LEFT JOIN departments d ON c.department_id = d.id";
  try {
    const [rows] = await db.execute(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createCourse = async (req, res) => {
  const { name, department_id, duration_years } = req.body;
  try {
    const [result] = await db.execute("INSERT INTO courses (name, department_id, duration_years) VALUES (?, ?, ?)", [name, department_id, duration_years]);
    res.status(201).json({ success: true, data: { id: result.insertId, name } });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateCourse = async (req, res) => {
  const { id } = req.params;
  const { name, department_id, duration_years } = req.body;
  try {
    await db.execute("UPDATE courses SET name = ?, department_id = ?, duration_years = ? WHERE id = ?", [name, department_id, duration_years, id]);
    res.status(200).json({ success: true, message: "Course updated" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteCourse = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM courses WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Course deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Subjects
exports.getSubjects = async (req, res) => {
  console.log("API HIT: /api/subjects");
  let query = `
    SELECT s.*, c.name as course_name, d.name as department 
    FROM subjects s 
    LEFT JOIN courses c ON s.course_id = c.id 
    LEFT JOIN departments d ON c.department_id = d.id
  `;
  try {
    const [rows] = await db.execute(query);
    res.status(200).json({ success: true, data: rows || [] });
  } catch (error) { 
    console.error("DEBUG: Error in getSubjects:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.createSubject = async (req, res) => {
  console.log("DEBUG: createSubject HIT with body:", JSON.stringify(req.body));
  const data = req.body;
  
  try {
    let teacher_id = null;
    if (req.user.role === 'teacher') {
        const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
        if (staff.length > 0) teacher_id = staff[0].id;
    }

    if (Array.isArray(data)) {
        // Handle bulk upload if sent as array to this endpoint
        for (const item of data) {
            const name = item.subjectName || item.name;
            const code = item.subjectCode || item.subject_code;
            const course_id = parseInt(item.course || item.course_id);
            const session = item.session || null;
            
            if (!name || !code) {
                console.warn("DEBUG: Skipping subject due to missing name or code:", item);
                continue;
            }
            
            await db.execute(
                "INSERT INTO subjects (name, subject_code, course_id, session, teacher_id) VALUES (?, ?, ?, ?, ?)",
                [name, code, isNaN(course_id) ? null : course_id, session, teacher_id]
            );
        }
        return res.status(200).json({ success: true, message: "Subjects added" });
    } else {
        // Handle single subject
        const name = data.subjectName || data.name;
        const code = data.subjectCode || data.subject_code;
        const course_id = parseInt(data.course || data.course_id);
        const session = data.session || null;

        if (!name || !code) {
            return res.status(400).json({ success: false, message: "Subject Name and Code are required" });
        }

        await db.execute(
            "INSERT INTO subjects (name, subject_code, course_id, session, teacher_id) VALUES (?, ?, ?, ?, ?)",
            [name, code, isNaN(course_id) ? null : course_id, session, teacher_id]
        );
        res.status(200).json({ success: true, message: "Subject added" });
    }
  } catch (error) { 
    console.error("DEBUG: createSubject Error:", error);
    res.status(500).json({ success: false, message: "Database Error: " + error.message }); 
  }
};

exports.updateSubject = async (req, res) => {
  const { id } = req.params;
  const { name, subject_code, course_id, session } = req.body;
  try {
    await db.execute(
        "UPDATE subjects SET name = ?, subject_code = ?, course_id = ?, session = ? WHERE id = ?",
        [name, subject_code, course_id, session, id]
    );
    res.status(200).json({ success: true, message: "Subject updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteSubject = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM subjects WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Subject deleted successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Teachers/Staff
exports.getStaff = async (req, res) => {
  let query = `
    SELECT u.id as user_id, s.id as staff_id, u.name, u.email, u.mobile, u.profile_image, 
    d.name as department, s.designation, s.profession, s.department_id
    FROM users u 
    JOIN staff s ON u.id = s.user_id 
    LEFT JOIN departments d ON s.department_id = d.id 
    WHERE u.role = 'teacher'
  `;
  try {
    const [rows] = await db.execute(query);
    console.log("Teachers Data:", rows); // DEBUG
    res.status(200).json({ success: true, data: rows });
  } catch (error) { 
    console.error("Error fetching staff:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.createTeacher = async (req, res) => {
  const { name, email, mobile, password, department_id, designation, profession } = req.body;
  const profile_image = req.file ? `/uploads/profile/${req.file.filename}` : null;
  try {
    const hashedPassword = await hashPassword(password);
    const [userResult] = await db.execute(
      "INSERT INTO users (name, email, mobile, password, role, profile_image) VALUES (?, ?, ?, ?, 'teacher', ?)", 
      [name, email, mobile, hashedPassword, profile_image]
    );
    await db.execute(
      "INSERT INTO staff (user_id, department_id, designation, profession) VALUES (?, ?, ?, ?)", 
      [userResult.insertId, department_id, designation, profession]
    );
    res.status(201).json({ success: true, message: "Teacher created" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateTeacher = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, department_id, designation, profession } = req.body;
  const profile_image = req.file ? `/uploads/profile/${req.file.filename}` : null;
  
  try {
    if (mobile && mobile.length !== 10) return res.status(400).json({ success: false, message: "Mobile must be 10 digits" });
    
    if (profile_image) {
      const [oldUser] = await db.execute("SELECT profile_image FROM users WHERE id = ?", [id]);
      if (oldUser.length > 0 && oldUser[0].profile_image) {
        const oldPath = path.join(__dirname, '..', oldUser[0].profile_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await db.execute("UPDATE users SET name = ?, email = ?, mobile = ?, profile_image = ? WHERE id = ?", [name, email, mobile, profile_image, id]);
    } else {
      await db.execute("UPDATE users SET name = ?, email = ?, mobile = ? WHERE id = ?", [name, email, mobile, id]);
    }

    await db.execute(
      "UPDATE staff SET department_id = ?, designation = ?, profession = ? WHERE user_id = ?", 
      [department_id, designation, profession, id]
    );
    res.status(200).json({ success: true, message: "Teacher updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteTeacher = async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await db.execute("SELECT profile_image FROM users WHERE id = ?", [id]);
    if (user.length > 0 && user[0].profile_image) {
      const oldPath = path.join(__dirname, '..', user[0].profile_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Teacher deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Students
exports.getStudents = async (req, res) => {
  try {
    let query = `
      SELECT u.id as user_id, st.id as student_id, u.name, u.email, u.mobile, st.roll_no as roll_number, st.current_semester, 
      c.name as course, st.course_id, st.session, st.admission_year, u.profile_image, d.name as department, c.department_id 
      FROM users u 
      JOIN students st ON u.id = st.user_id 
      LEFT JOIN courses c ON st.course_id = c.id 
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE u.role = 'student'
    `;
    const [rows] = await db.execute(query);
    res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) { 
    console.error("Error fetching students:", error);
    res.status(500).json({ success: false, message: "Error fetching students" }); 
  }
};


exports.createStudent = async (req, res) => {
  const { name, email, mobile, password, course_id, admission_year, roll_no } = req.body;
  const profile_image = req.file ? `/uploads/profile/${req.file.filename}` : null;
  try {
    const [courseRows] = await db.execute("SELECT name FROM courses WHERE id = ?", [course_id]);
    if (courseRows.length === 0) return res.status(400).json({ success: false, message: "Invalid course ID" });
    
    const courseName = courseRows[0].name;
    const admissionYear = parseInt(admission_year);
    let duration = 0;

    if (["B.A.","B.Sc.","B.Com","BBA","BCA","B.El.Ed","LLB"].includes(courseName)) {
      duration = 3;
    } else {
      duration = 2;
    }

    const endYear = admissionYear + duration;
    const session = `${admissionYear}-${endYear}`;
    console.log("Calculated Session:", session, "for Course:", courseName, "Admission Year:", admissionYear);

    const hashedPassword = await hashPassword(password);
    const [userResult] = await db.execute(
      "INSERT INTO users (name, email, mobile, password, role, profile_image) VALUES (?, ?, ?, ?, 'student', ?)", 
      [name, email, mobile, hashedPassword, profile_image]
    );
    await db.execute(
      "INSERT INTO students (user_id, course_id, admission_year, session, roll_no) VALUES (?, ?, ?, ?, ?)", 
      [userResult.insertId, course_id, admissionYear, session, roll_no]
    );
    console.log("Student saved with session:", session);
    res.status(201).json({ success: true, message: "Student created" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateStudent = async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, course_id, admission_year, roll_no } = req.body;
  const profile_image = req.file ? `/uploads/profile/${req.file.filename}` : null;

  try {
    if (mobile && mobile.length !== 10) return res.status(400).json({ success: false, message: "Mobile must be 10 digits" });
    
    const [courseRows] = await db.execute("SELECT name FROM courses WHERE id = ?", [course_id]);
    if (courseRows.length === 0) return res.status(400).json({ success: false, message: "Invalid course ID" });
    
    const courseName = courseRows[0].name;
    const admissionYear = parseInt(admission_year);
    let duration = 0;
    if (["B.A.","B.Sc.","B.Com","BBA","BCA","B.El.Ed","LLB"].includes(courseName)) {
      duration = 3;
    } else {
      duration = 2;
    }
    const endYear = admissionYear + duration;
    const session = `${admissionYear}-${endYear}`;

    if (profile_image) {
      const [oldUser] = await db.execute("SELECT profile_image FROM users WHERE id = ?", [id]);
      if (oldUser.length > 0 && oldUser[0].profile_image) {
        const oldPath = path.join(__dirname, '..', oldUser[0].profile_image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      await db.execute("UPDATE users SET name = ?, email = ?, mobile = ?, profile_image = ? WHERE id = ?", [name, email, mobile, profile_image, id]);
    } else {
      await db.execute("UPDATE users SET name = ?, email = ?, mobile = ? WHERE id = ?", [name, email, mobile, id]);
    }

    await db.execute(
      "UPDATE students SET course_id = ?, admission_year = ?, session = ?, roll_no = ? WHERE user_id = ?", 
      [course_id, admissionYear, session, roll_no, id]
    );
    res.status(200).json({ success: true, message: "Student updated successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteStudent = async (req, res) => {
  const { id } = req.params;
  try {
    const [user] = await db.execute("SELECT profile_image FROM users WHERE id = ?", [id]);
    if (user.length > 0 && user[0].profile_image) {
      const oldPath = path.join(__dirname, '..', user[0].profile_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.execute("DELETE FROM users WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Student deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.resetPassword = async (req, res) => {
  const { userId, newPassword } = req.body;
  try {
    const hashedPassword = await hashPassword(newPassword);
    await db.execute("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, userId]);
    res.status(200).json({ success: true, message: "Password reset successful" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Fees
exports.getFeeStructures = async (req, res) => {
  console.log("API HIT: GET /api/fee-structures");
  try {
    const [rows] = await db.execute("SELECT fs.*, c.name as course_name FROM fee_structures fs JOIN courses c ON fs.course_id = c.id");
    console.log("Fee Structures Data:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createFeeStructure = async (req, res) => {
  const { course_id, category, amount, description } = req.body;
  try {
    await db.execute("INSERT INTO fee_structures (course_id, category, amount, description) VALUES (?, ?, ?, ?)", [course_id, category, amount, description]);
    res.status(201).json({ success: true, message: "Fee structure created" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateFeeStructure = async (req, res) => {
  const { id } = req.params;
  const { course_id, category, amount, description } = req.body;
  try {
    await db.execute("UPDATE fee_structures SET course_id = ?, category = ?, amount = ?, description = ? WHERE id = ?", [course_id, category, amount, description, id]);
    res.status(200).json({ success: true, message: "Fee structure updated" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteFeeStructure = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM fee_structures WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Fee structure deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Notices
exports.getNotices = async (req, res) => {
  console.log("API HIT: GET /api/notices");
  try {
    const [rows] = await db.execute("SELECT * FROM notices ORDER BY created_at DESC");
    console.log("Notices Data:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createNotice = async (req, res) => {
  const { title, content, target_role } = req.body;
  try {
    await db.execute("INSERT INTO notices (title, content, target_role) VALUES (?, ?, ?)", [title, content, target_role || 'all']);
    res.status(201).json({ success: true, message: "Notice created" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteNotice = async (req, res) => {
  const { id } = req.params;
  try {
    await db.execute("DELETE FROM notices WHERE id = ?", [id]);
    res.status(200).json({ success: true, message: "Notice deleted" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- TEACHER CONTROLLERS ---

exports.getTeacherStudents = async (req, res) => {
  try {
    let query = `
      SELECT u.id as user_id, st.id as student_id, u.name, u.email, u.mobile, st.roll_no as roll_number, st.current_semester, 
      c.name as course, st.course_id, st.session, st.admission_year, u.profile_image, d.name as department, c.department_id 
      FROM users u 
      JOIN students st ON u.id = st.user_id 
      LEFT JOIN courses c ON st.course_id = c.id 
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE u.role = 'student'
    `;
    const [rows] = await db.execute(query);
    res.status(200).json({ success: true, data: rows || [] });
  } catch (error) {
    console.error("DEBUG: Error fetching teacher students:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTeacherCourses = async (req, res) => {
  console.log("API HIT: GET /api/teacher/courses");
  try {
    let query = "SELECT * FROM courses";
    const [rows] = await db.execute(query);
    res.status(200).json({ success: true, data: rows || [] });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStudentsByCourse = async (req, res) => {
  try {
    let query = `SELECT u.name, u.email, u.mobile, st.roll_no as roll_number, st.id as student_id, st.session 
       FROM users u 
       JOIN students st ON u.id = st.user_id 
       JOIN courses c ON st.course_id = c.id
       ORDER BY st.roll_no`;
    
    const [rows] = await db.execute(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.submitBulkAttendance = async (req, res) => {
  const { course_id, date, attendance_data, session } = req.body;
  
  if (!course_id || !date || !attendance_data || !Array.isArray(attendance_data)) {
    return res.status(400).json({ success: false, message: "Missing required fields: course_id, date, and attendance_data are required." });
  }

  try {
    const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
    if (staff.length === 0) return res.status(404).json({ success: false, message: "Teacher record not found" });
    
    const teacher_id = staff[0].id;
    const time = new Date().toLocaleTimeString('it-IT'); // HH:mm:ss

    const values = attendance_data.map(item => {
      if (!item.student_id || !item.status) {
        throw new Error("Invalid attendance data: student_id and status are required for each entry.");
      }
      return [
        item.student_id, 
        null, // subject_id
        teacher_id,
        course_id,
        date,
        item.status,
        time,
        session || null
      ];
    });

    const query = `INSERT INTO attendance (student_id, subject_id, teacher_id, course_id, date, status, time, session) 
                   VALUES ? 
                   ON DUPLICATE KEY UPDATE status = VALUES(status), time = VALUES(time), session = VALUES(session)`;
    
    await db.query(query, [values]);
    res.status(200).json({ success: true, message: "Attendance recorded successfully" });
  } catch (error) { 
    console.error("Bulk attendance error:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.getTeacherSubjects = async (req, res) => {
  console.log("API HIT: GET /api/teacher/subjects");
  try {
    const [rows] = await db.execute(`SELECT s.*, c.name as course_name FROM subjects s JOIN courses c ON s.course_id = c.id`);
    console.log("Teacher Subjects:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.uploadAttendance = async (req, res) => {
  const { student_id, subject_id, date, status, course_id, session } = req.body;
  
  if (!student_id || !date || !status) {
    return res.status(400).json({ success: false, message: "Missing required fields: student_id, date, and status are required." });
  }

  try {
    const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
    const teacher_id = staff.length > 0 ? staff[0].id : null;
    const time = new Date().toLocaleTimeString('it-IT');

    await db.execute(
      "INSERT INTO attendance (student_id, subject_id, teacher_id, course_id, date, status, time, session) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), time = VALUES(time)", 
      [student_id, subject_id || null, teacher_id, course_id || null, date, status, time, session || null]
    );
    res.status(200).json({ success: true, message: "Attendance uploaded" });
  } catch (error) { 
    console.error("Upload attendance error:", error);
    res.status(500).json({ success: false, message: error.message }); 
  }
};

exports.uploadMarks = async (req, res) => {
    const { student_id, subject, marks, course, session, exam_name } = req.body;
    console.log("DEBUG: uploadMarks HIT with body:", JSON.stringify(req.body));

    if (!student_id || !subject || marks === undefined) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    try {
        // Find subject_id if subject is passed as name
        let subject_id = null;
        if (isNaN(subject)) {
            const [sub] = await db.execute("SELECT id FROM subjects WHERE name = ?", [subject]);
            if (sub.length > 0) subject_id = sub[0].id;
        } else {
            subject_id = subject;
        }

        // Find course_id if course is passed as name
        let course_id = null;
        if (isNaN(course)) {
            const [crs] = await db.execute("SELECT id FROM courses WHERE name = ?", [course]);
            if (crs.length > 0) course_id = crs[0].id;
        } else {
            course_id = course;
        }

        const query = `
            INSERT INTO results (student_id, subject_id, marks_obtained, max_marks, course_id, session, exam_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks)
        `;

        await db.execute(query, [student_id, subject_id, Number(marks), Number(req.body.max_marks || 100), course_id, session, exam_name]);
        res.json({ success: true, message: "Marks saved successfully" });
    } catch (error) {
        console.error("DEBUG: uploadMarks Error:", error);
        res.status(500).json({ success: false, message: "Failed to save marks" });
    }
};

exports.getMarks = async (req, res) => {
    const { student_id } = req.query;
    console.log("DEBUG: getMarks HIT for student_id:", student_id);

    try {
        let query = `
            SELECT s.name as subject, r.marks_obtained as marks, r.max_marks, c.name as course, r.session, r.exam_name, r.student_id, st.roll_no
            FROM results r
            LEFT JOIN subjects s ON r.subject_id = s.id
            LEFT JOIN courses c ON r.course_id = c.id
            LEFT JOIN students st ON r.student_id = st.id
        `;

        const params = [];
        if (student_id) {
            query += " WHERE r.student_id = ? OR st.roll_no = ?";
            params.push(student_id, student_id);
        }

        const [rows] = await db.execute(query, params);
        res.json({ success: true, data: rows || [] });
    } catch (error) {
        console.error("DEBUG: getMarks Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadNote = async (req, res) => {
  const { title, url, subject_id, course_id, session } = req.body;
  const file_url = req.file ? `/uploads/materials/${req.file.filename}` : null;
  
  if (!title || (!file_url && !url) || !course_id || !session) {
    return res.status(400).json({ success: false, message: "Missing required fields: title, material, course, and session are required." });
  }

  try {
    let uploaded_by = null;
    if (req.user.role === 'teacher') {
        const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
        if (staff.length > 0) uploaded_by = staff[0].id;
    }

    await db.execute(
        "INSERT INTO notes (title, file_url, url, subject_id, course_id, session, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)", 
        [title, file_url, url || null, subject_id || null, course_id, session, uploaded_by]
    );
    res.status(200).json({ success: true, message: "Material uploaded successfully" });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateNote = async (req, res) => {
    const { id } = req.params;
    const { title, url, subject_id, course_id, session } = req.body;
    const file_url = req.file ? `/uploads/materials/${req.file.filename}` : null;

    try {
        const [oldNote] = await db.execute("SELECT file_url FROM notes WHERE id = ?", [id]);
        if (oldNote.length === 0) return res.status(404).json({ success: false, message: "Material not found" });

        let query = "UPDATE notes SET title = ?, subject_id = ?, course_id = ?, session = ?";
        let params = [title, subject_id || null, course_id, session];

        if (file_url) {
            query += ", file_url = ?, url = NULL";
            params.push(file_url);
            
            // Delete old file if exists
            if (oldNote[0].file_url) {
                const relativePath = oldNote[0].file_url.startsWith('/') ? oldNote[0].file_url.substring(1) : oldNote[0].file_url;
                const filePath = path.join(__dirname, '..', relativePath);
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (err) { console.error("File delete error:", err); }
            }
        } else if (url) {
            query += ", url = ?, file_url = NULL";
            params.push(url);

            // Delete old file if switching to URL
            if (oldNote[0].file_url) {
                const relativePath = oldNote[0].file_url.startsWith('/') ? oldNote[0].file_url.substring(1) : oldNote[0].file_url;
                const filePath = path.join(__dirname, '..', relativePath);
                try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch (err) { console.error("File delete error:", err); }
            }
        }

        query += " WHERE id = ?";
        params.push(id);

        await db.execute(query, params);
        res.status(200).json({ success: true, message: "Material updated successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteNote = async (req, res) => {
    const { id } = req.params;
    try {
        const [note] = await db.execute("SELECT file_url FROM notes WHERE id = ?", [id]);
        
        if (note.length === 0) {
            return res.status(404).json({ success: false, message: "Material not found" });
        }

        if (note[0].file_url) {
            // Remove leading slash if exists to join correctly
            const relativePath = note[0].file_url.startsWith('/') ? note[0].file_url.substring(1) : note[0].file_url;
            const filePath = path.join(__dirname, '..', relativePath);
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (fsErr) {
                console.error("File deletion error:", fsErr);
            }
        }
        
        const [result] = await db.execute("DELETE FROM notes WHERE id = ?", [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Material not found or already deleted" });
        }

        res.status(200).json({ success: true, message: "Material deleted successfully" });
    } catch (error) { 
        console.error("Delete note error:", error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.getNotes = async (req, res) => {
  const { course_id, session } = req.query;
  console.log("API HIT: GET /api/notes");
  try {
    let query = `
        SELECT n.*, s.name as subject_name, c.name as course_name, d.name as department, u.name as teacher_name 
        FROM notes n 
        LEFT JOIN subjects s ON n.subject_id = s.id 
        LEFT JOIN courses c ON n.course_id = c.id 
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN staff st_rec ON n.uploaded_by = st_rec.id 
        LEFT JOIN users u ON st_rec.user_id = u.id
    `;
    const [rows] = await db.execute(query);
    console.log("Notes Data:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// --- STUDENT CONTROLLERS ---

exports.getStudentAttendance = async (req, res) => {
  console.log("API HIT: GET /api/student/attendance");
  try {
    const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
    if (student.length === 0) return res.status(200).json({ success: true, data: [] });
    const [rows] = await db.execute("SELECT a.*, s.name as subject_name, c.name as course_name FROM attendance a LEFT JOIN subjects s ON a.subject_id = s.id LEFT JOIN courses c ON s.course_id = c.id WHERE a.student_id = ?", [student[0].id]);
    console.log("Student Attendance:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStudentResults = async (req, res) => {
  console.log("API HIT: GET /api/student/results");
  try {
    const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
    if (student.length === 0) return res.status(200).json({ success: true, data: [] });
    const [rows] = await db.execute("SELECT r.*, s.name as subject_name FROM results r JOIN subjects s ON r.subject_id = s.id WHERE r.student_id = ?", [student[0].id]);
    console.log("Student Results:", rows);
    res.status(200).json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStudentFeesById = async (req, res) => {
  const { id } = req.params;
  console.log("API HIT: GET /api/fees/student/" + id);
  try {
    const [student] = await db.execute("SELECT id, course_id FROM students WHERE user_id = ?", [id]);
    if (student.length === 0) return res.status(200).json({ success: true, data: [] });

    const [structures] = await db.execute("SELECT id, category, amount as total_amount FROM fee_structures WHERE course_id = ?", [student[0].course_id]);
    if (structures.length === 0) return res.status(200).json({ success: true, data: [] });

    const result = [];
    for (const fs of structures) {
        const [fee] = await db.execute("SELECT amount_paid, status, payment_method, paid_date FROM fees WHERE student_id = ? AND fee_structure_id = ?", [student[0].id, fs.id]);
        if (fee.length > 0) {
            result.push({ ...fs, ...fee[0], amount_paid: parseFloat(fee[0].amount_paid || 0) });
        } else {
            result.push({ ...fs, amount_paid: 0, status: 'pending', paid_date: null });
        }
    }
    console.log("Student Fees by ID:", result);
    res.status(200).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStudentFees = async (req, res) => {
  console.log("API HIT: GET /api/student/fees");
  try {
    const [student] = await db.execute("SELECT id, course_id FROM students WHERE user_id = ?", [req.user.id]);
    if (student.length === 0) return res.status(200).json({ success: true, data: [] });

    const [structures] = await db.execute("SELECT id, category, amount as total_amount FROM fee_structures WHERE course_id = ?", [student[0].course_id]);

    const result = [];
    for (const fs of structures) {
        const [fee] = await db.execute("SELECT amount_paid, status, payment_method, paid_date FROM fees WHERE student_id = ? AND fee_structure_id = ?", [student[0].id, fs.id]);
        if (fee.length > 0) {
            result.push({ ...fs, ...fee[0], amount_paid: parseFloat(fee[0].amount_paid || 0) });
        } else {
            result.push({ ...fs, amount_paid: 0, status: 'pending', paid_date: null });
        }
    }
    console.log("Student Fees:", result);
    res.status(200).json({ success: true, data: result });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.payStudentFee = async (req, res) => {
  const { fee_structure_id, amount, payment_method } = req.body;
  try {
    const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
    if (student.length === 0) return res.status(404).json({ success: false, message: "Student record not found" });

    const transaction_id = 'TXN' + Date.now();
    const [existing] = await db.execute("SELECT id FROM fees WHERE student_id = ? AND fee_structure_id = ?", [student[0].id, fee_structure_id]);
    
    if (existing.length > 0) {
        await db.execute(
            "UPDATE fees SET amount_paid = amount_paid + ?, status = 'paid', payment_method = ?, transaction_id = ?, paid_date = CURRENT_TIMESTAMP WHERE id = ?",
            [amount, payment_method, transaction_id, existing[0].id]
        );
    } else {
        await db.execute(
            "INSERT INTO fees (student_id, fee_structure_id, amount_paid, status, payment_method, transaction_id, paid_date) VALUES (?, ?, ?, 'paid', ?, ?, CURRENT_TIMESTAMP)",
            [student[0].id, fee_structure_id, amount, payment_method, transaction_id]
        );
    }
    res.status(200).json({ success: true, message: "Payment successful (Demo)", transaction_id });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAdminFees = async (req, res) => {
    console.log("API HIT: GET /api/admin/fees");
    try {
        const [rows] = await db.execute(`
            SELECT 
                u.name as student_name,
                c.name as course_name,
                fs.category,
                fs.amount as total_fee,
                IFNULL(f.amount_paid, 0) as paid,
                IFNULL(f.status, 'pending') as status
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN courses c ON s.course_id = c.id
            JOIN fee_structures fs ON c.id = fs.course_id
            LEFT JOIN fees f ON s.id = f.student_id AND fs.id = f.fee_structure_id
        `);
        console.log("Admin Fees:", rows);
        res.status(200).json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.submitComplaint = async (req, res) => {
    const { title, message } = req.body;
    try {
        await db.execute(
            "INSERT INTO complaints (user_id, role, title, message) VALUES (?, ?, ?, ?)",
            [req.user.id, req.user.role, title, message]
        );
        res.status(200).json({ success: true, message: "Complaint/Feedback submitted successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAdminComplaints = async (req, res) => {
    console.log("API HIT: GET /api/admin/complaints");
    try {
        const [rows] = await db.execute(`
            SELECT cmp.*, u.name as user_name 
            FROM complaints cmp 
            JOIN users u ON cmp.user_id = u.id 
            ORDER BY cmp.created_at DESC
        `);
        console.log("Admin Complaints:", rows);
        res.status(200).json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteComplaint = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM complaints WHERE id = ?", [id]);
        res.status(200).json({ success: true, message: "Complaint deleted" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateProfileImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No image uploaded" });
  const profile_image = `/uploads/profile/${req.file.filename}`;
  try {
    const [user] = await db.execute("SELECT profile_image FROM users WHERE id = ?", [req.user.id]);
    if (user.length > 0 && user[0].profile_image) {
      const oldPath = path.join(__dirname, '..', user[0].profile_image);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    await db.execute("UPDATE users SET profile_image = ? WHERE id = ?", [profile_image, req.user.id]);
    res.status(200).json({ success: true, message: "Profile image updated", profile_image });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// Assignments
exports.createAssignment = async (req, res) => {
    const { course_id, session, title, description, type, questions, due_date, duration, total_marks } = req.body;
    try {
        const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
        let teacher_id = null;
        if (staff.length > 0) {
            teacher_id = staff[0].id;
        } else {
            console.warn("DEBUG: createAssignment - No staff record found for user_id:", req.user.id);
        }
        
        const [result] = await db.execute(
            "INSERT INTO assignments (course_id, session, teacher_id, title, description, type, due_date, duration, total_marks) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [course_id, session, teacher_id, title, description, type, due_date || null, duration || 30, total_marks || 0]
        );
        const assignment_id = result.insertId;

        if (questions && questions.length > 0) {
            for (const q of questions) {
                await db.execute(
                    "INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, type, marks) VALUES (?, ?, ?, ?, ?, ?)",
                    [assignment_id, q.question_text, JSON.stringify(q.options), q.correct_option || null, q.type || 'mcq', q.marks || 1]
                );
            }
        }
        res.status(200).json({ success: true, message: "Assignment created successfully" });
    } catch (error) { 
        console.error("DEBUG: createAssignment Error:", error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.getAssignments = async (req, res) => {
    const { course_id, session } = req.query;
    console.log("API HIT: GET /api/assignments", { course_id, session });
    try {
        let query = `
          SELECT a.*, c.name as course_name, u.name as teacher_name, d.name as department
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          LEFT JOIN departments d ON c.department_id = d.id
          JOIN staff st ON a.teacher_id = st.id
          JOIN users u ON st.user_id = u.id
        `;
        const params = [];

        if (req.user.role === 'student') {
            const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
            if (student.length > 0) {
                query = `
                    SELECT a.*, c.name as course_name, u.name as teacher_name, d.name as department,
                    sub.marks_obtained,
                    CASE WHEN sub.id IS NOT NULL THEN 1 ELSE 0 END as is_submitted
                    FROM assignments a
                    JOIN courses c ON a.course_id = c.id
                    LEFT JOIN departments d ON c.department_id = d.id
                    JOIN staff st ON a.teacher_id = st.id
                    JOIN users u ON st.user_id = u.id
                    LEFT JOIN assignment_submissions sub ON a.id = sub.assignment_id AND sub.student_id = ?
                `;
                params.push(student[0].id);
            }
        }

        if (course_id) {
            query += (query.includes("WHERE") ? " AND" : " WHERE") + " a.course_id = ?";
            params.push(course_id);
            if (session) {
                query += " AND a.session = ?";
                params.push(session);
            }
        }

        const [rows] = await db.execute(query, params);
        console.log("Assignments Data:", rows);
        res.status(200).json({ success: true, data: rows || [] });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
exports.getAssignmentStatus = async (req, res) => {
    const { assignment_id } = req.query;
    try {
        const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
        if (!student.length) return res.status(404).json({ success: false, message: "Student not found" });

        const [rows] = await db.execute(
            "SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?",
            [assignment_id, student[0].id]
        );
        res.status(200).json({ success: true, completed: rows.length > 0 });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getAssignmentDetails = async (req, res) => {
    const { id } = req.params;
    try {
        const [assignment] = await db.execute("SELECT * FROM assignments WHERE id = ?", [id]);
        if (assignment.length === 0) return res.status(404).json({ success: false, message: "Assignment not found" });

        const [questions] = await db.execute("SELECT * FROM assignment_questions WHERE assignment_id = ?", [id]);
        
        let studentSubmission = null;
        if (req.user.role === 'student') {
            const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
            if (student.length > 0) {
                const [submission] = await db.execute(
                    "SELECT * FROM assignment_submissions WHERE assignment_id = ? AND student_id = ?",
                    [id, student[0].id]
                );
                if (submission.length > 0) {
                    studentSubmission = submission[0];
                    studentSubmission.answers = typeof studentSubmission.answers === 'string' ? JSON.parse(studentSubmission.answers) : studentSubmission.answers;
                }
            }
        }

        const isTeacherOrAdmin = req.user.role === 'teacher' || req.user.role === 'admin';
        const isSubmitted = studentSubmission !== null;

        res.status(200).json({ 
            success: true, 
            data: { 
                ...assignment[0], 
                questions: questions.map(q => {
                    const mappedQ = {
                        ...q,
                        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
                    };
                    // Only include correct_option if teacher/admin or if student has submitted
                    if (!isTeacherOrAdmin && !isSubmitted) {
                        delete mappedQ.correct_option;
                    }
                    return mappedQ;
                }),
                submission: studentSubmission
            } 
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.submitAssignment = async (req, res) => {
    const { assignment_id, answers, auto_submitted } = req.body;
    try {
        const [student] = await db.execute("SELECT id FROM students WHERE user_id = ?", [req.user.id]);
        if (student.length === 0) return res.status(404).json({ success: false, message: "Student record not found" });

        // Auto Grade MCQ questions
        const [questions] = await db.execute("SELECT id, correct_option, type, marks FROM assignment_questions WHERE assignment_id = ?", [assignment_id]);
        let mcq_marks = 0;
        
        questions.forEach(q => {
            if (q.type === 'mcq') {
                const studentAnswer = answers[q.id];
                if (studentAnswer && studentAnswer.toLowerCase() === q.correct_option.toLowerCase()) {
                    mcq_marks += q.marks;
                }
            }
        });

        await db.execute(
            "INSERT INTO assignment_submissions (assignment_id, student_id, answers, auto_submitted, mcq_marks, marks_obtained) VALUES (?, ?, ?, ?, ?, ?)",
            [assignment_id, student[0].id, JSON.stringify(answers), auto_submitted || false, mcq_marks, mcq_marks]
        );
        res.status(200).json({ success: true, message: "Assignment submitted successfully" });
    } catch (error) { 
        console.error("DEBUG: submitAssignment Error:", error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.getSubmissions = async (req, res) => {
    const { assignment_id } = req.query;
    console.log("DEBUG: getSubmissions HIT. assignment_id:", assignment_id);

    if (!assignment_id) return res.status(400).json({ success: false, message: "Assignment ID is required" });

    try {
        // 1. Get assignment details
        const [assignments] = await db.execute("SELECT course_id, session, title FROM assignments WHERE id = ?", [assignment_id]);
        
        if (assignments.length === 0) {
            console.warn(`DEBUG: Assignment ${assignment_id} not found!`);
            return res.status(404).json({ success: false, message: "Assignment not found" });
        }

        const assignment = assignments[0];
        const course_id = assignment.course_id;
        const session = assignment.session ? assignment.session.trim() : null;
        const title = assignment.title;

        console.log(`DEBUG: Assignment Details - Title: ${title}, CourseID: ${course_id}, Session: ${session}`);

        // 2. Query students
        // We use COALESCE/IFNULL to handle potential nulls in course_id comparison
        const query = `
            SELECT 
                st.id as student_id, 
                st.roll_no, 
                u.name as student_name, 
                u.email,
                sub.id as submission_id, 
                sub.marks_obtained, 
                sub.mcq_marks, 
                sub.theory_marks, 
                sub.remarks, 
                sub.submitted_at, 
                sub.answers
            FROM students st
            JOIN users u ON st.user_id = u.id
            LEFT JOIN assignment_submissions sub ON st.id = sub.student_id AND sub.assignment_id = ?
            WHERE (
                (st.course_id = ? AND (? IS NULL OR ? = '' OR st.session = ?))
                OR (sub.id IS NOT NULL)
            )
            ORDER BY st.roll_no ASC
        `;

        // Parameters: assignment_id, course_id, session, session, session
        const [rows] = await db.execute(query, [assignment_id, course_id, session, session, session]);
        
        console.log(`DEBUG: Found ${rows.length} rows for assignment ${assignment_id}`);

        res.status(200).json({ 
            success: true, 
            data: rows || [],
            meta: { assignment_title: title, course_id, session }
        });
    } catch (error) { 
        console.error("CRITICAL: getSubmissions Error:", error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};exports.evaluateSubmission = async (req, res) => {
    const { submission_id, marks, remarks, theory_marks } = req.body;
    try {
        const [submission] = await db.execute("SELECT mcq_marks FROM assignment_submissions WHERE id = ?", [submission_id]);
        if (!submission.length) return res.status(404).json({ success: false, message: "Submission not found" });
        
        const mcq_marks = submission[0].mcq_marks || 0;
        const total_obtained = mcq_marks + (theory_marks || 0);

        await db.execute(
            "UPDATE assignment_submissions SET theory_marks = ?, marks_obtained = ?, remarks = ?, evaluated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [theory_marks || 0, total_obtained, remarks, submission_id]
        );
        res.status(200).json({ success: true, message: "Submission evaluated" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};


// New Enhancements

exports.addMultipleSubjects = async (req, res) => {
    console.log("DEBUG: addMultipleSubjects HIT with body:", JSON.stringify(req.body));
    const { course_id, session, subjects } = req.body;
    if (!course_id || !session || !subjects || !subjects.length) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
        const [staff] = await db.execute("SELECT id FROM staff WHERE user_id = ?", [req.user.id]);
        const teacher_id = staff.length > 0 ? staff[0].id : null;

        for (const sub of subjects) {
            const name = sub.subjectName || sub.name;
            const code = sub.subjectCode || sub.subject_code;
            
            if (!name || !code) continue;

            await db.execute(
                "INSERT INTO subjects (name, subject_code, course_id, session, teacher_id) VALUES (?, ?, ?, ?, ?)",
                [name, code, course_id, session, teacher_id]
            );
        }
        res.status(200).json({ success: true, message: "Subjects added successfully" });
    } catch (error) { 
        console.error("DEBUG: addMultipleSubjects Error:", error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

exports.bulkUploadMarks = async (req, res) => {
    const { course_id, session, exam_name, marks_data } = req.body;
    if (!course_id || !session || !exam_name || !marks_data || !marks_data.length) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    try {
        for (const m of marks_data) {
            await db.execute(
                "INSERT INTO results (student_id, subject_id, marks_obtained, max_marks, exam_name, session, course_id) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), max_marks = VALUES(max_marks)",
                [m.student_id, m.subject_id, m.marks, Number(m.max_marks || 100), exam_name, session, course_id]
            );
        }
        res.status(200).json({ success: true, message: "Marks uploaded successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getSavedMarks = async (req, res) => {
    const { course_id, session, exam_name } = req.query;
    console.log("API HIT: GET /api/teacher/marks", { course_id, session, exam_name });
    try {
        const [rows] = await db.execute(`
            SELECT r.*, u.name as student_name, st.roll_no, s.name as subject_name 
            FROM results r 
            JOIN students st ON r.student_id = st.id 
            JOIN users u ON st.user_id = u.id 
            JOIN subjects s ON r.subject_id = s.id 
            WHERE r.course_id = ? AND r.session = ? AND r.exam_name = ?
        `, [course_id, session, exam_name]);
        console.log("Saved Marks:", rows);
        res.status(200).json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateMarksBulk = async (req, res) => {
    const { marks_data } = req.body;
    try {
        for (const m of marks_data) {
            await db.execute(
                "UPDATE results SET marks_obtained = ?, max_marks = ? WHERE id = ?",
                [m.marks, Number(m.max_marks || 100), m.id]
            );
        }
        res.status(200).json({ success: true, message: "Marks updated successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteMarksBulk = async (req, res) => {
    const { course_id, session, exam_name } = req.query;
    try {
        await db.execute(
            "DELETE FROM results WHERE course_id = ? AND session = ? AND exam_name = ?",
            [course_id, session, exam_name]
        );
        res.status(200).json({ success: true, message: "Marks deleted successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getStudentSubjects = async (req, res) => {
    console.log("API HIT: GET /api/student/subjects");
    try {
        const [student] = await db.execute("SELECT course_id, session FROM students WHERE user_id = ?", [req.user.id]);
        if (student.length === 0) return res.status(200).json({ success: true, data: [] });
        const [rows] = await db.execute(
            "SELECT * FROM subjects WHERE course_id = ? AND session = ?",
            [student[0].course_id, student[0].session]
        );
        console.log("Student Subjects:", rows);
        res.status(200).json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
// Assignments
exports.updateAssignment = async (req, res) => {
    const { id } = req.params;
    const { title, description, course_id, session, type, duration, questions, total_marks } = req.body;
    try {
        await db.execute(
            "UPDATE assignments SET title = ?, description = ?, course_id = ?, session = ?, type = ?, duration = ?, total_marks = ? WHERE id = ?",
            [title, description, course_id, session, type, duration, total_marks || 0, id]
        );

        if (questions && questions.length > 0) {
            await db.execute("DELETE FROM assignment_questions WHERE assignment_id = ?", [id]);
            for (const q of questions) {
                await db.execute(
                    "INSERT INTO assignment_questions (assignment_id, question_text, options, correct_option, type, marks) VALUES (?, ?, ?, ?, ?, ?)",
                    [id, q.question_text, JSON.stringify(q.options), q.correct_option || null, q.type || 'mcq', q.marks || 1]
                );
            }
        }

        res.status(200).json({ success: true, message: "Assignment updated successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteAssignment = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute("DELETE FROM assignments WHERE id = ?", [id]);
        res.status(200).json({ success: true, message: "Assignment deleted successfully" });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
