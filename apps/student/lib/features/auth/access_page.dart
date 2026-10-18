import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/student_widgets.dart';
import 'session_repository.dart';

class AccessPage extends StatefulWidget {
  const AccessPage({
    super.key,
    required this.session,
    required this.onLogin,
    this.onDemo,
    this.initialError,
  });
  final SessionRepository? session;
  final Future<void> Function(String email, String password) onLogin;
  final VoidCallback? onDemo;
  final String? initialError;
  @override
  State<AccessPage> createState() => _AccessPageState();
}

class _AccessPageState extends State<AccessPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _token = TextEditingController();
  final _name = TextEditingController();
  bool _invite = false, _busy = false, _obscure = true;
  late String? _message = widget.initialError;
  @override
  void dispose() {
    for (final c in [_email, _password, _token, _name]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      if (_invite) {
        if (widget.session == null) {
          throw const ApiFailure(
            'Configure a URL da API para aceitar convites.',
          );
        }
        await widget.session!.acceptInvite(
          token: _token.text.trim(),
          password: _password.text,
          firstName: _name.text.trim(),
        );
        if (mounted) {
          setState(() {
            _invite = false;
            _password.clear();
            _message =
                'Convite aceito. Entre com o e-mail do convite e sua senha. Se já tinha conta, use a senha atual.';
          });
        }
      } else {
        await widget.onLogin(_email.text.trim(), _password.text);
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _message = error is ApiFailure
              ? error.message
              : 'Não foi possível acessar. Tente novamente.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  Future<void> _reset() async {
    if (!_email.text.contains('@')) {
      setState(() {
        _message = 'Preencha seu e-mail para recuperar o acesso.';
      });
      return;
    }
    setState(() {
      _busy = true;
    });
    try {
      if (widget.session == null) {
        throw const ApiFailure('Configure a URL da API para recuperar acesso.');
      }
      await widget.session!.passwordReset(_email.text.trim());
      if (mounted) {
        setState(() {
          _message =
              'Se a conta existir, enviaremos as instruções para seu e-mail.';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() {
          _message = error is ApiFailure
              ? error.message
              : 'Não foi possível enviar. Tente novamente.';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppTheme.navyDeep,
    body: PageBody(
      children: [
        const SizedBox(height: 24),
        const Brand(width: 240),
        const SizedBox(height: 24),
        Text(
          _invite ? 'Entre pelo convite da academia' : 'Sua rotina começa aqui',
          style: Theme.of(
            context,
          ).textTheme.headlineMedium?.copyWith(color: Colors.white),
        ),
        const SizedBox(height: 12),
        const Text(
          'Acesso exclusivo do aluno oferecido pela sua academia.',
          style: TextStyle(color: Colors.white),
        ),
        const SizedBox(height: 24),
        Form(
          key: _form,
          child: Column(
            children: [
              if (_invite) ...[
                TextFormField(
                  controller: _token,
                  decoration: const InputDecoration(
                    labelText: 'Código do convite',
                  ),
                  validator: (v) =>
                      v!.trim().isEmpty ? 'Insira o código recebido.' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _name,
                  decoration: const InputDecoration(labelText: 'Seu nome'),
                  validator: (v) =>
                      v!.trim().isEmpty ? 'Informe seu nome.' : null,
                ),
              ] else
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  decoration: const InputDecoration(labelText: 'Seu e-mail'),
                  validator: (v) =>
                      v!.contains('@') ? null : 'Informe um e-mail válido.',
                ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                enableSuggestions: false,
                autocorrect: false,
                autofillHints: _invite
                    ? const [AutofillHints.newPassword]
                    : const [AutofillHints.password],
                decoration: InputDecoration(
                  labelText: _invite ? 'Senha para a nova conta' : 'Sua senha',
                  suffixIcon: IconButton(
                    tooltip: _obscure ? 'Mostrar senha' : 'Ocultar senha',
                    onPressed: () => setState(() {
                      _obscure = !_obscure;
                    }),
                    icon: Icon(
                      _obscure ? Icons.visibility : Icons.visibility_off,
                    ),
                  ),
                ),
                validator: (v) => v!.isEmpty ? 'Informe sua senha.' : null,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(
                    _busy
                        ? 'Aguarde…'
                        : _invite
                        ? 'Aceitar convite'
                        : 'Entrar',
                  ),
                ),
              ),
            ],
          ),
        ),
        if (_message != null) ...[
          const SizedBox(height: 16),
          StatusMessage(_message!),
        ],
        TextButton(
          onPressed: _busy
              ? null
              : () => setState(() {
                  _invite = !_invite;
                  _message = null;
                }),
          style: TextButton.styleFrom(foregroundColor: AppTheme.lime),
          child: Text(
            _invite ? 'Já tenho acesso · entrar' : 'Tenho um código de convite',
          ),
        ),
        if (!_invite)
          TextButton(
            onPressed: _busy ? null : _reset,
            style: TextButton.styleFrom(foregroundColor: Colors.white),
            child: const Text('Esqueci minha senha'),
          ),
        const Divider(color: AppTheme.muted),
        const Text(
          'Login social em preparação · disponível após configuração da academia',
          style: TextStyle(color: Colors.white),
        ),
        const SizedBox(height: 8),
        const FilledButton(
          onPressed: null,
          child: Text('Continuar com Google · indisponível'),
        ),
        const FilledButton(
          onPressed: null,
          child: Text('Continuar com Apple · indisponível'),
        ),
        if (widget.onDemo != null) ...[
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: _busy ? null : widget.onDemo,
            style: OutlinedButton.styleFrom(foregroundColor: AppTheme.lime),
            child: const Text('Explorar demonstração · dados fictícios'),
          ),
        ],
        TextButton(
          onPressed: () => showDialog<void>(
            context: context,
            builder: (context) => AlertDialog(
              title: const Text('Privacidade e suporte'),
              content: const Text(
                'O aluno acessa seus próprios dados pelo vínculo da academia. Consentimentos são opcionais e separados por finalidade. '
                'Solicite à sua academia os Termos de Uso, a política de privacidade vigente e o canal do encarregado antes do uso com dados reais. '
                'Para ajuda com o convite ou acesso, fale com a recepção da sua academia.',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Fechar'),
                ),
              ],
            ),
          ),
          style: TextButton.styleFrom(foregroundColor: Colors.white),
          child: const Text('Privacidade, termos e suporte'),
        ),
      ],
    ),
  );
}
