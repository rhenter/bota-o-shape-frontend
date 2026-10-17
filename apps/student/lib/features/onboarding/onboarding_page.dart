import 'package:flutter/material.dart';

import '../../core/widgets/student_widgets.dart';
import 'onboarding_choices.dart';
export 'onboarding_choices.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key, required this.academy, required this.onSave,
    this.initial = const OnboardingChoices()});
  final String academy;
  final Future<void> Function(OnboardingChoices) onSave;
  final OnboardingChoices initial;
  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  late final TextEditingController _name = TextEditingController(text: widget.initial.name);
  late String? _goal = widget.initial.goal;
  late String? _days = widget.initial.daysPerWeek;
  late bool _notifications = widget.initial.notifications;
  late bool _largeText = widget.initial.largeText;
  late final Map<String, bool> _consents = Map.from(widget.initial.consents);
  bool _saving = false;
  String? _error;
  @override
  void dispose() { _name.dispose(); super.dispose(); }

  Future<void> _save({bool skip = false}) async {
    setState(() { _saving = true; _error = null; });
    try {
      await widget.onSave(skip ? const OnboardingChoices(skipped: true) : OnboardingChoices(
        name: _name.text.trim(), goal: _goal, daysPerWeek: _days,
        notifications: _notifications, largeText: _largeText, consents: Map.from(_consents),
      ));
    } catch (_) {
      if (mounted) setState(() { _error = 'Não foi possível salvar. Confira a conexão e tente novamente.'; });
    } finally { if (mounted) setState(() { _saving = false; }); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(appBar: AppBar(title: const Text('Seu primeiro acesso')),
    body: PageBody(children: [
      const Brand(), const SizedBox(height: 24),
      Text('Vamos personalizar sua experiência', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 8), Text(widget.academy), const SizedBox(height: 12),
      const Text('Todos os campos são opcionais. Você pode revisar suas escolhas em Perfil e privacidade.'),
      const SizedBox(height: 20),
      TextField(controller: _name, textCapitalization: TextCapitalization.words,
        decoration: const InputDecoration(labelText: 'Como quer ser chamado(a)? (opcional)')),
      const SizedBox(height: 16),
      const Text('Seu objetivo (opcional)'),
      Wrap(spacing: 8, children: [for (final goal in ['Força', 'Condicionamento', 'Bem-estar'])
        ChoiceChip(label: Text(goal), selected: _goal == goal,
          onSelected: _saving ? null : (selected) => setState(() { _goal = selected ? goal : null; }))]),
      const SizedBox(height: 12), const Text('Dias por semana (opcional)'),
      Wrap(spacing: 8, children: [for (final days in ['1–2', '3–4', '5–6'])
        ChoiceChip(label: Text(days), selected: _days == days,
          onSelected: _saving ? null : (selected) => setState(() { _days = selected ? days : null; }))]),
      SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Lembretes (opcional)'),
        subtitle: const Text('Preferência local. Notificações só serão ativadas após autorização do aparelho.'),
        value: _notifications, onChanged: _saving ? null : (v) => setState(() { _notifications = v; })),
      SwitchListTile(contentPadding: EdgeInsets.zero, title: const Text('Texto ampliado (opcional)'),
        value: _largeText, onChanged: _saving ? null : (v) => setState(() { _largeText = v; })),
      const SizedBox(height: 16), Text('Consentimentos e privacidade', style: Theme.of(context).textTheme.titleLarge),
      const Text('Uma finalidade por escolha. Recusar não bloqueia o acesso ao treino. Nenhuma escolha vem marcada.'),
      for (final entry in const {
        'health_data': 'Uso de dados de saúde para acompanhamento',
        'coach_progress': 'Compartilhar progresso com meu professor',
        'nutrition': 'Acompanhamento nutricional pelo profissional habilitado',
        'progress_photos': 'Guardar fotos privadas de progresso',
      }.entries)
        SwitchListTile(contentPadding: EdgeInsets.zero, title: Text(entry.value),
          value: _consents[entry.key] ?? false, onChanged: _saving ? null : (v) => setState(() { _consents[entry.key] = v; })),
      const Text('Suas escolhas podem ser revogadas nesta tela pelo Perfil. Nenhuma foto ou medida é solicitada aqui.'),
      const SizedBox(height: 16),
      const Text('Nome preferido, objetivo, dias e acessibilidade ficam neste aparelho. Não geramos prescrições com essas escolhas.'),
      if (_error != null) StatusMessage(_error!),
      const SizedBox(height: 20),
      FilledButton(onPressed: _saving ? null : () => _save(), child: Text(_saving ? 'Salvando…' : 'Continuar')),
      TextButton(onPressed: _saving ? null : () => _save(skip: true), child: const Text('Pular por enquanto')),
    ]));
}
