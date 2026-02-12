# Guide to Creating Episode Text Files

This guide explains how to create the `.md` episode files for the 10,000-word vocabulary podcast series.

---

## Format Overview

Each episode text file contains **exactly 100 vocabulary words** in a single-line format using `$$` as separators:

```
Episode N: Title $$ word1 $$ example1 $$ word2 $$ example2 $$ ... $$ word20 $$ example20 $$ satellite1 $$ satellite2 $$ ... $$ satellite80
```

---

## Structure: 20 Anchor + 80 Satellite

### Anchor Words (20 words with examples)
- **Definition:** High-frequency, core words for the episode theme
- **Format per word:** `english_word $$ short_example_sentence $$`
- **Example sentences:** 4–6 words max, simple present tense
- **Total for 20 anchors:** ~40 items (word + example)

### Satellite Words (80 words without examples)
- **Definition:** Related vocabulary that reinforces anchor words through theme
- **Format:** `word $$` (word only, no example)
- **Length:** Compact single words or short phrases
- **Total:** ~80 items

---

## Example: Text1 Anchor Words

```
to arrive $$ I just arrived in Paris $$
to leave $$ The plane leaves at 6 PM $$
to look for $$ I'm looking for my passport $$
```

**Key characteristics:**
- Simple, conversational English
- Present or past simple tense
- 4–5 word sentences
- Direct relevance to episode theme

---

## File Length Requirements

- **text1.md:** ~3,900 characters (baseline)
- **text2–text5.md:** ≤ 4,400 characters (max 500 chars longer)
- **Keep ratio consistent:** Don't inflate with longer sentences or descriptions

**Why?** Consistency across episodes and efficient content delivery.

---

## Step-by-Step Creation Process

### 1. Choose Episode Theme and Anchor Words (20 words)

From the podcast plan (100-episode-vocab-podcast.md), identify:
- **Episode title** (English)
- **20 anchor words** (from the "Anchor words" list)
- **80 satellite words** (related to the theme)

**Example for Episode 2 (The Street):**
- Anchor: street, neighborhood, to walk, to observe, to hear, to smell, bright, noisy, quiet, ancient, modern, facade, sidewalk, corner, passageway, shop window, sign, pedestrian, crossroads, atmosphere
- Satellites: square, fountain, bench, lamppost, courtyard, archway, ... (80 more)

### 2. Write Example Sentences for Anchors

Rules:
- Keep sentences **4–6 words maximum**
- Use **simple present or past tense**
- Make them **directly relevant to the theme**
- Use **conversational English**

**Good:**
- "I walk through the old quarter" (6 words) ✓
- "The market square is noisy" (5 words) ✓
- "Fresh bread smells wonderful" (4 words) ✓

**Bad:**
- "The delightful aroma of freshly baked artisanal bread wafts through the narrow cobblestone streets of this ancient European neighborhood" (too long) ✗
- "Bread" (no context) ✗

### 3. Build the Single-Line Text

Format:
```
Episode N: Title $$ anchor1 $$ example1 $$ anchor2 $$ example2 $$ ... $$ anchor20 $$ example20 $$ sat1 $$ sat2 $$ ... $$ sat80
```

**What NOT to do:**
- Don't use line breaks (everything on one line)
- Don't add translations or definitions
- Don't duplicate the French terms
- Don't include punctuation beyond spaces in example sentences

### 4. Quality Check

- [ ] Total vocabulary items: 20 anchors + 20 example placeholders + 80 satellites = 120 items
- [ ] All items separated by ` $$ `
- [ ] Anchor example sentences: 4–6 words each
- [ ] No line breaks (single line only)
- [ ] Character count: ≤ 4,400 characters
- [ ] All words relevant to theme
- [ ] No duplicates

---

## Vocabulary Accounting

Each episode teaches **100 unique words:**

| Component | Count | Notes |
|-----------|-------|-------|
| Anchor words | 20 | High-frequency, with examples |
| Anchor examples | 20 | (Counted as context, not new vocabulary) |
| Satellite words | 80 | Theme-related vocabulary items |
| **Total new words per episode** | **100** | 20 anchors + 80 satellites |

**Cumulative:** 100 episodes × 100 words = **10,000 words**

---

## Theme-Based Word Selection

When choosing satellite words, think in categories:

**Episode 2 (The Street):**
- **Urban spaces:** square, fountain, courtyard, archway, bridge
- **Street features:** sidewalk, lamppost, bench, railing, cobblestone
- **Commerce/services:** bakery, butcher, shop, kiosk, vendor
- **People:** pedestrian, local, tourist, busker, street musician
- **Transport:** bicycle, scooter, bus, taxi, delivery truck
- **Architecture:** dome, steeple, tower, chimney, facade

This creates a cohesive "mental folder" for the theme.

---

## Template

Copy this template and fill in:

```markdown
Episode N: Title $$ word1 $$ example $$ word2 $$ example $$ word3 $$ example $$ word4 $$ example $$ word5 $$ example $$ word6 $$ example $$ word7 $$ example $$ word8 $$ example $$ word9 $$ example $$ word10 $$ example $$ word11 $$ example $$ word12 $$ example $$ word13 $$ example $$ word14 $$ example $$ word15 $$ example $$ word16 $$ example $$ word17 $$ example $$ word18 $$ example $$ word19 $$ example $$ word20 $$ example $$ sat1 $$ sat2 $$ sat3 $$ sat4 $$ sat5 $$ sat6 $$ sat7 $$ sat8 $$ sat9 $$ sat10 $$ sat11 $$ sat12 $$ sat13 $$ sat14 $$ sat15 $$ sat16 $$ sat17 $$ sat18 $$ sat19 $$ sat20 $$ sat21 $$ sat22 $$ sat23 $$ sat24 $$ sat25 $$ sat26 $$ sat27 $$ sat28 $$ sat29 $$ sat30 $$ sat31 $$ sat32 $$ sat33 $$ sat34 $$ sat35 $$ sat36 $$ sat37 $$ sat38 $$ sat39 $$ sat40 $$ sat41 $$ sat42 $$ sat43 $$ sat44 $$ sat45 $$ sat46 $$ sat47 $$ sat48 $$ sat49 $$ sat50 $$ sat51 $$ sat52 $$ sat53 $$ sat54 $$ sat55 $$ sat56 $$ sat57 $$ sat58 $$ sat59 $$ sat60 $$ sat61 $$ sat62 $$ sat63 $$ sat64 $$ sat65 $$ sat66 $$ sat67 $$ sat68 $$ sat69 $$ sat70 $$ sat71 $$ sat72 $$ sat73 $$ sat74 $$ sat75 $$ sat76 $$ sat77 $$ sat78 $$ sat79 $$ sat80
```

---

## Files Reference

| File | Episode | Theme | Status |
|------|---------|-------|--------|
| text1.md | 1 | The Arrival | ✓ Complete |
| text2.md | 2 | The Street | ✓ Complete |
| text3.md | 3 | The Cafe | ✓ Complete |
| text4.md | 4 | The Market | ✓ Complete |
| text5.md | 5 | The Body in Motion | ✓ Complete |
| text6.md | 6 | The Numbers Game | — |
| text7.md | 7 | The Weather | — |
| ... | ... | ... | — |
| text100.md | 100 | The Journey Continues | — |

---

## Common Pitfalls to Avoid

1. **Example sentences too long** → Trim to 4–6 words max
2. **Duplicate words across episodes** → Check word-count.md to avoid repeating vocabulary
3. **Non-thematic satellite words** → All 80 should relate to the episode's central theme
4. **Missing `$$` separators** → Every word needs ` $$ ` after it
5. **Including punctuation in examples** → Keep examples clean: no periods, no commas (except naturally in phrases like "New York")
6. **French mixed with English** → Keep files 100% English (for English-language podcast)
7. **Character count inflation** → Stay under 4,400 characters (baseline: ~3,900)

---

## Quick Reference: Anchor vs. Satellite

| | Anchor | Satellite |
|---|--------|-----------|
| Count | 20 | 80 |
| Example sentence | Yes | No |
| High-frequency | Yes | No |
| Used for learning | Direct teaching | Contextual reinforcement |
| Part of core curriculum | Yes (appears in reviews) | No (theme-specific only) |

---

## Tips for Efficient Creation

- **Batch create:** Write all 20 anchor sentences at once, then satellite words
- **Use thematic categories:** Group satellite words by sub-theme (e.g., places, people, actions)
- **Reference the podcast plan:** Each episode's details are fully outlined in `100-episode-vocab-podcast.md`
- **Keep vocabulary diverse:** Mix verbs, nouns, adjectives, prepositions, and adverbs
- **Check word-count.md:** Ensure you're hitting ~100 unique vocabulary words per episode

---

## Word Count Verification

After creating each file, verify using the `word-count.md` tracker:

1. Count unique **anchor words** (20)
2. Count unique **satellite words** (80)
3. Update running total
4. Ensure cumulative total matches: Episode N × 100 = running total

Example:
- Episode 6: 100 words → Running total: 600
- Episode 10: 100 words → Running total: 1,000 (end of Season 1)

---

## Files to Keep Updated

- `word-count.md` — Update running totals and mark files as complete (✓)
- `100-episode-vocab-podcast.md` — Reference for themes and anchor words
- `text1.md` through `text100.md` — The actual episode content files
