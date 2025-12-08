# BuildQL

This document defines the query language used on arkham.build.

## Filters vs. queries

BuildQL is far more flexible than the filter UI, so queries do not reflect in the filter UI. Rather, the two can be thought of two separate ways to filter cards.

Filters and queries are not mutually exclusive. BuildQL queries apply **after** the filters apply, meaning that they work on the subset of cards that pass the filters.

Example: If the filters are set to only show player cards, queries will only return player cards that match a query.

## Invariants
- Multi-value fields such as `slot` and `traits` are split, and then each value is checked individually. If one one the values matches, the whole field is considered a match. Example: `trait = "practiced"` would match a card that is `Practiced. Fortune.`.
- All string operations work on the raw ArkhamDB representation. HTML and icons are not interpolated.
- All string and text operations are case-insensitive.
- A localized application matches on the localized text by default.
- String parameters need to be quoted with either `""` or `''`. Unquoted strings are treated as identifiers, meaning they lookup another field. Example: `"agility"` and `'agility'` would look for the string "agility" while `agility` would reference the value of the agility field.

## Operators

### Strict equals (==)
Applies the following:
* boolean: true filters cards where attribute is true. false filters cards where attribute is false or null.
* number: Filters cards where attribute matches exactly.
* string: Filters cards where attribute matches exactly.
* text: Filters cards where attribute contains an exact substring match.
```
bonded == true
xp == 3
name == "breaking and entering"
text == "<b>Fight.</b> You get +1 [combat]"
```
Inversion: `!==`


### Loose equals (=)
Loose equality operator. Works the same as == with the following differences:
* string: Filters cards where attribute contains an exact substring match.
* text: Filters cards where attribute fuzzy matches the search string. This matches the current search implementation.
```
bonded = true
xp = 3
name = "breaking entering"
text = "fight you get +1 combat"
```
Inversion: `!=`

### Strict contains (??)
Checks the supplied list of options against attribute with the strict equality operator. If any of the values match, the expression evaluates to true. This is a shorthand for chaining several `OR` operations.
```
xp ?? [1, 3, 5, 8]
trait ?? ["Tactic.", "Supply."]
text ?? ["<b>Fight.</b>", "<b>Parley.</b>"]
```
Inversion: `!??`

### Loose contains (?)
Same a strict contains, but using the loose equality check instead of the strict equality check.
```
xp ? [1, 3, 5, 8]
trait ? ["tactic", "supply"]
text ? ["fight", "parley"]
```
Inversion: `!?`

### Greater Than (>)
Only applies to numbers.
```
xp > 3
```

### Less Than (<)
Only applies to numbers.
```
xp < 3
```

### Greater Than Equals (>=)
Only applies to numbers.
```
xp >= 3
```

### Less Than Equals (<=)
Only applies to numbers.
```
xp <= 3
```

## Syntax

Each expression needs to consist of a left-side and a right-side argument that evaluates to a boolean.

### And (&)
Combines two expressions, requiring both to evaluate to true.
```
xp > 3 & trait = "practiced"
```

### Or (|)
Combines two expressions,requiring either to evaluate to true.
```
xp > 3 | trait = "practiced"
```

### Groups ( () )
Braces can be used to group expressions. Expressions in groups will be evaluated before expressions referencing them.
```
(xp = 0 | xp = 2) & (trait = "practiced" | trait = "innate")
```

### References
Other fields can be referenced in expressions.
```
health > sanity & trait = "ally"
```

### Add (+), Subtract (-), Multiply (*), Divide (/), Modulo (%)
Only apply to numbers.
```
health + sanity < 14
cost % 2 = 0
```

## Order of operation

Logical operators are resolved in the following order:
1. AND (&)
2. OR (|)

The query language is left-associative, meaning that expressions are evaluated from left to right. If multiple operators have the same precedence, the operator on the left side of the expression is evaluated first.

## Fields
```js
[
  {
    name: "agility",
    aliases: ["agi", "foot"],
    type: "number",
  },
  {
    name: "bonded",
    type: "boolean",
  },
  {
    name: "class",
    aliases: ["cls", "faction"],
    legacyAlias: "f",
    type: "string",
  },
  {
    name: "clues",
    type: "number",
  },
  {
    name: "combat",
    aliases: ["com", "fist"],
    legacyAlias: "c",
    type: "number",
  },
  {
    name: "cost",
    legacyAlias: "o",
    type: "number",
  },
  {
    name: "customizable",
    type: "boolean",
  },
  {
    name: "cycle",
    legacyAlias: "y",
    type: "string",
  },
  {
    name: "damage",
    aliases: ["dmg"],
    type: "number",
  },
  {
    name: "deck_limit",
    aliases: ["limit"],
    type: "number",
  },
  {
    name: "doom",
    type: "number",
  },
  {
    name: "encounter_set",
    aliases: ["encounter", "set"],
    type: "string",
  },
  {
    name: "evade",
    type: "number",
  },
  {
    name: "exceptional",
    type: "boolean",
  },
  {
    name: "exile",
    type: "boolean",
  },
  {
    name: "fight",
    type: "number",
  },
  {
    name: "flavor",
    legacyAlias: "v",
    type: "text",
  },
  {
    name: "heals_damage",
    aliases: ["hd"],
    type: "boolean",
  },
  {
    name: "heals_horror",
    aliases: ["hh"],
    type: "boolean",
  },
  {
    name: "health",
    aliases: ["hp"],
    legacyAlias: "h",
    type: "number",
  },
  {
    name: "horror",
    type: "number",
  },
  {
    name: "id",
    aliases: ["code"],
    type: "string",
  },
  {
    name: "illustrator",
    aliases: ["artist", "illu"],
    legacyAlias: "l",
    type: "string",
  },
  {
    name: "intellect",
    aliases: ["int", "book"],
    legacyAlias: "i",
    type: "number",
  },
  {
    name: "level",
    aliases: ["xp"],
    legacyAlias: "p",
    type: "number",
  },
  {
    name: "multiclass",
    aliases: ["multi"],
    type: "boolean",
  },
  {
    name: "myriad",
    type: "boolean",
  },
  {
    name: "name",
    type: "string",
  },
  {
    name: "pack",
    legacyAlias: "e",
    type: "string",
  },
  {
    name: "permanent",
    type: "boolean",
  },
  {
    name: "quantity",
    aliases: ["qt"],
    type: "number",
  },
  {
    name: "sanity",
    aliases: ["san"],
    legacyAlias: "s",
    type: "number",
  },
  {
    name: "shroud",
    type: "number",
  },
  {
    name: "slot",
    legacyAlias: "z",
    type: "string",
  },
  {
    name: "specialist",
    type: "boolean",
  },
  {
    name: "subname",
    type: "string",
  },
  {
    name: "subtype",
    aliases: ["sub"],
    legacyAlias: "b",
    type: "string",
  },
  {
    name: "text",
    legacyAlias: "x",
    type: "text",
  },
  {
    name: "trait",
    legacyAlias: "k",
    type: "string",
  },
  {
    name: "type",
    legacyAlias: "t",
    type: "string",
  },
  {
    name: "unique",
    legacyAlias: "u",
    type: "boolean",
  },
  {
    name: "vengeance",
    type: "number",
  },
  {
    name: "victory",
    legacyAlias: "j",
    type: "number",
  },
  {
    name: "wild",
    legacyAlias: "d",
    type: "number",
  },
  {
    name: "willpower",
    aliases: ["will", "brain"],
    legacyAlias: "w",
    type: "number",
  },
]
```