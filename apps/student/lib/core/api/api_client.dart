import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../storage/private_store.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, {this.status});
  final String message;
  final int? status;
  bool get isOffline => status == null;
  @override
  String toString() => message;
}

class ApiResponse {
  const ApiResponse(this.status, this.data);
  final int status;
  final Object? data;
}

typedef ApiSender = Future<ApiResponse> Function(
  String method, Uri uri, Map<String, String> headers, Object? body,
);

/// Native iOS/Android transport. No tokens in URLs, logs or build arguments.
class NativeApiSender {
  final HttpClient _client = HttpClient()..connectionTimeout = const Duration(seconds: 20);

  Future<ApiResponse> send(String method, Uri uri, Map<String, String> headers, Object? body) async {
    try {
      return await _send(method, uri, headers, body).timeout(const Duration(seconds: 30));
    } on SocketException {
      throw const ApiFailure('Sem conexão. Seus registros pendentes continuam neste aparelho.');
    } on TimeoutException {
      throw const ApiFailure('A conexão demorou. Tente novamente.');
    } on HandshakeException {
      throw const ApiFailure('Não foi possível validar a conexão segura.');
    } on HttpException {
      throw const ApiFailure('A conexão foi interrompida. Tente novamente.');
    }
  }

  Future<ApiResponse> _send(String method, Uri uri, Map<String, String> headers, Object? body) async {
    final request = await _client.openUrl(method, uri);
    request.followRedirects = false;
    headers.forEach(request.headers.set);
    if (body != null) request.write(jsonEncode(body));
    final response = await request.close();
    final text = await utf8.decoder.bind(response).join();
    Object? data;
    if (text.isNotEmpty) {
      try { data = jsonDecode(text); } on FormatException {
        throw ApiFailure('Resposta inválida da API.', status: response.statusCode);
      }
    }
    return ApiResponse(response.statusCode, data);
  }
}

class ApiClient {
  ApiClient({required this.baseUrl, required this.store, required this.sender});
  final Uri baseUrl;
  final PrivateStore store;
  final ApiSender sender;
  String? _access;
  String? _refresh;
  String? tenantId;
  Future<void>? _refreshing;
  String get _tokenKey => 'student.jwt.v1.${baseUrl.origin}';
  int _sessionGeneration = 0;

  Future<bool> restore() async {
    final raw = await store.read(_tokenKey);
    if (raw == null) return false;
    final tokens = jsonDecode(raw) as Map<String, dynamic>;
    _access = tokens['access'] as String;
    _refresh = tokens['refresh'] as String;
    return true;
  }

  String get userId {
    try {
      final part = _access!.split('.')[1];
      final claims = jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(part)))) as Map<String, dynamic>;
      return claims['user_id'] as String;
    } catch (_) {
      throw const ApiFailure('Identidade de sessão inválida. Entre novamente.', status: 401);
    }
  }

  Future<void> login(String email, String password) async {
    await clear();
    final data = await request('POST', 'api/user/auth/token/',
        body: {'email': email, 'password': password}, authenticated: false);
    await _saveTokens(data as Map<String, dynamic>);
  }

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    final access = data['access'] as String;
    final refresh = data['refresh'] as String? ?? _refresh;
    if (refresh == null) throw const ApiFailure('Sessão inválida.', status: 401);
    // Persist rotated pair together before any dependent request.
    await store.write(_tokenKey, jsonEncode({'access': access, 'refresh': refresh}));
    _access = access;
    _refresh = refresh;
  }

  Future<void> _rotate() async {
    final generation = _sessionGeneration;
    final refresh = _refresh;
    try {
      final response = await sender('POST', baseUrl.resolve('api/user/auth/token/refresh/'),
          {'Content-Type': 'application/json', 'Accept': 'application/json'}, {'refresh': refresh});
      if (generation != _sessionGeneration) throw const ApiFailure('A sessão mudou. Entre novamente.', status: 401);
      if (response.status != 200) {
        await clear();
        throw const ApiFailure('Sua sessão expirou. Entre novamente.', status: 401);
      }
      await _saveTokens(response.data as Map<String, dynamic>);
    } finally { _refreshing = null; }
  }

  Future<Object?> request(String method, String path, {Object? body, bool authenticated = true}) async {
    final scope = tenantId;
    final generation = _sessionGeneration;
    final sentAccess = _access;
    Future<ApiResponse> send() => sender(method, baseUrl.resolve(path), {
      'Content-Type': 'application/json', 'Accept': 'application/json',
      if (authenticated && _access != null) 'Authorization': 'Bearer $_access',
      if (authenticated && scope != null) 'X-Tenant-ID': scope,
    }, body);
    var response = await send();
    if (authenticated && generation != _sessionGeneration) {
      throw const ApiFailure('A sessão mudou. Entre novamente.', status: 401);
    }
    if (authenticated && response.status == 401 && _refresh != null) {
      // A concurrent request may already have rotated this same access token.
      if (_access == sentAccess) await (_refreshing ??= _rotate());
      if (tenantId != scope) throw const ApiFailure('A academia ativa mudou. Recarregue.', status: 409);
      response = await send();
    }
    if (authenticated && (generation != _sessionGeneration || tenantId != scope)) {
      throw const ApiFailure('A sessão ou academia ativa mudou. Recarregue.', status: 409);
    }
    if (response.status < 200 || response.status >= 300) {
      final message = switch (response.status) {
        400 => 'Confira os dados. A API não aceitou este registro.',
        401 => 'Sua sessão expirou. Entre novamente.',
        403 => 'Seu vínculo não permite este acesso na academia selecionada.',
        404 => 'Este conteúdo não está disponível.',
        409 => 'Há um conflito. Seu registro local foi preservado para revisão.',
        429 => 'Muitas tentativas. Aguarde um pouco e tente novamente.',
        _ => 'A API está indisponível. Tente novamente.',
      };
      throw ApiFailure(message, status: response.status);
    }
    return response.data;
  }

  Future<List<Map<String, dynamic>>> list(String path) async {
    final items = <Map<String, dynamic>>[];
    String? next = path;
    while (next != null) {
      final result = await request('GET', next);
      if (result is List) {
        items.addAll(result.cast<Map<String, dynamic>>());
        break;
      }
      final page = result! as Map<String, dynamic>;
      items.addAll((page['results'] as List<dynamic>).cast<Map<String, dynamic>>());
      final link = page['next'] as String?;
      if (link == null) break;
      final uri = baseUrl.resolve(link);
      if (uri.origin != baseUrl.origin || !uri.path.startsWith('/api/')) {
        throw const ApiFailure('Paginação inválida da API.', status: 502);
      }
      next = uri.toString();
    }
    return items;
  }

  Future<void> logout() async {
    try {
      if (_refresh != null) await request('POST', 'api/user/auth/token/revoke/',
          body: {'refresh': _refresh}, authenticated: false);
    } finally { await clear(); }
  }

  Future<void> clear() async {
    _sessionGeneration++;
    _access = null; _refresh = null; tenantId = null;
    await store.delete(_tokenKey);
  }
}
