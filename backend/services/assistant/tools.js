const db = require('../../config/db');
const { getAttendanceMinPercent } = require('./systemPrompt');

const MAX_ROWS = 25;
const MAX_NOTICE_ROWS = 10;
const MAX_STRING_LENGTH = 200;
const MAX_SERIALIZED_LENGTH = 8000;

/**
 * Tool declarations exposed to the LLM.
 * None of these tools accept any student identifier or filter argument;
 * identity is resolved once per request from the verified JWT (req.user.id).
 */
const TOOL_DECLARATIONS = [
  {
    name: 'get_profile',
    description: "Get the logged-in student's academic profile (course, department, session, current semester, roll number).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_attendance_summary',
    description: "Get the student's per-subject and overall attendance counts, percentage, classes needed to reach minimum attendance, and classes that can still be missed.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_results',
    description: "Get the student's exam results per exam/subject, overall average percentage, best and weakest subjects, and trend across exams.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_fees',
    description: "Get the student's fee categories (total, paid, due, status) and overall fee due.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_assignments',
    description: "Get the student's course and session assignments (title, type, total marks, submitted yes/no, marks obtained).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_subjects',
    description: "Get the list of subjects assigned to the student's course and session.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_notes',
    description: "Get study material notes available for the student's course and session (title, subject, teacher, link).",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_notices',
    description: 'Get the latest 10 college notices targeted to all users or students.',
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'get_progress_summary',
    description: "Get a combined summary of the student's profile, attendance, results, fees, and assignments in one call.",
    parameters: { type: 'object', properties: {} },
  },
];

function truncateString(str, maxLen = MAX_STRING_LENGTH) {
  if (typeof str !== 'string') return str;
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

function sanitizeValue(value, maxRows = MAX_ROWS, maxStrLen = MAX_STRING_LENGTH) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncateString(value, maxStrLen);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, maxRows).map((item) => sanitizeValue(item, maxRows, maxStrLen));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (Array.isArray(v) && v.length > maxRows) {
        out[k] = v.slice(0, maxRows).map((item) => sanitizeValue(item, maxRows, maxStrLen));
        out[`${k}_truncated`] = true;
        out[`${k}_total_count`] = v.length;
      } else {
        out[k] = sanitizeValue(v, maxRows, maxStrLen);
      }
    }
    return out;
  }
  return value;
}

/**
 * Truncates rows & strings and wraps tool output in untrusted-data delimiters.
 */
function sanitizeAndDelimitToolOutput(toolName, rawData, opts = {}) {
  const maxRows = opts.maxRows || MAX_ROWS;
  const maxStrLen = opts.maxStringLength || MAX_STRING_LENGTH;
  const sanitized = sanitizeValue(rawData, maxRows, maxStrLen);
  let serialized = JSON.stringify(sanitized);
  if (serialized.length > MAX_SERIALIZED_LENGTH) {
    serialized = serialized.slice(0, MAX_SERIALIZED_LENGTH - 15) + '...[truncated]';
  }
  return `<<<UNTRUSTED_ERP_DATA tool="${toolName}">>>\n${serialized}\n<<<END_UNTRUSTED_ERP_DATA>>>`;
}

/**
 * Computes attendance percentage and consecutive classes needed / missable.
 * Counts "late" as present.
 */
function computeAttendanceMetrics({ total = 0, present = 0, absent = 0, late = 0 }, minPercent = 75) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePresent = Math.max(0, Number(present) || 0);
  const safeAbsent = Math.max(0, Number(absent) || 0);
  const safeLate = Math.max(0, Number(late) || 0);
  const attended = safePresent + safeLate;

  if (safeTotal === 0) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      attended: 0,
      percentage: null,
      classes_to_attend: 0,
      classes_can_miss: 0,
    };
  }

  const percentage = Number(((attended / safeTotal) * 100).toFixed(2));
  const threshold = Number(minPercent) > 0 && Number(minPercent) <= 100 ? Number(minPercent) : 75;

  let classesToAttend = 0;
  let classesCanMiss = 0;

  if (attended * 100 < threshold * safeTotal) {
    if (threshold >= 100) {
      classesToAttend = null;
    } else {
      classesToAttend = Math.max(
        0,
        Math.ceil((threshold * safeTotal - 100 * attended) / (100 - threshold) - 1e-9)
      );
    }
    classesCanMiss = 0;
  } else {
    classesToAttend = 0;
    classesCanMiss = Math.max(
      0,
      Math.floor((100 * attended - threshold * safeTotal) / threshold + 1e-9)
    );
  }

  return {
    total: safeTotal,
    present: safePresent,
    absent: safeAbsent,
    late: safeLate,
    attended,
    percentage,
    classes_to_attend: classesToAttend,
    classes_can_miss: classesCanMiss,
  };
}

/**
 * Computes per-exam/subject results, overall average, best/weakest subject, and exam trend.
 * Does NOT invent letter grades or pass marks.
 */
function computeResultsSummary(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      entries: [],
      overall_average_percent: null,
      best_subject: null,
      weakest_subject: null,
      exam_trend: [],
      trend_direction: 'insufficient_data',
    };
  }

  const entries = [];
  let sumObtained = 0;
  let sumMax = 0;
  const subjectMap = new Map();
  const examMap = new Map();

  for (const r of rows) {
    const obtained = Number(r.marks_obtained);
    const maxMarks = r.max_marks !== null && r.max_marks !== undefined ? Number(r.max_marks) : null;
    const validMax = maxMarks !== null && !Number.isNaN(maxMarks) && maxMarks > 0;
    const pct = validMax && !Number.isNaN(obtained)
      ? Number(((obtained / maxMarks) * 100).toFixed(2))
      : null;

    const subjectName = r.subject_name || 'Unknown Subject';
    const examName = r.exam_name || 'Exam';

    entries.push({
      exam_name: examName,
      subject_name: subjectName,
      marks_obtained: Number.isNaN(obtained) ? null : obtained,
      max_marks: validMax ? maxMarks : null,
      percentage: pct,
      exam_date: r.exam_date || null,
    });

    if (validMax && !Number.isNaN(obtained)) {
      sumObtained += obtained;
      sumMax += maxMarks;

      if (!subjectMap.has(subjectName)) {
        subjectMap.set(subjectName, { subject: subjectName, obtained: 0, max: 0, count: 0 });
      }
      const sAgg = subjectMap.get(subjectName);
      sAgg.obtained += obtained;
      sAgg.max += maxMarks;
      sAgg.count += 1;

      if (!examMap.has(examName)) {
        examMap.set(examName, { exam_name: examName, obtained: 0, max: 0, subjects_count: 0 });
      }
      const eAgg = examMap.get(examName);
      eAgg.obtained += obtained;
      eAgg.max += maxMarks;
      eAgg.subjects_count += 1;
    }
  }

  const overallAverage = sumMax > 0 ? Number(((sumObtained / sumMax) * 100).toFixed(2)) : null;

  const subjectAverages = Array.from(subjectMap.values())
    .map((s) => ({
      subject: s.subject,
      average_percent: Number(((s.obtained / s.max) * 100).toFixed(2)),
      exams_count: s.count,
    }))
    .sort((a, b) => b.average_percent - a.average_percent);

  const bestSubject = subjectAverages.length > 0 ? subjectAverages[0] : null;
  const weakestSubject = subjectAverages.length > 1 ? subjectAverages[subjectAverages.length - 1] : null;

  const examTrend = Array.from(examMap.values()).map((e) => ({
    exam_name: e.exam_name,
    average_percent: Number(((e.obtained / e.max) * 100).toFixed(2)),
    subjects_count: e.subjects_count,
  }));

  let trendDirection = 'insufficient_data';
  if (examTrend.length >= 2) {
    const prev = examTrend[examTrend.length - 2].average_percent;
    const latest = examTrend[examTrend.length - 1].average_percent;
    const diff = latest - prev;
    if (diff > 1) trendDirection = 'improving';
    else if (diff < -1) trendDirection = 'declining';
    else trendDirection = 'stable';
  }

  return {
    entries,
    overall_average_percent: overallAverage,
    best_subject: bestSubject,
    weakest_subject: weakestSubject,
    exam_trend: examTrend,
    trend_direction: trendDirection,
  };
}

/**
 * Resolves the student ONCE per request from req.user.id and returns a closed-over tool runner.
 * No tool accepts a student id or any identifier from the model.
 */
async function createStudentToolRunner(userId, dbClient = db) {
  const [studentRows] = await dbClient.execute(
    `SELECT st.id, st.course_id, st.session, st.current_semester, st.roll_no, st.roll_no_locked,
            c.name AS course_name, d.name AS department_name
     FROM students st
     LEFT JOIN courses c ON st.course_id = c.id
     LEFT JOIN departments d ON c.department_id = d.id
     WHERE st.user_id = ?`,
    [userId]
  );

  // Closed-over student record for this request only
  const student = studentRows && studentRows.length > 0 ? studentRows[0] : null;

  async function fetchProfile() {
    if (!student) {
      return { found: false, message: 'Student profile record not found.' };
    }
    return {
      found: true,
      course_name: student.course_name || null,
      department_name: student.department_name || null,
      session: student.session || null,
      current_semester: student.current_semester ?? null,
      roll_no: student.roll_no || null,
      roll_no_locked: Boolean(student.roll_no_locked),
    };
  }

  async function fetchAttendanceSummary() {
    const minPercent = getAttendanceMinPercent();
    if (!student) {
      return {
        found: false,
        min_percent_required: minPercent,
        assumption: 'Late entries are counted as present.',
        overall: computeAttendanceMetrics({}, minPercent),
        by_subject: [],
      };
    }

    const [rows] = await dbClient.execute(
      `SELECT a.subject_id, COALESCE(s.name, 'General') AS subject_name, a.status
       FROM attendance a
       LEFT JOIN subjects s ON a.subject_id = s.id
       WHERE a.student_id = ?
       ORDER BY a.date DESC, a.id DESC`,
      [student.id]
    );

    const overallCounts = { total: 0, present: 0, absent: 0, late: 0 };
    const subjectBuckets = new Map();

    for (const row of rows || []) {
      const status = String(row.status || '').toLowerCase();
      const subjectKey = row.subject_id ? `${row.subject_id}::${row.subject_name}` : row.subject_name;
      if (!subjectBuckets.has(subjectKey)) {
        subjectBuckets.set(subjectKey, {
          subject_name: row.subject_name || 'General',
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
        });
      }
      const bucket = subjectBuckets.get(subjectKey);

      overallCounts.total += 1;
      bucket.total += 1;

      if (status === 'present') {
        overallCounts.present += 1;
        bucket.present += 1;
      } else if (status === 'late') {
        overallCounts.late += 1;
        bucket.late += 1;
      } else if (status === 'absent') {
        overallCounts.absent += 1;
        bucket.absent += 1;
      }
    }

    const bySubject = Array.from(subjectBuckets.values()).map((b) => ({
      subject_name: b.subject_name,
      ...computeAttendanceMetrics(b, minPercent),
    }));

    return {
      found: true,
      min_percent_required: minPercent,
      assumption: 'Late entries are counted as present.',
      overall: computeAttendanceMetrics(overallCounts, minPercent),
      by_subject: bySubject,
    };
  }

  async function fetchResults() {
    if (!student) {
      return { found: false, ...computeResultsSummary([]) };
    }
    const [rows] = await dbClient.execute(
      `SELECT r.marks_obtained, r.max_marks, r.exam_name, r.exam_date,
              COALESCE(s.name, 'Unknown Subject') AS subject_name
       FROM results r
       LEFT JOIN subjects s ON r.subject_id = s.id
       WHERE r.student_id = ?
       ORDER BY COALESCE(r.exam_date, '1970-01-01') ASC, r.id ASC`,
      [student.id]
    );
    return {
      found: true,
      ...computeResultsSummary(rows || []),
    };
  }

  async function fetchFees() {
    if (!student || !student.course_id) {
      return {
        found: Boolean(student),
        categories: [],
        overall_total: 0,
        overall_paid: 0,
        overall_due: 0,
      };
    }

    const [structures] = await dbClient.execute(
      'SELECT id, category, amount AS total_amount FROM fee_structures WHERE course_id = ?',
      [student.course_id]
    );
    const [feeRows] = await dbClient.execute(
      'SELECT fee_structure_id, amount_paid, status FROM fees WHERE student_id = ?',
      [student.id]
    );

    const feeByStructure = new Map();
    for (const f of feeRows || []) {
      const existing = feeByStructure.get(f.fee_structure_id);
      const paidVal = parseFloat(f.amount_paid || 0);
      if (existing) {
        existing.amount_paid += paidVal;
        existing.status = f.status || existing.status;
      } else {
        feeByStructure.set(f.fee_structure_id, {
          amount_paid: paidVal,
          status: f.status || 'pending',
        });
      }
    }

    let overallTotal = 0;
    let overallPaid = 0;
    let overallDue = 0;

    const categories = (structures || []).map((fs) => {
      const total = parseFloat(fs.total_amount || 0);
      const rec = feeByStructure.get(fs.id);
      const paid = rec ? rec.amount_paid : 0;
      const status = rec ? rec.status : 'pending';
      const due = status === 'paid' && paid >= total
        ? 0
        : Math.max(0, Number((total - paid).toFixed(2)));

      overallTotal += total;
      overallPaid += paid;
      overallDue += due;

      return {
        category: fs.category || 'General',
        total: Number(total.toFixed(2)),
        paid: Number(paid.toFixed(2)),
        due,
        status,
      };
    });

    return {
      found: true,
      categories,
      overall_total: Number(overallTotal.toFixed(2)),
      overall_paid: Number(overallPaid.toFixed(2)),
      overall_due: Number(overallDue.toFixed(2)),
    };
  }

  async function fetchAssignments() {
    if (!student || !student.course_id || !student.session) {
      return { found: Boolean(student), assignments: [] };
    }

    const [rows] = await dbClient.execute(
      `SELECT a.title, a.type, a.total_marks,
              sub.marks_obtained,
              CASE WHEN sub.id IS NOT NULL THEN 1 ELSE 0 END AS is_submitted
       FROM assignments a
       LEFT JOIN assignment_submissions sub
         ON a.id = sub.assignment_id AND sub.student_id = ?
       WHERE a.course_id = ? AND a.session = ?
       ORDER BY a.created_at DESC, a.id DESC`,
      [student.id, student.course_id, student.session]
    );

    const assignments = (rows || []).map((row) => ({
      title: row.title,
      type: row.type,
      total_marks: row.total_marks ?? 0,
      submitted: Boolean(row.is_submitted),
      marks_obtained: row.is_submitted ? row.marks_obtained : null,
    }));

    return {
      found: true,
      assignments,
    };
  }

  async function fetchSubjects() {
    if (!student || !student.course_id || !student.session) {
      return { found: Boolean(student), subjects: [] };
    }

    const [rows] = await dbClient.execute(
      `SELECT name, subject_code, semester, session
       FROM subjects
       WHERE course_id = ? AND session = ?
       ORDER BY semester ASC, name ASC`,
      [student.course_id, student.session]
    );

    const subjects = (rows || []).map((row) => ({
      name: row.name,
      subject_code: row.subject_code || null,
      semester: row.semester ?? null,
      session: row.session || null,
    }));

    return {
      found: true,
      subjects,
    };
  }

  async function fetchNotes() {
    if (!student || !student.course_id || !student.session) {
      return { found: Boolean(student), notes: [] };
    }

    const [rows] = await dbClient.execute(
      `SELECT n.title, n.file_url, n.url,
              s.name AS subject_name, u.name AS teacher_name
       FROM notes n
       LEFT JOIN subjects s ON n.subject_id = s.id
       LEFT JOIN staff st_rec ON n.uploaded_by = st_rec.id
       LEFT JOIN users u ON st_rec.user_id = u.id
       WHERE n.course_id = ? AND (n.session = ? OR UPPER(n.session) = 'ALL')
       ORDER BY n.created_at DESC, n.id DESC`,
      [student.course_id, student.session]
    );

    const notes = (rows || []).map((row) => ({
      title: row.title,
      subject: row.subject_name || null,
      teacher: row.teacher_name || null,
      link: row.file_url || row.url || null,
    }));

    return {
      found: true,
      notes,
    };
  }

  async function fetchNotices() {
    const [rows] = await dbClient.execute(
      `SELECT title, content, target_role, created_at
       FROM notices
       WHERE target_role IN ('all', 'student')
       ORDER BY created_at DESC, id DESC
       LIMIT 10`
    );

    const notices = (rows || []).map((row) => ({
      title: row.title,
      content: row.content,
      target_role: row.target_role,
      created_at: row.created_at || null,
    }));

    return { notices };
  }

  async function fetchProgressSummary() {
    const [profile, attendance, results, fees, assignmentsData] = await Promise.all([
      fetchProfile(),
      fetchAttendanceSummary(),
      fetchResults(),
      fetchFees(),
      fetchAssignments(),
    ]);

    const allAssignments = assignmentsData.assignments || [];
    const submittedCount = allAssignments.filter((a) => a.submitted).length;

    return {
      profile,
      attendance: {
        min_percent_required: attendance.min_percent_required,
        assumption: attendance.assumption,
        overall: attendance.overall,
      },
      results: {
        entries_count: (results.entries || []).length,
        overall_average_percent: results.overall_average_percent,
        best_subject: results.best_subject,
        weakest_subject: results.weakest_subject,
        trend_direction: results.trend_direction,
      },
      fees: {
        overall_total: fees.overall_total,
        overall_paid: fees.overall_paid,
        overall_due: fees.overall_due,
        pending_categories: (fees.categories || []).filter((c) => c.due > 0).length,
      },
      assignments: {
        total: allAssignments.length,
        submitted: submittedCount,
        pending: allAssignments.length - submittedCount,
      },
    };
  }

  const rawHandlers = {
    get_profile: fetchProfile,
    get_attendance_summary: fetchAttendanceSummary,
    get_results: fetchResults,
    get_fees: fetchFees,
    get_assignments: fetchAssignments,
    get_subjects: fetchSubjects,
    get_notes: fetchNotes,
    get_notices: fetchNotices,
    get_progress_summary: fetchProgressSummary,
  };

  async function executeRaw(toolName) {
    const handler = rawHandlers[toolName];
    if (!handler) {
      return { error: `Unknown tool: ${toolName}` };
    }
    return handler();
  }

  async function executeTool(toolName) {
    const raw = await executeRaw(toolName);
    const maxRows = toolName === 'get_notices' ? MAX_NOTICE_ROWS : MAX_ROWS;
    return sanitizeAndDelimitToolOutput(toolName, raw, { maxRows });
  }

  return {
    studentId: student ? student.id : null,
    executeTool,
    executeRaw,
  };
}

module.exports = {
  TOOL_DECLARATIONS,
  MAX_ROWS,
  MAX_NOTICE_ROWS,
  MAX_STRING_LENGTH,
  sanitizeAndDelimitToolOutput,
  computeAttendanceMetrics,
  computeResultsSummary,
  createStudentToolRunner,
};
