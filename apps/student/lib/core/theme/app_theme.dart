import 'package:flutter/material.dart';

abstract final class AppTheme {
  static const navy = Color(0xFF0B223C);
  static const navyDeep = Color(0xFF081A2E);
  static const lime = Color(0xFFB6F542);
  static const limeSoft = Color(0xFFEEFBD7);
  static const background = Color(0xFFF4F6F9);
  static const muted = Color(0xFF52647A);
  static const border = Color(0xFFD9E1EB);

  static ThemeData get light {
    final scheme = ColorScheme.fromSeed(seedColor: navy).copyWith(
      primary: navy,
      onPrimary: Colors.white,
      secondary: lime,
      onSecondary: navy,
      surface: Colors.white,
      onSurface: navy,
      outline: border,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      visualDensity: VisualDensity.standard,
      materialTapTargetSize: MaterialTapTargetSize.padded,
      appBarTheme: const AppBarTheme(
        backgroundColor: navy,
        foregroundColor: Colors.white,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: lime,
          foregroundColor: navy,
          minimumSize: const Size(44, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: Colors.white,
        indicatorColor: limeSoft,
      ),
    );
  }
}
