import { useStore } from "@/store";
import { selectMetadata } from "@/store/selectors/shared";
import { cx } from "@/utils/cx";

type Props = {
  code?: string;
  className?: string;
  invert?: boolean;
};

function PackIcon(props: Props) {
  const { code, className, invert } = props;
  const icon = getPackIcon(code);

  const pack = useStore((state) =>
    code ? selectMetadata(state).packs[code] : undefined,
  );

  if (pack?.icon_url) {
    return (
      <img
        alt={`Pack icon: ${pack.code}`}
        className={cx("external-icon", className, invert && "invert")}
        src={pack.icon_url}
      />
    );
  }

  return icon ? <i className={cx(`encounters-${icon}`, className)} /> : null;
}

function getPackIcon(code?: string) {
  switch (code) {
    case "side_stories":
    case "investigator":
    case "rcore":
    case "core":
    case "core2":
    case "return":
      return "core";

    case "hfa":
    case "otr":
    case "ptr":
    case "pap":
    case "aof":
    case "parallel":
      return "parallel";

    case "dwlp":
    case "dwlc":
    case "dwl":
      return "set";

    case "ptcp":
    case "ptcc":
    case "ptc":
      return "carcosa";

    case "tfap":
    case "tfac":
    case "tfa":
      return "the_forgotten_age";

    case "tcuc":
    case "tcup":
    case "tcu":
      return "the_circle_undone";

    case "tdep":
    case "tdec":
    case "tde":
      return "dream";

    case "ticc":
    case "ticp":
    case "tic":
      return "tic";

    case "eoe":
    case "eoep":
      return "eoe";

    case "eoec":
      return "eoe_campaign";

    case "tskc":
      return "tskc";

    case "tsk":
    case "tskp":
      return "tsk";

    case "fhv":
    case "fhvp":
      return "fhvp";

    case "fhvc":
      return "fhvc";

    case "tdc":
    case "tdcp":
      return "tdcp";

    case "tdcc":
      return "tdcc";

    case "promo":
    case "dre":
    case "bob":
    case "tftbw":
    case "tdg":
    case "iotv":
    case "tdor":
    case "books":
    case "hoth":
    case "promotional":
      return "novella";

    case "tmm":
      return "the_miskatonic_museum";

    case "tece":
      return "the_essex_county_express";

    case "bota":
      return "blood_on_the_altar";

    case "uau":
      return "undimensioned_and_unseen";

    case "wda":
      return "where_doom_awaits";

    case "litas":
      return "lost_in_time_and_space";

    case "eotp":
      return "echoes_of_the_past";

    case "tuo":
      return "the_unspeakable_oath";

    case "apot":
      return "a_phantom_of_truth";

    case "bsr":
      return "black_stars_rise";

    case "dca":
      return "dim_carcosa";

    case "tpm":
      return "the_pallid_mask";

    case "tof":
      return "threads_of_fate";

    case "tbb":
      return "the_boundary_beyond";

    case "hote":
      return "heart_of_the_elders";

    case "tcoa":
      return "city_of_archives";

    case "tdoy":
      return "the_depths_of_yoth";

    case "sha":
      return "shattered_aeons";

    case "tsn":
      return "the_secret_name";

    case "wos":
      return "the_wages_of_sin";

    case "fgg":
      return "for_the_greater_good";

    case "uad":
      return "union_and_disillusion";

    case "icc":
      return "in_the_clutches_of_chaos";

    case "bbt":
      return "before_the_black_throne";

    case "sfk":
      return "the_search_for_kadath";

    case "tsh":
      return "a_thousand_shapes_of_horror";

    case "dsm":
      return "dark_side_of_the_moon";

    case "pnr":
      return "point_of_no_return";

    case "wgd":
      return "where_gods_dwell";

    case "woc":
      return "weaver_of_the_cosmos";

    case "itd":
      return "in_too_deep";
    case "def":
      return "devil_reef";
    case "hhg":
      return "horror_in_high_gear";

    case "lif":
      return "a_light_in_the_fog";

    case "lod":
      return "lair_of_dagon";

    case "itm":
      return "into_the_maelstrom";

    case "rtnotz":
      return "rtnotz";

    case "rtdwl":
      return "return_to_the_dunwich_legacy";
    case "rtptc":
      return "return_to_the_path_to_carcosa";
    case "rttfa":
      return "return_to_the_forgotten_age";
    case "rttcu":
      return "rttcu";
    case "nat":
      return "nate";
    case "har":
      return "harvey";
    case "win":
      return "winifred";
    case "jac":
      return "jacqueline";
    case "ste":
      return "stella";

    case "rod":
      return "read_or_die";
    case "aon":
      return "all_or_nothing";
    case "bad":
      return "bad_blood";
    case "btb":
      return "by_the_book";
    case "rtr":
      return "red_tide_rising";
    case "ltr":
      return "laid_to_rest";
    case "rop":
      return "rop";

    case "cotr":
      return "rougerauo2";
    case "coh":
      return "carnevale";
    case "lol":
      return "lol";
    case "guardians":
      return "guardians";
    case "hotel":
      return "excelsior";
    case "blob":
      return "blob_set";
    case "wog":
      return "wotog";
    case "mtt":
      return "machinations_through_time";
    case "fof":
      return "roulette";
    case "tmg":
      return "gala";
    case "blbe":
      return "blbe";

    default:
      return null;
  }
}

export default PackIcon;
