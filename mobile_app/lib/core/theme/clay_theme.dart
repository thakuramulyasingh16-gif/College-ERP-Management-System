import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../constants/app_colors.dart';

class ClayTheme {
  final bool isDark;

  const ClayTheme({required this.isDark});

  Color get surfaceColor => isDark ? AppColors.darkSurface : AppColors.lightSurface;
  Color get surfaceInsetColor => isDark ? AppColors.darkSurfaceInset : AppColors.lightSurfaceInset;
  Color get shadowDark => isDark ? AppColors.darkShadowDark : AppColors.lightShadowDark;
  Color get shadowLight => isDark ? AppColors.darkShadowLight : AppColors.lightShadowLight;
  Color get textPrimary => isDark ? AppColors.darkText : AppColors.lightText;
  Color get textSecondary => isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

  LinearGradient get bgGradient => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: isDark
            ? [AppColors.darkBgStart, AppColors.darkBgEnd]
            : [AppColors.lightBgStart, AppColors.lightBgEnd],
      );

  ThemeData get themeData {
    final textTheme = GoogleFonts.interTextTheme(
      isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: isDark ? Brightness.dark : Brightness.light,
      scaffoldBackgroundColor: isDark ? AppColors.darkBgStart : AppColors.lightBgStart,
      primaryColor: AppColors.primary,
      colorScheme: ColorScheme.fromSeed(
        seedColor: AppColors.primary,
        brightness: isDark ? Brightness.dark : Brightness.light,
        primary: AppColors.primary,
        surface: surfaceColor,
      ),
      textTheme: textTheme.copyWith(
        titleLarge: textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.w800,
          color: textPrimary,
          letterSpacing: -0.5,
        ),
        titleMedium: textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: textPrimary,
        ),
        bodyLarge: textTheme.bodyLarge?.copyWith(
          color: textPrimary,
        ),
        bodyMedium: textTheme.bodyMedium?.copyWith(
          color: textSecondary,
        ),
      ),
    );
  }
}
