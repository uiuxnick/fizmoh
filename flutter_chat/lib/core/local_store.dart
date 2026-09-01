import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

/// The copy of the inbox that lives on the phone.
///
/// Before this, every launch asked the server for every conversation and, on
/// opening a thread, every message it had ever contained. That is a wait whose
/// length grows with how long somebody has been a customer — the opposite of
/// what a chat app should feel like.
///
/// What is stored is the server's own JSON, not a column per field. The models
/// already know how to read that shape, so a cached row and a fresh response
/// are parsed by the same code, and adding a field to the API later needs no
/// migration here. Rows are keyed by id, so a re-fetch overwrites rather than
/// duplicates.
///
/// Not used on the web build: a browser has no sqflite, and a tab that is
/// closed and reopened is a different situation from an app expected to work
/// on a train with no signal.
class LocalStore {
  LocalStore._(this._db);

  final Database _db;

  static const _version = 2;

  /// Opens the database for one signed-in person.
  ///
  /// Scoped by staff id: a shared phone that two people sign into must not
  /// show the second one the first one's conversations.
  static Future<LocalStore?> open(String staffId) async {
    if (kIsWeb) return null;
    try {
      final dir = await getDatabasesPath();
      final safe = staffId.replaceAll(RegExp(r'[^A-Za-z0-9_-]'), '');
      return openAt(databaseFactory, p.join(dir, 'inbox_$safe.db'));
    } catch (e) {
      // A cache that cannot be opened is a reason to be slower, never a reason
      // to fail to start. Everything below degrades to "no cached rows".
      debugPrint('[LocalStore] Could not open the local database: $e');
      return null;
    }
  }

  /// Opens a database at an explicit path with an explicit factory.
  ///
  /// Exists so the schema and the queries can be tested against a real SQLite
  /// database rather than a mock — the outbox is the part of this file whose
  /// whole purpose is to survive a process dying, and a mock cannot show that.
  @visibleForTesting
  static Future<LocalStore> openAt(DatabaseFactory factory, String path) async {
    final db = await factory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: _version,
        onCreate: (db, _) async {
          await db.execute('''
            CREATE TABLE conversations (
              id TEXT PRIMARY KEY,
              json TEXT NOT NULL,
              last_message_at INTEGER NOT NULL DEFAULT 0
            )
          ''');
          await db.execute(
            'CREATE INDEX idx_conversations_recent ON conversations (last_message_at DESC)',
          );
          // The thread as the server returns it: messages, notes and the
          // session window together, because that is what the screen needs and
          // splitting them means three reads to draw one view.
          await db.execute('''
            CREATE TABLE threads (
              conversation_id TEXT PRIMARY KEY,
              json TEXT NOT NULL,
              cached_at INTEGER NOT NULL DEFAULT 0
            )
          ''');
          await db.execute('''
            CREATE TABLE bookings (
              id TEXT PRIMARY KEY,
              json TEXT NOT NULL,
              updated_at INTEGER NOT NULL DEFAULT 0
            )
          ''');
          await db.execute('''
            CREATE TABLE meta (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            )
          ''');
          await _createOutbox(db);
        },
        onUpgrade: (db, from, to) async {
          if (from < 2) await _createOutbox(db);
        },
      ),
    );
    return LocalStore._(db);
  }

  // ── conversations ──────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> conversations() async {
    try {
      final rows = await _db.query(
        'conversations',
        columns: ['json'],
        orderBy: 'last_message_at DESC',
      );
      return rows
          .map((r) => jsonDecode(r['json'] as String))
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      debugPrint('[LocalStore] conversations read failed: $e');
      return const [];
    }
  }

  /// Writes what the server just returned.
  ///
  /// [replace] empties the table first, which is right for a full refresh: a
  /// conversation deleted on the server would otherwise sit in the cache for
  /// ever, because an upsert can only add and update. A delta passes false,
  /// since it is only being told what changed.
  Future<void> saveConversations(
    List<Map<String, dynamic>> items, {
    bool replace = false,
  }) async {
    if (items.isEmpty && !replace) return;
    try {
      await _db.transaction((txn) async {
        if (replace) await txn.delete('conversations');
        final batch = txn.batch();
        for (final item in items) {
          final id = item['id']?.toString();
          if (id == null || id.isEmpty) continue;
          batch.insert(
            'conversations',
            {
              'id': id,
              'json': jsonEncode(item),
              'last_message_at':
                  _millis(item['lastMessageAt']) ?? _millis(item['updatedAt']) ?? 0,
            },
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
        }
        await batch.commit(noResult: true);
      });
    } catch (e) {
      debugPrint('[LocalStore] conversations write failed: $e');
    }
  }

  // ── threads ────────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>?> thread(String conversationId) async {
    try {
      final rows = await _db.query(
        'threads',
        columns: ['json'],
        where: 'conversation_id = ?',
        whereArgs: [conversationId],
        limit: 1,
      );
      if (rows.isEmpty) return null;
      final decoded = jsonDecode(rows.first['json'] as String);
      return decoded is Map<String, dynamic> ? decoded : null;
    } catch (e) {
      debugPrint('[LocalStore] thread read failed: $e');
      return null;
    }
  }

  Future<void> saveThread(String conversationId, Map<String, dynamic> body) async {
    try {
      await _db.insert(
        'threads',
        {
          'conversation_id': conversationId,
          'json': jsonEncode(body),
          'cached_at': DateTime.now().millisecondsSinceEpoch,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (e) {
      debugPrint('[LocalStore] thread write failed: $e');
    }
  }

  // ── bookings ───────────────────────────────────────────────────────────────

  Future<List<Map<String, dynamic>>> bookings() async {
    try {
      final rows =
          await _db.query('bookings', columns: ['json'], orderBy: 'updated_at DESC');
      return rows
          .map((r) => jsonDecode(r['json'] as String))
          .whereType<Map<String, dynamic>>()
          .toList();
    } catch (e) {
      debugPrint('[LocalStore] bookings read failed: $e');
      return const [];
    }
  }

  Future<void> saveBookings(List<Map<String, dynamic>> items, {bool replace = false}) async {
    if (items.isEmpty && !replace) return;
    try {
      await _db.transaction((txn) async {
        if (replace) await txn.delete('bookings');
        final batch = txn.batch();
        for (final item in items) {
          final id = item['id']?.toString();
          if (id == null || id.isEmpty) continue;
          batch.insert(
            'bookings',
            {
              'id': id,
              'json': jsonEncode(item),
              'updated_at': _millis(item['updatedAt']) ?? _millis(item['createdAt']) ?? 0,
            },
            conflictAlgorithm: ConflictAlgorithm.replace,
          );
        }
        await batch.commit(noResult: true);
      });
    } catch (e) {
      debugPrint('[LocalStore] bookings write failed: $e');
    }
  }

  // ── outbox ─────────────────────────────────────────────────────────────────

  /// Messages typed but not yet accepted by the server.
  ///
  /// Before this, a send on a bad connection simply failed: the bubble turned
  /// red and the text was gone unless somebody retyped it. An agent walking
  /// between buildings, or on a stable's wifi, loses messages that way — and
  /// the customer waiting on the other end never learns that anything was
  /// attempted.
  ///
  /// Rows survive a restart, so a message typed in a tunnel is still sent when
  /// the phone comes back, even if the app was closed in between.
  static Future<void> _createOutbox(Database db) async {
    await db.execute('''
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      )
    ''');
    await db.execute(
      'CREATE INDEX IF NOT EXISTS idx_outbox_conversation ON outbox (conversation_id, created_at)',
    );
  }

  Future<void> enqueue({
    required String id,
    required String conversationId,
    required String text,
    required DateTime createdAt,
  }) async {
    try {
      await _db.insert(
        'outbox',
        {
          'id': id,
          'conversation_id': conversationId,
          'text': text,
          'created_at': createdAt.millisecondsSinceEpoch,
          'attempts': 0,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (e) {
      debugPrint('[LocalStore] outbox write failed: $e');
    }
  }

  /// Everything waiting, oldest first — the order it was typed in, which is
  /// the order it has to arrive in.
  Future<List<QueuedMessage>> outbox({String? conversationId}) async {
    try {
      final rows = await _db.query(
        'outbox',
        where: conversationId == null ? null : 'conversation_id = ?',
        whereArgs: conversationId == null ? null : [conversationId],
        orderBy: 'created_at ASC',
      );
      return rows.map(QueuedMessage._fromRow).toList();
    } catch (e) {
      debugPrint('[LocalStore] outbox read failed: $e');
      return const [];
    }
  }

  Future<void> dequeue(String id) async {
    try {
      await _db.delete('outbox', where: 'id = ?', whereArgs: [id]);
    } catch (e) {
      debugPrint('[LocalStore] outbox delete failed: $e');
    }
  }

  /// Records a failed attempt without giving up on the message.
  Future<void> recordAttempt(String id, String error) async {
    try {
      await _db.rawUpdate(
        'UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?',
        [error, id],
      );
    } catch (e) {
      debugPrint('[LocalStore] outbox attempt write failed: $e');
    }
  }

  // ── sync cursors ───────────────────────────────────────────────────────────

  Future<String?> cursor(String name) async {
    try {
      final rows = await _db.query('meta', where: 'key = ?', whereArgs: [name], limit: 1);
      return rows.isEmpty ? null : rows.first['value'] as String?;
    } catch (_) {
      return null;
    }
  }

  Future<void> setCursor(String name, String value) async {
    try {
      await _db.insert(
        'meta',
        {'key': name, 'value': value},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (e) {
      debugPrint('[LocalStore] cursor write failed: $e');
    }
  }

  /// Signing out, or switching workspace, empties the cache.
  ///
  /// One person can administer several businesses and their staff id does not
  /// change when they switch — so without this they would be shown one
  /// business's conversations while looking at another.
  Future<void> clear() async {
    try {
      await _db.transaction((txn) async {
        await txn.delete('conversations');
        await txn.delete('threads');
        await txn.delete('bookings');
        await txn.delete('meta');
        await txn.delete('outbox');
      });
    } catch (e) {
      debugPrint('[LocalStore] clear failed: $e');
    }
  }

  Future<void> close() async {
    try {
      await _db.close();
    } catch (_) {}
  }

  static int? _millis(dynamic value) {
    if (value == null) return null;
    final parsed = DateTime.tryParse(value.toString());
    return parsed?.millisecondsSinceEpoch;
  }
}

/// One message waiting to be sent.
class QueuedMessage {
  const QueuedMessage({
    required this.id,
    required this.conversationId,
    required this.text,
    required this.createdAt,
    required this.attempts,
    this.lastError,
  });

  factory QueuedMessage._fromRow(Map<String, Object?> row) => QueuedMessage(
        id: row['id'] as String,
        conversationId: row['conversation_id'] as String,
        text: row['text'] as String,
        createdAt: DateTime.fromMillisecondsSinceEpoch(row['created_at'] as int? ?? 0),
        attempts: row['attempts'] as int? ?? 0,
        lastError: row['last_error'] as String?,
      );

  final String id;
  final String conversationId;
  final String text;
  final DateTime createdAt;
  final int attempts;
  final String? lastError;
}
