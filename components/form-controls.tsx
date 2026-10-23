"use client";

import {
  useState,
  useEffect,
  useRef,
  type ComponentPropsWithRef,
  type ReactNode,
} from "react";
import {
  Calendar,
  DateField,
  DatePicker,
  FieldError,
  Label,
  NumberField,
  TimeField,
} from "@heroui/react";
import { parseDate, parseDateTime, parseTime } from "@internationalized/date";

export type ZuluInputProps = ComponentPropsWithRef<"input"> & {
  fieldLabel?: ReactNode;
  onValueChange?: (value: string) => void;
  isInvalid?: boolean;
  errorMessage?: string;
};

function stringValue(value: ZuluInputProps["value"]) {
  return value == null ? "" : String(value);
}

export function useFieldReset(
  initial: string,
  uncontrolled: boolean,
  update: (value: string) => void,
) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    const reset = () => {
      if (uncontrolled) queueMicrotask(() => update(initial));
    };
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial, uncontrolled, update]);
  return ref;
}

export function ZuluTemporalInput({
  type,
  fieldLabel,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  disabled,
  readOnly,
  required,
  min,
  max,
  autoFocus,
  className,
  isInvalid,
  errorMessage,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
}: ZuluInputProps) {
  const [local, setLocal] = useState(stringValue(defaultValue));
  const resetRef = useFieldReset(
    stringValue(defaultValue),
    value === undefined,
    setLocal,
  );
  const raw = value === undefined ? local : stringValue(value);
  const time = type === "time";
  const parse = (text: string) => {
    if (!text) return null;
    try {
      return time
        ? parseTime(text)
        : type === "datetime-local"
          ? parseDateTime(text)
          : parseDate(text);
    } catch {
      return null;
    }
  };
  const update = (next: { toString(): string } | null) => {
    const text = next?.toString() ?? "";
    // Preserve the ISO strings consumed by FormData/RPCs; formatting is pt-BR only in the UI.
    const normalized = time
      ? text.slice(0, 5)
      : type === "datetime-local"
        ? text.slice(0, 16)
        : text;
    setLocal(normalized);
    onValueChange?.(normalized);
  };
  const shared = {
    id,
    isDisabled: disabled,
    isReadOnly: readOnly,
    isRequired: required,
    autoFocus,
    isInvalid,
    "aria-label":
      ariaLabel ??
      (fieldLabel ? undefined : (name ?? (time ? "Horário" : "Data"))),
    "aria-describedby": describedBy,
    validationBehavior: "native" as const,
    className: `zulu-temporal-field zulu-field ${className ?? ""}`,
  };
  return (
    <>
      {time ? (
        <TimeField
          {...shared}
          value={parse(raw) as ReturnType<typeof parseTime> | null}
          minValue={
            parse(stringValue(min)) as ReturnType<typeof parseTime> | undefined
          }
          maxValue={
            parse(stringValue(max)) as ReturnType<typeof parseTime> | undefined
          }
          onChange={update}
          granularity="minute"
          hourCycle={24}
        >
          {fieldLabel && <Label>{fieldLabel}</Label>}
          <TimeField.Group variant="secondary">
            <TimeField.Input>
              {(segment) => <TimeField.Segment segment={segment} />}
            </TimeField.Input>
          </TimeField.Group>
          <FieldError>{errorMessage}</FieldError>
        </TimeField>
      ) : (
        <DatePicker
          {...shared}
          value={parse(raw) as ReturnType<typeof parseDateTime> | null}
          minValue={
            parse(stringValue(min)) as
              ReturnType<typeof parseDateTime> | undefined
          }
          maxValue={
            parse(stringValue(max)) as
              ReturnType<typeof parseDateTime> | undefined
          }
          onChange={update}
          granularity={type === "datetime-local" ? "minute" : "day"}
          hourCycle={24}
          shouldForceLeadingZeros
        >
          {fieldLabel && <Label>{fieldLabel}</Label>}
          <DateField.Group variant="secondary">
            <DateField.Input>
              {(segment) => <DateField.Segment segment={segment} />}
            </DateField.Input>
            <DateField.Suffix>
              <DatePicker.Trigger aria-label="Abrir calendário">
                <DatePicker.TriggerIndicator />
              </DatePicker.Trigger>
            </DateField.Suffix>
          </DateField.Group>
          <DatePicker.Popover className="zulu-overlay zulu-calendar-picker">
            <Calendar aria-label="Escolher data">
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
          </DatePicker.Popover>
          <FieldError>{errorMessage}</FieldError>
        </DatePicker>
      )}
      {name && (
        <input
          ref={resetRef}
          type="hidden"
          name={name}
          value={raw}
          disabled={disabled}
        />
      )}
    </>
  );
}

export function ZuluNumericInput({
  fieldLabel,
  value,
  defaultValue,
  onValueChange,
  name,
  id,
  disabled,
  readOnly,
  required,
  min,
  max,
  step,
  autoFocus,
  placeholder,
  className,
  isInvalid,
  errorMessage,
  "aria-label": ariaLabel,
}: ZuluInputProps) {
  const [local, setLocal] = useState(stringValue(defaultValue));
  const resetRef = useFieldReset(
    stringValue(defaultValue),
    value === undefined,
    setLocal,
  );
  const raw = value === undefined ? local : stringValue(value);
  const numeric = raw === "" ? NaN : Number(raw);
  return (
    <>
      <NumberField
        id={id}
        className={`zulu-number-field zulu-field ${className ?? ""}`}
        value={numeric}
        onChange={(next) => {
          const text = Number.isFinite(next) ? String(next) : "";
          setLocal(text);
          onValueChange?.(text);
        }}
        minValue={min == null ? undefined : Number(min)}
        maxValue={max == null ? undefined : Number(max)}
        step={step == null || step === "any" ? undefined : Number(step)}
        isDisabled={disabled}
        isReadOnly={readOnly}
        isRequired={required}
        isInvalid={isInvalid}
        validationBehavior="native"
        aria-label={
          ariaLabel ?? (fieldLabel ? undefined : (name ?? "Quantidade"))
        }
        formatOptions={{ useGrouping: false, maximumFractionDigits: 4 }}
      >
        {fieldLabel && <Label>{fieldLabel}</Label>}
        <NumberField.Group>
          <NumberField.DecrementButton aria-label="Diminuir" />
          <NumberField.Input autoFocus={autoFocus} placeholder={placeholder} />
          <NumberField.IncrementButton aria-label="Aumentar" />
        </NumberField.Group>
        <FieldError>{errorMessage}</FieldError>
      </NumberField>
      {name && (
        <input
          ref={resetRef}
          type="hidden"
          name={name}
          value={raw}
          disabled={disabled}
        />
      )}
    </>
  );
}
