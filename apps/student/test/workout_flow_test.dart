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
  testWidgets('student navigation has five destinations and no commercial tools', (tester) async {
    final gateway = DemoStudentGateway();
    await tester.pumpWidget(MaterialApp(home: StudentShell(
      gateway: gateway, store: MemoryPrivateStore(), onLogout: () async {},
    )));
    await tester.pumpAndSettle();
    for (final label in ['Início', 'Treinos', 'Progresso', 'Nutrição', 'Perfil']) {
      expect(find.descendant(of: find.byType(NavigationBar), matching: find.text(label)), findsOneWidget);
    }
    expect(find.text('Cobrança'), findsNothing);
    expect(find.text('Administrar alunos'), findsNothing);
  });

  testWidgets('coach guidance is visible before and during sets, personal note stays separate', (tester) async {
    final gateway = DemoStudentGateway();
    final plan = (await gateway.workouts()).first;
    final flow = WorkoutController(plan: plan);
    await tester.pumpWidget(MaterialApp(home: ExercisePage(flow: flow, exerciseIndex: 0)));
    expect(find.text('Observação do professor'), findsOneWidget);
    expect(find.text(plan.exercises.first.coachObservation), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Instruções da biblioteca'), 200);
    expect(find.text('Instruções da biblioteca'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Começar séries'), 200);
    await tester.tap(find.text('Começar séries'));
    await tester.pumpAndSettle();
    expect(find.text('Observação do professor'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('Minha anotação (opcional)'), 250);
    expect(find.text('Minha anotação (opcional)'), findsOneWidget);
    expect(flow.logs.first.personalNote, isEmpty);
  });

  testWidgets('rest timer pauses, adds time and skips', (tester) async {
    var now = DateTime(2026, 10, 17);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: RestTimer(seconds: 60, now: () => now))));
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

  testWidgets('offline sync status remains visible after a failed retry', (tester) async {
    final gateway = DemoStudentGateway()..failSync = true;
    final store = MemoryPrivateStore();
    final flow = WorkoutController(plan: (await gateway.workouts()).first);
    final queue = WorkoutSyncQueue(gateway: gateway, store: store);
    await queue.enqueue(flow.finish());
    await tester.pumpWidget(MaterialApp(home: StudentShell(
      gateway: gateway, store: store, onLogout: () async {},
    )));
    await tester.pumpAndSettle();
    await tester.tap(find.descendant(of: find.byType(NavigationBar), matching: find.text('Treinos')));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Tentar sincronizar'), 200);
    await tester.tap(find.text('Tentar sincronizar'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Pendente de sincronização'), findsOneWidget);
    expect(find.textContaining('Sem conexão de demonstração'), findsWidgets);
  });

  test('draft restores prior series, note, and the same idempotency identity', () async {
    final plan = (await DemoStudentGateway().workouts()).first;
    final original = WorkoutController(plan: plan);
    original.record(0, plan.exercises.first.sets.first, {'load_kg': 12.5, 'repetitions': 10});
    original.setExerciseNote(0, 'Minha nota pessoal');
    final restored = WorkoutController(plan: plan, draft: original.draftJson().cast<String, dynamic>());
    expect(restored.sessionKey, original.sessionKey);
    expect(restored.startedAt, original.startedAt);
    expect(restored.completedSets, 1);
    expect(restored.logs.first.personalNote, 'Minha nota pessoal');
    expect(plan.exercises.first.coachObservation, isNot('Minha nota pessoal'));
  });

  test('substitution clears original sets and does not claim the original prescription', () async {
    final plan = (await DemoStudentGateway().workouts()).first;
    final flow = WorkoutController(plan: plan);
    final target = plan.exercises.first.sets.first;
    flow.record(0, target, {'repetitions': 10});
    flow.setExerciseNote(0, 'Minha anotação continua independente.');
    flow.substitute(0);
    expect(flow.logs.first.personalNote, 'Minha anotação continua independente.');
    expect(flow.logs.first.selectedAlternative, plan.exercises.first.alternativeId);
    expect(flow.completedSets, 0);
    flow.record(0, target, {'duration_seconds': 30});
    expect(flow.logs.first.sets[target.id]!['prescription'], isNull);
    final local = <String, dynamic>{'exercise_logs': [flow.logs.first.toJson()]};
    expect(((local['exercise_logs'] as List<dynamic>).first as Map<String, dynamic>)['personal_note'], 'Minha anotação continua independente.');
    final api = workoutPayloadForApi(local);
    final apiLog = (api['exercise_logs'] as List<dynamic>).first as Map<String, dynamic>;
    expect(apiLog['note'], contains('[Minha anotação]\nMinha anotação continua independente.'));
    expect(apiLog.containsKey('personal_note'), isFalse);
    expect(flow.logs.first.personalNote, 'Minha anotação continua independente.');
    flow.skip(0);
    expect(flow.completedSets, 0);
    expect(flow.logs.first.skipped, isTrue);
  });

  test('queue survives restart, keeps idempotency key, and does not duplicate', () async {
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
  });

  test('conflicting response remains pending and never overwrites local session', () async {
    final gateway = DemoStudentGateway()..conflictSync = true;
    final store = MemoryPrivateStore();
    final flow = WorkoutController(plan: (await gateway.workouts()).first);
    final queue = WorkoutSyncQueue(gateway: gateway, store: store);
    final item = flow.finish();
    await queue.enqueue(item);
    await queue.sync();
    expect(queue.pending.single.status, SyncStatus.conflict);
    expect(queue.pending.single.payload, item.payload);
  });

  testWidgets('resume before the first timer tick retains the original deadline', (tester) async {
    var now = DateTime(2026, 10, 17);
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: RestTimer(seconds: 60, now: () => now))));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    now = now.add(const Duration(seconds: 15));
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
    await tester.pump();
    expect(find.text('00:45'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('prescribed effort and cadence survive cache projection without filling recorded RPE', (tester) async {
    final target = SetTarget.fromJson({
      'id': 'target', 'order': 1, 'repetitions_min': 8, 'repetitions_max': 12,
      'rest_seconds': 60, 'rpe': '7.5', 'rir': 2, 'cadence': '3-1-1',
    });
    final cached = SetTarget.fromJson(target.toJson().cast<String, dynamic>());
    expect(cached.rpe, 7.5);
    expect(cached.rir, 2);
    expect(cached.cadence, '3-1-1');
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: SingleChildScrollView(child: SetEntryCard(
      target: cached, trackingType: 'load_reps', onRecord: (_) {},
    )))));
    expect(find.textContaining('RPE prescrito 7.5'), findsOneWidget);
    expect(find.textContaining('RIR prescrito 2'), findsOneWidget);
    expect(find.textContaining('Cadência prescrita 3-1-1'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('RPE realizado 0–10 (opcional)'), 200);
    final rpe = tester.widget<TextFormField>(find.ancestor(
      of: find.text('RPE realizado 0–10 (opcional)'), matching: find.byType(TextFormField)));
    expect(rpe.controller!.text, isEmpty);
  });

}
