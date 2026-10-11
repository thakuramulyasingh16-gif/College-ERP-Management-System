import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../core/api/api_exception.dart';
import '../core/constants/app_colors.dart';
import '../core/theme/theme_provider.dart';
import 'clay_button.dart';
import 'clay_text_field.dart';

class ResetPasswordModal extends StatefulWidget {
  final int userId;
  final String targetName;
  final String targetRole; // 'teacher' or 'student'
  final String expectedIdentifier; // teacher_code or roll_no

  const ResetPasswordModal({
    super.key,
    required this.userId,
    required this.targetName,
    required this.targetRole,
    required this.expectedIdentifier,
  });

  static Future<bool?> show(
    BuildContext context, {
    required int userId,
    required String targetName,
    required String targetRole,
    required String expectedIdentifier,
  }) {
    return showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => ResetPasswordModal(
        userId: userId,
        targetName: targetName,
        targetRole: targetRole,
        expectedIdentifier: expectedIdentifier,
      ),
    );
  }

  @override
  State<ResetPasswordModal> createState() => _ResetPasswordModalState();
}

class _ResetPasswordModalState extends State<ResetPasswordModal> {
  int _step = 1; // 1: confirm identifier, 2: set new password
  final _idController = TextEditingController();
  final _newPassController = TextEditingController();
  final _confirmPassController = TextEditingController();

  bool _loading = false;
  String? _error;
  String? _success;

  @override
  void dispose() {
    _idController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  String get _idLabel => widget.targetRole == 'teacher' ? 'Teacher ID (Staff Code)' : 'Student Roll Number';

  void _verifyStep1() {
    final input = _idController.text.trim();
    if (input.isEmpty) {
      setState(() => _error = 'Please enter the $_idLabel');
      return;
    }

    if (input.toLowerCase() != widget.expectedIdentifier.trim().toLowerCase()) {
      setState(() => _error = 'Identity confirmation failed: $_idLabel does not match records.');
      return;
    }

    setState(() {
      _error = null;
      _step = 2;
    });
  }

  Future<void> _submitStep2() async {
    final newPass = _newPassController.text.trim();
    final confirmPass = _confirmPassController.text.trim();

    if (newPass.length < 8) {
      setState(() => _error = 'New password must be at least 8 characters long');
      return;
    }
    if (newPass != confirmPass) {
      setState(() => _error = 'Passwords do not match');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final res = await ApiClient.post(
        ApiEndpoints.resetPassword,
        body: {
          'userId': widget.userId,
          'newPassword': newPass,
          'confirmedIdentifier': _idController.text.trim(),
        },
      );

      final msg = (res is Map && res['message'] != null)
          ? res['message'].toString()
          : 'Password reset successfully!';

      setState(() {
        _success = msg;
      });

      await Future.delayed(const Duration(milliseconds: 1400));
      if (mounted) {
        Navigator.pop(context, true);
      }
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Failed to reset password. Network error.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = context.watch<ThemeProvider>().clayTheme;

    return AlertDialog(
      backgroundColor: theme.surfaceColor,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      titlePadding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      actionsPadding: const EdgeInsets.fromLTRB(24, 8, 24, 20),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.shield_outlined, color: AppColors.primary, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              _step == 1 ? 'Verify Identity' : 'Set New Password',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: theme.textPrimary,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Resetting password for ${widget.targetName} (${widget.targetRole.toUpperCase()})',
              style: TextStyle(
                fontSize: 13,
                color: theme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),

            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppColors.dangerLight.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 16, color: AppColors.danger),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_success != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: AppColors.successLight.withOpacity(0.8),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, size: 16, color: AppColors.success),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _success!,
                        style: const TextStyle(
                          color: AppColors.success,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_step == 1) ...[
              Text(
                'Security Check: Confirm the user\'s unique identifier before updating credentials.',
                style: TextStyle(fontSize: 12, color: theme.textSecondary),
              ),
              const SizedBox(height: 14),
              ClayTextField(
                controller: _idController,
                label: _idLabel,
                hintText: 'e.g. ${widget.expectedIdentifier.isNotEmpty ? widget.expectedIdentifier : "Enter identifier"}',
                prefixIcon: Icons.badge_outlined,
              ),
            ] else ...[
              ClayTextField(
                controller: _newPassController,
                label: 'New Password',
                hintText: 'At least 8 characters',
                prefixIcon: Icons.lock_reset,
                isPassword: true,
              ),
              const SizedBox(height: 14),
              ClayTextField(
                controller: _confirmPassController,
                label: 'Confirm New Password',
                hintText: 'Re-enter new password',
                prefixIcon: Icons.check_circle_outline,
                isPassword: true,
              ),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _loading ? null : () => Navigator.pop(context, false),
          child: Text('Cancel', style: TextStyle(color: theme.textSecondary)),
        ),
        ClayButton(
          onPressed: _loading ? null : (_step == 1 ? _verifyStep1 : _submitStep2),
          isLoading: _loading,
          height: 42,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          text: _step == 1 ? 'Verify & Continue' : 'Save Password',
        ),
      ],
    );
  }
}
