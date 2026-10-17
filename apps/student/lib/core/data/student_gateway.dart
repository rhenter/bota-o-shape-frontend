import 'dart:convert';

import '../../features/onboarding/onboarding_choices.dart';
import '../../features/workouts/workout_models.dart';
import '../api/api_client.dart';
import '../storage/private_store.dart';
import 'demo_repository.dart';

/// The API has no structured substitution/personal-note fields. Keep those
/// separate in encrypted local state and combine only at the transport boundary.
Map<String, dynamic> workoutPayloadForApi(Map<String, dynamic> local) {
  final payload = jsonDecode(jsonEncode(local)) as Map<String, dynamic>;
  for (final raw in payload['exercise_logs'] as List<dynamic>) {
    final log = raw as Map<String, dynamic>;
    final personalNote = log.remove('personal_note') as String? ?? '';
    final alternative = log.remove('selected_alternative') as Map<String, dynamic>?;
    log['note'] = alternative == null ? personalNote :
        '[Substituição informada pelo aluno]\n${alternative['name']} (${alternative['id']})\n'
        '[/Substituição]\n[Minha anotação]\n$personalNote\n[/Minha anotação]';
  }
  return payload;
}

class StudentIdentity {
  const StudentIdentity({required this.id, required this.tenantId, required this.name, required this.academy});
  final String id, tenantId, name, academy;
  String get storageScope => '$tenantId.$id';
}

abstract interface class StudentGateway {
  bool get isDemo;
  String get storageNamespace;
  StudentIdentity get identity;
  Future<List<StudentWorkout>> workouts();
  Future<List<StudentWorkout>> cachedWorkouts();
  Future<List<Map<String, dynamic>>> history();
  Future<Map<String, dynamic>> submit(PendingWorkout item);
  Future<void> saveOnboarding(OnboardingChoices choices);
  Future<OnboardingChoices?> onboarding();
}

class ApiStudentGateway implements StudentGateway {
  ApiStudentGateway({required this.client, required this.store, required this.identity});
  final ApiClient client;
  final PrivateStore store;
  @override
  final StudentIdentity identity;
  @override
  bool get isDemo => false;
  @override
  String get storageNamespace => '${client.baseUrl.origin}.${identity.storageScope}';
  String get _cacheKey => 'student.workouts.v1.$storageNamespace';

  Future<void> _checkMembership() async {
    if (client.tenantId != identity.tenantId) {
      throw const ApiFailure('Selecione a academia deste registro antes de sincronizar.', status: 403);
    }
    final memberships = await client.list('api/tenancy/memberships/');
    final valid = memberships.any((m) => m['user'] == identity.id && m['status'] == 'active' &&
        (m['roles'] as List<dynamic>).contains('student'));
    if (!valid) throw const ApiFailure('É necessário um vínculo ativo de aluno nesta academia.', status: 403);
  }

  @override
  Future<List<StudentWorkout>> workouts() async {
    await _checkMembership();
    final assignments = await client.list('api/workouts/assignments/?is_active=true');
    // Fetch only library records referenced by this student's own assignments.
    final own = assignments.where((a) => a['student'] == identity.id).toList();
    final catalog = <String, Map<String, dynamic>>{};
    final equipment = <String, String>{};
    final muscles = <String, String>{};
    Future<void> loadExercise(String id) async {
      if (catalog.containsKey(id)) return;
      final exercise = (await client.request('GET', 'api/workouts/exercises/$id/'))! as Map<String, dynamic>;
      catalog[id] = exercise;
      for (final value in exercise['equipment'] as List<dynamic>) {
        final key = value as String;
        if (!equipment.containsKey(key)) {
          final item = (await client.request('GET', 'api/workouts/equipment/$key/'))! as Map<String, dynamic>;
          equipment[key] = item['name'] as String;
        }
      }
      for (final value in [...(exercise['primary_muscles'] as List<dynamic>),
          ...(exercise['secondary_muscles'] as List<dynamic>)]) {
        final key = value as String;
        if (!muscles.containsKey(key)) {
          final item = (await client.request('GET', 'api/workouts/muscle-groups/$key/'))! as Map<String, dynamic>;
          muscles[key] = item['name'] as String;
        }
      }
    }
    final plans = <StudentWorkout>[];
    for (final assignment in own) {
      final template = assignment['template_detail'] as Map<String, dynamic>;
      for (final rawDay in template['days'] as List<dynamic>) {
        final day = rawDay as Map<String, dynamic>;
        final exercises = <AssignedExercise>[];
        for (final raw in day['exercises'] as List<dynamic>) {
          final prescribed = raw as Map<String, dynamic>;
          final id = prescribed['exercise'] as String;
          await loadExercise(id);
          final library = catalog[id]!;
          final alternateId = prescribed['alternative'] as String?;
          if (alternateId != null) await loadExercise(alternateId);
          List<String> names(String field, Map<String, String> source) =>
              (library[field] as List<dynamic>).map((v) => source[v as String]!).toList();
          exercises.add(AssignedExercise(
            id: prescribed['id'] as String, catalogId: id, name: library['name'] as String,
            coachObservation: prescribed['coach_observation'] as String? ?? '',
            trackingType: library['tracking_type'] as String,
            instructions: library['instructions'] as Map<String, dynamic>,
            equipment: names('equipment', equipment), primaryMuscles: names('primary_muscles', muscles),
            secondaryMuscles: names('secondary_muscles', muscles),
            variantId: prescribed['variant'] as String?,
            alternativeId: alternateId, alternativeName: catalog[alternateId]?['name'] as String?,
            alternativeInstructions: catalog[alternateId]?['instructions'] as Map<String, dynamic>? ?? {},
            sets: (prescribed['sets'] as List<dynamic>).map((s) => SetTarget.fromJson(s as Map<String, dynamic>)).toList(),
          ));
        }
        plans.add(StudentWorkout(assignmentId: assignment['id'] as String, dayId: day['id'] as String,
          name: '${template['name']} · ${day['name']}', version: template['version'] as int,
          startsOn: assignment['starts_on'] as String, endsOn: assignment['ends_on'] as String?,
          objective: template['objective'] as String? ?? '', notes: template['notes'] as String? ?? '', exercises: exercises));
      }
    }
    await store.write(_cacheKey, jsonEncode({'saved_at': DateTime.now().toUtc().toIso8601String(),
      'plans': plans.map((p) => p.toJson()).toList()}));
    return plans;
  }

  @override
  Future<List<StudentWorkout>> cachedWorkouts() async {
    final raw = await store.read(_cacheKey);
    if (raw == null) return [];
    final data = jsonDecode(raw) as Map<String, dynamic>;
    return (data['plans'] as List<dynamic>).map((p) => StudentWorkout.fromJson(p as Map<String, dynamic>)).toList();
  }

  @override
  Future<List<Map<String, dynamic>>> history() async {
    await _checkMembership();
    return client.list('api/workouts/sessions/');
  }

  @override
  Future<Map<String, dynamic>> submit(PendingWorkout item) async {
    await _checkMembership();
    return (await client.request('POST', 'api/workouts/sessions/', body: workoutPayloadForApi(item.payload)))! as Map<String, dynamic>;
  }

  String get _onboardingKey => 'student.preferences.v1.$storageNamespace';
  @override
  Future<OnboardingChoices?> onboarding() async {
    final raw = await store.read(_onboardingKey);
    // A new device still has to honor grants recorded by the server.
    final records = await client.list('api/tenancy/consents/');
    final saved = raw == null ? <String, dynamic>{...const OnboardingChoices().toJson()}
        : jsonDecode(raw) as Map<String, dynamic>;
    final purposes = {...const OnboardingChoices().consents.keys, ...(saved['consents'] as Map<String, dynamic>).keys};
    saved['consents'] = <String, dynamic>{for (final purpose in purposes)
      purpose: records.any((c) => c['subject'] == identity.id && c['purpose'] == purpose && c['granted'] == true)};
    return OnboardingChoices.fromJson(saved);
  }

  @override
  Future<void> saveOnboarding(OnboardingChoices choices) async {
    // Retry/update known records instead of granting a second copy on every edit.
    if (choices.skipped) {
      await store.write(_onboardingKey, jsonEncode({...choices.toJson(), 'completed': true}));
      return;
    }
    final changed = choices.consents.entries.where((entry) => choices.changedConsentPurposes.contains(entry.key)).toList();
    final existing = changed.isEmpty ? <Map<String, dynamic>>[] : await client.list('api/tenancy/consents/');
    for (final entry in changed) {
      final records = existing.where((c) => c['subject'] == identity.id && c['purpose'] == entry.key).toList();
      if (!entry.value) {
        for (final record in records.where((c) => c['granted'] == true)) {
          await client.request('POST', 'api/tenancy/consents/${record['id']}/revoke/');
        }
      } else if (!records.any((c) => c['granted'] == true)) {
        await client.request('POST', 'api/tenancy/consents/', body: {
          'subject': identity.id, 'purpose': entry.key, 'granted': true,
          'evidence': {'source': 'student_app', 'notice_version': 'mvp-2026-10',
            'recorded_at': DateTime.now().toUtc().toIso8601String()},
        });
      }
    }
    await store.write(_onboardingKey, jsonEncode({...choices.toJson(), 'completed': true}));
  }
}

class DemoStudentGateway implements StudentGateway {
  bool failSync = false;
  bool conflictSync = false;
  OnboardingChoices? _choices;
  final List<Map<String, dynamic>> _history = [];
  @override
  bool get isDemo => true;
  @override
  String get storageNamespace => 'demo.${identity.storageScope}';
  @override
  StudentIdentity get identity => StudentIdentity(id: demoRepository.student.id,
    tenantId: demoRepository.student.tenantId, name: demoRepository.student.name,
    academy: demoRepository.student.academyName);
  @override
  Future<List<StudentWorkout>> workouts() async => [StudentWorkout(
    assignmentId: demoRepository.getWorkouts().first.id, dayId: 'demo-day-a',
    name: 'Treino A · demonstração', version: 1, startsOn: '2026-01-01',
    objective: 'Exemplo de organização da sua rotina', notes: 'Dados fictícios. Conteúdo aguarda revisão profissional.',
    exercises: [for (final item in demoRepository.getWorkouts().first.exercises)
      AssignedExercise(id: item.id, catalogId: item.id, name: item.name,
        coachObservation: item.coachObservation,
        instructions: {'Preparação': item.instructions, 'Execução': 'Aguarda revisão profissional.',
          'Respiração': 'Aguarda revisão profissional.', 'Erros comuns': 'Aguarda revisão profissional.'},
        equipment: const ['Halter · exemplo'], primaryMuscles: const ['Quadríceps · exemplo'],
        secondaryMuscles: const ['Glúteos · exemplo'],
        alternativeId: 'demo-alternative', alternativeName: 'Alternativa ilustrativa do professor',
        alternativeInstructions: const {'Instrução': 'Exemplo fictício. Aguarda revisão profissional.'},
        sets: [for (var i = 0; i < 3; i++) SetTarget(id: '${item.sets.first.id}-$i', order: i + 1,
          minReps: 10, maxReps: 12, restSeconds: 60, note: item.sets.first.note ?? '')]),
    ],
  )];
  @override
  Future<List<StudentWorkout>> cachedWorkouts() => workouts();
  @override
  Future<List<Map<String, dynamic>>> history() async => List.from(_history);
  @override
  Future<Map<String, dynamic>> submit(PendingWorkout item) async {
    if (failSync) throw const ApiFailure('Sem conexão de demonstração. Pendente neste aparelho.');
    if (conflictSync) throw const ApiFailure('Conflito de demonstração. Registro preservado.', status: 409);
    final existing = _history.where((s) => s['idempotency_key'] == item.key);
    if (existing.isNotEmpty) return existing.first;
    final result = <String, dynamic>{...workoutPayloadForApi(item.payload), 'id': item.key};
    _history.insert(0, result);
    return result;
  }
  @override
  Future<void> saveOnboarding(OnboardingChoices choices) async {
    _choices = OnboardingChoices.fromJson({...choices.toJson(), 'completed': true});
  }
  @override
  Future<OnboardingChoices?> onboarding() async => _choices;
}
