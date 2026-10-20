"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, ArrowRight } from "@phosphor-icons/react";
import type { Person } from "@/lib/hub/types";
export function PersonAvatar({
  name,
  id = "",
  size = "normal",
  presence,
}: {
  name: string;
  id?: string;
  size?: "small" | "normal" | "large";
  presence?: string;
}) {
  const colors = ["sand", "rose", "blue", "green", "purple", "orange"];
  const color =
    colors[
      [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % colors.length
    ];
  return (
    <span
      className={`avatar avatar-${size} avatar-${color}`}
      title={name}
      aria-label={name}
    >
      {name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
      {presence && <i className={`presence ${presence}`} />}
    </span>
  );
}
export function PeopleAvatars({ people }: { people: Person[] }) {
  return (
    <span className="avatar-group">
      {people.slice(0, 3).map((p) => (
        <PersonAvatar key={p.id} name={p.display_name} id={p.id} size="small" />
      ))}
      {people.length > 3 && (
        <span className="avatar avatar-small avatar-extra">
          +{people.length - 3}
        </span>
      )}
    </span>
  );
}
export function HubDialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${wide ? "dialog-wide" : ""}`}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Fechar" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
  icon,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
      {action && onAction && (
        <button className="outline-button" onClick={onAction}>
          {action}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
