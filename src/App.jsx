import { useState, useEffect, useRef } from 'react';
import { 
  Search, Settings, Plus, X, UploadCloud, Copy, Edit2, 
  ExternalLink, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, Sparkles, FileText
} from 'lucide-react';

// --- Auto-Detection & Storage Config ---
const STORAGE_KEY = 'web-tools';
const BRANCH = 'main';

const getAutoConfig = () => {
  let owner = '';
  let repo = STORAGE_KEY; // [NOTE]: Intentionally kept same for easier management
  
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.endsWith('.github.io')) {
    owner = hostname.split('.')[0];
  }
  
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0 && !pathSegments[0].includes(':')) {
    repo = pathSegments[0];
  }
  
  return { owner, repo };
};

export default function App() {
  // --- State Management ---
  const [tools, setTools] = useState([]);
  
  // Lazy initialize to prevent parsing window.location on every render
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      console.log("No config found in storage, falling back to auto-detect.");
    }
    return getAutoConfig();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeModal, setActiveModal] = useState(null);
  const [previewTool, setPreviewTool] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  // --- Initialization ---
  useEffect(() => {
    fetch('./tools.json')
      .then(res => {
        if (!res.ok) throw new Error('No tools.json found');
        return res.json();
      })
      .then(data => setTools(data))
      .catch(() => setTools([])); 
  }, []);

  // --- Extract Unique Tags for Suggestions ---
  const allTags = [...new Set(tools.flatMap(t => t.tags || []))].sort();

  // --- Strict Word-Boundary Filtering ---
  const filteredTools = tools.filter(tool => {
    const tokens = searchQuery.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    
    return tokens.every(token => {
      // Escape token for regex safety, then apply \b (word boundary)
      const safeToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${safeToken}`, 'i'); 
      
      const nameMatch = regex.test(tool.name);
      const tagMatch = (tool.tags || []).some(tag => regex.test(tag));
      return nameMatch || tagMatch;
    });
  });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type }), 4000);
  };

  const copyToClipboard = (e, slug) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname.replace('index.html', '')}tools/${slug}/index.html`;
    const el = document.createElement('textarea');
    el.value = url;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast('Tool link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header className="bg-gray-900 text-white sticky top-0 z-30 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Tools Dashboard</h1>
              <p className="text-xs text-gray-400 font-medium">Serverless Utilities Workspace</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setActiveModal('settings')} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-semibold rounded-lg transition-colors border border-gray-700">
              <Settings size={16} className="text-gray-300" />
              Settings
            </button>
            <button onClick={() => setActiveModal('publish')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-md">
              <Plus size={16} />
              Publish Tool
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 border-t border-gray-700 p-3">
          <div className="container mx-auto px-4">
            <div className="relative max-w-2xl mx-auto">
              <Search size={20} className="text-gray-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                list="search-suggestions"
                placeholder="Search tools, tags, or keywords..." 
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-400 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* Native Autocomplete Suggestions */}
              <datalist id="search-suggestions">
                {tools.map(t => <option key={`name-${t.id}`} value={t.name} />)}
                {allTags.map(tag => <option key={`tag-${tag}`} value={tag} />)}
              </datalist>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-10">
        {filteredTools.length > 0 ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTools.map(tool => (
              <div 
                key={tool.id} 
                onClick={() => { setPreviewTool(tool); setActiveModal('preview'); }}
                className="group block bg-white border border-gray-200 rounded-xl p-5 cursor-pointer relative hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-100 hover:border-blue-300 transition-all duration-300"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 flex gap-1 z-20">
                  <button onClick={(e) => { e.stopPropagation(); setActiveModal({ type: 'publish', tool }); }} className="p-2 bg-white/90 hover:bg-gray-100 rounded-lg text-gray-500 shadow-sm border border-gray-100 transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => copyToClipboard(e, tool.id)} className="p-2 bg-white/90 hover:bg-gray-100 rounded-lg text-gray-500 shadow-sm border border-gray-100 transition-colors" title="Copy Link">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-bold text-xl transition-all duration-300 ${tool.avatar?.bg || 'bg-blue-50'} ${tool.avatar?.text || 'text-blue-600'} group-hover:bg-blue-600 group-hover:text-white`}>
                    {tool.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-800 transition-colors duration-300 group-hover:text-blue-600 line-clamp-1">{tool.name}</h2>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2 leading-relaxed">{tool.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-700">No tools found</h3>
            <p className="text-gray-500 mt-2">Publish your first tool or adjust your search keywords.</p>
          </div>
        )}
      </main>

      <footer className="bg-gray-900 text-gray-400 text-center py-6 border-t border-gray-800 mt-auto">
        <p className="text-sm">&copy; {new Date().getFullYear()} Tools Dashboard. All rights reserved.</p>
      </footer>

      {activeModal === 'settings' && (
        <SettingsModal 
          config={config} 
          onClose={() => setActiveModal(null)} 
          onSave={(c) => { 
            setConfig(c); 
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ owner: c.owner, repo: c.repo })); 
            setActiveModal(null); 
            showToast('Settings Saved'); 
          }} 
        />
      )}
      {(activeModal === 'publish' || activeModal?.type === 'publish') && (
        <PublishModal 
          config={config} 
          existingTools={tools}
          editTool={activeModal?.tool}
          onClose={() => setActiveModal(null)} 
          onSuccess={(msg, updatedTools) => { 
            setActiveModal(null); 
            if (updatedTools) setTools(updatedTools); // Optimistic UI update
            showToast(msg); 
          }}
          showToast={showToast}
        />
      )}
      {activeModal === 'preview' && previewTool && (
        <PreviewPane tool={previewTool} onClose={() => setActiveModal(null)} />
      )}

      <div className={`fixed top-6 left-1/2 -translate-x-1/2 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 z-[110] ${toast.show ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-8 opacity-0 scale-95'} ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
        {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} className="text-green-400" />}
        <span className="font-medium text-sm">{toast.msg}</span>
      </div>
    </div>
  );
}

function SettingsModal({ config, onClose, onSave }) {
  const [localConfig, setLocalConfig] = useState({ owner: config.owner, repo: config.repo });
  
  return (
    <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Target Repository</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">GitHub Owner</label>
            <input type="text" value={localConfig.owner} onChange={e => setLocalConfig({...localConfig, owner: e.target.value})} placeholder="github-user" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Repository Name</label>
            <input type="text" value={localConfig.repo} onChange={e => setLocalConfig({...localConfig, repo: e.target.value})} placeholder="web-tools" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={() => onSave(localConfig)} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Settings</button>
        </div>
      </div>
    </div>
  );
}

function PublishModal({ config, existingTools, editTool, onClose, onSuccess, showToast }) {
  const isEdit = !!editTool;
  
  const [formData, setFormData] = useState({
    name: editTool?.name || '',
    desc: editTool?.description || '',
    tags: editTool?.tags || [],
    commitMsg: '',
    pat: ''
  });
  
  const [tagInput, setTagInput] = useState('');
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ active: false, msg: '', isError: false });
  const [showPat, setShowPat] = useState(false);
  const [entryPointPrompt, setEntryPointPrompt] = useState(null);
  
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleAutoCommit = () => {
    if (!formData.name) {
      showToast("Please provide a Name first.", "error");
      return;
    }
    
    const prefix = isEdit ? 'fix: update tool' : 'feat: publish';
    setFormData(prev => ({ ...prev, commitMsg: `${prefix} ${formData.name}` }));
  };

  const processTags = (input) => {
    if (!input) return;
    const newTags = input.split(/[\s,]+/)
      .map(t => t.replace(/[^a-zA-Z0-9-]/g, '').trim())
      .filter(Boolean);
    if (newTags.length > 0) {
      setFormData(p => {
        const combined = [...p.tags, ...newTags];
        return { ...p, tags: [...new Set(combined)] };
      });
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      processTags(tagInput);
    }
  };

  const handleTagPaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    processTags(tagInput + ' ' + pastedText);
  };

  const removeTag = (tagToRemove) => {
    setFormData(p => ({ ...p, tags: p.tags.filter(t => t !== tagToRemove) }));
  };

  const processExtractedFiles = (extractedFiles) => {
    if (extractedFiles.length === 0) return;

    // 1. Flatten ONLY IF everything shares a single root folder
    const firstPathParts = extractedFiles[0].path.split('/');
    if (firstPathParts.length > 1) {
      const baseFolder = firstPathParts[0] + '/';
      const allShareBase = extractedFiles.every(f => f.path.startsWith(baseFolder));
      if (allShareBase) {
        extractedFiles.forEach(f => {
          f.path = f.path.substring(baseFolder.length);
        });
      }
    }

    // 2. 100MB Total Upload Size Check
    const totalSize = extractedFiles.reduce((acc, f) => acc + (f.file.size || 0), 0);
    if (totalSize > 100 * 1024 * 1024) {
      showToast("Total upload size exceeds the 100MB limit.", "error");
      return;
    }

    // 3. Strict Entry Point Resolution & Staging
    const rootHtmlFiles = extractedFiles.filter(f => !f.path.includes('/') && f.path.toLowerCase().endsWith('.html'));
    const hasIndex = extractedFiles.some(f => !f.path.includes('/') && (f.path.toLowerCase() === 'index.html' || f.path.toLowerCase() === 'index.htm'));

    if (!hasIndex) {
      if (rootHtmlFiles.length === 1) {
        const targetFile = extractedFiles.find(f => f.path === rootHtmlFiles[0].path);
        const oldName = targetFile.path;
        targetFile.path = 'index.html';
        setFiles(extractedFiles);
        showToast(`Auto-renamed ${oldName} to index.html`, "success");
        return;
      } else if (rootHtmlFiles.length > 1) {
        setEntryPointPrompt({ files: extractedFiles, htmls: rootHtmlFiles.map(f => f.path) });
        return;
      } else {
        showToast("Tool must include a root HTML file. Check for double-nested folders.", "error");
        return;
      }
    }

    setFiles(extractedFiles);
  };

  const selectEntryPoint = (path) => {
    const extractedFiles = entryPointPrompt.files;
    const targetFile = extractedFiles.find(f => f.path === path);
    const oldName = targetFile.path;
    targetFile.path = 'index.html';
    setFiles(extractedFiles);
    setEntryPointPrompt(null);
    showToast(`Auto-renamed ${oldName} to index.html`, "success");
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    if (files.length > 0) return; // Ignore drops if files are already staged

    const items = e.dataTransfer?.items;
    if (!items) return;
    
    // Strict Validation: Ensure ZIPs are completely isolated
    let zipCount = 0;
    let otherCount = 0;

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        if (entry.isFile && entry.name.endsWith('.zip')) zipCount++;
        else otherCount++;
      }
    }

    if (zipCount > 1) return showToast("Multiple ZIPs not allowed. Drop a single ZIP.", "error");
    if (zipCount === 1 && otherCount > 0) return showToast("Cannot mix ZIP archives with folders or individual files.", "error");

    setStatus({ active: true, msg: "Indexing files...", isError: false });
    let extractedFiles = [];
    
    const processEntry = async (entry) => {
      if (entry.isFile) {
        const file = await new Promise(res => entry.file(res));
        if (file.name.endsWith('.zip')) {
          await processZip(file, extractedFiles);
        } else {
          extractedFiles.push({ path: entry.fullPath.replace(/^\//, ''), file });
        }
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise((resolve) => {
          let allEntries = [];
          const readNext = () => {
            dirReader.readEntries(res => {
              if (res.length) {
                allEntries = allEntries.concat(res);
                readNext();
              } else {
                resolve(allEntries);
              }
            });
          };
          readNext();
        });
        for (let ent of entries) await processEntry(ent);
      }
    };

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry();
      if (item) entries.push(item);
    }

    for (const entry of entries) {
      await processEntry(entry);
    }
    
    setStatus({ active: false, msg: "", isError: false });
    processExtractedFiles(extractedFiles);
  };

  const handleFileInput = async (e) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    
    // Strict Validation: Ensure ZIPs are isolated
    let zipCount = 0;
    let otherCount = 0;
    for (let i = 0; i < selected.length; i++) {
      if (selected[i].name.endsWith('.zip')) zipCount++;
      else otherCount++;
    }

    if (zipCount > 1) {
      e.target.value = '';
      return showToast("Multiple ZIPs not allowed. Select a single ZIP.", "error");
    }
    if (zipCount === 1 && otherCount > 0) {
      e.target.value = '';
      return showToast("Cannot mix ZIP archives with individual files.", "error");
    }

    setStatus({ active: true, msg: "Indexing files...", isError: false });
    let extractedFiles = [];
    
    for (let f of selected) {
      if (f.name.endsWith('.zip')) {
        await processZip(f, extractedFiles);
      } else {
        extractedFiles.push({ path: f.webkitRelativePath || f.name, file: f });
      }
    }
    
    e.target.value = '';
    setStatus({ active: false, msg: "", isError: false });
    processExtractedFiles(extractedFiles);
  };

  const processZip = async (file, fileArray) => {
    let JSZipModule;
    try {
      JSZipModule = (await import('jszip')).default;
    } catch {
      const loadJSZip = () => new Promise((resolve, reject) => {
        if (window.JSZip) return resolve(window.JSZip);
        if (document.getElementById('jszip-script')) {
          const check = setInterval(() => {
            if (window.JSZip) {
              clearInterval(check);
              resolve(window.JSZip);
            }
          }, 100);
          return;
        }
        const script = document.createElement('script');
        script.id = 'jszip-script';
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => resolve(window.JSZip);
        script.onerror = reject;
        document.head.appendChild(script);
      });
      JSZipModule = await loadJSZip();
    }

    const zip = await JSZipModule.loadAsync(file);
    for (const [path, zipEntry] of Object.entries(zip.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async("blob");
        fileArray.push({ path, file: content });
      }
    }
  };

  const ghFetch = async (endpoint, options = {}) => {
    const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${endpoint}`, {
      ...options,
      headers: { 
        'Authorization': `token ${formData.pat}`, 
        'Accept': 'application/vnd.github.v3+json', 
        'Content-Type': 'application/json' 
      }
    });
    if (!res.ok) throw new Error(`GitHub API Error: ${res.statusText}`);
    return res.json();
  };

  const syncToGitHub = async (isDelete = false) => {
    // Return with active: false to ensure action buttons are not locked during simple validation errors
    if (!formData.pat) return setStatus({ active: false, msg: "GitHub PAT required.", isError: true });
    if (!isDelete && !formData.name) return setStatus({ active: false, msg: "Tool Name required.", isError: true });
    if (!isEdit && !isDelete && files.length === 0) return setStatus({ active: false, msg: "Files required for new tools.", isError: true });

    const slug = isEdit || isDelete ? editTool.id : formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    if (!isEdit && !isDelete && existingTools.some(t => t.id === slug)) {
      return setStatus({ active: false, msg: "A tool with this name already exists. Please choose a unique name.", isError: true });
    }

    try {
      setStatus({ active: true, msg: "Authenticating session...", isError: false });
      
      const refData = await ghFetch(`/git/refs/heads/${BRANCH}`);
      const commitSha = refData.object.sha;
      const commitData = await ghFetch(`/git/commits/${commitSha}`);
      const baseTreeSha = commitData.tree.sha;

      const treeItems = [];

      if (!isDelete && files.length > 0) {
        setStatus({ active: true, msg: `Uploading ${files.length} tool files...`, isError: false });
        for (const sf of files) {
          const reader = new FileReader();
          const contentBase64 = await new Promise(res => {
            reader.onloadend = () => res(reader.result.split(',')[1]);
            reader.readAsDataURL(sf.file);
          });
          const blobData = await ghFetch(`/git/blobs`, { method: 'POST', body: JSON.stringify({ content: contentBase64, encoding: 'base64' }) });
          
          treeItems.push({ path: `public/tools/${slug}/${sf.path}`, mode: '100644', type: 'blob', sha: blobData.sha });
        }
      }

      setStatus({ active: true, msg: "Updating tools.json...", isError: false });
      let updatedTools = [...existingTools];
      
      if (isDelete) {
        updatedTools = updatedTools.filter(t => t.id !== slug);
      } else {
        const newToolEntry = {
          id: slug,
          name: formData.name,
          description: formData.desc,
          tags: formData.tags,
          url: `./tools/${slug}/index.html`,
          avatar: isEdit ? editTool.avatar : {
            bg: ['bg-blue-50', 'bg-indigo-50', 'bg-emerald-50'][Math.floor(Math.random() * 3)],
            text: ['text-blue-600', 'text-indigo-600', 'text-emerald-600'][Math.floor(Math.random() * 3)]
          }
        };
        
        if (isEdit) {
          const idx = updatedTools.findIndex(t => t.id === slug);
          if (idx !== -1) updatedTools[idx] = newToolEntry;
        } else {
          updatedTools.push(newToolEntry);
        }
      }

      const toolsJsonBlob = await ghFetch(`/git/blobs`, { method: 'POST', body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(JSON.stringify(updatedTools, null, 2)))), encoding: 'base64' }) });
      treeItems.push({ path: 'public/tools.json', mode: '100644', type: 'blob', sha: toolsJsonBlob.sha });

      setStatus({ active: true, msg: "Committing to repository...", isError: false });
      const newTree = await ghFetch(`/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }) });
      
      let finalMsg = formData.commitMsg;
      if (!finalMsg) {
         finalMsg = isDelete ? `rm: Remove ${editTool.name}` : (isEdit ? `chore: update ${formData.name}` : `feat: publish ${formData.name}`);
      }

      const newCommit = await ghFetch(`/git/commits`, { method: 'POST', body: JSON.stringify({ message: finalMsg, tree: newTree.sha, parents: [commitSha] }) });
      await ghFetch(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) });

      onSuccess(isDelete ? "Tool removed! Live site will update in ~2 mins." : "Tool published! Live site will update in ~2 mins.", updatedTools);
    } catch (err) {
      // active: false ensures action buttons unlock when an error occurs
      setStatus({ active: false, msg: err.message, isError: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto no-scrollbar relative">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Tool' : 'Publish New Tool'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tool Name</label>
            <input type="text" disabled={isEdit} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.replace(/[^a-zA-Z0-9 \-_]/g, '')})} placeholder="JSON Formatter" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 outline-none disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea rows="2" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} placeholder="Explain what this tool does..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tags (Space or Comma to add)</label>
            <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 transition-shadow">
              {formData.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input 
                type="text" 
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                name="prevent-autofill-tags"
                value={tagInput}
                onChange={e => setTagInput(e.target.value.replace(/[^a-zA-Z0-9\s,-]/g, ''))}
                onKeyDown={handleTagKeyDown}
                onPaste={handleTagPaste}
                onBlur={() => processTags(tagInput)}
                placeholder={formData.tags.length === 0 ? "e.g. Image, PDF, Developer" : ""}
                className="flex-grow min-w-[100px] bg-transparent outline-none text-sm p-1" 
              />
            </div>
          </div>
          
          <div 
            onDragOver={e => { if (files.length === 0) { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); } }}
            onDragLeave={e => e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed border-gray-300 rounded-xl p-6 text-center transition-colors ${files.length > 0 ? 'bg-gray-50 cursor-default' : 'hover:bg-gray-100'}`}
          >
            {files.length > 0 ? (
              <div className="w-full text-left">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Staged Files ({files.length})</p>
                  <button type="button" onClick={() => setFiles([])} className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-wider flex items-center gap-1">
                    <X size={12} /> Clear & Reselect
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {files.map((sf, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm overflow-hidden">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                        <FileText size={16} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 truncate" title={sf.path}>{sf.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center cursor-pointer" onClick={() => fileInputRef.current.click()}>
                <UploadCloud size={32} className="text-blue-600 mb-2 mx-auto" />
                <p className="text-sm font-semibold text-gray-800 mb-3">
                  {isEdit ? 'Drop the full tool folder/zip to re-upload' : 'Drag & drop a folder, zip, or files here'}
                </p>
                <div className="flex gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
                  <button type="button" onClick={() => fileInputRef.current.click()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded shadow-sm hover:bg-gray-50 transition-colors">Browse Files</button>
                  <button type="button" onClick={() => folderInputRef.current.click()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded shadow-sm hover:bg-gray-50 transition-colors">Browse Folder</button>
                </div>
              </div>
            )}
            
            <input type="file" ref={fileInputRef} onChange={handleFileInput} className="hidden" multiple />
            <input type="file" ref={folderInputRef} onChange={handleFileInput} className="hidden" multiple webkitdirectory="true" />
          </div>

          <div className="pt-4 border-t border-gray-200 space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Commit Message</label>
              <div className="relative">
                <textarea 
                  rows="3"
                  value={formData.commitMsg} 
                  onChange={e => setFormData({...formData, commitMsg: e.target.value})} 
                  placeholder="feat: publish JSON Formatter" 
                  className="w-full p-3 pr-10 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono resize-none" 
                />
                <button 
                  type="button"
                  onClick={handleAutoCommit}
                  title="Auto Generate Commit Message"
                  className="absolute right-3 top-3 text-blue-400 hover:text-blue-600 focus:outline-none"
                >
                  <Sparkles size={18} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">GitHub PAT (Session Auth)</label>
              <div className="relative">
                {/* Honeypot to intercept Google Credential Manager Username Autofill */}
                <input type="text" name="honeypot_username" autoComplete="username" tabIndex={-1} className="absolute w-0 h-0 opacity-0 overflow-hidden" aria-hidden="true" />
                
                <input 
                  type={showPat ? "text" : "password"} 
                  name="pat_password"
                  autoComplete="current-password"
                  value={formData.pat} 
                  onChange={e => setFormData({...formData, pat: e.target.value})} 
                  placeholder="Required to sync" 
                  className="w-full p-3 pr-10 bg-blue-50 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" 
                />
                <button 
                  type="button"
                  title={showPat ? "Hide PAT" : "Show PAT"}
                  onClick={() => setShowPat(!showPat)}
                  className="absolute right-3 top-3 text-blue-400 hover:text-blue-600 focus:outline-none"
                >
                  {showPat ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {(status.active || status.msg) && (
            <div className={`rounded-lg p-3 flex items-center gap-3 ${status.isError ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {status.active && !status.isError && <Loader2 size={18} className="animate-spin" />}
              <p className="text-sm font-semibold">{status.msg}</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3">
          {isEdit ? (
            <button onClick={() => syncToGitHub(true)} disabled={status.active} className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg border border-red-100 disabled:opacity-50">
              Delete Tool
            </button>
          ) : <div></div>}
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onClose} disabled={status.active} className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Cancel</button>
            <button onClick={() => syncToGitHub()} disabled={status.active} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              Confirm & Sync
            </button>
          </div>
        </div>

        {/* --- Entry Point Selection Modal --- */}
        {entryPointPrompt && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-[60] flex items-center justify-center p-6 rounded-2xl animate-in fade-in duration-200">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-100 max-w-sm w-full text-center">
              <FileText size={40} className="text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Select Entry Point</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                We couldn't find an <strong>index.html</strong> file in the root. Please select the main HTML file to serve as the entry point:
              </p>
              <div className="space-y-2 mb-8 max-h-40 overflow-y-auto">
                {entryPointPrompt.htmls.map(path => (
                  <button 
                    key={path}
                    onClick={() => selectEntryPoint(path)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg text-sm font-medium text-gray-700 hover:text-blue-700 transition-colors truncate"
                  >
                    {path}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setEntryPointPrompt(null)} 
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function PreviewPane({ tool, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-right-full duration-300">
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 text-white shadow-xl relative z-10">
        
        <button onClick={onClose} className="px-3 py-1.5 hover:bg-gray-800 rounded-lg flex items-center gap-2 text-sm font-semibold text-gray-300 transition-colors">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        
        <div className="hidden md:flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div>
          <h3 className="text-[0.95rem] font-semibold text-gray-100 tracking-wide line-clamp-1">
            {tool.name}
          </h3>
        </div>
        
        <a href={tool.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-2">
          Open Fullscreen <ExternalLink size={14} />
        </a>
        
      </div>
      <div className="flex-grow bg-white w-full h-full relative">
        <iframe src={tool.url} className="absolute inset-0 w-full h-full border-none" title={tool.name} />
      </div>
    </div>
  );
}
