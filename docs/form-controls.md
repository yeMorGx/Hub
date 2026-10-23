# Formulários do ZULU

Todos os controles visíveis usam HeroUI React v3. Consultar a documentação da versão instalada antes de alterar a composição: esta versão usa `Select` + `ListBox.Item`, `TimeField` e `NumberField`, e não os nomes de componentes da v2. O locale é `pt-BR` por `I18nProvider` do React Aria; HeroUI v3 não exige `HeroUIProvider`.

## Adaptadores e contratos

`components/dashboard-ui.tsx` centraliza Button, Input, TextArea, Select, Checkbox, Form, Label e Fieldset. `components/form-controls.tsx` compõe DatePicker/DateField/Calendar, TimeField e NumberField. Usar `ZuluLabel` para incluir o rótulo no contexto correto dos campos compostos, sem envolver botões de calendário em um segundo label.

- Select recebe `onValueChange(string)`; datas, horários e números em `ZuluInput` também usam esse callback. Texto continua com `onChange` do Input oficial. Checkbox usa `onCheckedChange(boolean)`.
- Os campos compostos exibem datas e números em português e enviam valores ISO/números com ponto via FormData. Horário envia `HH:mm`; datetime local envia `YYYY-MM-DDTHH:mm`. A conversão de fuso continua no domínio que recebe esses valores.
- Valores vazios permanecem vazios. `required`, `min`, `max`, `step`, `disabled` e `readOnly` são mapeados às APIs oficiais. O estado desabilitado de `ZuluFieldset` chega aos controles descendentes.
- Erros dos campos compostos usam `isInvalid` e `FieldError`; preservar feedback de erro e loading do formulário e suas regras de servidor. Foco visível e teclado são obrigatórios.
- Checkbox 3.2: `Checkbox.Content` contém `Checkbox.Control`/`Indicator` e o texto. Content é a área clicável. Um Control isolado exibe a marcação mas não cria a interação correta.
- Radio usa RadioGroup e Radio.Content/Control/Indicator. Se precisar de range, compor Slider oficial. Arquivos usam o Input oficial com type=file; inputs hidden são permitidos para transporte de FormData. Os controles DOM internos de acessibilidade do HeroUI são esperados.

## Referências consultadas

- [HeroUI Select](https://heroui.com/en/docs/react/components/select)
- [HeroUI DatePicker](https://heroui.com/en/docs/react/components/date-picker)
- [HeroUI TimeField](https://heroui.com/en/docs/react/components/time-field)
- [HeroUI NumberField](https://heroui.com/en/docs/react/components/number-field)
- [HeroUI Checkbox](https://heroui.com/en/docs/react/components/checkbox)
- Source oficial da branch v3 e tipos/source da versão instalada, especialmente a composição atual de Checkbox.Content.
