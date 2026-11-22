/* ============================
   Blood Bank Admin Dashboard
   script.js
============================ */

// ========== SECTION NAVIGATION ==========
function showSection(sectionId) {
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById('section-' + sectionId);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (navItem) navItem.classList.add('active');

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) closeSidebar();
}

// ========== SIDEBAR TOGGLE ==========
let sidebarOpen = false;

function toggleSidebar() {
  sidebarOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  getOrCreateOverlay().classList.add('show');
  sidebarOpen = true;
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const ov = document.querySelector('.overlay');
  if (ov) ov.classList.remove('show');
  sidebarOpen = false;
}
function getOrCreateOverlay() {
  let ov = document.querySelector('.overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.className = 'overlay';
    ov.onclick = closeSidebar;
    document.body.appendChild(ov);
  }
  return ov;
}

// ========== NOTIFICATION DROPDOWN ==========
function toggleNotifDropdown() {
  const dd = document.getElementById('notifDropdown');
  dd.classList.toggle('open');
}
document.addEventListener('click', (e) => {
  const btn = document.getElementById('notifBtn');
  const dd  = document.getElementById('notifDropdown');
  if (dd && btn && !btn.contains(e.target)) dd.classList.remove('open');
});

// ========== EMERGENCY BANNER ==========
function showEmergencyBanner(text) {
  const banner = document.getElementById('emergencyBanner');
  if (text) document.getElementById('bannerText').textContent = '⚠️ EMERGENCY DETECTED — ' + text;
  banner.classList.remove('hidden');
  document.body.style.paddingTop = banner.offsetHeight + 'px';
}
function dismissBanner() {
  document.getElementById('emergencyBanner').classList.add('hidden');
  document.body.style.paddingTop = '0';
}

// ========== LOGOUT ==========
function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    alert('Logged out successfully. Redirecting to login page...');
  }
}

// ========== FILE UPLOAD HANDLING ==========
let selectedFile = null;

function triggerFileInput() {
  document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) setFile(file);
}

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.add('dragover');
}
function handleDragLeave(e) {
  document.getElementById('dropZone').classList.remove('dragover');
}
function handleDrop(e) {
  e.preventDefault();
  document.getElementById('dropZone').classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) {
    const allowed = ['.txt', '.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      showToast('Invalid file type. Please upload .txt, .pdf, or .docx', 'error');
      return;
    }
    setFile(file);
  }
}

function setFile(file) {
  selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileInfo').classList.remove('hidden');
  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('analyzeBtn').disabled = false;
  hideResults();
}

function removeFile() {
  selectedFile = null;
  document.getElementById('fileInfo').classList.add('hidden');
  document.getElementById('dropZone').style.display = '';
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('fileInput').value = '';
  hideResults();
}

function hideResults() {
  document.getElementById('resultsContent').classList.add('hidden');
  document.getElementById('resultsPlaceholder').classList.remove('hidden');
}

// ========== ARTICLE ANALYSIS ==========
async function analyzeArticle() {
  if (!selectedFile) return;

  // Show loading state
  document.getElementById('analyzeBtn').disabled = true;
  document.getElementById('loadingState').classList.remove('hidden');
  hideResults();

  // Animate progress bar
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress > 90) progress = 90;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressLabel').textContent = Math.round(progress) + '%';
  }, 300);

  try {
    // Read file content for preview
    const fileText = await readFileAsText(selectedFile);

    // Build FormData
    const formData = new FormData();
    formData.append('file', selectedFile);

    // POST to /upload-news
    let responseData;
    try {
      const response = await fetch('/upload-news', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Server error: ' + response.status);
      responseData = await response.json();
    } catch (fetchErr) {
      // Demo mode: simulate a response if backend is not connected
      responseData = simulateAnalysis(fileText, selectedFile.name);
    }

    // Finish progress
    clearInterval(interval);
    document.getElementById('progressBar').style.width = '100%';
    document.getElementById('progressLabel').textContent = '100%';

    await delay(400);
    document.getElementById('loadingState').classList.add('hidden');

    displayResults(responseData, fileText);

  } catch (err) {
    clearInterval(interval);
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('analyzeBtn').disabled = false;
    showToast('Error analyzing article: ' + err.message, 'error');
  }
}

// ========== SIMULATE ANALYSIS (demo mode) ==========
function simulateAnalysis(text, filename) {
  const emergencyKeywords = ['blood shortage', 'emergency', 'critical', 'accident', 'dengue', 'flood',
    'disaster', 'urgent', 'transfusion', 'hemorrhage', 'trauma', 'outbreak', 'fatality', 'hospital'];
  const lowText = (text + ' ' + filename).toLowerCase();
  const matched = emergencyKeywords.filter(kw => lowText.includes(kw));

  const isEmergency = matched.length >= 2 || (matched.length === 1 && Math.random() > 0.4);
  let severity = 'low';
  if (matched.length >= 5) severity = 'high';
  else if (matched.length >= 2) severity = 'medium';
  else if (isEmergency) severity = 'low';

  return {
    emergency_detected: isEmergency,
    severity: isEmergency ? severity : 'none',
    matched_keywords: isEmergency ? (matched.length ? matched : ['urgent', 'blood']) : [],
    article_preview: text.slice(0, 350).trim() + (text.length > 350 ? '...' : ''),
    message: isEmergency
      ? 'Emergency signals detected. Immediate action recommended.'
      : 'No emergency signals detected. Article appears safe.'
  };
}

// ========== DISPLAY RESULTS ==========
function displayResults(data, rawText) {
  const isEmergency = data.emergency_detected;
  const severity    = (data.severity || 'low').toLowerCase();
  const keywords    = data.matched_keywords || [];
  const preview     = data.article_preview || (rawText ? rawText.slice(0, 350) + '...' : 'Preview not available.');

  // Status block
  const statusEl = document.getElementById('resultStatus');
  statusEl.className = 'result-status ' + (isEmergency ? 'emergency' : 'safe');
  document.getElementById('statusIcon').className = isEmergency
    ? 'fas fa-exclamation-triangle'
    : 'fas fa-check-circle';
  document.getElementById('statusTitle').textContent = isEmergency
    ? '⚠️ Emergency Detected'
    : '✅ No Emergency Detected';
  document.getElementById('statusSubtitle').textContent = data.message
    || (isEmergency ? 'Immediate action recommended.' : 'Article is safe — no emergency signals found.');

  // Severity
  const sevBar = document.getElementById('severityBar');
  sevBar.className = 'severity-bar ' + severity;
  const sevLabel = document.getElementById('severityLabel');
  const sevColors = { high: '#c0392b', medium: '#e67e22', low: '#27ae60', none: '#adb5bd' };
  sevLabel.textContent  = severity.toUpperCase();
  sevLabel.style.color  = sevColors[severity] || sevColors.none;

  // Keywords
  const kwContainer = document.getElementById('keywordBadges');
  kwContainer.innerHTML = '';
  if (keywords.length > 0) {
    keywords.forEach((kw, i) => {
      const badge = document.createElement('span');
      badge.className = 'keyword-badge' + (isEmergency ? '' : ' safe');
      badge.textContent = kw;
      badge.style.animationDelay = (i * 0.06) + 's';
      kwContainer.appendChild(badge);
    });
  } else {
    kwContainer.innerHTML = '<span style="font-size:12px;color:var(--gray-400);">No keywords matched</span>';
  }

  // Article preview
  document.getElementById('articlePreview').textContent = preview;

  // Show results
  document.getElementById('resultsPlaceholder').classList.add('hidden');
  document.getElementById('resultsContent').classList.remove('hidden');
  document.getElementById('analyzeBtn').disabled = false;

  // If emergency, show banner and update notification
  if (isEmergency) {
    showEmergencyBanner('Critical signals found in analyzed article. Please review immediately.');
    incrementNotifCount();
    updateAlertsTable({
      id: '#ALT-' + (Math.floor(Math.random() * 900) + 100),
      description: 'Emergency signals in uploaded article',
      source: selectedFile ? selectedFile.name : 'Uploaded File',
      severity: severity,
      status: 'Active'
    });
  }
}

function resetAnalysis() {
  removeFile();
  hideResults();
}

// ========== LIVE NEWS ==========
const mockNewsArticles = [
  {
    title: 'Critical Blood Shortage Hits Metropolitan Hospitals',
    source: 'HealthToday',
    time: '5 min ago',
    snippet: 'Authorities report a severe shortage of O− and A+ blood types across city hospitals following a major accident.',
    url: '#',
    flag: 'emergency'
  },
  {
    title: 'Dengue Surge Leads to Increased Platelet Demand',
    source: 'MedLine India',
    time: '22 min ago',
    snippet: 'Hospitals are urging donors to come forward as dengue cases spike, depleting platelet reserves rapidly.',
    url: '#',
    flag: 'emergency'
  },
  {
    title: 'Blood Donation Camp Organized by City NGO',
    source: 'Community Times',
    time: '1 hr ago',
    snippet: 'A successful donation drive collected over 200 units across three locations in the city today.',
    url: '#',
    flag: 'safe'
  },
  {
    title: 'New Blood Storage Technology Extends Shelf Life',
    source: 'Science Bulletin',
    time: '2 hr ago',
    snippet: 'Researchers announce a breakthrough that extends red blood cell viability by up to 28 additional days.',
    url: '#',
    flag: 'safe'
  },
  {
    title: 'Train Accident Victims Require Immediate Transfusion',
    source: 'National Herald',
    time: '3 hr ago',
    snippet: 'Over 40 individuals from a rail accident are receiving emergency transfusions at district hospitals.',
    url: '#',
    flag: 'emergency'
  },
  {
    title: 'WHO Calls for Global Blood Donation Awareness',
    source: 'WHO Reports',
    time: '5 hr ago',
    snippet: 'World Health Organization emphasizes voluntary donation in its latest bulletin on global blood supply.',
    url: '#',
    flag: 'safe'
  }
];

let activeFilter = 'all';

function setFilter(btn, filter) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = filter;
  const list = document.getElementById('newsList');
  if (list.querySelector('.news-article-item')) renderNews(mockNewsArticles);
}

async function fetchLiveNews() {
  const btn = document.getElementById('liveNewsBtn');
  const loading = document.getElementById('newsLoading');
  const list = document.getElementById('newsList');

  btn.classList.add('loading');
  btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Fetching...';
  btn.disabled = true;
  loading.classList.remove('hidden');
  list.innerHTML = '';

  try {
    let data;

    try {
      const res = await fetch('/check-news');
      if (!res.ok) throw new Error('Backend not connected');
      data = await res.json();
    } catch (err) {
        throw new Error("Backend not connected or API failed");
    }

    loading.classList.add('hidden');

    const processedArticles = (data.articles || []).map(a => {
      const text = (a.title + " " + (a.description || "")).toLowerCase();

      const emergencyKeywords = [
        "major accident", "road accident", "train accident", "crash",
        "earthquake", "flood", "explosion", "fire", "blast",
        "building collapse", "landslide", "cyclone", "storm",
        "injured", "dead", "casualties", "hospitalized",
        "blood required", "urgent blood", "blood shortage",
        "transfusion", "trauma", "emergency ward", "icu",
        "mass casualty", "disaster", "relief camp"
        ];

      const isEmergency = emergencyKeywords.some(k => text.includes(k));

      return {
        title: a.title,
        source: a.source,
        time: "recent",
        snippet: a.description || "No description available",
        url: a.url,
        flag: isEmergency ? "emergency" : "safe"
      };
    });

    // 🚨 NEW ADDITION (IMPORTANT)
    const hasEmergency = processedArticles.some(a => a.flag === "emergency");

    if (hasEmergency) {
      showEmergencyBanner("Global emergency news detected. Blood demand may increase.");
      document.body.classList.add("emergency-active");
    }

    // Existing render (kept same)
    renderNews(processedArticles.length ? processedArticles : mockNewsArticles);

  } catch (err) {
    loading.classList.add('hidden');
    list.innerHTML = `<div class="news-empty"><i class="fas fa-exclamation-circle"></i><p>Failed to fetch news: ${err.message}</p></div>`;
    showToast('Error fetching news', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.innerHTML = '<i class="fas fa-satellite-dish"></i> Check Live News';
    btn.disabled = false;
  }
}

function renderNews(articles) {
  const list = document.getElementById('newsList');
  list.innerHTML = '';

  const filtered = activeFilter === 'all' ? articles : articles.filter(a => {
    if (activeFilter === 'emergency') return a.flag === 'emergency';
    if (activeFilter === 'safe')      return a.flag === 'safe';
    if (activeFilter === 'donation')  return a.title.toLowerCase().includes('donat');
    if (activeFilter === 'shortage')  return a.title.toLowerCase().includes('shortage') || a.snippet.toLowerCase().includes('shortage');
    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="news-empty"><i class="fas fa-filter"></i><p>No articles match this filter</p></div>`;
    return;
  }

  filtered.forEach((article, i) => {
    const div = document.createElement('div');
    div.className = `news-article-item ${article.flag}`;
    div.style.animationDelay = (i * 0.07) + 's';
    div.innerHTML = `
      <div class="news-article-meta">
        <span class="news-source">${escHtml(article.source?.name || article.source)}</span>
        <span class="news-time">${escHtml(article.time)}</span>
        <span class="news-flag ${article.flag}" style="margin-left:auto;">
          ${article.flag === 'emergency' ? '⚠️ Emergency' : '✅ Safe'}
        </span>
      </div>
      <a href="${escHtml(article.url)}" class="news-title" target="_blank">${escHtml(article.title)}</a>
      <p class="news-snippet">${escHtml(article.snippet)}</p>
      <a href="${escHtml(article.url)}" class="news-link" target="_blank">
        Read Full Article <i class="fas fa-external-link-alt"></i>
      </a>
    `;
    list.appendChild(div);
  });

    const hasEmergency = filtered.some(a => a.flag === 'emergency');

    if (hasEmergency) {
    showEmergencyBanner("Live news indicates possible emergency situation.");
    document.body.classList.add("emergency-active");
    }
}

// ========== ALERTS TABLE DYNAMIC UPDATE ==========
function updateAlertsTable(alert) {
  const tbody = document.getElementById('alertsTableBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${escHtml(alert.id)}</td>
    <td>${escHtml(alert.description)}</td>
    <td>${escHtml(alert.source)}</td>
    <td>Just now</td>
    <td><span class="severity-tag ${alert.severity}">${alert.severity.toUpperCase()}</span></td>
    <td><span class="status-active">Active</span></td>
  `;
  tbody.insertBefore(tr, tbody.firstChild);
}

// ========== TRIGGER MANUAL ALERT ==========
function triggerAlert() {
  showToast('Emergency alert sent to all registered staff!', 'success');
  incrementNotifCount();
}

// ========== NOTIFICATION COUNT ==========
function incrementNotifCount() {
  const el = document.getElementById('notifCount');
  el.textContent = parseInt(el.textContent || 0) + 1;
}

// ========== TOAST NOTIFICATIONS ==========
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = `
      position: fixed; bottom: 24px; right: 24px;
      z-index: 9999; display: flex; flex-direction: column; gap: 10px;
    `;
    document.body.appendChild(container);
  }

  const colors = {
    success: { bg: '#d5f5e3', border: '#27ae60', text: '#1e8449' },
    error:   { bg: '#fadbd8', border: '#c0392b', text: '#922b21' },
    info:    { bg: '#d6eaf8', border: '#2980b9', text: '#1a5276' }
  };
  const c = colors[type] || colors.info;

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${c.bg}; border: 1px solid ${c.border}; color: ${c.text};
    padding: 12px 18px; border-radius: 10px;
    font-family: 'Poppins', sans-serif; font-size: 13px; font-weight: 600;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    display: flex; align-items: center; gap: 10px;
    animation: toastIn 0.3s ease; max-width: 320px;
  `;

  const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle';
  toast.innerHTML = `<i class="fas ${icon}" style="font-size:16px;"></i><span>${escHtml(message)}</span>`;
  container.appendChild(toast);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @keyframes toastOut{ to   { opacity: 0; transform: translateY(10px); } }
  `;
  if (!document.getElementById('toastStyles')) {
    style.id = 'toastStyles';
    document.head.appendChild(style);
  }

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ========== HELPERS ==========
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function escHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function readFileAsText(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result || '');
    reader.onerror = () => resolve('');
    // Only read text files; for pdf/docx just use the filename as preview
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
    } else {
      resolve(`[File: ${file.name}]\n\nThis is a ${file.name.split('.').pop().toUpperCase()} document. Content preview is not available for this file type in the browser. The file will be sent to the server for full analysis.`);
    }
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  showSection('upload-news');

  // Simulate a live notification pulse
  setInterval(() => {
    const bell = document.querySelector('.notif-btn i');
    if (bell) {
      bell.style.transform = 'rotate(20deg)';
      setTimeout(() => bell.style.transform = '', 200);
    }
  }, 8000);
});