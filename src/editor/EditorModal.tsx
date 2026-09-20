import { useCallback, useEffect, useRef, useState } from 'react';
import ImageEditor from '@unlayer/react-image-editor';
import type { ImageEditorRef, ImageEditorSaveResult } from '@unlayer/react-image-editor';
import type { ToolsConfig } from './toolConfigs';
import { COPY } from '../config/copy';
import { PALETTE } from '../config/theme';
import { downloadDataUrl } from '../utils/canvas';
import './EditorModal.css';

const ALL_TOOL_KEYS = ['crop', 'resize', 'filter', 'draw', 'text', 'shapes', 'stickers', 'frame'] as const;
type ToolKey = (typeof ALL_TOOL_KEYS)[number];

type ToolState = Record<ToolKey, boolean>;

function toolsConfigToState(config: ToolsConfig): ToolState {
  const state: ToolState = {
    crop: true, resize: true, filter: true, draw: true,
    text: true, shapes: true, stickers: true, frame: true,
  };
  for (const key of ALL_TOOL_KEYS) {
    const val = config[key];
    if (val === false) state[key] = false;
    else if (typeof val === 'object' && val.enabled === false) state[key] = false;
  }
  return state;
}

function stateToToolsConfig(state: ToolState): ToolsConfig {
  const config: ToolsConfig = {};
  for (const key of ALL_TOOL_KEYS) {
    config[key] = state[key];
  }
  return config;
}

interface EditorModalProps {
  title: string;
  image: string;
  tools: ToolsConfig;
  onSave: (result: ImageEditorSaveResult) => void;
  onCancel: () => void;
}

export function EditorModal({ title, image, tools, onSave, onCancel }: EditorModalProps) {
  const editorRef = useRef<ImageEditorRef>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevBodyOverflow = useRef('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(true);

  const [currentImage, setCurrentImage] = useState(image);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [locale, setLocale] = useState('en');
  const [dockPosition, setDockPosition] = useState<'right' | 'left'>('right');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mountKey, setMountKey] = useState(0);
  const [toolState, setToolState] = useState<ToolState>(() => toolsConfigToState(tools));
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    prevBodyOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow.current;
    };
  }, []);

  useEffect(() => {
    if (!statusMsg) return;
    const t = setTimeout(() => setStatusMsg(null), 2500);
    return () => clearTimeout(t);
  }, [statusMsg]);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message || COPY.editorError);
    setLoading(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setMounted(false);
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const handleSave = useCallback(
    (result: ImageEditorSaveResult) => {
      onSave(result);
    },
    [onSave],
  );

  const captureAndRemount = useCallback(() => {
    const latest = editorRef.current?.editor?.getImage();
    if (latest) setCurrentImage(latest);
    setLoading(true);
    setMountKey((k) => k + 1);
  }, []);

  const handleChangeImage = useCallback(() => {
    setCurrentImage(image);
    editorRef.current?.editor?.reset(image);
    setStatusMsg('Image reset to original');
  }, [image]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setCurrentImage(result);
      editorRef.current?.editor?.reset(result);
      setStatusMsg('Custom image loaded');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handleHasChanges = useCallback(() => {
    const changed = editorRef.current?.editor?.hasChanges() ?? false;
    setStatusMsg(changed ? 'Unsaved changes: Yes' : 'No unsaved changes');
  }, []);

  const handleSnapshot = useCallback(() => {
    const snap = editorRef.current?.editor?.getImage();
    if (snap) {
      downloadDataUrl(snap, `snapshot-${Date.now()}.png`);
      setStatusMsg('Snapshot downloaded');
    } else {
      setStatusMsg('No image to snapshot');
    }
  }, []);

  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    editorRef.current?.editor?.updateOptions({ theme: newTheme });
  }, []);

  const handleLocaleChange = useCallback((newLocale: string) => {
    setLocale(newLocale);
    editorRef.current?.editor?.updateOptions({ locale: newLocale as 'en' });
  }, []);

  const handleDockChange = useCallback((pos: 'right' | 'left') => {
    setDockPosition(pos);
    captureAndRemount();
  }, [captureAndRemount]);

  const handleToolToggle = useCallback((key: ToolKey) => {
    setToolState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
    captureAndRemount();
  }, [captureAndRemount]);

  const activeToolsConfig = stateToToolsConfig(toolState);

  return (
    <div className={`editor-modal-overlay theme-${theme}`} role="dialog" aria-label={title}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="editor-file-input"
        onChange={handleFileChange}
        tabIndex={-1}
      />

      <div className={`editor-modal-container dock-${dockPosition}`}>
        {/* Left Sidebar */}
        <aside className={`editor-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
          <div className="editor-sidebar-header">
            <button
              className="editor-sidebar-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              type="button"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              &#9776;
            </button>
            {sidebarOpen && <span className="editor-sidebar-title">React Image Editor</span>}
          </div>

          {sidebarOpen && (
            <div className="editor-sidebar-content">
              {/* Status message */}
              {statusMsg && (
                <div className="sidebar-status">{statusMsg}</div>
              )}

              {/* ACTIONS */}
              <div className="sidebar-group">
                <span className="sidebar-group-title">ACTIONS</span>
                <button className="sidebar-btn" onClick={handleChangeImage} type="button">
                  Reset image
                </button>
                <button className="sidebar-btn" onClick={handleUploadClick} type="button">
                  Upload image...
                </button>
                <button className="sidebar-btn" onClick={handleHasChanges} type="button">
                  Has changes?
                </button>
                <button className="sidebar-btn" onClick={handleSnapshot} type="button">
                  Snapshot
                </button>
              </div>

              {/* OPTIONS (LIVE) */}
              <div className="sidebar-group">
                <span className="sidebar-group-title">OPTIONS (LIVE)</span>
                <label className="sidebar-field">
                  <span>Theme</span>
                  <select
                    value={theme}
                    onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </label>
                <label className="sidebar-field">
                  <span>Locale</span>
                  <select
                    value={locale}
                    onChange={(e) => handleLocaleChange(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="ja">Japanese</option>
                  </select>
                </label>
              </div>

              {/* DOCK (REMOUNTS) */}
              <div className="sidebar-group">
                <span className="sidebar-group-title">DOCK (REMOUNTS EDITOR)</span>
                <label className="sidebar-field">
                  <span>Toolbar position</span>
                  <select
                    value={dockPosition}
                    onChange={(e) => handleDockChange(e.target.value as 'right' | 'left')}
                  >
                    <option value="right">Right</option>
                    <option value="left">Left</option>
                  </select>
                </label>
              </div>

              {/* TOOLS (REMOUNTS) */}
              <div className="sidebar-group">
                <span className="sidebar-group-title">TOOLS (REMOUNTS EDITOR)</span>
                <div className="sidebar-checkbox-grid">
                  {ALL_TOOL_KEYS.map((key) => (
                    <label key={key} className="sidebar-checkbox">
                      <input
                        type="checkbox"
                        checked={toolState[key]}
                        onChange={() => handleToolToggle(key)}
                      />
                      <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main Editor */}
        <main className="editor-main-content">
          <div className="editor-top-nav">
            <span className="editor-task-label">{title}</span>
            <div className="editor-nav-actions">
              <button
                className="editor-zen-toggle"
                onClick={() => setSidebarOpen((v) => !v)}
                type="button"
                title={sidebarOpen ? 'Expand canvas (hide controls)' : 'Show controls'}
              >
                {sidebarOpen ? '⛶' : '≡'}
              </button>
              <button
                className="editor-modal-cancel"
                onClick={onCancel}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="editor-frame-wrapper">
            {loading && !error && (
              <div className="editor-modal-loading">
                <div className="editor-modal-spinner" />
                <p>{COPY.editorLoading}</p>
              </div>
            )}
            {error && (
              <div className="editor-modal-error">
                <p>{COPY.editorError}</p>
                <p style={{ fontSize: '0.85em', color: PALETTE.textDim }}>{error}</p>
                <button
                  className="btn btn-primary"
                  onClick={handleRetry}
                  type="button"
                >
                  {COPY.editorRetry}
                </button>
              </div>
            )}
            {mounted && !error && (
              <ImageEditor
                key={mountKey}
                ref={editorRef}
                image={currentImage}
                options={{
                  theme,
                  locale: locale as 'en',
                  features: {
                    imageEditor: {
                      tools: activeToolsConfig,
                    },
                  },
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  flex: 1,
                  display: loading ? 'none' : 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
                minHeight="100%"
                onLoad={handleLoad}
                onSave={handleSave}
                onCancel={onCancel}
                onError={handleError}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
