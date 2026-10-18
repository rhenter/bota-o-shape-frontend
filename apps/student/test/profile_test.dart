import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/data/student_health_repository.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/features/onboarding/onboarding_choices.dart';
import 'package:bota_o_shape_student/features/profile/privacy_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'privacy drafts explain requests and retention without claiming execution',
    () {
      expect(
        privacyRequestDraft('export', 'Academia A'),
        contains('exportação'),
      );
      expect(privacyRequestDraft('delete', 'Academia A'), contains('retenção'));
      expect(
        privacyRequestDraft('delete', 'Academia A'),
        contains('orientação para exclusão'),
      );
      expect(const OnboardingChoices().consents['nutrition_plan'], isFalse);
    },
  );
  testWidgets('export is saved locally and logout remains available', (
    tester,
  ) async {
    final store = MemoryPrivateStore(), gateway = DemoStudentGateway();
    var loggedOut = false, preferences = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: PrivacyPage(
            repository: StudentHealthRepository(gateway: gateway, store: store),
            onPreferences: () async {
              preferences = true;
            },
            onLogout: () async {
              loggedOut = true;
            },
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Consentimentos e preferências'));
    expect(preferences, isTrue);
    await tester.ensureVisible(find.text('Preparar pedido de exportação'));
    await tester.tap(find.text('Preparar pedido de exportação'));
    await tester.pumpAndSettle();
    expect(
      await store.read(
        'student.privacy.request.v1.${gateway.storageNamespace}',
      ),
      contains('exportação'),
    );
    await tester.scrollUntilVisible(
      find.text('Rascunho local · ainda não enviado'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Rascunho local · ainda não enviado'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Sair'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Sair'));
    expect(loggedOut, isTrue);
  });
  test(
    'nutrition plan consent is independent and revokes only its own server record',
    () async {
      final calls = <String>[];
      final store = MemoryPrivateStore();
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: store,
        sender: (method, uri, headers, body) async {
          calls.add('$method ${uri.path}');
          if (method == 'GET') {
            return const ApiResponse(200, [
              {
                'id': 'plan-consent',
                'subject': 'u',
                'purpose': 'nutrition_plan',
                'granted': true,
              },
              {
                'id': 'health-consent',
                'subject': 'u',
                'purpose': 'health_data',
                'granted': true,
              },
            ]);
          }
          return const ApiResponse(200, {});
        },
      )..tenantId = 't';
      final gateway = ApiStudentGateway(
        client: client,
        store: store,
        identity: const StudentIdentity(
          id: 'u',
          tenantId: 't',
          name: 'A',
          academy: 'B',
        ),
      );
      final initial = await gateway.onboarding();
      expect(initial!.consents['nutrition_plan'], isTrue);
      expect(initial.consents['health_data'], isTrue);
      await gateway.saveOnboarding(
        OnboardingChoices(
          consents: {...initial.consents, 'nutrition_plan': false},
          changedConsentPurposes: {'nutrition_plan'},
        ),
      );
      expect(calls.where((c) => c.startsWith('POST')), [
        'POST /api/tenancy/consents/plan-consent/revoke/',
      ]);
    },
  );
  test(
    'local nutrition records are isolated by account and tenant namespace',
    () async {
      final store = MemoryPrivateStore();
      final a = StudentHealthRepository(
        gateway: DemoStudentGateway(),
        store: store,
      );
      await a.draft('meal-logs', {'description': 'Private'});
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: store,
        sender: (_, _, _, _) async => const ApiResponse(200, []),
      );
      final b = StudentHealthRepository(
        gateway: ApiStudentGateway(
          client: client,
          store: store,
          identity: const StudentIdentity(
            id: 'other',
            tenantId: 't',
            name: 'B',
            academy: 'B',
          ),
        ),
        store: store,
      );
      await b.restore();
      expect(b.intents, isEmpty);
    },
  );
}
