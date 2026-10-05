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
              <HorrorPresence />
              <svg
                className={css["fracture"]}
                viewBox="0 0 1000 1000"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M500 440 352 342 365 286 224 207 194 104 76 18 M535 457 670 337 645 291 804 208 827 117 967 32 M544 536 690 612 662 671 841 741 893 865 999 919 M468 539 333 654 351 698 180 786 104 921 2 983 M450 494 292 470 237 528 130 459 84 483 0 399 M520 557 565 746 511 804 586 906 570 1000" />
              </svg>
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
                  <svg
                    className={css["tendrils"]}
                    viewBox="0 0 600 600"
                    aria-hidden="true"
                  >
                    <path d="M0 536C181 611 50 222 197 329S259 181 226 145 M600 589C410 432 585 310 409 356S347 189 378 119 M47 0C252 151 91 161 203 201S275 300 218 339 M554 0C377 186 524 152 402 230S354 345 393 384 M0 204C182 77 104 409 213 412 M600 235C489 110 523 503 390 437" />
                  </svg>
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

function HorrorPresence() {
  const textureId = useId();
  const irisId = useId();

  return (
    <svg className={css["apparition"]} viewBox="0 0 600 400" aria-hidden="true">
      <defs>
        <filter id={textureId} x="-20%" y="-30%" width="140%" height="160%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035 0.065"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="12"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <radialGradient id={irisId}>
          <stop offset="0" stopColor="#130303" />
          <stop offset="0.5" stopColor="#c5554a" />
          <stop offset="0.75" stopColor="#4a070a" />
          <stop offset="1" stopColor="#080202" />
        </radialGradient>
      </defs>
      <g filter={`url(#${textureId})`}>
        <g fill="#380407" stroke="#7a2327" strokeWidth="1.2">
          <path d="M78 166C110 122 139 118 172 145C190 159 211 166 229 166C206 190 185 204 157 197C133 189 106 180 78 166Z" />
          <path d="M378 171C402 145 423 129 452 132C483 134 503 151 524 162C504 176 478 197 450 198C415 202 396 191 378 171Z" />
        </g>
        <g fill={`url(#${irisId})`}>
          <ellipse cx="154" cy="164" rx="23" ry="30" />
          <ellipse cx="451" cy="165" rx="24" ry="31" />
        </g>
        <g fill="#020202">
          <path d="M149 135Q163 160 157 191Q144 175 149 135 M449 134Q461 162 454 196Q442 177 449 134" />
        </g>
        <g stroke="#5c171b" fill="none">
          <path
            d="M69 144C113 92 155 106 188 132M76 191C120 228 191 233 239 182 M374 141C419 99 490 110 539 148M370 193C425 244 491 225 529 190"
            strokeWidth="2"
          />
          <path d="M95 120Q76 96 85 66M120 108Q112 82 126 61M198 140Q220 121 217 97 M394 123Q372 100 388 73M491 126Q519 99 514 69M481 205Q501 247 536 264M126 214Q94 245 98 271M172 221Q181 254 163 280" />
        </g>
      </g>
    </svg>
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
        <path d="M91 210Q150 154 209 210Q150 266 91 210Z" fill="#070303" />
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
