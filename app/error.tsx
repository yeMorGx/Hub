"use client";
import { ArrowClockwise, SquaresFour } from "@phosphor-icons/react";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="live-access-error">
      <div className="empty-state">
        <SquaresFour size={38} />
        <h1>Vamos tentar de novo.</h1>
        <p>
          Não foi possível abrir esta tela. Confira sua conexão e atualize seu
          espaço.
        </p>
        <button className="primary-button" onClick={reset}>
          <ArrowClockwise size={17} />
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
