import * as z from "zod/v4-mini";
import { FanMadeCardSchema } from "./card.schema";

const ContentTypeSchema = z.enum([
  "campaign",
  "investigators",
  "player_cards",
  "rework",
  "scenario",
]);

const StatusSchema = z.enum(["draft", "alpha", "beta", "complete", "final"]);

const ProjectMetaSchema = z.object({
  author: z.string().register(z.globalRegistry, {
    description: "Author of the project.",
  }),
  banner_url: z.optional(z.string()).register(z.globalRegistry, {
    description: "URL to a banner image. Ideal dimensions: 1180x500.",
  }),
  banner_credit: z.optional(z.string()).register(z.globalRegistry, {
    description: "Credit for the banner image.",
  }),
  code: z.string().check(z.minLength(3)).register(z.globalRegistry, {
    description:
      " Unique identifier for the project. a UUID when created by Zoop.",
  }),
  date_updated: z.optional(z.string()).register(z.globalRegistry, {
    description:
      "Date when this content was last updated, as ISO 8601 datestamp.",
  }),
  description: z.optional(z.string()).register(z.globalRegistry, {
    description: "Detailed (Markdown) description for the project.",
  }),
  external_link: z
    .optional(z.union([z.url(), z.literal("")]))
    .register(z.globalRegistry, {
      description: "URL to an external project page.",
    }),
  generator: z.optional(z.string()).register(z.globalRegistry, {
    description: "User-agent of the tool that created this content pack",
  }),
  language: z.string().register(z.globalRegistry, {
    description: "Language of the project as ISO 639-1 language code.",
  }),
  name: z.string().register(z.globalRegistry, {
    description: "Name of the project.",
  }),
  status: z.optional(StatusSchema).register(z.globalRegistry, {
    description:
      'Project status. If not specified, project is assumed to be "final".',
  }),
  tags: z.optional(z.array(z.string())).register(z.globalRegistry, {
    description: "List of tags for the project. (English)",
  }),
  types: z.optional(z.array(ContentTypeSchema)).register(z.globalRegistry, {
    description: "List of content types that the project contains.",
  }),
  url: z.optional(z.url()).register(z.globalRegistry, {
    description:
      "URL to where the project (=this file) is hosted. Used to fetch updates. Null for local packs.",
  }),
});

const FanMadeEncounterSetSchema = z.object({
  code: z.string(),
  name: z.string(),
  icon_url: z.optional(z.url()),
});

const FanMadePackSchema = z.object({
  code: z.string(),
  icon_url: z.optional(z.url()),
  name: z.string(),
  position: z.optional(z.number()),
});

export const FanMadeProjectSchema = z.object({
  meta: ProjectMetaSchema,
  data: z.object({
    cards: z.array(FanMadeCardSchema),
    encounter_sets: z.array(FanMadeEncounterSetSchema),
    packs: z.array(FanMadePackSchema),
  }),
});

export type FanMadeProject = z.infer<typeof FanMadeProjectSchema>;
