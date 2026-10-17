import 'dart:math';
import '../workouts/workout_models.dart';

const adherenceLabels = {'followed': 'Segui', 'partial': 'Segui parcialmente', 'not_followed': 'Não segui'};
const nutrientLabels = {'energy_kcal': 'Energia', 'protein_g': 'Proteínas',
  'available_carbohydrate_g': 'Carboidratos disponíveis', 'total_carbohydrate_g': 'Carboidratos totais',
  'fat_g': 'Gorduras', 'fiber_g': 'Fibras'};

bool planAvailable(Map<String, dynamic> plan, DateTime now) {
  final today = DateTime(now.year, now.month, now.day);
  final start = DateTime.tryParse('${plan['starts_on']}');
  final end = DateTime.tryParse('${plan['ends_on']}');
  final version = plan['active_version'];
  return plan['status'] == 'published' && version is Map && version['published_at'] != null &&
      start != null && !today.isBefore(start) && (end == null || !today.isAfter(end));
}

Map<String, double?> portionNutrients(Map<String, dynamic> snapshot, double grams) {
  if (!grams.isFinite || grams <= 0) throw ArgumentError('Informe gramas positivas.');
  final nutrients = snapshot['nutrients'] as Map<String, dynamic>? ?? {};
  return {for (final code in nutrientLabels.keys) code:
    number((nutrients[code] as Map<String, dynamic>?)?['per_100g']) == null ? null :
    number((nutrients[code] as Map<String, dynamic>)['per_100g'])! * grams / 100};
}

/// A total is unknown if any item lacks that nutrient; partial sums are not totals.
Map<String, double?> sumNutrients(List<Map<String, double?>> items) => {
  for (final code in nutrientLabels.keys) code:
    items.isEmpty || items.any((item) => item[code] == null) ? null :
      items.fold<double>(0, (sum, item) => sum + item[code]!),
};

double householdGrams(Map<String, dynamic> measure, double count) {
  final grams = number(measure['grams']);
  if (grams == null || grams <= 0 || '${measure['evidence'] ?? ''}'.trim().isEmpty || !count.isFinite || count <= 0) {
    throw ArgumentError('Conversão documentada indisponível.');
  }
  return grams * count;
}

String newNutritionIntentId() {
  final random = Random.secure();
  final bytes = List.generate(16, (_) => random.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final h = bytes.map((v) => v.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

class NutritionIntent {
  NutritionIntent({required this.id, required this.resource, required this.payload,
    this.state = 'draft', this.serverId, this.snapshot});
  final String id, resource;
  final Map<String, dynamic> payload;
  final Map<String, dynamic>? snapshot;
  String state;
  String? serverId;
  Map<String, dynamic> toJson() => {'id': id, 'resource': resource, 'payload': payload,
    'state': state, 'server_id': serverId, 'snapshot': snapshot};
  factory NutritionIntent.fromJson(Map<String, dynamic> json) => NutritionIntent(
    id: json['id'] as String, resource: json['resource'] as String,
    payload: json['payload'] as Map<String, dynamic>, state: json['state'] as String,
    serverId: json['server_id'] as String?, snapshot: json['snapshot'] as Map<String, dynamic>?);
}

class FoodPortionSelection {
  const FoodPortionSelection({required this.food, required this.snapshot, required this.grams});
  final Map<String, dynamic> food, snapshot;
  final double grams;
}

const nutritionResourceLabels = {'meal-logs': 'Refeição avulsa', 'hydration-logs': 'Água',
  'check-ins': 'Check-in de refeição', 'messages': 'Mensagem'};
const intentStateLabels = {'draft': 'Salvo neste aparelho', 'sending': 'Envio em andamento',
  'confirmed': 'Confirmado', 'uncertain': 'Recebimento incerto', 'rejected': 'Não aceito'};
String nutritionRecordDetails(String resource, Map<String, dynamic> payload) {
  final date = DateTime.tryParse('${payload['logged_at'] ?? payload['checked_at']}')?.toLocal();
  return [
    if (date != null) 'Data e horário: ${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}',
    if (resource == 'meal-logs') '${payload['description']}\n${payload['grams'] == null ? 'Porção não informada' : '${payload['grams']} g'}',
    if (resource == 'hydration-logs') '${payload['milliliters']} ml',
    if (resource == 'check-ins') '${adherenceLabels[payload['adherence']]}\nObservação: ${payload['note'] ?? ''}\nPergunta: ${payload['question'] ?? ''}',
    if (resource == 'messages') '${payload['body']}',
  ].join('\n');
}
