class OnboardingChoices {
  const OnboardingChoices({
    this.name = '',
    this.goal,
    this.daysPerWeek,
    this.notifications = false,
    this.largeText = false,
    this.skipped = false,
    this.completed = false,
    this.changedConsentPurposes = const {},
    this.consents = const {
      'health_data': false,
      'coach_progress': false,
      'nutrition': false,
      'nutrition_plan': false,
      'progress_photos': false,
    },
  });
  final String name;
  final String? goal, daysPerWeek;
  final bool notifications, largeText, skipped, completed;
  // Transient user intent; never restored from a previous editing session.
  final Set<String> changedConsentPurposes;
  final Map<String, bool> consents;
  Map<String, Object?> toJson() => {
    'name': name,
    'goal': goal,
    'days_per_week': daysPerWeek,
    'notifications': notifications,
    'large_text': largeText,
    'skipped': skipped,
    'completed': completed,
    'consents': consents,
  };
  factory OnboardingChoices.fromJson(Map<String, dynamic> json) =>
      OnboardingChoices(
        name: json['name'] as String? ?? '',
        goal: json['goal'] as String?,
        daysPerWeek: json['days_per_week'] as String?,
        notifications: json['notifications'] as bool? ?? false,
        largeText: json['large_text'] as bool? ?? false,
        skipped: json['skipped'] as bool? ?? false,
        completed: json['completed'] as bool? ?? true,
        consents: (json['consents'] as Map<String, dynamic>)
            .cast<String, bool>(),
      );
}
