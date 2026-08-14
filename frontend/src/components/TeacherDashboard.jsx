import React, { useState, useEffect } from 'react';
import { fetchData, getToken, authFetch } from '../utils/api';
import { 
  Users, BookMarked, CheckCircle2,
  Calendar, Search, ArrowRight, Check, X, Clock, GraduationCap, Bell, AlertCircle, Plus, Trash2, FileText, List, Pencil, Eye, BookOpen
} from 'lucide-react';
import { Loader, ErrorMessage } from './UIHelpers';
import { generateSessions, UG_COURSES, PG_COURSES } from '../utils/sessionHelper';

import { useAuth } from '../context/AuthContext';
import api from '../api';

const TeacherDashboard = ({ activeTab, setActiveTab }) => {
  const { user: teacher } = useAuth();
  const token = getToken();
  
  const [activeTeacherDept, setActiveTeacherDept] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [headerSessions, setHeaderSessions] = useState([]);

  // Attendance State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [attendanceSession, setAttendanceSession] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkAttendance, setBulkAttendance] = useState([]); 

  // Marks State
  const [marksCourse, setMarksCourse] = useState('');
  const [marksSession, setMarksSession] = useState('');
  const [marksSubjects, setMarksSubjects] = useState([]); 
  const [examName, setExamName] = useState('');
  const [marksModal, setMarksModal] = useState({ open: false, type: 'create', data: [] });
  const [marksSubmitting, setMarksSubmitting] = useState(false);

  // Assignment State
  const [assignments, setAssignments] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isEditingAssignment, setIsEditingAssignment] = useState(false);
  const [assignForm, setAssignForm] = useState({ 
    id: null,
    course_id: '', 
    session: '', 
    title: '', 
    description: '', 
    type: 'mcq', 
    duration: 30,
    total_marks: 0,
    questions: [{ type: 'mcq', question_text: '', options: { a: '', b: '', c: '', d: '' }, correct_option: 'a', marks: 1 }] 
  });
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [evaluation, setEvaluation] = useState({ open: false, submission: null, marks: '', remarks: '', theory_marks: '' });

  // ... (Material state and others)

  // Material State
  const [materials, setMaterials] = useState([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [isEditingMaterial, setIsEditingMaterial] = useState(false);
  const [materialType, setMaterialType] = useState('file'); // 'file' or 'url'
  const [materialForm, setMaterialForm] = useState({ id: null, title: '', file: null, url: '', course_id: '', session: '', subject_id: '' });
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');

  // Subject Management State
  const [subjectForm, setSubjectForm] = useState({ name: '', subject_code: '', course_id: '', session: '' });
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [showSubjectEditModal, setShowSubjectEditModal] = useState(false);
  const [subSearch, setSubSearch] = useState('');
  const [subCourseFilter, setSubCourseFilter] = useState('');
  const [subSessionFilter, setSubSessionFilter] = useState('');

  // Complaint Form State
  const [complaintForm, setComplaintForm] = useState({ title: '', message: '' });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  // STEP 1: VALIDATE TEACHER DATA
  if (!teacher) {
    console.error("No teacher found, redirecting to login");
    window.location.href = '/login';
    return null;
  }

  // Initial Data Fetching
  const fetchInitialData = async () => {
    if (loading || !teacher) return;
    setLoading(true);
    try {
      // Refresh teacher profile if missing record ID
      if (!teacher.staff_record_id) {
          try {
              const meRes = await api.get('/auth/me').catch(() => null); // Hypothetical, let's use a safer check
              // If we don't have /auth/me, we can use the fact that teachers have subjects
              const subRes = await api.get('/teacher/subjects');
              if (subRes.data.success && subRes.data.data.length > 0) {
                  const firstSub = subRes.data.data[0];
                  // If the backend returns staff info in subjects
                  if (firstSub.staff_id) {
                      teacher.staff_record_id = firstSub.staff_id;
                      localStorage.setItem("user", JSON.stringify(teacher));
                  }
              }
          } catch (err) { console.error("Could not sync teacher ID", err); }
      }

      let tDept = (teacher.department || "").toLowerCase().trim();
      
      if (!tDept) {
          try {
              const subRes = await api.get('/teacher/subjects');
              if (subRes.data.success && subRes.data.data.length > 0) {
                  tDept = (subRes.data.data[0].department_name || "").toLowerCase().trim();
              }
          } catch (err) { console.error("Could not infer department", err); }
      }

      if (!tDept) tDept = "bca";
      setActiveTeacherDept(tDept);

      const [coursesRes, subjectsRes, sessionsRes] = await Promise.all([
        authFetch(`http://localhost:5000/api/courses`), 
        authFetch(`http://localhost:5000/api/subjects`),
        authFetch(`http://localhost:5000/api/sessions`)
      ]);

      const coursesData = await coursesRes.json();
      const subjectsData = await subjectsRes.json();
      const sessionsData = await sessionsRes.json();

      if (coursesData.success) {
        const allCourses = Array.isArray(coursesData.data) ? coursesData.data : [];
        const filtered = allCourses
          .map(c => ({ ...c, department: c.department_name || "BCA" }))
          .filter(c => {
              const courseDept = (c.department_name || c.department || "").toLowerCase().trim();
              return !tDept || courseDept === tDept || tDept === "bca";
          });
        setTeacherCourses(filtered);
      }

      if (subjectsData.success) {
        const allSubjects = Array.isArray(subjectsData.data) ? subjectsData.data : [];
        const filtered = allSubjects
          .map(s => ({ ...s, department: s.department || "BCA" }))
          .filter(s => {
              const subDept = (s.department || "").toLowerCase().trim();
              return !tDept || subDept === tDept || tDept === "bca";
          });
        setSubjects(filtered);
      }

      if (sessionsData.success) setSessions(Array.isArray(sessionsData.data) ? sessionsData.data : []);
    } catch (err) {
      console.error("Error fetching initial teacher data:", err);
      setError("Failed to load department data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherData = async () => {
    if (loading || !teacher) return;
    setLoading(true);
    setError(null);
    try {
      const tDept = activeTeacherDept || (teacher.department || "BCA").toLowerCase().trim();

      // Students
      const res = await authFetch(`http://localhost:5000/api/teacher/students`);
      const result = await res.json();
      if(result.success){
        const fetchedStudents = Array.isArray(result.data) ? result.data : [];
        setAllStudents(fetchedStudents);
        
        const filtered = fetchedStudents.filter(student => {
            const studentCourse = (student.course || "").toLowerCase().trim();
            const studentDept = (student.department || "").toLowerCase().trim();
            if (studentDept === tDept) return true;
            const matchesCourse = teacherCourses.some(tc => 
                (tc.name || "").toLowerCase().trim() === studentCourse || 
                tc.id == student.course_id
            );
            if (!studentDept && tDept === "bca") return true;
            return matchesCourse;
        });

        const uiFiltered = filtered.filter(s => {
            const matchesSearch = !searchTerm || 
                s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) || 
                (s.roll_number && s.roll_number.toLowerCase().includes(searchTerm.toLowerCase().trim()));
            const matchesCourse = !courseFilter || s.course_id == courseFilter;
            const matchesSession = !sessionFilter || 
                (s.session || "").toLowerCase().trim() === sessionFilter.toLowerCase().trim();
            return matchesSearch && matchesCourse && matchesSession;
        });
        setStudents(uiFiltered);
      }
      
      // Assignments
      const aRes = await authFetch(`http://localhost:5000/api/assignments`);
      const aResult = await aRes.json();
      if (aResult.success) {
        const allAssignments = Array.isArray(aResult.data) ? aResult.data : [];
        const filtered = allAssignments.filter(a => {
            const assignDept = (a.department || "").toLowerCase().trim();
            return !tDept || assignDept === tDept || tDept === "bca";
        }).filter(a => {
            const matchesSession = !sessionFilter || (a.session || "").toLowerCase().trim() === sessionFilter.toLowerCase().trim();
            return matchesSession;
        });
        setAssignments(filtered);
      }

      // Notes
      if (activeTab === 'notes') {
        const nRes = await authFetch(`http://localhost:5000/api/notes`);
        const nResult = await nRes.json();
        if (nResult.success) {
          const allNotes = Array.isArray(nResult.data) ? nResult.data : [];
          const filtered = allNotes.filter(n => {
              // 1. Always show if uploaded by this teacher (by ID or Name)
              if (n.uploaded_by && teacher.staff_record_id && String(n.uploaded_by) === String(teacher.staff_record_id)) return true;
              if (n.teacher_name && teacher.name && n.teacher_name.toLowerCase().trim() === teacher.name.toLowerCase().trim()) return true;

              // 2. Show if orphaned (no department or course assigned)
              if (!n.department && !n.course_id) return true;

              // 3. Department and Session matching
              const noteDept = (n.department || "").toLowerCase().trim();
              // Be permissive: show if no dept assigned to note, or if it matches teacher's dept
              const isMatch = !tDept || !noteDept || noteDept === tDept || tDept === "bca";
              
              const matchesSession = !sessionFilter || 
                                   !n.session ||
                                   (n.session || "").toLowerCase().trim().includes(sessionFilter.toLowerCase().trim()) ||
                                   String(n.session).toUpperCase() === 'ALL';
              
              return isMatch && matchesSession;
          });
          setMaterials(filtered);
        }
      }
    } catch (err) {
      console.error("Error fetching teacher dashboard data:", err);
      setError("Failed to fetch student data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [searchTerm, courseFilter, sessionFilter, activeTab, activeTeacherDept]);

  // Attendance Logic
  const fetchStudentsForAttendance = async (courseId, sessionName) => {
    if (!teacher || !allStudents) return;
    if (!courseId) {
        setBulkAttendance([]);
        return;
    }

    const tDept = activeTeacherDept || (teacher.department || "BCA").toLowerCase().trim();
    const courseObj = teacherCourses?.find(c => c.id == courseId);
    const courseName = (courseObj?.name || "").toLowerCase().trim();
    
    const filtered = allStudents.filter(student => {
        const studentDept = (student.department || "").toLowerCase().trim();
        const studentCourse = (student.course || "").toLowerCase().trim();
        
        let belongsToDept = studentDept === tDept;
        if (!belongsToDept && teacherCourses) {
            belongsToDept = teacherCourses.some(tc => (tc.name || "").toLowerCase().trim() === studentCourse);
        }
        if (!belongsToDept && tDept === "bca") belongsToDept = true;

        if (!belongsToDept) return false;

        const matchesCourse = student.course_id == courseId || studentCourse === courseName;
        const matchesSession = !sessionName || (student.session || "").toLowerCase().trim() === sessionName.toLowerCase().trim();
            
        return matchesCourse && matchesSession;
    });

    setBulkAttendance(filtered.map(s => ({ 
        student_id: s?.student_id, 
        roll_no: s?.roll_number, 
        name: s?.name, 
        session: s?.session, 
        status: 'absent' 
    })));
  };

  const handleStatusToggle = (studentId) => {
    setBulkAttendance(prev => Array.isArray(prev) ? prev.map(item => item?.student_id === studentId ? { ...item, status: item?.status === 'present' ? 'absent' : 'present' } : item) : []);
  };

  const markAllPresent = () => setBulkAttendance(prev => Array.isArray(prev) ? prev.map(item => ({ ...item, status: 'present' })) : []);

  const handleBulkAttendanceSubmit = async () => {
    if (!selectedCourse) return alert('Please select a course');
    if (!attendanceSession) return alert('Please enter session');
    try {
      await authFetch('http://localhost:5000/api/attendance/bulk', { 
          method: 'POST',
          body: JSON.stringify({ 
              course_id: selectedCourse, 
              date: attendanceDate, 
              session: attendanceSession,
              attendance_data: Array.isArray(bulkAttendance) ? bulkAttendance.map(a => ({ student_id: a?.student_id, status: a?.status })) : []
          })
      });
      alert('Attendance recorded successfully!');
    } catch (_err) { alert('Error: ' + _err.message); }
  };

  // Marks Logic
  useEffect(() => {
    const fetchMarksSubjects = async () => {
      if (loading || !teacher || !marksCourse || !marksSession) {
        if (!marksCourse || !marksSession) setMarksSubjects([]);
        return;
      }
      const courseObj = teacherCourses?.find(c => c.id == marksCourse);
      const courseName = courseObj ? courseObj.name : '';
      
      setLoading(true);
      try {
        const res = await authFetch(`http://localhost:5000/api/subjects?department_id=${teacher.department_id}&course=${courseName}&session=${marksSession}`);
        const result = await res.json();
        if (result.success) {
          setMarksSubjects(Array.isArray(result.data) ? result.data : []);
        }
      } catch (err) {
        console.error("DEBUG: Error fetching subjects for marks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarksSubjects();
  }, [marksCourse, marksSession]);

  const openMarksEntry = async () => {
    if (!teacher) return;
    if (!marksCourse || !marksSession) return alert("Select course and enter session");
    
    const tDept = activeTeacherDept || (teacher.department || "BCA").toLowerCase().trim();
    const courseObj = teacherCourses?.find(c => c.id == marksCourse);
    const courseName = (courseObj?.name || "").toLowerCase().trim();
    
    const filtered = allStudents.filter(student => {
        const studentDept = (student.department || "").toLowerCase().trim();
        const studentCourse = (student.course || "").toLowerCase().trim();
        
        let belongsToDept = studentDept === tDept;
        if (!belongsToDept && tDept === "bca") belongsToDept = true;

        const matchesCourse = student.course_id == marksCourse || studentCourse === courseName;
        const matchesSession = !marksSession || (student.session || "").toLowerCase().trim() === marksSession.toLowerCase().trim();
        
        return belongsToDept && matchesCourse && matchesSession;
    });

    const formatted = filtered.map(s => ({ 
        student_id: s.student_id, 
        student_name: s.name, 
        roll_no: s.roll_number, 
        subject_id: '', 
        marks: '',
        max_marks: 100
    }));
    setMarksModal({ open: true, type: 'create', data: formatted });
  };

  const openMarksEdit = async () => {
    if (!marksCourse || !marksSession || !examName) return alert("Select course, session and exam name");
    setLoading(true);
    try {
        const res = await api.get('/teacher/marks', {
            params: { course_id: marksCourse, session: marksSession, exam_name: examName }
        });
        const data = res.data.success ? res.data.data : (res.data || []);
        if (!data || data.length === 0) return alert("No marks found for this criteria");
        setMarksModal({ open: true, type: 'edit', data: Array.isArray(data) ? data : [] });
    } catch (err) { 
        console.error("Error fetching marks:", err);
        alert("Failed to fetch marks"); 
    }
    finally { setLoading(false); }
  };

  const handleMarksSubmit = async (e) => {
    e.preventDefault();
    if (!Array.isArray(marksModal.data) || marksModal.data.some(m => (marksModal.type === 'create' ? !m.subject_id : false) || (marksModal.type === 'create' ? m.marks === '' : m.marks_obtained === ''))) return alert("Fill all fields");
    if (marksModal.type === 'create' && !examName) return alert("Enter exam name");

    // Validation: Obtained marks <= Total marks
    const invalid = marksModal.data.find(m => {
        const obtained = Number(marksModal.type === 'create' ? m.marks : m.marks_obtained);
        const total = Number(m.max_marks || 100);
        return obtained > total;
    });
    if (invalid) return alert(`Obtained marks for ${invalid.student_name} cannot exceed total marks (${invalid.max_marks || 100})`);
    
    setMarksSubmitting(true);
    try {
        if (marksModal.type === 'create') {
            const promises = marksModal.data.map(m => {
                const payload = {
                    student_id: m.student_id,
                    subject: m.subject_id,
                    marks: Number(m.marks),
                    max_marks: Number(m.max_marks || 100),
                    course: marksCourse,
                    session: marksSession,
                    exam_name: examName
                };
                return api.post('/marks', payload);
            });
            await Promise.all(promises);
        } else {
            // Fix: Backend expects marks_data with 'marks' field for bulk update
            const updatePayload = { 
                marks_data: marksModal.data.map(m => ({ 
                    id: m.id, 
                    marks: Number(m.marks_obtained ?? m.marks),
                    max_marks: Number(m.max_marks ?? 100)
                })) 
            };
            await api.put('/teacher/marks/bulk', updatePayload);
        }
        alert("Marks saved successfully");
        setMarksModal({ open: false, type: 'create', data: [] });
    } catch (err) { 
        console.error("Error saving marks:", err);
        alert("Failed to save marks"); 
    }
    finally { setMarksSubmitting(false); }
  };

  const deleteMarks = async () => {
    if (!marksCourse || !marksSession || !examName) return alert("Select course, session and exam name");
    if (!window.confirm("Are you sure you want to delete marks for this exam?")) return;
    try {
        await authFetch(`http://localhost:5000/api/teacher/marks?course_id=${marksCourse}&session=${marksSession}&exam_name=${examName}`, {
            method: 'DELETE'
        });
        alert("Marks deleted successfully");
    } catch (err) { alert("Failed to delete marks"); }
  };

  // Assignment Logic
  const fetchSubmissions = async (assignId) => {
    setLoading(true);
    setSubmissions([]); // Clear previous to show fresh data
    try {
        console.log("DEBUG: Fetching submissions for Assignment ID:", assignId);
        const res = await authFetch(`http://localhost:5000/api/assignments/submissions?assignment_id=${assignId}`);
        const result = await res.json();
        
        console.log("DEBUG: Submissions API Result:", result);
        
        if (result.success) { 
            const fetchedSubmissions = Array.isArray(result.data) ? result.data : [];
            setSubmissions(fetchedSubmissions); 
        } else {
            console.error("DEBUG: Submissions API failed:", result.message);
        }
    } catch (err) { 
        console.error("DEBUG: fetchSubmissions Exception:", err); 
    } finally {
        setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    try {
        // Auto-calculate total marks if teacher didn't set it manually
        let finalTotalMarks = Number(assignForm.total_marks);
        if (finalTotalMarks === 0) {
            finalTotalMarks = assignForm.questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);
        }

        const payload = { ...assignForm, total_marks: finalTotalMarks };

        if (isEditingAssignment) {
            await authFetch(`http://localhost:5000/api/assignments/${assignForm.id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            alert('Assignment Updated Successfully!');
        } else {
            await authFetch('http://localhost:5000/api/assignments', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            alert('Assignment Created Successfully!');
        }
        setShowAssignModal(false);
        setIsEditingAssignment(false);
        setAssignForm({ id: null, course_id: '', session: '', title: '', description: '', type: 'mcq', duration: 30, total_marks: 0, questions: [{ type: 'mcq', question_text: '', options: { a: '', b: '', c: '', d: '' }, correct_option: 'a', marks: 1 }] });
        fetchTeacherData();
    } catch (err) { alert('Error saving assignment'); }
  };

  const handleDeleteAssignment = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;
    try {
        await api.delete(`/assignments/${id}`);
        alert("Assignment deleted successfully");
        fetchTeacherData();
    } catch (err) { alert("Failed to delete assignment"); }
  };

  const openEditAssignment = async (assign) => {
    setLoading(true);
    try {
        const res = await api.get(`/assignments/${assign.id}`);
        const result = res.data;
        if (result.success) {
            const data = result.data;
            setAssignForm({
                id: data.id, 
                course_id: data.course_id, 
                session: data.session, 
                title: data.title, 
                description: data.description, 
                type: data.type, 
                duration: data.duration,
                total_marks: data.total_marks || 0,
                questions: Array.isArray(data.questions) ? data.questions.map(q => ({ 
                    ...q, 
                    type: q.type || 'mcq',
                    marks: q.marks || 1,
                    options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options 
                })) : []
            });
            setIsEditingAssignment(true);
            setShowAssignModal(true);
        }
    } catch (err) { alert("Failed to load assignment details"); }
    finally { setLoading(false); }
  };

  const handleEvaluate = async (e) => {
    e.preventDefault();
    try {
        await api.post('/assignments/evaluate', { 
            submission_id: evaluation.submission.id, 
            theory_marks: Number(evaluation.theory_marks), 
            remarks: evaluation.remarks 
        });
        alert('Evaluated!');
        setEvaluation({ open: false, submission: null, marks: '', remarks: '', theory_marks: '' });
        fetchSubmissions(selectedAssignment.id);
    } catch (err) { alert('Error evaluating'); }
  };

  const handleAddQuestion = () => {
    const newQ = { type: 'mcq', question_text: '', options: { a: '', b: '', c: '', d: '' }, correct_option: 'a', marks: 1 };
    setAssignForm({ ...assignForm, questions: [...assignForm.questions, newQ] });
  };

  const handleRemoveQuestion = (index) => {
    const qs = [...assignForm.questions];
    qs.splice(index, 1);
    setAssignForm({ ...assignForm, questions: qs });
  };

  const handleQuestionChange = (index, field, value, optKey = null) => {
    const qs = [...assignForm.questions];
    if (optKey) {
        if (!qs[index].options) qs[index].options = { a: '', b: '', c: '', d: '' };
        qs[index].options[optKey] = value;
    } else {
        qs[index][field] = value;
        if (field === 'type' && value === 'theory') {
            delete qs[index].options;
            delete qs[index].correct_option;
        } else if (field === 'type' && value === 'mcq') {
            qs[index].options = { a: '', b: '', c: '', d: '' };
            qs[index].correct_option = 'a';
        }
    }
    setAssignForm({ ...assignForm, questions: qs });
  };

  // Material Logic
  const handleUploadMaterial = async (e) => {
    e.preventDefault();
    if (materialType === 'url' && materialForm.url && !materialForm.url.startsWith('http')) return alert("Invalid URL");
    setUploadingMaterial(true);
    
    const formData = new FormData();
    formData.append('title', materialForm.title);
    formData.append('course_id', materialForm.course_id);
    formData.append('session', materialForm.session);
    if (materialForm.subject_id) formData.append('subject_id', materialForm.subject_id);
    
    if (materialType === 'file' && materialForm.file) {
        formData.append('study_material', materialForm.file);
    } else if (materialType === 'url' && materialForm.url) {
        formData.append('url', materialForm.url);
    } else if (!isEditingMaterial) {
        setUploadingMaterial(false);
        return alert("Provide file or link");
    }

    try {
        if (isEditingMaterial) {
            await api.put(`/notes/${materialForm.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Updated!');
        } else {
            await api.post('/notes', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Uploaded!');
        }
        setShowMaterialModal(false);
        setIsEditingMaterial(false);
        setMaterialForm({ id: null, title: '', file: null, url: '', course_id: '', session: '', subject_id: '' });
        fetchTeacherData();
    } catch (err) { alert('Error saving material'); }
    finally { setUploadingMaterial(false); }
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("Delete material?")) return;
    try {
        await api.delete(`/notes/${id}`);
        alert("Deleted");
        fetchTeacherData();
    } catch (err) { alert("Failed to delete"); }
  };

  const openEditMaterial = (m) => {
    setMaterialForm({
        id: m.id,
        title: m.title,
        course_id: m.course_id,
        session: m.session,
        subject_id: m.subject_id || '',
        url: m.url || '',
        file: null
    });
    setMaterialType(m.url ? 'url' : 'file');
    setIsEditingMaterial(true);
    setShowMaterialModal(true);
  };

  // Subject Management
  const handleSubjectSubmit = async (e) => {
    e.preventDefault();
    if (!subjectForm.name || !subjectForm.subject_code || !subjectForm.course_id || !subjectForm.session) return alert("Fill all fields");
    setSubjectSubmitting(true);
    try {
        await api.post('/subjects', { 
            subjectName: subjectForm.name, 
            subjectCode: subjectForm.subject_code, 
            course: subjectForm.course_id, 
            session: subjectForm.session 
        });
        alert("Added!");
        setSubjectForm({ name: '', subject_code: '', course_id: '', session: '' });
        fetchInitialData();
    } catch (err) { alert("Failed to add"); }
    finally { setSubjectSubmitting(false); }
  };

  const handleUpdateSubject = async (e) => {
    e.preventDefault();
    try {
        await api.put(`/subjects/${editingSubject.id}`, editingSubject);
        alert("Updated!");
        setShowSubjectEditModal(false);
        fetchInitialData();
    } catch (err) { alert("Failed to update"); }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm("Delete subject?")) return;
    try {
        await api.delete(`/subjects/${id}`);
        alert("Deleted");
        fetchInitialData();
    } catch (err) { alert("Failed to delete"); }
  };

  const filteredSubjects = Array.isArray(subjects) ? subjects.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(subSearch.toLowerCase()) || s.subject_code.toLowerCase().includes(subSearch.toLowerCase());
    const matchesCourse = subCourseFilter === '' || s.course_id == subCourseFilter;
    const matchesSession = subSessionFilter === '' || (s.session || "").toLowerCase().trim() === subSessionFilter.toLowerCase().trim();
    return matchesSearch && matchesCourse && matchesSession;
  }) : [];

  // Feedback Logic
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintSubmitting(true);
    try {
        await api.post('/complaints', complaintForm);
        alert("Submitted!");
        setComplaintForm({ title: '', message: '' });
    } catch (err) { alert("Failed"); }
    finally { setComplaintSubmitting(false); }
  };

  // Rendering Helpers
  const renderHeader = (title) => (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative group w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}  />
          <input 
            type="text" placeholder="Search..." 
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-48 md:w-64 focus:ring-2 focus:ring-blue-500/20 outline-none"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <select className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="">All Courses</option>
          {Array.isArray(teacherCourses) && teacherCourses.map(c => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
        </select>
        <input 
          type="text" placeholder="Session" 
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 outline-none w-full sm:w-48"
          value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
        />
      </div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, color }) => {
    const colors = { blue: 'bg-blue-50 text-blue-600 border-blue-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
    return (
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-6 ${colors[color]} border`}>
          {Icon ? <Icon size={28} strokeWidth={2.5}  /> : <div className="text-xs font-black">{title?.charAt(0)}</div>}
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2 tracking-tighter">{value}</p>
      </div>
    );
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Students" value={students?.length || 0} icon={Users} color="indigo"  />
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
          <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 border border-green-100">
            <CheckCircle2 size={28} strokeWidth={2.5}  />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Quick Actions</p>
          <div className="mt-2 flex wrap gap-2">
            <button onClick={() => setActiveTab('attendance')} className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">Attendance</button>
            <button onClick={() => setActiveTab('assignments')} className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 transition-colors">Assignments</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAttendance = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <select className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); fetchStudentsForAttendance(e.target.value, attendanceSession); }}>
                <option value="">Choose Course</option>
                {Array.isArray(teacherCourses) && teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Session" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={attendanceSession} onChange={e => setAttendanceSession(e.target.value)} onBlur={() => fetchStudentsForAttendance(selectedCourse, attendanceSession)}  />
            <input type="date" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)}  />
        </div>
        <div className="flex gap-3">
            <button onClick={markAllPresent} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100">Mark All Present</button>
            <button onClick={handleBulkAttendanceSubmit} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700">Submit Attendance</button>
        </div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr><th className="px-8 py-5">Roll No</th><th className="px-8 py-5">Name</th><th className="px-8 py-5 text-center">Status</th><th className="px-8 py-5 text-right">Toggle</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bulkAttendance?.length > 0 ? bulkAttendance.map(s => (
              <tr key={s?.student_id} className="hover:bg-slate-50">
                <td className="px-8 py-5 font-black text-slate-400">#{s?.roll_no}</td>
                <td className="px-8 py-5 font-bold text-slate-800 uppercase">{s?.name}</td>
                <td className="px-8 py-5 text-center"><span className={"px-3 py-1 rounded-full text-[10px] font-black uppercase " + (s?.status === 'present' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600')}>{s?.status}</span></td>
                <td className="px-8 py-5 text-right"><button onClick={() => handleStatusToggle(s?.student_id)} className={"p-2 rounded-xl " + (s?.status === 'present' ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400')}>{s?.status === 'present' ? <Check size={18}  /> : <X size={18}  />}</button></td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="p-10 text-center text-slate-300 font-black uppercase tracking-widest text-sm">No students available</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMarks = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <select className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={marksCourse} onChange={e => setMarksCourse(e.target.value)}>
                <option value="">Choose Course</option>
                {Array.isArray(teacherCourses) && teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Session" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={marksSession} onChange={e => setMarksSession(e.target.value)}  />
            <input type="text" placeholder="Exam Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={examName} onChange={e => setExamName(e.target.value)}  />
        </div>
        <div className="flex wrap gap-3">
            <button onClick={openMarksEntry} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700">Enter Marks</button>
            <button onClick={openMarksEdit} className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100">View / Edit</button>
            <button onClick={deleteMarks} className="flex-1 py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100">Delete Marks</button>
        </div>
      </div>
      {marksModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                    <div><h3 className="text-xl font-black text-slate-800 uppercase">{marksModal.type === 'create' ? 'Enter Marks' : 'Edit Marks'}</h3></div>
                    <button onClick={() => setMarksModal({ ...marksModal, open: false })}><X size={24}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-8">
                    <form id="marksForm" onSubmit={handleMarksSubmit}>
                        <table className="w-full text-left">
                            <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                <tr><th className="pb-4">Roll No</th><th className="pb-4">Student</th><th className="pb-4">Subject</th><th className="pb-4 text-center">Marks</th><th className="pb-4 text-right">Total Marks</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {marksModal.data.map((m, idx) => (
                                    <tr key={idx}>
                                        <td className="py-4 font-black text-slate-400">#{m?.roll_no}</td>
                                        <td className="py-4 font-bold text-slate-800 uppercase">{m?.student_name}</td>
                                        <td className="py-4">
                                            {marksModal.type === 'create' ? (
                                                <select className="p-2 bg-slate-50 rounded-xl text-xs font-bold w-full outline-none" value={m?.subject_id} onChange={e => { const newData = [...marksModal.data]; newData[idx].subject_id = e.target.value; setMarksModal({ ...marksModal, data: newData }); }} required>
                                                    <option value="">Select Subject</option>
                                                    {marksSubjects.map(s => <option key={s?.id} value={s?.id}>{s?.name}</option>)}
                                                </select>
                                            ) : <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{m?.subject_name}</span>}
                                        </td>
                                        <td className="py-4 text-center"><input type="number" className="w-20 p-2 bg-slate-50 rounded-xl text-center font-black text-blue-600" value={marksModal.type === 'create' ? m?.marks : m?.marks_obtained} onChange={e => { const newData = [...marksModal.data]; if (marksModal.type === 'create') newData[idx].marks = e.target.value; else newData[idx].marks_obtained = e.target.value; setMarksModal({ ...marksModal, data: newData }); }} required /></td>
                                        <td className="py-4 text-right"><input type="number" className="w-20 p-2 bg-slate-50 rounded-xl text-center font-black text-slate-600" value={m?.max_marks || 100} onChange={e => { const newData = [...marksModal.data]; newData[idx].max_marks = e.target.value; setMarksModal({ ...marksModal, data: newData }); }} required /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </form>
                </div>
                <div className="p-8 border-t border-slate-100 flex gap-3">
                    <button type="submit" form="marksForm" disabled={marksSubmitting} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-blue-700 disabled:opacity-50">{marksSubmitting ? 'Saving...' : 'Save Marks'}</button>
                    <button onClick={() => setMarksModal({ ...marksModal, open: false })} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );

  const renderAssignments = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Academic Assignments</h2>
            <button onClick={() => { setAssignForm({ id: null, course_id: '', session: '', title: '', description: '', type: 'mcq', duration: 30, total_marks: 0, questions: [{ type: 'mcq', question_text: '', options: { a: '', b: '', c: '', d: '' }, correct_option: 'a', marks: 1 }] }); setIsEditingAssignment(false); setShowAssignModal(true); }} className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Create New</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assignments.map(a => (
                <div key={a.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl group hover:-translate-y-1 transition-all">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><FileText size={24} /></div>
                        <div className="flex gap-2"><button onClick={() => openEditAssignment(a)} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Pencil size={18} /></button><button onClick={() => handleDeleteAssignment(a.id)} className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 size={18} /></button></div>
                    </div>
                    <h3 className="font-black text-xl text-slate-800 uppercase">{a.title}</h3>
                    <p className="text-sm text-slate-500 font-bold mb-2 line-clamp-2">{a.description}</p>
                    <div className="flex gap-4 mb-6">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-widest">Marks: {a.total_marks}</span>
                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">Time: {a.duration} mins</span>
                    </div>
                    <button onClick={() => { setSelectedAssignment(a); fetchSubmissions(a.id); }} className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-50 hover:text-blue-600 transition-colors">View Submissions</button>
                </div>
            ))}
        </div>
        {selectedAssignment && (
            <div className="mt-12 bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Submissions: {selectedAssignment.title}</h3>
                    <button onClick={() => setSelectedAssignment(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Student</th>
                                <th className="px-8 py-5">Roll No</th>
                                <th className="px-8 py-5">Submitted At</th>
                                <th className="px-8 py-5">MCQ Marks</th>
                                <th className="px-8 py-5">Theory Marks</th>
                                <th className="px-8 py-5">Final Marks</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan="7" className="p-10 text-center text-indigo-500 font-black uppercase tracking-widest animate-pulse">Loading Submissions...</td></tr>
                            ) : (
                                <>
                                    {submissions.map(sub => (
                                        <tr key={sub.student_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-5 font-black text-slate-800 uppercase">
                                                <div className="flex flex-col">
                                                    <span>{sub?.student_name}</span>
                                                    <span className="text-[10px] text-slate-400 normal-case">{sub?.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5 font-bold text-slate-400">#{sub?.roll_no}</td>
                                            <td className="px-8 py-5 font-bold text-slate-400 text-xs">
                                                {sub?.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '--'}
                                            </td>
                                            <td className="px-8 py-5 font-black text-green-600">{sub?.submission_id ? sub?.mcq_marks : '--'}</td>
                                            <td className="px-8 py-5 font-black text-blue-600">{sub?.submission_id ? (sub?.theory_marks || 0) : '--'}</td>
                                            <td className="px-8 py-5 font-black text-slate-900">
                                                {sub?.submission_id ? (
                                                    <div className="flex flex-col">
                                                        <span>{sub?.marks_obtained !== null ? sub?.marks_obtained : '--'} / {selectedAssignment.total_marks}</span>
                                                        {sub?.theory_marks === null && selectedAssignment.type !== 'mcq' && (
                                                            <span className="text-[9px] text-orange-500 uppercase">Awaiting Theory</span>
                                                        )}
                                                    </div>
                                                ) : 'Not Attempted'}
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                {sub?.submission_id ? (
                                                    <button onClick={() => setEvaluation({ open: true, submission: { ...sub, id: sub.submission_id }, theory_marks: sub?.theory_marks || '', remarks: sub?.remarks || '' })} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-indigo-200">Evaluate</button>
                                                ) : (
                                                    <span className="px-4 py-2 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase italic">Missing</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {submissions.length === 0 && <tr><td colSpan="7" className="p-10 text-center text-slate-300 font-black uppercase tracking-widest italic">No students found for this course</td></tr>}
                                </>
                            )}
                        </tbody>                    </table>
                </div>
            </div>
        )}

        {evaluation.open && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative animate-in zoom-in-95">
                    <button onClick={() => setEvaluation({ open: false, submission: null, theory_marks: '', remarks: '' })} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    <h3 className="text-xl font-black text-slate-800 mb-2 uppercase tracking-tight">Evaluate Theory</h3>
                    <p className="text-sm font-bold text-slate-400 mb-8">{evaluation.submission?.student_name} (Roll: #{evaluation.submission?.roll_no})</p>
                    
                    <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Student Answers</h4>
                        <div className="max-h-40 overflow-y-auto text-sm font-bold text-slate-700 space-y-3">
                            {(() => {
                                try {
                                    const answers = typeof evaluation.submission.answers === 'string' ? JSON.parse(evaluation.submission.answers) : evaluation.submission.answers;
                                    return Object.entries(answers).map(([qId, ans]) => (
                                        <div key={qId} className="p-3 bg-white rounded-xl border border-slate-100">
                                            <span className="text-[10px] text-indigo-500 uppercase block mb-1">Question ID: {qId}</span>
                                            {ans}
                                        </div>
                                    ));
                                } catch (e) { return "Error parsing answers"; }
                            })()}
                        </div>
                    </div>

                    <form onSubmit={handleEvaluate} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Theory Marks</label>
                            <input type="number" placeholder="Enter marks for theory part" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={evaluation.theory_marks} onChange={e => setEvaluation({...evaluation, theory_marks: e.target.value})} required  />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Remarks</label>
                            <textarea placeholder="Feedback for student..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold h-24 outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={evaluation.remarks} onChange={e => setEvaluation({...evaluation, remarks: e.target.value})}></textarea>
                        </div>
                        <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 mt-4">Save Evaluation</button>
                    </form>
                </div>
            </div>
        )}

        {showAssignModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95">
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{isEditingAssignment ? 'Edit' : 'Create New'} Assignment</h3>
                        <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-10">
                        <form id="assignForm" onSubmit={handleCreateAssignment} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Academic Course</label>
                                    <select className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.course_id} onChange={e => setAssignForm({...assignForm, course_id: e.target.value})} required>
                                        <option value="">Select Course</option>
                                        {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Academic Session</label>
                                    <input type="text" placeholder="e.g. 2024-2027" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.session} onChange={e => setAssignForm({...assignForm, session: e.target.value})} required  />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Assignment Strategy</label>
                                <div className="flex bg-slate-100 p-1 rounded-2xl">
                                    <button type="button" onClick={() => setAssignForm({...assignForm, type: 'mcq'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assignForm.type === 'mcq' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>MCQ Focus</button>
                                    <button type="button" onClick={() => setAssignForm({...assignForm, type: 'theory'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assignForm.type === 'theory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Theory Focus</button>
                                    <button type="button" onClick={() => setAssignForm({...assignForm, type: 'mixed'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${assignForm.type === 'mixed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Mixed</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Assignment Title</label>
                                <input type="text" placeholder="e.g. Mid-term Assessment" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.title} onChange={e => setAssignForm({...assignForm, title: e.target.value})} required  />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Instructions / Description</label>
                                <textarea placeholder="Describe the assignment goals..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold h-24 outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.description} onChange={e => setAssignForm({...assignForm, description: e.target.value})} required></textarea>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Time Limit (Minutes)</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.duration} onChange={e => setAssignForm({...assignForm, duration: e.target.value})} required  />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Total Marks (0 = Auto)</label>
                                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={assignForm.total_marks} onChange={e => setAssignForm({...assignForm, total_marks: e.target.value})}  />
                                </div>
                            </div>

                            <div className="pt-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Question Bank</h4>
                                    <button type="button" onClick={handleAddQuestion} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-blue-100 transition-colors"><Plus size={14}/> Add Question</button>
                                </div>
                                
                                <div className="space-y-6">
                                    {assignForm.questions.map((q, idx) => (
                                        <div key={idx} className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 relative group">
                                            <button type="button" onClick={() => handleRemoveQuestion(idx)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                <div className="md:col-span-2">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Question Type</label>
                                                    <div className="flex gap-2 mt-1">
                                                        <button type="button" onClick={() => handleQuestionChange(idx, 'type', 'mcq')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${q.type === 'mcq' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>MCQ</button>
                                                        <button type="button" onClick={() => handleQuestionChange(idx, 'type', 'theory')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${q.type === 'theory' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Theory</button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Marks</label>
                                                    <input type="number" className="w-full mt-1 p-2 bg-white rounded-xl text-sm font-bold border border-slate-100 text-center" value={q.marks} onChange={e => handleQuestionChange(idx, 'marks', e.target.value)} required />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <textarea placeholder="Enter question text..." className="w-full p-4 bg-white rounded-2xl text-sm font-bold border border-slate-100 h-20" value={q.question_text} onChange={e => handleQuestionChange(idx, 'question_text', e.target.value)} required></textarea>
                                                
                                                {q.type === 'mcq' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {['a', 'b', 'c', 'd'].map(opt => (
                                                            <div key={opt} className="relative">
                                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{opt}</span>
                                                                <input type="text" placeholder={`Option ${opt.toUpperCase()}`} className="w-full pl-10 pr-4 py-3 bg-white rounded-xl text-sm font-bold border border-slate-100" value={q.options[opt]} onChange={e => handleQuestionChange(idx, 'options', e.target.value, opt)} required />
                                                            </div>
                                                        ))}
                                                        <div className="md:col-span-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Correct Answer</label>
                                                            <select className="w-full mt-1 p-3 bg-white rounded-xl text-xs font-black uppercase border border-slate-100 text-blue-600 outline-none" value={q.correct_option} onChange={e => handleQuestionChange(idx, 'correct_option', e.target.value)} required>
                                                                <option value="a">Option A</option>
                                                                <option value="b">Option B</option>
                                                                <option value="c">Option C</option>
                                                                <option value="d">Option D</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                {q.type === 'theory' && (
                                                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 border-dashed">
                                                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic">Students will see a text input for this question.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>

                    <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                        <button type="submit" form="assignForm" className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-200">Publish Assignment</button>
                        <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-4 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest">Discard</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );


  const renderNotes = () => {
    const filteredMaterials = materials.filter(m => {
        const term = noteSearch.toLowerCase().trim();
        return !term || 
               m.title.toLowerCase().includes(term) || 
               m.course_name.toLowerCase().includes(term);
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Study Materials</h2>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative group w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}  />
                    <input 
                        type="text" placeholder="Search title or course..." 
                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold"
                        value={noteSearch} onChange={(e) => setNoteSearch(e.target.value)}
                    />
                </div>
                <button onClick={() => { setMaterialForm({ id: null, title: '', file: null, url: '', course_id: '', session: '', subject_id: '' }); setIsEditingMaterial(false); setMaterialType('file'); setShowMaterialModal(true); }} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                    <Plus size={16} /> Upload New
                </button>
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map(m => (
                <div key={m.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl group relative hover:-translate-y-1 transition-all">
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button onClick={() => openEditMaterial(m)} className="p-2 text-slate-300 hover:text-blue-500 transition-all bg-slate-50 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteMaterial(m.id)} className="p-2 text-slate-300 hover:text-red-500 transition-all bg-slate-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookMarked size={24} /></div>
                    <h4 className="font-black text-slate-800 mb-1 uppercase text-sm truncate pr-16">{m.title}</h4>
                    <div className="flex flex-col gap-1 mb-4">
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{m.course_name}</p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Session: {m.session || 'All'}</p>
                    </div>
                    <a href={m.file_url ? "http://localhost:5000" + m.file_url : m.url} target="_blank" rel="noopener noreferrer" className="block text-center py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Open {m.file_url ? 'PDF' : 'Link'}</a>
                </div>
            ))}
            {filteredMaterials.length === 0 && (
                <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                    {noteSearch ? "No materials found matching your search" : "No materials uploaded for this department/session"}
                </div>
            )}
        </div>
        {showMaterialModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl relative">
                    <button onClick={() => setShowMaterialModal(false)} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600"><X size={24}/></button>
                    <h3 className="text-xl font-black text-slate-800 mb-8 uppercase tracking-tight">{isEditingMaterial ? 'Edit' : 'Upload'} material</h3>
                    <form onSubmit={handleUploadMaterial} className="space-y-4">
                        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                            <button type="button" onClick={() => setMaterialType('file')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${materialType === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>PDF File</button>
                            <button type="button" onClick={() => setMaterialType('url')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${materialType === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>URL Link</button>
                        </div>

                        <select className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={materialForm.course_id} onChange={e => setMaterialForm({...materialForm, course_id: e.target.value})} required>
                            <option value="">Choose Course</option>
                            {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="text" placeholder="Session (e.g. 2024-2027)" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={materialForm.session} onChange={e => setMaterialForm({...materialForm, session: e.target.value})} required  />
                        <input type="text" placeholder="Material Title" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={materialForm.title} onChange={e => setMaterialForm({...materialForm, title: e.target.value})} required  />
                        
                        {materialType === 'file' ? (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Select PDF File</label>
                                <input type="file" accept=".pdf" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold file:hidden cursor-pointer" onChange={e => setMaterialForm({...materialForm, file: e.target.files[0]})} required={!isEditingMaterial} />
                                {isEditingMaterial && <p className="text-[10px] text-indigo-500 font-bold ml-2 italic">* Leave empty to keep existing file</p>}
                            </div>
                        ) : (
                            <input type="url" placeholder="Paste Link (https://...)" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" value={materialForm.url} onChange={e => setMaterialForm({...materialForm, url: e.target.value})} required  />
                        )}

                        <div className="flex gap-3 pt-6">
                            <button type="submit" disabled={uploadingMaterial} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50">{uploadingMaterial ? 'Saving...' : (isEditingMaterial ? 'Update' : 'Upload')}</button>
                            <button type="button" onClick={() => setShowMaterialModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};

  const renderStudentsList = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      {renderHeader("Student Roster")}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr><th className="px-8 py-5">Student</th><th className="px-8 py-5">Roll No</th><th className="px-8 py-5">Course</th><th className="px-8 py-5 text-right">Access</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {students.map(s => (
                <tr key={s?.user_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px]">{s?.name?.charAt(0)}</div>
                    <div className="min-w-0"><p className="font-black text-slate-800 text-sm truncate">{s?.name}</p><p className="text-xs text-slate-400 truncate">{s?.email}</p></div>
                  </td>
                  <td className="px-8 py-5 font-black text-xs text-slate-500">#{s?.roll_number}</td>
                  <td className="px-8 py-5 font-bold text-xs text-slate-600 uppercase">{s?.course}</td>
                  <td className="px-8 py-5 text-right"><span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase">ACTIVE</span></td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  );

  const renderAddSubjects = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl sticky top-8">
                    <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Add Subject</h2>
                    <form onSubmit={handleSubjectSubmit} className="space-y-4">
                        <input type="text" placeholder="Subject Name" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={subjectForm.name} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}  />
                        <input type="text" placeholder="Subject Code" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={subjectForm.subject_code} onChange={e => setSubjectForm({...subjectForm, subject_code: e.target.value})}  />
                        <select className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={subjectForm.course_id} onChange={e => setSubjectForm({...subjectForm, course_id: e.target.value})}>
                            <option value="">Course</option>
                            {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="text" placeholder="Session" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={subjectForm.session} onChange={e => setSubjectForm({...subjectForm, session: e.target.value})}  />
                        <button type="submit" disabled={subjectSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg disabled:opacity-50 mt-4">{subjectSubmitting ? 'Adding...' : 'Add Subject'}</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-8">
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <tr><th className="px-8 py-5">Subject</th><th className="px-8 py-5">Course</th><th className="px-8 py-5 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredSubjects.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-8 py-5"><span className="font-black text-slate-800 text-sm uppercase">{s?.name}</span></td>
                                    <td className="px-8 py-5"><span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{s.course_name}</span></td>
                                    <td className="px-8 py-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setEditingSubject(s); setShowSubjectEditModal(true); }} className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Pencil size={16} /></button><button onClick={() => handleDeleteSubject(s.id)} className="p-2 bg-red-50 text-red-600 rounded-xl"><Trash2 size={16} /></button></div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Edit Subject Modal */}
        {showSubjectEditModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black text-slate-800 uppercase">Edit Subject</h3>
                        <button onClick={() => setShowSubjectEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    <form onSubmit={handleUpdateSubject} className="space-y-6">
                        <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold" value={editingSubject.name} onChange={e => setEditingSubject({...editingSubject, name: e.target.value})} required />
                        <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold" value={editingSubject.subject_code} onChange={e => setEditingSubject({...editingSubject, subject_code: e.target.value})} required />
                        <select className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold" value={editingSubject.course_id} onChange={e => setEditingSubject({...editingSubject, course_id: e.target.value})} required>
                            {teacherCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold" value={editingSubject.session} onChange={e => setEditingSubject({...editingSubject, session: e.target.value})} required />
                        <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Update</button>
                    </form>
                </div>
            </div>
        )}
    </div>
  );

  const renderComplaints = () => (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border border-slate-100 shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight">Staff Feedback</h2>
            <form onSubmit={handleComplaintSubmit} className="space-y-6 mt-10">
                <input type="text" placeholder="Subject" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold" value={complaintForm.title} onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })} required  />
                <textarea placeholder="Message..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold h-40 resize-none" value={complaintForm.message} onChange={e => setComplaintForm({ ...complaintForm, message: e.target.value })} required  />
                <button type="submit" disabled={complaintSubmitting} className="w-full py-5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl disabled:opacity-50">Submit</button>
            </form>
      </div>
    </div>
  );

  if (loading && !subjects?.length) return <Loader  />;
  if (error) return <ErrorMessage message={error} retry={fetchTeacherData}  />;

  return (
    <div className="w-full pb-12 px-4 md:px-0">
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'marks' && renderMarks()}
      {activeTab === 'add-subjects' && renderAddSubjects()}
      {activeTab === 'assignments' && renderAssignments()}
      {activeTab === 'notes' && renderNotes()}
      {activeTab === 'complaints' && renderComplaints()}
      {activeTab === 'students' && renderStudentsList()}
    </div>
  );
};

export default TeacherDashboard;
