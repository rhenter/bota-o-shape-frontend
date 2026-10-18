import 'dart:async';
import 'dart:convert';

import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/features/auth/session_repository.dart';
import 'package:bota_o_shape_student/features/onboarding/onboarding_choices.dart';
import 'package:bota_o_shape_student/features/workouts/workout_models.dart';
import 'package:flutter_test/flutter_test.dart';

String jwt(String id) =>
    'header.${base64Url.encode(utf8.encode(jsonEncode({'user_id': id})))}.signature';

void main() {
  test(
    'rotates JWT once for concurrent 401s and persists the new pair',
    () async {
      final store = MemoryPrivateStore();
      final old = jwt('student');
      var rotations = 0;
      final gate = Completer<void>();
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: store,
        sender: (method, uri, headers, body) async {
          if (uri.path.endsWith('/token/')) {
            return ApiResponse(200, {'access': old, 'refresh': 'old-refresh'});
          }
          if (uri.path.endsWith('/refresh/')) {
            rotations++;
            await gate.future;
            return const ApiResponse(200, {
              'access': 'new-access',
              'refresh': 'new-refresh',
            });
          }
          expect(headers['X-Tenant-ID'], 'academy-a');
          return headers['Authorization'] == 'Bearer new-access'
              ? const ApiResponse(200, [])
              : const ApiResponse(401, {});
        },
      );
      await client.login('student@example.com', 'password');
      client.tenantId = 'academy-a';
      final first = client.list('api/workouts/sessions/');
      final second = client.list('api/workouts/sessions/');
      await Future<void>.delayed(Duration.zero);
      gate.complete();
      await Future.wait([first, second]);
      expect(rotations, 1);
      final stored =
          jsonDecode((await store.read('student.jwt.v1.https://api.example'))!)
              as Map<String, dynamic>;
      expect(stored['refresh'], 'new-refresh');
      expect(stored['access'], 'new-access');
    },
  );

  test('API errors stay errors and never return demo data', () async {
    final client = ApiClient(
      baseUrl: Uri.parse('https://api.example/'),
      store: MemoryPrivateStore(),
      sender: (_, uri, _, _) async => uri.path.endsWith('/token/')
          ? ApiResponse(200, {'access': jwt('student'), 'refresh': 'refresh'})
          : const ApiResponse(503, {}),
    );
    await client.login('student@example.com', 'password');
    client.tenantId = 'academy';
    final gateway = ApiStudentGateway(
      client: client,
      store: client.store,
      identity: const StudentIdentity(
        id: 'student',
        tenantId: 'academy',
        name: 'Aluno',
        academy: 'Academia',
      ),
    );
    expect(gateway.isDemo, isFalse);
    await expectLater(gateway.workouts(), throwsA(isA<ApiFailure>()));
  });

  test('a professional membership cannot enter the student app', () async {
    final client = ApiClient(
      baseUrl: Uri.parse('https://api.example/'),
      store: MemoryPrivateStore(),
      sender: (_, uri, _, _) async {
        if (uri.path.endsWith('/token/')) {
          return ApiResponse(200, {'access': jwt('coach'), 'refresh': 'r'});
        }
        if (uri.path.endsWith('/tenants/')) {
          return const ApiResponse(200, [
            {'id': 'academy', 'name': 'Academia'},
          ]);
        }
        return const ApiResponse(200, [
          {
            'user': 'coach',
            'status': 'active',
            'roles': ['coach', 'admin'],
          },
        ]);
      },
    );
    final sessions = SessionRepository(client);
    final academies = await sessions.login('coach@example.com', 'password');
    await expectLater(
      sessions.activate(academies.single),
      throwsA(isA<ApiFailure>()),
    );
    expect(client.tenantId, isNull);
  });

  test('pagination cannot send credentials to another origin', () async {
    final client = ApiClient(
      baseUrl: Uri.parse('https://api.example/'),
      store: MemoryPrivateStore(),
      sender: (_, _, _, _) async => const ApiResponse(200, {
        'results': <dynamic>[],
        'next': 'https://other.example/api/secrets/',
      }),
    );
    await expectLater(
      client.list('api/workouts/sessions/'),
      throwsA(isA<ApiFailure>()),
    );
  });

  test(
    'consent edit revokes existing health grant without granting other purposes',
    () async {
      final writes = <Map<String, Object?>>[];
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: MemoryPrivateStore(),
        sender: (method, uri, _, body) async {
          if (method == 'GET') {
            return const ApiResponse(200, [
              {
                'id': 'grant',
                'subject': 'student',
                'purpose': 'health_data',
                'granted': true,
              },
            ]);
          }
          writes.add({'path': uri.path, 'body': body});
          return const ApiResponse(200, {});
        },
      );
      final gateway = ApiStudentGateway(
        client: client,
        store: client.store,
        identity: const StudentIdentity(
          id: 'student',
          tenantId: 'academy',
          name: 'Aluno',
          academy: 'Academia',
        ),
      );
      client.tenantId = 'academy';
      await gateway.saveOnboarding(
        const OnboardingChoices(changedConsentPurposes: {'health_data'}),
      );
      expect(writes.length, 1);
      expect(writes.single['path'], '/api/tenancy/consents/grant/revoke/');
      writes.clear();
      await gateway.saveOnboarding(const OnboardingChoices(skipped: true));
      expect(writes, isEmpty);
    },
  );

  test(
    'failed academy discovery and activation preserve the prior tenant for pending sync',
    () async {
      var failAcademies = false;
      final sentTenants = <String?>[];
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: MemoryPrivateStore(),
        sender: (method, uri, headers, body) async {
          if (uri.path.endsWith('/token/')) {
            return ApiResponse(200, {'access': jwt('student'), 'refresh': 'r'});
          }
          if (uri.path.endsWith('/tenants/')) {
            if (failAcademies) throw const ApiFailure('Sem conexão.');
            return const ApiResponse(200, [
              {'id': 'academy-a', 'name': 'Academia A'},
            ]);
          }
          if (uri.path.endsWith('/memberships/')) {
            if (headers['X-Tenant-ID'] == 'academy-b') {
              return const ApiResponse(403, {});
            }
            return const ApiResponse(200, [
              {
                'user': 'student',
                'status': 'active',
                'roles': ['student'],
              },
            ]);
          }
          if (method == 'POST' && uri.path.endsWith('/sessions/')) {
            sentTenants.add(headers['X-Tenant-ID']);
            return ApiResponse(201, body);
          }
          return const ApiResponse(200, []);
        },
      );
      final sessions = SessionRepository(client);
      await sessions.login('student@example.com', 'password');
      client.tenantId = 'academy-a';
      final gateway = ApiStudentGateway(
        client: client,
        store: client.store,
        identity: const StudentIdentity(
          id: 'student',
          tenantId: 'academy-a',
          name: 'Aluno',
          academy: 'Academia A',
        ),
      );
      failAcademies = true;
      await expectLater(sessions.academies(), throwsA(isA<ApiFailure>()));
      expect(client.tenantId, 'academy-a');
      await expectLater(
        sessions.activate(const AcademyAccess('academy-b', 'Academia B')),
        throwsA(isA<ApiFailure>()),
      );
      expect(client.tenantId, 'academy-a');
      final pending = PendingWorkout(
        payload: {'idempotency_key': 'same-key', 'exercise_logs': <dynamic>[]},
      );
      await gateway.submit(pending);
      expect(sentTenants, ['academy-a']);
      client.tenantId = 'academy-b';
      await expectLater(gateway.submit(pending), throwsA(isA<ApiFailure>()));
      expect(sentTenants, ['academy-a']);
    },
  );

  test(
    'new device loads server grants and untouched Continue never revokes them',
    () async {
      final writes = <String>[];
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: MemoryPrivateStore(),
        sender: (method, uri, _, _) async {
          if (method == 'GET') {
            return const ApiResponse(200, [
              {
                'id': 'existing',
                'subject': 'student',
                'purpose': 'health_data',
                'granted': true,
              },
            ]);
          }
          writes.add(uri.path);
          return const ApiResponse(200, {});
        },
      );
      client.tenantId = 'academy';
      final gateway = ApiStudentGateway(
        client: client,
        store: client.store,
        identity: const StudentIdentity(
          id: 'student',
          tenantId: 'academy',
          name: 'Aluno',
          academy: 'Academia',
        ),
      );
      final choices = (await gateway.onboarding())!;
      expect(choices.completed, isFalse);
      expect(choices.consents['health_data'], isTrue);
      expect(choices.changedConsentPurposes, isEmpty);
      await gateway.saveOnboarding(choices);
      expect(writes, isEmpty);
      expect((await gateway.onboarding())!.completed, isTrue);
      // Even an out-of-date untouched local value cannot revoke a server grant.
      await gateway.saveOnboarding(const OnboardingChoices());
      expect(writes, isEmpty);
    },
  );
}
