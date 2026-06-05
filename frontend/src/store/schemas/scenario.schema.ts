import { JsonDataScenarioSchema } from "@arkham-build/shared";
import { z } from "zod";

const ScenarioSchema = JsonDataScenarioSchema.extend({
  real_name: z.string(),
});

export type Scenario = z.infer<typeof ScenarioSchema>;
