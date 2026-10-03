import { DicesIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import type { LookupTables } from "@/store/lib/lookup-tables.types";
import {
  basicWeaknessPoolForDeck,
  randomBasicWeaknessForDeck,
} from "@/store/lib/random-basic-weakness";
import type { ResolvedDeck } from "@/store/lib/types";
import {
  selectLocaleSortingCollator,
  selectLookupTables,
  selectMetadata,
} from "@/store/selectors/shared";
import i18n from "@/utils/i18n";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Field, FieldLabel } from "../ui/field";
import { Plane } from "../ui/plane";
import { Select } from "../ui/select";
import { useToast } from "../ui/toast.hooks";
import css from "./add-random-basic-weakness.module.css";
import { DraftBasicWeakness } from "./draft-basic-weakness";
import { useAddBasicWeakness } from "./use-add-basic-weakness";

type Props = {
  deck: ResolvedDeck;
};

export function AddRandomBasicWeakness(props: Props) {
  const { deck } = props;
  const { t } = useTranslation();
  const toast = useToast();

  const deps = useStore(
    useShallow((state) => ({
      lookupTables: selectLookupTables(state),
      metadata: selectMetadata(state),
      settings: state.settings,
    })),
  );
  const collator = useStore(selectLocaleSortingCollator);

  const [replaceRandomBasicWeakness, setReplaceRandomBasicWeakness] =
    useState(true);
  const [ignoreDeckCardPool, setIgnoreDeckCardPool] = useState(
    () => !deps.settings.useLimitedPoolForWeaknessDraw,
  );
  const [equalProbability, setEqualProbability] = useState(false);
  const [requiredTrait, setRequiredTrait] = useState<string>();

  const weaknessPool = basicWeaknessPoolForDeck(
    deps.metadata,
    deps.lookupTables,
    deps.settings,
    deck,
    { ignoreDeckCardPool },
  );

  const traitOptions = getTraitOptions(
    deps.lookupTables,
    collator,
    weaknessPool,
  );
  const effectiveRequiredTrait = traitOptions.some(
    (option) => option.value === requiredTrait,
  )
    ? requiredTrait
    : undefined;

  const weaknessOptions = {
    equalProbability,
    ignoreDeckCardPool,
    requiredTrait: effectiveRequiredTrait,
  };
  const eligibleWeaknesses = basicWeaknessPoolForDeck(
    deps.metadata,
    deps.lookupTables,
    deps.settings,
    deck,
    weaknessOptions,
  );
  const draftDisabled = new Set(eligibleWeaknesses).size < 3;
  const addBasicWeakness = useAddBasicWeakness(
    deck,
    replaceRandomBasicWeakness,
  );

  const addRandomBasicWeakness = () => {
    const weaknessCode = randomBasicWeaknessForDeck(
      deps.metadata,
      deps.lookupTables,
      deps.settings,
      deck,
      weaknessOptions,
    );

    if (!weaknessCode) {
      toast.show({
        children: t("deck_edit.draft_weakness_modal.too_few_rbw"),
        duration: 3000,
        variant: "error",
      });
      return;
    }

    addBasicWeakness(deps.metadata.cards[weaknessCode]);
  };

  return (
    <Plane as="article" className={css["container"]}>
      <h4 className={css["title"]}>
        <DicesIcon />
        {t("deck.tools.random_basic_weakness.title")}
      </h4>
      <div className={css["options"]}>
        <Checkbox
          checked={replaceRandomBasicWeakness}
          data-testid="random-basic-weakness-replace-placeholder"
          label={t(
            "deck.tools.random_basic_weakness.replace_random_basic_weakness",
          )}
          onCheckedChange={setReplaceRandomBasicWeakness}
        />
        <Checkbox
          checked={ignoreDeckCardPool}
          data-testid="random-basic-weakness-ignore-card-pool"
          label={t("deck.tools.random_basic_weakness.ignore_deck_card_pool")}
          onCheckedChange={setIgnoreDeckCardPool}
        />
        <Checkbox
          checked={equalProbability}
          data-testid="random-basic-weakness-equal-probability"
          label={t("deck.tools.random_basic_weakness.equal_probability")}
          onCheckedChange={setEqualProbability}
        />
        <Field className={css["trait-field"]}>
          <FieldLabel htmlFor="random-basic-weakness-trait">
            {t("deck.tools.random_basic_weakness.require_trait")}
          </FieldLabel>
          <Select
            data-testid="random-basic-weakness-trait"
            emptyLabel={t("deck.tools.random_basic_weakness.trait_placeholder")}
            id="random-basic-weakness-trait"
            onChange={(event) => {
              setRequiredTrait(event.target.value || undefined);
            }}
            options={traitOptions}
            value={effectiveRequiredTrait ?? ""}
          />
        </Field>
      </div>
      <div className={css["actions"]}>
        <Button
          data-testid="add-random-basic-weakness"
          onClick={addRandomBasicWeakness}
          variant="primary"
        >
          <DicesIcon />
          {t("deck.tools.random_basic_weakness.add")}
        </Button>
        <DraftBasicWeakness
          deck={deck}
          disabled={draftDisabled}
          onWeaknessSelect={addBasicWeakness}
          options={weaknessOptions}
          triggerType="button"
        />
      </div>
    </Plane>
  );
}

function getTraitOptions(
  lookupTables: LookupTables,
  collator: Intl.Collator,
  weaknessPool: readonly string[],
) {
  const weaknessCodes = new Set(weaknessPool);

  return Object.entries(lookupTables.traits)
    .filter(([, cardCodes]) =>
      Object.keys(cardCodes).some((code) => weaknessCodes.has(code)),
    )
    .map(([code]) => {
      const key = `common.traits.${code}`;
      return {
        label: i18n.exists(key) ? i18n.t(key) : code,
        value: code,
      };
    })
    .sort((a, b) => collator.compare(a.label, b.label));
}
