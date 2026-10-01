import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/models.dart';

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key});

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 2, vsync: this);

  List<TrainingCourse> _courses = [];
  List<TrainingRegistration> _registrations = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final api = context.read<ApiClient>();
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final results = await Future.wait([
        api.trainingCourses(),
        api.trainingRegistrations(),
      ]);

      if (mounted) {
        setState(() {
          _courses = results[0] as List<TrainingCourse>;
          _registrations = results[1] as List<TrainingRegistration>;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Failed to load training academy data: $e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _checkIn(TrainingRegistration reg) async {
    final api = context.read<ApiClient>();
    final ok = await api.checkInAttendance(reg.id);
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Checked in ${reg.contactName}')),
      );
      _load();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not mark attendance')),
      );
    }
  }

  Future<void> _sendWhatsAppReminder(TrainingRegistration reg) async {
    final api = context.read<ApiClient>();
    try {
      await api.sendTrainingTemplate(
        registrationId: reg.id,
        templateType: 'course_reminder',
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('WhatsApp reminder sent to ${reg.contactName}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to send reminder: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tanfidh Training Academy', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabs,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Courses'),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${_courses.length}',
                      style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Registrations'),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: scheme.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${_registrations.length}',
                      style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(_error!, style: TextStyle(color: scheme.error)),
                      const SizedBox(height: 12),
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildCoursesList(),
                    _buildRegistrationsList(),
                  ],
                ),
    );
  }

  Widget _buildCoursesList() {
    if (_courses.isEmpty) {
      return const Center(child: Text('No courses found.'));
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _courses.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final c = _courses[i];
          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          c.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          c.status,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF10B981),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${c.category} · ${c.duration} · ${c.location}',
                    style: TextStyle(fontSize: 13, color: Colors.grey.shade600),
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Fee: ${c.currency} ${c.fees.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                      ),
                      Text(
                        'Enrolled: ${c.enrolledCount}/${c.totalCapacity}',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildRegistrationsList() {
    if (_registrations.isEmpty) {
      return const Center(child: Text('No registrations found.'));
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _registrations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, i) {
          final r = _registrations[i];
          final timeStr = r.registeredAt != null
              ? DateFormat.MMMd().add_jm().format(r.registeredAt!)
              : '';

          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            r.contactName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          Text(
                            r.registrationNumber,
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: r.attended
                              ? Colors.green.withValues(alpha: 0.1)
                              : Colors.orange.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          r.attended ? 'ATTENDED' : r.stage,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: r.attended ? Colors.green : Colors.orange.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    r.courseName,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  Text(
                    '${r.contactPhone} · ${r.contactEmail}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Amount: ${r.currency} ${r.totalPayable.toStringAsFixed(2)} (${r.paymentStatus})',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      Text(timeStr, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        icon: const Icon(Icons.send_rounded, size: 14),
                        label: const Text('WhatsApp Reminder', style: TextStyle(fontSize: 12)),
                        onPressed: () => _sendWhatsAppReminder(r),
                      ),
                      const SizedBox(width: 8),
                      if (!r.attended)
                        FilledButton.icon(
                          icon: const Icon(Icons.check_circle_outline, size: 14),
                          label: const Text('Check In', style: TextStyle(fontSize: 12)),
                          onPressed: () => _checkIn(r),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
