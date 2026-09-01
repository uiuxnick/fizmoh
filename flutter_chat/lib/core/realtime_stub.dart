import 'realtime.dart';

/// Never used — it exists so the conditional import has something to resolve
/// against on a platform that is neither web nor native.
RealtimeConnection createConnection({required String baseUrl, required String token}) =>
    throw UnsupportedError('No realtime transport on this platform');

dynamic jsonDecodeRaw(String source) => throw UnsupportedError('unsupported');
