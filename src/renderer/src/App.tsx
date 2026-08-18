import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX } from 'react';
import type { FileInput, FileOutput, PluginProgress, Tool, ToolCategory, ToolStatus } from './types';
import SettingsDialog from './SettingsDialog';
import { defaultAppearance, type AppearancePreferences, type FontPreference, type FontSizePreference, type ThemePreference } from './settings';
import './styles.css';

type LocalFile = File & { path: string };

const fallbackTools: Tool[] = [{ id: 'pdf-to-text', name: 'PDF to Text', description: 'Turn one or more PDFs into plain text files.', category: 'pdf', icon: 'PDF', installed: true, status: 'installed' }];
const categoryNames: Record<ToolCategory, string> = { pdf: 'PDF', image: 'Image', document: 'Document', audio: 'Audio', video: 'Video', archive: 'Archive', developer: 'Developer', other: 'Other' };
const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tif', '.tiff'];

function normalizeTools(catalog: Awaited<ReturnType<typeof window.alltools.catalog.list>>): Tool[] {
  if (!catalog.plugins?.length) return fallbackTools;
  return catalog.plugins.map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    category: plugin.ui?.category ?? 'other',
    icon: plugin.ui?.icon ?? (plugin.ui?.category === 'pdf' ? 'PDF' : plugin.ui?.category === 'image' ? 'IMG' : 'DOC'),
    installed: plugin.id === 'pdf-to-text' || Boolean(plugin.installed) || plugin.status === 'installed',
    status: plugin.id === 'pdf-to-text' ? 'installed' : plugin.status ?? (plugin.installed ? 'installed' : 'available'),
    favorite: Boolean(plugin.favorite),
    recent: Boolean(plugin.recent)
  }));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAppearance(): AppearancePreferences {
  try { return { ...defaultAppearance, ...JSON.parse(localStorage.getItem('alltools-appearance') ?? '{}') }; } catch { return defaultAppearance; }
}
function useAppearance(): [AppearancePreferences, (next: Partial<AppearancePreferences>) => void] {
  const [appearance, setAppearance] = useState<AppearancePreferences>(readAppearance);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true);
  const resolvedTheme = appearance.theme === 'system' ? (systemDark ? 'dark' : 'light') : appearance.theme;
  useEffect(() => { document.documentElement.dataset.theme = resolvedTheme; document.documentElement.dataset.font = appearance.font; document.documentElement.dataset.fontSize = appearance.fontSize; localStorage.setItem('alltools-appearance', JSON.stringify(appearance)); }, [appearance, resolvedTheme]);
  useEffect(() => { const media = window.matchMedia?.('(prefers-color-scheme: dark)'); if (!media) return; const listener = () => setSystemDark(media.matches); media.addEventListener('change', listener); return () => media.removeEventListener('change', listener); }, []);
  return [appearance, (next) => setAppearance((current) => ({ ...current, ...next }))];
}

function Sidebar({ activeTool, onNavigate, theme, onToggleTheme, onOpenSettings }: { activeTool: string | null; onNavigate: (route: string) => void; theme: 'dark' | 'light'; onToggleTheme: () => void; onOpenSettings: () => void }): JSX.Element {
  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark">A</span><span>AllTools</span><span className="brand-index">01</span></div>
    <div className="sidebar-rule" /><div className="sidebar-label">INDEX</div>
    <nav className="nav-list">
      <button className={`nav-item ${!activeTool ? 'active' : ''}`} onClick={() => onNavigate('')}><span className="nav-code">01</span><span>All tools</span></button>
      <button className={`nav-item ${activeTool === 'pdf-to-text' ? 'active' : ''}`} onClick={() => onNavigate('pdf-to-text')}><span className="nav-code">P1</span><span>PDF to Text</span></button>
      <button className={`nav-item ${activeTool === 'pdf-merge' ? 'active' : ''}`} onClick={() => onNavigate('pdf-merge')}><span className="nav-code">P2</span><span>Merge PDFs</span></button>
      <button className={`nav-item ${activeTool === 'image-convert' ? 'active' : ''}`} onClick={() => onNavigate('image-convert')}><span className="nav-code">I1</span><span>Convert Images</span></button>
    </nav>
    <div className="sidebar-bottom"><div className="local-mark"><span className="local-led" /><div><strong>LOCAL MODE</strong><small>Nothing leaves this machine.</small></div></div><button id="theme-toggle" className="theme-toggle" onClick={onToggleTheme}><span className="theme-symbol">{theme === 'dark' ? '☼' : '◐'}</span><span>{theme === 'dark' ? 'Use light mode' : 'Use dark mode'}</span><span className="theme-key">⌘T</span></button><button className="settings-launch" onClick={onOpenSettings}><span className="settings-launch-icon">⚙</span><span>Settings</span><span className="theme-key">⌘,</span></button><div className="sidebar-version">ALLTOOLS / 0.2 · REACT</div></div>
  </aside>;
}

function FileQueue({ files, kind, onRemove }: { files: LocalFile[]; kind: 'pdf' | 'image'; onRemove: (index: number) => void }): JSX.Element {
  return <div className="file-list">{files.map((file, index) => <div className="file-row" key={`${file.name}-${file.size}-${index}`}><div className="file-type">{kind === 'pdf' ? String(index + 1).padStart(2, '0') : 'IMG'}</div><div className="file-info"><span className="file-name">{file.name}</span><span className="file-size">{formatBytes(file.size)} · {kind === 'pdf' ? `merge position ${index + 1}` : 'ready for conversion'}</span></div><button className="remove-file" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>×</button></div>)}</div>;
}

function Dropzone({ kind, onFiles }: { kind: 'pdf' | 'image'; onFiles: (files: FileList | File[]) => void }): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const accept = kind === 'pdf' ? 'application/pdf,.pdf' : 'image/png,image/jpeg,image/webp,image/bmp,image/tiff';
  return <section className="dropzone" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drag-over'); if (event.dataTransfer.files) onFiles(event.dataTransfer.files); }}>
    <div className="drop-axis"><span /><span /><span /></div><div className="drop-mark"><span>+</span><small>{kind === 'pdf' ? 'PDF' : 'IMG'}</small></div><div className="drop-copy"><p className="overline">01 / INTAKE</p><h2>{kind === 'pdf' ? 'Place source files here.' : 'Place source images here.'}</h2><p>{kind === 'pdf' ? 'Drop PDFs into the tray, or choose them from your device.' : 'Drop images into the tray, then choose an output format.'}</p></div><button className="choose-button" onClick={() => inputRef.current?.click()}>Choose files</button><input ref={inputRef} type="file" accept={accept} multiple hidden onChange={(event) => { if (event.target.files) onFiles(event.target.files); event.currentTarget.value = ''; }} /><span className="drop-corner top-left">A</span><span className="drop-corner bottom-right">01</span>
  </section>;
}

function ProgressPanel({ progress, label }: { progress: PluginProgress; label: string }): JSX.Element {
  const percentage = Math.round(progress.value * 100);
  return <section className="progress-panel"><p className="overline">03 / PROCESS</p><div className="progress-heading"><strong>{progress.message || label}</strong><span>{percentage}%</span></div><div className="process-graphic"><div className="process-track"><i /><i /><i /></div><div className="process-head" /></div><div className="progress-track"><div className="progress-bar" style={{ transform: `scaleX(${progress.value})` }} /></div><p className="progress-note">Files remain on this device while the local plugin works.</p></section>;
}

function Results({ outputs, onSave, onSaveAll }: { outputs: FileOutput[]; onSave: (output: FileOutput) => void; onSaveAll: () => void }): JSX.Element | null {
  if (!outputs.length) return null;
  return <section className="file-panel results-panel"><div className="panel-heading"><div><p className="overline">04 / OUTPUT</p><h2>Results ready</h2></div><button className="primary-button" onClick={onSaveAll}>Download all <span>↓</span></button></div><div className="file-list">{outputs.map((output) => <div className="file-row result-row" key={output.id}><div className="file-type">OUT</div><div className="file-info"><span className="file-name">{output.path.split(/[\\/]/).pop() ?? output.sourceName}</span><span className="file-size">{formatBytes(output.sizeBytes)} · from {output.sourceName}</span></div><button className="download-button" onClick={() => onSave(output)}>Download</button></div>)}</div></section>;
}

function ToolStudio({ toolId, onBack }: { toolId: string; onBack: () => void }): JSX.Element {
  const isText = toolId === 'pdf-to-text';
  const isImage = toolId === 'image-convert';
  const kind: 'pdf' | 'image' = isImage ? 'image' : 'pdf';
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [outputs, setOutputs] = useState<FileOutput[]>([]);
  const [progress, setProgress] = useState<PluginProgress>({ id: toolId, value: 0, message: 'Preparing…' });
  const [running, setRunning] = useState(false);
  const [format, setFormat] = useState('png');
  const validFile = (file: File): file is LocalFile => 'path' in file && (kind === 'pdf' ? file.name.toLowerCase().endsWith('.pdf') : imageExtensions.some((extension) => file.name.toLowerCase().endsWith(extension)));
  const addFiles = (incoming: FileList | File[]) => { const existing = new Set(files.map((file) => `${file.name}:${file.size}`)); const accepted = Array.from(incoming).filter(validFile).filter((file) => !existing.has(`${file.name}:${file.size}`)); setFiles((current) => [...current, ...accepted]); };
  useEffect(() => { const remove = isText ? window.alltools.pdfToText.onProgress((update) => setProgress({ id: toolId, ...update })) : window.alltools.plugins.onRunProgress(setProgress); return remove; }, [isText, toolId]);
  const run = async () => { if (!files.length || (!isText && kind === 'pdf' && files.length < 2)) { setProgress({ id: toolId, value: 0, message: isText ? 'Select at least one PDF.' : 'Select at least two PDFs.' }); return; } setRunning(true); setOutputs([]); setProgress({ id: toolId, value: 0.02, message: 'Preparing local plugin…' }); try { const inputs: FileInput[] = files.map((file) => ({ path: file.path, name: file.name })); const result = isText ? await window.alltools.pdfToText.extract(inputs) : await window.alltools.plugins.run(toolId, inputs, isImage ? { format } : {}); setOutputs(result.outputs); setProgress({ id: toolId, value: 1, message: 'Complete' }); } catch (error) { setProgress({ id: toolId, value: 0, message: error instanceof Error ? error.message : 'The plugin job failed.' }); } finally { setRunning(false); } };
  const title = isText ? 'PDF to Text' : toolId === 'pdf-merge' ? 'Merge PDFs' : 'Convert Images';
  const description = isText ? 'Turn one or more PDFs into plain text files.' : toolId === 'pdf-merge' ? 'Combine multiple PDF files into one ordered document.' : 'Convert image files between common formats completely offline.';
  return <main className="main-content tool-page-main"><header className="workspace-header"><button className="back-button" onClick={onBack}><span className="back-arrow">←</span>Back to tools</button><div className="tool-identity"><div className="identity-topline"><p className="overline">{kind.toUpperCase()} / FILE STUDIO</p><span className="route-chip">/tools/{toolId}</span></div><h1>{title}</h1><p>{description}</p></div><div className="header-actions"><div className="workspace-status"><i /> LOCAL ONLY</div><span className="page-index">TOOL / {isText ? '01' : toolId === 'pdf-merge' ? '02' : 'I1'}</span></div></header><Dropzone kind={kind} onFiles={addFiles} />{files.length > 0 && <section className="studio-grid"><section className="file-panel"><div className="panel-heading"><div><p className="overline">02 / QUEUE</p><h2>{isText ? 'Source files' : kind === 'pdf' ? 'PDFs in merge order' : 'Images to convert'}</h2></div><span className="count-badge">{files.length}</span></div><FileQueue files={files} kind={kind} onRemove={(index) => setFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))} />{isImage && <div className="options-panel"><label htmlFor="format-select">Convert to</label><select id="format-select" value={format} onChange={(event) => setFormat(event.target.value)}><option value="png">PNG</option><option value="jpg">JPEG</option><option value="webp">WebP</option><option value="bmp">BMP</option><option value="tiff">TIFF</option></select></div>}<div className="workspace-actions"><button className="secondary-button" onClick={() => { setFiles([]); setOutputs([]); }}>Clear queue</button><button className="primary-button" disabled={running || (!isText && kind === 'pdf' && files.length < 2)} onClick={() => void run()}>{running ? 'Working…' : isText ? 'Extract text' : kind === 'pdf' ? 'Merge PDFs' : 'Convert images'} <span>↗</span></button></div></section>{running && <ProgressPanel progress={progress} label="Working locally…" />}</section>}{!running && progress.value > 0 && <ProgressPanel progress={progress} label="Complete" />}<Results outputs={outputs} onSave={(output) => void window.alltools.files.save(output)} onSaveAll={() => void window.alltools.files.saveAll(outputs)} /><footer className="tool-footer-note"><span>{isText ? 'PDF → TXT' : kind === 'pdf' ? 'PDF → PDF' : 'IMG → IMG'}</span><span>NO CLOUD / NO UPLOAD</span><span>ALLTOOLS LOCAL PLUGIN</span></footer></main>;
}

function Catalog({ tools, onInstall, onReinstall, onOpen }: { tools: Tool[]; onInstall: (tool: Tool) => void; onReinstall: (tool: Tool) => void; onOpen: (id: string) => void }): JSX.Element {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ToolCategory | null>(null);
  const visible = useMemo(() => tools.filter((tool) => (!query || `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase())) && (!category || tool.category === category)), [tools, query, category]);
  return <main className="main-content"><header className="topbar"><div><p className="overline">ALLTOOLS / WORKBENCH</p><h1>Tools that stay <span>here.</span></h1></div><div className="topbar-meta"><span>LOCAL DEVICE</span><span>v0.2</span></div></header><section className="catalog-header"><div><p className="overline">CATALOG / {category ? categoryNames[category].toUpperCase() : 'ALL'}</p><div className="title-line"><h2>Available utilities</h2><span className="count-badge">{visible.length}</span></div></div><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tools" /><kbd>⌘K</kbd></label></section><div className="category-tabs"><button className={!category ? 'active' : ''} onClick={() => setCategory(null)}>All</button>{(['pdf', 'image', 'document', 'archive', 'developer'] as ToolCategory[]).map((item) => <button key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{categoryNames[item]}</button>)}</div><section className="tool-grid">{visible.map((tool) => <article className="tool-card" key={tool.id}><div className="tool-head"><div className={`tool-icon ${tool.category}`}>{tool.icon}</div><button className="tool-action">☆</button></div><h3>{tool.name}</h3><p>{tool.description}</p><div className="tool-footer"><span className={`tool-status ${tool.status}`}>{tool.status === 'installed' ? 'Ready offline' : tool.status === 'planned' ? 'Planned for a later wave' : tool.status === 'incompatible' ? 'Not compatible' : tool.status === 'failed' ? 'Install failed' : tool.status === 'unavailable' ? 'Unavailable in workspace' : 'Available to download'}</span>{tool.installed ? <div className="tool-actions"><button className="download-button" onClick={() => onOpen(tool.id)}>Open tool</button><button className="reinstall-button" disabled={tool.installing} onClick={() => onReinstall(tool)}>{tool.installing ? 'Repairing…' : 'Reinstall'}</button></div> : tool.status === 'available' ? <button className="download-button" disabled={tool.installing} onClick={() => onInstall(tool)}>{tool.installing ? 'Installing…' : 'Download'}</button> : null}</div></article>)}</section></main>;
}

export default function App(): JSX.Element {
  const [appearance, updateAppearance] = useAppearance();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\/?/, ''));
  const theme: 'dark' | 'light' = appearance.theme === 'light' ? 'light' : appearance.theme === 'dark' ? 'dark' : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const toggleTheme = () => updateAppearance({ theme: theme === 'dark' ? 'light' : 'dark' });
  const [tools, setTools] = useState<Tool[]>(fallbackTools);
  useEffect(() => { const onHash = () => setRoute(window.location.hash.replace(/^#\/?/, '')); window.addEventListener('hashchange', onHash); return () => window.removeEventListener('hashchange', onHash); }, []);
  useEffect(() => { void window.alltools.catalog.list().then((catalog) => setTools(normalizeTools(catalog))).catch(() => setTools(fallbackTools)); }, []);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key === ',') { event.preventDefault(); setSettingsOpen(true); } if (event.key === 'Escape') setSettingsOpen(false); }; document.addEventListener('keydown', listener); return () => document.removeEventListener('keydown', listener); }, []);
  const navigate = (next: string) => { window.location.hash = next ? `/${next}` : ''; setRoute(next); };
  const install = async (tool: Tool, reinstall = false) => { setTools((current) => current.map((item) => item.id === tool.id ? { ...item, installing: true } : item)); const state = await window.alltools.plugins.install(tool.id, reinstall); setTools((current) => current.map((item) => item.id === tool.id ? { ...item, installing: false, status: state.status as ToolStatus, installed: state.status === 'installed' } : item)); };
  const reinstall = (tool: Tool) => { if (window.confirm(`Reinstall ${tool.name}? The current local environment will be replaced only after the new environment is ready.`)) void install(tool, true); };
  const activeTool = route && ['pdf-to-text', 'pdf-merge', 'image-convert'].includes(route) ? route : null;
  return <div className="app-shell"><Sidebar activeTool={activeTool} onNavigate={navigate} theme={theme} onToggleTheme={toggleTheme} onOpenSettings={() => setSettingsOpen(true)} />{activeTool ? <ToolStudio toolId={activeTool} onBack={() => navigate('')} /> : <Catalog tools={tools} onInstall={install} onReinstall={reinstall} onOpen={navigate} />}<SettingsDialog open={settingsOpen} appearance={appearance} onChange={updateAppearance} onClose={() => setSettingsOpen(false)} /></div>;
}
