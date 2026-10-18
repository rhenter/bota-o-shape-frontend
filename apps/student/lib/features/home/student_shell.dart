import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/data/student_gateway.dart';
import '../../core/data/student_health_repository.dart';
import '../progress/progress_page.dart';
import '../nutrition/nutrition_page.dart';
import '../profile/privacy_page.dart';
import '../../core/storage/private_store.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/student_widgets.dart';
import '../onboarding/onboarding_page.dart';
import '../workouts/workout_controller.dart';
import '../workouts/workout_models.dart';
import '../workouts/workout_pages.dart';

class StudentShell extends StatefulWidget {
  const StudentShell({
    super.key,
    required this.gateway,
    required this.store,
    required this.onLogout,
    this.onSwitchAcademy,
    this.progressPage,
    this.nutritionPage,
  });
  final StudentGateway gateway;
  final PrivateStore store;
  final Future<void> Function() onLogout;
  final Future<void> Function()? onSwitchAcademy;
  final Widget? progressPage, nutritionPage;
  @override
  State<StudentShell> createState() => _StudentShellState();
}

class _StudentShellState extends State<StudentShell> {
  late final WorkoutSyncQueue _queue = WorkoutSyncQueue(
    gateway: widget.gateway,
    store: widget.store,
  );
  late final StudentHealthRepository _health = StudentHealthRepository(
    gateway: widget.gateway,
    store: widget.store,
  );
  List<StudentWorkout> _plans = [];
  List<Map<String, dynamic>> _history = [];
  OnboardingChoices? _preferences;
  bool _loading = true, _cached = false, _historyAvailable = false;
  String? _error, _historyError;
  int _tab = 0;
  bool _queueReady = false;
  String? _queueError;
  @override
  void initState() {
    super.initState();
    _initialize();
  }

  @override
  void dispose() {
    _queue.dispose();
    super.dispose();
  }

  Future<void> _initialize() async {
    try {
      await _queue.restore();
      _queueReady = true;
      _queueError = null;
    } catch (_) {
      if (mounted) {
        setState(() {
          _queueError =
              'Não foi possível abrir seus registros locais. Tente novamente antes de registrar outro treino.';
        });
      }
    }
    await _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _historyError = null;
    });
    try {
      final plans = await widget.gateway.workouts();
      if (!mounted) return;
      setState(() {
        _plans = plans;
        _cached = false;
      });
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error is ApiFailure
              ? error.message
              : 'Não foi possível carregar seus treinos.';
        });
      }
    }
    try {
      final history = await widget.gateway.history();
      if (mounted) {
        setState(() {
          _history = history;
          _historyAvailable = true;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _historyError = error is ApiFailure
              ? error.message
              : 'Histórico indisponível.';
        });
      }
    }
    try {
      final preferences = await widget.gateway.onboarding();
      if (mounted) {
        setState(() {
          _preferences = preferences;
        });
      }
    } catch (_) {
      /* A failed preference refresh must not invent new consent grants. */
    }
    if (mounted) {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _cachedCopy() async {
    try {
      final plans = await widget.gateway.cachedWorkouts();
      if (mounted) {
        setState(() {
          _plans = plans;
          _cached = true;
          _error = plans.isEmpty
              ? 'Não existe treino salvo para esta conta e academia.'
              : null;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Não foi possível abrir a cópia salva neste aparelho.';
        });
      }
    }
  }

  Future<void> _open(StudentWorkout plan) async {
    if (!_queueReady) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_queueError ?? 'Aguarde os registros locais.')),
      );
      return;
    }
    await Navigator.push<void>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            WorkoutPage(plan: plan, queue: _queue, previous: _history),
      ),
    );
    if (mounted) await _load();
  }

  void _openHistory() => Navigator.push<void>(
    context,
    MaterialPageRoute(builder: (_) => SessionHistoryPage(sessions: _history)),
  );

  Future<void> _privacy() async {
    try {
      final choices = await widget.gateway.onboarding();
      if (!mounted) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => OnboardingPage(
            academy: widget.gateway.identity.academy,
            initial: choices ?? const OnboardingChoices(),
            onSave: (value) async {
              await widget.gateway.saveOnboarding(value);
              if (mounted) {
                setState(() {
                  _preferences = value;
                });
              }
              if (mounted) Navigator.pop(context);
            },
          ),
        ),
      );
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is ApiFailure
                  ? error.message
                  : 'Não foi possível abrir os consentimentos. Tente novamente.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      _home(context),
      _workouts(context),
      widget.progressPage ?? ProgressPage(repository: _health),
      widget.nutritionPage ?? NutritionPage(repository: _health),
      PrivacyPage(
        repository: _health,
        onPreferences: _privacy,
        onLogout: widget.onLogout,
        onSwitchAcademy: widget.onSwitchAcademy,
        disabled: _queue.syncing,
      ),
    ];
    Widget body = pages[_tab];
    if (_preferences?.largeText == true) {
      final media = MediaQuery.of(context);
      body = MediaQuery(
        data: media.copyWith(
          textScaler: TextScaler.linear(
            media.textScaler.scale(1) < 1.2 ? 1.2 : media.textScaler.scale(1),
          ),
        ),
        child: body,
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Bota o Shape!'),
        actions: [
          IconButton(
            tooltip: 'Atualizar meus dados',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          if (widget.gateway.isDemo)
            const Material(
              color: AppTheme.limeSoft,
              child: Padding(
                padding: EdgeInsets.all(8),
                child: Text(
                  'Demonstração · dados fictícios · sem prescrição real',
                ),
              ),
            ),
          if (_loading)
            const LinearProgressIndicator(
              semanticsLabel: 'Carregando seus dados',
            ),
          Expanded(child: body),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (value) => setState(() {
          _tab = value;
        }),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Início',
          ),
          NavigationDestination(
            icon: Icon(Icons.fitness_center),
            label: 'Treinos',
          ),
          NavigationDestination(
            icon: Icon(Icons.bar_chart),
            label: 'Progresso',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_outlined),
            label: 'Nutrição',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            label: 'Perfil',
          ),
        ],
      ),
    );
  }

  List<Widget> _loadStatus() => [
    if (_error != null)
      StatusMessage(
        _error!,
        action: 'Tentar novamente',
        onAction: _loading ? null : _load,
      ),
    if (_error != null && !widget.gateway.isDemo)
      OutlinedButton(
        onPressed: _loading ? null : _cachedCopy,
        child: const Text('Abrir treino salvo neste aparelho'),
      ),
    if (_cached)
      const StatusMessage(
        'Cópia salva · pode estar desatualizada. A vigência e o vínculo serão validados ao sincronizar.',
      ),
    if (_historyError != null)
      StatusMessage('Histórico não atualizado. $_historyError'),
  ];

  Widget _home(BuildContext context) {
    final today = _plans.where((p) => p.availableToday);
    final name = _preferences?.name.isNotEmpty == true
        ? _preferences!.name
        : widget.gateway.identity.name;
    return PageBody(
      children: [
        Text('Olá, $name!', style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(widget.gateway.identity.academy),
        const SizedBox(height: 20),
        ..._loadStatus(),
        if (today.isNotEmpty)
          SectionCard(
            color: AppTheme.navy,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SEU TREINO DE HOJE',
                  style: TextStyle(
                    color: AppTheme.lime,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  today.first.name,
                  style: Theme.of(
                    context,
                  ).textTheme.headlineSmall?.copyWith(color: Colors.white),
                ),
                const SizedBox(height: 12),
                Text(
                  '${today.first.exercises.length} exercícios · versão ${today.first.version}',
                  style: const TextStyle(color: Colors.white),
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => _open(today.first),
                  child: const Text('Ver treino e começar'),
                ),
              ],
            ),
          )
        else if (!_loading && _error == null)
          const StatusMessage(
            'Nenhum treino vigente. Fale com sua academia para conferir a próxima sessão.',
          ),
        SectionCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Sua atividade da semana',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 12),
              Text(
                _historyAvailable
                    ? '${_sessionsThisWeek()} sessões registradas nesta semana'
                    : 'Histórico ainda não carregado',
              ),
              TextButton(
                onPressed: _openHistory,
                child: const Text('Ver histórico'),
              ),
            ],
          ),
        ),
        if (today.length > 1)
          ListTile(
            title: const Text('Próxima opção de treino'),
            subtitle: Text(today.elementAt(1).name),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _open(today.elementAt(1)),
          ),
        Wrap(
          spacing: 8,
          children: [
            OutlinedButton(
              onPressed: () => setState(() {
                _tab = 2;
              }),
              child: const Text('Minhas avaliações'),
            ),
            OutlinedButton(
              onPressed: () => setState(() {
                _tab = 3;
              }),
              child: const Text('Refeição e água'),
            ),
          ],
        ),
        _pendingPanel(),
      ],
    );
  }

  int _sessionsThisWeek() {
    final now = DateTime.now();
    final monday = DateTime(
      now.year,
      now.month,
      now.day,
    ).subtract(Duration(days: now.weekday - 1));
    return _history
        .where(
          (s) =>
              s['completed_at'] != null &&
              !DateTime.parse(
                s['completed_at'] as String,
              ).toLocal().isBefore(monday),
        )
        .length;
  }

  Widget _workouts(BuildContext context) => PageBody(
    children: [
      Text('Meus treinos', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: 16),
      ..._loadStatus(),
      if (_plans.isEmpty && !_loading && _error == null)
        const StatusMessage(
          'Você ainda não tem treino atribuído nesta academia.',
        ),
      for (final plan in _plans)
        SectionCard(
          child: ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(plan.name),
            subtitle: Text(
              '${plan.exercises.length} exercícios · ${plan.availableToday ? 'Vigente' : 'Fora da vigência'}',
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _open(plan),
          ),
        ),
      OutlinedButton.icon(
        onPressed: _openHistory,
        icon: const Icon(Icons.history),
        label: const Text('Calendário e histórico'),
      ),
      const SizedBox(height: 16),
      _pendingPanel(),
    ],
  );

  Widget _pendingPanel() => AnimatedBuilder(
    animation: _queue,
    builder: (context, _) => SectionCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sincronização', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          if (_queueError != null)
            StatusMessage(
              _queueError!,
              action: 'Abrir registros locais novamente',
              onAction: _initialize,
            ),
          Text(
            _queue.pending.isEmpty
                ? 'Nenhuma sessão pendente neste aparelho.'
                : '${_queue.pending.length} sessões salvas neste aparelho',
          ),
          for (final item in _queue.pending)
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                item.status == SyncStatus.conflict
                    ? Icons.compare_arrows
                    : Icons.cloud_upload_outlined,
              ),
              title: Text(
                '${item.status == SyncStatus.conflict
                    ? 'Conflito para revisão'
                    : item.status == SyncStatus.rejected
                    ? 'Envio não aceito'
                    : 'Pendente de sincronização'} · ${localDate(item.payload['started_at'] as String)}',
              ),
              subtitle: Text(
                item.error ??
                    'Aguardando envio. A mesma chave será usada em cada tentativa.',
              ),
              trailing: IconButton(
                tooltip: 'Revisar registro local',
                icon: const Icon(Icons.visibility_outlined),
                onPressed: _queue.syncing
                    ? null
                    : () => Navigator.push<void>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => item.status == SyncStatus.rejected
                              ? RejectedWorkoutPage(item: item, queue: _queue)
                              : SessionHistoryPage(sessions: [item.payload]),
                        ),
                      ),
              ),
            ),
          if (_queue.error != null) Text(_queue.error!),
          if (_queue.pending.any((item) => item.status == SyncStatus.rejected))
            const Text(
              'Envios recusados não são reenviados automaticamente. Abra o registro para corrigir, colocar na fila novamente ou remover a cópia local.',
            ),
          if (_queue.pending.any((item) => item.status == SyncStatus.pending))
            FilledButton(
              onPressed: _queue.syncing
                  ? null
                  : () async {
                      await _queue.sync();
                      if (mounted) await _load();
                    },
              child: Text(
                _queue.syncing ? 'Sincronizando…' : 'Tentar sincronizar',
              ),
            ),
          if (_queue.pending.any((p) => p.status == SyncStatus.conflict)) ...[
            const Text(
              'O registro local foi preservado. Compare com o histórico da academia e peça ajuda ao professor para resolver a diferença.',
            ),
            TextButton(
              onPressed: _openHistory,
              child: const Text('Comparar com histórico sincronizado'),
            ),
          ],
        ],
      ),
    ),
  );
}
