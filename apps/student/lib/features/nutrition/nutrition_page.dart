import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/widgets/student_widgets.dart';
import '../progress/progress_models.dart';
import 'nutrition_models.dart';
import 'nutrient_summary.dart';
import 'nutrition_entry_page.dart';
import 'food_pages.dart';
import 'food_meal_draft_page.dart';

class NutritionPage extends StatefulWidget {
  const NutritionPage({super.key, required this.repository});
  final StudentHealthRepository repository;
  @override
  State<NutritionPage> createState() => _NutritionPageState();
}

class _NutritionPageState extends State<NutritionPage> {
  List<Map<String, dynamic>> _plans = [],
      _meals = [],
      _water = [],
      _checks = [],
      _messages = [];
  Map<String, Map<String, double?>> _mealNutrients = {};
  DateTime _day = DateTime.now();
  int _planDay = 1;
  bool _loading = true, _cached = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _cached = false;
      _plans = [];
      _meals = [];
      _water = [];
      _checks = [];
      _messages = [];
    });
    try {
      await widget.repository.restore();
      final plans = await widget.repository.plans();
      final meals = await widget.repository.records('meal-logs');
      final nutrients = await widget.repository.diaryNutrients(meals);
      final water = await widget.repository.records('hydration-logs');
      final checks = await widget.repository.records('check-ins');
      final messages = await widget.repository.records('messages');
      if (mounted) {
        setState(() {
          _plans = plans;
          _meals = meals;
          _mealNutrients = nutrients;
          _water = water;
          _checks = checks;
          _messages = messages;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Não foi possível atualizar seus dados. Registros locais foram preservados.';
        });
      }
    }
    if (mounted) {
      setState(() {
        _loading = false;
      });
    }
  }

  bool _onDay(Map<String, dynamic> value, String key) {
    final date = DateTime.tryParse('${value[key]}')?.toLocal();
    return date != null &&
        date.year == _day.year &&
        date.month == _day.month &&
        date.day == _day.day;
  }

  Future<void> _open(Widget page) async {
    await Navigator.push<void>(
      context,
      MaterialPageRoute(builder: (_) => page),
    );
    if (mounted) await _load();
  }

  Future<void> _cachedCopy() async {
    try {
      final copy = await widget.repository.cachedPlans();
      if (mounted) {
        setState(() {
          _cached = true;
          _plans = (copy?['items'] as List<dynamic>? ?? [])
              .cast<Map<String, dynamic>>();
          _error =
              'Cópia salva em ${displayDate(copy?['saved_at'])}. Pode estar desatualizada. Check-ins exigem atualização online.';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Não foi possível abrir a cópia criptografada.';
        });
      }
    }
  }

  Future<void> _editDiary(Map<String, dynamic> record, String resource) async {
    final field = resource == 'meal-logs' ? 'description' : 'milliliters';
    var edited = '${record[field]}';
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Editar registro avulso'),
        content: TextFormField(
          initialValue: edited,
          onChanged: (value) => edited = value,
          decoration: InputDecoration(
            labelText: field == 'description' ? 'Descrição' : 'Água em ml',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, edited.trim()),
            child: const Text('Salvar alteração'),
          ),
        ],
      ),
    );
    if (value == null || value.isEmpty) return;
    final Object changed;
    if (field == 'milliliters') {
      final amount = int.tryParse(value);
      if (amount == null || amount <= 0) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Informe um volume inteiro positivo em ml.'),
            ),
          );
        }
        return;
      }
      changed = amount;
    } else {
      changed = value;
    }
    try {
      await widget.repository.editDiary(resource, record['id'] as String, {
        field: changed,
      });
      if (mounted) await _load();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Alteração não confirmada. Atualize o diário antes de tentar novamente.';
        });
      }
    }
  }

  Future<void> _deleteDiary(
    Map<String, dynamic> record,
    String resource,
  ) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Excluir este registro avulso?'),
        content: Text('$record'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Excluir registro'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    try {
      await widget.repository.deleteDiary(resource, record['id'] as String);
      if (mounted) await _load();
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Exclusão não confirmada. Atualize o diário para conferir.';
        });
      }
    }
  }

  Widget _diaryActions(Map<String, dynamic> record, String resource) => Wrap(
    children: [
      TextButton(
        onPressed: _loading ? null : () => _editDiary(record, resource),
        child: const Text('Editar'),
      ),
      TextButton(
        onPressed: _loading ? null : () => _deleteDiary(record, resource),
        child: const Text('Excluir'),
      ),
    ],
  );
  @override
  Widget build(BuildContext context) {
    final meals = _meals.where((m) => _onDay(m, 'logged_at')).toList();
    final water = _water
        .where((m) => _onDay(m, 'logged_at'))
        .fold<int>(0, (n, m) => n + (m['milliliters'] as int));
    final snapshots = meals
        .map(
          (m) =>
              _mealNutrients[m['id']] ??
              <String, double?>{
                for (final code in nutrientLabels.keys) code: null,
              },
        )
        .toList();
    return PageBody(
      children: [
        Text(
          'Sua rotina de alimentação',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const Text('Registros opcionais, sem pontuação ou julgamento.'),
        Row(
          children: [
            IconButton(
              tooltip: 'Dia anterior',
              onPressed: () => setState(() {
                _day = _day.subtract(const Duration(days: 1));
              }),
              icon: const Icon(Icons.chevron_left),
            ),
            Expanded(
              child: TextButton(
                onPressed: () async {
                  final day = await showDatePicker(
                    context: context,
                    initialDate: _day,
                    firstDate: DateTime(2000),
                    lastDate: DateTime.now(),
                  );
                  if (day != null && mounted) {
                    setState(() {
                      _day = day;
                    });
                  }
                },
                child: Text(displayDate(_day.toIso8601String())),
              ),
            ),
            IconButton(
              tooltip: 'Próximo dia',
              onPressed:
                  DateTime(_day.year, _day.month, _day.day).isBefore(
                    DateTime(
                      DateTime.now().year,
                      DateTime.now().month,
                      DateTime.now().day,
                    ),
                  )
                  ? () => setState(() {
                      _day = _day.add(const Duration(days: 1));
                    })
                  : null,
              icon: const Icon(Icons.chevron_right),
            ),
          ],
        ),
        if (_loading)
          const LinearProgressIndicator(semanticsLabel: 'Carregando nutrição'),
        if (_error != null)
          StatusMessage(_error!, action: 'Atualizar', onAction: _load),
        if (_error != null)
          TextButton(
            onPressed: _cachedCopy,
            child: const Text('Consultar plano salvo neste aparelho'),
          ),
        Text(
          'Meu plano alimentar',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        if (!_loading && _plans.isEmpty)
          const StatusMessage(
            'Plano não publicado ou indisponível para este acesso. Entre em contato com seu nutricionista pela academia.',
          ),
        for (final plan in _plans) _plan(plan),
        Text(
          'Diário avulso · registros do aluno',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const Text(
          'Estes registros não alteram os alimentos prescritos no plano.',
        ),
        if (meals.isEmpty && !_loading)
          const Text('Nenhuma refeição avulsa neste dia.'),
        for (var i = 0; i < meals.length; i++)
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(nutritionRecordDetails('meal-logs', meals[i])),
                if (snapshots[i].values.every((value) => value == null))
                  const Text('Composição indisponível para este registro.'),
                NutrientSummary(
                  values: snapshots[i],
                  title: 'Composição aproximada deste registro',
                ),
                _diaryActions(meals[i], 'meal-logs'),
              ],
            ),
          ),
        if (meals.isNotEmpty)
          NutrientSummary(
            values: sumNutrients(snapshots),
            title: 'Totais aproximados do dia',
          ),
        const Text(
          'Totais usam a quantidade atual do diário. A composição só está disponível quando o alimento, a fonte e o preparo podem ser confirmados com os dados preservados neste aparelho.',
        ),
        FilledButton.icon(
          onPressed: () => _open(
            NutritionEntryPage(
              repository: widget.repository,
              resource: 'meal-logs',
              day: _day,
            ),
          ),
          icon: const Icon(Icons.add),
          label: const Text('Adicionar refeição avulsa'),
        ),
        OutlinedButton(
          onPressed: () => _open(
            FoodMealDraftPage(repository: widget.repository, day: _day),
          ),
          child: const Text('Montar refeição com vários alimentos'),
        ),
        OutlinedButton(
          onPressed: () =>
              _open(FoodSearchPage(repository: widget.repository, day: _day)),
          child: const Text('Buscar alimentos · TBCA / USDA'),
        ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Água registrada: $water ml'),
              for (final record in _water.where((m) => _onDay(m, 'logged_at')))
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(nutritionRecordDetails('hydration-logs', record)),
                    _diaryActions(record, 'hydration-logs'),
                  ],
                ),
              TextButton(
                onPressed: () => _open(
                  NutritionEntryPage(
                    repository: widget.repository,
                    resource: 'hydration-logs',
                    day: _day,
                  ),
                ),
                child: const Text('Registrar água'),
              ),
            ],
          ),
        ),
        Text(
          'Check-ins opcionais',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        for (final c in _checks.where((c) => _onDay(c, 'checked_at')))
          Text(
            '${adherenceLabels[c['adherence']]} · ${c['note']} · ${c['question']}',
          ),
        Text('Mensagens', style: Theme.of(context).textTheme.titleLarge),
        for (final message in _messages)
          SectionCard(child: Text('${message['body']}')),
        OutlinedButton(
          onPressed: () => _open(
            NutritionEntryPage(
              repository: widget.repository,
              resource: 'messages',
              day: _day,
            ),
          ),
          child: const Text('Pergunta para o nutricionista'),
        ),
        for (final item in widget.repository.intents.where(
          (i) => i.state != 'confirmed',
        ))
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${nutritionResourceLabels[item.resource]} · ${intentStateLabels[item.state]}',
                ),
                Text(nutritionRecordDetails(item.resource, item.payload)),
                TextButton(
                  onPressed: () => _open(
                    IntentReviewPage(repository: widget.repository, item: item),
                  ),
                  child: const Text('Conferir e enviar registro'),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _plan(Map<String, dynamic> plan) {
    final version = plan['active_version'] as Map<String, dynamic>?;
    final active = planAvailable(plan, DateTime.now());
    final slots = (version?['meal_slots'] as List<dynamic>? ?? [])
        .cast<Map<String, dynamic>>();
    return SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _cached
                ? 'Cópia salva · vigência não confirmada'
                : active
                ? 'Plano ativo'
                : 'Plano pausado, fora da vigência ou não publicado',
          ),
          const Text(
            'Nutricionista: nome não disponível. Confirme a autoria com sua academia.',
          ),
          Text(
            'CRN: ${version?['crn'] ?? 'Não informado'} / ${version?['crn_state'] ?? '—'} · versão ${version?['version'] ?? '—'}',
          ),
          Text(
            'Período: ${displayDate(plan['starts_on'])} a ${displayDate(plan['ends_on'])}',
          ),
          Text(
            'Publicado: ${displayDate(version?['published_at'])} · revisão prevista: ${displayDate(plan['review_on'])}',
          ),
          Text('Objetivo: ${plan['objective']}'),
          Text('Resumo de alteração: ${version?['change_reason'] ?? ''}'),
          Text('${version?['hydration_guidance'] ?? ''}'),
          Text('${version?['complementary_guidance'] ?? ''}'),
          Wrap(
            spacing: 8,
            children: [
              for (final day
                  in slots.map((s) => s['day'] as int).toSet().toList()..sort())
                ChoiceChip(
                  label: Text('Dia $day'),
                  selected: _planDay == day,
                  onSelected: (_) => setState(() {
                    _planDay = day;
                  }),
                ),
            ],
          ),
          for (final slot in slots.where((s) => s['day'] == _planDay))
            ExpansionTile(
              tilePadding: EdgeInsets.zero,
              title: Text(
                '${slot['scheduled_time'] ?? 'Horário livre'} · ${slot['name']}',
              ),
              children: [
                Text('Dia do plano: ${slot['day']} · ${slot['instructions']}'),
                for (final food
                    in (slot['foods'] as List<dynamic>)
                        .cast<Map<String, dynamic>>())
                  ListTile(
                    title: Text(
                      '${food['description']} · ${food['quantity'] ?? ''} ${food['unit']} · ${food['grams'] ?? 'Não informado'} g',
                    ),
                    subtitle: Text(
                      'Preparo: ${food['preparation']}\n${food['observation']}\nComposição nutricional do plano: não informada.\n'
                      'Substituições autorizadas:\n${(food['substitutions'] as List<dynamic>).map((s) => '${s['description']} · ${s['quantity'] ?? ''} ${s['unit']} · ${s['grams'] ?? 'Não informado'} g').join('\n')}',
                    ),
                  ),
                TextButton(
                  onPressed: !active || _cached
                      ? null
                      : () => _open(
                          NutritionEntryPage(
                            repository: widget.repository,
                            resource: 'check-ins',
                            day: _day,
                            version: version!['id'] as String,
                            slot: slot['id'] as String,
                          ),
                        ),
                  child: const Text('Como foi esta refeição?'),
                ),
              ],
            ),
          if (slots.every((s) => s['day'] != _planDay))
            const Text(
              'Nenhuma refeição do plano para este dia. Confirme a rotina com seu nutricionista.',
            ),
        ],
      ),
    );
  }
}
