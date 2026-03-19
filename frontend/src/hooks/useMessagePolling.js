import { useCallback, useEffect, useRef } from "react";
import api from "../api/client";

/**
 * useMessagePolling
 *
 * Polls a REST endpoint for new messages on a fixed interval and calls
 * onMessages with any new items found since the last successful poll.
 *
 * Designed so the transport can be swapped for a WebSocket in the future
 * by replacing this hook with a useWebSocketMessaging hook that exposes
 * the same interface.
 *
 * @param {object}   opts
 * @param {string}   opts.endpoint        - API path, e.g. "/messaging/direct/"
 * @param {object}   [opts.params]        - Static query params (e.g. { interlocutor: 5 })
 * @param {string}   [opts.conversationKey] - Unique key; changing it resets the timestamp
 *                                           and triggers an immediate refetch.
 * @param {number}   [opts.interval=4000] - Poll interval in ms (default 4 s)
 * @param {boolean}  [opts.enabled=true]  - Stop polling when false
 * @param {Function} opts.onMessages      - Called with array of new messages
 * @param {Function} [opts.onError]       - Optional: called on network error
 */
export default function useMessagePolling({
  endpoint,
  params,
  conversationKey,
  interval = 4000,
  enabled = true,
  onMessages,
  onError,
}) {
  // Keep the latest callback refs so the interval closure never goes stale.
  const onMessagesRef = useRef(onMessages);
  const onErrorRef = useRef(onError);
  const paramsRef = useRef(params);

  useEffect(() => { onMessagesRef.current = onMessages; }, [onMessages]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { paramsRef.current = params; }, [params]);

  // lastTimestamp is reset whenever conversationKey changes.
  const lastTimestampRef = useRef(null);
  const failCountRef = useRef(0);

  const fetchMessages = useCallback(async () => {
    if (!enabled) return;
    try {
      const queryParams = { ...paramsRef.current };
      if (lastTimestampRef.current) {
        queryParams.since = lastTimestampRef.current;
      }
      const res = await api.get(endpoint, { params: queryParams });
      const msgs = Array.isArray(res.data)
        ? res.data
        : (res.data?.results ?? []);

      if (msgs.length > 0) {
        // Track the most recent timestamp for incremental fetching.
        const latest = msgs.reduce((a, b) =>
          new Date(a.timestamp) > new Date(b.timestamp) ? a : b
        );
        lastTimestampRef.current = latest.timestamp;
        onMessagesRef.current(msgs);
      }
      failCountRef.current = 0;
    } catch (err) {
      failCountRef.current += 1;
      onErrorRef.current?.(err);
    }
  }, [endpoint, enabled]); // conversationKey handled via the outer useEffect below

  useEffect(() => {
    if (!enabled) return;

    // Reset incremental timestamp when the conversation changes.
    lastTimestampRef.current = null;
    failCountRef.current = 0;

    fetchMessages(); // immediate fetch on mount / conversation switch

    // Back-off: after 5 consecutive failures, double the interval.
    let currentInterval = interval;
    const schedule = () => {
      const effectiveInterval =
        failCountRef.current >= 5 ? currentInterval * 2 : currentInterval;
      return setInterval(fetchMessages, effectiveInterval);
    };

    const id = schedule();
    return () => clearInterval(id);
    // conversationKey in deps intentionally resets the effect on conversation change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMessages, interval, enabled, conversationKey]);
}
