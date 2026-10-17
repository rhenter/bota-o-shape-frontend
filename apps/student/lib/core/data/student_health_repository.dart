import 'dart:convert';

import '../../features/nutrition/nutrition_models.dart';
import '../../features/workouts/workout_models.dart';
import '../api/api_client.dart';
import '../storage/private_store.dart';
import 'student_gateway.dart';
import 'demo_health_data.dart';

/// Health reads and local intents share the authenticated account/tenant scope.
/// Demo is selected by the gateway, never as a fallback after an API error.
class StudentHealthRepository {
  StudentHealthRepository({required this.gateway, required this.store});
  final StudentGateway gateway;
  final PrivateStore store;
  final List<NutritionIntent> intents = [];
  final Map<String, List<Map<String, dynamic>>> _demoRecords = {};
  String get _key => 'student.health.v1.${gateway.storageNamespace}';
  ApiStudentGateway get _api => gateway as ApiStudentGateway;
  bool _loaded = false, _sending = false;
  bool get sending => _sending;

  Future<void> _authorize() async {
    if (gateway.isDemo) return;
    if (_api.client.tenantId != gateway.identity.tenantId) {
      throw const ApiFailure('A academia ativa mudou. Reabra seus dados.', status: 403);
    }
    final memberships = await _api.client.list('api/tenancy/memberships/');
    if (!memberships.any((m) => m['user'] == gateway.identity.id && m['status'] == 'active' &&
        (m['roles'] as List<dynamic>).contains('student'))) {
      throw const ApiFailure('Vínculo de aluno indisponível.', status: 403);
    }
  }

  Future<void> restore() async {
    if (_loaded) return;
    final raw = await store.read('$_key.intents');
    final saved = raw == null ? <NutritionIntent>[] : (jsonDecode(raw) as List<dynamic>)
        .map((i) => NutritionIntent.fromJson(i as Map<String, dynamic>)).toList();
    // A process exit after dispatch is indistinguishable from a lost response.
    for (final item in saved) { if (item.state == 'sending') item.state = 'uncertain'; }
    intents.addAll(saved);
    _loaded = true;
    await _persist();
  }
  Future<void> _persist() => store.write('$_key.intents', jsonEncode(intents.map((i) => i.toJson()).toList()));

  Future<List<Map<String, dynamic>>> records(String resource) async {
    await _authorize();
    if (!{'meal-logs', 'hydration-logs', 'check-ins', 'messages'}.contains(resource)) throw ArgumentError('Recurso inválido');
    if (gateway.isDemo) return List.from(_demoRecords[resource] ?? []);
    final items = await _api.client.list('api/nutrition/$resource/');
    if (resource == 'messages') return items.where((m) => m['student'] == gateway.identity.id).toList();
    return items;
  }

  Future<void> editDiary(String resource, String id, Map<String, dynamic> changes) async {
    if (!{'meal-logs', 'hydration-logs'}.contains(resource)) throw ArgumentError('Recurso inválido');
    final existing = await records(resource);
    if (!existing.any((r) => r['id'] == id)) throw const ApiFailure('Registro não disponível nesta conta.', status: 403);
    if (gateway.isDemo) {
      final item = (_demoRecords[resource] ?? []).firstWhere((r) => r['id'] == id);
      item.addAll(changes);
    } else {
      await _api.client.request('PATCH', 'api/nutrition/$resource/$id/', body: changes);
    }
  }

  Future<void> deleteDiary(String resource, String id) async {
    if (!{'meal-logs', 'hydration-logs'}.contains(resource)) throw ArgumentError('Recurso inválido');
    final existing = await records(resource);
    if (!existing.any((r) => r['id'] == id)) throw const ApiFailure('Registro não disponível nesta conta.', status: 403);
    if (gateway.isDemo) {
      _demoRecords[resource]?.removeWhere((r) => r['id'] == id);
    } else {
      await _api.client.request('DELETE', 'api/nutrition/$resource/$id/');
    }
  }

  Future<List<Map<String, dynamic>>> assessments() async {
    await _authorize();
    if (gateway.isDemo) return demoAssessments(gateway.identity.id);
    final items = await _api.client.list('api/assessments/assessments/?status=released&student=${gateway.identity.id}');
    return items.where((a) => a['student'] == gateway.identity.id && a['status'] == 'released').toList()
      ..sort((a, b) => '${a['assessed_at']}'.compareTo('${b['assessed_at']}'));
  }
  Future<Map<String, dynamic>> assessmentReport(String id) async {
    if (!(await assessments()).any((a) => a['id'] == id)) throw const ApiFailure('Avaliação indisponível.', status: 403);
    if (gateway.isDemo) return {'assessment': id, 'released_to_student': true, 'professional_interpretation': 'Exemplo fictício, sem interpretação clínica.'};
    final report = (await _api.client.request('GET', 'api/assessments/assessments/$id/report/'))! as Map<String, dynamic>;
    if (report['released_to_student'] != true || report['assessment'] != id) {
      throw const ApiFailure('Relatório ainda não liberado.', status: 403);
    }
    return report;
  }

  Future<List<Map<String, dynamic>>> plans() async {
    await _authorize();
    final items = gateway.isDemo ? demoMealPlans() : await _api.client.list('api/nutrition/plans/');
    await store.write('$_key.plans', jsonEncode({'saved_at': DateTime.now().toUtc().toIso8601String(), 'items': items}));
    return items;
  }
  Future<Map<String, dynamic>?> cachedPlans() async {
    final raw = await store.read('$_key.plans');
    return raw == null ? null : jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> searchFoods(String query, String source) async {
    await _authorize();
    if (gateway.isDemo) return [{
      'id': 'demo-food', 'name': 'Arroz · exemplo fictício', 'preparation_state': 'Cozido',
      'branded': false, 'source': {'kind': 'demo', 'version': 'demo-2026', 'name': 'Demonstração, sem importação TBCA/USDA'},
      'household_measures': <dynamic>[],
    }];
    return _api.client.list('api/food/foods/?search=${Uri.encodeQueryComponent(query)}&source__kind=$source');
  }
  Future<Map<String, dynamic>> calculate(String foodId) async {
    await _authorize();
    if (gateway.isDemo) return {'food_id': foodId, 'description': 'Arroz fictício', 'preparation_state': 'Cozido',
      'grams': '100', 'source': 'demo', 'source_version': 'demo-2026', 'nutrients': {
        'energy_kcal': {'per_100g': '120', 'value': '120', 'unit': 'kcal', 'name': 'Energia'},
        'protein_g': {'per_100g': '2.5', 'value': '2.5', 'unit': 'g', 'name': 'Proteínas'},
      }, 'estimated': true};
    return (await _api.client.request('POST', 'api/food/foods/$foodId/calculate/', body: {'grams': '100'}))! as Map<String, dynamic>;
  }

  Future<NutritionIntent> draft(String resource, Map<String, dynamic> payload, {Map<String, dynamic>? snapshot}) async {
    await restore();
    if (!{'meal-logs', 'hydration-logs', 'check-ins', 'messages'}.contains(resource)) throw ArgumentError('Recurso inválido');
    final item = NutritionIntent(id: newNutritionIntentId(), resource: resource,
      payload: jsonDecode(jsonEncode(payload)) as Map<String, dynamic>, snapshot: snapshot);
    intents.add(item);
    try { await _persist(); } catch (_) { intents.remove(item); rethrow; }
    return item;
  }

  Future<void> send(NutritionIntent item) async {
    if (_sending || item.state != 'draft') throw StateError('Confira o registro antes de enviar.');
    _sending = true;
    try {
      await _authorize();
      if (item.resource == 'check-ins') {
        final available = (await plans()).where((p) => planAvailable(p, DateTime.now()));
        final valid = available.any((p) {
          final v = p['active_version'] as Map<String, dynamic>;
          return v['id'] == item.payload['version'] && (v['meal_slots'] as List<dynamic>)
              .any((s) => (s as Map<String, dynamic>)['id'] == item.payload['meal_slot']);
        });
        if (!valid) throw const ApiFailure('O plano ou sua versão mudou. Registro preservado para revisão.', status: 409);
      }
      if (item.resource == 'meal-logs' && item.payload['food'] != null && item.snapshot != null) {
        final current = await calculate(item.payload['food'] as String);
        final old = item.snapshot!;
        final oldNutrients = old['nutrients'] as Map<String, dynamic>;
        final newNutrients = current['nutrients'] as Map<String, dynamic>;
        final unchanged = ['food_id', 'source', 'source_version', 'preparation_state'].every((key) => old[key] == current[key]) &&
          oldNutrients.length == newNutrients.length && oldNutrients.keys.every((code) {
            final before = oldNutrients[code] as Map<String, dynamic>;
            final after = newNutrients[code] as Map<String, dynamic>?;
            return after != null && before['unit'] == after['unit'] && number(before['per_100g']) == number(after['per_100g']);
          });
        if (!unchanged) throw const ApiFailure('A composição ou fonte mudou. Consulte o alimento novamente antes de registrar.', status: 409);
      }
      if (item.resource == 'messages') item.payload['student'] = gateway.identity.id;
      item.state = 'sending';
      // Write before dispatch. No background replay of these POSTs.
      try { await _persist(); } catch (_) { item.state = 'draft'; rethrow; }
      Map<String, dynamic> result;
      try {
        result = gateway.isDemo ? {...item.payload, 'id': item.id} :
          (await _api.client.request('POST', 'api/nutrition/${item.resource}/', body: item.payload))! as Map<String, dynamic>;
        if (result['id'] is! String) throw const ApiFailure('Resposta de registro incompleta.');
      } catch (error) {
        // Even malformed success/5xx can follow a committed write.
        item.state = error is ApiFailure && error.status != null && error.status! >= 400 &&
          error.status! < 500 ? 'rejected' : 'uncertain';
        await _persist();
        rethrow;
      }
      item.serverId = result['id'] as String;
      item.state = 'confirmed';
      if (gateway.isDemo) (_demoRecords[item.resource] ??= []).add(result);
      await _persist();
    } finally { _sending = false; }
  }

  /// The student reconciles an uncertain outcome against a freshly read diary.
  /// Marking absent returns a draft; sending still requires a separate action.
  Future<void> reconcile(NutritionIntent item, {String? existingId, bool confirmedAbsent = false}) async {
    if (item.state != 'uncertain' && item.state != 'rejected') throw StateError('Sem reconciliação pendente.');
    final server = await records(item.resource);
    if (existingId != null) {
      if (!server.any((r) => r['id'] == existingId)) throw ArgumentError('Registro não encontrado.');
      item.serverId = existingId; item.state = 'confirmed';
    } else if (confirmedAbsent) {
      item.state = 'draft';
    } else { throw ArgumentError('Confirme a conferência do diário.'); }
    await _persist();
  }
}
