import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class PrivateStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

/// Tokens, assigned-workout cache and pending logs use platform encrypted storage.
class SecurePrivateStore implements PrivateStore {
  const SecurePrivateStore();
  static const _storage = FlutterSecureStorage();

  @override
  Future<String?> read(String key) => _storage.read(key: key);
  @override
  Future<void> write(String key, String value) => _storage.write(key: key, value: value);
  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

/// Explicitly injected by tests and demo mode; never used for API sessions.
class MemoryPrivateStore implements PrivateStore {
  final Map<String, String> _values = {};
  @override
  Future<String?> read(String key) async => _values[key];
  @override
  Future<void> write(String key, String value) async { _values[key] = value; }
  @override
  Future<void> delete(String key) async { _values.remove(key); }
}
