import 'dart:async';
import 'dart:convert';

import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/features/auth/session_repository.dart';
import 'package:bota_o_shape_student/features/onboarding/onboarding_choices.dart';
import 'package:flutter_test/flutter_test.dart';

String jwt(String id) => 'header.${base64Url.encode(utf8.encode(jsonEncode({'user_id': id})))}.signature';

void main() {
  test('rotates JWT once for concurrent 401s and persists the new pair', () async {
    final store = MemoryPrivateStore();
    final old = jwt('student');
    var rotations = 0;
    final gate = Completer<void>();
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: store,
      sender: (method, uri, headers, body) async {
        if (uri.path.endsWith('/token/')) return ApiResponse(200, {'access': old, 'refresh': 'old-refresh'});
        if (uri.path.endsWith('/refresh/')) {
          rotations++;
          await gate.future;
          return const ApiResponse(200, {'access': 'new-access', 'refresh': 'new-refresh'});
        }
        expect(headers['X-Tenant-ID'], 'academy-a');
        return headers['Authorization'] == 'Bearer new-access' ? const ApiResponse(200, []) : const ApiResponse(401, {});
      });
    await client.login('student@example.com', 'password');
    client.tenantId = 'academy-a';
    final first = client.list('api/workouts/sessions/');
    final second = client.list('api/workouts/sessions/');
    await Future<void>.delayed(Duration.zero);
    gate.complete();
    await Future.wait([first, second]);
    expect(rotations, 1);
    final stored = jsonDecode((await store.read('student.jwt.v1.https://api.example'))!) as Map<String, dynamic>;
    expect(stored['refresh'], 'new-refresh');
    expect(stored['access'], 'new-access');
  });

  test('API errors stay errors and never return demo data', () async {
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: MemoryPrivateStore(),
      sender: (_, uri, _, _) async => uri.path.endsWith('/token/')
          ? ApiResponse(200, {'access': jwt('student'), 'refresh': 'refresh'}) : const ApiResponse(503, {}));
    await client.login('student@example.com', 'password');
    client.tenantId = 'academy';
    final gateway = ApiStudentGateway(client: client, store: client.store,
      identity: const StudentIdentity(id: 'student', tenantId: 'academy', name: 'Aluno', academy: 'Academia'));
    expect(gateway.isDemo, isFalse);
    await expectLater(gateway.workouts(), throwsA(isA<ApiFailure>()));
  });

  test('a professional membership cannot enter the student app', () async {
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: MemoryPrivateStore(),
      sender: (_, uri, _, _) async {
        if (uri.path.endsWith('/token/')) return ApiResponse(200, {'access': jwt('coach'), 'refresh': 'r'});
        if (uri.path.endsWith('/tenants/')) return const ApiResponse(200, [{'id': 'academy', 'name': 'Academia'}]);
        return const ApiResponse(200, [{'user': 'coach', 'status': 'active', 'roles': ['coach', 'admin']}]);
      });
    final sessions = SessionRepository(client);
    final academies = await sessions.login('coach@example.com', 'password');
    await expectLater(sessions.activate(academies.single), throwsA(isA<ApiFailure>()));
    expect(client.tenantId, isNull);
  });

  test('pagination cannot send credentials to another origin', () async {
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: MemoryPrivateStore(),
      sender: (_, _, _, _) async => const ApiResponse(200, {'results': [], 'next': 'https://other.example/api/secrets/'}));
    await expectLater(client.list('api/workouts/sessions/'), throwsA(isA<ApiFailure>()));
  });

  test('consent edit revokes existing health grant without granting other purposes', () async {
    final writes = <Map<String, Object?>>[];
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: MemoryPrivateStore(),
      sender: (method, uri, _, body) async {
        if (method == 'GET') return const ApiResponse(200, [
          {'id': 'grant', 'subject': 'student', 'purpose': 'health_data', 'granted': true},
        ]);
        writes.add({'path': uri.path, 'body': body});
        return const ApiResponse(200, {});
      });
    final gateway = ApiStudentGateway(client: client, store: client.store,
      identity: const StudentIdentity(id: 'student', tenantId: 'academy', name: 'Aluno', academy: 'Academia'));
    client.tenantId = 'academy';
    await gateway.saveOnboarding(const OnboardingChoices());
    expect(writes.length, 1);
    expect(writes.single['path'], '/api/tenancy/consents/grant/revoke/');
    writes.clear();
    await gateway.saveOnboarding(const OnboardingChoices(skipped: true));
    expect(writes, isEmpty);
  });
}
