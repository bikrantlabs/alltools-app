const fallbackTools = [
  { id: 'pdf-to-text', name: 'PDF to Text', description: 'Extract readable text from PDF files locally.', category: 'pdf', icon: 'PDF', installed: false },
  { id: 'pdf-merge-split', name: 'Merge & Split PDFs', description: 'Combine or separate PDF pages with simple controls.', category: 'pdf', icon: 'PDF', installed: false },
  { id: 'image-converter', name: 'Image Converter', description: 'Convert, resize, and optimize common image formats.', category: 'image', icon: 'IMG', installed: false },
  { id: 'background-remover', name: 'Background Remover', description: 'Remove image backgrounds with an optional local model.', category: 'image', icon: 'AI', installed: false },
  { id: 'document-converter', name: 'Document Converter', description: 'Convert everyday documents without sending them online.', category: 'document', icon: 'DOC', installed: false }
];

let tools = fallbackTools;
let activeView = 'all';
let activeCategory = null;
let query = '';

const grid = document.querySelector('#tool-grid');
const count = document.querySelector('#tool-count');
const title = document.querySelector('#view-title');
const search = document.querySelector('#search-input');

function normalizedCatalog(catalog) {
  if (!catalog || !Array.isArray(catalog.plugins) || catalog.plugins.length === 0) return fallbackTools;
  return catalog.plugins.map((plugin) => ({
    id: plugin.id,
    name: plugin.name,
    description: plugin.description,
    category: plugin.ui?.category || 'other',
    icon: plugin.ui?.category === 'pdf' ? 'PDF' : plugin.ui?.category === 'image' ? 'IMG' : 'DOC',
    installed: Boolean(plugin.installed)
  }));
}

function getVisibleTools() {
  return tools.filter((tool) => {
    const matchesQuery = !query || `${tool.name} ${tool.description}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !activeCategory || tool.category === activeCategory;
    if (activeView === 'favorites') return matchesQuery && matchesCategory && tool.favorite;
    if (activeView === 'recent') return matchesQuery && matchesCategory && tool.recent;
    return matchesQuery && matchesCategory;
  });
}

function render() {
  const visible = getVisibleTools();
  title.textContent = activeCategory ? `${activeCategory[0].toUpperCase()}${activeCategory.slice(1)} tools` : activeView === 'all' ? 'All tools' : activeView[0].toUpperCase() + activeView.slice(1);
  count.textContent = visible.length;
  grid.innerHTML = visible.length ? visible.map((tool) => `
    <article class="tool-card">
      <div class="tool-head"><div class="tool-icon ${tool.category}">${tool.icon}</div><button class="tool-action" aria-label="Add ${tool.name} to favorites" data-favorite="${tool.id}">${tool.favorite ? '★' : '☆'}</button></div>
      <h3>${tool.name}</h3><p>${tool.description}</p>
      <div class="tool-footer"><span class="tool-status">${tool.installed ? 'Ready offline' : 'Available to download'}</span>${tool.installed ? '<button class="download-button">Open tool</button>' : '<button class="download-button" data-download="' + tool.id + '">Download</button>'}</div>
    </article>
  `).join('') : '<div class="empty-state">No tools match this view yet.</div>';

  document.querySelectorAll('[data-favorite]').forEach((button) => button.addEventListener('click', () => {
    const tool = tools.find((item) => item.id === button.dataset.favorite);
    if (tool) tool.favorite = !tool.favorite;
    render();
  }));
  document.querySelectorAll('[data-download]').forEach((button) => button.addEventListener('click', () => {
    button.textContent = 'Coming next';
    button.disabled = true;
  }));
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view], [data-category]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  activeView = button.dataset.view;
  activeCategory = null;
  render();
}));

document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-view], [data-category]').forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  activeView = 'all';
  activeCategory = button.dataset.category;
  render();
}));

search.addEventListener('input', (event) => { query = event.target.value; render(); });

(async () => {
  try { tools = normalizedCatalog(await window.alltools.catalog.list()); } catch { tools = fallbackTools; }
  render();
})();
