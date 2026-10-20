"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/supabase/errors";
import type { Row } from "./types";
export function useChannel(
  channelId: string,
  joined: boolean,
  onRead: () => void,
) {
  const client = createClient();
  const [resource, setResource] = useState<{
    id: string;
    messages: Row<"messages">[];
    loading: boolean;
    error: string;
    hasOlder: boolean;
  }>({ id: "", messages: [], loading: false, error: "", hasOlder: false });
  const [loadingOlder, setLoadingOlder] = useState(false),
    [typingUntil, setTypingUntil] = useState(0),
    [tick, setTick] = useState(0);
  const serial = useRef(0),
    typingChannel = useRef<ReturnType<typeof client.channel> | null>(null),
    lastSent = useRef(0),
    readOrdinal = useRef(0),
    onReadRef = useRef(onRead);
  useEffect(() => {
    onReadRef.current = onRead;
  }, [onRead]);
  const refresh = useCallback(async () => {
    if (!channelId || !joined) return;
    const generation = serial.current;
    const { data, error } = await client
      .from("messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("ordinal", { ascending: false })
      .limit(50);
    if (generation !== serial.current) return;
    if (error) {
      setResource({
        id: channelId,
        messages: [],
        loading: false,
        error: errorMessage(error),
        hasOlder: false,
      });
      return;
    }
    setResource((prev) => {
      const incoming = data ?? [];
      if (!incoming.length)
        return {
          id: channelId,
          messages: [],
          loading: false,
          error: "",
          hasOlder: false,
        };
      const old = prev.id === channelId ? prev.messages : [];
      const oldestIncoming = incoming[incoming.length - 1].ordinal;
      const newestOld = old[old.length - 1]?.ordinal ?? 0;
      const gap = old.length > 0 && oldestIncoming > newestOld + 1;
      const mapped = new Map((gap ? [] : old).map((m) => [m.id, m]));
      for (const row of incoming) mapped.set(row.id, row);
      return {
        id: channelId,
        messages: [...mapped.values()].sort((a, b) => a.ordinal - b.ordinal),
        loading: false,
        error: "",
        hasOlder:
          !gap && prev.id === channelId && old.length > 50
            ? prev.hasOlder
            : incoming.length === 50,
      };
    });
  }, [client, channelId, joined]);
  useEffect(() => {
    serial.current++;
    readOrdinal.current = 0;
    setTypingUntil(0);
    setResource({
      id: channelId,
      messages: [],
      loading: Boolean(channelId && joined),
      error: "",
      hasOlder: false,
    });
    if (!channelId || !joined) return;
    void refresh();
    const typing = client
      .channel(`channel:${channelId}:typing`, {
        config: { private: true, broadcast: { self: false } },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const incoming = payload.new as Row<"messages">;
          if (incoming.channel_id === channelId && incoming.id) {
            setResource((prev) => {
              if (prev.id !== channelId) return prev;
              const exists = prev.messages.some(
                (message) => message.id === incoming.id,
              );
              const last = prev.messages[prev.messages.length - 1]?.ordinal;
              if (!exists && last !== undefined && incoming.ordinal > last + 1)
                return prev;
              const messages = new Map(
                prev.messages.map((message) => [message.id, message]),
              );
              messages.set(incoming.id, incoming);
              return {
                ...prev,
                messages: [...messages.values()].sort(
                  (a, b) => a.ordinal - b.ordinal,
                ),
              };
            });
          }
          void refresh();
        },
      )
      .on("broadcast", { event: "typing" }, () => {
        setTypingUntil(Date.now() + 3500);
        setTick(Date.now());
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refresh();
      });
    typingChannel.current = typing;
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 15000);
    const typingClock = setInterval(() => setTick(Date.now()), 1000);
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      serial.current++;
      clearInterval(poll);
      clearInterval(typingClock);
      window.removeEventListener("focus", focus);
      typingChannel.current = null;
      void client.removeChannel(typing);
    };
  }, [client, channelId, joined, refresh]);
  async function loadOlder() {
    if (loadingOlder || resource.id !== channelId || !resource.messages.length)
      return;
    setLoadingOlder(true);
    const generation = serial.current;
    try {
      const { data, error } = await client
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .lt("ordinal", resource.messages[0].ordinal)
        .order("ordinal", { ascending: false })
        .limit(50);
      if (generation !== serial.current) return;
      if (error) throw error;
      setResource((prev) => ({
        ...prev,
        messages: [...(data ?? []).reverse(), ...prev.messages],
        hasOlder: (data?.length ?? 0) === 50,
      }));
    } catch (error) {
      if (generation === serial.current)
        setResource((prev) => ({ ...prev, error: errorMessage(error) }));
    } finally {
      setLoadingOlder(false);
    }
  }
  function publishTyping() {
    if (Date.now() - lastSent.current < 2000) return;
    lastSent.current = Date.now();
    void typingChannel.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { active: true },
    });
  }
  async function markRead(ordinal: number) {
    if (!joined || ordinal <= readOrdinal.current || document.hidden) return;
    const generation = serial.current;
    readOrdinal.current = ordinal;
    const { error } = await client.rpc("mark_channel_read", {
      p_channel_id: channelId,
      p_through_ordinal: ordinal,
    });
    if (generation !== serial.current) return;
    if (error) {
      readOrdinal.current = 0;
      return;
    }
    onReadRef.current();
  }
  return {
    messages: resource.id === channelId && joined ? resource.messages : [],
    loading: resource.id !== channelId || resource.loading,
    error: resource.id === channelId ? resource.error : "",
    hasOlder: resource.hasOlder,
    loadingOlder,
    loadOlder,
    refresh,
    publishTyping,
    markRead,
    isTyping: typingUntil > tick && typingUntil > Date.now(),
  };
}
