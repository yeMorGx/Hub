import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import { setDesktopUnread } from "../../lib/desktop/badge";
const calls: {command:string; args:unknown}[]=[];
mockWindows("main");
mockIPC((command,args)=>{
  calls.push({command,args});
  if(command==="plugin:image|new") return 7;
  return undefined;
});
Object.assign(window,{fixtureBadgeCalls:calls,fixtureSetUnread:setDesktopUnread});
