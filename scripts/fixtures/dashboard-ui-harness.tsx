// Isolated browser fixture. Never imported by an application route; no backend.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DashboardUIProvider,
  ZuluButton,
  ZuluForm,
  ZuluInput,
  ZuluLabel,
  ZuluSelect,
  ZuluCheckboxField,
} from "../../components/dashboard-ui";
function Harness() {
  const [result, setResult] = useState("");
  return (
    <DashboardUIProvider enabled>
      <main className="dashboard-redesign" style={{ padding: 32 }}>
        <ZuluForm
          onSubmit={(event) => {
            event.preventDefault();
            setResult(
              JSON.stringify(
                Object.fromEntries(new FormData(event.currentTarget)),
              ),
            );
          }}
        >
          <ZuluLabel>
            Título
            <ZuluInput name="title" required />
          </ZuluLabel>
          <ZuluLabel>
            Projeto
            <ZuluSelect name="project" required defaultValue="">
              <option value="">Selecionar projeto</option>
              <option value="p1">Projeto 1</option>
            </ZuluSelect>
          </ZuluLabel>
          <ZuluSelect
            name="disabled"
            disabled
            defaultValue="p2"
            aria-label="Projeto desativado"
          >
            <option value="p2">Projeto 2</option>
          </ZuluSelect>
          <ZuluCheckboxField
            name="members"
            value="person1"
            aria-label="Pessoa do time"
          >
            Pessoa do time
          </ZuluCheckboxField>
          <ZuluButton>Salvar</ZuluButton>
        </ZuluForm>
        <output data-testid="form-result">{result}</output>
      </main>
    </DashboardUIProvider>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
