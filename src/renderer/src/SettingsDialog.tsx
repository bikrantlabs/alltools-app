import type { JSX } from 'react';
import type { AppearancePreferences, FontPreference, FontSizePreference, ThemePreference } from './settings';

export type SettingsDialogProps = { open: boolean; appearance: AppearancePreferences; onChange: (next: Partial<AppearancePreferences>) => void; onClose: () => void };

const fontOptions: Array<{ id: FontPreference; label: string; sample: string }> = [
  { id: 'system', label: 'System Sans', sample: 'Native and familiar' },
  { id: 'inter', label: 'Inter', sample: 'Neutral and precise' },
  { id: 'space', label: 'Space Grotesk', sample: 'Distinct and editorial' },
  { id: 'mono', label: 'IBM Plex Mono', sample: 'Technical and compact' }
];
const themeOptions: Array<{ id: ThemePreference; label: string; detail: string }> = [
  { id: 'system', label: 'System', detail: 'Follow your operating system' },
  { id: 'dark', label: 'Dark', detail: 'Low-light workspace' },
  { id: 'light', label: 'Light', detail: 'Bright workspace' }
];
const sizeOptions: Array<{ id: FontSizePreference; label: string; detail: string }> = [
  { id: 'small', label: 'Small', detail: 'More content on screen' },
  { id: 'medium', label: 'Medium', detail: 'Recommended' },
  { id: 'large', label: 'Large', detail: 'More comfortable reading' }
];

export default function SettingsDialog({ open, appearance, onChange, onClose }: SettingsDialogProps): JSX.Element | null {
  if (!open) return null;
  return <div className="settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header className="settings-header"><div><p className="overline">ALLTOOLS / PREFERENCES</p><h2 id="settings-title">Settings</h2></div><button className="settings-close" onClick={onClose} aria-label="Close settings">×</button></header>
      <div className="settings-body">
        <aside className="settings-nav"><p className="settings-nav-label">SETTINGS</p><button className="settings-nav-item active"><span className="settings-nav-icon">◒</span><span>Appearance</span></button><button className="settings-nav-item disabled"><span className="settings-nav-icon">⌁</span><span>General</span><small>Later</small></button><button className="settings-nav-item disabled"><span className="settings-nav-icon">◈</span><span>Plugins</span><small>Later</small></button></aside>
        <div className="settings-content"><div className="settings-section-heading"><p className="overline">APPEARANCE</p><h3>Make AllTools feel like yours.</h3><p>These preferences apply across the catalog and every tool workspace.</p></div>
          <div className="settings-control"><div><strong>Theme</strong><span>Choose how the workspace should look.</span></div><div className="choice-grid theme-grid">{themeOptions.map((option) => <button key={option.id} className={`choice-card ${appearance.theme === option.id ? 'selected' : ''}`} onClick={() => onChange({ theme: option.id })}><span className="choice-radio" /><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>)}</div></div>
          <div className="settings-control"><div><strong>Font family</strong><span>Select the voice of the interface.</span></div><div className="font-grid">{fontOptions.map((option) => <button key={option.id} className={`font-card font-${option.id} ${appearance.font === option.id ? 'selected' : ''}`} onClick={() => onChange({ font: option.id })}><span className="choice-radio" /><span><strong>{option.label}</strong><small>{option.sample}</small></span></button>)}</div></div>
          <div className="settings-control"><div><strong>Font size</strong><span>Adjust the reading scale of the workspace.</span></div><div className="choice-grid size-grid">{sizeOptions.map((option) => <button key={option.id} className={`choice-card ${appearance.fontSize === option.id ? 'selected' : ''}`} onClick={() => onChange({ fontSize: option.id })}><span className={`size-preview size-${option.id}`}>Aa</span><span><strong>{option.label}</strong><small>{option.detail}</small></span></button>)}</div></div>
        </div>
      </div>
      <footer className="settings-footer"><span>Changes save automatically on this device.</span><button className="primary-button" onClick={onClose}>Done <span>↵</span></button></footer>
    </section>
  </div>;
}
