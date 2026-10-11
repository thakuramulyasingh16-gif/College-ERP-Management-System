import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/constants/app_colors.dart';
import 'core/theme/theme_provider.dart';
import 'providers/auth_provider.dart';
import 'screens/admin/admin_main_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/student/student_main_screen.dart';
import 'screens/teacher/teacher_main_screen.dart';
import 'widgets/clay_container.dart';
import 'widgets/mobile_device_preview.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CollegeErpApp());
}

class CollegeErpApp extends StatelessWidget {
  const CollegeErpApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, _) {
          return MaterialApp(
            title: 'College ERP Mobile',
            debugShowCheckedModeBanner: false,
            theme: themeProvider.clayTheme.themeData,
            home: const MobileDevicePreview(
              child: AppRootRouter(),
            ),
          );
        },
      ),
    );
  }
}

class AppRootRouter extends StatelessWidget {
  const AppRootRouter({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final theme = context.watch<ThemeProvider>().clayTheme;

    if (auth.isLoading) {
      return Scaffold(
        body: Container(
          decoration: BoxDecoration(gradient: theme.bgGradient),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 90,
                  height: 90,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.35),
                      width: 2.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.25),
                        blurRadius: 20,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/logo.png',
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(Icons.school, size: 48, color: AppColors.primary),
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  'CGC ERP',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: theme.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'City Group of Colleges',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: theme.textSecondary,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 28),
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    final role = auth.userRole;
    if (role == 'admin') {
      return const AdminMainScreen();
    } else if (role == 'teacher') {
      return const TeacherMainScreen();
    } else if (role == 'student') {
      return const StudentMainScreen();
    }

    return const LoginScreen();
  }
}
