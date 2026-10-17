import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/api/api_client.dart';
import '../../core/widgets/student_widgets.dart';
import '../progress/progress_models.dart';
import 'nutrition_models.dart';

class NutritionEntryPage extends StatefulWidget {
  const NutritionEntryPage({super.key, required this.repository, required this.resource, required this.day, this.version, this.slot, this.food, this.snapshot, this.grams});
  final StudentHealthRepository repository;
  final String resource;
  final DateTime day;
  final String? version, slot;
  final Map<String, dynamic>? food, snapshot;
  final double? grams;
  @override
  State<NutritionEntryPage> createState() => _NutritionEntryPageState();
}
class _NutritionEntryPageState extends State<NutritionEntryPage> {
  final _description = TextEditingController(), _note = TextEditingController(), _question = TextEditingController(), _water = TextEditingController(), _portion = TextEditingController();
  late DateTime _date = widget.day;
  TimeOfDay _time = TimeOfDay.now();
  String? _adherence, _error;
  bool _busy = false, _saved = false;
  bool get _dirty => [_description, _note, _question, _water, _portion].any((c) => c.text.isNotEmpty) || _adherence != null;
  @override
  void initState() { super.initState(); if (widget.food != null) _description.text = '${widget.food!['name']} · ${widget.food!['preparation_state']}'; }
  @override
  void dispose() { for (final c in [_description, _note, _question, _water, _portion]) { c.dispose(); } super.dispose(); }
  Future<void> _save() async {
    setState(() { _busy = true; _error = null; });
    try {
      final logged = DateTime(_date.year, _date.month, _date.day, _time.hour, _time.minute).toUtc().toIso8601String();
      final Map<String, dynamic> payload;
      switch (widget.resource) {
        case 'check-ins':
          if (_adherence == null) throw ArgumentError('Escolha uma opção, se desejar registrar.');
          payload = {'version': widget.version, 'meal_slot': widget.slot, 'adherence': _adherence, 'note': _note.text.trim(), 'question': _question.text.trim(), 'checked_at': logged};
        case 'hydration-logs':
          final amount = int.tryParse(_water.text);
          if (amount == null || amount <= 0) throw ArgumentError('Informe um volume inteiro positivo em ml.');
          payload = {'logged_at': logged, 'milliliters': amount};
        case 'messages':
          if (_question.text.trim().isEmpty) throw ArgumentError('Escreva sua pergunta.');
          payload = {'student': widget.repository.gateway.identity.id, 'body': _question.text.trim(), 'shared_with_coach': false};
        default:
          if (_description.text.trim().isEmpty) throw ArgumentError('Descreva a refeição.');
          payload = {'logged_at': logged, 'description': [_description.text.trim(), if (_portion.text.isNotEmpty) 'Porção informada: ${_portion.text}', if (_note.text.isNotEmpty) 'Observação do aluno: ${_note.text}'].join('\n'),
            if (widget.food != null) 'food': widget.food!['id'], if (widget.grams != null) 'grams': widget.grams.toString()};
      }
      final item = await widget.repository.draft(widget.resource, payload, snapshot: widget.snapshot);
      _saved = true;
      if (!mounted) return;
      await Navigator.pushReplacement<void, void>(context, MaterialPageRoute(builder: (_) => IntentReviewPage(repository: widget.repository, item: item)));
    } catch (error) { if (mounted) setState(() { _error = error is ArgumentError ? '${error.message}' : 'Não foi possível salvar neste aparelho. Seus campos permanecem aqui.'; }); }
    if (mounted) setState(() { _busy = false; });
  }
  @override
  Widget build(BuildContext context) => PopScope(canPop: _saved || !_dirty, onPopInvokedWithResult: (didPop, result) async {
    if (didPop) return;
    final discard = await showDialog<bool>(context: context, builder: (context) => AlertDialog(title: const Text('Descartar dados não salvos?'),
      content: const Text('Os campos desta tela ainda não foram salvos neste aparelho.'), actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Continuar preenchendo')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Descartar'))]));
    if (discard == true && mounted) { setState(() { _saved = true; }); Navigator.pop(context); }
  }, child: Scaffold(appBar: AppBar(title: Text(widget.resource == 'check-ins' ? 'Como foi a refeição?' : 'Novo registro')), body: PageBody(children: [
    const Text('Você decide o que registrar. Não existe resposta certa ou errada.'),
    TextButton(onPressed: () async { final date = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2000), lastDate: DateTime.now());
      if (date != null && mounted) setState(() { _date = date; }); }, child: Text('Data: ${displayDate(_date.toIso8601String())}')),
    TextButton(onPressed: () async { final time = await showTimePicker(context: context, initialTime: _time);
      if (time != null && mounted) setState(() { _time = time; }); }, child: Text('Horário: ${_time.format(context)}')),
    if (widget.resource == 'check-ins') ...[
      for (final entry in adherenceLabels.entries) ListTile(title: Text(entry.value), leading: Icon(_adherence == entry.key ? Icons.radio_button_checked : Icons.radio_button_off),
        onTap: () => setState(() { _adherence = entry.key; })),
    ],
    if (widget.resource == 'meal-logs') ...[
      TextField(controller: _description, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Descrição da refeição avulsa'), maxLines: 3),
      TextField(controller: _portion, onChanged: (_) => setState(() {}), decoration: const InputDecoration(labelText: 'Porção (opcional)')),
    ],
    if (widget.resource == 'hydration-logs') TextField(controller: _water, onChanged: (_) => setState(() {}), keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Água em ml')),
    if (widget.resource == 'meal-logs' || widget.resource == 'check-ins') TextField(controller: _note, onChanged: (_) => setState(() {}), maxLines: 3, decoration: const InputDecoration(labelText: 'Observação (opcional)')),
    if (widget.resource == 'check-ins' || widget.resource == 'messages') TextField(controller: _question, onChanged: (_) => setState(() {}), maxLines: 3, decoration: const InputDecoration(labelText: 'Pergunta para o nutricionista')),
    if (_error != null) StatusMessage(_error!),
    FilledButton(onPressed: _busy ? null : _save, child: const Text('Salvar neste aparelho e revisar')),
  ])));
}

class IntentReviewPage extends StatefulWidget {
  const IntentReviewPage({super.key, required this.repository, required this.item});
  final StudentHealthRepository repository;
  final NutritionIntent item;
  @override
  State<IntentReviewPage> createState() => _IntentReviewPageState();
}
class _IntentReviewPageState extends State<IntentReviewPage> {
  bool _busy = false, _reviewed = false;
  String? _error;
  List<Map<String, dynamic>>? _server;
  Future<void> _run(Future<void> Function() action) async {
    setState(() { _busy = true; _error = null; });
    try { await action(); } catch (error) { _error = error is ApiFailure ? error.message : 'A ação não foi confirmada. Confira o estado local e o diário antes de qualquer novo envio.'; }
    if (mounted) setState(() { _busy = false; });
  }
  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final needsReview = item.state == 'uncertain' || item.state == 'rejected';
    return Scaffold(appBar: AppBar(title: const Text('Conferir registro')), body: PageBody(children: [
      Text(nutritionResourceLabels[item.resource] ?? 'Registro'), Text(nutritionRecordDetails(item.resource, item.payload)),
      Text('Estado: ${intentStateLabels[item.state]}'),
      Text('Referência local para suporte: ${item.id}'),
      if (item.state == 'confirmed') const StatusMessage('Registro confirmado no diário.'),
      if (item.state == 'draft') FilledButton(onPressed: _busy ? null : () => _run(() => widget.repository.send(item)), child: const Text('Enviar registro')),
      if (needsReview) ...[
        const StatusMessage('O envio pode ter sido recebido pela academia. Não há repetição automática. Atualize o diário e confira data, conteúdo e quantidade.'),
        OutlinedButton(onPressed: _busy ? null : () => _run(() async { _server = await widget.repository.records(item.resource); _reviewed = false; }), child: const Text('Consultar diário da academia')),
        if (_server != null) ...[
          for (final record in _server!) SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(nutritionRecordDetails(item.resource, record)),
            TextButton(onPressed: _busy ? null : () => _run(() => widget.repository.reconcile(item, existingId: record['id'] as String)), child: const Text('Este é o meu registro')),
          ])),
          CheckboxListTile(value: _reviewed, title: const Text('Conferi o diário e confirmo que este registro não foi recebido.'), onChanged: _busy ? null : (v) => setState(() { _reviewed = v == true; })),
          TextButton(onPressed: !_reviewed || _busy ? null : () => _run(() => widget.repository.reconcile(item, confirmedAbsent: true)), child: const Text('Preparar nova tentativa após conferência')),
        ],
      ],
      if (_busy) const LinearProgressIndicator(semanticsLabel: 'Conferindo registro'),
      if (_error != null) StatusMessage(_error!),
      const Text('O registro fica criptografado neste aparelho. Sair ou trocar de academia não envia nem descarta estes dados.'),
    ]));
  }
}
