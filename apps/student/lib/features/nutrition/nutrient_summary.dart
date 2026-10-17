import 'package:flutter/material.dart';
import '../../core/widgets/student_widgets.dart';
import 'nutrition_models.dart';

class NutrientSummary extends StatelessWidget {
  const NutrientSummary({super.key, required this.values, required this.title, this.snapshot});
  final Map<String, double?> values;
  final String title;
  final Map<String, dynamic>? snapshot;
  @override
  Widget build(BuildContext context) => SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: Theme.of(context).textTheme.titleMedium),
    for (final entry in values.entries) Text('${nutrientLabels[entry.key] ?? (snapshot?['nutrients'] as Map?)?[entry.key]?['name'] ?? entry.key}: '
      '${entry.value?.toStringAsFixed(2) ?? 'não informado'} ${entry.value == null ? '' : (snapshot?['nutrients'] as Map?)?[entry.key]?['unit'] ?? (entry.key == 'energy_kcal' ? 'kcal' : 'g')}'),
  ]));
}
