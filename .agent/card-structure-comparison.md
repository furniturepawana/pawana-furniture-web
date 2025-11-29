# Card Component Structure

## Before Standardization ❌

```
pages/_catalogue.css
├── .set-card { ... }          (103 lines)
├── .product-card { ... }      (99 lines)
└── Grid layouts

pages/_home.css
├── .set-card { ... }          (46 lines)
├── .product-card animations
└── Grid layouts

pages/_room.css
├── .set-card { ... }          (76 lines)
└── Grid layouts

components/_product-card.css
└── .product-card { ... }      (111 lines)
```

**Total**: ~435 lines of card styling (with duplicates)

---

## After Standardization ✅

```
components/_product-card.css
└── .item-card, .product-card { ... }    (117 lines)
    ├── Image: 1/1 aspect ratio
    ├── Hover effects
    ├── Typography
    ├── Meta display
    ├── Model number
    └── Style badges

components/_set-card.css (NEW)
└── .set-card { ... }                    (105 lines)
    ├── Image: 4/3 aspect ratio
    ├── Hover effects (same as item)
    ├── Typography (same as item)
    ├── Meta display (same as item)
    ├── Set pieces count
    └── Style badges (same as item)

pages/_catalogue.css
└── Grid layouts only

pages/_home.css
├── .product-card animations (page-specific)
└── Grid layouts only

pages/_room.css
└── Grid layouts only
```

**Total**: ~222 lines of card styling (no duplicates)

---

## Key Principle

**"Define once, use everywhere"**

The only difference between item and set cards is:
- Item cards: `aspect-ratio: 1 / 1;`
- Set cards: `aspect-ratio: 4 / 3;`

Everything else is identical!
