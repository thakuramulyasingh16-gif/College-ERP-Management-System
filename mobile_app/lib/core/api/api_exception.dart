class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  final int? retryAfter;
  final dynamic data;

  ApiException({
    required this.statusCode,
    required this.message,
    this.code,
    this.retryAfter,
    this.data,
  });

  @override
  String toString() => message;
}
