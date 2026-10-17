/// Illustrative data only; never returned by an API gateway.
List<Map<String, dynamic>> demoAssessments(String studentId) => [
  for (final entry in [({'date': '2026-09-17T10:00:00Z', 'value': '72.0'}), ({'date': '2026-10-01T10:00:00Z', 'value': null}), ({'date': '2026-10-17T10:00:00Z', 'value': '72.5'})])
    {'id': 'demo-assessment-${entry['date']}', 'student': studentId, 'status': 'released', 'assessed_at': entry['date'],
      'device': <String, dynamic>{}, 'preparation_conditions': {'horário': 'manhã · exemplo fictício'},
      'notes': 'Demonstração; dados não representam avaliação real.', 'measurements': [
        if (entry['value'] != null) {'id': 'demo-measurement-${entry['date']}', 'metric': 'Peso · demonstração', 'raw_value': entry['value'],
          'unit': 'kg', 'side': '', 'anatomical_site': '', 'method': 'balança · exemplo', 'protocol': null,
          'origin': 'manual', 'equation_metadata': <String, dynamic>{}, 'possible_error': false},
      ]},
];

List<Map<String, dynamic>> demoMealPlans() => [
  {'id': 'demo-plan', 'objective': 'Organização ilustrativa, sem prescrição real', 'starts_on': '2026-01-01', 'ends_on': null,
    'review_on': '2026-11-01', 'status': 'published', 'active_version': {
      'id': 'demo-version-1', 'version': 1, 'crn': 'Fictício', 'crn_state': '—', 'published_at': '2026-10-01T10:00:00Z',
      'change_reason': 'Exemplo de visualização', 'hydration_guidance': 'Conteúdo ilustrativo; confirme orientações com seu nutricionista.',
      'complementary_guidance': 'Aguarda revisão profissional.', 'meal_slots': [
        for (var day = 1; day <= 7; day++) {'id': 'demo-slot-$day', 'day': day, 'name': 'Refeição · demonstração',
          'scheduled_time': '12:00', 'order': 1, 'instructions': 'Exemplo fictício, sem recomendação clínica.', 'foods': [
            {'id': 'demo-planned-$day', 'description': 'Preparação ilustrativa', 'quantity': '1', 'unit': 'porção ilustrativa',
              'grams': null, 'preparation': 'Aguarda revisão profissional', 'observation': 'Exemplo sem composição calculada.',
              'substitutions': [{'description': 'Alternativa autorizada fictícia', 'quantity': '1', 'unit': 'porção ilustrativa', 'grams': null}]},
          ]},
      ],
    }},
];
