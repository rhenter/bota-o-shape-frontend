import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

class PageBody extends StatelessWidget {
  const PageBody({super.key, required this.children});
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => SafeArea(child: Center(child: ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 640),
    child: ListView(padding: const EdgeInsets.all(20), children: children),
  )));
}

class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child, this.color});
  final Widget child;
  final Color? color;
  @override
  Widget build(BuildContext context) => Card(
    color: color, elevation: 0, margin: const EdgeInsets.only(bottom: 16),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16),
      side: const BorderSide(color: AppTheme.border)),
    child: Padding(padding: const EdgeInsets.all(16), child: child),
  );
}

class StatusMessage extends StatelessWidget {
  const StatusMessage(this.message, {super.key, this.action, this.onAction});
  final String message;
  final String? action;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => Semantics(liveRegion: true, child: SectionCard(
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(message),
      if (action != null) TextButton(onPressed: onAction, child: Text(action!)),
    ]),
  ));
}

class CoachObservation extends StatelessWidget {
  const CoachObservation(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => SectionCard(color: AppTheme.limeSoft,
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Row(children: [Icon(Icons.assignment_outlined), SizedBox(width: 8),
        Expanded(child: Text('Observação do professor', style: TextStyle(fontWeight: FontWeight.bold)))]),
      const SizedBox(height: 8), Text(text.isEmpty ? 'Sem observação específica para este exercício.' : text),
    ]));
}

class Brand extends StatelessWidget {
  const Brand({super.key, this.width = 180});
  final double width;
  @override
  Widget build(BuildContext context) => Container(color: AppTheme.navy,
    padding: const EdgeInsets.all(12),
    child: Image.asset('assets/brand/logo.png', width: width, semanticLabel: 'Bota o Shape!'));
}
