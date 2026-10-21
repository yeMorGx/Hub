import React from "react";
// Deliberate replacement for next/dynamic in the lobby browser fixture only.
export default function dynamic() {
  return function FixtureRoom({onLeave}: {onLeave: () => void}) {
    return <section aria-label="Sala fictícia"><p>Conexão simulada; nenhum dispositivo é usado.</p><button onClick={onLeave}>Sair da chamada</button></section>;
  };
}
