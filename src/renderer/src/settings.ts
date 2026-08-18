export type ThemePreference = 'system' | 'light' | 'dark';
export type FontPreference = 'system' | 'inter' | 'space' | 'mono';
export type FontSizePreference = 'small' | 'medium' | 'large';
export type AppearancePreferences = { theme: ThemePreference; font: FontPreference; fontSize: FontSizePreference };
export const defaultAppearance: AppearancePreferences = { theme: 'system', font: 'system', fontSize: 'medium' };
