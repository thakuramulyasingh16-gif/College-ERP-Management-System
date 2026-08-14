import React, { useState, useEffect } from 'react';
import { fetchData, getToken } from '../utils/api';
import { 
  ClipboardCheck, GraduationCap, CreditCard, BookMarked, Bell, Download, Calendar, CheckCircle, 
  X, AlertCircle, Wallet, CreditCard as CardIcon, Smartphone, Building, ArrowRight, FileText, Pencil, BookOpen
} from 'lucide-react';
import { Loader, ErrorMessage } from './UIHelpers';
import { useAuth } from '../context/AuthContext';

import api from '../api';

const StudentDashboard = ({ activeTab }) => {
  console.log("StudentDashboard rendering, activeTab:", activeTab);
  const { user } = useAuth();
  const [studentProfile, setStudentProfile] = useState(user || {});
  const [attendance, setAttendance] = useState([]);
  const [results, setResults] = useState([]);
  const [fees, setFees] = useState([]);
  const [notices, setNotices] = useState([]);
  const [notes, setNotes] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Assignment State
  const [assignments, setAssignments] = useState([]);
  const [showAttemptModal, setShowAttemptModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [attemptData, setAttemptData] = useState(null);
  const [answers, setAnswers] = useState({}); // { question_id: answer }
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [payStep, setPayStep] = useState(1); // 1: Method, 2: Simulating, 3: Success

  // Complaint Form State
  const [complaintForm, setComplaintForm] = useState({ title: '', message: '' });
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  const fetchAllData = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // STEP 1: GET LOGGED-IN STUDENT
      const student = user || JSON.parse(localStorage.getItem("user") || "{}");
      
      // STEP 2: FETCH ALL DATA with individual error handling to be robust
      const [
        studentsRes, subjectsRes, assignmentsRes, marksRes,
        attendanceRes, feesRes, noticesRes, notesRes
      ] = await Promise.all([
        api.get('/students').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/subjects').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/assignments').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/student/results').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/student/attendance').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/student/fees').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/notices').catch(err => ({ data: { success: false, data: [] } })),
        api.get('/notes').catch(err => ({ data: { success: false, data: [] } }))
      ]);

      const marks = marksRes.data.success ? marksRes.data.data : [];
      const allStudents = studentsRes.data.success ? studentsRes.data.data : [];
      const subjects = subjectsRes.data.success ? subjectsRes.data.data : [];
      const assignmentsData = assignmentsRes.data.success ? assignmentsRes.data.data : [];

      const currentStudent = (Array.isArray(allStudents) && student.email) 
        ? (allStudents.find(s => s.email === student.email) || student) 
        : student;
        
      const studentCourse = currentStudent.course || student.course;

      // STEP 6: HANDLE OLD DATA
      const safeSubjects = subjects.map(s => ({
        ...s,
        course: s.course || s.course_name || studentCourse
      }));

      const safeAssignments = assignmentsData.map(a => ({
        ...a,
        course: a.course || a.course_name || studentCourse
      }));

      // STEP 3: FILTER SUBJECTS
      const studentSubjectsFiltered = safeSubjects.filter(sub =>
        sub.course === studentCourse
      );

      // STEP 4: FILTER ASSIGNMENTS
      const studentAssignmentsFiltered = safeAssignments.filter(a =>
        a.course === studentCourse
      );

      // Update states
      setAttendance(attendanceRes.data.success ? attendanceRes.data.data : (attendanceRes.data || []));
      setFees(feesRes.data.success ? feesRes.data.data : (feesRes.data || []));
      setNotices(noticesRes.data.success ? noticesRes.data.data : (noticesRes.data || []));
      setNotes(notesRes.data.success ? notesRes.data.data : (notesRes.data || []));

      // STEP 7: SET STATE
      const sortedMarks = Array.isArray(marks) ? [...marks].sort((a, b) => b.id - a.id) : [];
      console.log("DEBUG: Student Results from API (Sorted):", sortedMarks);
      setStudentProfile(currentStudent);
      setStudentSubjects(studentSubjectsFiltered || []);
      setAssignments(studentAssignmentsFiltered || []);
      setResults(sortedMarks);

    } catch (_err) {
      console.error("Critical error in fetchAllData:", _err);
      setError("Failed to load dashboard data. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // STEP 8: LOAD ONCE
  useEffect(() => {
    fetchAllData();
  }, []);

  const autoSubmitAssignment = async () => {
    if (submitting || !selectedAssignment) return;
    setSubmitting(true);
    try {
        await api.post('/assignments/submit', { 
            assignment_id: selectedAssignment.id, 
            answers,
            auto_submitted: true 
        });
        alert('Time is up! Your assignment has been auto-submitted.');
        setShowAttemptModal(false);
        fetchAllData();
    } catch (err) { console.error("Auto-submit error:", err); }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    let timer;
    if (showAttemptModal && timeLeft > 0 && !submitting) {
        timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAttemptModal, timeLeft, submitting]);

  // Handle time expiry
  useEffect(() => {
    if (showAttemptModal && timeLeft === 0 && !submitting && attemptData) {
        autoSubmitAssignment();
    }
  }, [timeLeft]);

  const startAssignment = async (assignment) => {
    setLoading(true);
    try {
        const res = await api.get(`/assignments/${assignment.id}`);
        const result = res.data;
        const data = result.success ? result.data : result;

        setAttemptData(data);
        setSelectedAssignment(assignment);
        
        if (assignment.is_submitted > 0 && data.submission) {
            setAnswers(data.submission.answers || {});
            setTimeLeft(0); // No timer in review mode
        } else {
            setTimeLeft(data.duration * 60);
            // Initialize answers
            const initialAnswers = {};
            if (data.questions) {
                data.questions.forEach(q => {
                    initialAnswers[q.id] = '';
                });
            }
            setAnswers(initialAnswers);
        }
        
        setShowAttemptModal(true);
    } catch (err) { alert('Failed to load assignment details'); }
    finally { setLoading(false); }
  };

  const handleAssignmentSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!window.confirm("Are you sure you want to submit?")) return;
    setSubmitting(true);
    try {
        await api.post('/assignments/submit', { 
            assignment_id: selectedAssignment.id, 
            answers 
        });
        alert('Assignment submitted successfully!');
        setShowAttemptModal(false);
        fetchAllData();
    } catch (err) { alert('Error submitting assignment'); }
    finally { setSubmitting(false); }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    setPayStep(2);
    setTimeout(async () => {
        try {
            await api.post('/student/pay-fee', { fee_structure_id: selectedFee.id, amount: selectedFee.total_amount, payment_method: paymentMethod });
            setPayStep(3);
            fetchAllData();
        } catch (err) { alert("Payment simulation failed"); setPayStep(1); }
    }, 2000);
  };

  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintSubmitting(true);
    try {
        await api.post('/complaints', complaintForm);
        alert("Feedback submitted successfully!");
        setComplaintForm({ title: '', message: '' });
    } catch (err) { alert("Failed to submit feedback"); }
    finally { setComplaintSubmitting(false); }
  };

  const calculateAttendance = () => {
    if (!attendance || attendance?.length === 0) return 0;
    const present = attendance?.filter(a => a?.status === 'present')?.length || 0;
    return Math.round((present / (attendance?.length || 1)) * 100);
  };

  const renderOverview = () => {
    console.log("Student Dashboard rendering for user:", user);
    return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl mb-6">
        <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-blue-500/20">{studentProfile?.name?.charAt(0)}</div>
            <div>
                <h2 className="text-xl font-black text-slate-800 uppercase">{studentProfile?.name}</h2>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{studentProfile?.department} • {studentProfile?.course}</p>
                <p className="text-blue-600 font-black text-sm mt-1 bg-blue-50 px-3 py-0.5 rounded-full inline-block">Session: {studentProfile?.session}</p>
            </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Attendance" value={`${calculateAttendance()}%`} icon={ClipboardCheck} color="blue"  />
        <StatCard 
          title="Recent Marks" 
          value={results?.length > 0 ? (
            (results[0].marks_obtained ?? results[0].marks ?? '--') + 
            (results[0].max_marks ? ` / ${results[0].max_marks}` : '')
          ) : '--'} 
          icon={GraduationCap} 
          color="indigo"  
        />
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl sm:col-span-2 lg:col-span-1">
          <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6 border border-orange-100">
            <CreditCard size={28} strokeWidth={2.5}  />
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fee Status</p>
          <p className={`text-3xl md:text-4xl font-black mt-2 tracking-tighter ${fees?.some(f => f?.status === 'pending') ? 'text-orange-500' : 'text-green-500'}`}>{fees?.some(f => f?.status === 'pending') ? 'Pending' : 'Clear'}</p>
        </div>
      </div>
    </div>
  );
};

  const renderAttendance = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight text-center lg:text-left uppercase">Attendance Logs</h2>
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          {attendance?.length > 0 ? (
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr><th className="px-8 py-5">Date</th><th className="px-8 py-5">Course / Subject</th><th className="px-8 py-5 text-right">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attendance.map(a => (
                <tr key={a?.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-5 font-bold text-slate-400 text-sm">{new Date(a?.date).toLocaleDateString()}</td>
                  <td className="px-8 py-5 font-black text-slate-800 text-sm">{a.course_name} <span className="text-slate-300 font-bold ml-2">/ {a?.subject_name || 'N/A'}</span></td>
                  <td className="px-8 py-5 text-right"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${a?.status === 'present' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{a?.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          ) : (
            <div className="p-10 md:p-20 text-center text-slate-300 font-black uppercase tracking-widest text-sm italic">No logs available</div>
          )}
        </div>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Academic Results</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(results) && results.length > 0 ? (
          results.map((r, i) => (
            <div key={i} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl hover:-translate-y-1 transition-all">
              <h4 className="font-black text-slate-800 mb-2 text-sm md:text-base uppercase">{r?.subject || r?.subject_name}</h4>
              <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">{r?.exam_name}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl md:text-4xl font-black text-indigo-600">{r?.marks_obtained ?? r?.marks ?? '--'}</span>
                {r?.max_marks ? (
                  <span className="text-slate-400 font-bold text-xs uppercase">/ {r.max_marks}</span>
                ) : null}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] font-black uppercase text-slate-400">
                <span>{r?.course || 'Verified Grade'}</span>
                <CheckCircle size={14} className="text-green-500"  />
              </div>
            </div>
          ))
        ) : (
          <p className="col-span-full text-center py-20 text-slate-300 font-black uppercase tracking-widest italic">No exam results available</p>
        )}
      </div>
    </div>
  );

  const renderAssignments = () => {
    const filteredAssignments = assignments;
    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight uppercase">Academic Assessment</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAssignments?.length > 0 ? (
                filteredAssignments.map(a => (
                    <div key={a.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl group hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><FileText size={24} /></div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-widest">{a.type === 'mcq' ? 'MCQ Only' : a.type === 'subjective' ? 'Theory' : 'Mixed Assessment'}</span>
                                {a.is_submitted > 0 && <span className="text-[10px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-full uppercase tracking-widest">Completed</span>}
                            </div>
                        </div>
                        <h3 className="font-black text-xl text-slate-800 mb-2 uppercase">{a.title}</h3>
                        <p className="text-sm text-slate-500 font-bold mb-4">
                            Time: {a.duration} Mins • Total Marks: {a.total_marks || 0}
                            {a.is_submitted > 0 && a.marks_obtained !== null && (
                                <span className="ml-2 text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">Obtained: {a.marks_obtained}</span>
                            )}
                        </p>
                        <p className="text-xs text-slate-400 font-medium mb-8">Professor {a.teacher_name}</p>
                        <button 
                            onClick={() => startAssignment(a)}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 ${a.is_submitted > 0 ? 'bg-slate-800 text-white shadow-slate-200 hover:bg-slate-900' : 'bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700'}`}
                        >
                            {a.is_submitted > 0 ? <CheckCircle size={16} /> : <Pencil size={16} />}
                            {a.is_submitted > 0 ? 'View Results' : 'Start Assessment'}
                        </button>
                    </div>
                ))
            ) : (
                <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[2rem]">No active assignments for your course</div>
            )}
        </div>
        {showAttemptModal && attemptData && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative animate-in zoom-in duration-300">
                    
                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selectedAssignment.title}</h3>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                {attemptData.questions.length} Questions • Total Marks: {attemptData.total_marks}
                                {selectedAssignment.is_submitted > 0 && selectedAssignment.marks_obtained !== null && (
                                    <span className="ml-2 text-blue-600 font-black"> • Score: {selectedAssignment.marks_obtained} / {attemptData.total_marks}</span>
                                )}
                            </p>
                        </div>
                        {selectedAssignment.is_submitted > 0 ? (
                            <div className="px-6 py-3 rounded-2xl font-black text-xs uppercase bg-green-50 text-green-600 border border-green-100">
                                Results Mode
                            </div>
                        ) : (
                            <div className={`px-6 py-3 rounded-2xl font-black text-xl shadow-xl transition-all ${timeLeft < 300 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-900 text-white'}`}>
                                {formatTime(timeLeft)}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 md:p-12">
                        <form id="submissionForm" onSubmit={handleAssignmentSubmit} className="space-y-12">
                            {attemptData.questions.map((q, idx) => {
                                const studentAnswer = answers[q.id];
                                const isCorrect = q.type === 'mcq' && studentAnswer && String(studentAnswer).toLowerCase() === String(q.correct_option).toLowerCase();
                                const isWrong = q.type === 'mcq' && studentAnswer && String(studentAnswer).toLowerCase() !== String(q.correct_option).toLowerCase();
                                const showResult = selectedAssignment.is_submitted > 0;

                                return (
                                <div key={q.id} className={`space-y-6 pb-12 border-b border-slate-50 last:border-0 ${showResult && isCorrect ? 'bg-green-50/30 -mx-8 px-8 py-8 rounded-[2rem]' : showResult && isWrong ? 'bg-red-50/30 -mx-8 px-8 py-8 rounded-[2rem]' : ''}`}>
                                    <div className="flex items-start gap-4">
                                        <span className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-500 shrink-0 text-sm">{idx + 1}</span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-lg font-bold text-slate-800 leading-snug">{q.question_text}</p>
                                                {showResult && q.type === 'mcq' && (
                                                    isCorrect ? <CheckCircle className="text-green-500" size={24} /> : <X className="text-red-500" size={24} />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest inline-block bg-blue-50 px-2 py-0.5 rounded-full">{q.marks} Marks • {q.type?.toUpperCase()}</span>
                                                {showResult && q.type === 'mcq' && (
                                                    <span className={`text-[10px] font-black uppercase tracking-widest inline-block px-2 py-0.5 rounded-full ${isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                        Score: {isCorrect ? q.marks : 0} / {q.marks}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {q.type === 'mcq' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-14">
                                            {Object.entries(
                                                (() => {
                                                    try {
                                                        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                                                        return opts || { a: '', b: '', c: '', d: '' };
                                                    } catch (e) {
                                                        return { a: '', b: '', c: '', d: '' };
                                                    }
                                                })()
                                            ).map(([key, val]) => {
                                                const isSelected = answers[q.id] === key;
                                                const isActualCorrect = showResult && String(q.correct_option).toLowerCase() === key.toLowerCase();
                                                
                                                let borderClass = 'border-slate-50 bg-slate-50 text-slate-600 hover:border-slate-200';
                                                let dotClass = 'bg-white border border-slate-200 text-slate-400';
                                                
                                                if (isSelected) {
                                                    borderClass = 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/10';
                                                    dotClass = 'bg-blue-600 text-white';
                                                    if (showResult) {
                                                        if (isCorrect) {
                                                            borderClass = 'border-green-500 bg-green-50 text-green-700 shadow-lg shadow-green-500/10';
                                                            dotClass = 'bg-green-600 text-white';
                                                        } else {
                                                            borderClass = 'border-red-500 bg-red-50 text-red-700 shadow-lg shadow-red-500/10';
                                                            dotClass = 'bg-red-600 text-white';
                                                        }
                                                    }
                                                } else if (isActualCorrect) {
                                                    borderClass = 'border-green-200 bg-green-50/50 text-green-700 border-dashed';
                                                }

                                                return (
                                                <label key={key} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${showResult ? 'cursor-default' : 'cursor-pointer'} ${borderClass}`}>
                                                    <input 
                                                        type="radio" name={`q-${q.id}`} value={key} 
                                                        className="hidden"
                                                        checked={isSelected}
                                                        onChange={() => !showResult && setAnswers({...answers, [q.id]: key})}
                                                        disabled={showResult}
                                                    />
                                                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] uppercase shadow-sm ${dotClass}`}>{key}</span>
                                                    <span className="font-bold text-sm">{val}</span>
                                                    {isActualCorrect && isWrong && <span className="ml-auto text-[8px] font-black bg-green-100 text-green-600 px-2 py-1 rounded-full uppercase tracking-widest">Correct Answer</span>}
                                                </label>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="ml-14">
                                            <textarea 
                                                placeholder="Enter your response here..."
                                                className={`w-full p-6 rounded-[2rem] text-sm font-bold h-40 resize-none outline-none transition-all ${showResult ? 'bg-slate-100 text-slate-600 cursor-default border-transparent' : 'bg-slate-50 focus:ring-4 focus:ring-blue-500/10 border-2 border-transparent focus:border-blue-500'}`}
                                                value={answers[q.id] || ''}
                                                onChange={e => !showResult && setAnswers({...answers, [q.id]: e.target.value})}
                                                disabled={showResult}
                                                required
                                            ></textarea>
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                        </form>
                    </div>

                    <div className="p-8 border-t border-slate-100 flex gap-4 bg-slate-50/50">
                        {selectedAssignment.is_submitted > 0 ? (
                            <button type="button" onClick={() => setShowAttemptModal(false)} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">Close Results</button>
                        ) : (
                            <>
                                <button type="submit" form="submissionForm" disabled={submitting} className="flex-[2] py-5 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                                    {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle size={20}/>}
                                    Final Submission
                                </button>
                                <button type="button" onClick={() => { if(window.confirm("Progress will be lost! Exit?")) setShowAttemptModal(false); }} className="flex-1 py-5 bg-white text-slate-400 border border-slate-200 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-100 transition-all">Cancel</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
    );
  };

  const renderFees = () => {
    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight text-center uppercase">My Fees</h2>
        <div className="space-y-4">
            {fees?.length > 0 ? (
                fees.map((f, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center shadow-inner shrink-0"><CreditCard size={28} strokeWidth={2.5}  /></div>
                        <div>
                            <h4 className="font-black text-xl text-slate-800 uppercase">{f?.category}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Status: {f?.status}</p>
                        </div>
                        </div>
                        <div className="flex flex-col items-end gap-3">
                        <span className="text-3xl font-black text-slate-900">₹{parseFloat(f?.total_amount || 0).toLocaleString()}</span>
                        {f?.status === 'pending' ? (
                            <button onClick={() => { setSelectedFee(f); setShowPayModal(true); setPayStep(1); }} className="px-8 py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-orange-500/30">Pay Fee</button>
                        ) : (
                            <span className="px-8 py-3 bg-green-50 text-green-600 rounded-xl font-black text-xs uppercase tracking-widest border border-green-100">PAID</span>
                        )}
                        </div>
                    </div>
                ))
            ) : (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest italic border-2 border-dashed border-slate-100 rounded-[2rem]">No fee record available</div>
            )}
        </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in duration-300">
            <div className="p-10">
                <div className="flex justify-between items-center mb-8">
                    <h3 className="font-black text-2xl text-slate-800 uppercase">Payment</h3>
                    <button onClick={() => setShowPayModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><X size={24}  /></button>
                </div>
                {payStep === 1 && (
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Amount Due</p>
                            <p className="text-4xl font-black text-[#1E3A8A]">₹{parseFloat(selectedFee?.total_amount).toLocaleString()}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[{ id: 'UPI', icon: Smartphone, label: 'UPI' }, { id: 'Card', icon: CardIcon, label: 'Card' }, { id: 'Net', icon: Building, label: 'Net Banking' }, { id: 'Wallet', icon: Wallet, label: 'Wallet' }].map(m => (
                                <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${paymentMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}><m.icon size={20} /><span className="font-black text-[10px] uppercase">{m.label}</span></button>
                            ))}
                        </div>
                        <button onClick={handlePayment} className="w-full py-5 bg-[#1E3A8A] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Confirm Payment</button>
                    </div>
                )}
                {payStep === 2 && <div className="py-12 text-center space-y-6"><div className="w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div><h4 className="font-black text-xl text-slate-800 uppercase">Processing...</h4></div>}
                {payStep === 3 && <div className="py-8 text-center space-y-6 animate-in zoom-in"><div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/40"><CheckCircle size={40} strokeWidth={3}  /></div><h4 className="font-black text-2xl text-slate-800 uppercase">Payment Success!</h4><button onClick={() => setShowPayModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Done</button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderNotes = () => {
    const filteredNotes = notes?.filter(n => {
        const matchesCourse = String(n.course_id) === String(studentProfile.course_id || user.course_id);
        const matchesSession = String(n.session).toLowerCase().trim() === String(studentProfile.session || user.session).toLowerCase().trim() || String(n.session).toUpperCase() === 'ALL';
        return matchesCourse && matchesSession;
    });
    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight uppercase text-center lg:text-left">Study Materials</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes?.length > 0 ? (
          filteredNotes.map(n => (
            <div key={n?.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl group flex flex-col hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookMarked size={24}  /></div>
              <h4 className="font-black text-slate-800 mb-1 uppercase text-sm">{n?.title}</h4>
              <div className="flex flex-col gap-1 mb-4">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{n?.course_name}</p>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Session: {n?.session || 'All'}</p>
              </div>
              <p className="text-xs text-slate-400 font-medium mb-8 italic mt-auto uppercase tracking-tighter">Assigned by {n?.teacher_name}</p>
              {n?.file_url ? (
                  <a href={"http://localhost:5000" + n?.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/20"><Download size={14}  /> Download PDF</a>
              ) : (
                  <a href={n?.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">Open Resource</a>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest italic">No study materials available</div>
        )}
      </div>
    </div>
    );
  };

  const renderSubjects = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight uppercase">Assigned Subjects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {studentSubjects?.length > 0 ? (
          studentSubjects.map(s => (
            <div key={s.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl group hover:-translate-y-1 transition-all">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform"><BookOpen size={24} /></div>
              <h4 className="font-black text-slate-800 mb-2 uppercase">{s.name}</h4>
              <div className="space-y-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Code: {s.subject_code}</p>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Session: {s.session}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-300 font-black uppercase tracking-widest italic">No subjects available</div>
        )}
      </div>
    </div>
  );

  const renderComplaints = () => (
    <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-2 tracking-tight uppercase">Feedback Center</h2>
            <p className="text-slate-400 font-bold text-sm mb-10 uppercase tracking-widest">Share your academic concerns</p>
            <form onSubmit={handleComplaintSubmit} className="space-y-6">
                <input type="text" placeholder="Subject" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none" value={complaintForm.title} onChange={e => setComplaintForm({ ...complaintForm, title: e.target.value })} required  />
                <textarea placeholder="Message..." className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-bold h-40 resize-none outline-none" value={complaintForm.message} onChange={e => setComplaintForm({ ...complaintForm, message: e.target.value })} required  />
                <button type="submit" disabled={complaintSubmitting} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50">Submit Request</button>
            </form>
        </div>
      </div>
    </div>
  );

  if (loading && !attendance?.length) return <Loader  />;
  if (error) return <ErrorMessage message={error} retry={fetchAllData}  />;

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 md:px-0">
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'attendance' && renderAttendance()}
      {activeTab === 'results' && renderResults()}
      {activeTab === 'subjects' && renderSubjects()}
      {activeTab === 'assignments' && renderAssignments()}
      {activeTab === 'fees' && renderFees()}
      {activeTab === 'notes' && renderNotes()}
      {activeTab === 'complaints' && renderComplaints()}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = { blue: 'bg-blue-50 text-blue-600 border-blue-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100' };
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colors[color]} border`}>
        {Icon ? <Icon size={28} strokeWidth={2.5}  /> : <div className="text-xs font-black">{title?.charAt(0)}</div>}
      </div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-3xl md:text-4xl font-black text-slate-900 mt-2 tracking-tighter">{value}</p>
    </div>
  );
};

export default StudentDashboard;
