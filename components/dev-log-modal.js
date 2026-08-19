import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function roleColor(role, isDark) {
  if (role === 'user') return isDark ? '#60A5FA' : '#2563eb';
  if (role === 'assistant') return isDark ? '#4ADE80' : '#16a34a';
  return isDark ? '#FB923C' : '#ea580c';
}

function contentPreview(content) {
  if (!content) return '—';
  if (typeof content === 'string') return content.slice(0, 120) + (content.length > 120 ? '…' : '');
  if (Array.isArray(content)) {
    const first = content.find(b => b.type === 'text' || b.type === 'tool_result');
    const text = first?.text || first?.content || JSON.stringify(first);
    return String(text || '').slice(0, 120) + (String(text || '').length > 120 ? '…' : '');
  }
  return JSON.stringify(content).slice(0, 120) + '…';
}

function contentFull(content) {
  if (!content) return '—';
  if (typeof content === 'string') return content;
  return JSON.stringify(content, null, 2);
}

// ─── JSON Syntax Highlighting ────────────────────────────────────────────────

function HighlightedLine({ line, isDark }) {
  const defaultColor = isDark ? '#E2E8F0' : '#1e293b';
  const keyColor = isDark ? '#60A5FA' : '#2563eb';
  const colonColor = isDark ? '#94A3B8' : '#64748b';
  const stringColor = isDark ? '#4ADE80' : '#16a34a';
  const numberColor = isDark ? '#FB923C' : '#ea580c';
  const boolNullColor = isDark ? '#C084FC' : '#7c3aed';
  const bracketColor = isDark ? '#94A3B8' : '#64748b';
  const mono = { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, lineHeight: 17 };

  const kvMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)([\s\S]*?)(,?)$/);
  if (kvMatch) {
    const [, indent, key, colon, rawValue, trailingComma] = kvMatch;
    let valueColor = defaultColor;
    if (rawValue.startsWith('"')) valueColor = stringColor;
    else if (['true', 'false', 'null'].includes(rawValue)) valueColor = boolNullColor;
    else if (/^-?\d/.test(rawValue)) valueColor = numberColor;
    else if (['{', '[', '}', ']'].includes(rawValue.trim())) valueColor = bracketColor;
    return (
      <Text style={mono}>
        <Text style={{ color: defaultColor }}>{indent}</Text>
        <Text style={{ color: keyColor }}>{key}</Text>
        <Text style={{ color: colonColor }}>{colon}</Text>
        <Text style={{ color: valueColor }}>{rawValue}</Text>
        {trailingComma ? <Text style={{ color: defaultColor }}>,</Text> : null}
      </Text>
    );
  }
  const trimmed = line.trim();
  const isBracket = ['{', '}', '[', ']', '{,', '},', '[,', '],'].includes(trimmed) || trimmed === '';
  return (
    <Text style={[mono, { color: isBracket ? bracketColor : defaultColor }]}>{line}</Text>
  );
}

function JsonView({ data, isDark }) {
  let formatted;
  try {
    formatted = typeof data === 'string'
      ? JSON.stringify(JSON.parse(data), null, 2)
      : JSON.stringify(data, null, 2);
  } catch {
    formatted = String(data);
  }
  return (
    <View>
      {formatted.split('\n').map((line, i) => (
        <HighlightedLine key={i} line={line} isDark={isDark} />
      ))}
    </View>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function CollapsibleSection({ title, subtitle, accent, children, isDark, defaultOpen = false, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const textColor = isDark ? '#E2E8F0' : '#1e293b';
  const mutedColor = isDark ? '#94A3B8' : '#64748b';

  return (
    <View style={[sStyles.section, { backgroundColor: cardBg, borderColor: border }]}>
      <TouchableOpacity
        style={sStyles.sectionHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <View style={sStyles.sectionHeaderLeft}>
          <Ionicons
            name={open ? 'chevron-down' : 'chevron-forward'}
            size={14}
            color={accent || mutedColor}
            style={{ marginRight: 6 }}
          />
          <Text style={[sStyles.sectionTitle, { color: accent || textColor }]}>{title}</Text>
          {badge !== undefined && (
            <View style={[sStyles.badge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              <Text style={[sStyles.badgeText, { color: mutedColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        {subtitle && !open ? (
          <Text style={[sStyles.sectionSubtitle, { color: mutedColor }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </TouchableOpacity>
      {open && (
        <View style={[sStyles.sectionBody, { borderTopColor: border }]}>
          {children}
        </View>
      )}
    </View>
  );
}

const sStyles = StyleSheet.create({
  section: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  sectionBody: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
  },
  badge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

// ─── Message Row ──────────────────────────────────────────────────────────────

function MessageRow({ msg, idx, isDark }) {
  const [open, setOpen] = useState(false);
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const mutedColor = isDark ? '#94A3B8' : '#64748b';
  const rc = roleColor(msg.role, isDark);

  return (
    <View style={[mStyles.msgCard, { backgroundColor: bg, borderColor: border }]}>
      <TouchableOpacity style={mStyles.msgHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={12} color={mutedColor} style={{ marginRight: 6 }} />
        <View style={[mStyles.rolePill, { backgroundColor: rc + '22' }]}>
          <Text style={[mStyles.roleText, { color: rc }]}>{msg.role}</Text>
        </View>
        <Text style={{ color: mutedColor, fontSize: 11, marginLeft: 6 }}>#{idx}</Text>
        {!open && (
          <Text style={[mStyles.preview, { color: mutedColor }]} numberOfLines={1}>
            {contentPreview(msg.content)}
          </Text>
        )}
      </TouchableOpacity>
      {open && (
        <View style={[mStyles.msgBody, { borderTopColor: border }]}>
          <Text style={[mStyles.msgContent, { color: isDark ? '#E2E8F0' : '#1e293b', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]}>
            {contentFull(msg.content)}
          </Text>
        </View>
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  msgCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  rolePill: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  preview: {
    flex: 1,
    fontSize: 11,
    marginLeft: 8,
  },
  msgBody: {
    borderTopWidth: 1,
    padding: 10,
  },
  msgContent: {
    fontSize: 11,
    lineHeight: 17,
  },
});

// ─── Tool Row ─────────────────────────────────────────────────────────────────

function ToolRow({ tool, isDark }) {
  const [open, setOpen] = useState(false);
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const bg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';
  const mutedColor = isDark ? '#94A3B8' : '#64748b';
  const accentColor = isDark ? '#C084FC' : '#7c3aed';

  return (
    <View style={[mStyles.msgCard, { backgroundColor: bg, borderColor: border }]}>
      <TouchableOpacity style={mStyles.msgHeader} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={12} color={mutedColor} style={{ marginRight: 6 }} />
        <View style={[mStyles.rolePill, { backgroundColor: accentColor + '22' }]}>
          <Text style={[mStyles.roleText, { color: accentColor }]}>fn</Text>
        </View>
        <Text style={{ color: isDark ? '#E2E8F0' : '#1e293b', fontSize: 12, fontWeight: '600', marginLeft: 8 }}>
          {tool.name}
        </Text>
        {!open && tool.description && (
          <Text style={[mStyles.preview, { color: mutedColor }]} numberOfLines={1}>
            {tool.description}
          </Text>
        )}
      </TouchableOpacity>
      {open && (
        <View style={[mStyles.msgBody, { borderTopColor: border }]}>
          {tool.description && (
            <Text style={{ color: mutedColor, fontSize: 12, marginBottom: 8 }}>{tool.description}</Text>
          )}
          {tool.input_schema && (
            <JsonView data={tool.input_schema} isDark={isDark} />
          )}
        </View>
      )}
    </View>
  );
}

// ─── Meta Chip ────────────────────────────────────────────────────────────────

function MetaChip({ label, value, isDark, accent }) {
  const bg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const textColor = accent ? '#60A5FA' : (isDark ? '#E2E8F0' : '#1e293b');
  const labelColor = isDark ? '#94A3B8' : '#64748b';
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.chipValue, { color: textColor }]}>{value}</Text>
    </View>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export default function DevLogModal({ visible, onClose, calls = [] }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showRaw, setShowRaw] = useState(false);

  const bg = isDark ? '#0f0f10' : '#f1f5f9';
  const cardBg = isDark ? '#1c1c1e' : '#ffffff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const textColor = isDark ? '#E2E8F0' : '#1e293b';
  const mutedColor = isDark ? '#94A3B8' : '#64748b';
  const accentColor = '#60A5FA';

  const selectedCall = selectedIdx !== null ? calls[selectedIdx] : null;
  const rb = selectedCall?.requestBody;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          {selectedCall ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => { setSelectedIdx(null); setShowRaw(false); }}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color={accentColor} />
              <Text style={{ color: accentColor, fontSize: 16 }}>Calls</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          <View style={styles.headerCenter}>
            <Ionicons name="code-slash" size={16} color={accentColor} style={{ marginRight: 6 }} />
            <Text style={[styles.headerTitle, { color: textColor }]}>
              {selectedCall ? `Call #${selectedIdx + 1}` : 'API Log'}
            </Text>
          </View>

          {selectedCall ? (
            <TouchableOpacity
              style={[styles.rawToggle, { backgroundColor: showRaw ? accentColor : (isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)') }]}
              onPress={() => setShowRaw(r => !r)}
              activeOpacity={0.7}
            >
              <Text style={{ color: showRaw ? '#fff' : accentColor, fontSize: 12, fontWeight: '700' }}>
                {showRaw ? 'Structured' : 'Raw JSON'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Detail view ── */}
        {selectedCall ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.detailContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Meta chips */}
            <View style={[styles.metaRow, { backgroundColor: cardBg, borderColor: border }]}>
              <MetaChip label="Model" value={rb.model} isDark={isDark} />
              <MetaChip label="Max Tokens" value={String(rb.max_tokens ?? '—')} isDark={isDark} />
              <MetaChip label="Time" value={selectedCall.timestamp} isDark={isDark} />
              {selectedCall.iteration > 1 && (
                <MetaChip label="Iteration" value={String(selectedCall.iteration)} isDark={isDark} accent />
              )}
            </View>

            {showRaw ? (
              /* Raw JSON */
              <View style={[styles.jsonCard, { backgroundColor: cardBg, borderColor: border }]}>
                <JsonView data={rb} isDark={isDark} />
              </View>
            ) : (
              /* Structured collapsible sections */
              <>
                {/* System prompt */}
                {rb.system && (
                  <CollapsibleSection
                    title="system"
                    subtitle={rb.system.slice(0, 60) + '…'}
                    accent={isDark ? '#FB923C' : '#ea580c'}
                    isDark={isDark}
                    defaultOpen={false}
                  >
                    <Text style={{ color: isDark ? '#E2E8F0' : '#1e293b', fontSize: 13, lineHeight: 20 }}>
                      {rb.system}
                    </Text>
                  </CollapsibleSection>
                )}

                {/* Messages */}
                {rb.messages && (
                  <CollapsibleSection
                    title="messages"
                    badge={rb.messages.length}
                    accent={accentColor}
                    isDark={isDark}
                    defaultOpen={true}
                  >
                    {rb.messages.map((msg, i) => (
                      <MessageRow key={i} msg={msg} idx={i} isDark={isDark} />
                    ))}
                  </CollapsibleSection>
                )}

                {/* Tools */}
                {rb.tools && rb.tools.length > 0 && (
                  <CollapsibleSection
                    title="tools"
                    badge={rb.tools.length}
                    accent={isDark ? '#C084FC' : '#7c3aed'}
                    isDark={isDark}
                    defaultOpen={false}
                  >
                    {rb.tools.map((tool, i) => (
                      <ToolRow key={i} tool={tool} isDark={isDark} />
                    ))}
                  </CollapsibleSection>
                )}

                {/* Other scalar fields */}
                {Object.entries(rb)
                  .filter(([k]) => !['model', 'max_tokens', 'system', 'messages', 'tools'].includes(k))
                  .map(([k, v]) => (
                    <CollapsibleSection
                      key={k}
                      title={k}
                      subtitle={String(v).slice(0, 60)}
                      isDark={isDark}
                      defaultOpen={false}
                    >
                      <JsonView data={v} isDark={isDark} />
                    </CollapsibleSection>
                  ))}
              </>
            )}
          </ScrollView>
        ) : (
          /* ── List view ── */
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {calls.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="code-slash-outline" size={44} color={mutedColor} />
                <Text style={[styles.emptyTitle, { color: mutedColor }]}>No API calls yet</Text>
                <Text style={[styles.emptySub, { color: mutedColor }]}>
                  Send a message to see calls logged here
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={onClose} style={[styles.closeRowButton, { borderColor: border }]} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={mutedColor} />
                  <Text style={{ color: mutedColor, fontSize: 14 }}>Close</Text>
                </TouchableOpacity>
                {calls.map((call, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.callCard, { backgroundColor: cardBg, borderColor: border }]}
                    onPress={() => setSelectedIdx(idx)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.callBadge, { backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(37,99,235,0.08)' }]}>
                      <Text style={{ color: accentColor, fontSize: 13, fontWeight: '700' }}>#{idx + 1}</Text>
                    </View>
                    <View style={styles.callInfo}>
                      <Text style={[styles.callModel, { color: textColor }]} numberOfLines={1}>
                        {call.requestBody.model}
                      </Text>
                      <Text style={[styles.callMeta, { color: mutedColor }]} numberOfLines={1}>
                        {call.requestBody.messages?.length ?? 0} msg
                        {call.requestBody.messages?.length !== 1 ? 's' : ''}
                        {'  ·  '}
                        {call.timestamp}
                        {call.iteration > 1 ? `  ·  tool follow-up #${call.iteration}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={mutedColor} />
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 2,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 80,
    alignItems: 'flex-end',
    padding: 2,
  },
  rawToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  detailContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
  },
  closeRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 4,
  },
  callCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  callBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callInfo: {
    flex: 1,
    gap: 3,
  },
  callModel: {
    fontSize: 15,
    fontWeight: '600',
  },
  callMeta: {
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  chip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 2,
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  jsonCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
});
