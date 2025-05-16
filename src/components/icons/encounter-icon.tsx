import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";

type Props = {
  code?: string;
  className?: string;
  invert?: boolean;
};

function EncounterIcon(props: Props) {
  const { code, className, invert } = props;

  const iconId = getEncounterIcon(code);

  const encounterSet = useStore((state) =>
    code ? selectMetadata(state).encounterSets[code] : undefined,
  );

  if (encounterSet?.icon_url) {
    return (
      <img
        alt={`Encounter set icon: ${encounterSet.code}`}
        className={cx("external-icon", className, invert && "invert")}
        src={encounterSet.icon_url}
      />
    );
  }

  return iconId ? (
    <i className={cx(`encounters-${iconId}`, className)} />
  ) : null;
}

function getEncounterIcon(code?: string) {
  switch (code) {
    case "torch":
      return "the_gathering";

    case "arkham":
      return "midnight_masks";

    case "cultists":
      return "cult_of_umordoth";

    case "tentacles":
      return "the_devourer_below";

    case "pentagram":
      return "dark_cult";

    case "bayou":
      return "the_bayou";

    case "rougarou":
      return "curse_of_the_rougarou";

    case "essex_county_express":
      return "the_essex_county_express";

    case "decay":
      return "decay_and_filth";

    case "stranger":
      return "the_stranger";

    case "flood":
      return "the_flood_below";

    case "vortex":
      return "the_vortex_above";

    case "traps":
      return "deadly_traps";

    case "expedition":
      return "expedition";

    case "ruins":
      return "forgotten_ruins";

    case "flux":
      return "temporal_flux";

    case "eztli":
      return "the_doom_of_eztli";

    case "wilds":
      return "the_untamed_wilds";

    case "venom":
      return "yigs_venom";

    case "the_city_of_archives":
      return "city_of_archives";

    case "the_eternal_slumber":
      return "eternal_slumber";

    case "the_nights_usurper":
      return "nights_usurper";

    case "ghouls_of_umôrdhoth":
      return "ghouls_of_umrdhoth";

    case "return_to_a_phantom_of_truth":
      return "return_to_the_phantom_of_truth";

    case "where_the_gods_dwell":
      return "where_gods_dwell";

    case "murder_at_the_excelsior_hotel":
      return "excelsior";

    case "blob_epic_multiplayer":
      return "epic_multiplayer";

    case "machinations_through_time_epic_multiplayer":
      return "epic_multiplayer";

    case "blob_single_group":
      return "single_group";

    case "migo_incursion":
      return "migo";

    case "return_to_heart_of_the_elders":
      return "return_to_the_heart_of_the_elders";

    case "return_to_pillars_of_judgment":
      return "return_to_pillars_of_judgement";

    case "return_to_the_city_of_archives":
      return "return_to_city_of_archives";

    case "the_pit_of_despair":
      return "grotto_of_despair";

    case "creatures_of_the_deep":
      return "creatures_from_below";

    case "flooded_caverns":
      return "flooded_caves";

    case "the_locals":
      return "locals";

    case "the_vanishing_of_elina_harper":
      return "disappearance_of_elina_harper";

    case "the_lair_of_dagon":
      return "lair_of_dagon";

    case "death_of_stars":
      return "death_of_the_stars";

    case "swarm_of_assimilation":
      return "assimilating_swarm";

    case "hexcraft":
      return "witchwork";

    case "unstable_realm":
      return "spectral_realm";

    case "chilling_mists":
      return "cold_fog";

    case "impending_evils":
      return "threatening_evil";

    case "seeping_nightmares":
      return "sleeping_nightmares";

    case "tekelili":
      return "tekeli_li";

    case "shades_of_suffering":
      return "shades_of_sorrow";

    case "relics_of_the_past":
      return "rop";

    case "blob_that_ate_everything_else":
      return "blob_that_ate_everything_else";

    case "migo_incursion_2":
      return "migo_incursion_2";

    case "the_midwinter_gala":
      return "gala";

    default:
      return code;
  }
}

export default EncounterIcon;
