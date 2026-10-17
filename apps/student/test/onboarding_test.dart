import 'package:bota_o_shape_student/features/onboarding/onboarding_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('optional fields and all consent purposes start unselected', (tester) async {
    OnboardingChoices? saved;
    await tester.pumpWidget(MaterialApp(home: OnboardingPage(
      academy: 'Academia Horizonte',
      onSave: (choices) async { saved = choices; },
    )));
    expect(find.text('Como quer ser chamado(a)? (opcional)'), findsOneWidget);
    expect(tester.widgetList<SwitchListTile>(find.byType(SwitchListTile))
        .every((tile) => !tile.value), isTrue);
    await tester.scrollUntilVisible(find.text('Pular por enquanto'), 250);
    await tester.tap(find.text('Pular por enquanto'));
    await tester.pump();
    expect(saved!.name, isEmpty);
    expect(saved!.consents.values.every((value) => !value), isTrue);
  });

  testWidgets('consents remain independent and can be saved without health data', (tester) async {
    OnboardingChoices? saved;
    await tester.pumpWidget(MaterialApp(home: OnboardingPage(
      academy: 'Academia Horizonte',
      onSave: (choices) async { saved = choices; },
    )));
    await tester.scrollUntilVisible(find.text('Compartilhar progresso com meu professor'), 200);
    await tester.tap(find.text('Compartilhar progresso com meu professor'));
    await tester.scrollUntilVisible(find.text('Continuar'), 200);
    await tester.tap(find.text('Continuar'));
    await tester.pump();
    expect(saved!.consents['coach_progress'], isTrue);
    expect(saved!.consents['health_data'], isFalse);
    expect(saved!.consents['nutrition'], isFalse);
    expect(saved!.notifications, isFalse);
  });
}
