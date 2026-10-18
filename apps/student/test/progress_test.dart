import 'package:bota_o_shape_student/features/progress/progress_models.dart';
import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/features/progress/progress_page.dart';
import 'package:bota_o_shape_student/core/data/student_health_repository.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'sides are translated and bioimpedance requires a complete device identity',
    () {
      expect(measurementSide('left'), 'Esquerdo');
      expect(measurementSide('right'), 'Direito');
      final value = <String, dynamic>{'method': 'bioimpedance'};
      for (final device in <Map<String, String>>[
        {},
        {'brand': 'A'},
        {'model': '1'},
        {'brand': 'A', 'model': ' '},
      ]) {
        expect(
          compatibleMeasurement(
            value,
            value,
            {'device': device},
            {'device': device},
          ),
          isFalse,
        );
      }
      final complete = <String, dynamic>{
        'device': {'brand': 'A', 'model': '1'},
      };
      expect(compatibleMeasurement(value, value, complete, complete), isTrue);
    },
  );
  Map<String, dynamic> measurement(String value) => {
    'metric': 'weight',
    'unit': 'kg',
    'raw_value': value,
    'side': '',
    'anatomical_site': '',
    'method': 'scale',
    'protocol': 'protocol-1',
    'origin': 'manual',
    'possible_error': false,
    'equation_metadata': <String, dynamic>{},
  };
  Map<String, dynamic> assessment(List<Map<String, dynamic>> values) => {
    'device': {'model': 'A'},
    'measurements': values,
  };

  test(
    'only matching protocol method site side unit origin device and equation compare',
    () {
      final current = measurement('72'), prior = measurement('70');
      final a = assessment([current]), b = assessment([prior]);
      final change = compareMeasurement(current, prior, a, b)!;
      expect(change.label, 'Aumentou');
      expect(change.difference, 2);
      expect(change.percent, closeTo(2 / 70 * 100, .0001));
      for (final key in [
        'protocol',
        'method',
        'anatomical_site',
        'side',
        'unit',
        'origin',
      ]) {
        expect(
          compareMeasurement(current, {...prior, key: 'different'}, a, b),
          isNull,
          reason: key,
        );
      }
      expect(
        compareMeasurement(current, prior, a, {
          ...b,
          'device': {'model': 'B'},
        }),
        isNull,
      );
      expect(
        compareMeasurement(current, prior, a, {
          ...b,
          'preparation_conditions': {'recent_exercise': true},
        }),
        isNull,
      );
      expect(
        compareMeasurement(
          current,
          {
            ...prior,
            'equation_metadata': {'equation': 'other'},
          },
          a,
          b,
        ),
        isNull,
      );
      expect(
        compareMeasurement(current, {...prior, 'possible_error': true}, a, b),
        isNull,
      );
    },
  );
  test(
    'zero baseline has no percent and metric gaps remain null rather than zero',
    () {
      final current = measurement('72'), prior = measurement('0');
      final selected = assessment([current]);
      expect(
        compareMeasurement(
          current,
          prior,
          selected,
          assessment([prior]),
        )!.percent,
        isNull,
      );
      expect(
        metricSeries(
          [
            assessment([prior]),
            assessment([]),
            assessment([
              {...current, 'unit': 'lb'},
            ]),
            selected,
          ],
          current,
          selected,
        ),
        [0, null, null, 72],
      );
    },
  );
  testWidgets(
    'assessment report has method units conditions and honest missing evaluator',
    (tester) async {
      final a = {
        ...assessment([measurement('72')]),
        'assessed_at': '2026-10-17T10:00:00Z',
        'preparation_conditions': {'time': 'morning'},
        'notes': 'Nota profissional',
      };
      await tester.pumpWidget(
        MaterialApp(
          home: AssessmentReportPage(
            assessment: a,
            report: {
              'professional_interpretation': 'Interpretação profissional',
            },
            assessments: [a],
          ),
        ),
      );
      expect(find.textContaining('Avaliador: não informado'), findsOneWidget);
      expect(find.textContaining('72 kg'), findsOneWidget);
      expect(find.textContaining('morning'), findsOneWidget);
      await tester.ensureVisible(find.textContaining('Sem comparação direta'));
      expect(find.textContaining('Sem comparação direta'), findsOneWidget);
    },
  );
  testWidgets(
    'demo progress exposes chart table and preserves the missing sample',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ProgressPage(
              repository: StudentHealthRepository(
                gateway: DemoStudentGateway(),
                store: MemoryPrivateStore(),
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Tudo'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Tabela acessível de valores'));
      expect(find.text('01/10/2026 | Lacuna | kg'), findsOneWidget);
    },
  );
  test(
    'only own released assessments are exposed and an unreleased report is refused',
    () async {
      final store = MemoryPrivateStore();
      final client = ApiClient(
        baseUrl: Uri.parse('https://api.example/'),
        store: store,
        sender: (method, uri, headers, body) async {
          if (uri.path == '/api/tenancy/memberships/') {
            return const ApiResponse(200, [
              {
                'user': 'u',
                'status': 'active',
                'roles': ['student'],
              },
            ]);
          }
          if (uri.path.endsWith('/report/')) {
            return const ApiResponse(200, {
              'assessment': 'own',
              'released_to_student': false,
            });
          }
          return const ApiResponse(200, [
            {
              'id': 'own',
              'student': 'u',
              'status': 'released',
              'assessed_at': '2026-10-17T00:00:00Z',
            },
            {
              'id': 'draft',
              'student': 'u',
              'status': 'draft',
              'assessed_at': '2026-10-17T00:00:00Z',
            },
            {
              'id': 'foreign',
              'student': 'other',
              'status': 'released',
              'assessed_at': '2026-10-17T00:00:00Z',
            },
          ]);
        },
      )..tenantId = 't';
      final repo = StudentHealthRepository(
        gateway: ApiStudentGateway(
          client: client,
          store: store,
          identity: const StudentIdentity(
            id: 'u',
            tenantId: 't',
            name: 'A',
            academy: 'B',
          ),
        ),
        store: store,
      );
      expect((await repo.assessments()).map((a) => a['id']), ['own']);
      await expectLater(
        repo.assessmentReport('own'),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        repo.assessmentReport('foreign'),
        throwsA(isA<ApiFailure>()),
      );
    },
  );
}
