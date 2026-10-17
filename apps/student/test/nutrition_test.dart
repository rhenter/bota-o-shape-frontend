import 'dart:convert';
import 'package:bota_o_shape_student/core/api/api_client.dart';
import 'package:bota_o_shape_student/core/data/student_gateway.dart';
import 'package:bota_o_shape_student/core/data/student_health_repository.dart';
import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/features/nutrition/nutrition_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:bota_o_shape_student/features/nutrition/nutrition_entry_page.dart';

void main() {
  Map<String, dynamic> plan({String status = 'published', String version = 'v1'}) => {
    'id': 'p', 'status': status, 'starts_on': '2020-01-01', 'ends_on': '2099-12-31',
    'active_version': {'id': version, 'published_at': '2026-01-01T00:00:00Z', 'meal_slots': [{'id': 's1'}]},
  };
  final now = DateTime(2026, 10, 17);
  final snapshot = <String, dynamic>{'nutrients': {
    'energy_kcal': {'per_100g': '130', 'unit': 'kcal'}, 'protein_g': {'per_100g': '2.5', 'unit': 'g'},
    'fat_g': {'per_100g': '0', 'unit': 'g'},
  }};
  test('published plans respect dates, pause, expiration and missing active version', () {
    expect(planAvailable(plan(), now), isTrue);
    expect(planAvailable(plan(status: 'paused'), now), isFalse);
    expect(planAvailable({...plan(), 'ends_on': '2026-10-16'}, now), isFalse);
    expect(planAvailable({...plan(), 'starts_on': '2026-10-18'}, now), isFalse);
    expect(planAvailable({...plan(), 'active_version': null}, now), isFalse);
  });
  test('portion calculation is proportional and unknown nutrients stay unknown', () {
    final small = portionNutrients(snapshot, 100), large = portionNutrients(snapshot, 150);
    expect(large['energy_kcal'], 195); expect(large['protein_g'], 3.75);
    expect(large['fat_g'], 0); expect(large['fiber_g'], isNull);
    expect(sumNutrients([small, large])['energy_kcal'], 325);
    expect(sumNutrients([small, <String, double?>{}])['energy_kcal'], isNull);
    expect(() => portionNutrients(snapshot, double.nan), throwsArgumentError);
    expect(() => portionNutrients(snapshot, 0), throwsArgumentError);
  });
  test('household conversion requires the documented food-specific evidence', () {
    expect(householdGrams({'grams': '150', 'evidence': 'documented rice cup'}, 2), 300);
    expect(() => householdGrams({'grams': '150', 'evidence': ''}, 1), throwsArgumentError);
  });
  test('check-ins use neutral optional labels', () {
    expect(adherenceLabels, {'followed': 'Segui', 'partial': 'Segui parcialmente', 'not_followed': 'Não segui'});
  });
  test('local intent UUID and nutrition snapshot survive restart without transmission', () async {
    final gateway = DemoStudentGateway(), store = MemoryPrivateStore();
    final repo = StudentHealthRepository(gateway: gateway, store: store);
    final intent = await repo.draft('meal-logs', {'description': 'refeição', 'grams': '150'}, snapshot: snapshot);
    expect(intent.id, matches(RegExp(r'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$')));
    final restored = StudentHealthRepository(gateway: gateway, store: store); await restored.restore();
    expect(restored.intents.single.id, intent.id); expect(restored.intents.single.snapshot, snapshot);
    expect(restored.intents.single.state, 'draft'); expect(await restored.records('meal-logs'), isEmpty);
  });
  test('interrupted dispatch restores as uncertain and cannot send without reconciliation', () async {
    final gateway = DemoStudentGateway(), store = MemoryPrivateStore();
    await store.write('student.health.v1.${gateway.storageNamespace}.intents', jsonEncode([
      NutritionIntent(id: newNutritionIntentId(), resource: 'meal-logs', payload: {'description': 'meal'}, state: 'sending').toJson(),
    ]));
    final repo = StudentHealthRepository(gateway: gateway, store: store); await repo.restore();
    expect(repo.intents.single.state, 'uncertain');
    await expectLater(repo.send(repo.intents.single), throwsStateError);
    await repo.reconcile(repo.intents.single, confirmedAbsent: true);
    expect(repo.intents.single.state, 'draft'); expect(await repo.records('meal-logs'), isEmpty);
  });
  test('transport ambiguity persists and never automatically replays a nutrition POST', () async {
    final store = MemoryPrivateStore(); var posts = 0;
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: store,
      sender: (method, uri, headers, body) async {
        if (uri.path == '/api/tenancy/memberships/') return const ApiResponse(200, [{'user': 'u', 'status': 'active', 'roles': ['student']}]);
        if (method == 'POST') { posts++; throw const ApiFailure('Lost response'); }
        return const ApiResponse(200, []);
      })..tenantId = 't';
    final repo = StudentHealthRepository(gateway: ApiStudentGateway(client: client, store: store,
      identity: const StudentIdentity(id: 'u', tenantId: 't', name: 'A', academy: 'B')), store: store);
    final intent = await repo.draft('hydration-logs', {'logged_at': now.toIso8601String(), 'milliliters': 200});
    await expectLater(repo.send(intent), throwsA(isA<ApiFailure>())); expect(intent.state, 'uncertain');
    await expectLater(repo.send(intent), throwsStateError); expect(posts, 1);
    final restored = StudentHealthRepository(gateway: repo.gateway, store: store); await restored.restore();
    expect(restored.intents.single.state, 'uncertain'); expect(posts, 1);
  });
  test('new plan version prevents sending a stale meal check-in', () async {
    final store = MemoryPrivateStore(); var posts = 0;
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: store,
      sender: (method, uri, headers, body) async {
        if (uri.path == '/api/tenancy/memberships/') return const ApiResponse(200, [{'user': 'u', 'status': 'active', 'roles': ['student']}]);
        if (uri.path == '/api/nutrition/plans/') return ApiResponse(200, [plan(version: 'v2')]);
        if (method == 'POST') posts++;
        return const ApiResponse(200, []);
      })..tenantId = 't';
    final repo = StudentHealthRepository(gateway: ApiStudentGateway(client: client, store: store,
      identity: const StudentIdentity(id: 'u', tenantId: 't', name: 'A', academy: 'B')), store: store);
    final intent = await repo.draft('check-ins', {'version': 'v1', 'meal_slot': 's1', 'adherence': 'partial'});
    await expectLater(repo.send(intent), throwsA(isA<ApiFailure>())); expect(posts, 0); expect(intent.state, 'draft');
  });
  test('food search transmits source and preserves preparation as a distinct result', () async {
    final store = MemoryPrivateStore(); final paths = <Uri>[];
    final client = ApiClient(baseUrl: Uri.parse('https://api.example/'), store: store,
      sender: (method, uri, headers, body) async {
        paths.add(uri);
        if (uri.path == '/api/tenancy/memberships/') return const ApiResponse(200, [{'user': 'u', 'status': 'active', 'roles': ['student']}]);
        return const ApiResponse(200, [{'id': 'cooked', 'preparation_state': 'cozido'}, {'id': 'raw', 'preparation_state': 'cru'}]);
      })..tenantId = 't';
    final repo = StudentHealthRepository(gateway: ApiStudentGateway(client: client, store: store,
      identity: const StudentIdentity(id: 'u', tenantId: 't', name: 'A', academy: 'B')), store: store);
    final results = await repo.searchFoods('arroz cozido', 'tbca');
    expect(results.map((r) => r['preparation_state']), ['cozido', 'cru']);
    expect(paths.last.queryParameters['source__kind'], 'tbca');
    await repo.searchFoods('arroz', 'usda'); expect(paths.last.queryParameters['source__kind'], 'usda');
    client.tenantId = 'other'; await expectLater(repo.searchFoods('arroz', 'tbca'), throwsA(isA<ApiFailure>()));
  });
  test('food source updates block a write instead of silently changing its saved composition', () async {
    final repo = StudentHealthRepository(gateway: DemoStudentGateway(), store: MemoryPrivateStore());
    final original = await repo.calculate('demo-food');
    final intent = await repo.draft('meal-logs', {'description': 'Arroz', 'food': 'demo-food', 'grams': '150'},
      snapshot: {...original, 'source_version': 'old-version'});
    await expectLater(repo.send(intent), throwsA(isA<ApiFailure>()));
    expect(intent.state, 'draft'); expect(await repo.records('meal-logs'), isEmpty);
  });
  test('explicit reconciliation can bind an uncertain intent to an existing record without posting', () async {
    final repo = StudentHealthRepository(gateway: DemoStudentGateway(), store: MemoryPrivateStore());
    final existing = await repo.draft('hydration-logs', {'milliliters': 200, 'logged_at': now.toIso8601String()});
    await repo.send(existing);
    final uncertain = await repo.draft('hydration-logs', {...existing.payload}); uncertain.state = 'uncertain';
    await repo.reconcile(uncertain, existingId: existing.serverId);
    expect(uncertain.state, 'confirmed'); expect((await repo.records('hydration-logs')).length, 1);
    await expectLater(repo.send(uncertain), throwsStateError);
  });
  test('only owned diary records can be edited or deleted', () async {
    final repo = StudentHealthRepository(gateway: DemoStudentGateway(), store: MemoryPrivateStore());
    final item = await repo.draft('meal-logs', {'description': 'Primeira descrição'}); await repo.send(item);
    await repo.editDiary('meal-logs', item.serverId!, {'description': 'Descrição revisada'});
    expect((await repo.records('meal-logs')).single['description'], 'Descrição revisada');
    await expectLater(repo.deleteDiary('meal-logs', 'foreign-id'), throwsA(isA<ApiFailure>()));
    await repo.deleteDiary('meal-logs', item.serverId!); expect(await repo.records('meal-logs'), isEmpty);
  });

  test('MealLog grams use positive API-safe decimal precision and range', () {
    expect(normalizeMealGrams('00150,1250'), '150.125');
    expect(normalizeMealGrams('0.001'), '0.001');
    expect(normalizeMealGrams('9999999.999'), '9999999.999');
    expect(normalizeMealGrams(150.0), '150');
    for (final value in ['0', '-1', '0.0001', '150.1234', '10000000', '1e3', 'NaN', 'Infinity', '']) {
      expect(() => normalizeMealGrams(value), throwsArgumentError, reason: value);
    }
  });
  test('invalid quantities never become saved intents and valid quantities normalize before persistence', () async {
    final store = MemoryPrivateStore(), gateway = DemoStudentGateway();
    final repo = StudentHealthRepository(gateway: gateway, store: store);
    for (final grams in ['1.2345', '10000000', '0', '-1']) {
      await expectLater(repo.draft('meal-logs', {'description': 'Meal', 'grams': grams}), throwsArgumentError);
    }
    expect(repo.intents, isEmpty);
    final item = await repo.draft('meal-logs', {'description': 'Meal', 'grams': '0150,1250'});
    expect(item.payload['grams'], '150.125');
    final restored = StudentHealthRepository(gateway: gateway, store: store); await restored.restore();
    expect(restored.intents.single.payload['grams'], '150.125');
  });
  test('fresh diary quantities scale the preserved basis and changed food/source/preparation are unavailable', () {
    final basis = {...snapshot, 'food_id': 'rice', 'source': 'tbca', 'source_version': '2026',
      'preparation_state': 'cozido', 'external_id': 'TBCA-1'};
    final intent = NutritionIntent(id: 'local', resource: 'meal-logs', payload: {'food': 'rice', 'grams': '100'},
      snapshot: basis, state: 'confirmed', serverId: 'remote');
    final row = <String, dynamic>{'id': 'remote', 'food': 'rice', 'grams': '200.000'};
    final food = <String, dynamic>{'id': 'rice', 'source': {'kind': 'tbca', 'version': '2026'},
      'preparation_state': 'cozido', 'external_id': 'TBCA-1'};
    expect(preservedDiaryNutrients(row, intent, food)['energy_kcal'], 260);
    expect(preservedDiaryNutrients({...row, 'grams': '50.125'}, intent, food)['energy_kcal'], closeTo(65.1625, .00001));
    for (final changed in [<String, dynamic>{...row, 'food': 'beans'}, {...row, 'food': null}, {...row, 'grams': null}]) {
      expect(preservedDiaryNutrients(changed, intent, food).values.every((v) => v == null), isTrue);
    }
    for (final changed in [<String, dynamic>{...food, 'preparation_state': 'cru'},
      {...food, 'source': {'kind': 'usda', 'version': '2026'}},
      {...food, 'source': {'kind': 'tbca', 'version': '2027'}}, {...food, 'external_id': 'other'}]) {
      expect(preservedDiaryNutrients(row, intent, changed).values.every((v) => v == null), isTrue);
    }
    expect(preservedDiaryNutrients(row, intent, null).values.every((v) => v == null), isTrue);
  });
  test('fresh diary projection checks the returned food identity before reusing a local snapshot', () async {
    final repo = StudentHealthRepository(gateway: DemoStudentGateway(), store: MemoryPrivateStore());
    final basis = await repo.calculate('demo-food');
    final item = await repo.draft('meal-logs', {'description': 'Rice', 'food': 'demo-food', 'grams': '100'}, snapshot: basis);
    await repo.send(item);
    final row = (await repo.records('meal-logs')).single;
    final changedQuantity = await repo.diaryNutrients([{...row, 'grams': '200.000'}]);
    expect(changedQuantity[item.serverId]!['energy_kcal'], 240);
    final changedFood = await repo.diaryNutrients([{...row, 'food': 'different-food', 'grams': '200.000'}]);
    expect(changedFood[item.serverId]!.values.every((v) => v == null), isTrue);
  });
  test('correcting a rejected draft preserves UUID, persists accepted precision and does not send', () async {
    final store = MemoryPrivateStore(), gateway = DemoStudentGateway();
    final repo = StudentHealthRepository(gateway: gateway, store: store);
    final item = await repo.draft('meal-logs', {'description': 'Meal', 'grams': '100'});
    final id = item.id; item.state = 'rejected'; item.payload['grams'] = '100.1234';
    await repo.updateDraft(item, {...item.payload, 'grams': '150,125', 'description': 'Corrected meal'});
    expect(item.id, id); expect(item.state, 'draft'); expect(item.payload['grams'], '150.125');
    expect(await repo.records('meal-logs'), isEmpty);
    final restored = StudentHealthRepository(gateway: gateway, store: store); await restored.restore();
    expect(restored.intents.single.payload['description'], 'Corrected meal');
    expect(restored.intents.single.payload['grams'], '150.125');
    item.state = 'uncertain';
    await expectLater(repo.updateDraft(item, {...item.payload, 'grams': '200'}), throwsStateError);
  });
  testWidgets('a rejected MealLog can be opened, corrected and saved before any resend', (tester) async {
    final repo = StudentHealthRepository(gateway: DemoStudentGateway(), store: MemoryPrivateStore());
    final item = await repo.draft('meal-logs', {'description': 'Meal', 'grams': '100'});
    item.state = 'rejected'; item.payload['grams'] = '100.1234';
    await tester.pumpWidget(MaterialApp(home: IntentReviewPage(repository: repo, item: item)));
    await tester.scrollUntilVisible(find.text('Corrigir registro salvo'), 200);
    await tester.tap(find.text('Corrigir registro salvo')); await tester.pumpAndSettle();
    final quantity = find.byWidgetPredicate((widget) => widget is TextField && widget.decoration?.labelText == 'Quantidade em gramas (opcional para refeição livre)');
    await tester.scrollUntilVisible(quantity, 200); await tester.enterText(quantity, '150,125');
    await tester.scrollUntilVisible(find.text('Salvar correções neste aparelho'), 200);
    await tester.tap(find.text('Salvar correções neste aparelho')); await tester.pumpAndSettle();
    expect(item.payload['grams'], '150.125'); expect(item.state, 'draft');
    expect(await repo.records('meal-logs'), isEmpty);
    expect(find.text('Enviar registro'), findsOneWidget);
  });

}
