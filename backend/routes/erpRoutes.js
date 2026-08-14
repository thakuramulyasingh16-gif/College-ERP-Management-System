const express = require("express");
const router = express.Router();
const erpController = require("../controllers/erpController");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");

// Common
router.get("/dashboard-stats", auth(["admin", "teacher", "student"]), erpController.getDashboardStats);
router.get("/notices", auth(["admin", "teacher", "student"]), erpController.getNotices);
router.post("/notices", auth(["admin"]), erpController.createNotice);
router.delete("/notices/:id", auth(["admin"]), erpController.deleteNotice);

// Departments
router.get("/departments", auth(["admin", "teacher", "student"]), erpController.getDepartments);
router.post("/departments", auth(["admin"]), erpController.createDepartment);
router.put("/departments/:id", auth(["admin"]), erpController.updateDepartment);
router.delete("/departments/:id", auth(["admin"]), erpController.deleteDepartment);

// Courses
router.get("/courses", auth(["admin", "teacher", "student"]), erpController.getCourses);
router.post("/courses", auth(["admin"]), erpController.createCourse);
router.put("/courses/:id", auth(["admin"]), erpController.updateCourse);
router.delete("/courses/:id", auth(["admin"]), erpController.deleteCourse);

// Subjects
router.get("/subjects", auth(["admin", "teacher", "student"]), erpController.getSubjects);
router.post("/subjects", auth(["admin", "teacher"]), erpController.createSubject);
router.put("/subjects/:id", auth(["admin", "teacher"]), erpController.updateSubject);
router.delete("/subjects/:id", auth(["admin", "teacher"]), erpController.deleteSubject);

// Teachers
router.get("/staff", auth(["admin"]), erpController.getStaff);
router.get("/teachers", auth(["admin"]), erpController.getStaff);
router.get("/teacher/students", auth(["teacher"]), erpController.getTeacherStudents);
router.post("/teachers", auth(["admin"]), upload.single('profile_image'), erpController.createTeacher);
router.put("/teachers/:id", auth(["admin"]), upload.single('profile_image'), erpController.updateTeacher);
router.delete("/teachers/:id", auth(["admin"]), erpController.deleteTeacher);

// Students
router.get("/students", auth(["admin", "teacher", "student"]), erpController.getStudents);
router.post("/students", auth(["admin", "teacher"]), upload.single('profile_image'), erpController.createStudent);
router.put("/students/:id", auth(["admin"]), upload.single('profile_image'), erpController.updateStudent);
router.delete("/students/:id", auth(["admin"]), erpController.deleteStudent);

// Profile
router.post("/update-profile-image", auth(["admin", "teacher", "student"]), upload.single('profile_image'), erpController.updateProfileImage);

// Auth/Admin
router.post("/reset-password", auth(["admin"]), erpController.resetPassword);

// Fees
router.get("/fee-structures", auth(["admin", "student"]), erpController.getFeeStructures);
router.get("/fees", auth(["admin", "student"]), erpController.getFeeStructures);
router.post("/fee-structures", auth(["admin"]), erpController.createFeeStructure);
router.put("/fee-structures/:id", auth(["admin"]), erpController.updateFeeStructure);
router.delete("/fee-structures/:id", auth(["admin"]), erpController.deleteFeeStructure);
router.get("/fees/student/:id", auth(["admin", "student"]), erpController.getStudentFeesById);
router.get("/student/fees", auth(["student"]), erpController.getStudentFees);
router.post("/student/pay-fee", auth(["student"]), erpController.payStudentFee);
router.get("/admin/fees", auth(["admin"]), erpController.getAdminFees);

// Complaints
router.post("/complaints", auth(["student", "teacher"]), erpController.submitComplaint);
router.get("/admin/complaints", auth(["admin"]), erpController.getAdminComplaints);
router.delete("/admin/complaints/:id", auth(["admin"]), erpController.deleteComplaint);

// Sessions
router.get("/sessions", auth(["admin", "teacher", "student"]), erpController.getSessions);
router.post("/sessions", auth(["admin"]), erpController.createSession);

// Assignments
router.get("/assignments", auth(["admin", "teacher", "student"]), erpController.getAssignments);
router.get("/assignments/:id", auth(["admin", "teacher", "student"]), erpController.getAssignmentDetails);
router.get("/assignment/status", auth(["student"]), erpController.getAssignmentStatus);
router.post("/assignments", auth(["admin", "teacher"]), erpController.createAssignment);
router.put("/assignments/:id", auth(["admin", "teacher"]), erpController.updateAssignment);
router.delete("/assignments/:id", auth(["admin", "teacher"]), erpController.deleteAssignment);
router.post("/assignments/submit", auth(["student"]), erpController.submitAssignment);
router.get("/assignments/submissions", auth(["admin", "teacher"]), erpController.getSubmissions);
router.post("/assignments/evaluate", auth(["admin", "teacher"]), erpController.evaluateSubmission);

// Teacher Actions
router.get("/teacher/subjects", auth(["admin", "teacher"]), erpController.getTeacherSubjects);
router.post("/teacher/subjects/bulk", auth(["admin", "teacher"]), erpController.addMultipleSubjects);
router.get("/teacher/courses", auth(["admin", "teacher"]), erpController.getTeacherCourses);
router.get("/students/by-course", auth(["admin", "teacher"]), erpController.getStudentsByCourse);
router.post("/attendance/bulk", auth(["admin", "teacher"]), erpController.submitBulkAttendance);

router.post("/attendance", auth(["admin", "teacher"]), erpController.uploadAttendance);
router.post("/marks", auth(["admin", "teacher"]), erpController.uploadMarks);
router.get("/marks", auth(["admin", "teacher", "student"]), erpController.getMarks);
router.post("/teacher/marks/bulk", auth(["admin", "teacher"]), erpController.bulkUploadMarks);
router.get("/teacher/marks", auth(["admin", "teacher"]), erpController.getSavedMarks);
router.put("/teacher/marks/bulk", auth(["admin", "teacher"]), erpController.updateMarksBulk);
router.delete("/teacher/marks", auth(["admin", "teacher"]), erpController.deleteMarksBulk);
router.get("/notes", auth(["teacher", "student", "admin"]), erpController.getNotes);
router.post("/notes", auth(["teacher", "admin"]), upload.single('study_material'), erpController.uploadNote);
router.put("/notes/:id", auth(["teacher", "admin"]), upload.single('study_material'), erpController.updateNote);
router.delete("/notes/:id", auth(["teacher", "admin"]), erpController.deleteNote);

// Student Actions
router.get("/student/attendance", auth(["student"]), erpController.getStudentAttendance);
router.get("/student/results", auth(["student"]), erpController.getStudentResults);
router.get("/student/subjects", auth(["student"]), erpController.getStudentSubjects);

module.exports = router;
