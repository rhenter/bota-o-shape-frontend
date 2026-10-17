import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

import 'core/data/demo_repository.dart';
import 'core/theme/app_theme.dart';

void main() => runApp(const StudentApp());

class StudentApp extends StatelessWidget {
  const StudentApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Bota o Shape!',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      home: const FoundationPage(),
    );
  }
}

class FoundationPage extends StatelessWidget {
  const FoundationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Bota o Shape!')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                color: AppTheme.navy,
                padding: const EdgeInsets.all(16),
                child: Image.asset('assets/brand/logo.png', width: 220, semanticLabel: 'Bota o Shape!'),
              ),
              const SizedBox(height: 24),
              Text('Olá, ${demoRepository.student.name}!', style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 12),
              const Text('Ambiente de demonstração · dados fictícios'),
              const SizedBox(height: 12),
              const Text('Sua rotina de treinos, progresso e hábitos em um só lugar.'),
            ],
          ),
        ),
      ),
    );
  }
}
