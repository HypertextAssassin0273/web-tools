import { useState, useEffect, useRef } from 'react';
import { 
  Search, Settings, Plus, X, UploadCloud, Copy, Edit2, 
  ExternalLink, ArrowLeft, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, Sparkles
} from 'lucide-react';

// --- Auto-Detection & Storage Config ---
const getAutoConfig = () => {
  let owner = '';
  let repo = 'web-tools'; 
  
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.endsWith('.github.io')) {
    owner = hostname.split('.')[0];
  }
  
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments.length > 0 && !pathSegments[0].includes(':')) {
    repo = pathSegments[0];
  }
  
  return { owner, repo, branch: 'main' };
};

const AUTO_CONFIG = getAutoConfig();
const MASTER_STORAGE_KEY = 'web-tools';

export default function App() {
  // --- State Management ---
  const [tools, setTools] = useState([]);
  const [config, setConfig] = useState(() => {
    try {
      const master = JSON.parse(localStorage.getItem(MASTER_STORAGE_KEY) || '{}');
      return master.ghToolsConfig ? master.ghToolsConfig : AUTO_CONFIG;
    } catch {
      return AUTO_CONFIG;
    }
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

  // --- Filtering (AND Logic) ---
  const filteredTools = tools.filter(tool => {
    const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    
    const searchableString = `${tool.name} ${tool.description} ${(tool.tags || []).join(' ')}`.toLowerCase();
    return tokens.every(token => searchableString.includes(token));
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
                placeholder="Search tools, tags, or keywords..." 
                className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-400 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
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
                className="group block bg-white border border-gray-200 rounded-xl p-5 hover:-translate-y-1 hover:shadow-xl hover:border-blue-500 transition-all cursor-pointer relative"
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3 flex gap-1 z-20">
                  <button onClick={(e) => { e.stopPropagation(); setActiveModal({ type: 'publish', tool }); }} className="p-2 bg-white/90 hover:bg-gray-100 rounded-lg text-gray-500 shadow-sm border border-gray-100" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={(e) => copyToClipboard(e, tool.id)} className="p-2 bg-white/90 hover:bg-blue-600 hover:text-white rounded-lg text-gray-500 shadow-sm border border-gray-100" title="Copy Link">
                    <Copy size={16} />
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${tool.avatar?.bg || 'bg-blue-50'} ${tool.avatar?.text || 'text-blue-600'} flex items-center justify-center font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors`}>
                    {tool.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">{tool.name}</h2>
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
            const master = JSON.parse(localStorage.getItem(MASTER_STORAGE_KEY) || '{}');
            master.ghToolsConfig = c;
            localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(master)); 
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
          onSuccess={(msg) => { setActiveModal(null); showToast(msg); setTimeout(() => window.location.reload(), 2000); }}
          showToast={showToast}
        />
      )}
      {activeModal === 'preview' && previewTool && (
        <PreviewPane tool={previewTool} onClose={() => setActiveModal(null)} />
      )}

      <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 transition-transform duration-300 z-50 ${toast.show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'} ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 text-white'}`}>
        {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} className="text-green-400" />}
        <span className="font-medium text-sm">{toast.msg}</span>
      </div>
    </div>
  );
}

function SettingsModal({ config, onClose, onSave }) {
  const [localConfig, setLocalConfig] = useState(config);
  
  return (
    <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Repository Configuration</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Owner</label>
              <input type="text" value={localConfig.owner} onChange={e => setLocalConfig({...localConfig, owner: e.target.value})} placeholder="github-user" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Repo Name</label>
              <input type="text" value={localConfig.repo} onChange={e => setLocalConfig({...localConfig, repo: e.target.value})} placeholder="web-tools" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Source Branch</label>
            <input type="text" value={localConfig.branch} onChange={e => setLocalConfig({...localConfig, branch: e.target.value})} placeholder="main" className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
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
    tags: editTool?.tags?.join(', ') || '',
    commitMsg: '',
    pat: ''
  });
  
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ active: false, msg: '', isError: false });
  const [showPat, setShowPat] = useState(false);
  const fileInputRef = useRef(null);

  const handleAutoCommit = () => {
    if (!formData.name || !formData.desc) {
      showToast("Please provide a Name and Description first.", "error");
      return;
    }
    
    let cleanDesc = formData.desc.replace(/\n+/g, ' — ');
    if (cleanDesc.length > 60) cleanDesc = cleanDesc.substring(0, 60) + '...';
    
    const prefix = isEdit ? (files.length > 0 ? 'fix: update code and metadata for' : 'chore: update metadata for') : 'feat: publish';
    setFormData(prev => ({ ...prev, commitMsg: `${prefix} ${formData.name}\n\n${cleanDesc}` }));
  };

  const handleFileDrop = async (e) => {
    e.preventDefault();
    const items = e.dataTransfer?.items || e.target?.files;
    if (!items) return;
    
    setStatus({ active: true, msg: "Indexing files...", isError: false });
    let extractedFiles = [];
    
    if (e.target?.files) {
      for (let f of e.target.files) {
        if (f.name.endsWith('.zip')) await processZip(f, extractedFiles);
        else extractedFiles.push({ path: f.webkitRelativePath || f.name, file: f });
      }
    } else {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item && item.isFile) {
           const file = await new Promise(res => item.file(res));
           if (file.name.endsWith('.zip')) await processZip(file, extractedFiles);
           else extractedFiles.push({ path: item.fullPath.replace(/^\//, ''), file });
        }
      }
    }
    
    setFiles(extractedFiles);
    setStatus({ active: false, msg: "", isError: false });
  };

  const processZip = async (file, fileArray) => {
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

    const JSZipModule = await loadJSZip();
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

  const pollDeployment = async (liveUrl) => {
    setStatus({ active: true, msg: "Deploying... (This takes 1-2 minutes)", isError: false });
    let retries = 0;
    while (retries < 15) { 
      try {
        const res = await fetch(liveUrl, { cache: 'no-store' });
        if (res.ok) return true;
      } catch { console.log("Deployment not live yet, retrying..."); }
      await new Promise(r => setTimeout(r, 10000));
      retries++;
    }
    throw new Error("Deployment polling timed out, but commit was successful.");
  };

  const syncToGitHub = async (isDelete = false) => {
    if (!formData.pat) return setStatus({ active: true, msg: "GitHub PAT required.", isError: true });
    if (!isDelete && !formData.name) return setStatus({ active: true, msg: "Tool Name required.", isError: true });
    if (!isEdit && !isDelete && files.length === 0) return setStatus({ active: true, msg: "Files required for new tools.", isError: true });

    const slug = isEdit || isDelete ? editTool.id : formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // Slug Collision Check
    if (!isEdit && !isDelete && existingTools.some(t => t.id === slug)) {
      return setStatus({ active: true, msg: "A tool with this name already exists. Please choose a unique name.", isError: true });
    }

    try {
      setStatus({ active: true, msg: "Authenticating session...", isError: false });
      
      const refData = await ghFetch(`/git/ref/heads/${config.branch}`);
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
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
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
      await ghFetch(`/git/refs/heads/${config.branch}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) });

      if (!isDelete) {
        const liveUrl = `https://${config.owner}.github.io/${config.repo}/tools/${slug}/index.html`;
        await pollDeployment(liveUrl);
      }

      onSuccess(isDelete ? "Tool successfully removed!" : "Tool successfully published!");
    } catch (err) {
      setStatus({ active: true, msg: err.message, isError: true });
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Tool' : 'Publish New Tool'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Tool Name</label>
            <input type="text" disabled={isEdit} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="JSON Formatter" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 outline-none disabled:opacity-50" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
            <textarea rows="2" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} placeholder="Explain what this tool does..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"></textarea>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Keywords / Tags (Optional)</label>
            <input type="text" value={formData.tags} onChange={e => setFormData({...formData, tags: e.target.value})} placeholder="CSV format: Image, PDF, Developer" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          
          <div 
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50'); }}
            onDragLeave={e => e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50')}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <UploadCloud size={32} className="text-blue-600 mb-2" />
            <p className="text-sm font-semibold text-gray-800">
              {files.length > 0 ? `${files.length} files staged` : (isEdit ? 'Drop files ONLY to overwrite code' : 'Browse or drop files here')}
            </p>
            <input type="file" ref={fileInputRef} onChange={handleFileDrop} className="hidden" multiple webkitdirectory="true" />
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
                <input 
                  type={showPat ? "text" : "password"} 
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

          {status.active && (
            <div className={`rounded-lg p-3 flex items-center gap-3 ${status.isError ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
              {!status.isError && <Loader2 size={18} className="animate-spin" />}
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
      </div>
    </div>
  );
}

function PreviewPane({ tool, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-right-full duration-300">
      <div className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 text-white shadow-xl relative z-10">
        <button onClick={onClose} className="px-3 py-1.5 hover:bg-gray-800 rounded-lg flex items-center gap-2 text-sm font-bold text-gray-300 transition-colors">
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
        <h3 className="font-bold text-sm hidden md:block tracking-tight">{tool.name}</h3>
        <a href={tool.url} target="_blank" rel="noreferrer" className="px-3 py-1.5 hover:bg-gray-800 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase flex items-center gap-2">
          Open Fullscreen <ExternalLink size={14} />
        </a>
      </div>
      <div className="flex-grow bg-white w-full h-full relative">
        <iframe src={tool.url} className="absolute inset-0 w-full h-full border-none" title={tool.name} />
      </div>
    </div>
  );
}
