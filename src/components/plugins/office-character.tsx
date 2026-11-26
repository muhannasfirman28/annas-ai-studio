"use client";

import { motion } from "motion/react";
import type { CSSProperties } from "react";
import { AVAIL_DOT, AVAIL_LABEL, cn, initials } from "@/lib/utils";
import { ACTIVITY_LABEL, type OfficeActivity, type OfficeEmployee } from "./office-types";

const ENTRANCE = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

function loopFor(activity: OfficeActivity, frozen: boolean, index: number) {
  if (frozen || activity === "offline") return { animate: {}, transition: {} };
  const animate =
    activity === "walking"
      ? { x: [0, -24, -48, -24, 0], y: [0, -4, -4, -4, 0], rotate: [0, -3, 0, 3, 0] }
      : activity === "focus"
        ? { y: [0, -2, 0, -1, 0], rotate: [0, 0.6, 0, -0.6, 0] }
        : activity === "reading"
          ? { rotate: [0, -2, 0, 2, 0] }
          : { x: [0, 1.5, 0, -1.5, 0], y: [0, -1, 0, 0, 0] };
  const transition =
    activity === "walking"
      ? { duration: 10, repeat: Infinity, ease: "easeInOut" as const, delay: index * 0.45, repeatDelay: 1.5 }
      : { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const, delay: index * 0.25, repeatDelay: 0.3 };
  return { animate, transition };
}

export function OfficeCharacter({
  employee,
  index,
  activity,
  frozen,
  selected,
  onSelect,
  onHover,
}: {
  employee: OfficeEmployee;
  index: number;
  activity: OfficeActivity;
  frozen: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const { animate, transition } = loopFor(activity, frozen, index);
  const status = employee.availability ?? "AVAILABLE";

  return (
    <motion.div variants={ENTRANCE} className={cn("relative flex w-full min-w-0 flex-col items-center", selected && "z-10")}>
      <motion.button
        type="button"
        aria-label={`${employee.name}, ${employee.title}. ${ACTIVITY_LABEL[activity]} — simulasi visual.`}
        aria-pressed={selected}
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
          "group relative flex flex-col items-center rounded-xl px-2 py-1 outline-none transition-colors",
          selected ? "bg-electric/10 ring-2 ring-electric/60" : "hover:bg-muted/70",
          activity === "offline" && "opacity-45",
        )}
      >
        <span className="office-person" style={{ "--person": employee.avatarColor } as CSSProperties}>
          <span className="office-person-head">
            {employee.avatarUrl ? <img src={employee.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials(employee.name)}
          </span>
          <span className="office-person-body">
            <span className={cn("office-person-arm", !frozen && activity === "typing" && "office-arm-typing")} />
            <span className={cn("office-person-arm", !frozen && activity === "reading" && "office-arm-reading")} />
          </span>
        </span>
        <span className="office-bubble" aria-hidden="true">{ACTIVITY_LABEL[activity]}</span>
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
