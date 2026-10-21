export async function removeDisallowedParticipants(
  service: {
    listParticipants: (room: string) => Promise<{ identity: string }[]>;
    removeParticipant: (room: string, identity: string) => Promise<unknown>;
  },
  room: string,
  allowed: Set<string>,
) {
  let participants: { identity: string }[];
  try {
    participants = await service.listParticipants(room);
  } catch (e) {
    if ((e as { code?: string }).code === "not_found") return 0;
    throw e;
  }
  const disallowed = participants.filter((p) => {
    const memberId = p.identity.startsWith("hub-share:")
      ? p.identity.slice("hub-share:".length)
      : p.identity;
    return !allowed.has(memberId);
  });
  await Promise.all(
    disallowed.map((p) => service.removeParticipant(room, p.identity)),
  );
  return disallowed.length;
}
