import React from "react";
import { createRoot } from "react-dom/client";
import { LiveCalls } from "../../components/live-calls";
const hub = {
  canParticipate: true, userId: "fixture-user", client: {},
  snapshot: {
    channels: [
      {id:"joined",name:"geral",kind:"public",archived_at:null},
      {id:"unjoined",name:"sem-participação",kind:"public",archived_at:null},
      {id:"archived",name:"arquivado",kind:"public",archived_at:"2020-01-01"},
    ],
    channelMemberships:[{channel_id:"joined"},{channel_id:"archived"}],
  },
};
createRoot(document.getElementById("root")!).render(<LiveCalls hub={hub as any} />);
