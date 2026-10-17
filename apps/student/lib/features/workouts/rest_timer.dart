import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/widgets/student_widgets.dart';

class RestTimer extends StatefulWidget {
  const RestTimer({super.key, required this.seconds, this.now});
  final int seconds;
  final DateTime Function()? now;
  @override
  State<RestTimer> createState() => _RestTimerState();
}

class _RestTimerState extends State<RestTimer> with WidgetsBindingObserver {
  late int _remaining = widget.seconds;
  DateTime get _now => widget.now?.call() ?? DateTime.now();
  late DateTime _deadline = _now.add(Duration(seconds: _remaining));
  bool _paused = false;
  Timer? _ticker;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }
  void _tick() {
    if (_paused || _remaining <= 0 || !mounted) return;
    final milliseconds = _deadline.difference(_now).inMilliseconds;
    setState(() { _remaining = milliseconds <= 0 ? 0 : (milliseconds / 1000).ceil(); });
  }
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) { if (state == AppLifecycleState.resumed) _tick(); }
  @override
  void dispose() { _ticker?.cancel(); WidgetsBinding.instance.removeObserver(this); super.dispose(); }
  void _toggle() => setState(() {
    _paused = !_paused;
    if (!_paused) _deadline = _now.add(Duration(seconds: _remaining));
  });
  @override
  Widget build(BuildContext context) => SectionCard(child: Column(children: [
    const Text('Descanso entre séries'),
    const SizedBox(height: 12),
    Text(_remaining == 0 ? 'Descanso concluído' :
      '${(_remaining ~/ 60).toString().padLeft(2, '0')}:${(_remaining % 60).toString().padLeft(2, '0')}',
      style: Theme.of(context).textTheme.headlineLarge),
    Wrap(alignment: WrapAlignment.center, spacing: 8, children: [
      IconButton(tooltip: _paused ? 'Retomar descanso' : 'Pausar descanso',
        onPressed: _remaining == 0 ? null : _toggle, icon: Icon(_paused ? Icons.play_arrow : Icons.pause)),
      TextButton(onPressed: () => setState(() {
        _remaining += 30;
        if (!_paused) _deadline = _now.add(Duration(seconds: _remaining));
      }), child: const Text('+30 s')),
      TextButton(onPressed: () => setState(() { _remaining = 0; }), child: const Text('Pular descanso')),
    ]),
  ]));
}
