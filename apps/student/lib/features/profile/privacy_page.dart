import 'package:flutter/material.dart';

import '../../core/data/student_health_repository.dart';
import '../../core/widgets/student_widgets.dart';

String privacyRequestDraft(String kind, String academy) =>
    'À equipe de privacidade da $academy: solicito ${kind == 'export' ? 'acesso e exportação dos meus dados pessoais, incluindo registros de saúde' : 'orientação para exclusão da minha conta e dos dados pessoais associados'}. '
    'Peço informações sobre confirmação de identidade, prazo de resposta e eventuais obrigações de retenção. '
    'Prefiro receber os dados por canal seguro, após confirmação de identidade.';

class PrivacyPage extends StatefulWidget {
  const PrivacyPage({
    super.key,
    required this.repository,
    required this.onPreferences,
    required this.onLogout,
    this.onSwitchAcademy,
    this.disabled = false,
  });
  final StudentHealthRepository repository;
  final Future<void> Function() onPreferences, onLogout;
  final Future<void> Function()? onSwitchAcademy;
  final bool disabled;
  @override
  State<PrivacyPage> createState() => _PrivacyPageState();
}

class _PrivacyPageState extends State<PrivacyPage> {
  String? _draft, _error;
  bool _busy = false;
  Future<void> _request(String kind) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final draft = privacyRequestDraft(
      kind,
      widget.repository.gateway.identity.academy,
    );
    try {
      await widget.repository.store.write(
        'student.privacy.request.v1.${widget.repository.gateway.storageNamespace}',
        draft,
      );
      if (mounted) {
        setState(() {
          _draft = draft;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Não foi possível salvar o rascunho neste aparelho.';
        });
      }
    }
    if (mounted) {
      setState(() {
        _busy = false;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    try {
      final draft = await widget.repository.store.read(
        'student.privacy.request.v1.${widget.repository.gateway.storageNamespace}',
      );
      if (mounted) {
        setState(() {
          _draft = draft;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Rascunho local indisponível.';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final gateway = widget.repository.gateway;
    final disabled = widget.disabled || _busy || widget.repository.sending;
    return PageBody(
      children: [
        Text(
          'Perfil e privacidade',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(gateway.identity.name),
              Text(gateway.identity.academy),
              const Text('Acesso do aluno'),
            ],
          ),
        ),
        ListTile(
          leading: const Icon(Icons.privacy_tip_outlined),
          title: const Text('Consentimentos e preferências'),
          onTap: disabled ? null : widget.onPreferences,
        ),
        const Text(
          'Cada consentimento tem uma finalidade própria. Você pode recusar ou revogar as opções; confirme com a academia a base legal e os efeitos sobre serviços vinculados.',
        ),
        if (widget.onSwitchAcademy != null)
          ListTile(
            leading: const Icon(Icons.business_outlined),
            title: const Text('Trocar academia'),
            onTap: disabled ? null : widget.onSwitchAcademy,
          ),
        const StatusMessage(
          'Exportação e exclusão exigem contato com o canal de privacidade da academia. Consulte a secretaria para obter o contato do encarregado e a política de retenção. Este app prepara um rascunho local; não envia a solicitação nem confirma exclusão.',
        ),
        OutlinedButton(
          onPressed: disabled ? null : () => _request('export'),
          child: const Text('Preparar pedido de exportação'),
        ),
        OutlinedButton(
          onPressed: disabled ? null : () => _request('delete'),
          child: const Text('Preparar pedido de exclusão'),
        ),
        if (_draft != null)
          SectionCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Rascunho local · ainda não enviado'),
                SelectableText(_draft!),
                const Text(
                  'Copie o texto e envie pelo canal seguro informado pela academia. Não inclua medidas corporais em canais públicos.',
                ),
              ],
            ),
          ),
        if (_error != null) StatusMessage(_error!),
        const Text(
          'Sair encerra a sessão. Cópias e registros pendentes ficam criptografados neste aparelho, separados por conta e academia. Não são enviados automaticamente. Para apagá-los, primeiro confira os registros com a academia.',
        ),
        OutlinedButton.icon(
          onPressed: disabled ? null : widget.onLogout,
          icon: const Icon(Icons.logout),
          label: const Text('Sair'),
        ),
      ],
    );
  }
}
