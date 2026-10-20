export type ChatCommand =
  | {
      action: "start_timer" | "stop_timer" | "create_meeting";
      description: string;
      startsAt?: string;
      endsAt?: string;
      timezone?: string;
    }
  | { error: string };
export const commandHelp =
  "/hora iniciar [descrição] · /hora parar · /reunião amanhã 14h [título]";
export function parseChatCommand(
  text: string,
  now = new Date(),
): ChatCommand | null {
  const value = text.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  const start = value.match(/^\/hora\s+iniciar(?:\s+(.+))?$/iu);
  if (start)
    return {
      action: "start_timer",
      description: start[1]?.trim() || "Trabalho com o time",
    };
  if (/^\/hora\s+parar$/iu.test(value))
    return { action: "stop_timer", description: "" };
  const meeting = value.match(
    /^\/reuni[aã]o\s+(hoje|amanh[aã]|\d{4}-\d{2}-\d{2})\s+(\d{1,2})(?:(?:h|:)(\d{2})?)?(?:\s+(.+))?$/iu,
  );
  if (!meeting) return { error: commandHelp };
  const day = meeting[1].toLowerCase(),
    hour = Number(meeting[2]),
    minute = Number(meeting[3] || 0);
  if (hour > 23 || minute > 59)
    return {
      error: "Horário inválido. Use, por exemplo, /reunião amanhã 14h.",
    };
  let date = new Date(now);
  if (day.startsWith("amanh")) date.setDate(date.getDate() + 1);
  else if (/^\d{4}-/.test(day)) {
    date = new Date(day + "T12:00:00");
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== Number(day.slice(0, 4)) ||
      date.getMonth() + 1 !== Number(day.slice(5, 7)) ||
      date.getDate() !== Number(day.slice(8, 10))
    )
      return { error: "Data inválida." };
  }
  date.setHours(hour, minute, 0, 0);
  if (date <= now) return { error: "Escolha um horário futuro." };
  return {
    action: "create_meeting",
    description: meeting[4]?.trim() || "Reunião do time",
    startsAt: date.toISOString(),
    endsAt: new Date(date.getTime() + 30 * 60000).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
