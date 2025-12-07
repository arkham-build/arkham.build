# BuildQL

This document defines the query language used on arkham.build.

## Invariants
- All string operations work on the raw ArkhamDB representation. HTML and icons are not interpolated.
- All string and text operations are case-insensitive.
- A localized application matches on the localized text by default.
- Multi-value fields such as `slot` and `traits` are split, and then each value is checked individually. If one one the values matches, the whole field is considered a match. Example: `trait = "practiced"` would match a card that is `Practiced. Fortune.`.
- Each expression needs to consist of a left-hand side and a right-hand side argument. For instance, a falsy value is checked via `unique = false` rather than `!unique`.

## Operators

### Strict equals (==)
Applies the following:
* `boolean`: true filters cards where attribute is true. false filters cards where attribute is false or null.
* `number`: Filters cards where attribute matches exactly.
* `string`: Filters cards where attribute matches exactly.
* `text`: Filters cards where attribute contains an exact substring match.
```
bonded == true
xp == 3
name == "breaking and entering"
text == "<b>Fight.</b> You get +1 [combat]"
```

Inversion: `!==`

### Loose equals (=)
Loose equality operator. Works the same as == with the following differences:
* `string`: Filters cards where attribute contains an exact substring match.
* `text`: Filters cards where attribute fuzzy matches the search string. This matches the current search implementation.
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
Inversion: ??!
```
Inversion: `??!`

### Loose contains (?)
Same a strict contains, but using the loose equality check instead of the strict equality check.
```
xp ? [1, 3, 5, 8]
trait ? ["tactic", "supply"]
text ? ["fight", "parley"]
```
Inversion: `?!`

### Greater Than (>)
Only applies to `numbers`.
```
xp > 3
```

### Less Than (<)
Only applies to `numbers`.
```
xp < 3
```

### Greater Than Equals (>=)
Only applies to `numbers`.
```
xp >= 3
```

### Less Than Equals (<=)
Only applies to `numbers`.
```
xp <= 3
```

## Syntax

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
