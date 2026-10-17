import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/api/api_client.dart';
import 'core/data/student_gateway.dart';
import 'core/storage/private_store.dart';
import 'core/theme/app_theme.dart';
import 'core/widgets/student_widgets.dart';
import 'features/auth/access_page.dart';
import 'features/auth/session_repository.dart';
import 'features/home/student_shell.dart';
import 'features/onboarding/onboarding_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  const store = SecurePrivateStore();
  const configuredUrl = String.fromEnvironment('API_BASE_URL');
  const allowLocalHttp = bool.fromEnvironment('ALLOW_INSECURE_LOCAL_API');
  final uri = Uri.tryParse(configuredUrl);
  final apiUrl = uri ?? Uri();
  final valid = apiUrl.hasAuthority && apiUrl.userInfo.isEmpty &&
      (apiUrl.scheme == 'https' || (allowLocalHttp && apiUrl.scheme == 'http' &&
          ['localhost', '127.0.0.1', '10.0.2.2', '::1'].contains(apiUrl.host)));
  final session = valid ? SessionRepository(ApiClient(
    baseUrl: apiUrl.replace(path: '/', query: null, fragment: null), store: store, sender: NativeApiSender().send)) : null;
  runApp(StudentApp(session: session, store: store));
}

class StudentApp extends StatelessWidget {
  const StudentApp({super.key, this.session, this.store = const SecurePrivateStore(),
    this.demoEnabled = const bool.fromEnvironment('STUDENT_DEMO')});
  final SessionRepository? session;
  final PrivateStore store;
  final bool demoEnabled;
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Bota o Shape!', debugShowCheckedModeBanner: false, theme: AppTheme.light,
    locale: const Locale('pt', 'BR'), supportedLocales: const [Locale('pt', 'BR')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    home: StudentAccessGate(session: session, store: store, demoEnabled: demoEnabled),
  );
}

class StudentAccessGate extends StatefulWidget {
  const StudentAccessGate({super.key, required this.session, required this.store, required this.demoEnabled});
  final SessionRepository? session;
  final PrivateStore store;
  final bool demoEnabled;
  @override
  State<StudentAccessGate> createState() => _StudentAccessGateState();
}

class _StudentAccessGateState extends State<StudentAccessGate> {
  StudentGateway? _gateway;
  OnboardingChoices _initialChoices = const OnboardingChoices();
  List<AcademyAccess>? _academies;
  bool _loading = true, _onboarded = false;
  String? _error;
  final PrivateStore _demoStore = MemoryPrivateStore();
  @override
  void initState() { super.initState(); _restore(); }
  Future<void> _restore() async {
    try {
      final academies = await widget.session?.restore();
      if (mounted && academies != null && academies.isNotEmpty) setState(() { _academies = academies; });
    } catch (error) {
      if (mounted) setState(() { _error = error is ApiFailure ? error.message : 'Não foi possível restaurar sua sessão.'; });
    } finally { if (mounted) setState(() { _loading = false; }); }
  }
  Future<void> _login(String email, String password) async {
    if (widget.session == null) throw const ApiFailure('O acesso da academia ainda não está configurado. Fale com sua academia.');
    final academies = await widget.session!.login(email, password);
    if (!mounted) return;
    if (academies.isEmpty) throw const ApiFailure('Nenhuma academia ativa vinculada. Confira seu convite com a academia.', status: 403);
    setState(() { _academies = academies; _error = null; });
  }
  Future<void> _activate(AcademyAccess academy) async {
    setState(() { _loading = true; _error = null; });
    try {
      final gateway = await widget.session!.activate(academy);
      final choices = await gateway.onboarding();
      if (mounted) setState(() { _gateway = gateway; _initialChoices = choices ?? const OnboardingChoices(); _onboarded = choices?.completed == true; });
    } catch (error) {
      if (mounted) setState(() { _error = error is ApiFailure ? error.message : 'Não foi possível selecionar a academia.'; });
    } finally { if (mounted) setState(() { _loading = false; }); }
  }
  Future<void> _logout() async {
    String? message;
    try { if (_gateway?.isDemo != true) await widget.session?.logout(); } catch (_) {
      message = 'Sessão removida deste aparelho. Não foi possível confirmar a revogação na API.';
    }
    if (mounted) setState(() { _gateway = null; _academies = null; _onboarded = false; _error = message; });
  }
  Future<void> _switchAcademy() async {
    setState(() { _loading = true; });
    try {
      final academies = await widget.session!.academies();
      if (mounted) setState(() { _gateway = null; _academies = academies; _onboarded = false; _error = null; });
    } catch (error) {
      if (mounted) setState(() { _error = error is ApiFailure ? error.message : 'Não foi possível carregar suas academias.'; });
    } finally { if (mounted) setState(() { _loading = false; }); }
  }
  @override
  Widget build(BuildContext context) {
    if (_loading) return const Scaffold(body: Center(child: CircularProgressIndicator(semanticsLabel: 'Validando seu acesso')));
    if (_gateway != null) {
      if (!_onboarded) return OnboardingPage(academy: _gateway!.identity.academy, initial: _initialChoices,
        onSave: (choices) async {
          await _gateway!.saveOnboarding(choices);
          if (mounted) setState(() { _onboarded = true; });
        });
      return StudentShell(key: ValueKey(_gateway!.identity.storageScope), gateway: _gateway!,
        store: _gateway!.isDemo ? _demoStore : widget.store, onLogout: _logout,
        onSwitchAcademy: _gateway!.isDemo ? null : _switchAcademy);
    }
    if (_academies != null) return Scaffold(appBar: AppBar(title: const Text('Sua academia')),
      body: PageBody(children: [
        const Text('Selecione a academia do seu vínculo de aluno.'), const SizedBox(height: 16),
        if (_error != null) StatusMessage(_error!),
        for (final academy in _academies!) SectionCard(child: ListTile(title: Text(academy.name),
          trailing: const Icon(Icons.chevron_right), onTap: () => _activate(academy))),
        if (_academies!.isEmpty) const StatusMessage('Nenhuma academia ativa encontrada. Confira seu vínculo com a recepção.'),
        TextButton(onPressed: _logout, child: const Text('Voltar ao acesso')),
      ]));
    return AccessPage(session: widget.session, onLogin: _login, initialError: _error,
      onDemo: widget.demoEnabled ? () => setState(() {
        _gateway = DemoStudentGateway(); _initialChoices = const OnboardingChoices(); _onboarded = false; _error = null;
      }) : null);
  }
}
