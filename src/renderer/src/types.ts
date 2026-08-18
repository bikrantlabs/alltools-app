export type ToolCategory = 'pdf' | 'image' | 'document' | 'audio' | 'video' | 'archive' | 'developer' | 'other';
export type ToolStatus = 'installed' | 'available' | 'planned' | 'incompatible' | 'failed' | 'unavailable';

export type Tool = {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: string;
  installed: boolean;
  status: ToolStatus;
  favorite?: boolean;
  recent?: boolean;
  installing?: boolean;
};

export type PluginProgress = { id: string; value: number; message: string };
export type FileInput = { path: string; name: string };
export type FileOutput = { id: string; sourceName: string; path: string; mimeType: string; sizeBytes: number };

export type AllToolsApi = {
  catalog: { list: () => Promise<{ plugins?: Array<{ id: string; name: string; description: string; installed?: boolean; status?: ToolStatus; favorite?: boolean; recent?: boolean; ui?: { category?: ToolCategory; icon?: string } }> }> };
  plugins: {
    install: (id: string) => Promise<{ status: 'installed' | 'failed' | 'unavailable'; error?: string }>;
    onProgress: (listener: (update: PluginProgress) => void) => () => void;
    run: (pluginId: string, files: FileInput[], options?: Record<string, unknown>) => Promise<{ outputs: FileOutput[] }>;
    onRunProgress: (listener: (update: PluginProgress) => void) => () => void;
  };
  pdfToText: {
    extract: (files: FileInput[]) => Promise<{ outputs: FileOutput[] }>;
    onProgress: (listener: (update: { value: number; message: string }) => void) => () => void;
  };
  files: { save: (output: FileOutput) => Promise<boolean>; saveAll: (outputs: FileOutput[]) => Promise<boolean> };
};

declare global {
  interface Window { alltools: AllToolsApi; }
}

export {};
