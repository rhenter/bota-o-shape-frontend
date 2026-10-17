import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/widgets/student_widgets.dart';
import 'food_pages.dart';
import 'nutrient_summary.dart';
import 'nutrition_models.dart';

/// The backend stores one food per MealLog. The common title/time is descriptive;
/// this page does not invent an atomic multi-item API operation.
class FoodMealDraftPage extends StatefulWidget {
  const FoodMealDraftPage({super.key, required this.repository, required this.day});
  final StudentHealthRepository repository;
  final DateTime day;
  @override
  State<FoodMealDraftPage> createState() => _FoodMealDraftPageState();
}
class _FoodMealDraftPageState extends State<FoodMealDraftPage> {
  final _title = TextEditingController(text: 'Refeição avulsa');
  final List<FoodPortionSelection> _items = [];
  late final String _mealId = newNutritionIntentId();
  TimeOfDay _time = TimeOfDay.now();
  bool _busy = false, _discard = false;
  int _saved = 0;
  String? _error;
  @override
  void dispose() { _title.dispose(); super.dispose(); }
  Future<void> _add() async {
    final selection = await Navigator.push<FoodPortionSelection>(context, MaterialPageRoute(builder: (_) => FoodSearchPage(
      repository: widget.repository, day: widget.day, selectionMode: true)));
    if (selection != null && mounted) setState(() { _items.add(selection); });
  }
  Future<void> _save() async {
    setState(() { _busy = true; _error = null; });
    final date = widget.day;
    final logged = DateTime(date.year, date.month, date.day, _time.hour, _time.minute).toUtc().toIso8601String();
    try {
      while (_items.isNotEmpty) {
        final item = _items.first;
        await widget.repository.draft('meal-logs', {'description': '${_title.text.trim()}\n${item.food['name']} · ${item.food['preparation_state']}',
          'logged_at': logged, 'food': item.food['id'], 'grams': item.grams.toString()},
          snapshot: {...item.snapshot, 'local_meal_id': _mealId, 'meal_title': _title.text.trim()});
        // Remove only after durable save so a partial storage failure never
        // creates duplicate local intents on the next explicit save attempt.
        _items.removeAt(0); _saved++;
      }
      if (mounted) {
        setState(() { _busy = false; _discard = true; });
        await WidgetsBinding.instance.endOfFrame;
        if (mounted) Navigator.pop(context);
      }
    } catch (_) { if (mounted) setState(() { _error = '$_saved alimentos salvos neste aparelho. Os restantes continuam nesta tela. Nenhum foi enviado automaticamente.'; }); }
    if (mounted) setState(() { _busy = false; });
  }
  @override
  Widget build(BuildContext context) => PopScope(canPop: !_busy && (_items.isEmpty || _discard), onPopInvokedWithResult: (didPop, _) async {
    if (didPop || _busy) return;
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Descartar alimentos ainda não salvos?'), content: Text('$_saved registros já salvos permanecem neste aparelho.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Continuar')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Descartar'))]));
    if (confirmed == true && mounted) { setState(() { _discard = true; }); Navigator.pop(context); }
  }, child: Scaffold(appBar: AppBar(title: const Text('Minha refeição avulsa')), body: PageBody(children: [
    TextField(controller: _title, enabled: !_busy, decoration: const InputDecoration(labelText: 'Nome da refeição')),
    TextButton(onPressed: _busy ? null : () async {
      final value = await showTimePicker(context: context, initialTime: _time);
      if (value != null && mounted) setState(() { _time = value; });
    }, child: Text('Horário: ${_time.format(context)}')),
    for (var i = 0; i < _items.length; i++) ListTile(title: Text('${_items[i].food['name']} · ${_items[i].food['preparation_state']}'),
      subtitle: Text('${_items[i].grams} g · ${_items[i].snapshot['source']} · ${_items[i].snapshot['source_version']}'),
      trailing: IconButton(tooltip: 'Remover alimento não salvo', onPressed: _busy ? null : () => setState(() { _items.removeAt(i); }), icon: const Icon(Icons.remove_circle_outline))),
    NutrientSummary(values: sumNutrients(_items.map((item) => portionNutrients(item.snapshot, item.grams)).toList()), title: 'Total aproximado da refeição'),
    OutlinedButton(onPressed: _busy ? null : _add, child: const Text('Adicionar alimento')),
    const Text('Cada alimento gera um registro individual no diário. Os registros são salvos neste aparelho para revisão e envio separado. Não alteram seu plano alimentar.'),
    if (_error != null) StatusMessage(_error!),
    FilledButton(onPressed: _busy || _items.isEmpty ? null : _save, child: const Text('Salvar alimentos neste aparelho')),
  ])));
}
