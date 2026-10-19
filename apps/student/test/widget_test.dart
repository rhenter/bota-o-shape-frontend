import 'package:bota_o_shape_student/core/storage/private_store.dart';
import 'package:bota_o_shape_student/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('student app opens the pt-BR access flow', (tester) async {
    await tester.pumpWidget(
      StudentApp(store: MemoryPrivateStore(), demoEnabled: false),
    );

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.title, 'Bota o Shape!');
    expect(app.locale, const Locale('pt', 'BR'));

    await tester.pumpAndSettle();
    expect(
      find.text('Acesso exclusivo do aluno oferecido pela sua academia.'),
      findsOneWidget,
    );
  });
}
