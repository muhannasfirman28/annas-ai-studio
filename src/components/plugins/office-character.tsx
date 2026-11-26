"use client";

import { AnimatePresence, motion } from "motion/react";
import type { CSSProperties } from "react";
import { AVAIL_DOT, AVAIL_LABEL, cn } from "@/lib/utils";
import { ACTIVITY_LABEL, type OfficeActivity, type OfficeEmployee } from "./office-types";

const ENTRANCE = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

const SKIN_TONES = ["#f2c9a4", "#d9a37c", "#b97d57", "#8d5a3d", "#f5d7bd"];
const HAIR_TONES = ["#2a1c17", "#4a3020", "#151922", "#6b4026", "#374151"];

function loopFor(activity: OfficeActivity, frozen: boolean, index: number) {
  if (frozen || activity === "offline") return { animate: {}, transition: {} };
  const animate =
    activity === "walking"
      ? { y: [0, -3, 0, -3, 0], rotate: [0, -2, 0, 2, 0] }
      : activity === "focus"
        ? { y: [0, -2, 0, -1, 0], rotate: [0, 0.6, 0, -0.6, 0] }
        : activity === "reading"
          ? { rotate: [0, -2, 0, 2, 0] }
          : activity === "talking"
            ? { rotate: [0, -4, 0, 4, 0], y: [0, -1, 0, -1, 0] }
            : { x: [0, 1.5, 0, -1.5, 0], y: [0, -1, 0, 0, 0] };
  const transition =
    activity === "walking"
      ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" as const, delay: index * 0.12 }
      : { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const, delay: index * 0.25, repeatDelay: 0.3 };
  return { animate, transition };
}

export function OfficeCharacter({
  employee,
  index,
  activity,
  frozen,
  selected,
  walking,
  facing,
  message,
  emoji,
  action,
  onSelect,
  onHover,
}: {
  employee: OfficeEmployee;
  index: number;
  activity: OfficeActivity;
  frozen: boolean;
  selected: boolean;
  walking: boolean;
  facing: "left" | "right" | "front";
  message?: string;
  emoji?: string;
  action?: { emoji: string; label: string };
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { animate, transition } = loopFor(activity, frozen, index);
  const status = employee.availability ?? "AVAILABLE";
  const style = {
    "--person": employee.avatarColor,
    "--skin": SKIN_TONES[index % SKIN_TONES.length],
    "--hair": HAIR_TONES[index % HAIR_TONES.length],
  } as CSSProperties;

  // Saat bergerak, label aktivitas yang tampil. Saat duduk, obrolan simulasi yang tampil.
  const bubble = action
    ? { key: `${employee.id}:action:${action.label}`, emoji: action.emoji, text: action.label, kind: "action" as const }
    : message
      ? { key: `${employee.id}:chat:${message}`, emoji: emoji ?? "", text: message, kind: "chat" as const }
      : null;

  return (
    <motion.div variants={ENTRANCE} className={cn("relative flex w-full min-w-0 flex-col items-center", selected && "z-10")}>
      <motion.button
        type="button"
        aria-label={`${employee.name}, ${employee.title}. ${ACTIVITY_LABEL[activity]}${action ? `. ${action.label}` : ""}${message ? `. Obrolan simulasi: ${message}` : ""}.`}
        aria-pressed={selected}
        title={`${employee.name} — ${ACTIVITY_LABEL[activity]}${action ? ` · ${action.label}` : ""}`}
        onClick={() => onSelect(employee.id)}
        onMouseEnter={() => onHover(employee.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(employee.id)}
        onBlur={() => onHover(null)}
        animate={animate}
        transition={transition}
        whileHover={frozen ? undefined : { y: -4 }}
        whileFocus={frozen ? undefined : { y: -4 }}
        className={cn(
          "group relative flex flex-col items-center rounded-xl px-2 pb-1 pt-2 outline-none transition-colors",
          selected ? "bg-electric/10 ring-2 ring-electric/60" : "hover:bg-white/5",
          facing === "left" && "office-facing-left",
          activity === "offline" && "opacity-45",
        )}
      >
        <span className="office-chair" aria-hidden="true" />
        <span className={cn("office-person", walking && !frozen && "office-walking")} style={style} aria-hidden="true">
          <span className="office-person-head">
            {employee.avatarUrl ? (
              <img src={employee.avatarUrl} alt="" className="h-full w-full rounded-[46%] object-cover" />
            ) : (
              <>
                <span className="office-hair" />
                <span className="office-face">
                  <span className="office-eye office-eye-left" />
                  <span className="office-eye office-eye-right" />
                  <span className="office-smile" />
                </span>
              </>
            )}
          </span>
          <span className="office-person-neck" />
          <span className="office-person-body">
            <span className="office-collar" />
            <span className={cn("office-person-arm office-arm-left", !frozen && activity === "typing" && "office-arm-typing", !frozen && walking && "office-arm-walking")}><span className="office-hand" /></span>
            <span className={cn("office-person-arm office-arm-right", !frozen && activity === "reading" && "office-arm-reading", !frozen && walking && "office-arm-walking")}><span className="office-hand" /></span>
          </span>
          <span className="office-legs"><span className="office-leg" /><span className="office-leg" /></span>
          <span className={cn("office-laptop", walking && "office-laptop-hidden")}><span className="office-laptop-screen" /></span>
        </span>

        <span className="office-chat-anchor" aria-hidden="true">
          <AnimatePresence mode="wait">
            {bubble ? (
              <motion.span
                key={bubble.key}
                className={cn("office-chat-bubble", bubble.kind === "action" && "office-action-bubble")}
                initial={frozen ? false : { opacity: 0, y: 8, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={frozen ? undefined : { opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: frozen ? 0 : 0.24, ease: "easeOut" }}
              >
                <span className="office-chat-emoji">{bubble.emoji}</span>{bubble.text}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </span>
      </motion.button>

      <div className="office-nameplate">
        <span className="flex items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full ring-2 ring-card", AVAIL_DOT[status] ?? AVAIL_DOT.AVAILABLE)} aria-hidden="true" />
          <span className="truncate font-semibold">{employee.name}</span>
        </span>
        <span className="truncate text-[10px] opacity-70">{employee.title}</span>
        <span className="sr-only">Status: {AVAIL_LABEL[status] ?? status}</span>
      </div>
    </motion.div>
  );
}
