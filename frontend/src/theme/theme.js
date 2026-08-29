import { useContext, createContext } from 'react';

export const theme = {
  colors: {
    background: '#050505',
    surface: '#0a0a0a',
    accent: '#FFC400',
    accentSoft: '#FFD700',
    primary: '#FFC400',
    text: '#F5F5F5',
    textSecondary: '#A6A6A6',
    textMuted: '#888888',
    success: '#3DDC97',
    danger: '#FF6B6B',
    warning: '#FFA500',
    info: '#4ECDC4',
    card: '#121212',
    cardDark: '#0f0f0f',
    border: '#292929',
    overlay: 'rgba(5, 5, 5, 0.8)',
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
};

const ThemeContext = createContext(theme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context || theme;
};

export default theme;
