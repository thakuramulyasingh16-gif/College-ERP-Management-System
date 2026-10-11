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
import '../../widgets/reset_password_modal.dart';
import '../settings/settings_screen.dart';

class AdminMainScreen extends StatefulWidget {
  const AdminMainScreen({super.key});

  @override
  State<AdminMainScreen> createState() => _AdminMainScreenState();
}

class _AdminMainScreenState extends State<AdminMainScreen> {
  int _currentTabIndex = 0;

  // Data States
  bool _loading = false;
  Map<String, dynamic> _stats = {};
  List<dynamic> _teachers = [];
  List<dynamic> _students = [];
  List<dynamic> _departments = [];
  List<dynamic> _courses = [];
  List<dynamic> _sessions = [];
  List<dynamic> _notices = [];
  List<dynamic> _feeStructures = [];
  List<dynamic> _feeRecords = [];
  List<dynamic> _complaints = [];

  // Search & Filter
  String _teacherSearch = '';
  String _studentSearch = '';
  String _selectedCourseFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() => _loading = true);
    try {
      final futures = await Future.wait([
        ApiClient.get(ApiEndpoints.dashboardStats).catchError((_) => {}),
        ApiClient.get(ApiEndpoints.teachers).catchError((_) => []),
        ApiClient.get(ApiEndpoints.students).catchError((_) => []),
        ApiClient.get(ApiEndpoints.departments).catchError((_) => []),
        ApiClient.get(ApiEndpoints.courses).catchError((_) => []),
        ApiClient.get(ApiEndpoints.sessions).catchError((_) => []),
        ApiClient.get(ApiEndpoints.notices).catchError((_) => []),
        ApiClient.get(ApiEndpoints.feeStructures).catchError((_) => []),
        ApiClient.get(ApiEndpoints.adminFees).catchError((_) => []),
        ApiClient.get(ApiEndpoints.adminComplaints).catchError((_) => []),
      ]);

      if (mounted) {
        setState(() {
          _stats = _extractData(futures[0]) is Map ? _extractData(futures[0]) : {};
          _teachers = _extractList(futures[1]);
          _students = _extractList(futures[2]);
          _departments = _extractList(futures[3]);
          _courses = _extractList(futures[4]);
          _sessions = _extractList(futures[5]);
          _notices = _extractList(futures[6]);
          _feeStructures = _extractList(futures[7]);
          _feeRecords = _extractList(futures[8]);
          _complaints = _extractList(futures[9]);
        });
      }
    } catch (_) {
      // Error handled
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  dynamic _extractData(dynamic res) {
    if (res is Map && res['data'] != null) return res['data'];
    return res;
  }

  List<dynamic> _extractList(dynamic res) {
    if (res is Map && res['data'] is List) return res['data'] as List;
    if (res is List) return res;
    return [];
  }

  // --- CRUD Modals & Actions ---

  void _showAddTeacherDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final mobileCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    String? selectedDeptId = _departments.isNotEmpty ? _departments.first['id']?.toString() : null;
    String designation = 'Professor';

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
                  Text('Add New Faculty', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                  const SizedBox(height: 16),
                  ClayTextField(controller: nameCtrl, label: 'Full Name', hintText: 'Dr. John Doe', prefixIcon: Icons.person_outline),
                  const SizedBox(height: 12),
                  ClayTextField(controller: emailCtrl, label: 'Email Address', hintText: 'faculty@college.com', prefixIcon: Icons.mail_outline),
                  const SizedBox(height: 12),
                  ClayTextField(controller: passCtrl, label: 'Initial Password', hintText: 'Min 6 characters', prefixIcon: Icons.lock_outline, isPassword: true),
                  const SizedBox(height: 12),
                  ClayTextField(controller: codeCtrl, label: 'Teacher ID / Staff Code', hintText: 'TCH-001', prefixIcon: Icons.badge_outlined),
                  const SizedBox(height: 12),
                  ClayTextField(controller: mobileCtrl, label: 'Mobile Number', hintText: '9876543210', prefixIcon: Icons.phone_outlined),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      if (nameCtrl.text.isEmpty || emailCtrl.text.isEmpty || passCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill required fields')));
                        return;
                      }
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.teachers, body: {
                          'name': nameCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'password': passCtrl.text.trim(),
                          'teacher_code': codeCtrl.text.trim(),
                          'mobile': mobileCtrl.text.trim(),
                          'department_id': selectedDeptId,
                          'designation': designation,
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Faculty created successfully!')));
                        _loadAllData();
                      } on ApiException catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                      }
                    },
                    text: 'Save Faculty Member',
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

  void _showAddStudentDialog() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    final mobileCtrl = TextEditingController();
    String? selectedCourseId = _courses.isNotEmpty ? _courses.first['id']?.toString() : null;

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
                  Text('Add New Student', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                  const SizedBox(height: 16),
                  ClayTextField(controller: nameCtrl, label: 'Full Name', hintText: 'Student Name', prefixIcon: Icons.person_outline),
                  const SizedBox(height: 12),
                  ClayTextField(controller: emailCtrl, label: 'Email Address', hintText: 'student@college.com', prefixIcon: Icons.mail_outline),
                  const SizedBox(height: 12),
                  ClayTextField(controller: passCtrl, label: 'Initial Password', hintText: 'Min 6 characters', prefixIcon: Icons.lock_outline, isPassword: true),
                  const SizedBox(height: 12),
                  ClayTextField(controller: mobileCtrl, label: 'Mobile Number', hintText: '9876543210', prefixIcon: Icons.phone_outlined),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      if (nameCtrl.text.isEmpty || emailCtrl.text.isEmpty || passCtrl.text.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please fill required fields')));
                        return;
                      }
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.students, body: {
                          'name': nameCtrl.text.trim(),
                          'email': emailCtrl.text.trim(),
                          'password': passCtrl.text.trim(),
                          'mobile': mobileCtrl.text.trim(),
                          'course_id': selectedCourseId,
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student created successfully!')));
                        _loadAllData();
                      } on ApiException catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
                      }
                    },
                    text: 'Save Student',
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

  void _showAddNoticeDialog() {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    String targetRole = 'all';

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
                  Text('Broadcast New Notice', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                  const SizedBox(height: 16),
                  ClayTextField(controller: titleCtrl, label: 'Notice Title', hintText: 'e.g. Campus Holiday Notice', prefixIcon: Icons.campaign_outlined),
                  const SizedBox(height: 12),
                  ClayTextField(controller: contentCtrl, label: 'Details', hintText: 'Type announcement...', maxLines: 4),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      if (titleCtrl.text.isEmpty || contentCtrl.text.isEmpty) return;
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.notices, body: {
                          'title': titleCtrl.text.trim(),
                          'content': contentCtrl.text.trim(),
                          'target_role': targetRole,
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Notice broadcasted!')));
                        _loadAllData();
                      } catch (_) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to post notice')));
                      }
                    },
                    text: 'Publish Notice',
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

  Future<void> _unlockRollNumber(int studentId, String studentName) async {
    try {
      await ApiClient.post('${ApiEndpoints.students}/$studentId/unlock-roll-number');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Roll number unlocked for $studentName')),
      );
      _loadAllData();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to unlock roll number')),
      );
    }
  }

  // --- Views for each Tab ---

  Widget _buildOverviewTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Greeting Card
          ClayCard(
            borderRadius: 24,
            padding: const EdgeInsets.all(20),
            gradient: const LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF4F46E5)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Welcome, Administrator',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                      child: const Text('PORTAL ACTIVE', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Manage departments, faculty staff, student enrolments, fee collections, and notices from one central console.',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Stats Grid (Clay Cards)
          Text('SYSTEM METRICS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.people_outline, color: AppColors.primary, size: 24),
                      const SizedBox(height: 12),
                      Text('${_teachers.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Faculty Members', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.school_outlined, color: AppColors.success, size: 24),
                      const SizedBox(height: 12),
                      Text('${_students.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Enrolled Students', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.business_outlined, color: AppColors.info, size: 24),
                      const SizedBox(height: 12),
                      Text('${_departments.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Departments', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.book_outlined, color: AppColors.warning, size: 24),
                      const SizedBox(height: 12),
                      Text('${_courses.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Active Courses', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Recent Notices
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('CAMPUS NOTICES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
              TextButton(
                onPressed: () => setState(() => _currentTabIndex = 4),
                child: const Text('View All', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          if (_notices.isEmpty) ...[
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(20),
              child: Center(child: Text('No notices published yet', style: TextStyle(color: theme.textSecondary, fontSize: 13))),
            ),
          ] else ...[
            ..._notices.take(3).map((notice) {
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
                            child: Text(
                              notice['title']?.toString() ?? '',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary),
                            ),
                          ),
                          ClayBadge(
                            text: (notice['target_role'] ?? 'ALL').toString().toUpperCase(),
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        notice['content']?.toString() ?? '',
                        style: TextStyle(fontSize: 13, color: theme.textSecondary),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  Widget _buildStaffTab(ClayTheme theme) {
    final filtered = _teachers.where((t) {
      final name = (t['name'] ?? '').toString().toLowerCase();
      final email = (t['email'] ?? '').toString().toLowerCase();
      final code = (t['teacher_code'] ?? '').toString().toLowerCase();
      final q = _teacherSearch.toLowerCase();
      return name.contains(q) || email.contains(q) || code.contains(q);
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              children: [
                Expanded(
                  child: ClayTextField(
                    controller: TextEditingController(text: _teacherSearch),
                    hintText: 'Search staff by name or code...',
                    prefixIcon: Icons.search,
                    onChanged: (val) => setState(() => _teacherSearch = val),
                  ),
                ),
                const SizedBox(width: 10),
                ClayButton(
                  onPressed: _showAddTeacherDialog,
                  icon: Icons.add,
                  text: 'Add',
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(child: Text('No faculty found', style: TextStyle(color: theme.textSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final item = filtered[i];
                      final teacherId = item['teacher_code']?.toString() ?? '';
                      final userId = item['user_id'] is int ? item['user_id'] : int.tryParse(item['user_id']?.toString() ?? '0') ?? 0;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ClayCard(
                          borderRadius: 20,
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: AppColors.primary.withOpacity(0.15),
                                    child: const Icon(Icons.person, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name']?.toString() ?? '',
                                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary),
                                        ),
                                        Text(
                                          item['email']?.toString() ?? '',
                                          style: TextStyle(fontSize: 12, color: theme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (teacherId.isNotEmpty)
                                    ClayBadge(
                                      text: teacherId,
                                      color: AppColors.info,
                                      icon: Icons.badge_outlined,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Dept: ${item['department'] ?? 'General'}',
                                    style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600),
                                  ),
                                  // Password Reset Action (Flow 2)
                                  InkWell(
                                    onTap: () {
                                      ResetPasswordModal.show(
                                        context,
                                        userId: userId,
                                        targetName: item['name']?.toString() ?? 'Faculty',
                                        targetRole: 'teacher',
                                        expectedIdentifier: teacherId,
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.key, size: 14, color: AppColors.primary),
                                          SizedBox(width: 4),
                                          Text('Reset Password', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildStudentsTab(ClayTheme theme) {
    final filtered = _students.where((s) {
      final name = (s['name'] ?? '').toString().toLowerCase();
      final email = (s['email'] ?? '').toString().toLowerCase();
      final roll = (s['roll_no'] ?? s['roll_number'] ?? '').toString().toLowerCase();
      final q = _studentSearch.toLowerCase();
      return name.contains(q) || email.contains(q) || roll.contains(q);
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              children: [
                Expanded(
                  child: ClayTextField(
                    controller: TextEditingController(text: _studentSearch),
                    hintText: 'Search by student name or roll...',
                    prefixIcon: Icons.search,
                    onChanged: (val) => setState(() => _studentSearch = val),
                  ),
                ),
                const SizedBox(width: 10),
                ClayButton(
                  onPressed: _showAddStudentDialog,
                  icon: Icons.add,
                  text: 'Add',
                  height: 48,
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                ),
              ],
            ),
          ),
          Expanded(
            child: filtered.isEmpty
                ? Center(child: Text('No students found', style: TextStyle(color: theme.textSecondary)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    itemCount: filtered.length,
                    itemBuilder: (ctx, i) {
                      final item = filtered[i];
                      final studentId = item['id'] is int ? item['id'] : int.tryParse(item['id']?.toString() ?? '0') ?? 0;
                      final userId = item['user_id'] is int ? item['user_id'] : int.tryParse(item['user_id']?.toString() ?? '0') ?? 0;
                      final rollNo = (item['roll_no'] ?? item['roll_number'] ?? '').toString();
                      final isRollLocked = item['roll_no_locked'] == 1 || item['roll_no_locked'] == true;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: ClayCard(
                          borderRadius: 20,
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  CircleAvatar(
                                    radius: 22,
                                    backgroundColor: AppColors.success.withOpacity(0.15),
                                    child: const Icon(Icons.school, color: AppColors.success),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          item['name']?.toString() ?? '',
                                          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary),
                                        ),
                                        Text(
                                          item['course']?.toString() ?? 'Enrolled Student',
                                          style: TextStyle(fontSize: 12, color: theme.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  if (rollNo.isNotEmpty)
                                    ClayBadge(
                                      text: rollNo,
                                      color: AppColors.primary,
                                      icon: Icons.tag,
                                    ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  // Unlock Roll Number Button if locked
                                  if (isRollLocked) ...[
                                    InkWell(
                                      onTap: () => _unlockRollNumber(studentId, item['name']?.toString() ?? ''),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: AppColors.warning.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Row(
                                          children: [
                                            Icon(Icons.lock_open, size: 13, color: AppColors.warning),
                                            SizedBox(width: 4),
                                            Text('Unlock Roll No', style: TextStyle(color: AppColors.warning, fontSize: 11, fontWeight: FontWeight.w700)),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ] else ...[
                                    Text('Roll No: ${rollNo.isEmpty ? "Pending" : "Set"}', style: TextStyle(fontSize: 11, color: theme.textSecondary)),
                                  ],

                                  // Reset Password (Flow 2)
                                  InkWell(
                                    onTap: () {
                                      ResetPasswordModal.show(
                                        context,
                                        userId: userId,
                                        targetName: item['name']?.toString() ?? 'Student',
                                        targetRole: 'student',
                                        expectedIdentifier: rollNo,
                                      );
                                    },
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.12),
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: const Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Icon(Icons.key, size: 14, color: AppColors.primary),
                                          SizedBox(width: 4),
                                          Text('Reset Password', style: TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w700)),
                                        ],
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAcademicsTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          Text('DEPARTMENTS (${_departments.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          ..._departments.map((dept) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ClayCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    const Icon(Icons.apartment, size: 20, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(dept['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 20),

          Text('COURSES (${_courses.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          ..._courses.map((course) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ClayCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    const Icon(Icons.menu_book, size: 20, color: AppColors.info),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(course['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                          Text('Duration: ${course['duration_years'] ?? 3} Years', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
          const SizedBox(height: 20),

          Text('FEE STRUCTURES (${_feeStructures.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          ..._feeStructures.map((fee) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: ClayCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(fee['course_name'] ?? fee['category'] ?? 'Tuition Fee', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                        Text(fee['category']?.toString() ?? '', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                      ],
                    ),
                    Text('₹${fee['amount'] ?? 0}', style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.success, fontSize: 16)),
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

  Widget _buildNoticesTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadAllData,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: ClayButton(
              onPressed: _showAddNoticeDialog,
              icon: Icons.campaign_outlined,
              text: 'Broadcast New Notice',
              width: double.infinity,
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              children: [
                Text('ACTIVE NOTICES (${_notices.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                ..._notices.map((n) {
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
                                child: Text(n['title']?.toString() ?? '', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.danger),
                                onPressed: () async {
                                  final id = n['id'];
                                  if (id != null) {
                                    try {
                                      await ApiClient.delete('${ApiEndpoints.notices}/$id');
                                      _loadAllData();
                                    } catch (_) {}
                                  }
                                },
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(n['content']?.toString() ?? '', style: TextStyle(fontSize: 13, color: theme.textSecondary)),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 20),

                Text('USER COMPLAINTS & FEEDBACK (${_complaints.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
                const SizedBox(height: 8),
                if (_complaints.isEmpty)
                  ClayCard(
                    borderRadius: 20,
                    padding: const EdgeInsets.all(16),
                    child: Center(child: Text('No complaints submitted', style: TextStyle(color: theme.textSecondary, fontSize: 13))),
                  )
                else
                  ..._complaints.map((c) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: ClayCard(
                        borderRadius: 18,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.feedback_outlined, size: 20, color: AppColors.warning),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c['title'] ?? c['subject'] ?? 'Feedback', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                                  const SizedBox(height: 4),
                                  Text(c['message'] ?? c['description'] ?? '', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                                ],
                              ),
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

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;

    final tabs = [
      _buildOverviewTab(theme),
      _buildStaffTab(theme),
      _buildStudentsTab(theme),
      _buildAcademicsTab(theme),
      _buildNoticesTab(theme),
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
                        Text('Admin Console', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: theme.textSecondary, letterSpacing: 0.5)),
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

              // Tab View
              Expanded(
                child: _loading && _teachers.isEmpty && _students.isEmpty
                    ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                    : tabs[_currentTabIndex],
              ),

              // Clay Bottom Navigation
              ClayBottomNav(
                currentIndex: _currentTabIndex,
                onTap: (idx) => setState(() => _currentTabIndex = idx),
                items: const [
                  ClayBottomNavItem(icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, label: 'Overview'),
                  ClayBottomNavItem(icon: Icons.people_outline, activeIcon: Icons.people, label: 'Staff'),
                  ClayBottomNavItem(icon: Icons.school_outlined, activeIcon: Icons.school, label: 'Students'),
                  ClayBottomNavItem(icon: Icons.menu_book_outlined, activeIcon: Icons.menu_book, label: 'Academic'),
                  ClayBottomNavItem(icon: Icons.campaign_outlined, activeIcon: Icons.campaign, label: 'Notices'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
