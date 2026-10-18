// Frontend demo models only. These are not backend DTOs or real prescriptions.
class DemoStudent {
  const DemoStudent({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.academyName,
  });

  final String id;
  final String tenantId;
  final String name;
  final String academyName;
}

class DemoSetPrescription {
  const DemoSetPrescription({
    required this.id,
    required this.repetitions,
    required this.restSeconds,
    this.loadKg,
    this.note,
  });

  final String id;
  final String repetitions;
  final int restSeconds;
  final double? loadKg;
  final String? note;
}

class DemoWorkoutExercise {
  const DemoWorkoutExercise({
    required this.id,
    required this.name,
    required this.instructions,
    required this.coachObservation,
    required this.sets,
  });

  final String id;
  final String name;
  final List<String> instructions;
  final String coachObservation;
  final List<DemoSetPrescription> sets;
}

class DemoWorkout {
  const DemoWorkout({
    required this.id,
    required this.tenantId,
    required this.studentId,
    required this.name,
    required this.version,
    required this.exercises,
  });

  final String id;
  final String tenantId;
  final String studentId;
  final String name;
  final int version;
  final List<DemoWorkoutExercise> exercises;
}

class DemoNutrients {
  const DemoNutrients({
    this.energyKcal,
    this.proteinG,
    this.availableCarbohydrateG,
    this.totalCarbohydrateG,
    this.fatG,
    this.fiberG,
  });

  final double? energyKcal;
  final double? proteinG;
  final double? availableCarbohydrateG;
  final double? totalCarbohydrateG;
  final double? fatG;
  final double? fiberG;

  DemoNutrients forGrams(double grams) {
    if (!grams.isFinite || grams < 0) {
      throw ArgumentError.value(grams, 'grams', 'Quantidade inválida.');
    }
    double? scale(double? value) => value == null ? null : value * grams / 100;
    return DemoNutrients(
      energyKcal: scale(energyKcal),
      proteinG: scale(proteinG),
      availableCarbohydrateG: scale(availableCarbohydrateG),
      totalCarbohydrateG: scale(totalCarbohydrateG),
      fatG: scale(fatG),
      fiberG: scale(fiberG),
    );
  }
}

class DemoFood {
  const DemoFood({
    required this.id,
    required this.name,
    required this.preparation,
    required this.source,
    required this.sourceVersion,
    required this.nutrientsPer100g,
  });

  final String id;
  final String name;
  final String preparation;
  final String source;
  final String sourceVersion;
  final DemoNutrients nutrientsPer100g;
}

abstract interface class StudentRepository {
  bool get isDemo;
  DemoStudent get student;
  List<DemoWorkout> getWorkouts();
  List<DemoFood> getFoods();
}

class DemoRepository implements StudentRepository {
  const DemoRepository();

  @override
  bool get isDemo => true;

  @override
  DemoStudent get student => const DemoStudent(
    id: '00000000-0000-4000-8000-000000000201',
    tenantId: '00000000-0000-4000-8000-000000000101',
    name: 'João Pedro',
    academyName: 'Academia Horizonte',
  );

  @override
  List<DemoWorkout> getWorkouts() => const [
    DemoWorkout(
      id: '00000000-0000-4000-8000-000000000701',
      tenantId: '00000000-0000-4000-8000-000000000101',
      studentId: '00000000-0000-4000-8000-000000000201',
      name: 'Treino ilustrativo · sem prescrição real',
      version: 1,
      exercises: [
        DemoWorkoutExercise(
          id: '00000000-0000-4000-8000-000000000702',
          name: 'Agachamento com halter · demonstração',
          instructions: ['Conteúdo em rascunho. Aguarda revisão profissional.'],
          coachObservation:
              'Exemplo de observação do professor; validar antes do uso real.',
          sets: [
            DemoSetPrescription(
              id: '00000000-0000-4000-8000-000000000703',
              repetitions: '10–12',
              restSeconds: 60,
              note: 'Alvo ilustrativo, sem recomendação automática.',
            ),
          ],
        ),
      ],
    ),
  ];

  @override
  List<DemoFood> getFoods() => const [
    DemoFood(
      id: '00000000-0000-4000-8000-000000000501',
      name: 'Arroz · exemplo fictício',
      preparation: 'Cozido',
      source: 'Demonstração — sem importação TBCA/USDA',
      sourceVersion: 'demo-2026-10',
      nutrientsPer100g: DemoNutrients(
        energyKcal: 120,
        proteinG: 2.5,
        availableCarbohydrateG: 26,
        fatG: 0.5,
      ),
    ),
  ];
}

const StudentRepository demoRepository = DemoRepository();
