import { useCallback, useMemo, useState } from "react";
import { useSource } from "../api/source";
import { usePoll } from "./usePoll";

// A match's activity, newest first. The newest page is fetched when the live line says the match
// changed, and polled every 5 s without it (that's how a ball or a goal arrives); older pages are fetched on demand with `before` and kept. Ids count up through the
// match, so the two join without a gap.

export function useActivity(sport, matchId) {
  const src = useSource();
  const loadLatest = useCallback(() => src.activity(sport, matchId), [src, sport, matchId]);
  const latest = usePoll(loadLatest, 5000, true, src.live ? { kind: "match", sport, matchId } : null);
  const [older, setOlder] = useState({ items: [], hasMore: true });
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");

  const items = useMemo(() => {
    const top = latest.data?.items ?? [];
    const floor = top.length ? top[top.length - 1].id : Infinity;
    return [...top, ...older.items.filter((i) => i.id < floor)];
  }, [latest.data, older.items]);

  const hasMore = older.items.length ? older.hasMore : !!latest.data?.hasMore;

  const loadMore = async () => {
    if (loadingMore || !items.length) return;
    setLoadingMore(true);
    setMoreError("");
    try {
      const page = await src.activity(sport, matchId, items[items.length - 1].id);
      setOlder((o) => ({ items: [...o.items, ...page.items], hasMore: page.hasMore }));
    } catch (e) {
      setMoreError(e.message);
    } finally {
      setLoadingMore(false);
    }
  };

  return { loaded: !!latest.data, error: latest.error, items, hasMore, loadMore, loadingMore, moreError };
}
