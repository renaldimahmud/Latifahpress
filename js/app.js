// =============================================
// APP.JS - FUNGSI UTAMA PERPUSTAKAAN
// STIE Latifah Mubarokiyah Digital Library
// =============================================

// =============================================
// STATE / VARIABEL GLOBAL
// =============================================

var allBooks = [];
var googleBooks = [];
var isLoading = false;
var isGoogleLoading = false;
var isBookViewerOpen = false;
var isAIPopupOpen = false;
var isToolsPopupOpen = false;
var isTranslatorOpen = false;
var translateTimer = null;
var isTranslating = false;
var currentTab = 'local';
var SCRIPT_URL = ''; // Akan diisi dari CONFIG

// Nama hari dan bulan untuk jam
const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const bulanNama = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// =============================================
// 1. INISIALISASI & LOAD DATA
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    // Ambil token dari URL jika ada
    getToken();
    
    // Load data
    loadBooks();
    loadTranslatorSettings();
    updateClock();
    
    // Set interval untuk jam
    setInterval(updateClock, 1000);
    
    // Focus ke search input
    setTimeout(function() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    }, 500);
    
    // Event listener untuk keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape untuk tutup modal
        if (e.key === 'Escape') {
            if (isBookViewerOpen) closeBookViewer();
            if (isAIPopupOpen) closeAIChat();
            if (isToolsPopupOpen) closeToolsPopup();
        }
        
        // Ctrl+Shift+T untuk translator
        if (e.ctrlKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
            e.preventDefault();
            toggleTranslator();
        }
        
        // Prevent keyboard shortcuts saat viewer open
        preventKeyboardShortcuts(e);
    });
    
    // Event listener untuk popstate (tombol back)
    window.addEventListener('popstate', handlePopState);
    
    // Event listener untuk drag (blokir saat viewer)
    document.addEventListener('dragstart', handleDragStart);
    
    // Set initial history state
    history.replaceState({ modal: null }, '');
});

// =============================================
// 2. JAM DIGITAL
// =============================================

function updateClock() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    
    // Update jam di header
    var clockModern = document.getElementById('liveClockModern');
    if (clockModern) {
        clockModern.innerHTML = h + ':' + m + '<span class="seconds">' + s + '</span>';
    }
    
    // Update tanggal
    var dateEl = document.getElementById('liveDateModern');
    if (dateEl) {
        var day = hariNama[now.getDay()];
        var date = now.getDate();
        var month = bulanNama[now.getMonth()];
        var year = now.getFullYear();
        dateEl.textContent = day + ', ' + date + ' ' + month + ' ' + year;
    }
}

// =============================================
// 3. LOAD BUKU LOKAL (DARI GOOGLE DRIVE)
// =============================================

function loadBooks() {
    if (isLoading) return;
    isLoading = true;
    
    var grid = document.getElementById('bookGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="book-loading">
                <div class="spinner"></div>
                <span>Memuat koleksi buku...</span>
            </div>
        `;
    }
    
    callAPI('getBookCatalog')
        .then(function(books) {
            isLoading = false;
            
            if (books && books.error) {
                if (grid) {
                    grid.innerHTML = `
                        <div class="book-empty">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <h3>${books.error}</h3>
                        </div>
                    `;
                }
                return;
            }
            
            if (!books || !Array.isArray(books) || books.length === 0) {
                if (grid) {
                    grid.innerHTML = `
                        <div class="book-empty">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <h3>Tidak ada buku ditemukan</h3>
                            <p style="font-size: 14px; margin-top: 8px;">Folder kosong atau tidak ada file PDF</p>
                        </div>
                    `;
                }
                return;
            }
            
            allBooks = books;
            displayBooks(allBooks);
            
            // Update badge
            var localCount = document.getElementById('localCount');
            if (localCount) localCount.textContent = books.length;
        })
        .catch(function(error) {
            isLoading = false;
            if (grid) {
                grid.innerHTML = `
                    <div class="book-empty">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <h3>Terjadi kesalahan</h3>
                        <p style="font-size: 14px; margin-top: 8px;">${error.message}</p>
                    </div>
                `;
            }
        });
}

// =============================================
// 4. DISPLAY BUKU LOKAL
// =============================================

function displayBooks(books) {
    var grid = document.getElementById('bookGrid');
    var countEl = document.getElementById('bookCount');
    
    if (!books || books.length === 0) {
        if (grid) {
            grid.innerHTML = `
                <div class="book-empty" style="grid-column: 1/-1;">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>Tidak ada buku ditemukan</h3>
                    <p style="font-size: 14px; margin-top: 8px;">Silakan coba kata kunci lain</p>
                </div>
            `;
        }
        if (countEl) countEl.innerHTML = '<span class="badge-dot"></span><span>0 Buku</span>';
        return;
    }
    
    if (countEl) {
        countEl.innerHTML = `<span class="badge-dot"></span><span>${books.length} Buku</span>`;
    }
    
    if (grid) {
        grid.innerHTML = books.map(function(book) {
            var thumbUrl = 'https://lh3.googleusercontent.com/d/' + book.id + '=w300-h400-p-k-no-nu';
            var fallbackThumb = 'https://drive.google.com/thumbnail?id=' + book.id + '&sz=w400';
            var safeTitle = escapeHtml(book.title);
            var safeAuthor = escapeHtml(book.author);
            var safeSize = escapeHtml(book.size);
            
            return `
                <div class="book-card" onclick="openBook('${book.id}')" title="Klik untuk membaca">
                    <img src="${thumbUrl}" class="book-thumbnail" alt="${safeTitle}" loading="lazy" 
                         onerror="this.onerror=null;this.src='${fallbackThumb}';">
                    <div class="book-title">${safeTitle}</div>
                    <div class="book-author">✍️ ${safeAuthor}</div>
                    <div class="book-size">📄 ${safeSize} 🔒</div>
                </div>
            `;
        }).join('');
    }
}

// =============================================
// 5. SEARCH BUKU LOKAL
// =============================================

function searchBooks() {
    var query = document.getElementById('searchInput').value.trim();
    if (!query) {
        displayBooks(allBooks);
        return;
    }
    var filtered = allBooks.filter(function(b) {
        return b.title.toLowerCase().includes(query.toLowerCase()) || 
               b.author.toLowerCase().includes(query.toLowerCase());
    });
    displayBooks(filtered);
}

function handleSearchInput() {
    var query = document.getElementById('searchInput').value.trim();
    
    if (currentTab === 'google') {
        clearTimeout(window._googleSearchTimeout);
        window._googleSearchTimeout = setTimeout(function() {
            if (query.length >= 3) {
                searchGoogleBooks(query);
            }
        }, 800);
    } else {
        searchBooks();
    }
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    if (currentTab === 'google') {
        document.getElementById('googleResults').innerHTML = 
            '<div class="google-status">📚 Masukkan judul atau nama penulis di kotak pencarian</div>';
        document.getElementById('googleCount').textContent = '0';
    } else {
        displayBooks(allBooks);
    }
}

// =============================================
// 6. TAB SWITCHING (LOKAL vs GOOGLE BOOKS)
// =============================================

function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    var localContainer = document.getElementById('bookGridContainer');
    var googleSection = document.getElementById('googleSection');
    var searchInput = document.getElementById('searchInput');
    
    if (tab === 'local') {
        if (localContainer) localContainer.style.display = 'block';
        if (googleSection) googleSection.style.display = 'none';
        if (searchInput) {
            searchInput.placeholder = 'Cari judul atau penulis...';
            searchInput.value = '';
        }
        displayBooks(allBooks);
    } else {
        if (localContainer) localContainer.style.display = 'none';
        if (googleSection) googleSection.style.display = 'block';
        if (searchInput) {
            searchInput.placeholder = 'Cari di Open Library...';
        }
        
        var query = searchInput ? searchInput.value.trim() : '';
        if (query) {
            searchGoogleBooks(query);
        } else {
            document.getElementById('googleResults').innerHTML = 
                '<div class="google-status">📚 Masukkan judul atau nama penulis di kotak pencarian</div>';
        }
    }
}

// =============================================
// 7. GOOGLE BOOKS SEARCH
// =============================================

function searchGoogleBooks(query) {
    if (!query || query.trim() === '') {
        document.getElementById('googleResults').innerHTML = 
            '<div class="google-status">📝 Masukkan kata kunci untuk mencari buku</div>';
        return;
    }
    
    if (isGoogleLoading) return;
    isGoogleLoading = true;
    
    var resultsContainer = document.getElementById('googleResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = 
            '<div class="google-status"><span class="spinner"></span>Mencari buku yang bisa dibaca...</div>';
    }
    
    var options = {
        yearFrom: document.getElementById('filterYearFrom').value || 1900,
        yearTo: document.getElementById('filterYearTo').value || new Date().getFullYear(),
        limit: document.getElementById('filterLimit').value || 50,
        language: document.getElementById('filterLanguage').value || '',
        readableOnly: true
    };
    
    callAPI('searchBooksOnline', {
        query: query,
        yearFrom: options.yearFrom,
        yearTo: options.yearTo,
        limit: options.limit,
        language: options.language,
        readableOnly: options.readableOnly
    })
    .then(function(response) {
        isGoogleLoading = false;
        renderGoogleBooksResults(response);
    })
    .catch(function(error) {
        isGoogleLoading = false;
        if (resultsContainer) {
            resultsContainer.innerHTML = 
                '<div class="google-status" style="color: #f87171;">❌ ' + error.message + '</div>';
        }
    });
}

function renderGoogleBooksResults(response) {
    var container = document.getElementById('googleResults');
    var countBadge = document.getElementById('googleCount');
    
    if (!response || response.error) {
        if (container) {
            container.innerHTML = 
                '<div class="google-status" style="color: #fcd34d;">⚠️ ' + 
                (response ? response.error : 'Terjadi kesalahan') + '</div>';
        }
        if (countBadge) countBadge.textContent = '0';
        return;
    }
    
    if (!response.books || response.books.length === 0) {
        if (container) {
            container.innerHTML = 
                '<div class="google-status">😕 Tidak ada buku ditemukan. Coba perlonggar filter tahun.</div>';
        }
        if (countBadge) countBadge.textContent = '0';
        return;
    }
    
    var books = response.books;
    googleBooks = books;
    if (countBadge) countBadge.textContent = books.length;
    
    var headerHtml = `
        <div style="color: rgba(255,255,255,0.8); font-size: 13px; margin-bottom: 16px; padding: 12px 16px; background: rgba(59, 130, 246, 0.1); border-radius: 12px; border-left: 3px solid #3b82f6; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <span>✅ Ditemukan <b style="color:#60a5fa;">${books.length}</b> buku yang bisa dibaca langsung
            ${response.totalItems > books.length ? ' dari total <b>' + response.totalItems + '</b> hasil' : ''}</span>
            <span style="font-size:11px; color:rgba(255,255,255,0.5);">Sumber: ${response.source || 'Open Library'}</span>
        </div>
    `;
    
    var noteHtml = response.note ? 
        `<div style="color: rgba(255,255,255,0.5); font-size: 11px; text-align: center; padding: 8px; margin-bottom: 12px;">${response.note}</div>` : '';
    
    if (container) {
        container.innerHTML = headerHtml + noteHtml + books.map(function(book) {
            var safeTitle = escapeHtml(book.title);
            var safeAuthor = escapeHtml(book.author);
            var safeThumb = escapeHtml(book.thumbnail);
            var safePreview = escapeHtml(book.previewLink);
            var safeInfo = escapeHtml(book.infoLink);
            
            var coverHtml = safeThumb ? 
                `<img src="${safeThumb}" alt="${safeTitle}" onerror="this.src='https://via.placeholder.com/90x130/e2e8f0/64748b?text=No+Cover'">` :
                `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#64748b;font-size:11px;">No Cover</div>`;
            
            return `
                <div class="google-book-card">
                    <div class="cover">${coverHtml}</div>
                    <div class="info">
                        <div class="title">${safeTitle}</div>
                        <div class="author">✍️ ${safeAuthor}</div>
                        <div class="meta">
                            ${book.year !== '-' ? '<span>📅 ' + book.year + '</span>' : ''}
                            ${book.pageCount > 0 ? '<span>📄 ' + book.pageCount + ' hal</span>' : ''}
                            <span style="color:#10b981;">✓ Bisa Dibaca</span>
                        </div>
                        <div class="description">${escapeHtml(book.description)}</div>
                    </div>
                    <div class="actions">
                        <button class="btn-preview" onclick="event.stopPropagation(); openBookReader('${safePreview}')">📖 Baca</button>
                        <button class="btn-info" onclick="event.stopPropagation(); window.open('${safeInfo}', '_blank')">ℹ️ Info</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function applyFilters() {
    var query = document.getElementById('searchInput').value.trim();
    if (!query) {
        showToast('Masukkan kata kunci pencarian terlebih dahulu', '⚠️');
        document.getElementById('searchInput').focus();
        return;
    }
    searchGoogleBooks(query);
}

function resetFilters() {
    document.getElementById('filterYearFrom').value = '';
    document.getElementById('filterYearTo').value = '';
    document.getElementById('filterLanguage').value = '';
    document.getElementById('filterLimit').value = '50';
    showToast('Filter direset ke default', '↺');
    
    var query = document.getElementById('searchInput').value.trim();
    if (query && currentTab === 'google') {
        searchGoogleBooks(query);
    }
}

// =============================================
// 8. BOOK VIEWER (PDF READER)
// =============================================

function openBook(fileId) {
    var url = 'https://drive.google.com/file/d/' + fileId + '/preview';
    openBookViewer(url);
}

function openBookReader(embedUrl) {
    if (!embedUrl || !embedUrl.includes('archive.org/embed')) {
        showToast('File buku belum tersedia untuk dibaca online.', '❌');
        return;
    }
    openBookViewer(embedUrl);
}

function openBookViewer(url) {
    showToast('Membuka buku...', '📖');
    
    var frame = document.getElementById('bookViewerFrame');
    if (frame) frame.src = url;
    
    var modal = document.getElementById('bookViewerModal');
    if (modal) modal.style.display = 'block';
    
    var blocker = document.getElementById('driveDownloadBlocker');
    if (blocker) blocker.style.display = 'block';
    
    isBookViewerOpen = true;
    history.pushState({ modal: 'bookViewer' }, '');
}

function closeBookViewer() {
    if (!isBookViewerOpen) return;
    
    var frame = document.getElementById('bookViewerFrame');
    if (frame) frame.src = 'about:blank';
    
    var modal = document.getElementById('bookViewerModal');
    if (modal) modal.style.display = 'none';
    
    var blocker = document.getElementById('driveDownloadBlocker');
    if (blocker) blocker.style.display = 'none';
    
    isBookViewerOpen = false;
    
    if (history.state && history.state.modal === 'bookViewer') {
        history.back();
    }
}

// =============================================
// 9. KEYBOARD SHORTCUTS & SECURITY
// =============================================

function preventKeyboardShortcuts(e) {
    if (!isBookViewerOpen) return;
    
    // Blokir shortcut download/print
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || 
        e.key === 'p' || e.key === 'P' || 
        e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        showToast('Aksi download/print diblokir!', '🚫');
        return false;
    }
    
    // Blokir F12
    if (e.key === 'F12') {
        e.preventDefault();
        showToast('Dev Tools diblokir saat membaca!', '🚫');
        return false;
    }
    
    // Blokir Dev Tools shortcuts
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || 
        e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        showToast('Dev Tools diblokir saat membaca!', '🚫');
        return false;
    }
}

function handleDragStart(e) {
    if (isBookViewerOpen && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        return false;
    }
}

function handlePopState(e) {
    if (e.state && e.state.modal === 'bookViewer') {
        var modal = document.getElementById('bookViewerModal');
        if (modal && modal.style.display === 'block') {
            var frame = document.getElementById('bookViewerFrame');
            if (frame) frame.src = 'about:blank';
            modal.style.display = 'none';
            var blocker = document.getElementById('driveDownloadBlocker');
            if (blocker) blocker.style.display = 'none';
            isBookViewerOpen = false;
        }
    } else if (e.state && e.state.modal === 'aiPopup') {
        var aiPopup = document.getElementById('aiPopup');
        if (aiPopup && aiPopup.classList.contains('active')) {
            aiPopup.classList.remove('active');
            document.body.style.overflow = '';
            isAIPopupOpen = false;
        }
    } else if (e.state && e.state.modal === 'toolsPopup') {
        var toolsPopup = document.getElementById('toolsPopup');
        if (toolsPopup && toolsPopup.classList.contains('active')) {
            toolsPopup.classList.remove('active');
            document.body.style.overflow = '';
            isToolsPopupOpen = false;
        }
    } else {
        // Fallback: tutup semua modal
        var modal = document.getElementById('bookViewerModal');
        if (modal && modal.style.display === 'block') {
            var frame = document.getElementById('bookViewerFrame');
            if (frame) frame.src = 'about:blank';
            modal.style.display = 'none';
            var blocker = document.getElementById('driveDownloadBlocker');
            if (blocker) blocker.style.display = 'none';
            isBookViewerOpen = false;
        }
        var aiPopup = document.getElementById('aiPopup');
        if (aiPopup && aiPopup.classList.contains('active')) {
            aiPopup.classList.remove('active');
            document.body.style.overflow = '';
            isAIPopupOpen = false;
        }
        var toolsPopup = document.getElementById('toolsPopup');
        if (toolsPopup && toolsPopup.classList.contains('active')) {
            toolsPopup.classList.remove('active');
            document.body.style.overflow = '';
            isToolsPopupOpen = false;
        }
    }
}

// =============================================
// 10. AI CHAT
// =============================================

function openAIChat() {
    closeToolsPopup();
    var popup = document.getElementById('aiPopup');
    if (popup) popup.classList.add('active');
    document.body.style.overflow = 'hidden';
    isAIPopupOpen = true;
    history.pushState({ modal: 'aiPopup' }, '');
    
    setTimeout(function() {
        var input = document.getElementById('aiInput');
        if (input) {
            input.focus();
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    sendAIMessage();
                }
            });
        }
    }, 300);
}

function closeAIChat() {
    if (!isAIPopupOpen) return;
    
    var popup = document.getElementById('aiPopup');
    if (popup) popup.classList.remove('active');
    document.body.style.overflow = '';
    isAIPopupOpen = false;
    
    if (history.state && history.state.modal === 'aiPopup') {
        history.back();
    }
}

function closeAIPopupOutside(event) {
    if (event.target === event.currentTarget) {
        closeAIChat();
    }
}

function sendAIMessage() {
    var input = document.getElementById('aiInput');
    var question = input ? input.value.trim() : '';
    if (!question) return;
    
    addAIMessage(question, true);
    if (input) input.value = '';
    showAITyping();
    
    callAPI('getAIResponse', { question: question })
        .then(function(result) {
            removeAITyping();
            addAIMessage(result.response || 'Maaf, tidak ada jawaban.', false);
            var aiInput = document.getElementById('aiInput');
            if (aiInput) aiInput.focus();
        })
        .catch(function(error) {
            removeAITyping();
            addAIMessage('Maaf, terjadi kesalahan: ' + error.message, false);
            var aiInput = document.getElementById('aiInput');
            if (aiInput) aiInput.focus();
        });
}

function addAIMessage(text, isUser) {
    var container = document.getElementById('aiMessages');
    if (!container) return;
    
    var div = document.createElement('div');
    div.className = 'message ' + (isUser ? 'user' : 'ai');
    var bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    div.appendChild(bubble);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function showAITyping() {
    var container = document.getElementById('aiMessages');
    if (!container) return;
    
    var div = document.createElement('div');
    div.className = 'message ai';
    div.id = 'aiTyping';
    div.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeAITyping() {
    var el = document.getElementById('aiTyping');
    if (el) el.remove();
}

// =============================================
// 11. TOOLS POPUP
// =============================================

function openToolsPopup() {
    var popup = document.getElementById('toolsPopup');
    if (popup) popup.classList.add('active');
    document.body.style.overflow = 'hidden';
    isToolsPopupOpen = true;
    history.pushState({ modal: 'toolsPopup' }, '');
}

function closeToolsPopup() {
    if (!isToolsPopupOpen) return;
    
    var popup = document.getElementById('toolsPopup');
    if (popup) popup.classList.remove('active');
    document.body.style.overflow = '';
    isToolsPopupOpen = false;
    
    if (history.state && history.state.modal === 'toolsPopup') {
        history.back();
    }
}

function closeToolsPopupOutside(event) {
    if (event.target === event.currentTarget) {
        closeToolsPopup();
    }
}

function openTool(name, url, icon) {
    closeToolsPopup();
    showToast('Membuka ' + name + '...', icon || '🚀');
    setTimeout(function() {
        window.open(url, '_blank');
    }, 350);
}

// =============================================
// 12. TRANSLATOR
// =============================================

function toggleTranslator() {
    var panel = document.getElementById('translatorPanel');
    var fab = document.getElementById('translatorFab');
    
    isTranslatorOpen = !isTranslatorOpen;
    
    if (isTranslatorOpen) {
        if (panel) panel.classList.add('active');
        if (fab) fab.classList.add('active');
        setTimeout(function() {
            var input = document.getElementById('translateInput');
            if (input) input.focus();
        }, 300);
    } else {
        if (panel) panel.classList.remove('active');
        if (fab) fab.classList.remove('active');
    }
}

function swapLanguagesFull() {
    var fromSelect = document.getElementById('fromLang');
    var toSelect = document.getElementById('toLang');
    
    if (!fromSelect || !toSelect) return;
    
    var fromVal = fromSelect.value;
    var toVal = toSelect.value;
    
    fromSelect.value = toVal;
    toSelect.value = fromVal;
    
    // Update flags
    var fromSelected = fromSelect.options[fromSelect.selectedIndex];
    var toSelected = toSelect.options[toSelect.selectedIndex];
    var fromFlag = document.getElementById('fromFlag');
    var toFlag = document.getElementById('toFlag');
    if (fromFlag) fromFlag.textContent = fromSelected.dataset.flag;
    if (toFlag) toFlag.textContent = toSelected.dataset.flag;
    
    // Animasi swap
    var btn = document.querySelector('.swap-btn');
    if (btn) {
        btn.style.transform = 'rotate(360deg)';
        setTimeout(function() {
            btn.style.transform = '';
        }, 500);
    }
    
    var text = document.getElementById('translateInput');
    if (text && text.value.trim()) {
        setTimeout(doTranslate, 300);
    }
}

function autoTranslate() {
    var text = document.getElementById('translateInput');
    var output = document.getElementById('translateOutput');
    
    if (!text || !output) return;
    
    var inputText = text.value.trim();
    
    if (!inputText) {
        output.classList.remove('loading', 'has-result');
        output.innerText = '📝 Hasil terjemahan otomatis';
        return;
    }
    
    clearTimeout(translateTimer);
    translateTimer = setTimeout(function() {
        if (!isTranslating) doTranslate();
    }, 400);
}

function doTranslate() {
    var text = document.getElementById('translateInput');
    var output = document.getElementById('translateOutput');
    var fromLang = document.getElementById('fromLang');
    var toLang = document.getElementById('toLang');
    
    if (!text || !output || !fromLang || !toLang) return;
    
    var inputText = text.value.trim();
    if (!inputText) return;
    
    var fromLangVal = fromLang.value;
    var toLangVal = toLang.value;
    
    localStorage.setItem('stie_translator_from_lang', fromLangVal);
    localStorage.setItem('stie_translator_to_lang', toLangVal);
    
    isTranslating = true;
    output.classList.add('loading');
    output.classList.remove('has-result');
    output.innerText = '🧠 Menerjemahkan...';
    
    callAPI('translateTextSTIE', {
        text: inputText,
        targetLang: toLangVal
    })
    .then(function(result) {
        isTranslating = false;
        output.classList.remove('loading');
        output.classList.add('has-result');
        output.innerText = result.translation || 'Terjemahan kosong.';
    })
    .catch(function(error) {
        isTranslating = false;
        output.classList.remove('loading');
        output.innerText = '❌ ' + error.message;
    });
}

function loadTranslatorSettings() {
    var savedFrom = localStorage.getItem('stie_translator_from_lang');
    var savedTo = localStorage.getItem('stie_translator_to_lang');
    
    var fromSelect = document.getElementById('fromLang');
    var toSelect = document.getElementById('toLang');
    var fromFlag = document.getElementById('fromFlag');
    var toFlag = document.getElementById('toFlag');
    
    if (savedFrom && fromSelect) {
        fromSelect.value = savedFrom;
        var fromSelected = fromSelect.options[fromSelect.selectedIndex];
        if (fromFlag && fromSelected) fromFlag.textContent = fromSelected.dataset.flag;
    }
    if (savedTo && toSelect) {
        toSelect.value = savedTo;
        var toSelected = toSelect.options[toSelect.selectedIndex];
        if (toFlag && toSelected) toFlag.textContent = toSelected.dataset.flag;
    }
}

// =============================================
// 13. LOGOUT
// =============================================

function logoutUser() {
    var modal = document.getElementById('confirmModal');
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function cancelLogout() {
    var modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
}

function confirmLogout() {
    var modal = document.getElementById('confirmModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
    
    var token = getToken();
    if (token) {
        callAPI('logout', { token: token })
            .then(function() {
                localStorage.removeItem('sessionToken');
                window.location.href = 'login.html';
            })
            .catch(function() {
                localStorage.removeItem('sessionToken');
                window.location.href = 'login.html';
            });
    } else {
        localStorage.removeItem('sessionToken');
        window.location.href = 'login.html';
    }
}

// =============================================
// 14. URL HELPERS (untuk GAS compatibility)
// =============================================

function getUrlWithToken(baseUrl) {
    var token = getToken();
    if (token) {
        var separator = baseUrl.indexOf('?') > -1 ? '&' : '?';
        return baseUrl + separator + 'token=' + encodeURIComponent(token);
    }
    return baseUrl;
}

// =============================================
// EXPOSE FUNCTIONS KE GLOBAL SCOPE
// =============================================

// Fungsi utama
window.loadBooks = loadBooks;
window.displayBooks = displayBooks;
window.searchBooks = searchBooks;
window.handleSearchInput = handleSearchInput;
window.clearSearch = clearSearch;
window.switchTab = switchTab;

// Google Books
window.searchGoogleBooks = searchGoogleBooks;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.openBookReader = openBookReader;

// Book Viewer
window.openBook = openBook;
window.closeBookViewer = closeBookViewer;

// AI Chat
window.openAIChat = openAIChat;
window.closeAIChat = closeAIChat;
window.closeAIPopupOutside = closeAIPopupOutside;
window.sendAIMessage = sendAIMessage;

// Tools
window.openToolsPopup = openToolsPopup;
window.closeToolsPopup = closeToolsPopup;
window.closeToolsPopupOutside = closeToolsPopupOutside;
window.openTool = openTool;

// Translator
window.toggleTranslator = toggleTranslator;
window.swapLanguagesFull = swapLanguagesFull;
window.autoTranslate = autoTranslate;
window.doTranslate = doTranslate;

// Logout
window.logoutUser = logoutUser;
window.cancelLogout = cancelLogout;
window.confirmLogout = confirmLogout;

// Helpers
window.getUrlWithToken = getUrlWithToken;
window.updateClock = updateClock;
window.preventKeyboardShortcuts = preventKeyboardShortcuts;
window.handleDragStart = handleDragStart;
window.handlePopState = handlePopState;
window.loadTranslatorSettings = loadTranslatorSettings;

// Inisialisasi event listener untuk translator
document.addEventListener('DOMContentLoaded', function() {
    var translateInput = document.getElementById('translateInput');
    if (translateInput) {
        translateInput.addEventListener('input', autoTranslate);
        translateInput.addEventListener('paste', function(e) {
            setTimeout(autoTranslate, 150);
        });
    }
    
    // Event listener untuk translator keyboard shortcut (Ctrl+Enter)
    document.addEventListener('keydown', function(e) {
        if (isTranslatorOpen && (e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            doTranslate();
        }
    });
});
