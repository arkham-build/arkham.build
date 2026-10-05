import type { Card } from "@arkham-build/shared";
import { Volume2Icon, VolumeXIcon, XIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { displayAttribute } from "@/utils/card-utils";
import { Button } from "../ui/button";
import { Dialog, DialogContent } from "../ui/dialog";
import { CardScan } from "../card-scan";
import { WeaknessDrawContext } from "./weakness-draw-context";
import {
  createWeaknessDrawSound,
  type WeaknessDrawSound,
} from "./weakness-draw-sfx";
import css from "./weakness-draw.module.css";

export function WeaknessDrawProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [card, setCard] = useState<Card>();
  const [phase, setPhase] = useState<"charging" | "revealed">("charging");
  const [muted, setMuted] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const active = useRef(false);
  const sound = useRef<WeaknessDrawSound | undefined>(undefined);

  useEffect(() => {
    return () => sound.current?.dispose();
  }, []);

  useEffect(() => {
    if (!card || phase !== "charging") return;
    const timer = window.setTimeout(() => {
      sound.current?.reveal();
      setPhase("revealed");
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [card, phase]);

  function drawWeakness(draw: () => Card) {
    if (active.current) return;
    const weakness = draw();
    active.current = true;
    setPhase("charging");
    setSkipped(false);
    setCard(weakness);
    sound.current = createWeaknessDrawSound(muted);
  }

  function close() {
    active.current = false;
    sound.current?.dispose();
    sound.current = undefined;
    setCard(undefined);
  }

  function skip() {
    sound.current?.dispose();
    sound.current = undefined;
    setSkipped(true);
    setPhase("revealed");
  }

  function toggleMuted() {
    sound.current?.setMuted(!muted);
    setMuted(!muted);
  }

  return (
    <WeaknessDrawContext value={{ drawWeakness }}>
      {children}
      <Dialog
        open={!!card}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent aria-labelledby={titleId}>
          {card && (
            <section
              className={css["ritual"]}
              data-testid="weakness-draw"
              data-phase={phase}
              data-skipped={skipped}
              data-code={card.code}
            >
              <div className={css["ambient"]} aria-hidden="true" />
              <nav className={css["controls"]}>
                <Button
                  aria-label={t("deck_edit.weakness_draw.mute")}
                  aria-pressed={muted}
                  className={css["control"]}
                  data-testid="weakness-draw-mute"
                  iconOnly
                  onClick={toggleMuted}
                >
                  {muted ? <VolumeXIcon /> : <Volume2Icon />}
                </Button>
                <Button
                  aria-label={t("deck_edit.weakness_draw.close")}
                  className={css["control"]}
                  data-testid="weakness-draw-close"
                  iconOnly
                  onClick={close}
                >
                  <XIcon />
                </Button>
              </nav>
              <div className={css["content"]}>
                <header className={css["heading"]}>
                  <p className={css["eyebrow"]}>
                    {t("deck_edit.weakness_draw.eyebrow")}
                  </p>
                  <h2 id={titleId}>
                    {t(
                      phase === "charging"
                        ? "deck_edit.weakness_draw.charging"
                        : "deck_edit.weakness_draw.revealed",
                    )}
                  </h2>
                </header>
                <div className={css["stage"]}>
                  <div className={css["vortex"]} aria-hidden="true" />
                  <div className={css["sigil"]} aria-hidden="true" />
                  <div className={css["shockwave"]} aria-hidden="true" />
                  <div className={css["burst"]} aria-hidden="true" />
                  <svg
                    className={css["lightning"]}
                    viewBox="0 0 600 600"
                    aria-hidden="true"
                  >
                    <path d="M280 250 230 212 241 185 184 161 168 104 116 78 M321 255 370 213 352 189 424 168 443 112 510 68 M330 308 398 326 379 348 454 380 472 421 548 450 M279 329 228 372 247 396 174 431 132 495 78 517 M263 300 207 286 184 304 124 269 91 281 44 242 M309 347 328 414 309 438 347 487 335 521 363 576" />
                  </svg>
                  <div className={css["shards"]} aria-hidden="true">
                    {PARTICLES.slice(0, 12).map((particle) => (
                      <i key={particle.id} style={particle.style} />
                    ))}
                  </div>
                  <div className={css["particles"]} aria-hidden="true">
                    {PARTICLES.map((particle) => (
                      <i key={particle.id} style={particle.style} />
                    ))}
                  </div>
                  <div className={css["card"]}>
                    <div className={css["card-back"]} aria-hidden="true">
                      <OccultSeal />
                    </div>
                    <div
                      className={css["card-front"]}
                      aria-hidden={phase === "charging"}
                    >
                      <CardScan card={card} draggable={false} preventFlip />
                    </div>
                  </div>
                </div>
                <footer className={css["result"]}>
                  <div aria-live="polite" aria-atomic="true">
                    <h3>
                      {phase === "revealed"
                        ? displayAttribute(card, "name")
                        : t("deck_edit.weakness_draw.sealed")}
                    </h3>
                    <p>
                      {t(
                        phase === "revealed"
                          ? "deck_edit.weakness_draw.added"
                          : "deck_edit.weakness_draw.hint",
                      )}
                    </p>
                  </div>
                  <Button
                    className={css["continue"]}
                    data-testid={
                      phase === "charging"
                        ? "weakness-draw-skip"
                        : "weakness-draw-continue"
                    }
                    onClick={phase === "charging" ? skip : close}
                    size="lg"
                  >
                    {t(
                      phase === "charging"
                        ? "deck_edit.weakness_draw.skip"
                        : "deck_edit.weakness_draw.continue",
                    )}
                  </Button>
                </footer>
              </div>
            </section>
          )}
        </DialogContent>
      </Dialog>
    </WeaknessDrawContext>
  );
}

function OccultSeal() {
  return (
    <svg
      className={css["engraving"]}
      viewBox="0 0 300 420"
      aria-hidden="true"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1">
        <path d="M24 92V24H92 M208 24H276V92 M276 328V396H208 M92 396H24V328" />
        <path
          d="M34 78V34H78 M222 34H266V78 M266 342V386H222 M78 386H34V342"
          opacity=".45"
        />
        <path d="M150 38 165 58 150 78 135 58Z M150 342 165 362 150 382 135 362Z" />
        <path d="M150 82 260 210 150 338 40 210Z" opacity=".35" />
        <circle cx="150" cy="210" r="78" strokeDasharray="2 7" />
        <circle cx="150" cy="210" r="69" />
        <circle cx="150" cy="210" r="63" opacity=".35" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <path
            key={angle}
            transform={`rotate(${angle} 150 210)`}
            d="M143 132C115 109 119 80 137 88C152 96 129 111 119 95C104 70 128 49 144 67 M157 132C182 109 181 85 167 91C153 98 174 111 184 92"
            opacity=".65"
          />
        ))}
      </g>
      <g className={css["eye"]} stroke="currentColor" strokeWidth="1.5">
        <path d="M91 210Q150 154 209 210Q150 266 91 210Z" fill="#160d25" />
        <circle cx="150" cy="210" r="22" />
        <circle cx="150" cy="210" r="15" strokeDasharray="1 3" />
        <path d="M150 191 156 210 150 229 144 210Z" fill="currentColor" />
        <path d="M114 194 106 185 M129 183 125 171 M150 178V165 M171 183 175 171 M186 194 194 185 M114 226 106 235 M129 237 125 249 M150 242V255 M171 237 175 249 M186 226 194 235" />
      </g>
    </svg>
  );
}

type ParticleStyle = React.CSSProperties & {
  "--angle": string;
  "--distance": string;
  "--delay": string;
  "--size": string;
};

const PARTICLES: { id: string; style: ParticleStyle }[] = Array.from(
  { length: 40 },
  (_, id) => ({
    id: `spark-${id}`,
    style: {
      "--angle": `${id * 137.508}deg`,
      "--distance": `${140 + ((id * 47) % 160)}px`,
      "--delay": `${(id % 7) * 35}ms`,
      "--size": `${2 + (id % 4)}px`,
    } satisfies ParticleStyle,
  }),
);
