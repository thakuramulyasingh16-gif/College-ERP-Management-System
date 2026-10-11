import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class ScreenSecurity {
  static const MethodChannel _channel = MethodChannel('com.collegeerp.app/security');

  /// Enable FLAG_SECURE to prevent screenshot / screen recording on sensitive screens
  static Future<void> enableSecureScreen() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('enableSecure');
    } catch (_) {
      // Ignored if platform channel is not registered in desktop/debug
    }
  }

  /// Disable FLAG_SECURE when navigating away from sensitive screens
  static Future<void> disableSecureScreen() async {
    if (kIsWeb) return;
    try {
      await _channel.invokeMethod('disableSecure');
    } catch (_) {
      // Ignored if platform channel is not registered
    }
  }
}
