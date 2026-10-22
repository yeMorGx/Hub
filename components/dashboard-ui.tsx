"use client";

import {
  createContext,
  useContext,
  Children,
  isValidElement,
  cloneElement,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ComponentProps,
  type FormHTMLAttributes,
  type LabelHTMLAttributes,
  type FieldsetHTMLAttributes,
  type HTMLAttributes,
} from "react";
import {
  Button,
  Input,
  TextArea,
  Select,
  ListBox,
  Label,
  Modal,
  Checkbox,
  Tooltip,
  Popover,
  Calendar,
  Form,
  Fieldset,
  Toast,
  Alert,
  Skeleton,
  Spinner,
} from "@heroui/react";

import { CalendarDate } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import { CalendarDots, SquaresFour, CaretDown, Plus } from "@phosphor-icons/react";

// Scope the HeroUI migration to Today and the dialogs opened from it.
const DashboardUI = createContext(false);
export function DashboardUIProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <DashboardUI.Provider value={enabled}>
      <I18nProvider locale={enabled ? "pt-BR" : undefined}>
        {children}
      </I18nProvider>
    </DashboardUI.Provider>
  );
}
export const useDashboardUI = () => useContext(DashboardUI);

export function ZuluButton({
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const enabled = useDashboardUI();
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const railTooltip = Boolean(props["aria-label"] && /rail-button/.test(props.className ?? ""));
  if (!enabled) {
    const button = (
      <button
        {...props}
        disabled={disabled}
        onMouseEnter={railTooltip ? () => setTooltipOpen(true) : props.onMouseEnter}
        onMouseLeave={railTooltip ? () => setTooltipOpen(false) : props.onMouseLeave}
        onFocus={railTooltip ? event => { props.onFocus?.(event); setTooltipOpen(true); } : props.onFocus}
        onBlur={railTooltip ? event => { props.onBlur?.(event); setTooltipOpen(false); } : props.onBlur}
      />
    );
    return railTooltip ? (
      <Tooltip isOpen={tooltipOpen} onOpenChange={setTooltipOpen} delay={450}>
        {button}
        <Tooltip.Content className="zulu-tooltip">
          {props["aria-label"]}
        </Tooltip.Content>
      </Tooltip>
    ) : button;
  }
  const button = (
    <Button
      {...(props as ComponentProps<typeof Button>)}
      value={props.value == null ? undefined : String(props.value)}
      type={props.type ?? "submit"}
      isDisabled={disabled}
      variant="tertiary"
      onMouseEnter={railTooltip ? () => setTooltipOpen(true) : props.onMouseEnter}
      onMouseLeave={railTooltip ? () => setTooltipOpen(false) : props.onMouseLeave}
      onFocus={railTooltip ? () => setTooltipOpen(true) : props.onFocus as ComponentProps<typeof Button>["onFocus"]}
      onBlur={railTooltip ? () => setTooltipOpen(false) : props.onBlur as ComponentProps<typeof Button>["onBlur"]}
    />
  );
  return props["aria-label"] &&
    /icon-button|today-link|top-avatar|rail-button/.test(props.className ?? "") ? (
    <Tooltip isOpen={railTooltip ? tooltipOpen : undefined} onOpenChange={railTooltip ? setTooltipOpen : undefined} delay={450}>
      {button}
      <Tooltip.Content className="zulu-tooltip">
        {props["aria-label"]}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    button
  );
}
export function ZuluInput(props: ComponentProps<"input">) {
  const enabled = useDashboardUI();
  return enabled ? <Input {...props} /> : <input {...props} />;
}
export function ZuluTextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const enabled = useDashboardUI();
  return enabled ? <TextArea {...props} /> : <textarea {...props} />;
}

type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "onChange" | "multiple" | "size"
> & {
  onValueChange?: (value: string) => void;
  label?: ReactNode;
  onAddNew?: () => void;
  addNewLabel?: string;
};
type Option = { value: string; text: string; disabled: boolean };
function optionsFrom(children: ReactNode, group = ""): Option[] {
  const options: Option[] = [];
  Children.forEach(children, (child) => {
    if (
      !isValidElement<{
        value?: string;
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
      }>(child)
    )
      return;
    if (child.type === "option") {
      const text = Children.toArray(child.props.children).join("");
      options.push({
        value: String(child.props.value ?? text),
        text: group ? `${group} · ${text}` : text,
        disabled: Boolean(child.props.disabled),
      });
    } else {
      options.push(
        ...optionsFrom(
          child.props.children,
          child.type === "optgroup" ? child.props.label : group,
        ),
      );
    }
  });
  return options;
}
export function ZuluSelect({
  children,
  label,
  onAddNew,
  addNewLabel = "Adicionar novo",
  value,
  defaultValue,
  onValueChange,
  disabled,
  required,
  name,
  id,
  className,
  "aria-label": ariaLabel,
  ...props
}: SelectProps) {
  const enabled = useDashboardUI();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(
    defaultValue == null ? undefined : String(defaultValue),
  );
  if (!enabled)
    return (
      <select
        {...props}
        id={id}
        name={name}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        required={required}
        className={className}
        aria-label={ariaLabel}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {children}
      </select>
    );
  const options = optionsFrom(children);
  const current = String(value ?? selected ?? options[0]?.value ?? "");
  // A distinct UI key keeps a legitimate empty value (e.g. "Sem projeto") selectable.
  const key = (v: string) => (v === "" ? "__zulu_empty_option__" : v);
  return (
    <>
      <Select
        id={id}
        className={`zulu-select ${className ?? ""}`}
        variant="secondary"
        isOpen={open}
        onOpenChange={setOpen}
        aria-label={
          ariaLabel ??
          {
            project: "Projeto",
            kind: "Tipo",
            user: "Pessoa",
            role: "Papel",
            workspace: "Workspace",
            availability: "Disponibilidade",
          }[name ?? ""] ??
          name ??
          "Selecionar opção"
        }
        value={key(current)}
        isDisabled={disabled}
        isRequired={required}
        validationBehavior="native"
        validate={(next) =>
          required && (next == null || next === "__zulu_empty_option__")
            ? "Selecione uma opção."
            : null
        }
        onChange={(next) => {
          const v =
            next === "__zulu_empty_option__" || next == null
              ? ""
              : String(next);
          setSelected(v);
          onValueChange?.(v);
        }}
      >
        {label && <Label>{label}</Label>}
        <Select.Trigger>
          <Select.Value>{({ selectedText }) => selectedText}</Select.Value>
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="zulu-overlay zulu-select-popover">
          <ListBox>
            {options.map((option) => (
              <ListBox.Item
                key={key(option.value)}
                id={key(option.value)}
                textValue={option.text}
                isDisabled={option.disabled}
              >
                <Label>{option.text}</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
          {onAddNew && (
            <Button type="button" className="zulu-select-add" variant="tertiary" onPress={() => { setOpen(false); onAddNew(); }}>
              <Plus size={16} />{addNewLabel}
            </Button>
          )}
        </Select.Popover>
      </Select>
      {name && (
        <input type="hidden" name={name} value={current} disabled={disabled} />
      )}
    </>
  );
}

export function ZuluCheckbox({
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  required,
  children,
  ...props
}: Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "type" | "children"
> & { onCheckedChange?: (checked: boolean) => void; children?: ReactNode }) {
  const enabled = useDashboardUI();
  if (!enabled)
    return (
      <input
        {...props}
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        required={required}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
    );
  return (
    <Checkbox
      id={props.id}
      name={props.name}
      value={String(props.value ?? "on")}
      aria-label={props["aria-label"] ?? props.name ?? "Selecionar"}
      isSelected={checked}
      defaultSelected={defaultChecked}
      onChange={onCheckedChange}
      isDisabled={disabled}
      isRequired={required}
      className={`zulu-checkbox ${props.className ?? ""}`}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {children}
      </Checkbox.Content>
    </Checkbox>
  );
}

// Whole labeled checkbox fields avoid nesting a React Aria label inside another label.
export function ZuluCheckboxField(props: Parameters<typeof ZuluCheckbox>[0]) {
  const hero = useDashboardUI();
  if (hero) return <ZuluCheckbox {...props} />;
  const { children, className, ...input } = props;
  return (
    <label className={className}>
      <ZuluCheckbox {...input} />
      {children}
    </label>
  );
}

export function DashboardDialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop className="zulu-modal-backdrop">
        <Modal.Container
          className="zulu-modal-container"
          size={wide ? "lg" : "md"}
          placement="center"
          scroll="inside"
        >
          <Modal.Dialog
            className={`zulu-overlay zulu-modal ${wide ? "zulu-modal-wide" : ""}`}
            aria-label={title}
          >
            <Modal.CloseTrigger aria-label="Fechar" />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function DashboardDatePicker({
  date,
  onDate,
}: {
  date: Date;
  onDate: (date: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button
        className="icon-button"
        isIconOnly
        variant="tertiary"
        aria-label="Escolher data"
      >
        <CalendarDots size={16} />
      </Button>
      <Popover.Content
        className="zulu-overlay zulu-calendar-picker"
        placement="bottom start"
      >
        <Popover.Dialog aria-label="Escolher data da agenda">
          <Calendar
            aria-label="Data da agenda"
            value={
              new CalendarDate(
                date.getFullYear(),
                date.getMonth() + 1,
                date.getDate(),
              )
            }
            onChange={(value) => {
              if (value)
                onDate(new Date(value.year, value.month - 1, value.day, 12));
              setOpen(false);
            }}
          >
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" aria-label="Mês anterior" />
              <Calendar.NavButton slot="next" aria-label="Próximo mês" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>
                {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
              </Calendar.GridHeader>
              <Calendar.GridBody>
                {(date) => <Calendar.Cell date={date} />}
              </Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function ZuluForm(props: FormHTMLAttributes<HTMLFormElement>) {
  return useDashboardUI() ? (
    <Form
      {...(props as ComponentProps<typeof Form>)}
      validationBehavior="native"
    />
  ) : (
    <form {...props} />
  );
}
export function ZuluLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  const hero = useDashboardUI();
  if (!hero) return <label {...props} />;
  const children = Children.toArray(props.children);
  const select = children.find(
    (child) => isValidElement<SelectProps>(child) && child.type === ZuluSelect,
  );
  if (isValidElement<SelectProps>(select)) {
    // Compose the visible Label inside Select's own context. Never nest its hidden
    // native select/label inside a second label or disconnect the accessible name.
    return cloneElement(select, {
      label: children.filter((child) => child !== select),
      className: `zulu-field ${props.className ?? ""} ${select.props.className ?? ""}`,
    });
  }
  return <Label {...props} />;
}
export function ZuluFieldset(
  props: FieldsetHTMLAttributes<HTMLFieldSetElement>,
) {
  return useDashboardUI() ? <Fieldset {...props} /> : <fieldset {...props} />;
}
export function ZuluLegend(props: HTMLAttributes<HTMLLegendElement>) {
  return useDashboardUI() ? (
    <Fieldset.Legend {...props} />
  ) : (
    <legend {...props} />
  );
}

export function DashboardNotice({
  message,
  error = false,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose?: () => void;
}) {
  const [queue] = useState(() => new Toast.Queue());
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    let current = true;
    const key = queue.add(
      { title: message, variant: error ? "danger" : "success" },
      {
        timeout: error ? 0 : 6000,
        onClose: () => {
          if (current) closeRef.current?.();
        },
      },
    );
    return () => {
      current = false;
      queue.close(key);
    };
  }, [queue, message, error]);
  return (
    <Toast.Provider
      queue={queue}
      className="zulu-overlay zulu-toast-region"
      placement="bottom end"
      aria-label="Notificações do aplicativo"
    />
  );
}

export function DashboardWorkspacePicker({
  workspace,
  teamId,
  teams,
  role,
  canManage,
  onTeam,
  onNewTeam,
  onSignOut,
}: {
  workspace: string;
  teamId: string;
  teams: { id: string; label: string }[];
  role: string;
  canManage: boolean;
  onTeam: (id: string) => void;
  onNewTeam: () => void;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button className="workspace-button" variant="tertiary">
        <span className="workspace-icon">
          <SquaresFour weight="fill" size={18} />
        </span>
        <strong>{workspace}</strong>
        <CaretDown size={13} />
      </Button>
      <Popover.Content
        className="zulu-overlay zulu-workspace"
        placement="bottom start"
      >
        <Popover.Dialog aria-label="Seu workspace e time">
          <Label>Time ativo</Label>
          <Select
            aria-label="Time ativo"
            value={teamId}
            onChange={(key) => {
              onTeam(String(key));
              setOpen(false);
            }}
            variant="secondary"
          >
            <Select.Trigger>
              <Select.Value>{({ selectedText }) => selectedText}</Select.Value>
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="zulu-overlay">
              <ListBox>
                {teams.map((team) => (
                  <ListBox.Item
                    key={team.id}
                    id={team.id}
                    textValue={team.label}
                  >
                    <Label>{team.label}</Label>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
          <p className="workspace-role">{role}</p>
          {canManage && (
            <Button
              variant="tertiary"
              onPress={() => {
                setOpen(false);
                onNewTeam();
              }}
            >
              Criar time
            </Button>
          )}
          <Button variant="danger-soft" onPress={onSignOut}>
            Sair da conta
          </Button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

export function ZuluAlert({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return useDashboardUI() ? (
    <Alert status="danger" className={className} {...props}>
      <Alert.Content>{children}</Alert.Content>
    </Alert>
  ) : (
    <div className={className} {...props}>
      {children}
    </div>
  );
}
export function DashboardLoading() {
  return (
    <div
      className="zulu-dashboard-loading"
      role="status"
      aria-label="Carregando dashboard"
    >
      <div className="zulu-loading-title">
        <Spinner size="sm" />
        <span>Abrindo seu espaço…</span>
      </div>
      <div className="zulu-loading-grid" aria-hidden="true">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    </div>
  );
}
