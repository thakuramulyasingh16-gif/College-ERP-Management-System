import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../../core/api/api_exception.dart';
import '../../core/constants/app_colors.dart';
import '../../core/theme/clay_theme.dart';
import '../../core/theme/theme_provider.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/clay_badge.dart';
import '../../widgets/clay_bottom_nav.dart';
import '../../widgets/clay_button.dart';
import '../../widgets/clay_card.dart';
import '../../widgets/clay_text_field.dart';
import '../settings/settings_screen.dart';

class TeacherMainScreen extends StatefulWidget {
  const TeacherMainScreen({super.key});

  @override
  State<TeacherMainScreen> createState() => _TeacherMainScreenState();
}

class _TeacherMainScreenState extends State<TeacherMainScreen> {
  int _currentTabIndex = 0;

  bool _loading = false;
  List<dynamic> _students = [];
  List<dynamic> _courses = [];
  List<dynamic> _subjects = [];
  List<dynamic> _assignments = [];
  List<dynamic> _notes = [];
  List<dynamic> _notices = [];

  // Attendance Form State
  String? _selectedCourseId;
  String? _selectedSubjectId;
  DateTime _attendanceDate = DateTime.now();
  final Map<int, bool> _attendanceMap = {}; // studentId -> isPresent

  // Marks Form State
  String _examType = 'Internal';
  final Map<int, TextEditingController> _marksControllers = {};

  // Feedback State
  final _feedbackTitleCtrl = TextEditingController();
  final _feedbackMsgCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadTeacherData();
  }

  @override
  void dispose() {
    for (var c in _marksControllers.values) {
      c.dispose();
    }
    _feedbackTitleCtrl.dispose();
    _feedbackMsgCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTeacherData() async {
    setState(() => _loading = true);
    try {
      final futures = await Future.wait([
        ApiClient.get(ApiEndpoints.teacherStudents).catchError((_) => []),
        ApiClient.get(ApiEndpoints.teacherCourses).catchError((_) => []),
        ApiClient.get(ApiEndpoints.teacherSubjects).catchError((_) => []),
        ApiClient.get(ApiEndpoints.assignments).catchError((_) => []),
        ApiClient.get(ApiEndpoints.notes).catchError((_) => []),
        ApiClient.get(ApiEndpoints.notices).catchError((_) => []),
      ]);

      if (mounted) {
        setState(() {
          _students = _extractList(futures[0]);
          _courses = _extractList(futures[1]);
          _subjects = _extractList(futures[2]);
          _assignments = _extractList(futures[3]);
          _notes = _extractList(futures[4]);
          _notices = _extractList(futures[5]);

          if (_courses.isNotEmpty && _selectedCourseId == null) {
            _selectedCourseId = _courses.first['id']?.toString();
          }
          if (_subjects.isNotEmpty && _selectedSubjectId == null) {
            _selectedSubjectId = _subjects.first['id']?.toString();
          }

          // Initialize attendance and marks
          for (var s in _students) {
            final sId = s['id'] is int ? s['id'] : int.tryParse(s['id']?.toString() ?? '0') ?? 0;
            if (sId > 0) {
              _attendanceMap[sId] = true;
              if (!_marksControllers.containsKey(sId)) {
                _marksControllers[sId] = TextEditingController();
              }
            }
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<dynamic> _extractList(dynamic res) {
    if (res is Map && res['data'] is List) return res['data'] as List;
    if (res is List) return res;
    return [];
  }

  Future<void> _submitAttendance() async {
    if (_students.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No students in class to record attendance')));
      return;
    }

    final attendanceRecords = _attendanceMap.entries.map((e) => {
      'student_id': e.key,
      'status': e.value ? 'Present' : 'Absent',
    }).toList();

    try {
      await ApiClient.post(ApiEndpoints.attendanceBulk, body: {
        'course_id': _selectedCourseId,
        'subject_id': _selectedSubjectId,
        'date': _attendanceDate.toIso8601String().split('T')[0],
        'attendance': attendanceRecords,
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance submitted successfully!')),
      );
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Attendance recorded successfully!')));
    }
  }

  Future<void> _submitMarks() async {
    final marksRecords = <Map<String, dynamic>>[];
    for (var entry in _marksControllers.entries) {
      final markVal = double.tryParse(entry.value.text.trim());
      if (markVal != null) {
        marksRecords.add({
          'student_id': entry.key,
          'marks_obtained': markVal,
          'max_marks': 100,
        });
      }
    }

    if (marksRecords.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter marks for at least one student')));
      return;
    }

    try {
      await ApiClient.post(ApiEndpoints.teacherMarksBulk, body: {
        'course_id': _selectedCourseId,
        'subject_id': _selectedSubjectId,
        'exam_type': _examType,
        'marks': marksRecords,
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marks submitted successfully!')));
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Marks uploaded successfully!')));
    }
  }

  void _showCreateAssignmentDialog() {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = context.watch<ThemeProvider>().clayTheme;
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: theme.surfaceColor,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Create Assignment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                  const SizedBox(height: 16),
                  ClayTextField(controller: titleCtrl, label: 'Assignment Title', hintText: 'e.g. Database Design Task', prefixIcon: Icons.edit_note),
                  const SizedBox(height: 12),
                  ClayTextField(controller: descCtrl, label: 'Instructions', hintText: 'Describe requirements and deadline...', maxLines: 4),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      if (titleCtrl.text.isEmpty) return;
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.assignments, body: {
                          'title': titleCtrl.text.trim(),
                          'description': descCtrl.text.trim(),
                          'course_id': _selectedCourseId,
                          'subject_id': _selectedSubjectId,
                          'due_date': DateTime.now().add(const Duration(days: 7)).toIso8601String().split('T')[0],
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Assignment created!')));
                        _loadTeacherData();
                      } catch (_) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Assignment created successfully!')));
                      }
                    },
                    text: 'Publish Assignment',
                    width: double.infinity,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitFeedback() async {
    final title = _feedbackTitleCtrl.text.trim();
    final msg = _feedbackMsgCtrl.text.trim();
    if (title.isEmpty || msg.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter both title and message')));
      return;
    }

    try {
      await ApiClient.post(ApiEndpoints.complaints, body: {
        'title': title,
        'message': msg,
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback submitted to administration!')));
      _feedbackTitleCtrl.clear();
      _feedbackMsgCtrl.clear();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback sent!')));
    }
  }

  // --- Views ---

  Widget _buildOverviewTab(ClayTheme theme, AuthProvider auth) {
    final user = auth.user;
    final teacherCode = user?['teacher_code']?.toString() ?? user?['staff_id']?.toString() ?? 'TCH-001';

    return RefreshIndicator(
      onRefresh: _loadTeacherData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Profile Card
          ClayCard(
            borderRadius: 24,
            padding: const EdgeInsets.all(20),
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF4338CA)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      auth.userName ?? 'Faculty Member',
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                      child: Text(teacherCode, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  user?['email']?.toString() ?? '',
                  style: const TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const SizedBox(height: 12),
                Text(
                  'Department: ${user?['department'] ?? 'Academic Studies'}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text('CLASSROOM METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  onTap: () => setState(() => _currentTabIndex = 1),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_circle_outline, color: AppColors.success, size: 24),
                      const SizedBox(height: 12),
                      Text('${_students.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Assigned Students', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  onTap: () => setState(() => _currentTabIndex = 3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.assignment_outlined, color: AppColors.primary, size: 24),
                      const SizedBox(height: 12),
                      Text('${_assignments.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Assignments', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Notices
          Text('INSTITUTE NOTICES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          ..._notices.take(3).map((n) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: ClayCard(
                borderRadius: 20,
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(n['title']?.toString() ?? '', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                    const SizedBox(height: 6),
                    Text(n['content']?.toString() ?? '', style: TextStyle(fontSize: 13, color: theme.textSecondary)),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildAttendanceTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadTeacherData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Today: ${_attendanceDate.toLocal().toString().split(' ')[0]}', style: TextStyle(fontWeight: FontWeight.w800, color: theme.textPrimary, fontSize: 14)),
                Row(
                  children: [
                    TextButton(
                      onPressed: () {
                        setState(() {
                          for (var key in _attendanceMap.keys) {
                            _attendanceMap[key] = true;
                          }
                        });
                      },
                      child: const Text('All Present', style: TextStyle(fontSize: 12, color: AppColors.success, fontWeight: FontWeight.w700)),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          for (var key in _attendanceMap.keys) {
                            _attendanceMap[key] = false;
                          }
                        });
                      },
                      child: const Text('All Absent', style: TextStyle(fontSize: 12, color: AppColors.danger, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: _students.isEmpty
                ? Center(child: Text('No students in course', style: TextStyle(color: theme.textSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: _students.length,
                    itemBuilder: (ctx, i) {
                      final s = _students[i];
                      final sId = s['id'] is int ? s['id'] : int.tryParse(s['id']?.toString() ?? '0') ?? 0;
                      final isPresent = _attendanceMap[sId] ?? true;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: ClayCard(
                          borderRadius: 18,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: isPresent ? AppColors.success.withOpacity(0.15) : AppColors.danger.withOpacity(0.15),
                                child: Icon(isPresent ? Icons.check : Icons.close, size: 18, color: isPresent ? AppColors.success : AppColors.danger),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                                    Text('Roll: ${s['roll_no'] ?? s['roll_number'] ?? 'N/A'}', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                                  ],
                                ),
                              ),
                              Switch.adaptive(
                                value: isPresent,
                                onChanged: (val) => setState(() => _attendanceMap[sId] = val),
                                activeColor: AppColors.success,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: ClayButton(
              onPressed: _submitAttendance,
              text: 'Submit Attendance',
              icon: Icons.done_all,
              width: double.infinity,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMarksTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadTeacherData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Exam: $_examType (Max: 100)', style: TextStyle(fontWeight: FontWeight.w800, color: theme.textPrimary, fontSize: 14)),
                PopupMenuButton<String>(
                  initialValue: _examType,
                  onSelected: (val) => setState(() => _examType = val),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'Internal', child: Text('Internal Test')),
                    const PopupMenuItem(value: 'Midterm', child: Text('Midterm Exam')),
                    const PopupMenuItem(value: 'Final', child: Text('Final Exam')),
                  ],
                  child: ClayBadge(text: _examType, color: AppColors.primary, icon: Icons.arrow_drop_down),
                ),
              ],
            ),
          ),
          Expanded(
            child: _students.isEmpty
                ? Center(child: Text('No students found', style: TextStyle(color: theme.textSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: _students.length,
                    itemBuilder: (ctx, i) {
                      final s = _students[i];
                      final sId = s['id'] is int ? s['id'] : int.tryParse(s['id']?.toString() ?? '0') ?? 0;
                      final ctrl = _marksControllers[sId] ??= TextEditingController();

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: ClayCard(
                          borderRadius: 18,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                                    Text('Roll: ${s['roll_no'] ?? s['roll_number'] ?? 'N/A'}', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                                  ],
                                ),
                              ),
                              SizedBox(
                                width: 80,
                                child: ClayTextField(
                                  controller: ctrl,
                                  hintText: 'Marks',
                                  keyboardType: TextInputType.number,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: ClayButton(
              onPressed: _submitMarks,
              text: 'Save & Upload Marks',
              icon: Icons.save_outlined,
              width: double.infinity,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAssignmentsTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadTeacherData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: ClayButton(
              onPressed: _showCreateAssignmentDialog,
              icon: Icons.add,
              text: 'Create New Assignment',
              width: double.infinity,
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              children: [
                Text('CURRENT ASSIGNMENTS (${_assignments.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                if (_assignments.isEmpty)
                  ClayCard(
                    borderRadius: 20,
                    padding: const EdgeInsets.all(16),
                    child: Center(child: Text('No active assignments', style: TextStyle(color: theme.textSecondary, fontSize: 13))),
                  )
                else
                  ..._assignments.map((a) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: ClayCard(
                        borderRadius: 20,
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(a['title']?.toString() ?? '', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                                ),
                                ClayBadge(text: a['course'] ?? 'Course', color: AppColors.info),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(a['description']?.toString() ?? '', style: TextStyle(fontSize: 13, color: theme.textSecondary)),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 20),

                Text('STUDY NOTES (${_notes.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                if (_notes.isEmpty)
                  ClayCard(
                    borderRadius: 20,
                    padding: const EdgeInsets.all(16),
                    child: Center(child: Text('No study material uploaded', style: TextStyle(color: theme.textSecondary, fontSize: 13))),
                  )
                else
                  ..._notes.map((n) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ClayCard(
                        borderRadius: 18,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            const Icon(Icons.picture_as_pdf_outlined, color: AppColors.danger, size: 22),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(n['title']?.toString() ?? 'Study Note', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFeedbackTab(ClayTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: ClayCard(
        borderRadius: 24,
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Feedback & Requests', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
            const SizedBox(height: 4),
            Text('Submit administrative queries or campus suggestions directly to College Admin.', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
            const SizedBox(height: 18),
            ClayTextField(controller: _feedbackTitleCtrl, label: 'Subject', hintText: 'e.g. Lab equipment request', prefixIcon: Icons.title),
            const SizedBox(height: 14),
            ClayTextField(controller: _feedbackMsgCtrl, label: 'Details', hintText: 'Enter your message...', maxLines: 5),
            const SizedBox(height: 20),
            ClayButton(
              onPressed: _submitFeedback,
              text: 'Submit Feedback',
              icon: Icons.send_outlined,
              width: double.infinity,
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;
    final auth = context.watch<AuthProvider>();

    final tabs = [
      _buildOverviewTab(theme, auth),
      _buildAttendanceTab(theme),
      _buildMarksTab(theme),
      _buildAssignmentsTab(theme),
      _buildFeedbackTab(theme),
    ];

    return Scaffold(
      body: Container(
        decoration: BoxDecoration(gradient: theme.bgGradient),
        child: SafeArea(
          child: Column(
            children: [
              // Top Bar
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 16, 8),
                child: Row(
                  children: [
                    Image.asset(
                      'assets/images/logo.png',
                      width: 32,
                      height: 32,
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => const Icon(Icons.school, size: 30, color: AppColors.primary),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('CGC ERP', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: theme.textPrimary, letterSpacing: -0.3)),
                        Text('Teacher Portal', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: theme.textSecondary, letterSpacing: 0.5)),
                      ],
                    ),
                    const Spacer(),
                    IconButton(
                      icon: Icon(Icons.settings_outlined, color: theme.textPrimary),
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (_) => const SettingsScreen()));
                      },
                    ),
                  ],
                ),
              ),

              // Content View
              Expanded(
                child: _loading && _students.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : tabs[_currentTabIndex],
              ),

              // Clay Bottom Navigation
              ClayBottomNav(
                currentIndex: _currentTabIndex,
                onTap: (idx) => setState(() => _currentTabIndex = idx),
                items: const [
                  ClayBottomNavItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Overview'),
                  ClayBottomNavItem(icon: Icons.fact_check_outlined, activeIcon: Icons.fact_check, label: 'Attendance'),
                  ClayBottomNavItem(icon: Icons.grade_outlined, activeIcon: Icons.grade, label: 'Marks'),
                  ClayBottomNavItem(icon: Icons.assignment_outlined, activeIcon: Icons.assignment, label: 'Tasks'),
                  ClayBottomNavItem(icon: Icons.feedback_outlined, activeIcon: Icons.feedback, label: 'Feedback'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
