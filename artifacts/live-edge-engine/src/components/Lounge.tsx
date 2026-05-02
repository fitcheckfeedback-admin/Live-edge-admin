import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Send, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// ── Types ──────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: number;
  name: string;
  content: string;
  createdAt: string;
  isMine: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────
const NAME_KEY = "lounge.displayName";
const POLL_OPEN_MS = 2500;
const POLL_CLOSED_MS = 8000;
const NAME_MIN = 2;
const NAME_MAX = 20;
const CONTENT_MAX = 500;

// ── Network helpers ────────────────────────────────────────────────────────
async function fetchInitial(): Promise<ChatMessage[]> {
  const r = await fetch("/api/chat/messages?limit=100", { credentials: "include" });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j.messages) ? j.messages : [];
}
async function fetchSince(afterId: number): Promise<ChatMessage[]> {
  const r = await fetch(`/api/chat/messages?after=${afterId}&limit=100`, {
    credentials: "include",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const j = await r.json();
  return Array.isArray(j.messages) ? j.messages : [];
}
async function postMessage(name: string, content: string): Promise<ChatMessage | null> {
  const r = await fetch("/api/chat/messages", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, content }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (j as { message?: string })?.message ?? `Failed (HTTP ${r.status})`;
    throw new Error(msg);
  }
  return (j as { message?: ChatMessage }).message ?? null;
}

// ── Tiny formatter (relative time) ─────────────────────────────────────────
function relTime(iso: string): string {
  const d = Date.parse(iso);
  if (!Number.isFinite(d)) return "";
  const sec = Math.max(0, Math.round((Date.now() - d) / 1000));
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// Merge two message lists: de-dupe by id, sort ascending by id (chat order),
// and cap at 500 entries so long sessions don't bloat memory. Used by both
// the polling path and optimistic-send path so insertion order can never
// produce out-of-order rendering when an optimistic msg arrives before
// its corresponding fetch.
function mergeMessages(prev: ChatMessage[], next: ChatMessage[]): ChatMessage[] {
  if (next.length === 0) return prev;
  const byId = new Map<number, ChatMessage>();
  for (const m of prev) byId.set(m.id, m);
  for (const m of next) byId.set(m.id, m);
  const merged = Array.from(byId.values()).sort((a, b) => a.id - b.id);
  return merged.length > 500 ? merged.slice(-500) : merged;
}

// Stable pastel color per display name for the avatar circle.
function colorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 65%, 55%)`;
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// ── Name prompt ───────────────────────────────────────────────────────────
function NamePrompt({
  open,
  onOpenChange,
  initialName,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialName: string;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(initialName);
  useEffect(() => {
    if (open) setValue(initialName);
  }, [open, initialName]);

  const trimmed = value.trim();
  const valid =
    trimmed.length >= NAME_MIN &&
    trimmed.length <= NAME_MAX &&
    /^[\p{L}\p{N}_\-. ]+$/u.test(trimmed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm" data-testid="lounge-name-dialog">
        <DialogHeader>
          <DialogTitle className="text-white">Pick a display name</DialogTitle>
          <DialogDescription>
            This is what other people in The Lounge will see. You can change it later.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Sharp123"
          maxLength={NAME_MAX}
          autoFocus
          data-testid="lounge-name-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid) {
              onSave(trimmed);
              onOpenChange(false);
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          {NAME_MIN}-{NAME_MAX} chars. Letters, numbers, spaces, _-. allowed.
        </p>
        <DialogFooter>
          <Button
            type="button"
            disabled={!valid}
            onClick={() => {
              onSave(trimmed);
              onOpenChange(false);
            }}
            data-testid="lounge-name-save"
          >
            Enter The Lounge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export function Lounge() {
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NAME_KEY) ?? "";
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const lastIdRef = useRef(0);
  const drawerOpenRef = useRef(drawerOpen);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    drawerOpenRef.current = drawerOpen;
  }, [drawerOpen]);

  // Initial load + polling. Single effect; the interval re-checks the open
  // ref so the same loop covers both cadences.
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
            const newFromOthers = next.filter((m) => !m.isMine).length;
            if (newFromOthers > 0) setUnread((u) => u + newFromOthers);
          }
        }
        if (!loaded) setLoaded(true);
      } catch {
        // Silent — polling will retry on next tick.
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

  // Auto-scroll to bottom when drawer opens or new messages arrive while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const el = listRef.current;
    if (!el) return;
    // Defer to next frame so layout has settled.
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [drawerOpen, messages.length]);

  // Clear unread when the drawer is opened.
  useEffect(() => {
    if (drawerOpen) setUnread(0);
  }, [drawerOpen]);

  const handleOpenDrawer = useCallback(() => {
    if (!displayName) {
      setNamePromptOpen(true);
      return;
    }
    setDrawerOpen(true);
  }, [displayName]);

  const handleSaveName = useCallback(
    (name: string) => {
      try {
        window.localStorage.setItem(NAME_KEY, name);
      } catch {
        /* localStorage may be unavailable in private mode — ignore */
      }
      setDisplayName(name);
      setDrawerOpen(true);
    },
    [],
  );

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !displayName || posting) return;
    setPosting(true);
    try {
      const msg = await postMessage(displayName, content);
      if (msg) {
        // Optimistic merge — render the message immediately. Critically, we
        // do NOT advance `lastIdRef` to msg.id, because other users may have
        // posted messages with intermediate IDs we haven't fetched yet.
        // Skipping forward to msg.id would permanently drop those. The next
        // poll picks up our message + any intermediate ones, and the merge
        // helper below de-dupes by id and re-sorts ascending so display order
        // stays correct under concurrency.
        setMessages((prev) => mergeMessages(prev, [msg]));
        setDraft("");
      }
    } catch (err) {
      toast({
        title: "Couldn't send",
        description: err instanceof Error ? err.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setPosting(false);
    }
  }, [draft, displayName, posting, toast]);

  const sendDisabled = posting || draft.trim().length === 0 || draft.length > CONTENT_MAX;

  // Group messages by date for soft separators.
  const grouped = useMemo(() => {
    const groups: { date: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const day = m.createdAt.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.date === day) last.items.push(m);
      else groups.push({ date: day, items: [m] });
    }
    return groups;
  }, [messages]);

  return (
    <>
      {/* Floating button — sits above the bottom nav, right side. */}
      <button
        type="button"
        aria-label="Open The Lounge"
        data-testid="lounge-fab"
        onClick={handleOpenDrawer}
        className={cn(
          "fixed right-4 z-50 flex items-center justify-center",
          "w-14 h-14 rounded-full shadow-2xl",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "hover:scale-105 active:scale-95 transition-transform",
          "ring-2 ring-primary/30",
        )}
        style={{ bottom: "calc(56px + env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <MessageSquare className="w-6 h-6" />
        {unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background"
            data-testid="lounge-unread"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Slide-up drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="bottom"
          className="bg-card border-t border-border h-[85vh] p-0 flex flex-col"
          data-testid="lounge-drawer"
        >
          <VisuallyHidden>
            <SheetDescription>
              The Lounge — an anonymous global chat for everyone using the app.
            </SheetDescription>
          </VisuallyHidden>
          <SheetHeader className="px-4 py-3 border-b border-border flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <SheetTitle className="text-white text-base leading-tight">The Lounge</SheetTitle>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {displayName ? (
                    <>
                      Posting as{" "}
                      <button
                        type="button"
                        className="text-primary hover:underline"
                        onClick={() => setNamePromptOpen(true)}
                        data-testid="lounge-edit-name"
                      >
                        {displayName}
                      </button>
                    </>
                  ) : (
                    "Pick a name to chat"
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
              className="text-muted-foreground hover:text-white p-1"
              data-testid="lounge-close"
            >
              <X className="w-5 h-5" />
            </button>
          </SheetHeader>

          {/* Messages list */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
            data-testid="lounge-messages"
          >
            {!loaded && (
              <p className="text-center text-xs text-muted-foreground py-8">Loading messages…</p>
            )}
            {loaded && messages.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No messages yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Be the first to say something.</p>
              </div>
            )}
            {grouped.map((g) => (
              <div key={g.date} className="space-y-2">
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {g.date}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                {g.items.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex gap-2 items-start",
                      m.isMine && "flex-row-reverse",
                    )}
                    data-testid={`lounge-msg-${m.id}`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: colorFor(m.name) }}
                      title={m.name}
                    >
                      {initials(m.name)}
                    </div>
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3 py-2",
                        m.isMine
                          ? "bg-primary/20 border border-primary/30 text-white rounded-tr-sm"
                          : "bg-background/60 border border-border text-foreground rounded-tl-sm",
                      )}
                    >
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className={cn("text-xs font-semibold", m.isMine ? "text-primary" : "text-white")}>
                          {m.isMine ? "You" : m.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{relTime(m.createdAt)}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-card px-3 py-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
            {displayName ? (
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Say something…"
                  maxLength={CONTENT_MAX}
                  data-testid="lounge-input"
                  className="flex-1 bg-background/60"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={sendDisabled}
                  data-testid="lounge-send"
                  aria-label="Send"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                className="w-full"
                onClick={() => setNamePromptOpen(true)}
                data-testid="lounge-pick-name"
              >
                Pick a name to chat
              </Button>
            )}
            {draft.length > CONTENT_MAX * 0.8 && (
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {draft.length}/{CONTENT_MAX}
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <NamePrompt
        open={namePromptOpen}
        onOpenChange={setNamePromptOpen}
        initialName={displayName}
        onSave={handleSaveName}
      />
    </>
  );
}
