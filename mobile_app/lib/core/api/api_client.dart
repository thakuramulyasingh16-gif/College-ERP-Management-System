import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../security/secure_storage.dart';
import 'api_exception.dart';

class ApiClient {
  static void Function(String message)? onSessionInvalidated;

  static void _assertHttps(String url) {
    if (!url.toLowerCase().startsWith('https://')) {
      throw ApiException(
        statusCode: 400,
        message: 'Security Violation: Only secure HTTPS connections are allowed.',
      );
    }
  }

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final token = await SecureStorageService.getToken();
    final headers = <String, String>{
      'Accept': 'application/json',
    };
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  static void _log(String method, String url, [int? status]) {
    if (kDebugMode) {
      debugPrint('[API $method] $url ${status != null ? "-> $status" : ""}');
    }
  }

  static Future<dynamic> get(String url) async {
    _assertHttps(url);
    _log('GET', url);
    final headers = await _getHeaders();
    final response = await http.get(Uri.parse(url), headers: headers);
    return _handleResponse(response, url);
  }

  static Future<dynamic> post(String url, {dynamic body}) async {
    _assertHttps(url);
    _log('POST', url);
    final headers = await _getHeaders();
    final encodedBody = body != null ? jsonEncode(body) : null;
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: encodedBody,
    );
    return _handleResponse(response, url);
  }

  static Future<dynamic> put(String url, {dynamic body}) async {
    _assertHttps(url);
    _log('PUT', url);
    final headers = await _getHeaders();
    final encodedBody = body != null ? jsonEncode(body) : null;
    final response = await http.put(
      Uri.parse(url),
      headers: headers,
      body: encodedBody,
    );
    return _handleResponse(response, url);
  }

  static Future<dynamic> delete(String url) async {
    _assertHttps(url);
    _log('DELETE', url);
    final headers = await _getHeaders();
    final response = await http.delete(Uri.parse(url), headers: headers);
    return _handleResponse(response, url);
  }

  static dynamic _handleResponse(http.Response response, String url) {
    _log('RESP', url, response.statusCode);

    dynamic bodyData;
    try {
      bodyData = jsonDecode(response.body);
    } catch (_) {
      bodyData = response.body;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return bodyData;
    }

    // Handle 401 Unauthorized / SESSION_INVALIDATED
    if (response.statusCode == 401) {
      String? code;
      String message = 'Session expired. Please log in again.';

      if (bodyData is Map<String, dynamic>) {
        code = bodyData['code'] as String?;
        if (bodyData['message'] != null) {
          message = bodyData['message'].toString();
        }
      }

      if (code == 'SESSION_INVALIDATED') {
        message = bodyData is Map && bodyData['message'] != null
            ? bodyData['message'].toString()
            : 'You have been logged out because your account was signed in from another device.';
      }

      // Clear local auth securely
      SecureStorageService.clearAuth();
      onSessionInvalidated?.call(message);

      throw ApiException(
        statusCode: 401,
        message: message,
        code: code,
        data: bodyData,
      );
    }

    // Handle 429 Too Many Requests (Rate limit lockout)
    if (response.statusCode == 429) {
      int retrySeconds = 60;
      final retryHeader = response.headers['retry-after'];
      if (retryHeader != null) {
        final parsed = int.tryParse(retryHeader);
        if (parsed != null && parsed > 0) retrySeconds = parsed;
      }
      if (bodyData is Map<String, dynamic> && bodyData['retryAfter'] != null) {
        final parsed = int.tryParse(bodyData['retryAfter'].toString());
        if (parsed != null && parsed > 0) retrySeconds = parsed;
      }

      throw ApiException(
        statusCode: 429,
        message: bodyData is Map && bodyData['message'] != null
            ? bodyData['message'].toString()
            : 'Too many attempts. Please try again later.',
        retryAfter: retrySeconds,
        data: bodyData,
      );
    }

    // Other error statuses
    String errMsg = 'Request failed with status ${response.statusCode}';
    if (bodyData is Map<String, dynamic> && bodyData['message'] != null) {
      errMsg = bodyData['message'].toString();
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: errMsg,
      data: bodyData,
    );
  }
}
