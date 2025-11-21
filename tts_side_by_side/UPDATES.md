# Recent Updates

## New Features Added

### 1. Fine-Tune Parameters Panel
- Added `SettingsPanel.jsx` component with controls for:
  - **Model Selection**: Choose between Flash v2.5, Turbo v2, Turbo v2.5, and Multilingual v2
  - **Stability** (0.0 - 1.0): Control voice consistency vs expressiveness
  - **Similarity Boost** (0.0 - 1.0): How closely to match the reference voice
  - **Style** (0.0 - 1.0): Style exaggeration level
  - **Speed** (0.5 - 2.0): Playback speed multiplier
  - **Speaker Boost** (toggle): Enhance similarity (with higher latency)

All parameters have:
- Real-time value display
- Smooth sliders with Apple-style interaction
- Helpful descriptions and hints

### 2. Side-by-Side Audio Comparison
- Updated `ComparisonView.jsx` to display audio players horizontally
- Visual divider between the two TTS services
- Styled audio player containers with subtle backgrounds
- Empty state with icon when no audio is generated
- Responsive design that stacks vertically on mobile

### 3. Apple-Inspired Design System
Complete visual overhaul with a clean greyscale palette:

**Colors:**
- White backgrounds (#ffffff)
- Light grey surface (#f5f5f7)
- Dark text (#1d1d1f)
- Secondary grey text (#86868b)
- Subtle borders (#d2d2d7)

**Typography:**
- SF Pro Display/Text font stack
- Refined letter spacing (-0.01em to -0.02em)
- Clear hierarchy with 7 font sizes

**Components:**
- Smooth transitions (150-200ms)
- Subtle shadows and hover effects
- Rounded corners (8-16px)
- Minimal, clean aesthetic
- Tactile interactions (hover scale, focus states)

### 4. Enhanced User Experience
- Settings are passed through from SettingsPanel → App → TextInput → API
- Audio players styled to match the overall design
- Improved form elements with better focus states
- Consistent spacing using CSS variables
- Better mobile responsiveness

## Technical Changes

### Component Structure
```
App.jsx
├── AudioUpload
├── SettingsPanel (NEW)
├── TextInput (updated to receive settings)
└── ComparisonView (updated layout)
```

### State Management
- Settings state managed in `App.jsx`
- Settings flow: SettingsPanel → handleSettingsChange → TextInput → API

### API Integration
- Settings are sent to `/api/tts/generate` endpoint
- Backend uses settings for ElevenLabs voice generation

## Files Modified

### New Files:
- `client/src/components/SettingsPanel.jsx`
- `UPDATES.md` (this file)

### Updated Files:
- `client/src/App.jsx` - Added SettingsPanel integration
- `client/src/App.css` - Complete redesign with Apple aesthetic
- `client/src/components/components.css` - New styles for all components
- `client/src/components/ComparisonView.jsx` - Side-by-side layout
- `client/src/components/TextInput.jsx` - Pass settings to API

## Design Tokens

All design values are now centralized in CSS variables:

```css
/* Spacing */
--spacing-xs: 4px
--spacing-sm: 8px
--spacing-md: 16px
--spacing-lg: 24px
--spacing-xl: 32px
--spacing-2xl: 48px

/* Colors */
--color-white: #ffffff
--color-bg: #f5f5f7
--color-surface: #ffffff
--color-border: #d2d2d7
--color-text-primary: #1d1d1f
--color-text-secondary: #86868b

/* Border Radius */
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
```

## Next Steps

To add your second TTS API:
1. Update backend in `server/app/routes/tts.py`
2. Frontend will automatically display the comparison once backend returns data
3. No frontend changes needed - UI is already prepared

## Testing

To test the new features:
1. Upload a reference audio file
2. Adjust the fine-tune parameters
3. Generate audio and see your settings applied
4. Compare the side-by-side audio players

Enjoy the clean, Apple-inspired UI! 🎨
