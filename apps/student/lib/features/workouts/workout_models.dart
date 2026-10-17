import 'dart:convert';
import 'dart:math';

double? number(Object? value) => value == null ? null : double.tryParse('$value');

class SetTarget {
  const SetTarget({required this.id, required this.order, this.minReps, this.maxReps,
    this.loadKg, this.durationSeconds, this.distanceMeters, this.restSeconds = 0, this.note = ''});
  final String id;
  final int order;
  final int? minReps, maxReps, durationSeconds;
  final double? loadKg, distanceMeters;
  final int restSeconds;
  final String note;
  String get label => [
    if (minReps != null) '${minReps}${maxReps != null && maxReps != minReps ? '–$maxReps' : ''} reps',
    if (loadKg != null) '$loadKg kg',
    if (durationSeconds != null) '$durationSeconds s',
    if (distanceMeters != null) '$distanceMeters m',
    '$restSeconds s descanso',
  ].join(' · ');
  factory SetTarget.fromJson(Map<String, dynamic> json) => SetTarget(
    id: json['id'] as String, order: json['order'] as int,
    minReps: json['repetitions_min'] as int?, maxReps: json['repetitions_max'] as int?,
    loadKg: number(json['load_kg']), durationSeconds: json['duration_seconds'] as int?,
    distanceMeters: number(json['distance_meters']), restSeconds: json['rest_seconds'] as int? ?? 0,
    note: json['note'] as String? ?? '',
  );
  Map<String, Object?> toJson() => {'id': id, 'order': order, 'repetitions_min': minReps,
    'repetitions_max': maxReps, 'load_kg': loadKg, 'duration_seconds': durationSeconds,
    'distance_meters': distanceMeters, 'rest_seconds': restSeconds, 'note': note};
}

class AssignedExercise {
  const AssignedExercise({required this.id, required this.catalogId, required this.name,
    required this.coachObservation, required this.sets, this.trackingType = 'load_reps',
    this.instructions = const {}, this.equipment = const [], this.primaryMuscles = const [],
    this.secondaryMuscles = const [], this.alternativeId, this.alternativeName,
    this.alternativeInstructions = const {}, this.variantId});
  final String id, catalogId, name, coachObservation, trackingType;
  final String? alternativeId, alternativeName, variantId;
  final Map<String, dynamic> instructions, alternativeInstructions;
  final List<String> equipment, primaryMuscles, secondaryMuscles;
  final List<SetTarget> sets;
  factory AssignedExercise.fromJson(Map<String, dynamic> json) => AssignedExercise(
    id: json['id'] as String, catalogId: json['catalog_id'] as String,
    name: json['name'] as String, coachObservation: json['coach_observation'] as String,
    trackingType: json['tracking_type'] as String, variantId: json['variant_id'] as String?,
    instructions: json['instructions'] as Map<String, dynamic>,
    alternativeInstructions: json['alternative_instructions'] as Map<String, dynamic>? ?? {},
    equipment: (json['equipment'] as List<dynamic>).cast<String>(),
    primaryMuscles: (json['primary_muscles'] as List<dynamic>).cast<String>(),
    secondaryMuscles: (json['secondary_muscles'] as List<dynamic>).cast<String>(),
    alternativeId: json['alternative_id'] as String?, alternativeName: json['alternative_name'] as String?,
    sets: (json['sets'] as List<dynamic>).map((e) => SetTarget.fromJson(e as Map<String, dynamic>)).toList(),
  );
  Map<String, Object?> toJson() => {'id': id, 'catalog_id': catalogId, 'name': name,
    'coach_observation': coachObservation, 'tracking_type': trackingType, 'instructions': instructions,
    'equipment': equipment, 'primary_muscles': primaryMuscles, 'secondary_muscles': secondaryMuscles,
    'alternative_id': alternativeId, 'alternative_name': alternativeName,
    'alternative_instructions': alternativeInstructions, 'variant_id': variantId,
    'sets': sets.map((s) => s.toJson()).toList()};
}

class StudentWorkout {
  const StudentWorkout({required this.assignmentId, required this.dayId, required this.name,
    required this.version, required this.startsOn, this.endsOn, required this.exercises,
    this.objective = '', this.notes = ''});
  final String assignmentId, dayId, name, objective, notes, startsOn;
  final String? endsOn;
  final int version;
  final List<AssignedExercise> exercises;
  bool get availableToday {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return !today.isBefore(DateTime.parse(startsOn)) &&
        (endsOn == null || !today.isAfter(DateTime.parse(endsOn!)));
  }
  factory StudentWorkout.fromJson(Map<String, dynamic> json) => StudentWorkout(
    assignmentId: json['assignment_id'] as String, dayId: json['day_id'] as String,
    name: json['name'] as String, version: json['version'] as int,
    startsOn: json['starts_on'] as String, endsOn: json['ends_on'] as String?,
    objective: json['objective'] as String, notes: json['notes'] as String,
    exercises: (json['exercises'] as List<dynamic>)
        .map((e) => AssignedExercise.fromJson(e as Map<String, dynamic>)).toList(),
  );
  Map<String, Object?> toJson() => {'assignment_id': assignmentId, 'day_id': dayId,
    'name': name, 'version': version, 'starts_on': startsOn, 'ends_on': endsOn,
    'objective': objective, 'notes': notes, 'exercises': exercises.map((e) => e.toJson()).toList()};
}

enum SyncStatus { pending, rejected, conflict }

class PendingWorkout {
  PendingWorkout({required Map<String, dynamic> payload, this.status = SyncStatus.pending,
    this.error, this.serverId}) : payload = jsonDecode(jsonEncode(payload)) as Map<String, dynamic>;
  final Map<String, dynamic> payload;
  final SyncStatus status;
  final String? error, serverId;
  String get key => payload['idempotency_key'] as String;
  PendingWorkout withState(SyncStatus state, String message, {String? serverId}) => PendingWorkout(
    payload: payload, status: state, error: message, serverId: serverId ?? this.serverId,
  );
  Map<String, Object?> toJson() => {'payload': payload, 'status': status.name, 'error': error, 'server_id': serverId};
  factory PendingWorkout.fromJson(Map<String, dynamic> json) => PendingWorkout(
    payload: json['payload'] as Map<String, dynamic>,
    status: SyncStatus.values.byName(json['status'] as String),
    error: json['error'] as String?, serverId: json['server_id'] as String?,
  );
}

String newSessionKey() {
  final random = Random.secure();
  return List.generate(24, (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0')).join();
}
