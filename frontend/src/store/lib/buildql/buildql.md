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

## Parameter types

### Boolean

Possible values are `true` and `false`. `null` is coerced to `false`.

### Number

Possible values are numeric, `null` or one of `*`, `?`, `x` or `-`. For arithmetic operations, strings are cast as follows:

- `-` => null
- `x`=> -2
- `*` => -3
- `?` => -4

### String

There are two different string types: `string` and `text`. These differ in how the equality checks operate (see below). String can be checked against other strings, `null` or a regular expression.

String parameters need to be quoted with either `""` or `''`. Unquoted strings are treated as identifiers, meaning they lookup another field. Example: `"agility"` and `'agility'` would look for the string "agility" while `agility` would reference the value of the agility field.

#### Regular expressions

In order to check against a regular expression, wrap the regular expression in `//` instead of quotes. Regular expressions use JavaScript regex syntax and are case-insensitive by default (matching the behavior of all string operations in BuildQL).

Examples:
```
name = /^the/
trait = /^(spell|ritual)$/
text = /\d+ damage/
```

Regular expressions can be used with all string comparison operators (`=`, `!=`, `?`, `!?`, `==`, `!==`, `??`, `!??`).

## Operators

### Equals (=)
Equality operator. Applies the following:
* `boolean`: `true` filters cards where attribute is `true`. `false` filters cards where attribute is `false` or `null`.
* `number`: Filters cards where attribute matches exactly.
* `string`: Filters cards where attribute fuzzy matches the search string. This matches the current search implementation.
* `text`: Filters cards where attribute fuzzy matches the search string. This matches the current search implementation.

When fuzzy matching, the code looks for the **right**-hand side string in the **left**-hand side string.

```
bonded = true
xp = 3
name = "breaking entering"
text = "fight you get +1 combat"
```
Inversion: `!=`

### Exact equals (==)
Works the same as `=` with the following differences:
* `string`: Filters cards where attribute matches exactly.
* `text`: Filters cards where attribute contains an exact substring match.
```
bonded == true
xp == 3
name == "breaking and entering"
text == "<b>Fight.</b> You get +1 [combat]"
```
Inversion: `!==`

### Contains (?)
Checks the supplied list of options against attribute with the equality operator. If any of the values match, the expression evaluates to true. This is a shorthand for chaining several `OR` operations.
```
xp ? [1, 3, 5, 8]
trait ? ["tactic", "supply"]
text ? ["fight", "parley"]
```
Inversion: `!?`

### Exact contains (??)
Same a contains, but using the exact equality check.

```
text ?? ["<b>Fight.</b>", "<b>Parley.</b>"]
```
Inversion: `!??`

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

## Null (null)
Fields can be compared to `null` to check for nullish values.
```
xp = null
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

## Card backs

When the `[x] Backs` toggle is activated, queries will check both the front- and backside of a card when matching values. All fields can be prefixed with `back:` to query against the backside of a card. This can be used to compare with the frontside:

```
back:subname != null & back:subname != subname
```

## Fields

- **agility** (number)
  - aliases: `ag`, `foot`
  - legacy alias: `a`
- **bonded** (boolean)
  - aliases: `bo`
- **chapter** (number)
  - aliases: `ch`
- **clues** (number)
  - aliases: `cl`
- **combat** (number)
  - aliases: `cb`, `fist`
  - legacy alias: `c`
- **cost** (number)
  - aliases: `co`
  - legacy alias: `o`
- **customizable** (boolean)
  - aliases: `cus`
- **cycle** (string)
  - aliases: `cy`
  - legacy alias: `y`
- **damage** (number)
  - aliases: `dmg`
- **deck_limit** (number)
  - aliases: `dl`, `limit`
- **doom** (number)
  - aliases: `do`
- **encounter_set** (string)
  - aliases: `en`, `encounter`, `set`
- **evade** (number)
  - aliases: `ev`
- **exceptional** (boolean)
  - aliases: `ex`
- **exile** (boolean)
  - aliases: `exl`
- **faction** (string)
  - aliases: `cls`, `class`
  - legacy alias: `f`
- **fight** (number)
  - aliases: `fi`
- **flavor** (text)
  - aliases: `fl`
  - legacy alias: `v`
- **has_upgrade** (boolean)
  - aliases: `hu`
- **heals_damage** (boolean)
  - aliases: `hd`
- **heals_horror** (boolean)
  - aliases: `hh`
- **health** (number)
  - aliases: `hp`
  - legacy alias: `h`
- **horror** (number)
  - aliases: `ho`
- **id** (string)
  - aliases: `code`
- **illustrator** (string)
  - aliases: `il`, `illu`
  - legacy alias: `l`
- **intellect** (number)
  - aliases: `in`, `int`, `book`
  - legacy alias: `i`
- **investigator_access** (string)
  - aliases: `ia`
  - legacy alias: `do`
- **in_deck** (number)
- **is_upgrade** (boolean)
  - aliases: `iu`
- **multiclass** (boolean)
  - aliases: `mu`, `multi`
- **myriad** (boolean)
  - aliases: `my`
- **name** (string)
  - aliases: `na`
  - matches printed name and card abbreviation
- **pack** (string)
  - aliases: `pa`
  - legacy alias: `e`
- **permanent** (boolean)
  - aliases: `pe`, `perm`
- **quantity** (number)
  - aliases: `qt`, `qty`
- **reverse_type** (string)
  - aliases: `rt`
- **sanity** (number)
  - aliases: `sa`
  - legacy alias: `s`
- **shroud** (number)
  - aliases: `sh`
- **slot** (string)
  - aliases: `sl`
  - legacy alias: `z`
- **specialist** (boolean)
  - aliases: `sp`
- **stage** (number)
  - aliases: `sg`
- **subname** (string)
  - aliases: `sn`
- **subtype** (string)
  - aliases: `st`
  - legacy alias: `b`
- **taboo_set** (string)
  - aliases: `ts`
- **text** (text)
  - aliases: `txt`
  - legacy alias: `x`
- **trait** (string)
  - aliases: `tr`
  - legacy alias: `k`
- **type** (string)
  - aliases: `ty`
  - legacy alias: `t`
- **unique** (boolean)
  - aliases: `un`
  - legacy alias: `u`
- **vengeance** (number)
  - aliases: `ve`
- **victory** (number)
  - aliases: `vp`
  - legacy alias: `j`
- **wild** (number)
  - aliases: `wd`
  - legacy alias: `d`
- **willpower** (number)
  - aliases: `wp`, `will`, `brain`
  - legacy alias: `w`
- **xp** (number)
  - aliases: `level`, `lvl`
  - legacy alias: `p`
