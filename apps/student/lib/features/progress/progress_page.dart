import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/widgets/student_widgets.dart';
import '../workouts/workout_pages.dart';
import 'progress_models.dart';

class ProgressPage extends StatefulWidget {
  const ProgressPage({super.key, required this.repository});
  final StudentHealthRepository repository;
  @override
  State<ProgressPage> createState() => _ProgressPageState();
}

class _ProgressPageState extends State<ProgressPage> {
  List<Map<String, dynamic>> _assessments = [];
  bool _loading = true;
  String? _error, _metric;
  int _days = 90;
  @override
  void initState() { super.initState(); _load(); }
  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final items = await widget.repository.assessments();
      if (mounted) setState(() { _assessments = items; });
    } catch (_) { if (mounted) setState(() { _error = 'Não foi possível consultar avaliações liberadas. Confira seu acesso e tente novamente.'; }); }
    if (mounted) setState(() { _loading = false; });
  }
  Future<void> _report(Map<String, dynamic> assessment) async {
    try {
      final report = await widget.repository.assessmentReport(assessment['id'] as String);
      if (!mounted) return;
      await Navigator.push<void>(context, MaterialPageRoute(builder: (_) => AssessmentReportPage(
        assessment: assessment, report: report, assessments: _assessments)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Relatório indisponível ou ainda não liberado.')));
    }
  }
  Future<void> _history() async {
    try {
      final records = await widget.repository.gateway.history();
      if (mounted) await Navigator.push<void>(context, MaterialPageRoute(builder: (_) => SessionHistoryPage(sessions: records)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Histórico indisponível. Tente novamente.')));
    }
  }
  @override
  Widget build(BuildContext context) {
    final choices = <({Map<String, dynamic> measurement, Map<String, dynamic> assessment})>[];
    for (final a in _assessments.reversed) {
      for (final m in (a['measurements'] as List<dynamic>).cast<Map<String, dynamic>>()) {
        if (!choices.any((entry) => compatibleMeasurement(entry.measurement, m, entry.assessment, a))) {
          choices.add((measurement: m, assessment: a));
        }
      }
    }
    final choiceId = choices.any((entry) => entry.measurement['id'] == _metric) ? _metric :
        (choices.isEmpty ? null : choices.first.measurement['id'] as String);
    final chosen = choices.where((entry) => entry.measurement['id'] == choiceId);
    final selected = chosen.isEmpty ? null : chosen.first.measurement;
    final selectedAssessment = chosen.isEmpty ? null : chosen.first.assessment;
    final metric = selected?['metric'];
    final filtered = _assessments.where((a) => _days == 0 || DateTime.parse(a['assessed_at'] as String)
        .isAfter(DateTime.now().subtract(Duration(days: _days)))).toList();
    final series = selected == null ? <double?>[] : metricSeries(filtered, selected, selectedAssessment!);
    final maximum = series.whereType<double>().fold<double>(1, (a, b) => a > b.abs() ? a : b.abs());
    return PageBody(children: [
      Text('Meu progresso', style: Theme.of(context).textTheme.headlineMedium),
      const Text('Acompanhe seus registros com contexto. Variações não representam um julgamento.'),
      TextButton.icon(onPressed: _history, icon: const Icon(Icons.history), label: const Text('Calendário e histórico de treinos')),
      if (_loading) const LinearProgressIndicator(semanticsLabel: 'Carregando avaliações'),
      if (_error != null) StatusMessage(_error!, action: 'Tentar novamente', onAction: _load),
      if (!_loading && _error == null && _assessments.isEmpty) const StatusMessage('Nenhuma avaliação liberada. Fale com seu professor.'),
      if (choices.isNotEmpty) InputDecorator(decoration: const InputDecoration(labelText: 'Métrica e método'),
        child: DropdownButton<String>(value: choiceId, isExpanded: true, itemHeight: null, items: choices.map((entry) {
          final m = entry.measurement;
          return DropdownMenuItem(value: m['id'] as String, child: Text('${m['metric']} · ${m['unit']} · ${measurementMethod(m['method'])} · ${m['anatomical_site']} · ${measurementSide(m['side'])} · protocolo ${m['protocol'] ?? 'não informado'}', maxLines: 3));
        }).toList(), onChanged: (value) => setState(() { _metric = value; }))),
      Wrap(spacing: 8, children: [for (final entry in {30: '1 mês', 90: '3 meses', 180: '6 meses', 0: 'Tudo'}.entries)
        ChoiceChip(label: Text(entry.value), selected: _days == entry.key, onSelected: (_) => setState(() { _days = entry.key; }))]),
      if (selected != null) SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('$metric · ${selected['unit']} · ${measurementMethod(selected['method'])}'),
        const Text('Comparação exige mesmo método, unidade, protocolo, ponto, lado, aparelho e condições registradas. Cada barra representa uma avaliação. Lacunas indicam ausência de medida compatível; não são zero.'),
        for (var i = 0; i < series.length; i++) Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Column(
          crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${displayDate(filtered[i]['assessed_at'])}: ${series[i]?.toStringAsFixed(2) ?? 'Sem medida compatível'} ${series[i] == null ? '' : selected['unit']}'),
            if (series[i] != null) ExcludeSemantics(child: LinearProgressIndicator(value: series[i]!.abs() / maximum)),
          ])),
        const Text('Tabela acessível de valores'),
        for (var i = 0; i < series.length; i++) Text('${displayDate(filtered[i]['assessed_at'])} | ${series[i] ?? 'Lacuna'} | ${selected['unit']}'),
      ])),
      if (filtered.isEmpty && !_loading && _assessments.isNotEmpty) const Text('Sem avaliações neste intervalo.'),
      for (final assessment in filtered.reversed) ListTile(title: Text('Avaliação · ${displayDate(assessment['assessed_at'])}'),
        subtitle: const Text('Relatório liberado'), trailing: const Icon(Icons.chevron_right), onTap: () => _report(assessment)),
      const Text('Fotos de progresso permanecem privadas. Este app não envia nem exibe fotos sem um fluxo autorizado de consentimento.'),
    ]);
  }
}

class AssessmentReportPage extends StatelessWidget {
  const AssessmentReportPage({super.key, required this.assessment, required this.report, required this.assessments});
  final Map<String, dynamic> assessment, report;
  final List<Map<String, dynamic>> assessments;
  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Avaliação corporal')), body: PageBody(children: [
    Text(displayDate(assessment['assessed_at']), style: Theme.of(context).textTheme.headlineMedium),
    const Text('Avaliador: não informado. Confirme com a academia.'),
    Text('Aparelho: ${assessment['device']}'), Text('Condições de coleta: ${assessment['preparation_conditions']}'),
    const Text('Condições de hidratação, alimentação, exercício recente e horário podem afetar medidas. Procure condições consistentes na coleta.'),
    for (final measurement in (assessment['measurements'] as List<dynamic>).cast<Map<String, dynamic>>())
      SectionCard(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('${measurement['metric']}: ${measurement['raw_value']} ${measurement['unit']}'),
        Text('Método: ${measurementMethod(measurement['method'])} · protocolo: ${measurement['protocol'] ?? 'Não informado'}'),
        Text('Ponto: ${measurement['anatomical_site']} · lado: ${measurementSide(measurement['side'])} · origem: ${measurement['origin']}'),
        if ((measurement['equation_metadata'] as Map?)?.isNotEmpty == true) Text('Equação e aplicabilidade: ${measurement['equation_metadata']}'),
        if (measurement['possible_error'] == true) const Text('Medida sinalizada para revisão profissional.'),
        Text(_comparison(measurement)),
      ])),
    Text('Observações: ${assessment['notes']}'),
    Text('Interpretação profissional: ${report['professional_interpretation'] ?? 'Não informada'}'),
    const Text('Valores descritivos. IMC e medidas não constituem diagnóstico. Para exportação controlada, consulte Perfil e privacidade.'),
  ]));
  String _comparison(Map<String, dynamic> measurement) {
    for (final previous in assessments.reversed) {
      if (!DateTime.parse(previous['assessed_at'] as String).isBefore(DateTime.parse(assessment['assessed_at'] as String))) continue;
      for (final prior in (previous['measurements'] as List<dynamic>).cast<Map<String, dynamic>>()) {
        final change = compareMeasurement(measurement, prior, assessment, previous);
        if (change != null) return '${change.label}: ${change.difference.toStringAsFixed(2)} ${measurement['unit']} '
          '(${change.percent?.toStringAsFixed(2) ?? 'Percentual indisponível'}${change.percent == null ? '' : '%'}) '
          'desde ${displayDate(previous['assessed_at'])}.';
      }
    }
    return 'Sem comparação direta com avaliação anterior compatível.';
  }
}
