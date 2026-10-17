import 'dart:convert';

import 'package:flutter/material.dart';

import '../../core/widgets/student_widgets.dart';
import 'rest_timer.dart';
import 'workout_controller.dart';
import 'workout_models.dart';

class WorkoutPage extends StatefulWidget {
  const WorkoutPage({super.key, required this.plan, required this.queue, this.previous = const []});
  final StudentWorkout plan;
  final WorkoutSyncQueue queue;
  final List<Map<String, dynamic>> previous;
  @override
  State<WorkoutPage> createState() => _WorkoutPageState();
}

class _WorkoutPageState extends State<WorkoutPage> {
  late WorkoutController _flow = WorkoutController(plan: widget.plan, previous: widget.previous);
  bool _started = false, _restoring = true;
  String? _draftError;
  Future<void> _draftWrites = Future<void>.value();
  String get _draftKey => '${widget.queue.gateway.isDemo ? 'demo' : 'api'}.student.draft.v1.${widget.queue.gateway.storageNamespace}.${widget.plan.assignmentId}.${widget.plan.dayId}';
  @override
  void initState() { super.initState(); _restoreDraft(); }
  Future<void> _restoreDraft() async {
    try {
      final raw = await widget.queue.store.read(_draftKey);
      if (!mounted) return;
      if (raw != null) {
        final draft = jsonDecode(raw) as Map<String, dynamic>;
        // A completed queue entry is authoritative; never reopen it as a new session.
        if (!widget.queue.pending.any((p) => p.key == draft['session_key']) &&
            !widget.previous.any((p) => p['idempotency_key'] == draft['session_key'])) {
          final restored = WorkoutController(plan: widget.plan, previous: widget.previous, draft: draft);
          _flow.dispose();
          _flow = restored;
          _started = true;
        }
      }
    } catch (_) { _draftError = 'Não foi possível recuperar o treino em andamento. O registro salvo foi preservado. Tente abrir novamente.'; }
    if (mounted) setState(() { _restoring = false; });
    _flow.addListener(_saveDraft);
  }
  void _saveDraft() {
    if (_flow.finished) return;
    final snapshot = jsonEncode(_flow.draftJson());
    _draftWrites = _draftWrites.then((_) => widget.queue.store.write(_draftKey, snapshot)).catchError((Object error) {
      if (mounted) setState(() { _draftError = 'Não foi possível salvar o rascunho neste aparelho. Mantenha o app aberto e tente salvar o treino.'; });
    });
  }
  @override
  void dispose() { _flow.removeListener(_saveDraft); _flow.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: _flow, builder: (context, _) => Scaffold(
    appBar: AppBar(title: Text(_started ? 'Seu treino em andamento' : 'Treino de hoje')),
    body: PageBody(children: [
      Text(widget.plan.name, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 8), Text('Versão ${widget.plan.version} · ${widget.plan.exercises.length} exercícios'),
      Text('Vigência: ${widget.plan.startsOn}${widget.plan.endsOn == null ? '' : ' até ${widget.plan.endsOn}'}'),
      if (widget.plan.objective.isNotEmpty) Text(widget.plan.objective),
      const SizedBox(height: 16),
      if (widget.plan.notes.isNotEmpty) StatusMessage(widget.plan.notes),
      if (!widget.plan.availableToday) const StatusMessage('Este treino está fora da vigência. Peça orientação à academia.'),
      if (_restoring) const LinearProgressIndicator(semanticsLabel: 'Recuperando treino em andamento'),
      if (_draftError != null) StatusMessage(_draftError!),
      if (!_started) FilledButton(onPressed: _restoring || _draftError != null || !widget.plan.availableToday || widget.plan.exercises.isEmpty ? null :
        () { setState(() { _started = true; }); _saveDraft(); }, child: const Text('Começar treino')),
      const SizedBox(height: 16),
      for (var i = 0; i < widget.plan.exercises.length; i++)
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          ListTile(contentPadding: EdgeInsets.zero, leading: CircleAvatar(child: Text('${i + 1}')),
            title: Text(widget.plan.exercises[i].name),
            subtitle: Text('${widget.plan.exercises[i].sets.length} séries · ${_flow.logs[i].skipped ? 'Pulado' : '${_flow.logs[i].sets.length} registradas'}'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push<void>(context, MaterialPageRoute(builder: (_) =>
              ExercisePage(flow: _flow, exerciseIndex: i, canExecute: _started && widget.plan.availableToday)))),
          if (widget.plan.exercises[i].coachObservation.isNotEmpty)
            Text('Professor: ${widget.plan.exercises[i].coachObservation}'),
        ])),
      if (_started) ...[
        Text('${_flow.completedSets} séries registradas · ${_flow.skippedExercises} exercícios pulados'),
        const SizedBox(height: 16),
        FilledButton(onPressed: () => Navigator.push<bool>(context, MaterialPageRoute(builder: (_) =>
          WorkoutSummaryPage(flow: _flow, queue: widget.queue, onSaved: () async {
            await _draftWrites;
            await widget.queue.store.delete(_draftKey);
          }))).then((saved) async {
            if (saved == true && context.mounted) Navigator.pop(context);
          }), child: const Text('Finalizar e revisar treino')),
      ],
    ]),
  ));
}

class ExercisePage extends StatelessWidget {
  const ExercisePage({super.key, required this.flow, required this.exerciseIndex, this.canExecute = true});
  final WorkoutController flow;
  final int exerciseIndex;
  final bool canExecute;
  @override
  Widget build(BuildContext context) {
    final exercise = flow.plan.exercises[exerciseIndex];
    return Scaffold(appBar: AppBar(title: const Text('Detalhe do exercício')),
      body: PageBody(children: [
        Text(exercise.name, style: Theme.of(context).textTheme.headlineSmall), const SizedBox(height: 16),
        const SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.ondemand_video_outlined, size: 48), SizedBox(height: 8),
          Text('Mídia aprovada indisponível'),
          Text('Consulte as instruções em texto. Peça ao professor uma demonstração se tiver dúvidas.'),
        ])),
        CoachObservation(exercise.coachObservation),
        SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Primários: ${exercise.primaryMuscles.isEmpty ? 'Não informado' : exercise.primaryMuscles.join(', ')}'),
          Text('Secundários: ${exercise.secondaryMuscles.isEmpty ? 'Não informado' : exercise.secondaryMuscles.join(', ')}'),
          Text('Equipamento: ${exercise.equipment.isEmpty ? 'Não informado' : exercise.equipment.join(', ')}'),
        ])),
        InstructionsCard(instructions: exercise.instructions),
        if (exercise.variantId != null) const StatusMessage(
          'Há uma variação prescrita. Os detalhes da variação ainda não estão disponíveis na API. Confirme a execução com o professor.'),
        Text('Metas por série', style: Theme.of(context).textTheme.titleLarge),
        for (final target in exercise.sets) ListTile(contentPadding: EdgeInsets.zero,
          title: Text('Série ${target.order} · ${target.label}'),
          subtitle: target.note.isEmpty ? null : Text('Nota desta série: ${target.note}')),
        if (exercise.alternativeName != null) StatusMessage('Alternativa do professor: ${exercise.alternativeName}'),
        FilledButton(onPressed: canExecute && !flow.finished ? () => Navigator.push<void>(context,
          MaterialPageRoute(builder: (_) => SetsPage(flow: flow, exerciseIndex: exerciseIndex))) : null,
          child: const Text('Começar séries')),
      ]));
  }
}

class InstructionsCard extends StatelessWidget {
  const InstructionsCard({super.key, required this.instructions, this.title = 'Instruções da biblioteca'});
  final Map<String, dynamic> instructions;
  final String title;
  @override
  Widget build(BuildContext context) => SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: Theme.of(context).textTheme.titleMedium), const SizedBox(height: 8),
    if (instructions.isEmpty) const Text('Instrução textual não informada. Confirme com o professor.'),
    for (final entry in instructions.entries) ...[
      Text(_label(entry.key), style: const TextStyle(fontWeight: FontWeight.bold)),
      Text(entry.value is List ? (entry.value as List<dynamic>).join('\n') : '${entry.value}'),
      const SizedBox(height: 8),
    ],
  ]));
  String _label(String key) => const {'setup': 'Preparação', 'execution': 'Execução',
    'breathing': 'Respiração', 'common_mistakes': 'Erros comuns', 'tips': 'Dicas'}[key] ?? key;
}

class SetsPage extends StatefulWidget {
  const SetsPage({super.key, required this.flow, required this.exerciseIndex});
  final WorkoutController flow;
  final int exerciseIndex;
  @override
  State<SetsPage> createState() => _SetsPageState();
}

class _SetsPageState extends State<SetsPage> {
  int? _rest;
  int _restKey = 0;
  late final TextEditingController _note = TextEditingController(text: widget.flow.logs[widget.exerciseIndex].personalNote);
  @override
  void dispose() { _note.dispose(); super.dispose(); }
  Future<void> _substitute() async {
    final exercise = widget.flow.plan.exercises[widget.exerciseIndex];
    final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
      title: const Text('Usar alternativa do professor?'),
      content: Text('${exercise.alternativeName}\nAs séries registradas deste exercício serão limpas para registrar a alternativa. '
        'Registre somente o que realizou. Os alvos originais não serão usados como recomendação. A substituição ficará identificada na sua nota.'),
      actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Voltar')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Usar alternativa'))]));
    if (confirmed == true && mounted) { widget.flow.substitute(widget.exerciseIndex); setState(() { _rest = null; }); }
  }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(animation: widget.flow, builder: (context, _) {
    final exercise = widget.flow.plan.exercises[widget.exerciseIndex];
    final log = widget.flow.logs[widget.exerciseIndex];
    return Scaffold(appBar: AppBar(title: const Text('Registrar execução')),
      body: PageBody(children: [
        Text(log.substituted ? exercise.alternativeName! : exercise.name, style: Theme.of(context).textTheme.headlineSmall),
        const SizedBox(height: 16), CoachObservation(exercise.coachObservation),
        if (log.substituted) ...[
          const StatusMessage('Substituição registrada na nota. Informe os valores realizados; sem alvos automáticos.'),
          InstructionsCard(instructions: exercise.alternativeInstructions, title: 'Instruções da alternativa'),
        ],
        if (log.skipped) const StatusMessage('Exercício pulado. Para retomar, registre uma série.'),
        for (final target in exercise.sets) SetEntryCard(
          key: ValueKey('${target.id}.${log.substituted}'),
          target: target, trackingType: log.substituted ? 'substitution' : exercise.trackingType,
          previous: log.substituted ? null : widget.flow.previousSet(exercise.id, target.id),
          initial: log.sets[target.id],
          onRecord: (values) {
            widget.flow.record(widget.exerciseIndex, target, values);
            setState(() { _rest = target.restSeconds; _restKey++; });
          }),
        if (_rest != null) RestTimer(key: ValueKey(_restKey), seconds: _rest!),
        SectionCard(child: TextField(controller: _note, maxLines: 3, maxLength: 1000,
          decoration: const InputDecoration(labelText: 'Minha anotação (opcional)',
            helperText: 'Seu registro pessoal, separado da observação do professor.'),
          onChanged: (value) { widget.flow.setExerciseNote(widget.exerciseIndex, value); })),
        Wrap(spacing: 8, children: [
          OutlinedButton(onPressed: () async {
            final confirmed = await showDialog<bool>(context: context, builder: (context) => AlertDialog(
              title: const Text('Pular este exercício?'), content: const Text('As séries deste exercício serão limpas. Você pode voltar e registrar novamente.'),
              actions: [TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Voltar')),
                FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Pular exercício'))]));
            if (confirmed == true && mounted) { widget.flow.skip(widget.exerciseIndex); setState(() { _rest = null; }); }
          }, child: const Text('Pular exercício')),
          if (exercise.alternativeId != null && !log.substituted)
            OutlinedButton(onPressed: _substitute, child: const Text('Substituir exercício')),
        ]),
        const SizedBox(height: 16),
        FilledButton(onPressed: () => Navigator.pop(context), child: const Text('Voltar ao treino')),
      ]));
  });
}

class SetEntryCard extends StatefulWidget {
  const SetEntryCard({super.key, required this.target, required this.trackingType,
    this.previous, this.initial, required this.onRecord});
  final SetTarget target;
  final String trackingType;
  final Map<String, dynamic>? previous, initial;
  final void Function(Map<String, dynamic>) onRecord;
  @override
  State<SetEntryCard> createState() => _SetEntryCardState();
}

class _SetEntryCardState extends State<SetEntryCard> {
  final _form = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _fields = {for (final name in
    ['load_kg', 'repetitions', 'duration_seconds', 'distance_meters', 'rpe'])
      name: TextEditingController(text: widget.initial?[name]?.toString() ?? '')};
  late bool _registered = widget.initial != null;
  @override
  void dispose() { for (final c in _fields.values) { c.dispose(); } super.dispose(); }
  Map<String, String> get _labels => {
    if (widget.trackingType == 'load_reps' || widget.trackingType == 'substitution') 'load_kg': 'Carga (kg)',
    if (['load_reps', 'bodyweight_reps', 'substitution'].contains(widget.trackingType)) 'repetitions': 'Repetições',
    if (['duration', 'activity', 'distance', 'substitution'].contains(widget.trackingType)) 'duration_seconds': 'Duração (s)',
    if (['distance', 'substitution'].contains(widget.trackingType)) 'distance_meters': 'Distância (m)',
    'rpe': 'RPE realizado 0–10 (opcional)',
  };
  String? _validate(String field, String? value) {
    if (value == null || value.trim().isEmpty) return null;
    final parsed = double.tryParse(value.replaceAll(',', '.'));
    if (parsed == null || !parsed.isFinite || parsed < 0) return 'Use um número positivo ou zero.';
    if (['repetitions', 'duration_seconds'].contains(field) && parsed != parsed.roundToDouble()) return 'Use um número inteiro.';
    if (field == 'rpe' && parsed > 10) return 'RPE deve estar entre 0 e 10.';
    return null;
  }
  void _record() {
    if (!_form.currentState!.validate()) return;
    final values = <String, dynamic>{};
    for (final key in _labels.keys) {
      final raw = _fields[key]!.text.trim().replaceAll(',', '.');
      if (raw.isEmpty) continue;
      values[key] = ['repetitions', 'duration_seconds'].contains(key) ? double.parse(raw).toInt() : double.parse(raw);
    }
    if (values.keys.every((key) => key == 'rpe')) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Registre ao menos um valor realizado.')));
      return;
    }
    widget.onRecord(values);
    setState(() { _registered = true; });
  }
  @override
  Widget build(BuildContext context) => SectionCard(child: Form(key: _form, child: Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('Série ${widget.target.order}${_registered ? ' · registrada' : ''}', style: Theme.of(context).textTheme.titleMedium),
      if (widget.trackingType != 'substitution') Text('Prescrição: ${widget.target.label}'),
      if (widget.target.note.isNotEmpty) Text('Nota da série: ${widget.target.note}'),
      const SizedBox(height: 8),
      Text(widget.previous == null ? 'Sem registro anterior para esta série.' : 'Anterior: ${formatSetValues(widget.previous!)}'),
      const Text('Histórico para consulta. Os campos não são preenchidos automaticamente.'),
      const SizedBox(height: 12),
      for (final entry in _labels.entries) Padding(padding: const EdgeInsets.only(bottom: 12), child: TextFormField(
        controller: _fields[entry.key], keyboardType: const TextInputType.numberWithOptions(decimal: true),
        decoration: InputDecoration(labelText: entry.value), validator: (v) => _validate(entry.key, v))),
      FilledButton.icon(onPressed: _record, icon: Icon(_registered ? Icons.check_circle : Icons.check),
        label: Text(_registered ? 'Atualizar série ${widget.target.order}' : 'Concluir série ${widget.target.order}')),
    ],
  )));
}

String formatSetValues(Map<String, dynamic> set) => [
  if (set['load_kg'] != null) '${set['load_kg']} kg',
  if (set['repetitions'] != null) '${set['repetitions']} reps',
  if (set['duration_seconds'] != null) '${set['duration_seconds']} s',
  if (set['distance_meters'] != null) '${set['distance_meters']} m',
  if (set['rpe'] != null) 'RPE ${set['rpe']}',
].join(' · ');

class WorkoutSummaryPage extends StatefulWidget {
  const WorkoutSummaryPage({super.key, required this.flow, required this.queue, this.onSaved});
  final WorkoutController flow;
  final WorkoutSyncQueue queue;
  final Future<void> Function()? onSaved;
  @override
  State<WorkoutSummaryPage> createState() => _WorkoutSummaryPageState();
}

class _WorkoutSummaryPageState extends State<WorkoutSummaryPage> {
  late final TextEditingController _note = TextEditingController(text: widget.flow.note);
  bool _saving = false, _saved = false;
  String? _error;
  @override
  void dispose() { _note.dispose(); super.dispose(); }
  Future<void> _save() async {
    setState(() { _saving = true; _error = null; });
    try {
      widget.flow.note = _note.text;
      await widget.queue.enqueue(widget.flow.finish());
      if (mounted) setState(() { _saved = true; });
      try { await widget.onSaved?.call(); } catch (_) {
        if (mounted) setState(() { _error = 'Sessão salva. A limpeza do rascunho ficou pendente neste aparelho.'; });
      }
      await widget.queue.sync();
    } catch (_) {
      if (mounted) setState(() { _error = 'Não foi possível salvar neste aparelho. Mantenha esta tela aberta e tente novamente.'; });
    } finally { if (mounted) setState(() { _saving = false; }); }
  }
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Resumo do treino')),
    body: PageBody(children: [
      const Icon(Icons.check_circle_outline, size: 64), const SizedBox(height: 16),
      Text(_saved ? 'Seu treino foi registrado' : 'Revise seu treino', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 16),
      SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Duração: ${DateTime.now().toUtc().difference(widget.flow.startedAt).inMinutes} min'),
        Text('Exercícios com registros: ${widget.flow.registeredExercises}/${widget.flow.plan.exercises.length}'),
        Text('Séries registradas: ${widget.flow.completedSets}'),
        Text('Exercícios pulados: ${widget.flow.skippedExercises}'),
      ])),
      for (final log in widget.flow.logs) ListTile(contentPadding: EdgeInsets.zero,
        title: Text(log.exercise.name), subtitle: Text(log.skipped ? 'Pulado' : '${log.sets.length} séries registradas')),
      TextField(controller: _note, enabled: !_saved && !widget.flow.finished, maxLines: 3,
        onChanged: widget.flow.setSessionNote,
        decoration: const InputDecoration(labelText: 'Como foi seu treino? (opcional)')),
      const SizedBox(height: 16),
      if (_error != null) StatusMessage(_error!),
      if (!_saved) FilledButton(onPressed: _saving ? null : _save,
        child: Text(_saving ? 'Salvando…' : 'Salvar treino')),
      if (_saved) ...[
        AnimatedBuilder(animation: widget.queue, builder: (context, _) {
          final local = widget.queue.pending.where((p) => p.key == widget.flow.sessionKey);
          return StatusMessage(local.isEmpty ? 'Sincronizado com a academia.' :
            '${local.first.status == SyncStatus.conflict ? 'Conflito para revisão' : 'Pendente de sincronização'} · '
            'Registro salvo neste aparelho. ${local.first.error ?? 'Você pode tentar novamente em Treinos.'}');
        }),
        FilledButton(onPressed: _saving ? null : () => Navigator.pop(context, true), child: const Text('Voltar para início')),
      ],
    ]));
}

class SessionHistoryPage extends StatefulWidget {
  const SessionHistoryPage({super.key, required this.sessions});
  final List<Map<String, dynamic>> sessions;
  @override
  State<SessionHistoryPage> createState() => _SessionHistoryPageState();
}

class _SessionHistoryPageState extends State<SessionHistoryPage> {
  DateTimeRange? _range;
  Future<void> _chooseRange() async {
    final range = await showDateRangePicker(context: context,
      firstDate: DateTime(2000), lastDate: DateTime.now().add(const Duration(days: 365)), initialDateRange: _range,
      helpText: 'Período do histórico');
    if (range != null && mounted) setState(() { _range = range; });
  }
  @override
  Widget build(BuildContext context) {
    final filtered = widget.sessions.where((session) {
      if (_range == null) return true;
      final started = DateTime.parse(session['started_at'] as String).toLocal();
      final day = DateTime(started.year, started.month, started.day);
      return !day.isBefore(_range!.start) && !day.isAfter(_range!.end);
    });
    final sorted = [...filtered]..sort((a, b) => '${b['started_at']}'.compareTo('${a['started_at']}'));
    return Scaffold(appBar: AppBar(title: const Text('Histórico de treinos')),
      body: PageBody(children: [
        Wrap(spacing: 8, children: [
          OutlinedButton.icon(onPressed: _chooseRange, icon: const Icon(Icons.date_range), label: const Text('Escolher período')),
          if (_range != null) TextButton(onPressed: () => setState(() { _range = null; }), child: const Text('Todos os registros')),
        ]),
        const SizedBox(height: 16),
        if (sorted.isEmpty) StatusMessage(_range == null ? 'Nenhuma sessão sincronizada ainda. Os registros pendentes aparecem em Treinos.' : 'Nenhuma sessão neste período.'),
        for (final session in sorted) SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Sessão · ${localDate(session['started_at'] as String)}', style: Theme.of(context).textTheme.titleMedium),
          Text(session['completed_at'] == null ? 'Sem término registrado' : 'Finalizado · ${localDate(session['completed_at'] as String)}'),
          if ((session['student_note'] as String? ?? '').isNotEmpty) Text('Minha nota da sessão: ${session['student_note']}'),
          for (final raw in session['exercise_logs'] as List<dynamic>? ?? [])
            _historyExercise(raw as Map<String, dynamic>),
        ])),
      ]));
  }
  List<Widget> _separateNotes(Map<String, dynamic> log) {
    final localAlternative = log['selected_alternative'] as Map<String, dynamic>?;
    String? alternativeName = localAlternative?['name'] as String?;
    var personal = log['personal_note'] as String? ?? log['note'] as String? ?? '';
    const start = '[Substituição informada pelo aluno]\n';
    const middle = '\n[/Substituição]\n[Minha anotação]\n';
    const end = '\n[/Minha anotação]';
    if (personal.startsWith(start) && personal.contains(middle) && personal.endsWith(end)) {
      final parts = personal.substring(start.length).split(middle);
      alternativeName = parts.first;
      personal = parts.sublist(1).join(middle);
      personal = personal.substring(0, personal.length - end.length);
    }
    return [
      if (alternativeName != null) Text('Alternativa escolhida: $alternativeName'),
      if (personal.isNotEmpty) Text('Minha anotação: $personal'),
    ];
  }
  Widget _historyExercise(Map<String, dynamic> log) => Padding(padding: const EdgeInsets.only(top: 12), child: Column(
    crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(log['skipped'] == true ? 'Exercício pulado' : 'Exercício registrado'),
      ..._separateNotes(log),
      for (final raw in log['set_logs'] as List<dynamic>? ?? []) Text(formatSetValues(raw as Map<String, dynamic>)),
    ]));
}

String localDate(String timestamp) {
  final date = DateTime.parse(timestamp).toLocal();
  String pad(int n) => n.toString().padLeft(2, '0');
  return '${pad(date.day)}/${pad(date.month)}/${date.year} ${pad(date.hour)}:${pad(date.minute)}';
}
