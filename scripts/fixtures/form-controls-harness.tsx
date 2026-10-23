import {useState} from "react";
import {createRoot} from "react-dom/client";
import {DashboardUIProvider,ZuluForm,ZuluInput,ZuluLabel,ZuluButton,ZuluCheckboxField,ZuluFieldset} from "../../components/dashboard-ui";
function Harness(){const[result,setResult]=useState("");return <DashboardUIProvider enabled><main className="live-app workspace-inset" style={{padding:30}}><ZuluForm onSubmit={event=>{event.preventDefault();setResult(JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))));}}>
<ZuluLabel>Data<ZuluInput type="date" name="date" defaultValue="2026-10-23" required/></ZuluLabel>
<ZuluLabel>Horário<ZuluInput type="time" name="time" defaultValue="12:30" required/></ZuluLabel>
<ZuluLabel>Início<ZuluInput type="datetime-local" name="start" defaultValue="2026-10-23T09:15" required/></ZuluLabel>
<ZuluLabel>Horas<ZuluInput type="number" name="hours" defaultValue="7.5" min="0" max="24" step="0.5" required/></ZuluLabel>
<ZuluCheckboxField name="accept" defaultChecked value="yes">Confirmar</ZuluCheckboxField>
<ZuluFieldset disabled><ZuluLabel>Campo indisponível<ZuluInput type="date" name="disabled" defaultValue="2026-10-23"/></ZuluLabel></ZuluFieldset>
<ZuluButton type="submit">Enviar</ZuluButton></ZuluForm><output id="form-result">{result}</output></main></DashboardUIProvider>}
createRoot(document.getElementById("form-harness")!).render(<Harness/>);
