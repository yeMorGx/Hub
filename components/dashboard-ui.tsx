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
  Dropdown,
  Input,
  TextArea,
  TextField,
  FieldError,
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

import {
  ZuluTemporalInput,
  ZuluNumericInput,
  useFieldReset,
  type ZuluInputProps,
} from "./form-controls";
import { CalendarDate } from "@internationalized/date";
import { I18nProvider } from "react-aria-components";
import {
  CalendarDots,
  SquaresFour,
  CaretDown,
  Plus,
} from "@phosphor-icons/react";

// Shared HeroUI controls and pt-BR form contracts for every app surface.
const DashboardUI = createContext(true);
const DisabledFields = createContext(false);
export function DashboardUIProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <DashboardUI.Provider value={true}>
      <I18nProvider locale="pt-BR">{children}</I18nProvider>
    </DashboardUI.Provider>
  );
}
export const useDashboardUI = () => useContext(DashboardUI);

export function ZuluButton({ disabled, ...props }: ComponentProps<"button">) {
  const inheritedDisabled = useContext(DisabledFields);
  disabled = disabled || inheritedDisabled;
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const railTooltip = Boolean(
    props["aria-label"] && /rail-button/.test(props.className ?? ""),
  );
  const button = (
    <Button
      {...(props as ComponentProps<typeof Button>)}
      value={props.value == null ? undefined : String(props.value)}
      type={props.type ?? "submit"}
      isDisabled={disabled}
      variant="tertiary"
      onMouseEnter={
        railTooltip ? () => setTooltipOpen(true) : props.onMouseEnter
      }
      onMouseLeave={
        railTooltip ? () => setTooltipOpen(false) : props.onMouseLeave
      }
      onFocus={
        railTooltip
          ? () => setTooltipOpen(true)
          : (props.onFocus as ComponentProps<typeof Button>["onFocus"])
      }
      onBlur={
        railTooltip
          ? () => setTooltipOpen(false)
          : (props.onBlur as ComponentProps<typeof Button>["onBlur"])
      }
    />
  );
  return props["aria-label"] &&
    /icon-button|today-link|top-avatar|rail-button/.test(
      props.className ?? "",
    ) ? (
    <Tooltip
      isOpen={railTooltip ? tooltipOpen : undefined}
      onOpenChange={railTooltip ? setTooltipOpen : undefined}
      delay={450}
    >
      {button}
      <Tooltip.Content className="zulu-tooltip">
        {props["aria-label"]}
      </Tooltip.Content>
    </Tooltip>
  ) : (
    button
  );
}
export function ZuluInput(props: ZuluInputProps) {
  const inheritedDisabled = useContext(DisabledFields);
  props = { ...props, disabled: props.disabled || inheritedDisabled };
  if (["date", "time", "datetime-local"].includes(props.type ?? ""))
    return <ZuluTemporalInput {...props} />;
  if (props.type === "number") return <ZuluNumericInput {...props} />;
  const { fieldLabel, onValueChange, isInvalid, errorMessage, ...input } =
    props;
  if (fieldLabel || isInvalid !== undefined || errorMessage)
    return (
      <TextField
        id={input.id}
        isInvalid={isInvalid}
        isDisabled={input.disabled}
        isRequired={input.required}
        className="zulu-field"
        aria-label={
          input["aria-label"] ?? (fieldLabel ? undefined : input.name)
        }
      >
        {fieldLabel && <Label>{fieldLabel}</Label>}
        <Input {...input} aria-invalid={isInvalid || input["aria-invalid"]} />
        <FieldError>{errorMessage}</FieldError>
      </TextField>
    );
  return <Input {...input} aria-invalid={isInvalid || input["aria-invalid"]} />;
}
export function ZuluTextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement>,
) {
  const inheritedDisabled = useContext(DisabledFields);
  return <TextArea {...props} disabled={props.disabled || inheritedDisabled} />;
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
  const inheritedDisabled = useContext(DisabledFields);
  disabled = disabled || inheritedDisabled;
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(
    defaultValue == null ? undefined : String(defaultValue),
  );
  const options = optionsFrom(children);
  const resetRef = useFieldReset(
    defaultValue == null ? (options[0]?.value ?? "") : String(defaultValue),
    value === undefined,
    setSelected,
  );
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
          (label
            ? undefined
            : ({
                project: "Projeto",
                kind: "Tipo",
                user: "Pessoa",
                role: "Papel",
                workspace: "Workspace",
                availability: "Disponibilidade",
              }[name ?? ""] ??
              name ??
              "Selecionar opção"))
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
            <Button
              type="button"
              className="zulu-select-add"
              variant="tertiary"
              onPress={() => {
                setOpen(false);
                onAddNew();
              }}
            >
              <Plus size={16} />
              {addNewLabel}
            </Button>
          )}
        </Select.Popover>
      </Select>
      {name && (
        <input
          ref={resetRef}
          type="hidden"
          name={name}
          value={current}
          disabled={disabled}
        />
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
  const inheritedDisabled = useContext(DisabledFields);
  disabled = disabled || inheritedDisabled;
  return (
    <Checkbox
      id={props.id}
      name={props.name}
      value={String(props.value ?? "on")}
      aria-label={
        props["aria-label"] ??
        (children ? undefined : (props.name ?? "Selecionar"))
      }
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
  return <ZuluCheckbox {...props} />;
}

export function DashboardDialog({
  title,
  onClose,
  children,
  wide,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  footer?: ReactNode;
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
            {footer && <Modal.Footer>{footer}</Modal.Footer>}
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
  const input = children.find(
    (child) =>
      isValidElement<ZuluInputProps>(child) &&
      child.type === ZuluInput &&
      (["date", "time", "datetime-local", "number"].includes(
        child.props.type ?? "",
      ) ||
        child.props.isInvalid !== undefined ||
        Boolean(child.props.errorMessage)),
  );
  if (isValidElement<ZuluInputProps>(input))
    return cloneElement(input, {
      fieldLabel: children.filter((child) => child !== input),
      className: `zulu-field ${props.className ?? ""} ${input.props.className ?? ""}`,
    });
  const checkbox = children.find(
    (child) => isValidElement(child) && child.type === ZuluCheckboxField,
  );
  if (isValidElement<Parameters<typeof ZuluCheckbox>[0]>(checkbox))
    return cloneElement(checkbox, {
      children: children.filter((child) => child !== checkbox),
      className: props.className,
    });
  return <Label {...props} />;
}
export function ZuluFieldset(
  props: FieldsetHTMLAttributes<HTMLFieldSetElement>,
) {
  const disabled = useContext(DisabledFields) || Boolean(props.disabled);
  return (
    <DisabledFields.Provider value={disabled}>
      <Fieldset {...props} disabled={disabled} />
    </DisabledFields.Provider>
  );
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
  onNewOrganization,
}: {
  workspace: string;
  teamId: string;
  teams: { id: string; label: string; organization?: string }[];
  role: string;
  canManage: boolean;
  onTeam: (id: string) => void;
  onNewTeam: () => void;
  onNewOrganization?: () => void;
  onSignOut?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = teams.find((team) => team.id === teamId);
  return (
    <Dropdown isOpen={open} onOpenChange={setOpen}>
      <Button
        className="workspace-button"
        variant="tertiary"
        aria-label={`Trocar time: ${current?.label ?? workspace}`}
      >
        <span className="workspace-icon">
          <SquaresFour weight="fill" size={18} />
        </span>
        <strong>{current?.label ?? workspace}</strong>
        <CaretDown size={13} />
      </Button>
      <Dropdown.Popover
        className="zulu-overlay zulu-workspace workspace-team-menu"
        placement="bottom start"
      >
        <div className="workspace-menu-heading">
          <strong>Seus times</strong>
          <small>{role}</small>
        </div>
        <Dropdown.Menu
          aria-label="Trocar time"
          selectionMode="single"
          selectedKeys={[teamId]}
          onAction={(key) => {
            setOpen(false);
            if (key === "new-team") onNewTeam();
            else if (key === "new-organization") onNewOrganization?.();
            else onTeam(String(key));
          }}
        >
          {teams.map((team) => (
            <Dropdown.Item
              key={team.id}
              id={team.id}
              textValue={team.label}
              className="workspace-team-option"
            >
              <span className="workspace-team-symbol" aria-hidden="true">
                {team.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="workspace-team-copy">
                <Label>{team.label}</Label>
                <small>{team.organization || workspace}</small>
              </span>
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
          {canManage && (
            <Dropdown.Item
              id="new-team"
              textValue="Criar time"
              className="workspace-new-team"
            >
              <Plus size={17} />
              <Label>Criar time</Label>
            </Dropdown.Item>
          )}
          {onNewOrganization && <Dropdown.Item id="new-organization" textValue="Criar organização" className="workspace-new-team">
            <SquaresFour size={17} />
            <Label>Criar organização</Label>
          </Dropdown.Item>}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
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
