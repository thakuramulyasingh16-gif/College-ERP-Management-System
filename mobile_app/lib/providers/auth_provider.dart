import 'dart:async';
import 'package:flutter/foundation.dart';
import '../core/api/api_client.dart';
import '../core/api/api_endpoints.dart';
import '../core/api/api_exception.dart';
import '../core/security/secure_storage.dart';

class AuthProvider extends ChangeNotifier {
  Map<String, dynamic>? _user;
  String? _token;
  bool _isLoading = true;
  String? _errorMessage;
  String? _sessionInvalidatedMessage;

  // Rate limiting lockout timer
  int _lockoutSeconds = 0;
  Timer? _lockoutTimer;

  Map<String, dynamic>? get user => _user;
  String? get token => _token;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null && _token != null;
  String? get errorMessage => _errorMessage;
  String? get sessionInvalidatedMessage => _sessionInvalidatedMessage;
  int get lockoutSeconds => _lockoutSeconds;
  bool get isLockedOut => _lockoutSeconds > 0;

  String? get userRole => _user?['role']?.toString().toLowerCase();
  String? get userName => _user?['name']?.toString();
  String? get userEmail => _user?['email']?.toString();
  int? get userId {
    final id = _user?['id'];
    if (id is int) return id;
    if (id != null) return int.tryParse(id.toString());
    return null;
  }

  AuthProvider() {
    ApiClient.onSessionInvalidated = (msg) {
      _sessionInvalidatedMessage = msg;
      _user = null;
      _token = null;
      notifyListeners();
    };
    initAuth();
  }

  void clearSessionMessage() {
    _sessionInvalidatedMessage = null;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> initAuth() async {
    _isLoading = true;
    notifyListeners();

    try {
      final storedToken = await SecureStorageService.getToken();
      final storedUser = await SecureStorageService.getUser();

      if (storedToken == null || storedToken.isEmpty) {
        await SecureStorageService.clearAuth();
        _user = null;
        _token = null;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Verify active session with backend
      try {
        final res = await ApiClient.get(ApiEndpoints.verify);
        if (res is Map<String, dynamic> && res['valid'] == true && res['user'] != null) {
          _user = res['user'] as Map<String, dynamic>;
          _token = storedToken;
          await SecureStorageService.saveUser(_user!);
        } else {
          await SecureStorageService.clearAuth();
          _user = null;
          _token = null;
        }
      } catch (e) {
        if (e is ApiException && e.statusCode == 401) {
          // Handled by ApiClient onSessionInvalidated callback
          await SecureStorageService.clearAuth();
          _user = null;
          _token = null;
        } else {
          // If network error during boot, use cached session if exists, or require re-login
          _user = storedUser;
          _token = storedToken;
        }
      }
    } catch (_) {
      await SecureStorageService.clearAuth();
      _user = null;
      _token = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    if (_lockoutSeconds > 0) return false;

    _isLoading = true;
    _errorMessage = null;
    _sessionInvalidatedMessage = null;
    notifyListeners();

    final trimmedEmail = email.trim();
    final trimmedPassword = password.trim();

    try {
      final res = await ApiClient.post(
        ApiEndpoints.login,
        body: {
          'email': trimmedEmail,
          'password': trimmedPassword,
        },
      );

      if (res is Map<String, dynamic> && res['token'] != null && res['user'] != null) {
        _token = res['token'].toString();
        _user = res['user'] as Map<String, dynamic>;

        await SecureStorageService.saveToken(_token!);
        await SecureStorageService.saveUser(_user!);

        _stopLockoutTimer();
        _isLoading = false;
        notifyListeners();
        return true;
      } else {
        _errorMessage = 'Invalid response from server.';
      }
    } on ApiException catch (e) {
      if (e.statusCode == 429) {
        _startLockoutTimer(e.retryAfter ?? 60);
      } else {
        _errorMessage = e.message;
      }
    } catch (e) {
      _errorMessage = 'Network connection failed. Please check your internet.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  void _startLockoutTimer(int seconds) {
    _lockoutSeconds = seconds;
    _lockoutTimer?.cancel();
    _lockoutTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_lockoutSeconds <= 1) {
        _lockoutSeconds = 0;
        _errorMessage = null;
        timer.cancel();
      } else {
        _lockoutSeconds--;
      }
      notifyListeners();
    });
  }

  void _stopLockoutTimer() {
    _lockoutTimer?.cancel();
    _lockoutSeconds = 0;
  }

  Future<void> logout() async {
    try {
      await ApiClient.post(ApiEndpoints.logout);
    } catch (_) {
      // Ignore network errors on logout
    } finally {
      await SecureStorageService.clearAuth();
      _user = null;
      _token = null;
      _sessionInvalidatedMessage = null;
      notifyListeners();
    }
  }

  void updateUserData(Map<String, dynamic> updated) {
    _user = {...?_user, ...updated};
    SecureStorageService.saveUser(_user!);
    notifyListeners();
  }

  @override
  void dispose() {
    _lockoutTimer?.cancel();
    super.dispose();
  }
}
