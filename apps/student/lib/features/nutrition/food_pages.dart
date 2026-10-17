import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/widgets/student_widgets.dart';
import '../workouts/workout_models.dart';
import 'nutrition_models.dart';
import 'nutrient_summary.dart';
import 'nutrition_entry_page.dart';

class FoodSearchPage extends StatefulWidget {
  const FoodSearchPage({super.key, required this.repository, required this.day, this.selectionMode = false});
  final bool selectionMode;
  final StudentHealthRepository repository;
  final DateTime day;
  @override
  State<FoodSearchPage> createState() => _FoodSearchPageState();
}
class _FoodSearchPageState extends State<FoodSearchPage> {
  final _query = TextEditingController();
  String _source = 'tbca';
  bool _loading = false;
  String? _error;
  List<Map<String, dynamic>> _foods = [];
  int _generation = 0;
  @override
  void dispose() { _query.dispose(); super.dispose(); }
  Future<void> _search() async {
    final generation = ++_generation;
    setState(() { _loading = true; _error = null; _foods = []; });
    try {
      final foods = await widget.repository.searchFoods(_query.text.trim(), _source);
      if (mounted && generation == _generation) setState(() { _foods = foods; });
    } catch (_) { if (mounted && generation == _generation) setState(() { _error = 'Busca indisponível. Tente novamente.'; }); }
    if (mounted && generation == _generation) setState(() { _loading = false; });
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Buscar alimentos')), body: PageBody(children: [
    const Text('TBCA é a primeira fonte. Consulte USDA como complemento. Escolha o registro correspondente ao preparo consumido.'),
    TextField(controller: _query, decoration: const InputDecoration(labelText: 'Alimento e preparo'), onSubmitted: (_) => _search()),
    Wrap(spacing: 8, children: [for (final entry in {'tbca': 'TBCA', 'usda': 'USDA FoodData Central'}.entries)
      ChoiceChip(label: Text(entry.value), selected: _source == entry.key, onSelected: (_) { setState(() { _source = entry.key; }); _search(); })]),
    FilledButton(onPressed: _loading ? null : _search, child: const Text('Buscar')),
    if (_loading) const LinearProgressIndicator(semanticsLabel: 'Buscando alimentos'),
    if (_error != null) StatusMessage(_error!),
    if (!_loading && _foods.isEmpty) const Text('Nenhum resultado nesta fonte. Você pode consultar a fonte complementar.'),
    for (final food in _foods) SectionCard(child: ListTile(contentPadding: EdgeInsets.zero,
      title: Text('${food['name']} · ${food['preparation_state']}'),
      subtitle: Text('${(food['source'] as Map)['name']} · ${(food['source'] as Map)['version']}\n${food['branded'] == true ? 'Produto de marca/rotulagem' : 'Alimento genérico'}'),
      trailing: const Icon(Icons.chevron_right), onTap: () async {
        final selected = await Navigator.push<FoodPortionSelection>(context, MaterialPageRoute(builder: (_) => FoodPortionPage(
          repository: widget.repository, food: food, day: widget.day, selectionMode: widget.selectionMode)));
        if (widget.selectionMode && selected != null && context.mounted) Navigator.pop(context, selected);
      })),
  ]));
}

class FoodPortionPage extends StatefulWidget {
  const FoodPortionPage({super.key, required this.repository, required this.food, required this.day, this.selectionMode = false});
  final bool selectionMode;
  final StudentHealthRepository repository;
  final Map<String, dynamic> food;
  final DateTime day;
  @override
  State<FoodPortionPage> createState() => _FoodPortionPageState();
}
class _FoodPortionPageState extends State<FoodPortionPage> {
  final _grams = TextEditingController(text: '100');
  Map<String, dynamic>? _snapshot;
  String? _error;
  String? get quantityError {
    try { normalizeMealGrams(_grams.text); return null; } on ArgumentError catch (error) { return '${error.message}'; }
  }
  double? get grams => quantityError == null ? double.parse(normalizeMealGrams(_grams.text)) : null;
  bool get valid => quantityError == null;
  @override
  void initState() { super.initState(); _load(); }
  @override
  void dispose() { _grams.dispose(); super.dispose(); }
  Future<void> _load() async {
    try {
      final snapshot = await widget.repository.calculate(widget.food['id'] as String);
      if (mounted) setState(() { _snapshot = snapshot; _error = null; });
    } catch (_) { if (mounted) setState(() { _error = 'Composição indisponível. Confira sua conexão e tente novamente.'; }); }
  }
  @override
  Widget build(BuildContext context) {
    final measures = (widget.food['household_measures'] as List<dynamic>).cast<Map<String, dynamic>>()
      .where((m) => '${m['evidence'] ?? ''}'.trim().isNotEmpty && (number(m['grams']) ?? 0) > 0);
    return Scaffold(appBar: AppBar(title: const Text('Quantidade e composição')), body: PageBody(children: [
      Text('${widget.food['name']} · ${widget.food['preparation_state']}'),
      Text('Fonte: ${(widget.food['source'] as Map)['name']} · ${(widget.food['source'] as Map)['version']}'),
      const Text('Preparo e fonte pertencem a este registro. Para outro preparo, escolha outro resultado da busca.'),
      TextField(controller: _grams, keyboardType: const TextInputType.numberWithOptions(decimal: true), onChanged: (_) => setState(() {}),
        decoration: InputDecoration(labelText: 'Gramas comestíveis', errorText: quantityError)),
      for (final measure in measures) TextButton(onPressed: () => setState(() { _grams.text = householdGrams(measure, 1).toString(); }),
        child: Text('Usar 1 ${measure['name']} = ${measure['grams']} g · ${measure['evidence']}')),
      if (measures.isEmpty) const Text('Sem medida caseira documentada para este alimento.'),
      if (_error != null) StatusMessage(_error!, action: 'Tentar novamente', onAction: _load),
      if (_snapshot == null && _error == null) const LinearProgressIndicator(semanticsLabel: 'Carregando composição'),
      if (_snapshot != null) ...[
        NutrientSummary(values: portionNutrients(_snapshot!, 100), title: 'Valores por 100 g', snapshot: _snapshot),
        if (valid) NutrientSummary(values: portionNutrients(_snapshot!, grams!), title: 'Porção aproximada · $grams g', snapshot: _snapshot),
        const Text('Valores estimados. Nutrientes ausentes não equivalem a zero.'),
      ],
      FilledButton(onPressed: !valid || _snapshot == null ? null : () {
        if (widget.selectionMode) {
          Navigator.pop(context, FoodPortionSelection(food: widget.food, snapshot: _snapshot!, grams: grams!));
        } else {
          Navigator.push<void>(context, MaterialPageRoute(builder: (_) => NutritionEntryPage(
            repository: widget.repository, resource: 'meal-logs', day: widget.day, food: widget.food, snapshot: _snapshot, grams: grams)));
        }
      }, child: Text(widget.selectionMode ? 'Adicionar à refeição' : 'Adicionar ao diário avulso')),
    ]));
  }
}
