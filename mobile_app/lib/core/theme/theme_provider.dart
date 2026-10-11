import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'clay_theme.dart';

class ThemeProvider extends ChangeNotifier {
  static const String _prefKey = 'app_theme_mode_dark';
  bool _isDark = true;
  bool _isInitialized = false;

  bool get isDark => _isDark;
  bool get isInitialized => _isInitialized;
  ClayTheme get clayTheme => ClayTheme(isDark: _isDark);

  ThemeProvider() {
    _loadFromPrefs();
  }

  Future<void> _loadFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      _isDark = prefs.getBool(_prefKey) ?? true;
    } catch (_) {
      _isDark = true;
    } finally {
      _isInitialized = true;
      notifyListeners();
    }
  }

  Future<void> toggleTheme() async {
    _isDark = !_isDark;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKey, _isDark);
    } catch (_) {}
  }

  Future<void> setDark(bool value) async {
    if (_isDark == value) return;
    _isDark = value;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_prefKey, _isDark);
    } catch (_) {}
  }
}
