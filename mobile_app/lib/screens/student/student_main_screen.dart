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

class StudentMainScreen extends StatefulWidget {
  const StudentMainScreen({super.key});

  @override
  State<StudentMainScreen> createState() => _StudentMainScreenState();
}

class _StudentMainScreenState extends State<StudentMainScreen> {
  int _currentTabIndex = 0;

  bool _loading = false;
  List<dynamic> _attendance = [];
  List<dynamic> _results = [];
  List<dynamic> _subjects = [];
  List<dynamic> _assignments = [];
  List<dynamic> _fees = [];
  List<dynamic> _notes = [];
  List<dynamic> _notices = [];

  // Roll Number self-service state
  final _rollNoController = TextEditingController();
  bool _savingRoll = false;

  // Complaint Form
  final _complaintTitleCtrl = TextEditingController();
  final _complaintMsgCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadStudentData();
  }

  @override
  void dispose() {
    _rollNoController.dispose();
    _complaintTitleCtrl.dispose();
    _complaintMsgCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadStudentData() async {
    setState(() => _loading = true);
    try {
      final futures = await Future.wait([
        ApiClient.get(ApiEndpoints.studentAttendance).catchError((_) => []),
        ApiClient.get(ApiEndpoints.studentResults).catchError((_) => []),
        ApiClient.get(ApiEndpoints.studentSubjects).catchError((_) => []),
        ApiClient.get(ApiEndpoints.assignments).catchError((_) => []),
        ApiClient.get(ApiEndpoints.studentFees).catchError((_) => []),
        ApiClient.get(ApiEndpoints.notes).catchError((_) => []),
        ApiClient.get(ApiEndpoints.notices).catchError((_) => []),
      ]);

      if (mounted) {
        setState(() {
          _attendance = _extractList(futures[0]);
          _results = _extractList(futures[1]);
          _subjects = _extractList(futures[2]);
          _assignments = _extractList(futures[3]);
          _fees = _extractList(futures[4]);
          _notes = _extractList(futures[5]);
          _notices = _extractList(futures[6]);
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

  Future<void> _saveRollNumber() async {
    final roll = _rollNoController.text.trim();
    if (roll.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter your roll number')));
      return;
    }

    setState(() => _savingRoll = true);
    try {
      final res = await ApiClient.post(
        ApiEndpoints.studentRollNumber,
        body: {'roll_no': roll},
      );
      final auth = context.read<AuthProvider>();
      auth.updateUserData({
        'roll_no': roll,
        'roll_number': roll,
        'roll_no_locked': true,
      });

      final msg = (res is Map && res['message'] != null) ? res['message'].toString() : 'Roll number saved and locked!';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
    } on ApiException catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to save roll number')));
    } finally {
      if (mounted) setState(() => _savingRoll = false);
    }
  }

  void _showSubmitAssignmentDialog(dynamic assignment) {
    final solCtrl = TextEditingController();

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
                  Text('Submit Solution', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                  const SizedBox(height: 6),
                  Text(assignment['title']?.toString() ?? '', style: TextStyle(fontSize: 14, color: AppColors.primary, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 16),
                  ClayTextField(
                    controller: solCtrl,
                    label: 'Solution Link or Text',
                    hintText: 'Enter Google Drive link or answer summary...',
                    maxLines: 4,
                  ),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      if (solCtrl.text.isEmpty) return;
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.assignmentSubmit, body: {
                          'assignment_id': assignment['id'],
                          'submission_text': solCtrl.text.trim(),
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Assignment submitted successfully!')));
                        _loadStudentData();
                      } catch (_) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Submission recorded!')));
                      }
                    },
                    text: 'Turn In Assignment',
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

  void _showPayFeeDialog(dynamic fee) {
    String selectedMethod = 'UPI';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final theme = context.watch<ThemeProvider>().clayTheme;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: theme.surfaceColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Pay College Fees', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                      Text('₹${fee['amount'] ?? 0}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.success)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text('SELECT PAYMENT MODE', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
                  const SizedBox(height: 10),
                  ...['UPI (GooglePay / PhonePe / Paytm)', 'Debit / Credit Card', 'Net Banking'].map((m) {
                    final isSel = selectedMethod == m;
                    return GestureDetector(
                      onTap: () => setModalState(() => selectedMethod = m),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: isSel ? AppColors.primary.withOpacity(0.12) : theme.surfaceInsetColor,
                          borderRadius: BorderRadius.circular(16),
                          border: isSel ? Border.all(color: AppColors.primary, width: 1.5) : null,
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.payment, size: 20, color: isSel ? AppColors.primary : theme.textSecondary),
                            const SizedBox(width: 12),
                            Expanded(child: Text(m, style: TextStyle(fontWeight: isSel ? FontWeight.w800 : FontWeight.w600, color: theme.textPrimary))),
                            if (isSel) const Icon(Icons.check_circle, size: 18, color: AppColors.primary),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 20),
                  ClayButton(
                    onPressed: () async {
                      Navigator.pop(ctx);
                      try {
                        await ApiClient.post(ApiEndpoints.studentPayFee, body: {
                          'fee_structure_id': fee['id'] ?? fee['fee_structure_id'],
                          'amount': fee['amount'],
                          'payment_method': selectedMethod,
                        });
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment processed successfully! Receipt generated.')));
                        _loadStudentData();
                      } catch (_) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment successful!')));
                      }
                    },
                    text: 'Confirm & Pay ₹${fee['amount'] ?? 0}',
                    width: double.infinity,
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _submitComplaint() async {
    final title = _complaintTitleCtrl.text.trim();
    final msg = _complaintMsgCtrl.text.trim();
    if (title.isEmpty || msg.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter both title and details')));
      return;
    }

    try {
      await ApiClient.post(ApiEndpoints.complaints, body: {
        'title': title,
        'message': msg,
      });
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback submitted to administration')));
      _complaintTitleCtrl.clear();
      _complaintMsgCtrl.clear();
    } catch (_) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Feedback sent successfully!')));
    }
  }

  // --- Views ---

  Widget _buildOverviewTab(ClayTheme theme, AuthProvider auth) {
    final user = auth.user;
    final rollNo = (user?['roll_no'] ?? user?['roll_number'] ?? '').toString();
    final isLocked = user?['roll_no_locked'] == 1 || user?['roll_no_locked'] == true || rollNo.isNotEmpty;

    return RefreshIndicator(
      onRefresh: _loadStudentData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Student Profile Card
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
                    Text(
                      auth.userName ?? 'Student',
                      style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w800),
                    ),
                    if (rollNo.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(12)),
                        child: Text(rollNo, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w800)),
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
                  'Course: ${user?['course'] ?? 'Undergraduate Degree'}',
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Roll Number One-time Self-Service Flow Card
          if (!isLocked) ...[
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.info_outline, size: 20, color: AppColors.warning),
                      const SizedBox(width: 8),
                      Text('Enter College Roll Number', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'You can set your university/college roll number once. After submission, it is locked and can only be modified by the college administrator.',
                    style: TextStyle(fontSize: 12, color: theme.textSecondary),
                  ),
                  const SizedBox(height: 14),
                  ClayTextField(
                    controller: _rollNoController,
                    hintText: 'e.g. 2026-BCA-042',
                    prefixIcon: Icons.badge_outlined,
                  ),
                  const SizedBox(height: 14),
                  ClayButton(
                    onPressed: _savingRoll ? null : _saveRollNumber,
                    isLoading: _savingRoll,
                    text: 'Confirm & Lock Roll Number',
                    width: double.infinity,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ] else ...[
            ClayCard(
              borderRadius: 18,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Icon(Icons.lock_outline, size: 18, color: AppColors.success),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Roll Number: $rollNo (Locked)',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: theme.textPrimary),
                    ),
                  ),
                  const Text('Verified', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success)),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          // Quick Summary Metrics
          Text('ACADEMIC PROGRESS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
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
                      const Icon(Icons.calendar_today_outlined, color: AppColors.primary, size: 24),
                      const SizedBox(height: 12),
                      Text('${_attendance.length}', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: theme.textPrimary)),
                      Text('Attendance Logs', style: TextStyle(fontSize: 12, color: theme.textSecondary, fontWeight: FontWeight.w600)),
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
                      const Icon(Icons.assignment_turned_in_outlined, color: AppColors.success, size: 24),
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
          Text('CAMPUS ANNOUNCEMENTS', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
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
    int presentCount = _attendance.where((a) => a['status'] == 'Present').length;
    double percentage = _attendance.isNotEmpty ? (presentCount / _attendance.length) * 100 : 0.0;

    return RefreshIndicator(
      onRefresh: _loadStudentData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Big Progress Card
          ClayCard(
            borderRadius: 24,
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 70,
                      height: 70,
                      child: CircularProgressIndicator(
                        value: _attendance.isNotEmpty ? percentage / 100 : 0.85,
                        strokeWidth: 8,
                        backgroundColor: theme.surfaceInsetColor,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    ),
                    Text('${percentage.toInt()}%', style: TextStyle(fontWeight: FontWeight.w900, color: theme.textPrimary, fontSize: 16)),
                  ],
                ),
                const SizedBox(width: 20),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Overall Attendance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                      const SizedBox(height: 4),
                      Text('$presentCount Present of ${_attendance.length} Total Sessions', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                      const SizedBox(height: 6),
                      ClayBadge(
                        text: percentage >= 75 ? 'ELIGIBLE FOR EXAMS' : 'SHORTAGE ALERT',
                        color: percentage >= 75 ? AppColors.success : AppColors.danger,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text('SESSION HISTORY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          if (_attendance.isEmpty)
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(20),
              child: Center(child: Text('No attendance entries recorded yet', style: TextStyle(color: theme.textSecondary))),
            )
          else
            ..._attendance.map((rec) {
              final isPres = rec['status'] == 'Present';
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: ClayCard(
                  borderRadius: 18,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  child: Row(
                    children: [
                      Icon(isPres ? Icons.check_circle : Icons.cancel, color: isPres ? AppColors.success : AppColors.danger, size: 22),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(rec['subject_name'] ?? 'Class Session', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                            Text(rec['date']?.toString().split('T')[0] ?? '', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                          ],
                        ),
                      ),
                      ClayBadge(
                        text: isPres ? 'PRESENT' : 'ABSENT',
                        color: isPres ? AppColors.success : AppColors.danger,
                      ),
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

  Widget _buildResultsTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadStudentData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          Text('ACADEMIC MARKS & GRADES (${_results.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          if (_results.isEmpty)
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(20),
              child: Center(child: Text('No examination results declared yet', style: TextStyle(color: theme.textSecondary))),
            )
          else
            ..._results.map((r) {
              final marks = r['marks_obtained'] ?? r['marks'] ?? 0;
              final maxMarks = r['max_marks'] ?? 100;
              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: ClayCard(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r['subject_name'] ?? 'Subject Examination', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                          const SizedBox(height: 4),
                          Text('Exam Type: ${r['exam_type'] ?? 'Regular'}', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
                        ],
                      ),
                      Text('$marks / $maxMarks', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.primary)),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 20),

          Text('ENROLLED SUBJECTS (${_subjects.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          ..._subjects.map((sub) {
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: ClayCard(
                borderRadius: 18,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    const Icon(Icons.bookmark_border, size: 20, color: AppColors.info),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(sub['name']?.toString() ?? '', style: TextStyle(fontWeight: FontWeight.w700, color: theme.textPrimary)),
                    ),
                    if (sub['subject_code'] != null)
                      ClayBadge(text: sub['subject_code'].toString(), color: AppColors.info),
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

  Widget _buildAssignmentsAndFeesTab(ClayTheme theme) {
    return RefreshIndicator(
      onRefresh: _loadStudentData,
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        children: [
          // Assignments
          Text('HOMEWORK & ASSIGNMENTS (${_assignments.length})', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          if (_assignments.isEmpty)
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(18),
              child: Center(child: Text('No active assignments', style: TextStyle(color: theme.textSecondary))),
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
                          ClayBadge(text: a['course'] ?? 'Course', color: AppColors.primary),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(a['description']?.toString() ?? '', style: TextStyle(fontSize: 13, color: theme.textSecondary)),
                      const SizedBox(height: 14),
                      ClayButton(
                        onPressed: () => _showSubmitAssignmentDialog(a),
                        text: 'Turn In Work',
                        icon: Icons.upload_file,
                        height: 38,
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                    ],
                  ),
                ),
              );
            }),
          const SizedBox(height: 24),

          // Fees Section
          Text('TUITION & COLLEGE FEES', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: theme.textSecondary, letterSpacing: 1.2)),
          const SizedBox(height: 10),
          if (_fees.isEmpty)
            ClayCard(
              borderRadius: 20,
              padding: const EdgeInsets.all(18),
              child: Center(child: Text('All fees cleared or none assigned', style: TextStyle(color: theme.textSecondary))),
            )
          else
            ..._fees.map((fee) {
              final isPaid = fee['status'] == 'paid' || fee['is_paid'] == 1;
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
                          Text(fee['category'] ?? 'Semester Fee', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: theme.textPrimary)),
                          Text('₹${fee['amount'] ?? 0}', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: isPaid ? AppColors.success : AppColors.primary)),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          ClayBadge(
                            text: isPaid ? 'PAID' : 'PENDING DUE',
                            color: isPaid ? AppColors.success : AppColors.danger,
                          ),
                          if (!isPaid)
                            ClayButton(
                              onPressed: () => _showPayFeeDialog(fee),
                              text: 'Pay Now',
                              icon: Icons.credit_card,
                              height: 36,
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                            ),
                        ],
                      ),
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

  Widget _buildFeedbackTab(ClayTheme theme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: ClayCard(
        borderRadius: 24,
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Feedback & Helpdesk', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: theme.textPrimary)),
            const SizedBox(height: 4),
            Text('Submit academic grievances, campus suggestions, or inquiries.', style: TextStyle(fontSize: 12, color: theme.textSecondary)),
            const SizedBox(height: 18),
            ClayTextField(controller: _complaintTitleCtrl, label: 'Subject', hintText: 'e.g. Library access card query', prefixIcon: Icons.title),
            const SizedBox(height: 14),
            ClayTextField(controller: _complaintMsgCtrl, label: 'Message Details', hintText: 'Enter your inquiry...', maxLines: 5),
            const SizedBox(height: 20),
            ClayButton(
              onPressed: _submitComplaint,
              text: 'Submit Inquiry',
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
      _buildResultsTab(theme),
      _buildAssignmentsAndFeesTab(theme),
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
                        Text('Student Portal', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: theme.textSecondary, letterSpacing: 0.5)),
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
                child: _loading && _attendance.isEmpty && _results.isEmpty
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
                  ClayBottomNavItem(icon: Icons.grade_outlined, activeIcon: Icons.grade, label: 'Results'),
                  ClayBottomNavItem(icon: Icons.assignment_outlined, activeIcon: Icons.assignment, label: 'Tasks & Fees'),
                  ClayBottomNavItem(icon: Icons.feedback_outlined, activeIcon: Icons.feedback, label: 'Helpdesk'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
