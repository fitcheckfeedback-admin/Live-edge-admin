import { Feather } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useToast } from "@/contexts/ToastContext";
import { useColors } from "@/hooks/useColors";
import { API_BASE_URL } from "@/lib/apiBase";
import { colorForName, initials, relTime } from "@/lib/format";

interface ChatMessage {
  id: number;
  name: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

const NAME_KEY_ASYNC = "lounge.displayName";
const POLL_OPEN_MS = 2500;
const POLL_CLOSED_MS = 8000;
const NAME_MIN = 2;
const NAME_MAX = 20;
const CONTENT_MAX = 500;

// Lounge uses raw fetch (chat is not in the OpenAPI spec). It MUST go through
// the same validated base URL as the generated API client. If API_BASE_URL is
// null, the root layout already shows ConfigErrorScreen and Lounge never mounts.
const BASE = API_BASE_URL ?? "";

async function fetchInitial(): Promise<ChatMessage[]> {
  const r = await fetch(`${BASE}/api/chat/messages?limit=100`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j.messages) ? j.messages : [];
}
async function fetchSince(afterId: number): Promise<ChatMessage[]> {
  const r = await fetch(
    `${BASE}/api/chat/messages?after=${afterId}&limit=100`,
    { credentials: "include" },
  );
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j.messages) ? j.messages : [];
}
async function postMessage(name: string, content: string): Promise<ChatMessage | null> {
  const r = await fetch(`${BASE}/api/chat/messages`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j as { message?: string })?.message ?? `Failed (${r.status})`;
    throw new Error(msg);
  }
  return (j as { message?: ChatMessage }).message ?? null;
}

function mergeMessages(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  if (next.length === 0) return prev;
  const byId = new Map<number, ChatMessage>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of next) byId.set(m.id, m);
  const merged = Array.from(byId.values()).sort((a, b) => a.id - b.id);
  return merged.length > 500 ? merged.slice(-500) : merged;
}

import AsyncStorage from "@react-native-async-storage/async-storage";

function NamePromptModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (open) setValue(initial);
  }, [open, initial]);

  const trimmed = value.trim();
  const valid =
    trimmed.length >= NAME_MIN &&
    trimmed.length <= NAME_MAX &&
    /^[\p{L}\p{N}_\-. ]+$/u.test(trimmed);

  return (
    <Modal
      visible={open}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior="padding" style={{ width: "100%" }}>
          <View
            style={[
              styles.namePrompt,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                marginBottom: insets.bottom + 24,
              },
            ]}
          >
            <Text
              style={{
                color: colors.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 17,
              }}
            >
              Pick a display name
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
              This is what other people in The Lounge will see. You can change it later.
            </Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              placeholder="e.g. Sharp123"
              placeholderTextColor={colors.mutedForeground}
              maxLength={NAME_MAX}
              autoFocus
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.background,
                  borderColor: colors.cardBorder,
                },
              ]}
            />
            <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
              {NAME_MIN}-{NAME_MAX} chars. Letters, numbers, spaces, _-. allowed.
            </Text>
            <Pressable
              disabled={!valid}
              onPress={() => valid && onSave(trimmed)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: valid ? colors.primary : colors.muted,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: valid ? colors.primaryForeground : colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 14,
                }}
              >
                Enter The Lounge
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export function LoungeFab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const lastIdRef = useRef(0);
  const drawerOpenRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Load name from storage.
  useEffect(() => {
    AsyncStorage.getItem(NAME_KEY_ASYNC).then((v) => {
      if (v) setDisplayName(v);
    });
  }, []);

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
    if (drawerOpen) setUnread(0);
  }, [drawerOpen]);

  // Polling
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const next =
          lastIdRef.current === 0
            ? await fetchInitial()
            : await fetchSince(lastIdRef.current);
        if (cancelled) return;
        if (next.length > 0) {
          const maxId = next[next.length - 1]!.id;
          lastIdRef.current = Math.max(lastIdRef.current, maxId);
          setMessages((prev) => mergeMessages(prev, next));
          if (!drawerOpenRef.current) {
            const fromOthers = next.filter((m) => !m.isMine).length;
            if (fromOthers > 0) setUnread((u) => u + fromOthers);
          }
        }
        if (!loaded) setLoaded(true);
      } catch {
        // Silent retry
      } finally {
        if (!cancelled) {
          const delay = drawerOpenRef.current ? POLL_OPEN_MS : POLL_CLOSED_MS;
          timer = setTimeout(tick, delay);
        }
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDrawer = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (!displayName) {
      setNamePromptOpen(true);
      return;
    }
    setDrawerOpen(true);
  }, [displayName, scaleAnim]);

  const handleSaveName = useCallback((name: string) => {
    AsyncStorage.setItem(NAME_KEY_ASYNC, name).catch(() => {});
    setDisplayName(name);
    setNamePromptOpen(false);
    setDrawerOpen(true);
  }, []);

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !displayName || posting) return;
    setPosting(true);
    try {
      const msg = await postMessage(displayName, content);
      if (msg) {
        setMessages((prev) => mergeMessages(prev, [msg]));
        setDraft("");
      }
    } catch (err) {
      show({
        title: "Couldn't send",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  }, [draft, displayName, posting, show]);

  // Inverted FlatList — show newest at the bottom (visually).
  const inverted = [...messages].reverse();

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          {
            bottom: 90 + insets.bottom,
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Pressable
          onPress={openDrawer}
          hitSlop={6}
          style={styles.fabPressable}
          accessibilityLabel="Open The Lounge"
        >
          <Feather name="message-circle" size={22} color={colors.primaryForeground} />
          {unread > 0 && (
            <View
              style={[
                styles.unread,
                {
                  backgroundColor: colors.destructive,
                  borderColor: colors.background,
                },
              ]}
            >
              <Text
                style={{
                  color: "#fff",
                  fontFamily: "Inter_700Bold",
                  fontSize: 10,
                }}
              >
                {unread > 99 ? "99+" : unread}
              </Text>
            </View>
          )}
        </Pressable>
      </Animated.View>

      {/* Drawer */}
      <Modal
        visible={drawerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDrawerOpen(false)}
        statusBarTranslucent
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <Pressable style={{ flex: 1 }} onPress={() => setDrawerOpen(false)} />
          <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.drawer}>
            <View
              style={[
                styles.drawerInner,
                { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}
            >
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: colors.divider }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                  <View
                    style={[
                      styles.headerIcon,
                      {
                        backgroundColor: "rgba(34,197,94,0.15)",
                        borderColor: "rgba(34,197,94,0.4)",
                      },
                    ]}
                  >
                    <Feather name="users" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.foreground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 15,
                      }}
                    >
                      The Lounge
                    </Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                      {displayName ? (
                        <>
                          Posting as{" "}
                          <Text
                            style={{ color: colors.primary }}
                            onPress={() => setNamePromptOpen(true)}
                          >
                            {displayName}
                          </Text>
                        </>
                      ) : (
                        "Pick a name to chat"
                      )}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setDrawerOpen(false)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.closeIcon, { opacity: pressed ? 0.5 : 1 }]}
                >
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Messages list (inverted) */}
              {!loaded ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                    Loading messages…
                  </Text>
                </View>
              ) : inverted.length === 0 ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                  <Feather name="message-square" size={36} color={colors.mutedForeground} style={{ opacity: 0.4 }} />
                  <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", marginTop: 12 }}>
                    No messages yet
                  </Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 2 }}>
                    Be the first to say something.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={inverted}
                  keyExtractor={(m) => String(m.id)}
                  inverted
                  contentContainerStyle={{ padding: 12, gap: 10 }}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: m }) => (
                    <View
                      style={[
                        styles.msgRow,
                        m.isMine ? { flexDirection: "row-reverse" } : null,
                      ]}
                    >
                      <View style={[styles.avatar, { backgroundColor: colorForName(m.name) }]}>
                        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10 }}>
                          {initials(m.name)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.bubble,
                          m.isMine
                            ? {
                                backgroundColor: "rgba(34,197,94,0.15)",
                                borderColor: "rgba(34,197,94,0.4)",
                              }
                            : {
                                backgroundColor: colors.background,
                                borderColor: colors.cardBorder,
                              },
                        ]}
                      >
                        <View style={{ flexDirection: "row", gap: 6, alignItems: "baseline", marginBottom: 2 }}>
                          <Text
                            style={{
                              color: m.isMine ? colors.primary : colors.foreground,
                              fontFamily: "Inter_700Bold",
                              fontSize: 11.5,
                            }}
                          >
                            {m.isMine ? "You" : m.name}
                          </Text>
                          <Text style={{ color: colors.mutedForeground, fontSize: 10 }}>
                            {relTime(m.createdAt)}
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 13.5,
                            lineHeight: 18,
                          }}
                        >
                          {m.content}
                        </Text>
                      </View>
                    </View>
                  )}
                />
              )}

              {/* Composer */}
              <View
                style={[
                  styles.composer,
                  {
                    borderTopColor: colors.divider,
                    paddingBottom: Math.max(10, insets.bottom),
                  },
                ]}
              >
                {displayName ? (
                  <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                    <TextInput
                      value={draft}
                      onChangeText={setDraft}
                      placeholder="Say something…"
                      placeholderTextColor={colors.mutedForeground}
                      maxLength={CONTENT_MAX}
                      multiline
                      style={[
                        styles.input,
                        {
                          flex: 1,
                          maxHeight: 100,
                          minHeight: 42,
                          backgroundColor: colors.background,
                          color: colors.foreground,
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    />
                    <Pressable
                      disabled={posting || !draft.trim()}
                      onPress={handleSend}
                      style={({ pressed }) => [
                        styles.sendBtn,
                        {
                          backgroundColor:
                            posting || !draft.trim() ? colors.muted : colors.primary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Feather
                        name="send"
                        size={16}
                        color={
                          posting || !draft.trim()
                            ? colors.mutedForeground
                            : colors.primaryForeground
                        }
                      />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setNamePromptOpen(true)}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text
                      style={{
                        color: colors.primaryForeground,
                        fontFamily: "Inter_700Bold",
                        fontSize: 14,
                      }}
                    >
                      Pick a name to chat
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <NamePromptModal
        open={namePromptOpen}
        initial={displayName}
        onSave={handleSaveName}
        onClose={() => setNamePromptOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },
  fabPressable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 27,
  },
  unread: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  drawer: { height: "85%" },
  drawerInner: {
    flex: 1,
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: "hidden",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: { padding: 4 },
  msgRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  composer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  namePrompt: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
});
