import React, { useState, useEffect } from 'react';
import { Folder, FolderUp, X, Check, Loader2 } from 'lucide-react';

export default function FolderPickerModal({ isOpen, onClose, onSelect, initialPath = '' }) {
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [parentPath, setParentPath] = useState(null);
  const [dirs, setDirs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDirectory = async (pathQuery) => {
    setLoading(true);
    setError('');
    try {
      const url = pathQuery 
        ? `http://localhost:3030/api/agent/browse?path=${encodeURIComponent(pathQuery)}`
        : 'http://localhost:3030/api/agent/browse';
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === 'success') {
        setCurrentPath(data.currentPath);
        setParentPath(data.parentPath);
        setDirs(data.dirs || []);
      } else {
        setError(data.message || 'Failed to read directory.');
      }
    } catch (err) {
      setError(`Agent unreachable: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDirectory(currentPath || initialPath);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{
        width: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        overflow: 'hidden',
        border: '1px solid var(--primary)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}>Select Target Folder</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Directory Path Bar */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <button
            onClick={() => parentPath && fetchDirectory(parentPath)}
            disabled={!parentPath || loading}
            className="btn btn-secondary"
            style={{ padding: '6px', minWidth: 'auto', display: 'flex', alignItems: 'center' }}
            title="Go Up"
          >
            <FolderUp size={16} />
          </button>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flexGrow: 1
          }}>
            {currentPath}
          </div>
        </div>

        {/* Directory Contents */}
        <div style={{
          flexGrow: 1,
          overflowY: 'auto',
          padding: '10px 20px',
          minHeight: '250px',
          maxHeight: '400px'
        }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '10px' }}>
              <Loader2 className="spin" size={20} />
              <span>Loading folders...</span>
            </div>
          ) : error ? (
            <div style={{ color: 'var(--danger)', padding: '20px 0', textAlign: 'center', fontSize: '13px' }}>
              {error}
            </div>
          ) : dirs.length === 0 ? (
            <div style={{ color: 'var(--text-secondary)', padding: '40px 0', textAlign: 'center', fontSize: '13px' }}>
              No directories found in this folder.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {dirs.map((dir, index) => (
                <div
                  key={index}
                  onClick={() => fetchDirectory(`${currentPath}/${dir}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    fontSize: '13px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Folder size={16} style={{ color: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>{dir}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
          <button 
            className="btn" 
            onClick={() => onSelect(currentPath)}
            disabled={loading}
            style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} /> Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
