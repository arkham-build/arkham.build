import { useMutation } from "@tanstack/react-query";
import { LoaderCircleIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CardScan } from "@/components/card-scan";
import { Masthead } from "@/components/masthead";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast.hooks";
import { useStore } from "@/store";
import { parseFanMadeProject } from "@/store/lib/fan-made-content";
import type { FanMadeProject } from "@/store/schemas/fan-made-project.schema";
import { selectMetadata } from "@/store/selectors/shared";
import { cardToApiFormat } from "@/utils/arkhamdb-json-format";
import { cx } from "@/utils/cx";
import { useDocumentTitle } from "@/utils/use-document-title";
import css from "./core-2026-reveal.module.css";

const API_URL = import.meta.env.VITE_SOUVENIR_API_URL || "";

function Core2026Reveal() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [pack, setPack] = useState<FanMadeProject | null>(null);
  const souvenirRef = useRef<HTMLDivElement | null>(null);

  const addFanMadeProject = useStore((state) => state.addFanMadeProject);

  useEffect(() => {
    if (pack && souvenirRef.current) {
      souvenirRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [pack]);

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to create souvenir");
      }

      return response.json();
    },
  });

  const onSubmit = useCallback(
    async (evt: React.FormEvent) => {
      evt.preventDefault();
      try {
        const res = await mutation.mutateAsync(name);
        const pack = parseFanMadeProject(res);
        addFanMadeProject(res);
        setPack(pack);
      } catch (err) {
        toast.show({
          children: (err as Error).message,
          duration: 5000,
          variant: "error",
        });
      }
    },
    [name, mutation, toast, addFanMadeProject],
  );

  const downloadPack = useCallback(() => {
    if (pack) {
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(pack, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        `${pack.meta.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_|_$/g, "")}.json`,
      );
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  }, [pack]);

  const metadata = useStore(selectMetadata);

  useDocumentTitle("Core Set 2026 Reveal");

  const fingerprintKit = metadata.cards["12031"];
  const goldBug = metadata.cards["12098"];

  return (
    <main className={css["layout"]}>
      <header className={css["header"]}>
        <div className={css["header-nav"]}>
          <Masthead hideLocaleSwitch hideSyncStatus invert />
        </div>
        <div className={css["header-backdrop"]}>
          <img
            src="/assets/blog/core_2026_full.avif"
            alt="Banner for the Core 2026 reveal"
          />
        </div>
        <div className={css["header-title"]}>
          <p>arkham.build presents...</p>
          <h1>Fingerprint Kit &amp; The Gold Bug</h1>
        </div>
      </header>
      <div className={cx("longform", css["content"])}>
        <blockquote>
          Stop by Mr. Tillinghast's gift shop to grab a special, limited edition
          souvenir.
        </blockquote>

        <p>
          We are proud to present two new cards from{" "}
          <em>Arkham Horror: The Card Game</em>'s upcoming{" "}
          <a
            href="https://store.asmodee.com/products/arkham-horror-the-card-game-core-set#&gid=1&pid=1"
            target="_blank"
            rel="noreferrer"
          >
            Core Set
          </a>
          . A big thank you to Fantasy Flight Games for allowing us to
          participate in this year's preview season.
        </p>
        <p>
          This week is <i className="icon-seeker" />{" "}
          <span className="fg-seeker">Seeker</span> week, so you will be
          surprised to learn that we are revealing... no new Seeker cards!
          Instead, our reveal consists of a returning classic and a brand new{" "}
          <i className="icon-weakness" /> basic weakness.
        </p>

        <p>
          Without further ado, here are the cards. See you for tomorrow's reveal
          over at the{" "}
          <a href="https://www.youtube.com/@Quick_Learner">QuickLearner</a>{" "}
          YouTube channel. (17:00 CET)
        </p>

        <div className={css["cards"]}>
          <div className={css["cards-row"]}>
            <CardScan
              className={css["card"]}
              card={fingerprintKit}
              preventFlip
            />
            <CardScan className={css["card"]} card={goldBug} preventFlip />
          </div>
        </div>
      </div>
      <article className={css["shop"]}>
        <h2>Tillinghast Esoteria and Exotics</h2>
        <p>
          Enter your name to download a unique version of today's revealed
          cards. These cards will be added to your arkham.build app
          automatically.
        </p>
        <form onSubmit={onSubmit}>
          <Field>
            <FieldLabel>Enter your name</FieldLabel>
            <input
              type="text"
              name="name"
              placeholder="Enter your name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Button
            disabled={!API_URL || !name || mutation.isPending}
            type="submit"
            variant="primary"
          >
            {mutation.isPending && <LoaderCircleIcon className="spin" />}
            Create souvenir
          </Button>
          {!API_URL && <p>The souvenir shop is now closed.</p>}
          <p>
            <small>
              The souvenir shop uses{" "}
              <a
                href="https://github.com/tokeeto/shoggoth"
                target="_blank"
                rel="noreferrer"
              >
                Shoggoth
              </a>{" "}
              to draw your cards. A warm thank you to Tokeeto for his help in
              making this possible.
            </small>
          </p>
        </form>
      </article>
      {pack && (
        <article
          className={cx(css["cards"], css["souvenir"])}
          ref={souvenirRef}
        >
          <header>
            <h2>{pack.meta.name}</h2>
          </header>
          <div className={css["cards-row"]}>
            {pack.data.cards.map((card) => (
              <CardScan
                className={css["card"]}
                key={card.code}
                card={cardToApiFormat(card)}
                preventFlip
              />
            ))}
          </div>
          <p>
            These cards have been added to your arkham.build app. You can also
            save them manually if you wish.
          </p>
          <Button onClick={downloadPack} variant="primary">
            Download as fan-made content pack
          </Button>
        </article>
      )}
    </main>
  );
}

export default Core2026Reveal;
