import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Light, dark, or whatever the phone is doing.
///
/// Kept because the phone's setting is not always the right one here: an agent
/// working a night shift wants the dark one at nine in the morning, and
/// somebody reading a thread in sunlight wants the light one at midnight.
class Appearance extends ChangeNotifier {
  ThemeMode mode = ThemeMode.system;

  static const _key = 'fizmoh_theme_mode';

  Future<void> restore() async {
    final prefs = await SharedPreferences.getInstance();
    switch (prefs.getString(_key)) {
      case 'light':
        mode = ThemeMode.light;
      case 'dark':
        mode = ThemeMode.dark;
      default:
        mode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> set(ThemeMode next) async {
    if (next == mode) return;
    mode = next;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, switch (next) {
      ThemeMode.light => 'light',
      ThemeMode.dark => 'dark',
      ThemeMode.system => 'system',
    });
  }
}
