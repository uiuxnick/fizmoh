import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/api_client.dart';
import '../core/attachments.dart';
import '../core/chat_store.dart';
import '../core/models.dart';
import 'kit.dart';
import 'tokens.dart';
import 'net_image.dart';

/// Everything an agent can say without typing it: suggestions, saved replies,
/// and approved templates.
///
/// The three are kept apart because they behave differently. A suggestion and
/// a saved reply land in the message box to be edited, and only work while the
/// reply window is open. A template is sent exactly as Meta approved it,
/// cannot be edited, and is the only thing that reaches a customer after 24
/// hours. One merged list would hide that where it matters most.
///
/// Returns the text of whatever was picked, for the composer to fill in.
/// Templates send themselves and return nothing.
Future<String?> showReplyLibrary(BuildContext context, {bool templatesFirst = false}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (sheetContext) => SizedBox(
      height: MediaQuery.of(sheetContext).size.height * .85,
      child: _ReplyLibrary(templatesFirst: templatesFirst),
    ),
  );
}

class _ReplyLibrary extends StatefulWidget {
  const _ReplyLibrary({required this.templatesFirst});

  final bool templatesFirst;

  @override
  State<_ReplyLibrary> createState() => _ReplyLibraryState();
}

class _ReplyLibraryState extends State<_ReplyLibrary> with SingleTickerProviderStateMixin {
  late final TabController _tabs =
      TabController(length: 3, vsync: this, initialIndex: widget.templatesFirst ? 2 : 0);
  final _search = TextEditingController();

  List<String> _suggestions = [];
  List<CannedResponse> _canned = [];
  List<MessageTemplate> _templates = [];
  bool _loading = true;
  bool _thinking = true;
  String? _error;
  String _query = '';

  ApiClient get _api => context.read<ApiClient>();

  @override
  void initState() {
    super.initState();
    _load();
    _suggest();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final canned = await _api.cannedResponses();
      final templates = await _api.templates();
      if (!mounted) return;
      setState(() { _canned = canned; _templates = templates; _loading = false; });
    } catch (_) {
      if (mounted) setState(() { _error = 'Could not load your replies'; _loading = false; });
    }
  }

  /// Asks the assistant what to say next.
  ///
  /// Separate from the rest: it is the slow one, and a saved reply should not
  /// wait behind a model. It fails quietly — no suggestion is a normal state,
  /// not an error worth a banner.
  Future<void> _suggest() async {
    final id = context.read<ChatStore>().openConversationId;
    if (id == null) {
      setState(() => _thinking = false);
      return;
    }
    try {
      final replies = await _api.smartReplies(id);
      if (mounted) setState(() { _suggestions = replies; _thinking = false; });
    } catch (_) {
      if (mounted) setState(() => _thinking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final term = _query.trim().toLowerCase();

    final canned = _canned.where((c) =>
        term.isEmpty ||
        c.title.toLowerCase().contains(term) ||
        c.content.toLowerCase().contains(term)).toList();
    final templates = _templates.where((t) =>
        term.isEmpty ||
        t.name.toLowerCase().contains(term) ||
        t.body.toLowerCase().contains(term)).toList();

    return Column(children: [
      const PageHeader(title: 'Replies', subtitle: 'Suggested, saved, and approved'),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: T.s4),
        child: SearchField(
          controller: _search,
          hint: 'Search replies',
          onChanged: (v) => setState(() => _query = v),
        ),
      ),
      const SizedBox(height: T.s2),
      TabBar(
        controller: _tabs,
        tabs: const [Tab(text: 'Suggested'), Tab(text: 'Saved'), Tab(text: 'Templates')],
      ),
      Expanded(
        child: TabBarView(controller: _tabs, children: [
          _suggestionsTab(),
          _loading
              ? ListView(children: List.generate(6, (i) => const SkeletonRow()))
              : _error != null
                  ? EmptyState(
                      icon: Icons.cloud_off_rounded,
                      title: _error!,
                      actionLabel: 'Try again',
                      onAction: () { setState(() { _loading = true; _error = null; }); _load(); },
                    )
                  : canned.isEmpty
                      ? const EmptyState(
                          icon: Icons.bolt_outlined,
                          title: 'No saved replies',
                          message: 'Add them in the dashboard under Canned responses.',
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.only(bottom: T.s6),
                          itemCount: canned.length,
                          itemBuilder: (context, i) => _CannedRow(
                            reply: canned[i],
                            // Popped as text rather than sent: an agent almost
                            // always adds a name or a date to a saved reply.
                            onTap: () => Navigator.of(context).pop(canned[i].content),
                          ),
                        ),
          _loading
              ? ListView(children: List.generate(6, (i) => const SkeletonRow()))
              : templates.isEmpty
                  ? const EmptyState(
                      icon: Icons.article_outlined,
                      title: 'No approved templates',
                      message: 'Only templates Meta has approved can be sent. '
                          'Submit one in the dashboard and it appears here.',
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.only(bottom: T.s6),
                      itemCount: templates.length,
                      itemBuilder: (context, i) => _TemplateRow(
                        template: templates[i],
                        onTap: () => _composeTemplate(templates[i]),
                      ),
                    ),
        ]),
      ),
      Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(T.s4, T.s2, T.s4, T.s4),
        color: scheme.surface,
        child: Text(
          'Suggestions and saved replies land in the message box so you can '
          'change them. Templates are sent exactly as approved.',
          style: TextStyle(fontSize: 11.5, height: 1.35, color: scheme.onSurfaceVariant),
        ),
      ),
    ]);
  }

  Widget _suggestionsTab() {
    if (_thinking) {
      return ListView(padding: const EdgeInsets.all(T.s4), children: const [
        Skeleton(height: 62, radius: T.rLg),
        SizedBox(height: T.s2),
        Skeleton(height: 62, radius: T.rLg),
        SizedBox(height: T.s2),
        Skeleton(height: 62, radius: T.rLg),
      ]);
    }
    if (_suggestions.isEmpty) {
      return EmptyState(
        icon: Icons.auto_awesome_outlined,
        title: 'Nothing to suggest',
        message: 'Suggestions are written from the last few messages. '
            'They need an AI key configured, and something to reply to.',
        actionLabel: 'Try again',
        onAction: () { setState(() => _thinking = true); _suggest(); },
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(T.s4, T.s3, T.s4, T.s6),
      itemCount: _suggestions.length + 1,
      itemBuilder: (context, i) {
        if (i == _suggestions.length) {
          return Padding(
            padding: const EdgeInsets.only(top: T.s3),
            child: Center(
              child: TextButton.icon(
                onPressed: () { setState(() => _thinking = true); _suggest(); },
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('Suggest again'),
              ),
            ),
          );
        }
        final reply = _suggestions[i];
        return Panel(
          margin: const EdgeInsets.only(bottom: T.s2),
          // Nothing is sent from here. Written text goes to the message box,
          // where the agent reads it once more before it reaches a customer.
          onTap: () => Navigator.of(context).pop(reply),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(Icons.auto_awesome, size: 16, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: T.s2),
            Expanded(child: Text(reply, style: const TextStyle(fontSize: 14.5, height: 1.4))),
          ]),
        );
      },
    );
  }

  Future<void> _composeTemplate(MessageTemplate template) async {
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => Padding(
        // Above the keyboard, since the variables are typed.
        padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom),
        child: SizedBox(
          height: MediaQuery.of(sheetContext).size.height * .85,
          child: _TemplateComposer(template: template),
        ),
      ),
    );
    if (sent == true && mounted) Navigator.of(context).pop();
  }
}

class _CannedRow extends StatelessWidget {
  const _CannedRow({required this.reply, required this.onTap});

  final CannedResponse reply;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return ListRow(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(reply.title,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: Type.body(context).copyWith(fontWeight: FontWeight.w600)),
          ),
          StatusBadge(label: reply.category),
        ]),
        const SizedBox(height: 3),
        Text(reply.content,
            maxLines: 2, overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, height: 1.35, color: scheme.onSurfaceVariant)),
      ]),
    );
  }
}

class _TemplateRow extends StatelessWidget {
  const _TemplateRow({required this.template, required this.onTap});

  final MessageTemplate template;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final fields = template.placeholders.length;

    // What this template will ask for before it can be sent, said up front
    // rather than discovered halfway through filling it in.
    final wants = <String>[
      if (template.isCarousel) '${template.cards.length} card images',
      if (template.needsHeaderMedia && !template.isCarousel)
        'a ${template.headerMediaType}',
      if (fields > 0) '$fields value${fields == 1 ? '' : 's'}',
    ];

    return ListRow(
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
            child: Text(template.name,
                maxLines: 1, overflow: TextOverflow.ellipsis,
                style: Type.body(context).copyWith(fontWeight: FontWeight.w600)),
          ),
          if (template.isCarousel) ...[
            const StatusBadge(label: 'Carousel', tone: Tone.brand),
            const SizedBox(width: 5),
          ] else if (template.needsHeaderMedia) ...[
            StatusBadge(label: template.headerType.toLowerCase(), tone: Tone.brand),
            const SizedBox(width: 5),
          ],
          const StatusBadge(label: 'Approved', tone: Tone.success),
        ]),
        const SizedBox(height: 3),
        Text(template.body,
            maxLines: 2, overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 13, height: 1.35, color: scheme.onSurfaceVariant)),
        const SizedBox(height: 4),
        Text(
          wants.isEmpty
              ? '${template.language} · ready to send'
              : '${template.language} · needs ${wants.join(', ')}',
          style: Type.label(context),
        ),
      ]),
    );
  }
}

/// Fills in a template and sends it.
///
/// A template goes out exactly as approved and cannot be edited or recalled,
/// so the preview is the point: the agent reads the finished message rather
/// than a row of numbered boxes. Media is uploaded here rather than asked for
/// as a URL — Meta fetches the file itself, so it has to be somewhere public
/// before the send, and an agent has a photo on their phone, not a link.
class _TemplateComposer extends StatefulWidget {
  const _TemplateComposer({required this.template});

  final MessageTemplate template;

  @override
  State<_TemplateComposer> createState() => _TemplateComposerState();
}

class _TemplateComposerState extends State<_TemplateComposer> {
  late final List<TextEditingController> _fields = List.generate(
      widget.template.placeholders.length, (_) => TextEditingController());

  /// Card body values, one list per card.
  late final List<List<TextEditingController>> _cardFields = [
    for (final card in widget.template.cards)
      List.generate(card.placeholders.length, (_) => TextEditingController()),
  ];

  String? _headerUrl;
  String? _headerName;

  /// Each card starts on the image the template was approved with, when that
  /// is already a public link. A marketing carousel is usually the same for
  /// everybody, so making the agent re-upload the same four pictures every
  /// time is work for its own sake — they can still replace any of them.
  late final List<String?> _cardMedia = [
    for (final card in widget.template.cards)
      (card.imageUrl ?? '').startsWith('https://') ? card.imageUrl : null,
  ];

  bool _uploading = false;
  bool _sending = false;
  String? _uploadError;

  @override
  void dispose() {
    for (final field in _fields) {
      field.dispose();
    }
    for (final card in _cardFields) {
      for (final field in card) {
        field.dispose();
      }
    }
    super.dispose();
  }

  List<String> get _values => _fields.map((f) => f.text.trim()).toList();

  bool get _complete {
    if (_values.any((v) => v.isEmpty)) return false;
    if (widget.template.needsHeaderMedia && _headerUrl == null) return false;
    for (var i = 0; i < widget.template.cards.length; i++) {
      // Meta rejects a carousel outright if one card is missing its media —
      // it is not sent short, it is not sent at all.
      if (_cardMedia[i] == null) return false;
      if (_cardFields[i].any((f) => f.text.trim().isEmpty)) return false;
    }
    return true;
  }

  /// Picks a file and puts it somewhere Meta can fetch it from.
  Future<void> _pickMedia({int? cardIndex}) async {
    final wantsDocument =
        cardIndex == null && widget.template.headerMediaType == 'document';
    final api = context.read<ApiClient>();
    setState(() { _uploading = true; _uploadError = null; });
    try {
      final file = wantsDocument
          ? await Attachments.document()
          : await Attachments.image(fromCamera: false);
      if (file == null) {
        setState(() => _uploading = false);
        return;
      }
      final url = await api.uploadImage(file.name, file.bytes, file.contentType);
      if (!mounted) return;
      setState(() {
        if (cardIndex == null) {
          _headerUrl = url;
          _headerName = file.name;
        } else {
          _cardMedia[cardIndex] = url;
        }
        _uploading = false;
      });
    } on AttachmentRefused catch (e) {
      if (mounted) setState(() { _uploadError = e.message; _uploading = false; });
    } catch (e) {
      if (mounted) {
        setState(() {
          _uploadError = e is ApiException ? e.message : 'That file was not accepted';
          _uploading = false;
        });
      }
    }
  }

  Future<void> _send() async {
    final store = context.read<ChatStore>();
    setState(() => _sending = true);

    final cards = <Map<String, dynamic>>[
      for (var i = 0; i < widget.template.cards.length; i++)
        {
          'imageUrl': _cardMedia[i],
          'variables': _cardFields[i].map((f) => f.text.trim()).toList(),
        },
    ];

    final failure = await store.sendTemplate(
      name: widget.template.name,
      language: widget.template.language,
      variables: _values,
      preview: widget.template.filled(_values),
      headerMediaUrl: _headerUrl,
      headerMediaType: widget.template.needsHeaderMedia ? widget.template.headerMediaType : null,
      headerDocumentName: _headerName,
      cards: cards,
    );

    if (!mounted) return;
    setState(() => _sending = false);
    if (failure != null) {
      notify(context, failure, tone: Tone.danger);
      return;
    }
    Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final template = widget.template;
    final preview = template.filled(_values);

    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(T.s4, 0, T.s4, T.s4),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(template.name, style: Type.section(context)),
          const SizedBox(height: T.s1),
          Text('${template.category} · ${template.language}', style: Type.secondary(context)),
          const SizedBox(height: T.s4),

          if (template.needsHeaderMedia) ...[
            Text('Header ${template.headerMediaType}', style: Type.label(context)),
            const SizedBox(height: T.s2),
            _MediaSlot(
              url: _headerUrl,
              label: 'Choose a ${template.headerMediaType}',
              isDocument: template.headerMediaType == 'document',
              busy: _uploading,
              onTap: _uploading ? null : () => _pickMedia(),
            ),
            const SizedBox(height: T.s4),
          ],

          for (var i = 0; i < _fields.length; i++) ...[
            TextField(
              controller: _fields[i],
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(labelText: 'Value ${i + 1}'),
            ),
            const SizedBox(height: T.s3),
          ],

          if (template.isCarousel) ...[
            Text('Cards', style: Type.label(context)),
            const SizedBox(height: T.s2),
            for (var c = 0; c < template.cards.length; c++) ...[
              Panel(
                margin: const EdgeInsets.only(bottom: T.s2),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Card ${c + 1}', style: Type.label(context)),
                  const SizedBox(height: T.s2),
                  _MediaSlot(
                    url: _cardMedia[c],
                    label: 'Choose an image',
                    isDocument: false,
                    busy: _uploading,
                    onTap: _uploading ? null : () => _pickMedia(cardIndex: c),
                  ),
                  const SizedBox(height: T.s2),
                  Text(template.cards[c].filled(
                      _cardFields[c].map((f) => f.text.trim()).toList()),
                      style: const TextStyle(fontSize: 13.5, height: 1.35)),
                  for (var v = 0; v < _cardFields[c].length; v++) ...[
                    const SizedBox(height: T.s2),
                    TextField(
                      controller: _cardFields[c][v],
                      onChanged: (_) => setState(() {}),
                      decoration: InputDecoration(labelText: 'Card ${c + 1} value ${v + 1}'),
                    ),
                  ],
                ]),
              ),
            ],
            const SizedBox(height: T.s2),
          ],

          if (_uploadError != null) ...[
            Text(_uploadError!, style: TextStyle(fontSize: 12.5, color: scheme.error)),
            const SizedBox(height: T.s3),
          ],

          Text('What they will receive', style: Type.label(context)),
          const SizedBox(height: T.s2),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(T.s3),
            decoration: BoxDecoration(
              color: scheme.primary.withValues(alpha: .08),
              borderRadius: BorderRadius.circular(T.rLg),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (_headerUrl != null && template.headerMediaType == 'image') ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(T.rSm),
                  child: cachedNetworkImage(
                    _headerUrl!.startsWith('http')
                        ? _headerUrl!
                        : '${context.read<ApiClient>().baseUrl}$_headerUrl',
                    height: 130, width: double.infinity, fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                  ),
                ),
                const SizedBox(height: T.s2),
              ],
              if (template.header != null && template.header!.isNotEmpty) ...[
                Text(template.header!,
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700)),
                const SizedBox(height: T.s2),
              ],
              Text(preview, style: const TextStyle(fontSize: 15, height: 1.4)),
              if (template.footer != null && template.footer!.isNotEmpty) ...[
                const SizedBox(height: T.s2),
                Text(template.footer!, style: Type.label(context)),
              ],
            ]),
          ),
          const SizedBox(height: T.s4),

          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _complete && !_sending && !_uploading ? _send : null,
              icon: _sending
                  ? const SizedBox(height: 16, width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.send_rounded, size: 18),
              label: Text(_sending ? 'Sending' : 'Send template'),
            ),
          ),
          if (!_complete) ...[
            const SizedBox(height: T.s2),
            Text(
              template.isCarousel
                  ? 'Every card needs its image and its values. Meta rejects a '
                      'carousel with one card missing rather than sending the rest.'
                  : 'Fill in everything. Meta matches values by position, so a '
                      'blank one puts the rest in the wrong places.',
              style: Type.label(context),
            ),
          ],
        ]),
      ),
    );
  }
}

/// A picked file, or the invitation to pick one.
class _MediaSlot extends StatelessWidget {
  const _MediaSlot({
    required this.url,
    required this.label,
    required this.isDocument,
    required this.busy,
    required this.onTap,
  });

  final String? url;
  final String label;
  final bool isDocument;
  final bool busy;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // An uploaded file comes back as a path on this server; a template's own
    // card image is already a full link. Prefixing the second breaks it.
    final base = context.read<ApiClient>().baseUrl;
    final src = url == null
        ? null
        : url!.startsWith('http')
            ? url!
            : '$base$url';

    return InkWell(
      borderRadius: BorderRadius.circular(T.rLg),
      onTap: onTap,
      child: Container(
        height: url != null && !isDocument ? 130 : 62,
        width: double.infinity,
        decoration: BoxDecoration(
          color: scheme.surfaceContainerHighest.withValues(alpha: .5),
          borderRadius: BorderRadius.circular(T.rLg),
          border: Border.all(
            color: url == null ? scheme.outlineVariant : scheme.primary.withValues(alpha: .5),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        alignment: Alignment.center,
        child: busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : url == null
                ? Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(isDocument ? Icons.upload_file_rounded : Icons.add_photo_alternate_outlined,
                        size: T.iconMd, color: scheme.primary),
                    const SizedBox(width: T.s2),
                    Text(label,
                        style: TextStyle(
                            fontSize: 13.5, fontWeight: FontWeight.w600, color: scheme.primary)),
                  ])
                : isDocument
                    ? Row(mainAxisSize: MainAxisSize.min, children: [
                        const Icon(Icons.check_circle_rounded, size: T.iconMd, color: T.success),
                        const SizedBox(width: T.s2),
                        Text('File attached', style: Type.body(context)),
                      ])
                    : cachedNetworkImage(src!, fit: BoxFit.cover, width: double.infinity,
                        errorBuilder: (_, __, ___) => const Icon(Icons.broken_image_outlined)),
      ),
    );
  }
}
