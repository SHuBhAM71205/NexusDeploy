import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Folder, HardDrive, CornerLeftUp, Check, ChevronRight } from 'lucide-react';
import { agentApi, BrowseResult } from '../../services/agentApi';

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPath: (path: string) => void;
  initialPath?: string;
}

export function FolderPickerModal({
  isOpen,
  onClose,
  onSelectPath,
  initialPath,
}: FolderPickerModalProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || 'C:/');
  const [browseData, setBrowseData] = useState<BrowseResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectory = async (path?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await agentApi.browse(path);
      setBrowseData(res);
      if (res.currentPath) {
        setCurrentPath(res.currentPath);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to list host directory contents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(initialPath);
    }
  }, [isOpen, initialPath]);

  const handleSelect = () => {
    onSelectPath(currentPath);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Workspace Host Folder"
      description="Navigate local host drives and select project root folder for live deployment."
      size="lg"
    >
      <div className="space-y-4">
        {/* Drive Selector */}
        {browseData?.drives && browseData.drives.length > 0 && (
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <HardDrive size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Host Drives:</span>
            <div className="flex gap-1.5 overflow-x-auto">
              {browseData.drives.map((drive) => (
                <button
                  key={drive}
                  type="button"
                  onClick={() => fetchDirectory(drive)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono font-semibold transition ${
                    currentPath.toLowerCase().startsWith(drive.toLowerCase())
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {drive}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Path Breadcrumbs */}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950 font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto">
          {browseData?.parentPath && (
            <button
              type="button"
              onClick={() => fetchDirectory(browseData.parentPath!)}
              className="rounded p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400"
              title="Go Up"
            >
              <CornerLeftUp size={16} />
            </button>
          )}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">Path:</span>
          <span className="truncate">{currentPath}</span>
        </div>

        {/* Directory Explorer Box */}
        <div className="h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900 space-y-1">
          {loading ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400 italic">
              Browsing host filesystem...
            </div>
          ) : error ? (
            <div className="p-4 text-xs text-rose-500 font-semibold">{error}</div>
          ) : !browseData?.items || browseData.items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-xs text-slate-400 italic">
              Empty folder.
            </div>
          ) : (
            browseData.items
              .filter((item) => item.isDirectory)
              .map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => fetchDirectory(item.path)}
                  className="flex w-full items-center justify-between rounded-lg p-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-center gap-2">
                    <Folder size={16} className="text-amber-500 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200">{item.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
              ))
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Click a folder to navigate into it, then click "Select Folder".
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSelect}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              <Check size={14} /> Select Folder
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
