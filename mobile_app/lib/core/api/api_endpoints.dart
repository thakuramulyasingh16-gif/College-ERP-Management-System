class ApiEndpoints {
  ApiEndpoints._();

  static const String baseUrl = "https://college-erp-management-system-a9xk.onrender.com/api";
  static const String mediaBaseUrl = "https://college-erp-management-system-a9xk.onrender.com";

  // Auth
  static const String login = "$baseUrl/auth/login";
  static const String verify = "$baseUrl/auth/verify";
  static const String logout = "$baseUrl/auth/logout";

  // Dashboard Stats & Notices
  static const String dashboardStats = "$baseUrl/dashboard-stats";
  static const String notices = "$baseUrl/notices";

  // Departments & Courses & Sessions & Subjects
  static const String departments = "$baseUrl/departments";
  static const String courses = "$baseUrl/courses";
  static const String sessions = "$baseUrl/sessions";
  static const String subjects = "$baseUrl/subjects";

  // Staff / Teachers
  static const String staff = "$baseUrl/staff";
  static const String teachers = "$baseUrl/teachers";
  static const String teacherStudents = "$baseUrl/teacher/students";
  static const String teacherSubjects = "$baseUrl/teacher/subjects";
  static const String teacherSubjectsBulk = "$baseUrl/teacher/subjects/bulk";
  static const String teacherCourses = "$baseUrl/teacher/courses";
  static const String studentsByCourse = "$baseUrl/students/by-course";
  static const String attendanceBulk = "$baseUrl/attendance/bulk";
  static const String teacherMarksBulk = "$baseUrl/teacher/marks/bulk";
  static const String teacherMarks = "$baseUrl/teacher/marks";
  static const String notes = "$baseUrl/notes";

  // Students
  static const String students = "$baseUrl/students";
  static const String studentRollNumber = "$baseUrl/student/roll-number";
  static const String studentAttendance = "$baseUrl/student/attendance";
  static const String studentResults = "$baseUrl/student/results";
  static const String studentSubjects = "$baseUrl/student/subjects";
  static const String studentFees = "$baseUrl/student/fees";
  static const String studentPayFee = "$baseUrl/student/pay-fee";

  // Fees
  static const String feeStructures = "$baseUrl/fee-structures";
  static const String adminFees = "$baseUrl/admin/fees";

  // Complaints
  static const String complaints = "$baseUrl/complaints";
  static const String adminComplaints = "$baseUrl/admin/complaints";

  // Assignments
  static const String assignments = "$baseUrl/assignments";
  static const String assignmentSubmissions = "$baseUrl/assignments/submissions";
  static const String assignmentEvaluate = "$baseUrl/assignments/evaluate";
  static const String assignmentSubmit = "$baseUrl/assignments/submit";
  static const String assignmentStatus = "$baseUrl/assignment/status";

  // Passwords
  static const String changePassword = "$baseUrl/change-password";
  static const String resetPassword = "$baseUrl/reset-password";

  static String getMediaUrl(String? mediaPath, [String? token]) {
    if (mediaPath == null || mediaPath.isEmpty) return '';
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return mediaPath;
    }
    final cleanPath = mediaPath.startsWith('/') ? mediaPath : '/$mediaPath';
    if (token != null && token.isNotEmpty) {
      return "$mediaBaseUrl$cleanPath?token=${Uri.encodeComponent(token)}";
    }
    return "$mediaBaseUrl$cleanPath";
  }
}
