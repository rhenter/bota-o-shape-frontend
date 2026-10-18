import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/features/home/student_shell.dart';
import 'package:bota_o_shape_student/features/workouts/rest_timer.dart';
import 'package:bota_o_shape_student/features/workouts/workout_controller.dart';
import 'package:bota_o_shape_student/features/workouts/workout_pages.dart';
import 'package:bota_o_shape_student/features/workouts/workout_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final action in ['skip', 'substitute']) {
    testWidgets('$action clears the displayed saved series and input values', (
      tester,
    ) async {
      final plan = (await DemoStudentGateway().workouts()).first;
      final flow = WorkoutController(plan: plan);
      flow.record(0, plan.exercises.first.sets.first, {
        'load_kg': 12.5,
        'repetitions': 10,
      });
      await tester.pumpWidget(
        MaterialApp(home: SetsPage(flow: flow, exerciseIndex: 0)),
      );
      expect(find.text('Série 1 · registrada'), findsOneWidget);
      expect(
        tester
            .widgetList<TextFormField>(find.byType(TextFormField))
            .any((field) => field.controller?.text == '12.5'),
        isTrue,
      );
      if (action == 'skip') {
        flow.skip(0);
      } else {
        flow.substitute(0);
      }
      await tester.pump();
      expect(find.textContaining('· registrada'), findsNothing);
      expect(
        tester
            .widgetList<TextFormField>(find.byType(TextFormField))
            .every((field) => field.controller?.text.isEmpty == true),
        isTrue,
      );
      expect(flow.completedSets, 0);
      await tester.pumpWidget(const SizedBox());
      flow.dispose();
    });
  }

  testWidgets(
    'student navigation has five destinations and no commercial tools',
    (tester) async {
      final gateway = DemoStudentGateway();
      await tester.pumpWidget(
        MaterialApp(
          home: StudentShell(
            gateway: gateway,
            store: MemoryPrivateStore(),
            onLogout: () async {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      for (final label in [
        'Início',
        'Treinos',
        'Progresso',
        'Nutrição',
        'Perfil',
      ]) {
        expect(
          find.descendant(
            of: find.byType(NavigationBar),
            matching: find.text(label),
          ),
          findsOneWidget,
        );
      }
      expect(find.text('Cobrança'), findsNothing);
      expect(find.text('Administrar alunos'), findsNothing);
    },
  );

  testWidgets(
    'coach guidance is visible before and during sets, personal note stays separate',
    (tester) async {
      final gateway = DemoStudentGateway();
      final plan = (await gateway.workouts()).first;
      final flow = WorkoutController(plan: plan);
      await tester.pumpWidget(
        MaterialApp(home: ExercisePage(flow: flow, exerciseIndex: 0)),
      );
      expect(find.text('Observação do professor'), findsOneWidget);
      expect(find.text(plan.exercises.first.coachObservation), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Instruções da biblioteca'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Instruções da biblioteca'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Começar séries'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text('Começar séries'));
      await tester.pumpAndSettle();
      expect(find.text('Observação do professor'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Minha anotação (opcional)'),
        250,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Minha anotação (opcional)'), findsOneWidget);
      expect(flow.logs.first.personalNote, isEmpty);
    },
  );

  testWidgets('rest timer pauses, adds time and skips', (tester) async {
    var now = DateTime(2026, 10, 17);
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: RestTimer(seconds: 60, now: () => now)),
      ),
    );
    expect(find.text('01:00'), findsOneWidget);
    now = now.add(const Duration(seconds: 1));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('00:59'), findsOneWidget);
    await tester.tap(find.byTooltip('Pausar descanso'));
    now = now.add(const Duration(seconds: 2));
    await tester.pump(const Duration(seconds: 2));
    expect(find.text('00:59'), findsOneWidget);
    await tester.tap(find.text('+30 s'));
    await tester.pump();
    expect(find.text('01:29'), findsOneWidget);
    await tester.tap(find.text('Pular descanso'));
    await tester.pump();
    expect(find.text('Descanso concluído'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('offline sync status remains visible after a failed retry', (
    tester,
  ) async {
    final gateway = DemoStudentGateway()..failSync = true;
    final store = MemoryPrivateStore();
    final flow = WorkoutController(plan: (await gateway.workouts()).first);
    final queue = WorkoutSyncQueue(gateway: gateway, store: store);
    await queue.enqueue(flow.finish());
    await tester.pumpWidget(
      MaterialApp(
        home: StudentShell(
          gateway: gateway,
          store: store,
          onLogout: () async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(
      find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text('Treinos'),
      ),
    );
    await tester.pumpAndSettle();
    final retryButton = find.widgetWithText(FilledButton, 'Tentar sincronizar');
    await tester.scrollUntilVisible(
      retryButton,
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.drag(find.byType(Scrollable).first, const Offset(0, -100));
    await tester.pumpAndSettle();
    await tester.tap(retryButton);
    await tester.pumpAndSettle();
    expect(find.textContaining('Pendente de sincronização'), findsOneWidget);
    expect(find.textContaining('Sem conexão de demonstração'), findsWidgets);
  });

  test(
    'draft restores prior series, note, and the same idempotency identity',
    () async {
      final plan = (await DemoStudentGateway().workouts()).first;
      final original = WorkoutController(plan: plan);
      original.record(0, plan.exercises.first.sets.first, {
        'load_kg': 12.5,
        'repetitions': 10,
      });
      original.setExerciseNote(0, 'Minha nota pessoal');
      final restored = WorkoutController(
        plan: plan,
        draft: original.draftJson().cast<String, dynamic>(),
      );
      expect(restored.sessionKey, original.sessionKey);
      expect(restored.startedAt, original.startedAt);
      expect(restored.completedSets, 1);
      expect(restored.logs.first.personalNote, 'Minha nota pessoal');
      expect(
        plan.exercises.first.coachObservation,
        isNot('Minha nota pessoal'),
      );
    },
  );

  test(
    'substitution clears original sets and does not claim the original prescription',
    () async {
      final plan = (await DemoStudentGateway().workouts()).first;
      final flow = WorkoutController(plan: plan);
      final target = plan.exercises.first.sets.first;
      flow.record(0, target, {'repetitions': 10});
      flow.setExerciseNote(0, 'Minha anotação continua independente.');
      flow.substitute(0);
      expect(
        flow.logs.first.personalNote,
        'Minha anotação continua independente.',
      );
      expect(
        flow.logs.first.selectedAlternative,
        plan.exercises.first.alternativeId,
      );
      expect(flow.completedSets, 0);
      flow.record(0, target, {'duration_seconds': 30});
      expect(flow.logs.first.sets[target.id]!['prescription'], isNull);
      final local = <String, dynamic>{
        'exercise_logs': [flow.logs.first.toJson()],
      };
      expect(
        ((local['exercise_logs'] as List<dynamic>).first
            as Map<String, dynamic>)['personal_note'],
        'Minha anotação continua independente.',
      );
      final api = workoutPayloadForApi(local);
      final apiLog =
          (api['exercise_logs'] as List<dynamic>).first as Map<String, dynamic>;
      expect(
        apiLog['note'],
        contains('[Minha anotação]\nMinha anotação continua independente.'),
      );
      expect(apiLog.containsKey('personal_note'), isFalse);
      expect(
        flow.logs.first.personalNote,
        'Minha anotação continua independente.',
      );
      flow.skip(0);
      expect(flow.completedSets, 0);
      expect(flow.logs.first.skipped, isTrue);
    },
  );

  test(
    'queue survives restart, keeps idempotency key, and does not duplicate',
    () async {
      final gateway = DemoStudentGateway()..failSync = true;
      final store = MemoryPrivateStore();
      final plan = (await gateway.workouts()).first;
      final flow = WorkoutController(plan: plan);
      final queue = WorkoutSyncQueue(gateway: gateway, store: store);
      final item = flow.finish();
      await queue.enqueue(item);
      await queue.enqueue(item);
      expect(queue.pending.length, 1);
      await queue.sync();
      expect(queue.pending.single.status, SyncStatus.pending);
      final restored = WorkoutSyncQueue(gateway: gateway, store: store);
      await restored.restore();
      expect(restored.pending.single.key, item.key);
      gateway.failSync = false;
      await restored.sync();
      expect(restored.pending, isEmpty);
      expect((await gateway.history()).single['idempotency_key'], item.key);
    },
  );

  test(
    'conflicting response remains pending and never overwrites local session',
    () async {
      final gateway = DemoStudentGateway()..conflictSync = true;
      final store = MemoryPrivateStore();
      final flow = WorkoutController(plan: (await gateway.workouts()).first);
      final queue = WorkoutSyncQueue(gateway: gateway, store: store);
      final item = flow.finish();
      await queue.enqueue(item);
      await queue.sync();
      expect(queue.pending.single.status, SyncStatus.conflict);
      expect(queue.pending.single.payload, item.payload);
    },
  );

  testWidgets(
    'resume before the first timer tick retains the original deadline',
    (tester) async {
      var now = DateTime(2026, 10, 17);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: RestTimer(seconds: 60, now: () => now)),
        ),
      );
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      now = now.add(const Duration(seconds: 15));
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      expect(find.text('00:45'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'prescribed effort and cadence survive cache projection without filling recorded RPE',
    (tester) async {
      final target = SetTarget.fromJson({
        'id': 'target',
        'order': 1,
        'repetitions_min': 8,
        'repetitions_max': 12,
        'rest_seconds': 60,
        'rpe': '7.5',
        'rir': 2,
        'cadence': '3-1-1',
      });
      final cached = SetTarget.fromJson(
        target.toJson().cast<String, dynamic>(),
      );
      expect(cached.rpe, 7.5);
      expect(cached.rir, 2);
      expect(cached.cadence, '3-1-1');
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: SetEntryCard(
                target: cached,
                trackingType: 'load_reps',
                onRecord: (_) {},
              ),
            ),
          ),
        ),
      );
      expect(find.textContaining('RPE prescrito 7.5'), findsOneWidget);
      expect(find.textContaining('RIR prescrito 2'), findsOneWidget);
      expect(find.textContaining('Cadência prescrita 3-1-1'), findsOneWidget);
      await tester.ensureVisible(find.text('RPE realizado 0–10 (opcional)'));
      final rpe = tester.widget<TextFormField>(
        find.ancestor(
          of: find.text('RPE realizado 0–10 (opcional)'),
          matching: find.byType(TextFormField),
        ),
      );
      expect(rpe.controller!.text, isEmpty);
    },
  );

  testWidgets(
    'web-shaped instructions use pt-BR labels and keep backend aliases',
    (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: InstructionsCard(
              instructions: {
                'preparation': 'Ajuste o banco.',
                'steps': ['Apoie os pés.', 'Execute com controle.'],
                'commonMistakes': ['Evite perder o apoio.'],
                'breathing': 'Respire livremente.',
              },
            ),
          ),
        ),
      );
      for (final label in [
        'Preparação',
        'Execução',
        'Erros comuns',
        'Respiração',
      ]) {
        expect(find.text(label), findsOneWidget);
      }
      expect(find.text('Apoie os pés.\nExecute com controle.'), findsOneWidget);
      expect(find.text('commonMistakes'), findsNothing);
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: InstructionsCard(
              instructions: {
                'setup': 'Ajuste.',
                'execution': 'Execute.',
                'common_mistakes': 'Evite.',
              },
            ),
          ),
        ),
      );
      for (final label in ['Preparação', 'Execução', 'Erros comuns']) {
        expect(find.text(label), findsOneWidget);
      }
    },
  );

  test(
    'SetLog precision and numeric boundaries match the actual API fields',
    () {
      for (final entry in {
        'load_kg': '99999.99',
        'distance_meters': '9999999.99',
        'rpe': '10.0',
        'repetitions': '2147483647',
        'duration_seconds': '2147483647',
      }.entries) {
        expect(
          validateSetValue(entry.key, entry.value),
          isNull,
          reason: entry.key,
        );
        expect(validateSetValue(entry.key, '0'), isNull);
        expect(validateSetValue(entry.key, null), isNull);
        expect(validateSetValue(entry.key, '-1'), isNotNull);
        expect(validateSetValue(entry.key, 'NaN'), isNotNull);
        expect(validateSetValue(entry.key, 'Infinity'), isNotNull);
      }
      for (final entry in {
        'load_kg': ['100000', '12.345', '1e3'],
        'distance_meters': ['10000000', '123.456'],
        'rpe': ['10.1', '7.55'],
        'repetitions': ['1.5', '2147483648'],
        'duration_seconds': ['0.1', '2147483648'],
      }.entries) {
        for (final value in entry.value) {
          expect(
            validateSetValue(entry.key, value),
            isNotNull,
            reason: '${entry.key}=$value',
          );
        }
      }
      expect(validateSetValue('load_kg', '12,50'), isNull);
      expect(parseSetValue('load_kg', '12,50'), 12.5);
    },
  );

  test('invalid persisted sets cannot finalize until corrected', () async {
    final plan = (await DemoStudentGateway().workouts()).first;
    final flow = WorkoutController(plan: plan);
    final target = plan.exercises.first.sets.first;
    flow.record(0, target, {'load_kg': 12.345});
    expect(flow.finish, throwsA(isA<ApiFailure>()));
    expect(flow.finished, isFalse);
    flow.record(0, target, {'load_kg': 12.34});
    expect(flow.finish().key, flow.sessionKey);
  });

  test(
    'rejected first entry is parked and later valid sessions sync across restart',
    () async {
      final gateway = RejectingWorkoutGateway();
      final store = MemoryPrivateStore();
      final plan = (await gateway.workouts()).first;
      final rejected = WorkoutController(plan: plan).finish();
      final valid = WorkoutController(plan: plan).finish();
      gateway.rejectedKeys.add(rejected.key);
      final queue = WorkoutSyncQueue(gateway: gateway, store: store);
      await queue.enqueue(rejected);
      await queue.enqueue(valid);
      await queue.sync();
      expect(queue.pending.single.status, SyncStatus.rejected);
      expect((await gateway.history()).single['idempotency_key'], valid.key);
      final restored = WorkoutSyncQueue(gateway: gateway, store: store);
      await restored.restore();
      await restored.sync();
      expect(gateway.submittedKeys, [rejected.key, valid.key]);
      expect(restored.pending.single.payload, rejected.payload);
    },
  );

  test(
    'correction persists the same identity, validates fields and requeues explicitly',
    () async {
      final gateway = RejectingWorkoutGateway();
      final store = MemoryPrivateStore();
      final plan = (await gateway.workouts()).first;
      final flow = WorkoutController(plan: plan);
      flow.record(0, plan.exercises.first.sets.first, {'load_kg': 12.5});
      final item = flow.finish();
      gateway.rejectedKeys.add(item.key);
      final queue = WorkoutSyncQueue(gateway: gateway, store: store);
      await queue.enqueue(item);
      await queue.sync();
      await expectLater(
        queue.requeueRejected(item.key, corrections: {'0.0.load_kg': '12.345'}),
        throwsA(isA<ApiFailure>()),
      );
      await expectLater(
        queue.requeueRejected(
          item.key,
          corrections: {'idempotency_key': 'other'},
        ),
        throwsA(isA<ApiFailure>()),
      );
      expect(queue.pending.single.status, SyncStatus.rejected);
      await queue.requeueRejected(
        item.key,
        corrections: {'0.0.load_kg': '15,25'},
      );
      expect(gateway.submittedKeys, [
        item.key,
      ]); // Saving never sends automatically.
      final restored = WorkoutSyncQueue(gateway: gateway, store: store);
      await restored.restore();
      expect(restored.pending.single.key, item.key);
      expect(restored.pending.single.status, SyncStatus.pending);
      expect(
        restored.pending.single.payload['started_at'],
        item.payload['started_at'],
      );
      expect(
        restored.pending.single.payload['completed_at'],
        item.payload['completed_at'],
      );
      gateway.rejectedKeys.clear();
      await restored.sync();
      expect(restored.pending, isEmpty);
      final log =
          ((await gateway.history()).single['exercise_logs'] as List<dynamic>)
                  .single
              as Map<String, dynamic>;
      expect(
        ((log['set_logs'] as List<dynamic>).single
            as Map<String, dynamic>)['load_kg'],
        15.25,
      );
    },
  );

  test(
    'explicit requeue after a resolved refusal preserves the original payload',
    () async {
      final gateway = RejectingWorkoutGateway();
      final item = WorkoutController(
        plan: (await gateway.workouts()).first,
      ).finish();
      final queue = WorkoutSyncQueue(
        gateway: gateway,
        store: MemoryPrivateStore(),
      );
      gateway.rejectedKeys.add(item.key);
      await queue.enqueue(item);
      await queue.sync();
      await queue.requeueRejected(item.key);
      expect(queue.pending.single.status, SyncStatus.pending);
      expect(queue.pending.single.payload, item.payload);
      expect(gateway.submittedKeys, [item.key]);
      gateway.rejectedKeys.clear();
      await queue.sync();
      expect(queue.pending, isEmpty);
    },
  );

  test(
    'rejected removal persists while uncertain and conflicting records cannot be edited or removed',
    () async {
      final gateway = RejectingWorkoutGateway();
      final store = MemoryPrivateStore();
      final item = WorkoutController(
        plan: (await gateway.workouts()).first,
      ).finish();
      final queue = WorkoutSyncQueue(gateway: gateway, store: store);
      gateway.rejectedKeys.add(item.key);
      await queue.enqueue(item);
      await queue.sync();
      await queue.removeRejected(item.key);
      final restored = WorkoutSyncQueue(gateway: gateway, store: store);
      await restored.restore();
      expect(restored.pending, isEmpty);
      for (final status in [SyncStatus.pending, SyncStatus.conflict]) {
        final protected = PendingWorkout(
          payload: {...item.payload, 'idempotency_key': status.name},
          status: status,
        );
        await queue.enqueue(protected);
        await expectLater(
          queue.requeueRejected(protected.key),
          throwsA(isA<ApiFailure>()),
        );
        await expectLater(
          queue.removeRejected(protected.key),
          throwsA(isA<ApiFailure>()),
        );
      }
      expect(queue.pending.length, 2);
    },
  );
}

class RejectingWorkoutGateway extends DemoStudentGateway {
  final Set<String> rejectedKeys = {};
  final List<String> submittedKeys = [];
  @override
  Future<Map<String, dynamic>> submit(PendingWorkout item) async {
    submittedKeys.add(item.key);
    if (rejectedKeys.contains(item.key)) {
      throw const ApiFailure('Confira os valores da série.', status: 400);
    }
    return super.submit(item);
  }
}
