import '../workouts/workout_models.dart';

/// Comparisons are intentionally stricter than a label match. No unit conversion
/// or equivalence between devices, anatomical sites or equations is inferred.
bool compatibleMeasurement(
  Map<String, dynamic> a,
  Map<String, dynamic> b,
  Map<String, dynamic> assessmentA,
  Map<String, dynamic> assessmentB,
) {
  for (final key in [
    'metric',
    'unit',
    'side',
    'anatomical_site',
    'method',
    'protocol',
    'origin',
  ]) {
    if (a[key] != b[key]) return false;
  }
  if (a['possible_error'] == true || b['possible_error'] == true) return false;
  if (a['method'] == 'bioimpedance') {
    for (final assessment in [assessmentA, assessmentB]) {
      final device = assessment['device'];
      if (device is! Map ||
          ['brand', 'model'].any(
            (key) =>
                device[key] is! String ||
                (device[key] as String).trim().isEmpty,
          )) {
        return false;
      }
    }
  }
  bool same(Object? x, Object? y) {
    if (x is Map && y is Map) {
      return x.length == y.length &&
          x.keys.every((key) => y.containsKey(key) && same(x[key], y[key]));
    }
    if (x is List && y is List) {
      return x.length == y.length &&
          List.generate(x.length, (i) => same(x[i], y[i])).every((v) => v);
    }
    return x == y;
  }

  return same(a['equation_metadata'], b['equation_metadata']) &&
      same(assessmentA['device'], assessmentB['device']) &&
      same(
        assessmentA['preparation_conditions'],
        assessmentB['preparation_conditions'],
      );
}

String measurementSide(Object? side) =>
    const {
      'left': 'Esquerdo',
      'right': 'Direito',
      'bilateral': 'Bilateral',
    }[side] ??
    '$side';
String measurementMethod(Object? method) =>
    const {
      'circumference': 'Perímetros',
      'skinfold': 'Dobras cutâneas',
      'bioimpedance': 'Bioimpedância',
      'scale': 'Balança',
    }[method] ??
    '$method';

class MeasurementChange {
  const MeasurementChange(this.difference, this.percent);
  final double difference;
  final double? percent;
  String get label => difference > 0
      ? 'Aumentou'
      : difference < 0
      ? 'Diminuiu'
      : 'Sem alteração';
}

MeasurementChange? compareMeasurement(
  Map<String, dynamic> current,
  Map<String, dynamic> previous,
  Map<String, dynamic> assessment,
  Map<String, dynamic> priorAssessment,
) {
  if (!compatibleMeasurement(current, previous, assessment, priorAssessment)) {
    return null;
  }
  final value = number(current['raw_value']),
      prior = number(previous['raw_value']);
  if (value == null || prior == null) return null;
  return MeasurementChange(
    value - prior,
    prior == 0 ? null : (value - prior) / prior * 100,
  );
}

/// One entry per released assessment, including missing/incompatible samples.
List<double?> metricSeries(
  List<Map<String, dynamic>> assessments,
  Map<String, dynamic> selected,
  Map<String, dynamic> selectedAssessment,
) => assessments.map((assessment) {
  final values = (assessment['measurements'] as List<dynamic>? ?? [])
      .cast<Map<String, dynamic>>();
  for (final value in values) {
    if (compatibleMeasurement(
      selected,
      value,
      selectedAssessment,
      assessment,
    )) {
      return number(value['raw_value']);
    }
  }
  return null;
}).toList();

String displayDate(Object? value) {
  final date = DateTime.tryParse('$value')?.toLocal();
  if (date == null) return 'Não informado';
  return '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
}
