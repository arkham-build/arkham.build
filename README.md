# arkham.build

> [arkham.build](https://arkham.build) is a web-based deckbuilder for Arkham Horror: The Card Game™.

> [!NOTE]  
> The application is currently being restructured into a monorepo. The frontend and its README (what this repo previously contained) can be found in `./frontend`.

## Metadata additions

arkham.build extends the _arkhamdb deck schema_ with a few fields for additional functionality.

- `meta.extra_deck`: Parallel Jim's spirit deck. Format: comma-separated list of ids `"id1,id2,id3"`.
- `meta.attachments_{code}`: cards that are attached to a specific setup deck, for example _Joe Diamond_ or _Stick to the Plan_. Format: comma-separated list of ids `"id1,id2,id2,id3"`.
- `meta.card_pool`: packs that can be used for this deck. Used for limited pool deckbuilding such as #campaign-playalong. Format: `"<pack_code>,<pack_code>"`. For arkham.build, new format pack codes take precedence over old format. Cycles can be added as `cycle:<cycle_code>`.
- `meta.card_pool_extension_{code}`: Some cards can extend the card pool with choices. This tracks their selection state. Format: `"card:<code>,card:<code>"`. 
- `meta.fan_made_content`: Stores fan-made content (cards, packs, encounter sets) used in this deck. See [here](https://github.com/arkham-build/fan-made-content).
- `meta.hidden_slots`: When syncing decks with fan-made content to ArkhamDB, we need to extract the slot entries and investigator. This object holds this data so we can later re-apply it.
- `meta.sealed_deck`: card ids that are pickable for this deck. Used for sealed deckbuilding. Format: comma-separated list of `id` / `quantity` pairs in the format `"id:2,id:1,..."`.
- `meta.sealed_deck_name`: name of the sealed deck definition used. format: string.
- `meta.transform_into`: code of the investigator that this deck's investigator has transformed into. I.e. `04244` for _Body of a Yithian_.
- `meta.banner_url`: URL to an image to be displayed as banner for the deck. Preferably aspect ratio `4:1`.
- `meta.intro_md`: Short deck introduction that uses the same markdown format that `description_md` uses.
- `meta.annotation_{code}`: Annotation for a specific card that uses the same markdown format that `description_md` uses. Annotations are not limited to cards in deck, but can also target cards in the side deck (upgrades, alternatives) or _any_ card (reasoning for exclusion).

### Additional metadata keys (AMK)

ArkhamDB imposes a strict limit on the amount of data that can be stored in the `meta` field of a deck. In order to work around this, we extract some of our custom metadata from `deck.meta` and store it in our own database before a deck is saved to ArkhamDB. The information is replaced with a token that can be used to retrieve it, the so called `amk`  (**a**dditional **m**etadata **k**ey). When a deck is fetched from ArkhamDB, our API consumes the entry and writes the actual metadata back to the `deck.meta`. The process is transparent to the API consumer.

The following fields are currently handled in this fashion:

- `meta.annotation_{code}`
- `meta.fan_made_content`
- `meta.hidden_slots`
- `meta.intro_md`
- `meta.sealed_deck`
- `meta.sealed_deck_name`

There is a public endpoint to resolve an `amk` via `GET https://api.arkham.build/v1/public/additional_metadata/:amk`.

## File formats

### Sealed decks

The sealed deck feature expects a csv file in the format:

```csv
code,quantity
01039,2
01090,2
06197,2
07032,2
```

In this example, the sealed deck contains two copies of _Deduction_, _Perception_, _Practice Makes Perfect_ and _Promise of Power_, so users would only be able to add these cards to their deck in the deck builder.
