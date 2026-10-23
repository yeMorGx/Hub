"use client";
import {
  memo,
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  PointerSensor,
  TouchSensor,
  useDndMonitor,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";
import { DotsSixVertical } from "@phosphor-icons/react";
import { Button } from "@heroui/react";

export const KANBAN_PHYSICS = {
  stiffness: 260,
  damping: 14,
  mass: 0.8,
  maxAngle: 14,
  velocityScale: 8,
  resetAfterMs: 60,
  pickupScale: 1.06,
  neighborDuration: 280,
  dropDuration: 400,
  neighborEasing: "cubic-bezier(0.25, 1, 0.5, 1)",
  dropEasing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;
function interactive(target: EventTarget | null) {
  return (
    target instanceof Element &&
    !target.closest("[data-kanban-drag-handle]") &&
    Boolean(
      target.closest(
        'button,a,input,textarea,select,[role="button"],[role="combobox"],[contenteditable="true"]',
      ),
    )
  );
}
export class BoardPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: ReactPointerEvent) =>
        nativeEvent.isPrimary &&
        nativeEvent.button === 0 &&
        nativeEvent.pointerType !== "touch" &&
        !interactive(nativeEvent.target),
    },
  ];
}
export class BoardTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent }: ReactTouchEvent) =>
        nativeEvent.touches.length === 1 && !interactive(nativeEvent.target),
    },
  ];
}
export const SortableTask = memo(function SortableTask({
  id,
  title,
  disabled,
  children,
}: {
  id: string;
  title: string;
  disabled: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const {
    setNodeRef,
    setActivatorNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    disabled,
    transition: reduced
      ? null
      : {
          duration: KANBAN_PHYSICS.neighborDuration,
          easing: KANBAN_PHYSICS.neighborEasing,
        },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={`kanban-sortable${isDragging ? " is-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
    >
      {!disabled && (
        <Button
          {...attributes}
          onPressStart={(event) => event.continuePropagation()}
          onPressEnd={(event) => event.continuePropagation()}
          onPress={(event) => event.continuePropagation()}
          onPointerDown={(event) => {
            event.stopPropagation();
            listeners?.onPointerDown?.(event);
          }}
          onTouchStart={(event) => {
            event.stopPropagation();
            listeners?.onTouchStart?.(event);
          }}
          onKeyDown={(event) => {
            if (isDragging) {
              event.continuePropagation();
            } else {
              event.stopPropagation();
              listeners?.onKeyDown?.(event);
            }
          }}
          ref={setActivatorNodeRef}
          className="kanban-drag-handle"
          type="button"
          data-kanban-drag-handle
          aria-label={`Arrastar tarefa ${title}`}
        >
          <DotsSixVertical size={18} />
        </Button>
      )}
      {children}
    </div>
  );
});
export function BoardColumn({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`board-column board-${id}${isOver ? " board-drop-target" : ""}`}
      aria-label={label}
    >
      {children}
    </section>
  );
}
export function PhysicsCard({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion(),
    angle = useMotionValue(0);
  const rotate = useSpring(angle, {
    stiffness: KANBAN_PHYSICS.stiffness,
    damping: KANBAN_PHYSICS.damping,
    mass: KANBAN_PHYSICS.mass,
  });
  const previous = useRef({ x: 0, time: 0 });
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reset = () => {
    if (idle.current) clearTimeout(idle.current);
    angle.set(0);
    previous.current = { x: 0, time: 0 };
  };
  useDndMonitor({
    onDragStart: () => {
      previous.current = { x: 0, time: performance.now() };
    },
    onDragMove: (event) => {
      if (reduced) return;
      const now = performance.now(),
        dt = Math.max(8, now - previous.current.time),
        velocity = (event.delta.x - previous.current.x) / dt;
      angle.set(
        Math.max(
          -KANBAN_PHYSICS.maxAngle,
          Math.min(
            KANBAN_PHYSICS.maxAngle,
            velocity * KANBAN_PHYSICS.velocityScale,
          ),
        ),
      );
      previous.current = { x: event.delta.x, time: now };
      if (idle.current) clearTimeout(idle.current);
      idle.current = setTimeout(
        () => angle.set(0),
        KANBAN_PHYSICS.resetAfterMs,
      );
    },
    onDragEnd: reset,
    onDragCancel: reset,
  });
  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current);
    },
    [],
  );
  return (
    <motion.div
      className="kanban-physics-card"
      initial={reduced ? false : { scale: 1 }}
      animate={{ scale: reduced ? 1 : KANBAN_PHYSICS.pickupScale }}
      style={{ rotate: reduced ? 0 : rotate }}
      transition={{
        type: "spring",
        stiffness: KANBAN_PHYSICS.stiffness,
        damping: KANBAN_PHYSICS.damping,
        mass: KANBAN_PHYSICS.mass,
      }}
    >
      {children}
    </motion.div>
  );
}
