// Deterministic media adapter for UI QA only. Never imported by the app.
import React, { createContext, useContext, useEffect, useState } from "react";
const Context = createContext<any>(null);
export function LiveKitRoom({ children, onError }: any) {
  const [mic, setMic] = useState(true), [camera, setCamera] = useState(false), [screen, setScreen] = useState(false), [connection, setConnection] = useState("connected"), [messages, setMessages] = useState<any[]>([]);
  useEffect(() => { const listener = (event: any) => { if (event.detail.error) onError(new Error("fixture")); if (event.detail.connection) setConnection(event.detail.connection); if (event.detail.screen !== undefined) setScreen(event.detail.screen); }; window.addEventListener("call-fixture", listener); return () => window.removeEventListener("call-fixture", listener); }, [onError]);
  const localParticipant = { identity: "fixture-ana", name: "Ana Martins", isLocal: true, isMicrophoneEnabled: mic, isSpeaking: false,
    setMicrophoneEnabled: async (value: boolean) => setMic(value), setCameraEnabled: async (value: boolean) => setCamera(value), setScreenShareEnabled: async (value: boolean) => setScreen(value) };
  return <Context.Provider value={{mic,camera,screen,connection,messages,setMessages,localParticipant}}><div className="lk-room-container">{children}</div></Context.Provider>;
}
export function useLocalParticipant() { const context = useContext(Context); return { ...context, isMicrophoneEnabled:context.mic, isCameraEnabled:context.camera, isScreenShareEnabled:context.screen }; }
export function useConnectionState() { return useContext(Context).connection; }
export function useParticipants() { return [useContext(Context).localParticipant, {identity:"fixture-rafael",name:"Rafael Costa"}]; }
export function useTracks() { const context = useContext(Context); const remote = {identity:"fixture-rafael",name:"Rafael Costa",isLocal:false,isMicrophoneEnabled:false}; return [ { participant:context.localParticipant, source:"camera", publication:context.camera ? {isMuted:false}:undefined }, {participant:remote,source:"camera"}, ...(context.screen ? [{participant:remote,source:"screen_share",publication:{isMuted:false}}]:[]) ]; }
export function useMediaDeviceSelect() {return {devices:[{deviceId:"default",label:"Dispositivo do sistema"}],activeDeviceId:"default",setActiveMediaDevice:async()=>{}};}
export function useChat() { const context=useContext(Context); return {chatMessages:context.messages,isSending:false,send:async(message:string)=>context.setMessages((messages:any[])=>[...messages,{message,timestamp:Date.now(),from:context.localParticipant}])}; }
export function RoomAudioRenderer(){return null;}
export function VideoTrack({trackRef}:any){return <div className="fixture-video" data-source={trackRef.source} style={{background:"#1a1c27",color:"#e5e0f7",display:"grid",placeItems:"center",width:"100%",height:"100%"}}>{trackRef.source === "screen_share" ? "Tela compartilhada · simulação" : "Câmera · simulação"}</div>;}
