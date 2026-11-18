/**
 * Luxury Branding Color Palettes & Typographic Tokens
 * Extracted and curated from Reel 1 (Ian Nyakundi / mange.marketing) & Reel 2 (Aryan Choudhary)
 *
 * 1. Coastal Midnight: Cool, modern, and composed. Soft blues + deep navy for quiet elegance.
 * 2. Warm Ember: Bold and grounded. Terracotta + mahogany for handcrafted luxury.
 * 3. Deep Rouge: Dramatic and refined. Ivory + wine tones for heritage and intensity.
 */

export const LUXURY_THEMES = {
  coastalMidnight: {
    id: 'coastal-midnight',
    name: 'Coastal Midnight',
    subtitle: 'Bay of Bengal Maritime & Quiet Elegance',
    swatches: ['#447794', '#2D5B75', '#123249', '#061222'],
    colors: {
      primary: '#447794',
      secondary: '#2D5B75',
      deep: '#123249',
      base: '#061222',
      accentGlow: 'rgba(68, 119, 148, 0.25)',
      cardBg: 'rgba(18, 50, 73, 0.45)',
      border: 'rgba(68, 119, 148, 0.25)',
      textHighlight: '#74B1D6'
    },
    typographicVibe: 'Cetrinn & Hexco (High Luxury Architectural)'
  },
  warmEmber: {
    id: 'warm-ember',
    name: 'Warm Ember',
    subtitle: 'Deccan Canyons, Forts & Handcrafted Luxury',
    swatches: ['#E9B48A', '#956959', '#5C352C', '#2A1713'],
    colors: {
      primary: '#E9B48A',
      secondary: '#956959',
      deep: '#5C352C',
      base: '#190E0B',
      accentGlow: 'rgba(233, 180, 138, 0.22)',
      cardBg: 'rgba(92, 53, 44, 0.40)',
      border: 'rgba(233, 180, 138, 0.22)',
      textHighlight: '#F5CDA8'
    },
    typographicVibe: 'Roba & Cetrinn (Earthy Dynastic Heritage)'
  },
  deepRouge: {
    id: 'deep-rouge',
    name: 'Deep Rouge',
    subtitle: 'Kakatiya & Vijayanagara Royal Dynastic Wine',
    swatches: ['#B67E7D', '#640000', '#420001', '#040B15'],
    colors: {
      primary: '#B67E7D',
      secondary: '#640000',
      deep: '#420001',
      base: '#040B15',
      accentGlow: 'rgba(182, 126, 125, 0.25)',
      cardBg: 'rgba(66, 0, 1, 0.40)',
      border: 'rgba(182, 126, 125, 0.25)',
      textHighlight: '#E0ACAB'
    },
    typographicVibe: 'Share & Cetrinn (Imperial Stencil & Regal Serif)'
  }
};

export function applyTheme(themeKey) {
  const theme = LUXURY_THEMES[themeKey] || LUXURY_THEMES.coastalMidnight;
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.colors.primary);
  root.style.setProperty('--theme-secondary', theme.colors.secondary);
  root.style.setProperty('--theme-deep', theme.colors.deep);
  root.style.setProperty('--theme-base', theme.colors.base);
  root.style.setProperty('--theme-accent-glow', theme.colors.accentGlow);
  root.style.setProperty('--theme-card-bg', theme.colors.cardBg);
  root.style.setProperty('--theme-border', theme.colors.border);
  root.style.setProperty('--theme-text-highlight', theme.colors.textHighlight);
  
  root.setAttribute('data-luxury-theme', theme.id);
  localStorage.setItem('globetrotter_luxury_theme', themeKey);
  return theme;
}

export function getStoredTheme() {
  const saved = localStorage.getItem('globetrotter_luxury_theme');
  return LUXURY_THEMES[saved] || LUXURY_THEMES.coastalMidnight;
}
