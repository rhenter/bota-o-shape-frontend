class OnboardingChoices {
  const OnboardingChoices({this.name = '', this.goal, this.daysPerWeek,
    this.notifications = false, this.largeText = false, this.skipped = false,
    this.consents = const {'health_data': false, 'coach_progress': false,
      'nutrition': false, 'progress_photos': false}});
  final String name;
  final String? goal, daysPerWeek;
  final bool notifications, largeText, skipped;
  final Map<String, bool> consents;
  Map<String, Object?> toJson() => {'name': name, 'goal': goal, 'days_per_week': daysPerWeek,
    'notifications': notifications, 'large_text': largeText, 'skipped': skipped, 'consents': consents};
  factory OnboardingChoices.fromJson(Map<String, dynamic> json) => OnboardingChoices(
    name: json['name'] as String? ?? '', goal: json['goal'] as String?,
    daysPerWeek: json['days_per_week'] as String?, notifications: json['notifications'] as bool? ?? false,
    largeText: json['large_text'] as bool? ?? false, skipped: json['skipped'] as bool? ?? false,
    consents: (json['consents'] as Map<String, dynamic>).cast<String, bool>(),
  );
}
