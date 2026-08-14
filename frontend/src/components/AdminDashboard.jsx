import React, { useState, useEffect } from 'react';
import { fetchData, getToken } from '../utils/api';
import { 
  Users, GraduationCap, BookOpen, TrendingUp, Plus, Trash2, PlusCircle, Search, Key, Building2,
  Edit, X, ClipboardCheck, Bell, CheckCircle, AlertCircle, Filter, Calendar
} from 'lucide-react';
import { Loader, ErrorMessage } from './UIHelpers';
import { generateSessions, UG_COURSES, PG_COURSES } from '../utils/sessionHelper';
import api from '../api';

const AdminDashboard = ({ activeTab, setActiveTab, user }) => {
  console.log("AdminDashboard rendering, activeTab:", activeTab);
  const [stats, setStats] = useState({ users: [], departments: 0, courses: 0 });
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notices, setNotices] = useState([]);
  const [feeStructures, setFeeStructures] = useState([]);
  const [feeRecords, setFeeRecords] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  const [feeStatusFilter, setFeeStatusFilter] = useState('all');

  // New state for dependent filter
  const [availableSessions, setAvailableSessions] = useState([]);
  const [headerSessions, setHeaderSessions] = useState([]);

  // Modals & Edit States
  const [resetModal, setResetModal] = useState({ open: false, userId: null, newPassword: '' });
  const [editDept, setEditDept] = useState(null);
  const [editCourse, setEditCourse] = useState(null);
  const [editFee, setEditFee] = useState(null);
  const [editTeacherModal, setEditTeacherModal] = useState({ open: false, data: null });
  const [editStudentModal, setEditStudentModal] = useState({ open: false, data: null });

  // Forms
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', password: '', mobile: '', department_id: '', designation: 'Professor', profession: '', profile_image: null });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '', mobile: '', course_id: '', admission_year: '', roll_no: '', profile_image: null });
  const [deptForm, setDeptForm] = useState({ name: '' });
  const [courseForm, setCourseForm] = useState({ name: '', department_id: '', duration_years: 3 });
  const [sessionForm, setSessionForm] = useState({ session_name: '', duration_years: 3 });
  const [feeForm, setFeeForm] = useState({ course_id: '', category: 'Tuition Fee', amount: '', description: '' });
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', target_role: 'all' });
  
  const [teacherPreview, setTeacherPreview] = useState(null);
  const [studentPreview, setStudentPreview] = useState(null);

  // Update available sessions for forms
  useEffect(() => {
    if (studentForm.course_id) {
        const course = courses.find(c => c.id === parseInt(studentForm.course_id));
        if (course) {
            const filtered = sessions.filter(s => s.duration_years === course.duration_years);
            setAvailableSessions(filtered);
            setStudentForm(prev => ({...prev, session: ''}));
        }
    } else {
        setAvailableSessions([]);
    }
  }, [studentForm.course_id, courses, sessions]);


  // Update header sessions based on course filter
  useEffect(() => {
    if (courseFilter) {
        const course = courses.find(c => c.id === parseInt(courseFilter));
        if (course) {
            const filtered = sessions.filter(s => s.duration_years === course.duration_years);
            setHeaderSessions(filtered);
        } else {
            setHeaderSessions([]);
        }
    } else {
        setHeaderSessions([]);
        setSessionFilter('');
    }
  }, [courseFilter, sessions, courses]);


  const handleFileChange = (e, setForm, setPreview, form) => {
    const file = e.target?.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File size should be less than 2MB");
        e.target.value = null;
        return;
      }
      setForm({ ...form, profile_image: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const fetchStats = async () => {
    fetch("http://localhost:5000/api/dashboard-stats", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("Data received: Stats", result);
        if(result.success){ setStats(result.data); }
    })
    .catch(err => console.error("Stats Error:", err));
  };

  const fetchDepartments = async () => {
    fetch("http://localhost:5000/api/departments", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Departments");
        console.log(result.data);
        if(result.success){ setDepartments(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchCourses = async () => {
    fetch(`http://localhost:5000/api/courses`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Courses");
        console.log(result.data);
        if(result.success){ setCourses(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchSessions = async () => {
    fetch("http://localhost:5000/api/sessions", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Sessions");
        console.log(result.data);
        if(result.success){ setSessions(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchStaff = async () => {
    const deptObj = departments?.find(d => d.id === parseInt(deptFilter));
    const deptName = deptObj ? deptObj.name : '';
    
    fetch(`http://localhost:5000/api/teachers?search=${searchTerm}&department_id=${deptFilter}&department=${deptName}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
      console.log("API HIT: Teachers");
      console.log(result.data);
      if(result.success){
        setTeachers(result.data || []);
      }
    })
    .catch(err => console.error("Fetch Error:", err));
  };

  const fetchStudents = async () => {
    const courseObj = courses?.find(c => c.id === parseInt(courseFilter));
    const courseName = courseObj ? courseObj.name : '';
    
    fetch(`http://localhost:5000/api/students?search=${searchTerm}&course=${courseName}&session=${sessionFilter}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
      console.log("API HIT: Students");
      console.log(result.data);
      if(result.success){
        setStudents(result.data || []);
      }
    })
    .catch(err => console.error("Fetch Error:", err));
  };

  const fetchFees = async () => {
    fetch("http://localhost:5000/api/fee-structures", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Fee Structures");
        console.log(result.data);
        if(result.success){ setFeeStructures(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchFeeRecords = async () => {
    fetch("http://localhost:5000/api/admin/fees", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Fee Records");
        console.log(result.data);
        if(result.success){ setFeeRecords(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchComplaints = async () => {
    fetch("http://localhost:5000/api/admin/complaints", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Complaints");
        console.log(result.data);
        if(result.success){ setComplaints(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchNotices = async () => {
    fetch("http://localhost:5000/api/notices", {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    })
    .then(res => res.json())
    .then(result => {
        console.log("API HIT: Notices");
        console.log(result.data);
        if(result.success){ setNotices(result.data || []); }
    })
    .catch(err => console.error(err));
  };

  const fetchAllData = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch core data ONLY if they are empty
      const corePromises = [];
      if (departments.length === 0) corePromises.push(fetchDepartments());
      if (courses.length === 0) corePromises.push(fetchCourses());
      if (sessions.length === 0) corePromises.push(fetchSessions());
      if (Object.keys(stats).length <= 3) corePromises.push(fetchStats());
      
      await Promise.all(corePromises);

      switch(activeTab) {
        case 'staff': await fetchStaff(); break;
        case 'students': await fetchStudents(); break;
        case 'fees': await fetchFees(); break;
        case 'fee-records': await fetchFeeRecords(); break;
        case 'complaints': await fetchComplaints(); break;
        case 'notices': await fetchNotices(); break;
        case 'departments': await fetchDepartments(); break;
        case 'courses': await fetchCourses(); break;
        case 'sessions': await fetchSessions(); break;
        default: break;
      }
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchTerm, deptFilter, courseFilter, sessionFilter, departments.length, courses.length, sessions.length, stats]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    const { data } = editTeacherModal;
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('mobile', data.mobile);
    formData.append('department_id', data.department_id);
    formData.append('designation', data.designation);
    formData.append('profession', data.profession);
    if (data.new_profile_image) {
      formData.append('profile_image', data.new_profile_image);
    }

    try {
      await api.put(`/teachers/${data.user_id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Teacher updated successfully!');
      setEditTeacherModal({ open: false, data: null });
      fetchStaff();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating teacher');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const { data } = editStudentModal;
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('mobile', data.mobile);
    formData.append('course_id', data.course_id);
    formData.append('admission_year', data.admission_year);
    formData.append('roll_no', data.roll_number);
    if (data.new_profile_image) {
      formData.append('profile_image', data.new_profile_image);
    }

    try {
      await api.put(`/students/${data.user_id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert('Student updated successfully!');
      setEditStudentModal({ open: false, data: null });
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating student');
    }
  };

  const handleResetPassword = async () => {
    if (!resetModal?.newPassword) return alert('Enter password');
    try {
      await api.post('/reset-password', { userId: resetModal.userId, newPassword: resetModal.newPassword });
      alert('Password reset successfully');
      setResetModal({ open: false, userId: null, newPassword: '' });
    } catch (_err) {
      console.error(_err);
      alert('Error resetting password');
    }
  };

  // Delete Actions
  const handleDeleteNotice = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try { await api.delete(`/notices/${id}`); fetchNotices(); } catch (_err) { console.error(_err); alert('Error deleting'); }
  };

  const handleDeleteTeacher = async (id) => {
    if (!window.confirm('Delete this teacher?')) return;
    try { await api.delete(`/teachers/${id}`); fetchStaff(); fetchStats(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Delete this student?')) return;
    try { await api.delete(`/students/${id}`); fetchStudents(); fetchStats(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const handleDeleteDept = async (id) => {
    if (!window.confirm('Delete this department?')) return;
    try { await api.delete(`/departments/${id}`); fetchDepartments(); fetchStats(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try { await api.delete(`/courses/${id}`); fetchCourses(); fetchStats(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const handleDeleteFee = async (id) => {
    if (!window.confirm('Delete this fee structure?')) return;
    try { await api.delete(`/fee-structures/${id}`); fetchFees(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm('Delete this complaint?')) return;
    try { await api.delete(`/admin/complaints/${id}`); fetchComplaints(); } catch (_err) { console.error(_err); alert('Error'); }
  };

  const renderHeader = (title) => (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">{title}</h2>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative group flex-1 sm:flex-none">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18}  />
          <input 
            type="text" placeholder="Search..." 
            className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-48 md:w-64 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        <select 
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setCourseFilter(''); setSessionFilter(''); }}
        >
          <option value="">All Departments</option>
          {departments?.map(d => <option key={d?.id} value={d?.id}>{d?.name}</option>)}
        </select>
        {(activeTab === 'students' || activeTab === 'fee-records') && (
            <>
            <select 
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); }}
            >
                <option value="">All Courses</option>
                {courses?.filter(c => !deptFilter || String(c.department_id) === String(deptFilter)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </select>
            <div className="relative group flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18}  />
              <input 
                type="text" placeholder="Session (e.g. 2023-2026)" 
                className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-full sm:w-48 md:w-56 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none font-bold"
                value={sessionFilter} onChange={(e) => setSessionFilter(e.target.value)}
               />
            </div>
            </>
        )}

      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Teachers" value={stats?.users?.find(u => u?.role === 'teacher')?.count || 0} icon={Users} color="blue"  />
        <StatCard title="Students" value={stats?.users?.find(u => u?.role === 'student')?.count || 0} icon={GraduationCap} color="indigo"  />
        <StatCard title="Departments" value={stats?.departments} icon={Building2} color="purple"  />
        <StatCard title="Courses" value={stats?.courses} icon={BookOpen} color="orange"  />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
          <h3 className="font-black text-xl text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-blue-600"  />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <ActionButton label="Add Teacher" icon={PlusCircle} onClick={() => setActiveTab('staff')} color="blue"  />
            <ActionButton label="Add Student" icon={PlusCircle} onClick={() => setActiveTab('students')} color="indigo"  />
            <ActionButton label="Add Course" icon={PlusCircle} onClick={() => setActiveTab('courses')} color="orange"  />
            <ActionButton label="Password Reset" icon={Key} onClick={() => setResetModal({ open: true, userId: user?.id, newPassword: '' })} color="blue"  />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStaff = () => {
    const filteredTeachers = (teachers || []).filter(t => {
      const matchesDept = !deptFilter || String(t.department_id) === String(deptFilter);
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        (t.name || "").toLowerCase().includes(term) || 
        (t.email || "").toLowerCase().includes(term) ||
        (t.mobile || "").toLowerCase().includes(term);
      return matchesDept && matchesSearch;
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      {renderHeader("Manage Teachers")}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">Create Teacher</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData();
            Object.keys(teacherForm).forEach(key => { if (teacherForm[key] !== null) formData.append(key, teacherForm[key]); });
            try {
              await api.post('/teachers', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              setTeacherForm({ name: '', email: '', password: '', mobile: '', department_id: '', designation: 'Professor', profession: '', profile_image: null });
              setTeacherPreview(null); fetchStaff(); alert('Created!');
            } catch (err) { alert(err.response?.data?.message || 'Error'); }
          }} className="space-y-4">
            <div className="flex justify-center mb-4">
              <label className="relative cursor-pointer group">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {teacherPreview ? <img src={teacherPreview} className="w-full h-full object-cover"  /> : <Plus className="text-slate-400"  />}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, setTeacherForm, setTeacherPreview, teacherForm)}  />
              </label>
            </div>
            <input type="text" placeholder="Name" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm.name} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} required  />
            <input type="email" placeholder="Email" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm.email} onChange={e => setTeacherForm({...teacherForm, email: e.target.value})} required  />
            <input type="text" placeholder="Mobile" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm.mobile} onChange={e => setTeacherForm({...teacherForm, mobile: e.target.value})} required  />
            <input type="password" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm.password} onChange={e => setTeacherForm({...teacherForm, password: e.target.value})} required  />
            <input type="text" placeholder="Profession" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm.profession} onChange={e => setTeacherForm({...teacherForm, profession: e.target.value})} required  />
            <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={teacherForm?.department_id} onChange={e => setTeacherForm({...teacherForm, department_id: e.target?.value})} required>
              <option value="">Select Dept</option>
              {departments?.map(d => <option key={d?.id} value={d?.id}>{d?.name}</option>)}
            </select>
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-2xl font-black text-sm hover:bg-blue-700">Add Teacher</button>
          </form>
        </div>
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr>
                  <th className="px-6 py-4">Photo</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map(s => (
                    <tr key={s?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                          {s?.profile_image ? <img src={"http://localhost:5000" + (s?.profile_image)} className="w-full h-full object-cover"  /> : <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-bold">{s?.name?.charAt(0) || '?'}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4"><p className="font-black text-slate-800">{s?.name}</p><p className="text-[10px] text-slate-400">{s?.email}</p></td>
                      <td className="px-6 py-4 font-bold text-slate-500">{s?.mobile}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black">{s?.department}</span></td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => {
                          setEditTeacherModal({ open: true, data: {...s, new_profile_image: null} });
                          setTeacherPreview(s.profile_image ? "http://localhost:5000" + s.profile_image : null);
                        }} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={18}  /></button>
                        <button onClick={() => setResetModal({ open: true, userId: s?.user_id, newPassword: '' })} className="p-2 text-slate-400 hover:text-blue-600"><Key size={18}  /></button>
                        <button onClick={() => handleDeleteTeacher(s?.user_id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}  /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400 font-bold uppercase tracking-widest">
                      No teachers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
  const renderStudents = () => {
    const filteredStudents = (students || []).filter(s => {
      // 1. Dept Filter
      const matchesDept = !deptFilter || String(s.department_id) === String(deptFilter);
      
      // 2. Course Filter
      const matchesCourse = !courseFilter || String(s.course_id) === String(courseFilter);
      
      // 3. Session Filter
      const matchesSession = !sessionFilter || 
        (s.session || "").toLowerCase().trim().includes(sessionFilter.toLowerCase().trim());
      
      // 4. Search Filter
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term || 
        (s.name || "").toLowerCase().includes(term) || 
        (s.email || "").toLowerCase().includes(term) ||
        (s.roll_number || "").toLowerCase().includes(term);
        
      return matchesDept && matchesCourse && matchesSession && matchesSearch;
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      {renderHeader("Manage Students")}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">Create Student</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData();
            Object.keys(studentForm).forEach(key => { if (studentForm[key] !== null) formData.append(key, studentForm[key]); });
            try {
              await api.post('/students', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
              setStudentForm({ name: '', email: '', password: '', mobile: '', course_id: '', admission_year: '', roll_no: '', profile_image: null });
              setStudentPreview(null); fetchStudents(); alert('Created!');
            } catch (err) { alert(err.response?.data?.message || 'Error'); }
          }} className="space-y-4">
            <div className="flex justify-center mb-4">
              <label className="relative cursor-pointer group">
                <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                  {studentPreview ? <img src={studentPreview} className="w-full h-full object-cover"  /> : <Plus className="text-slate-400"  />}
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={e => handleFileChange(e, setStudentForm, setStudentPreview, studentForm)}  />
              </label>
            </div>
            <input type="text" placeholder="Name" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target?.value})} required  />
            <input type="email" placeholder="Email" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target?.value})} required  />
            <input type="text" placeholder="Mobile" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.mobile} onChange={e => setStudentForm({...studentForm, mobile: e.target?.value})} required  />
            <input type="password" placeholder="Password" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.password} onChange={e => setStudentForm({...studentForm, password: e.target?.value})} required  />
            <input type="text" placeholder="Roll No" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.roll_no} onChange={e => setStudentForm({...studentForm, roll_no: e.target?.value})} required  />
            <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.course_id} onChange={e => setStudentForm({...studentForm, course_id: e.target?.value})} required>
              <option value="">Select Course</option>
              {courses?.map(c => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
            </select>
            <input type="number" placeholder="Admission Year (e.g. 2023)" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={studentForm.admission_year} onChange={e => setStudentForm({...studentForm, admission_year: e.target?.value})} required  />

            <button type="submit" className="w-full bg-indigo-600 text-white p-3 rounded-2xl font-black text-sm hover:bg-indigo-700 disabled:opacity-50" disabled={!studentForm.course_id || !studentForm.admission_year}>Add Student</button>

          </form>
        </div>
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            {filteredStudents.length === 0 ? (
              <p className="p-10 text-center text-slate-400 font-bold">No students found</p>
            ) : (
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr><th className="px-6 py-4">Photo</th><th className="px-6 py-4">Name</th><th className="px-6 py-4">Roll No</th><th className="px-6 py-4">Admission Year</th><th className="px-6 py-4">Session</th><th className="px-6 py-4 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map(s => (
                  <tr key={s?.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden">
                        {s?.profile_image ? <img src={"http://localhost:5000" + (s?.profile_image)} className="w-full h-full object-cover"  /> : <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600 font-bold">{s?.name?.charAt(0) || '?'}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4"><p className="font-black text-slate-800">{s?.name}</p><p className="text-[10px] text-slate-400">{s?.course}</p></td>
                    <td className="px-6 py-4 font-bold text-slate-500">{s?.roll_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-400">{s?.admission_year || "N/A"}</td>
                    <td className="px-6 py-4"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase">{s?.session || "N/A"}</span></td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={() => {
                        setEditStudentModal({ open: true, data: {...s, new_profile_image: null} });
                        setStudentPreview(s.profile_image ? "http://localhost:5000" + s.profile_image : null);
                      }} className="p-2 text-slate-400 hover:text-blue-600"><Edit size={18}  /></button>
                      <button onClick={() => setResetModal({ open: true, userId: s?.user_id, newPassword: '' })} className="p-2 text-slate-400 hover:text-blue-600"><Key size={18}  /></button>
                      <button onClick={() => handleDeleteStudent(s?.user_id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}  /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderFeeRecords = () => {
    const filteredRecords = (feeRecords || []).filter(r => {
        // 1. Status Filter
        const matchesStatus = feeStatusFilter === 'all' || 
            (r.status || "").toLowerCase().trim() === feeStatusFilter.toLowerCase().trim();
        
        // 2. Course Filter
        const matchesCourse = !courseFilter || String(r.course_id) === String(courseFilter);

        // 3. Session Filter
        const matchesSession = !sessionFilter || (r.session || "").toLowerCase().includes(sessionFilter.toLowerCase().trim());
        
        // 4. Search Filter
        const search = searchTerm.toLowerCase().trim();
        const matchesSearch = !search || 
            (r.student_name || "").toLowerCase().includes(search) ||
            (r.course_name || "").toLowerCase().includes(search);
            
        return matchesStatus && matchesCourse && matchesSession && matchesSearch;
    });

    return (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight text-center lg:text-left">Payment Records</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}  />
                        <input 
                            type="text" placeholder="Search student..." 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold shadow-sm outline-none"
                            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                         />
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                        <Filter size={16} className="text-slate-400"  />
                        <select 
                            className="bg-transparent text-sm font-bold text-slate-600 outline-none"
                            value={feeStatusFilter} onChange={(e) => setFeeStatusFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="paid">Paid</option>
                            <option value="pending">Pending</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Student</th>
                                <th className="px-8 py-5">Course / Category</th>
                                <th className="px-8 py-5">Amount Details</th>
                                <th className="px-8 py-5 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRecords.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-5">
                                        <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{r.student_name}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <p className="font-bold text-slate-600 text-xs">{r.course_name}</p>
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{r.category}</p>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800">Paid: ₹{parseFloat(r.paid).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-slate-400">Total: ₹{parseFloat(r.total_fee).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            r.status === 'paid' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
  };

  const renderComplaints = () => {
    const filteredComplaints = (complaints || []).filter(c => {
        const term = searchTerm.toLowerCase().trim();
        return !term || 
               (c.user_name || "").toLowerCase().includes(term) || 
               (c.title || "").toLowerCase().includes(term) || 
               (c.message || "").toLowerCase().includes(term);
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">System Complaints & Feedback</h2>
        <div className="grid grid-cols-1 gap-6">
            {filteredComplaints.length > 0 ? (
              filteredComplaints.map((c) => (
                <div key={c.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl relative group">
                    <button 
                        onClick={() => handleDeleteComplaint(c.id)}
                        className="absolute top-6 right-6 p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                    >
                        <Trash2 size={20}  />
                    </button>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500">
                                {c.role === 'student' ? <GraduationCap size={24}  /> : <Users size={24}  />}
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">{c.user_name}</h4>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                    c.role === 'student' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'
                                }`}>
                                    {c.role}
                                </span>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                        <p className="font-black text-blue-600 text-xs uppercase tracking-widest mb-2">Subject: {c.title}</p>
                        <p className="text-slate-600 text-sm leading-relaxed font-medium">{c.message}</p>
                    </div>
                </div>
              ))
            ) : (
                <div className="text-center py-20 text-slate-300 font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                    {searchTerm ? "No complaints matching search" : "No complaints received"}
                </div>
            )}
        </div>
    </div>
    );
  };

  const renderDepartments = () => {
    const filteredDepts = (departments || []).filter(d => {
        const term = searchTerm.toLowerCase().trim();
        return !term || (d.name || "").toLowerCase().includes(term);
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Manage Departments</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100">
          <h3 className="font-black text-lg mb-4">{editDept ? 'Edit Department' : 'Add New Department'}</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editDept) {
                await api.put(`/departments/${editDept?.id}`, deptForm);
                alert('Updated!'); setEditDept(null);
              } else {
                await api.post('/departments', deptForm);
                alert('Added!');
              }
              setDeptForm({ name: '' }); fetchDepartments();
            } catch (err) { alert(err.response?.data?.message || 'Error'); }
          }} className="flex flex-col sm:flex-row gap-4">
            <input type="text" placeholder="Name" className="flex-1 p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={deptForm?.name} onChange={e => setDeptForm({name: e.target?.value})} required  />
            <div className="flex gap-2">
              <button type="submit" className="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-sm">{editDept ? 'Update' : 'Add'}</button>
              {editDept && <button type="button" onClick={() => {setEditDept(null); setDeptForm({name: ''});}} className="bg-slate-100 text-slate-600 p-3 rounded-2xl"><X size={18} /></button>}
            </div>
          </form>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Name</th><th className="px-6 py-4 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDepts.length > 0 ? (
                  filteredDepts.map(d => (
                    <tr key={d?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-slate-400 font-bold">#{d?.id}</td>
                      <td className="px-6 py-4 font-black text-slate-800 uppercase">{d?.name}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => {setEditDept(d); setDeptForm({name: d?.name});}} className="text-slate-400 hover:text-blue-600 p-2"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteDept(d?.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr><td colSpan="3" className="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-widest italic">No departments match</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderCourses = () => {
    const filteredCourses = (courses || []).filter(c => {
        const matchesDept = !deptFilter || String(c.department_id) === String(deptFilter);
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || (c.name || "").toLowerCase().includes(term) || (c.department_name || "").toLowerCase().includes(term);
        return matchesDept && matchesSearch;
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Manage Courses</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">{editCourse ? 'Edit Course' : 'New Course'}</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editCourse) { await api.put(`/courses/${editCourse?.id}`, courseForm); setEditCourse(null); alert('Updated!'); }
              else { await api.post('/courses', courseForm); alert('Added!'); }
              setCourseForm({ name: '', department_id: '', duration_years: 3 }); fetchCourses();
            } catch (err) { alert('Error'); }
          }} className="space-y-4">
            <input type="text" placeholder="Course Name" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={courseForm?.name} onChange={e => setCourseForm({...courseForm, name: e.target?.value})} required  />
            <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={courseForm?.department_id} onChange={e => setCourseForm({...courseForm, department_id: e.target?.value})} required>
              <option value="">Select Dept</option>
              {departments?.map(d => <option key={d?.id} value={d?.id}>{d?.name}</option>)}
            </select>
            <input type="number" placeholder="Duration (Years)" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={courseForm?.duration_years} onChange={e => setCourseForm({...courseForm, duration_years: e.target?.value})} required  />
            <button type="submit" className="w-full bg-orange-600 text-white p-3 rounded-2xl font-black text-sm hover:bg-orange-700">{editCourse ? 'Update' : 'Add Course'}</button>
            {editCourse && <button type="button" onClick={() => {setEditCourse(null); setCourseForm({name:'', department_id:'', duration_years:3});}} className="w-full bg-slate-100 text-slate-600 p-3 rounded-2xl font-black text-sm">Cancel</button>}
          </form>
        </div>
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr><th className="px-6 py-4">Course</th><th className="px-6 py-4">Department</th><th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredCourses.length > 0 ? (
                  filteredCourses.map(c => (
                    <tr key={c?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-800 uppercase">{c?.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-400 uppercase">{c?.department_name}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => {setEditCourse(c); setCourseForm({name:c?.name, department_id:c?.department_id, duration_years:c?.duration_years});}} className="text-slate-400 hover:text-blue-600 p-2"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteCourse(c?.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr><td colSpan="3" className="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-widest italic">No courses found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderFees = () => {
    const filteredFees = (feeStructures || []).filter(f => {
        const matchesCourse = !courseFilter || String(f.course_id) === String(courseFilter);
        const term = searchTerm.toLowerCase().trim();
        const matchesSearch = !term || (f.course_name || "").toLowerCase().includes(term) || (f.category || "").toLowerCase().includes(term);
        return matchesCourse && matchesSearch;
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Fee Management</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">{editFee ? 'Edit Fee' : 'Set Fee'}</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editFee) { await api.put(`/fee-structures/${editFee?.id}`, feeForm); setEditFee(null); alert('Updated!'); }
              else { await api.post('/fee-structures', feeForm); alert('Created!'); }
              setFeeForm({ course_id: '', category: 'Tuition Fee', amount: '', description: '' }); fetchFees();
            } catch (err) { alert('Error'); }
          }} className="space-y-4">
            <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={feeForm?.course_id} onChange={e => setFeeForm({...feeForm, course_id: e.target?.value})} required>
              <option value="">Select Course</option>
              {courses?.map(c => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
            </select>
            <input type="text" placeholder="Category" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={feeForm?.category} onChange={e => setFeeForm({...feeForm, category: e.target?.value})} required  />
            <input type="number" placeholder="Amount (₹)" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={feeForm?.amount} onChange={e => setFeeForm({...feeForm, amount: e.target?.value})} required  />
            <textarea placeholder="Description" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={feeForm?.description} onChange={e => setFeeForm({...feeForm, description: e.target?.value})}></textarea>
            <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-2xl font-black text-sm">{editFee ? 'Update' : 'Save Fee'}</button>
          </form>
        </div>
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr><th className="px-6 py-4">Course</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Amount</th><th className="px-6 py-4 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredFees.length > 0 ? (
                  filteredFees.map(f => (
                    <tr key={f?.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-black text-slate-800 uppercase">{f?.course_name}</td>
                      <td className="px-6 py-4 text-slate-500">{f?.category}</td>
                      <td className="px-6 py-4 font-black text-slate-900">₹{parseFloat(f?.amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => {setEditFee(f); setFeeForm({course_id:f?.course_id, category:f?.category, amount:f?.amount, description:f?.description});}} className="text-slate-400 hover:text-blue-600 p-2"><Edit size={16} /></button>
                        <button onClick={() => handleDeleteFee(f?.id)} className="text-slate-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                    <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-300 font-bold uppercase tracking-widest italic">No fee structures match</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderNotices = () => {
    const filteredNotices = (notices || []).filter(n => {
        const term = searchTerm.toLowerCase().trim();
        return !term || 
               (n.title || "").toLowerCase().includes(term) || 
               (n.content || "").toLowerCase().includes(term);
    });

    return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Institutional Notices</h2>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">Post Notice</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post('/notices', noticeForm);
              setNoticeForm({ title: '', content: '', target_role: 'all' }); fetchNotices(); alert('Posted!');
            } catch (err) { alert('Error'); }
          }} className="space-y-4">
            <input type="text" placeholder="Title" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={noticeForm?.title} onChange={e => setNoticeForm({...noticeForm, title: e.target?.value})} required  />
            <textarea placeholder="Content" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold h-32" value={noticeForm?.content} onChange={e => setNoticeForm({...noticeForm, content: e.target?.value})} required></textarea>
            <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={noticeForm?.target_role} onChange={e => setNoticeForm({...noticeForm, target_role: e.target?.value})}>
              <option value="all">Everyone</option><option value="teacher">Teachers</option><option value="student">Students</option>
            </select>
            <button type="submit" className="w-full bg-purple-600 text-white p-3 rounded-2xl font-black text-sm">Broadcast</button>
          </form>
        </div>
        <div className="lg:col-span-3 space-y-4">
          {filteredNotices.length > 0 ? (
            filteredNotices.map(n => (
              <div key={n?.id} className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-xl relative group">
                <button onClick={() => handleDeleteNotice(n?.id)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-2">
                  <h4 className="font-black text-lg md:text-xl text-slate-800 uppercase pr-10">{n?.title}</h4>
                  <span className="bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[10px] font-black">{new Date(n?.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed font-medium whitespace-pre-wrap">{n?.content}</p>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                {searchTerm ? "No notices matching search" : "No institutional notices posted"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

  const renderSessions = () => (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-8 tracking-tight">Academic Sessions</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-xl">
          <h3 className="font-black text-lg text-slate-800 mb-4">New Session</h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.post('/sessions', sessionForm);
              setSessionForm({ session_name: '', duration_years: 3 }); fetchSessions(); alert('Added!');
            } catch (err) { alert('Error'); }
          }} className="space-y-4">
            <input type="text" placeholder="Session Name (e.g. 2023-2026)" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={sessionForm?.session_name} onChange={e => setSessionForm({...sessionForm, session_name: e.target?.value})} required  />
            <input type="number" placeholder="Duration (Years)" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={sessionForm?.duration_years} onChange={e => setSessionForm({...sessionForm, duration_years: e.target?.value})} required  />
            <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-2xl font-black text-sm">Create Session</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden text-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[400px]">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-black">
                <tr><th className="px-6 py-4">ID</th><th className="px-6 py-4">Session</th><th className="px-6 py-4">Duration</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions?.map(s => (
                  <tr key={s?.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-bold">#{s?.id}</td>
                    <td className="px-6 py-4 font-black text-slate-800 uppercase">{s?.session_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-400">{s?.duration_years} Years</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading && !stats?.departments) return <Loader  />;
  if (error) return <ErrorMessage message={error} retry={fetchAllData}  />;

  return (
    <div className="w-full pb-12 px-4 md:px-0">
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'staff' && renderStaff()}
      {activeTab === 'students' && renderStudents()}
      {activeTab === 'departments' && renderDepartments()}
      {activeTab === 'courses' && renderCourses()}
      {activeTab === 'sessions' && renderSessions()}
      {activeTab === 'fees' && renderFees()}
      {activeTab === 'fee-records' && renderFeeRecords()}
      {activeTab === 'complaints' && renderComplaints()}
      {activeTab === 'notices' && renderNotices()}
      
      {/* Password Reset Modal */}
      {resetModal?.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="font-black text-xl text-slate-800 mb-2">Reset Password</h3>
            <p className="text-slate-400 text-sm mb-6">Enter new secure password.</p>
            <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl mb-4 font-mono text-sm font-bold" value={resetModal?.newPassword} onChange={(e) => setResetModal({...resetModal, newPassword: e.target.value})}  />
            <div className="flex gap-3">
              <button onClick={handleResetPassword} className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black text-sm">Reset</button>
              <button onClick={() => setResetModal({ open: false, userId: null, newPassword: '' })} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-2xl font-black text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Teacher Modal */}
      {editTeacherModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-xl text-slate-800 mb-6">Edit Teacher</h3>
            <form onSubmit={handleUpdateTeacher} className="space-y-4">
              <div className="flex justify-center mb-4">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                    {teacherPreview ? <img src={teacherPreview} className="w-full h-full object-cover"  /> : <Plus className="text-slate-400"  />}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, new_profile_image: file}});
                      setTeacherPreview(URL.createObjectURL(file));
                    }
                  }}  />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Name</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.name} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, name: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
                  <input type="email" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.email} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, email: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mobile</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.mobile} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, mobile: e.target.value}})} required pattern="[0-9]{10}" title="Mobile number must be 10 digits"  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Profession</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.profession} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, profession: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Department</label>
                  <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.department_id} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, department_id: e.target.value}})} required>
                    {departments?.map(d => <option key={d?.id} value={d?.id}>{d?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Designation</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editTeacherModal.data.designation} onChange={e => setEditTeacherModal({...editTeacherModal, data: {...editTeacherModal.data, designation: e.target.value}})} required  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-blue-600 text-white p-3 rounded-2xl font-black text-sm">Update</button>
                <button type="button" onClick={() => {
                  setEditTeacherModal({ open: false, data: null });
                  setTeacherPreview(null);
                }} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-2xl font-black text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {editStudentModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-xl text-slate-800 mb-6">Edit Student</h3>
            <form onSubmit={handleUpdateStudent} className="space-y-4">
              <div className="flex justify-center mb-4">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-200">
                    {studentPreview ? <img src={studentPreview} className="w-full h-full object-cover"  /> : <Plus className="text-slate-400"  />}
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={e => {
                    const file = e.target.files[0];
                    if (file) {
                      setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, new_profile_image: file}});
                      setStudentPreview(URL.createObjectURL(file));
                    }
                  }}  />
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Name</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.name} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, name: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Email</label>
                  <input type="email" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.email} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, email: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mobile</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.mobile} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, mobile: e.target.value}})} required pattern="[0-9]{10}" title="Mobile number must be 10 digits"  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Roll No</label>
                  <input type="text" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.roll_number} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, roll_number: e.target.value}})} required  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Course</label>
                  <select className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.course_id} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, course_id: e.target.value}})} required>
                    {courses?.map(c => <option key={c?.id} value={c?.id}>{c?.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Admission Year</label>
                  <input type="number" className="w-full p-3 bg-slate-50 rounded-2xl text-sm font-bold" value={editStudentModal.data.admission_year} onChange={e => setEditStudentModal({...editStudentModal, data: {...editStudentModal.data, admission_year: e.target.value}})} required  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="submit" className="flex-1 bg-indigo-600 text-white p-3 rounded-2xl font-black text-sm">Update</button>
                <button type="button" onClick={() => {
                  setEditStudentModal({ open: false, data: null });
                  setStudentPreview(null);
                }} className="flex-1 bg-slate-100 text-slate-600 p-3 rounded-2xl font-black text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colors = { blue: 'bg-blue-50 text-blue-600 border-blue-100', indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100', purple: 'bg-purple-50 text-purple-600 border-purple-100', orange: 'bg-orange-50 text-orange-600 border-orange-100' };
  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-50 shadow-xl hover:scale-105 transition-transform duration-300">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${colors[color]} border`}>
        {Icon ? <Icon size={28} strokeWidth={2.5}  /> : <div className="text-xs font-black">{title?.charAt(0)}</div>}
      </div>
      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <p className="text-4xl font-black text-slate-900 mt-2 tracking-tighter">{value}</p>
    </div>
  );
};

const ActionButton = ({ label, icon: Icon, onClick, color }) => {
  const colors = { blue: 'bg-blue-600 hover:bg-blue-700', indigo: 'bg-indigo-600 hover:bg-indigo-700', purple: 'bg-purple-600 hover:bg-purple-700', orange: 'bg-orange-600 hover:bg-orange-700' };
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-3 p-6 rounded-2xl text-white font-black text-[10px] uppercase transition-all hover:-translate-y-1 shadow-lg ${colors[color]}`}>
      {Icon ? <Icon size={24} strokeWidth={3}  /> : <div className="text-lg font-black">{label?.charAt(0)}</div>}
      {label}
    </button>
  );
};

export default AdminDashboard;
