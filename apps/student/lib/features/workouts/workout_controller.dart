import 'dart:convert';

import 'package:flutter/foundation.dart';

import '../../core/api/api_client.dart';
import '../../core/data/student_gateway.dart';
import '../../core/storage/private_store.dart';
import 'workout_models.dart';

class ExerciseDraft {
  ExerciseDraft(this.exercise);
  final AssignedExercise exercise;
  final Map<String, Map<String, dynamic>> sets = {};
  bool skipped = false;
  String personalNote = '';
  String? selectedAlternative;
  bool get substituted => selectedAlternative != null;
  Map<String, dynamic> toJson() => {
    'workout_exercise': exercise.id, 'skipped': skipped,
    'personal_note': personalNote,
    'selected_alternative': selectedAlternative == null ? null : {'id': selectedAlternative, 'name': exercise.alternativeName},
    'set_logs': skipped ? <Map<String, dynamic>>[] : sets.values.toList(),
  };
}

class WorkoutController extends ChangeNotifier {
  WorkoutController({required this.plan, this.previous = const [], Map<String, dynamic>? draft})
      : logs = plan.exercises.map(ExerciseDraft.new).toList(),
        startedAt = draft == null ? DateTime.now().toUtc() : DateTime.parse(draft['started_at'] as String),
        sessionKey = draft == null ? newSessionKey() : draft['session_key'] as String {
    if (draft == null) return;
    if (draft['version'] != plan.version) {
      throw const ApiFailure('O treino salvo pertence a outra versão. Peça ajuda ao professor antes de continuar.', status: 409);
    }
    note = draft['note'] as String? ?? '';
    for (final raw in draft['logs'] as List<dynamic>) {
      final saved = raw as Map<String, dynamic>;
      final matches = logs.where((log) => log.exercise.id == saved['exercise_id']);
      if (matches.isEmpty) continue;
      final log = matches.single;
      log.skipped = saved['skipped'] as bool;
      log.selectedAlternative = saved['selected_alternative'] as String?;
      log.personalNote = saved['personal_note'] as String;
      final sets = saved['sets'] as Map<String, dynamic>;
      for (final entry in sets.entries) {
        log.sets[entry.key] = entry.value as Map<String, dynamic>;
      }
    }
  }
  final StudentWorkout plan;
  final List<Map<String, dynamic>> previous;
  final List<ExerciseDraft> logs;
  final DateTime startedAt;
  final String sessionKey;
  String note = '';
  PendingWorkout? _finished;
  bool get finished => _finished != null;
  int get completedSets => logs.fold(0, (total, log) => total + (log.skipped ? 0 : log.sets.length));
  int get registeredExercises => logs.where((l) => !l.skipped && l.sets.isNotEmpty).length;
  int get skippedExercises => logs.where((l) => l.skipped).length;

  Map<String, Object?> draftJson() => {
    'version': plan.version, 'session_key': sessionKey, 'started_at': startedAt.toIso8601String(), 'note': note,
    'logs': [for (final log in logs) {'exercise_id': log.exercise.id, 'skipped': log.skipped,
      'selected_alternative': log.selectedAlternative, 'personal_note': log.personalNote, 'sets': log.sets}],
  };
  void setExerciseNote(int index, String value) {
    if (finished) return;
    logs[index].personalNote = value;
    notifyListeners();
  }
  void setSessionNote(String value) { if (!finished) { note = value; notifyListeners(); } }

  void record(int index, SetTarget target, Map<String, dynamic> values) {
    if (finished) return;
    logs[index].skipped = false;
    logs[index].sets[target.id] = {'prescription': logs[index].substituted ? null : target.id, ...values};
    notifyListeners();
  }
  void skip(int index) {
    if (finished) return;
    logs[index].skipped = true;
    logs[index].sets.clear();
    notifyListeners();
  }
  void substitute(int index) {
    if (finished || logs[index].exercise.alternativeId == null) return;
    logs[index].selectedAlternative = logs[index].substituted ? null : logs[index].exercise.alternativeId;
    logs[index].sets.clear();
    logs[index].skipped = false;
    notifyListeners();
  }

  Map<String, dynamic>? previousSet(String exerciseId, String prescriptionId) {
    final sorted = [...previous]..sort((a, b) => '${b['started_at']}'.compareTo('${a['started_at']}'));
    for (final session in sorted) {
      for (final raw in session['exercise_logs'] as List<dynamic>? ?? []) {
        final log = raw as Map<String, dynamic>;
        if (log['workout_exercise'] != exerciseId || log['skipped'] == true) continue;
        for (final item in log['set_logs'] as List<dynamic>? ?? []) {
          final set = item as Map<String, dynamic>;
          if (set['prescription'] == prescriptionId) return set;
        }
      }
    }
    return null;
  }

  PendingWorkout finish() => _finished ??= PendingWorkout(payload: {
    'assignment': plan.assignmentId, 'idempotency_key': sessionKey,
    'started_at': startedAt.toIso8601String(), 'completed_at': DateTime.now().toUtc().toIso8601String(),
    'student_note': note,
    'exercise_logs': logs.where((l) => l.skipped || l.sets.isNotEmpty || l.personalNote.isNotEmpty || l.substituted)
        .map((l) => l.toJson()).toList(),
  });
}

/// Compare only submitted fields. IDs/timestamps added by the API are ignored;
/// decimal strings and equivalent UTC timestamp representations are normalized.
bool sameSubmittedSession(Object? local, Object? remote, {String? field}) {
  if (local is Map<String, dynamic> && remote is Map<String, dynamic>) {
    return local.entries.every((e) => remote.containsKey(e.key) &&
        sameSubmittedSession(e.value, remote[e.key], field: e.key));
  }
  if (local is List && remote is List) {
    if (local.length != remote.length) return false;
    final left = [...local], right = [...remote];
    if (left.isNotEmpty && left.first is Map<String, dynamic>) {
      final map = left.first as Map<String, dynamic>;
      final key = map.containsKey('workout_exercise') ? 'workout_exercise' : 'prescription';
      left.sort((a, b) => '${(a as Map<String, dynamic>)[key]}'.compareTo('${(b as Map<String, dynamic>)[key]}'));
      right.sort((a, b) => '${(a as Map<String, dynamic>)[key]}'.compareTo('${(b as Map<String, dynamic>)[key]}'));
    }
    for (var i = 0; i < left.length; i++) {
      if (!sameSubmittedSession(left[i], right[i])) return false;
    }
    return true;
  }
  if (local is num) return local == number(remote);
  if (local is String && remote is String && (field == 'started_at' || field == 'completed_at')) {
    return DateTime.tryParse(local) == DateTime.tryParse(remote);
  }
  return local == remote;
}

class WorkoutSyncQueue extends ChangeNotifier {
  WorkoutSyncQueue({required this.gateway, required this.store});
  final StudentGateway gateway;
  final PrivateStore store;
  final List<PendingWorkout> _pending = [];
  bool syncing = false;
  bool _disposed = false;
  @override
  void dispose() { _disposed = true; super.dispose(); }
  void _notify() { if (!_disposed) notifyListeners(); }
  String? error;
  List<PendingWorkout> get pending => List.unmodifiable(_pending);
  String get _key => '${gateway.isDemo ? 'demo' : 'api'}.student.pending.v1.${gateway.storageNamespace}';

  Future<void> restore() async {
    final raw = await store.read(_key);
    if (raw != null) {
      _pending.clear();
      _pending.addAll((jsonDecode(raw) as List<dynamic>).map((e) => PendingWorkout.fromJson(e as Map<String, dynamic>)));
    }
    _notify();
  }
  Future<void> _writes = Future<void>.value();
  Future<void> _persist() {
    final snapshot = jsonEncode(_pending.map((p) => p.toJson()).toList());
    final write = _writes.then((_) => store.write(_key, snapshot));
    _writes = write.catchError((Object error) {});
    return write;
  }

  Future<void> enqueue(PendingWorkout item) async {
    final duplicate = _pending.where((p) => p.key == item.key);
    if (duplicate.isNotEmpty) {
      if (!sameSubmittedSession(item.payload, duplicate.first.payload)) {
        throw const ApiFailure('A sessão já foi encerrada. O registro original foi preservado.', status: 409);
      }
      return;
    }
    _pending.add(item);
    try { await _persist(); } catch (_) { _pending.remove(item); rethrow; }
    _notify();
  }

  Future<void> sync() async {
    if (syncing) return;
    syncing = true; error = null; _notify();
    try {
      for (final item in [..._pending]) {
        if (item.status == SyncStatus.conflict) continue;
        final index = _pending.indexOf(item);
        try {
          final response = await gateway.submit(item);
          if (!sameSubmittedSession(workoutPayloadForApi(item.payload), response)) {
            _pending[index] = item.withState(SyncStatus.conflict,
              'A API devolveu uma sessão diferente para esta chave. Compare o histórico com este registro local.',
              serverId: response['id'] as String?);
          } else {
            _pending.removeAt(index);
          }
        } on ApiFailure catch (failure) {
          final status = failure.status == 409 ? SyncStatus.conflict
              : failure.status == null || failure.status == 401 || failure.status == 429 || failure.status! >= 500
                  ? SyncStatus.pending : SyncStatus.rejected;
          _pending[index] = item.withState(status, failure.message);
          error = failure.message;
          await _persist();
          break;
        }
        try { await _persist(); } catch (_) {
          if (!_pending.any((p) => p.key == item.key)) _pending.insert(index, item);
          rethrow;
        }
      }
    } catch (_) { error = 'Não foi possível confirmar a sincronização. Seu registro local será mantido.'; }
    finally { syncing = false; _notify(); }
  }
}
