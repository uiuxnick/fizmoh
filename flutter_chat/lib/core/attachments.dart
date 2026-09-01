import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

/// Picking things to send.
///
/// Each function returns bytes plus a filename, or null when the person
/// changed their mind — a cancelled picker is not an error and must not
/// produce one.
class Attachments {
  Attachments._();

  static final _picker = ImagePicker();

  static Future<PickedFile?> image({required bool fromCamera}) async {
    final file = await _picker.pickImage(
      source: fromCamera ? ImageSource.camera : ImageSource.gallery,
      // Full-resolution phone photos are 5–10 MB and take a minute to send on
      // a weak connection. This is plenty for a chat and a fraction of the
      // size.
      maxWidth: 1600,
      imageQuality: 82,
    );
    if (file == null) return null;
    return PickedFile(name: file.name, bytes: await file.readAsBytes(), contentType: 'image/jpeg');
  }

  static Future<PickedFile?> document() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    final file = result?.files.firstOrNull;
    if (file == null) return null;

    final bytes = file.bytes ?? (file.path != null ? await File(file.path!).readAsBytes() : null);
    if (bytes == null) return null;
    return PickedFile(name: file.name, bytes: bytes, contentType: 'application/octet-stream');
  }

  /// The current position, having asked for permission first.
  ///
  /// Returns a reason rather than null when it fails, because "nothing
  /// happened" is the least helpful thing a location button can do.
  static Future<({double lat, double lng})?> location() async {
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      throw AttachmentRefused('Location permission is off. Turn it on in Settings to share a location.');
    }
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw AttachmentRefused('Location services are switched off on this device.');
    }

    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium),
    );
    return (lat: position.latitude, lng: position.longitude);
  }

  /// Automatically prunes temporary voice recordings older than 14 days to keep
  /// disk storage lean and avoid accumulating gigabytes of voice clips over time.
  static Future<void> pruneOldRecordings({Duration maxAge = const Duration(days: 14)}) async {
    try {
      final directory = await getTemporaryDirectory();
      final threshold = DateTime.now().subtract(maxAge);
      final files = directory.listSync();
      for (final entity in files) {
        if (entity is File && entity.path.contains('voice_')) {
          final stat = await entity.stat();
          if (stat.modified.isBefore(threshold)) {
            await entity.delete().catchError((_) => entity);
          }
        }
      }
    } catch (_) {
      // Storage cleanup failure is non-fatal.
    }
  }
}

class PickedFile {
  const PickedFile({required this.name, required this.bytes, required this.contentType});

  final String name;
  final Uint8List bytes;
  final String contentType;
}

class AttachmentRefused implements Exception {
  AttachmentRefused(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Recording a voice note.
///
/// Held as an object rather than a set of functions because a recording has
/// state: it is running, it has a length, and it has to be stopped exactly
/// once. Losing track of that leaves the microphone on.
class VoiceRecorder {
  final AudioRecorder _recorder = AudioRecorder();
  String? _path;
  DateTime? _startedAt;

  bool get recording => _startedAt != null;
  Duration get elapsed =>
      _startedAt == null ? Duration.zero : DateTime.now().difference(_startedAt!);

  Future<bool> start() async {
    if (!await _recorder.hasPermission()) return false;
    final directory = await getTemporaryDirectory();
    _path = '${directory.path}/voice_${DateTime.now().millisecondsSinceEpoch}.m4a';
    // AAC in an m4a container: what WhatsApp accepts, and small.
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: _path!);
    _startedAt = DateTime.now();
    return true;
  }

  /// Stops and returns the recording, or null if it was too short to be
  /// anything but an accidental tap.
  Future<PickedFile?> stop() async {
    if (_startedAt == null) return null;
    final tooShort = elapsed < const Duration(milliseconds: 700);
    _startedAt = null;

    final path = await _recorder.stop();
    if (path == null) return null;

    final file = File(path);
    if (!await file.exists()) return null;
    if (tooShort) {
      await file.delete().catchError((_) => file);
      return null;
    }

    return PickedFile(
      name: path.split('/').last,
      bytes: await file.readAsBytes(),
      contentType: 'audio/mp4',
    );
  }

  Future<void> cancel() async {
    _startedAt = null;
    final path = await _recorder.stop();
    if (path != null) await File(path).delete().catchError((e) => File(path));
  }

  void dispose() => _recorder.dispose();
}
