import React from "react";
import { createRoot } from "react-dom/client";
import LiveCallRoom from "../../components/live-call-room";
createRoot(document.getElementById("root")!).render(<LiveCallRoom token="fixture" url="wss://fixture.invalid" channelId="fixture" channelName="Design & produto" audio video={false} onLeave={() => document.body.setAttribute("data-left", "true")}/>);
