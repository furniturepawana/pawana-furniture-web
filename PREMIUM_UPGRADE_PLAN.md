# Premium Design System Upgrade Plan

## Overview
Transform the Pawana Furniture site to match the sleek, premium feel of the site.html prototype.

---

## 🎨 **Key Changes Needed**

### 1. **Typography System**
**Current:** Mixed fonts
**Target:**
- Headings: Playfair Display (elegant serif)
- Body: Lato or similar clean sans-serif
- Letter-spacing on uppercase text (1.5px - 2px)
- Lighter font weights (300-400 for body, 600 for headings)

### 2. **Color Palette Refinement**
**Current:** Warm browns/tans
**Target:**
- Keep warm browns but simplify
- Add clean cream/off-white (#fdfbf7)
- Optional gold accent for premium touch
- Dark charcoal for text (#1a1a1a)

### 3. **Product Cards**
**Current:** Borders, backgrounds
**Target:**
- NO borders
- Clean light gray background for image area only (#f0f0f0)
- Image hover: scale(1.05)
- Slide-up interaction on hover (optional "Add to Cart" or quick view)
- Generous spacing between cards (3rem gap)

### 4. **Transitions & Animations**
**Current:** Basic transitions
**Target:**
- Smooth cubic-bezier: `cubic-bezier(0.165, 0.84, 0.44, 1)`
- Duration: 0.4s-0.8s
- Scroll-triggered fade-ins using Intersection Observer
- Hero content fade-up animation

### 5. **Navigation**
**Current:** Centered with gaps
**Target:**
- Cleaner underline hover effect (width: 0 → 100%)
- Uppercase with letter-spacing
- Scrolled state: backdrop-filter blur + subtle shadow
- Lighter, more minimal

### 6. **Spacing & Layout**
**Current:** Varied
**Target:**
- Section padding: 4rem-6rem vertical
- Card gaps: 3rem
- Generous whitespace
- Max-width containers (1200px)

### 7. **Hero Section**
**Current:** Gradient overlay
**Target:**
- Lighter overlay (rgba(0,0,0,0.2))
- Animated content (fade-up on load)
- Clean button with border-only style
- Large, elegant typography

### 8. **Buttons**
**Current:** Solid fills
**Target:**
- Border-only style (1px solid)
- Uppercase, letter-spacing (2px)
- Hover: fill background
- Padding: 1rem 2.5rem

---

## 📋 **Implementation Checklist**

### Phase 1: Foundation
- [ ] Update `_variables.css` with new color palette
- [ ] Add Playfair Display + Lato fonts
- [ ] Update transition timing functions
- [ ] Refine spacing scale

### Phase 2: Components
- [ ] Redesign product cards (remove borders, add image backgrounds)
- [ ] Update buttons to border-only style
- [ ] Enhance navigation hover effects
- [ ] Add style badges with cleaner design

### Phase 3: Layout & Pages
- [ ] Update hero section (lighter overlay, animations)
- [ ] Refine home page spacing
- [ ] Update catalogue grid (larger gaps)
- [ ] Enhance item/set detail pages

### Phase 4: Interactions
- [ ] Add scroll-triggered animations
- [ ] Implement smooth image hover effects
- [ ] Add header scroll state
- [ ] Optional: slide-up card interactions

---

## 🎯 **Priority Elements**

1. **Product Cards** - Most visible, biggest impact
2. **Typography** - Sets the tone
3. **Spacing** - Creates breathing room
4. **Transitions** - Makes it feel smooth
5. **Hero Section** - First impression

---

## 💡 **Design Principles from site.html**

1. **Less is More**: Minimal borders, clean backgrounds
2. **Smooth Motion**: Everything transitions elegantly
3. **Generous Space**: Don't crowd elements
4. **Typography Hierarchy**: Clear, elegant font choices
5. **Subtle Interactions**: Hover effects that delight
6. **Premium Feel**: Quality over quantity

---

Ready to implement?
