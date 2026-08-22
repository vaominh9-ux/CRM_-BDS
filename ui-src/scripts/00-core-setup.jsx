
    const { useState, useEffect, useRef, useMemo } = React;

    // ============== UI Palette Registry (colors.md — exact hexes, don't freestyle) ==============
    // cols per theme: id | name | primary | secondary | bg | card | accent | onAccent
    const UI_THEMES = [
      // Section 1 — Classic enterprise
      { id:'UI 1',  name:'Xanh hải quân doanh nghiệp', primary:'#1E3A5F', secondary:'#4F6D8C', bg:'#F7F9FC', card:'#FFFFFF', accent:'#5B8DEF', onAccent:'#FFFFFF' },
      { id:'UI 2',  name:'Than chì và lục lam',        primary:'#2C313C', secondary:'#49515F', bg:'#F5F7FA', card:'#FFFFFF', accent:'#00B8D9', onAccent:'#FFFFFF' },
      { id:'UI 3',  name:'Xanh rừng điều hành',        primary:'#234E52', secondary:'#52796F', bg:'#F8FAF8', card:'#FFFFFF', accent:'#84A98C', onAccent:'#FFFFFF' },
      { id:'UI 4',  name:'Óc chó và cát',              primary:'#4E3D32', secondary:'#7B6855', bg:'#FAF7F2', card:'#FFFFFF', accent:'#C49A6C', onAccent:'#FFFFFF' },
      { id:'UI 5',  name:'Ngọc lục bảo doanh nghiệp',  primary:'#0F766E', secondary:'#4CAF94', bg:'#F5FBFA', card:'#FFFFFF', accent:'#22C55E', onAccent:'#FFFFFF' },
      { id:'UI 6',  name:'Mocha điều hành',            primary:'#5B4636', secondary:'#8B7355', bg:'#FCFAF7', card:'#FFFFFF', accent:'#D4A373', onAccent:'#FFFFFF' },
      { id:'UI 7',  name:'Than chì và vàng dịu',       primary:'#2B2F36', secondary:'#4A4F57', bg:'#F7F7F7', card:'#FFFFFF', accent:'#D4AF37', onAccent:'#222222' },
      // Section 2 — Latest SaaS 2026
      { id:'UIv1', name:'Kẽm và trời xanh',            primary:'#18181B', secondary:'#3F3F46', bg:'#FAFAFA', card:'#FFFFFF', accent:'#0EA5E9', onAccent:'#FFFFFF' },
      { id:'UIv2', name:'Mực và tím',                  primary:'#0F0F12', secondary:'#27272A', bg:'#FAFAFA', card:'#FFFFFF', accent:'#8B5CF6', onAccent:'#FFFFFF' },
      { id:'UIv3', name:'Đá phiến và hồng',            primary:'#1E293B', secondary:'#475569', bg:'#F8FAFC', card:'#FFFFFF', accent:'#F43F5E', onAccent:'#FFFFFF' },
      { id:'UIv4', name:'Đá và hổ phách',              primary:'#292524', secondary:'#57534E', bg:'#FAFAF9', card:'#FFFFFF', accent:'#F59E0B', onAccent:'#222222' },
      { id:'UIv5', name:'Xanh ngọc khoáng',            primary:'#134E4A', secondary:'#5F7A78', bg:'#F4F7F6', card:'#FFFFFF', accent:'#2DD4BF', onAccent:'#134E4A' },
      { id:'UIv6', name:'Giấy và đồng',                primary:'#3F2E24', secondary:'#6B5344', bg:'#FBF8F4', card:'#FFFFFF', accent:'#C47B4A', onAccent:'#FFFFFF' },
      { id:'UIv7', name:'Hắc diện thạch và bạc hà',    primary:'#111827', secondary:'#374151', bg:'#F9FAFB', card:'#FFFFFF', accent:'#34D399', onAccent:'#111827' },
      { id:'UIv8', name:'Mây và chàm dịu',             primary:'#312E81', secondary:'#4C51BF', bg:'#F5F5FF', card:'#FFFFFF', accent:'#818CF8', onAccent:'#FFFFFF' },
      // Section 3 — 2026 Trends
      { id:'UIv9',  name:'Cực quang tím',              primary:'#1A1025', secondary:'#3B2A52', bg:'#FAF8FC', card:'#FFFFFF', accent:'#A78BFA', onAccent:'#1A1025' },
      { id:'UIv10', name:'Dạ quang nửa đêm',           primary:'#0A0A0F', secondary:'#1C1C28', bg:'#F7F7FB', card:'#FFFFFF', accent:'#22D3EE', onAccent:'#0A0A0F' },
      { id:'UIv11', name:'San hô dịu',                 primary:'#1F2937', secondary:'#4B5563', bg:'#FFF9F7', card:'#FFFFFF', accent:'#FB7185', onAccent:'#FFFFFF' },
      { id:'UIv12', name:'Băng Bắc Cực',               primary:'#0C4A6E', secondary:'#0369A1', bg:'#F0F9FF', card:'#FFFFFF', accent:'#38BDF8', onAccent:'#0C4A6E' },
      { id:'UIv13', name:'Ô liu tĩnh',                 primary:'#1C1917', secondary:'#44403C', bg:'#FAFAF5', card:'#FFFFFF', accent:'#A3B18A', onAccent:'#1C1917' },
      { id:'UIv14', name:'Mực và xanh chanh',          primary:'#09090B', secondary:'#27272A', bg:'#FAFAFA', card:'#FFFFFF', accent:'#A3E635', onAccent:'#09090B' },
      { id:'UIv15', name:'Thạch anh hồng',             primary:'#3F1D2E', secondary:'#6B3A4F', bg:'#FDF8FA', card:'#FFFFFF', accent:'#E879A9', onAccent:'#FFFFFF' },
      { id:'UIv16', name:'Carbon điện',                primary:'#111827', secondary:'#1F2937', bg:'#F8FAFC', card:'#FFFFFF', accent:'#6366F1', onAccent:'#FFFFFF' },
      { id:'UIv17', name:'Đất nung ấm',                primary:'#292524', secondary:'#57534E', bg:'#FFFBF5', card:'#FFFFFF', accent:'#E07A5F', onAccent:'#FFFFFF' },
      { id:'UIv18', name:'Đại dương sâu',              primary:'#0B1D36', secondary:'#1B3A5F', bg:'#F4F8FC', card:'#FFFFFF', accent:'#14B8A6', onAccent:'#0B1D36' },
      // Section 4 — Designer Picks 2026
      { id:'UIv19', name:'Vũ điệu mây',                primary:'#141414', secondary:'#2B2F36', bg:'#F0EEE9', card:'#FFFFFF', accent:'#BFD3E7', onAccent:'#141414' },
      { id:'UIv20', name:'Ánh than hồng dịu',          primary:'#2B1538', secondary:'#5A4B8A', bg:'#EDE7E3', card:'#FFFFFF', accent:'#FF6A3D', onAccent:'#FFFFFF' },
      { id:'UIv21', name:'Lục lam cảm xúc',            primary:'#0B0D10', secondary:'#151A21', bg:'#F4F6F8', card:'#FFFFFF', accent:'#40E0FF', onAccent:'#0B0D10' },
      { id:'UIv22', name:'Xanh chanh dạ quang',        primary:'#070A0F', secondary:'#1A1F2E', bg:'#F7F8FA', card:'#FFFFFF', accent:'#B6FF3B', onAccent:'#070A0F' },
      { id:'UIv23', name:'Hồng rực',                   primary:'#0F0A12', secondary:'#2A1A28', bg:'#FDF8FC', card:'#FFFFFF', accent:'#FF3BD4', onAccent:'#FFFFFF' },
      { id:'UIv24', name:'Tím tử đinh hương AI',       primary:'#07070A', secondary:'#1A1528', bg:'#F3F0FF', card:'#FFFFFF', accent:'#B9A7FF', onAccent:'#07070A' },
      { id:'UIv25', name:'Xanh ngọc rực',              primary:'#0A1214', secondary:'#163038', bg:'#F0FFFC', card:'#FFFFFF', accent:'#00F5D4', onAccent:'#0A1214' },
      { id:'UIv26', name:'Sinh thái số',               primary:'#101417', secondary:'#316263', bg:'#F5F7F4', card:'#FFFFFF', accent:'#C36A4A', onAccent:'#FFFFFF' },
      { id:'UIv27', name:'Gỗ gụ ấm',                   primary:'#221A18', secondary:'#7A2E2A', bg:'#F5EFE7', card:'#FFFFFF', accent:'#C9A46B', onAccent:'#221A18' },
      { id:'UIv28', name:'San hô hồng ngọc',           primary:'#1A0A0C', secondary:'#4A1520', bg:'#FFF8F7', card:'#FFFFFF', accent:'#FF5A4A', onAccent:'#FFFFFF' },
      { id:'UIv29', name:'Xanh công nghệ',             primary:'#0A0F1A', secondary:'#152040', bg:'#F5F7FF', card:'#FFFFFF', accent:'#3B7BFF', onAccent:'#FFFFFF' },
      { id:'UIv30', name:'Sung và lê',          primary:'#2D1F24', secondary:'#5C3D45', bg:'#FBF7F2', card:'#FFFFFF', accent:'#A8C256', onAccent:'#2D1F24' },
      // Section 5 — X / SaaS product picks (Stripe/Linear/Vercel-school + warm analytics)
      { id:'UIv31', name:'Fintech Blurple',     primary:'#0A2540', secondary:'#425466', bg:'#F6F9FC', card:'#FFFFFF', accent:'#635BFF', onAccent:'#FFFFFF' },
      { id:'UIv32', name:'Violet Flow',         primary:'#1C1D22', secondary:'#44454D', bg:'#F7F8F8', card:'#FFFFFF', accent:'#5E6AD2', onAccent:'#FFFFFF' },
      { id:'UIv33', name:'Mono Pro',            primary:'#000000', secondary:'#525252', bg:'#FAFAFA', card:'#FFFFFF', accent:'#171717', onAccent:'#FFFFFF' },
      { id:'UIv34', name:'Warm Analytics',      primary:'#7C2D12', secondary:'#9A3412', bg:'#FFF7ED', card:'#FFFFFF', accent:'#F97316', onAccent:'#222222' }
    ];

    // resolve a theme -> css var map (primary drives sidebar/chrome, accent drives buttons/active)
    const themeVars = (t) => ({
      '--navy-primary': t.primary,
      '--navy-dark':    t.primary,
      '--navy-light':   t.secondary,
      '--navy-hover':   t.secondary,
      '--navy-accent':  t.accent,
      '--c-secondary':  t.secondary,
      '--c-bg':         t.bg,
      '--c-card':       t.card,
      '--c-on-accent':  t.onAccent,
      '--text-primary': '#1A1A1A',
      '--text-muted':   '#6B7280'
    });
    const findTheme = (id) => UI_THEMES.find(t => t.id === id) || null;
    const applyThemeVars = (v) => { const r = document.documentElement; Object.keys(v).forEach(k => r.style.setProperty(k, v[k])); };
    const cacheThemeVars = (v) => { try { localStorage.setItem('app_theme_vars', JSON.stringify(v)); } catch (e) {} };
    const THEME_KEYS = ['--navy-primary','--navy-dark','--navy-light','--navy-hover','--navy-accent','--c-secondary','--c-bg','--c-card','--c-on-accent','--text-primary','--text-muted'];
    // revert any live/ephemeral preview back to the last saved theme (device cache → server default → navy)
    const applySavedTheme = () => {
      const root = document.documentElement;
      THEME_KEYS.forEach(k => root.style.removeProperty(k));
      const read = (raw) => { try { let o = JSON.parse(raw); if (o && o.vars) o = o.vars; if (o) { applyThemeVars(o); return true; } } catch (e) {} return false; };
      try { if (read(localStorage.getItem('app_theme_vars'))) return; } catch (e) {}
      try { read(window.__APP_THEME_RAW__); } catch (e) {}
    };

    // ============== RBAC Helpers ==============
    const APP_LOGO = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#0f766e"/><path d="M28 102V48l36-22 36 22v54H74V72H54v30H28zm14-42h12V48H42v12zm32 0h12V48H74v12z" fill="#fff"/></svg>');

    // ---- branded processing overlay: WRITES only (reads keep the thin top bar) ----
    const _proc = { n: 0, verb: '', subs: new Set() };
    const procNotify = () => _proc.subs.forEach((cb) => cb());
    const procStart = (verb) => { _proc.n++; _proc.verb = verb; procNotify(); };
    const procEnd = () => { _proc.n = Math.max(0, _proc.n - 1); procNotify(); };
    // fn-name prefix -> verb label; unmatched (get*/authenticate/public*) = read, no overlay
    const MUT_VERBS = [['bulkImport','Importing…'],['delete','Deleting…'],['restore','Restoring…'],['remove','Removing…'],
      ['add','Saving…'],['update','Saving…'],['upload','Uploading…'],['assign','Assigning…'],['reassign','Reassigning…'],
      ['toggle','Saving…'],['collect','Collecting…'],['renew','Renewing…'],['end','Ending…'],['mark','Updating…'],
      ['complete','Completing…'],['convert','Converting…'],['set','Saving…'],['brochure','Generating…'],['email','Sending…'],
      ['build','Generating…'],['agreement','Generating…']];
    const mutVerb = (fn) => { const m = MUT_VERBS.find(([p]) => fn.indexOf(p) === 0); return m ? m[1] : null; };
    function ProcessingOverlay({ profileImage }) {
      const { branding } = useAgencyBranding();
      const [, force] = useState(0);
      useEffect(() => { const cb = () => force((n) => n + 1); _proc.subs.add(cb); return () => _proc.subs.delete(cb); }, []);
      if (!_proc.n) return null;
      return (
        <div className="proc-overlay" role="status" aria-live="polite" aria-busy="true">
          <img src={branding.logo || profileImage || APP_LOGO} className="proc-logo" alt="Ảnh đại diện"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = APP_LOGO; }} />
          <div className="proc-bar"><span></span></div>
          <div className="proc-label">{_proc.verb || 'Đang xử lý…'}</div>
        </div>
      );
    }

    // promise wrapper around google.script.run — mutating calls light the overlay for their whole duration, cleared in finally
    const gsRun = (fn, ...args) => {
      const verb = mutVerb(fn);
      if (verb) procStart(verb);
      if (!(window.google && google.script && google.script.run)) {
        let authHeaders = { 'Content-Type': 'application/json' };
        try {
          const session = JSON.parse(localStorage.getItem('userSession') || '{}');
          if (session?.authSession?.accessToken) authHeaders.Authorization = 'Bearer ' + session.authSession.accessToken;
        } catch (error) {}
        return fetch('/api/run/' + encodeURIComponent(fn), {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ args })
        }).then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.message || 'Local data request failed');
          return result;
        }).finally(() => { if (verb) procEnd(); });
      }
      return new Promise((resolve, reject) => {
        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fn](...args);
      }).finally(() => { if (verb) procEnd(); });
    };

    // csv parse — RFC 4180 (quoted fields, escaped quotes, embedded newlines); shared by all list imports
    function parseCSV(text) {
      const rows = [];
      let row = [], field = '', inQ = false;
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQ) {
          if (c === '"' && text[i+1] === '"') { field += '"'; i++; }
          else if (c === '"') inQ = false;
          else field += c;
        } else {
          if (c === '"') inQ = true;
          else if (c === ',') { row.push(field); field = ''; }
          else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
          else if (c !== '\r') field += c;
        }
      }
      if (field !== '' || row.length) { row.push(field); rows.push(row); }
      return rows.filter(r => r.some(v => v !== ''));
    }

    // ---- page actions: active view publishes its toolbar buttons -> header renders them ----
    const _pgActs = { list: [], subs: new Set() };
    const setPageActions = (list) => { _pgActs.list = list || []; _pgActs.subs.forEach((cb) => cb()); };
    const usePageActions = () => {
      const [, force] = useState(0);
      useEffect(() => {
        const cb = () => force((n) => n + 1);
        _pgActs.subs.add(cb);
        return () => _pgActs.subs.delete(cb);
      }, []);
      return _pgActs.list;
    };

    // header slot — shows ONLY the active section's buttons (views clear on unmount)
    function HeaderPageActions() {
      const acts = usePageActions();
      if (!acts.length) return null;
      return (
        <>
          {acts.map((a, i) => (
            <button key={i} className={'hdr-act-btn' + (a.primary ? ' primary' : '')} title={a.label} onClick={a.onClick}>
              <i className={'fas ' + a.icon}></i><span>{a.label}</span>
            </button>
          ))}
          <span className="hdr-sep"></span>
        </>
      );
    }

    // ---- SWR: stale-while-revalidate cache (cache + dedupe + focus revalidate + mutate) ----
    const _swr = { data: new Map(), subs: new Map(), inflight: new Map(), loud: new Set(), fetchers: new Map(), globalSubs: new Set() };
    const swrNotify = (key) => { const s = _swr.subs.get(key); if (s) s.forEach((cb) => cb()); _swr.globalSubs.forEach((cb) => cb()); };

    // silent = background poll/wake: swaps the cache in without the top bar, and never surfaces its own errors
    const swrRevalidate = (key, fetcher, dedupeMs = 2000, silent) => {
      if (!key || !fetcher) return Promise.resolve();
      if (_swr.inflight.has(key)) return _swr.inflight.get(key);           // dedupe concurrent
      const cur = _swr.data.get(key);
      if (cur && cur.err == null && cur.ts && (Date.now() - cur.ts) < dedupeMs) return Promise.resolve(cur.data); // fresh enough
      if (!silent) _swr.loud.add(key);                                     // only loud reads drive the loading bar
      const settle = () => { _swr.inflight.delete(key); _swr.loud.delete(key); };
      const p = Promise.resolve().then(fetcher).then(
        (data) => { _swr.data.set(key, { data, err: null, ts: Date.now() }); settle(); swrNotify(key); return data; },
        (err)  => { const e = _swr.data.get(key) || {};
          // a silent poll that fails keeps the last good data and stays quiet; stale ts so the next tick retries
          _swr.data.set(key, silent && e.data !== undefined ? { data: e.data, err: null, ts: e.ts } : { data: e.data, err, ts: Date.now() });
          settle(); swrNotify(key); }
      );
      _swr.inflight.set(key, p);
      swrNotify(key);                                                       // flip isValidating
      return p;
    };

    // mutate(key): revalidate · mutate(key, data, false): set cache (data = value | fn), no refetch
    const swrMutate = (key, data, revalidate = true, fetcher) => {
      if (data !== undefined) {
        const e = _swr.data.get(key) || {};
        _swr.data.set(key, { data: typeof data === 'function' ? data(e.data) : data, err: null, ts: Date.now() });
        swrNotify(key);
      }
      const f = fetcher || _swr.fetchers.get(key);
      if (revalidate && f) return swrRevalidate(key, f, 0);
      return Promise.resolve();
    };

    // clear ALL cached data + refetch every live key — the "clear cache" action
    const swrClearAll = () => {
      _swr.data.clear(); _swr.inflight.clear(); _swr.loud.clear();
      const live = Array.from(_swr.subs.keys()).filter((k) => { const s = _swr.subs.get(k); return s && s.size; });
      live.forEach(swrNotify);                                              // mounted views → loading state
      return Promise.all(live.map((k) => { const f = _swr.fetchers.get(k); return f ? swrRevalidate(k, f, 0) : null; })); // refetch fresh
    };

    // one knob for the whole app — every section polls silently at this cadence
    const SWR_POLL_MS = 60000;
    const SWR_LIVE = { refreshInterval: SWR_POLL_MS };

    function useSWR(key, fetcher, opts) {
      opts = opts || {};
      const dedupeMs = opts.dedupeMs != null ? opts.dedupeMs : 2000;
      const refreshInterval = opts.refreshInterval != null ? opts.refreshInterval : SWR_POLL_MS; // pass 0 to opt a key out
      const revalidateOnFocus = opts.revalidateOnFocus !== false;
      const [, force] = useState(0);

      useEffect(() => {
        if (!key) return;
        const cb = () => force((n) => n + 1);
        let subs = _swr.subs.get(key); if (!subs) { subs = new Set(); _swr.subs.set(key, subs); }
        subs.add(cb);
        _swr.fetchers.set(key, fetcher);                                   // registry → global mutate(key)
        swrRevalidate(key, fetcher, dedupeMs);                             // revalidate on mount
        // background tick: never while the tab is hidden (wasted quota) or a write is mid-flight (would race the save)
        const tick = () => { if (document.hidden || _proc.n) return; swrRevalidate(key, fetcher, 0, true); };
        const iv = refreshInterval > 0 ? setInterval(tick, refreshInterval) : null;
        const onWake = () => { if (!document.hidden) swrRevalidate(key, fetcher, dedupeMs, true); }; // return to tab -> silent catch-up
        if (revalidateOnFocus) { window.addEventListener('focus', onWake); document.addEventListener('visibilitychange', onWake); }
        return () => {
          subs.delete(cb);
          if (iv) clearInterval(iv);
          if (revalidateOnFocus) { window.removeEventListener('focus', onWake); document.removeEventListener('visibilitychange', onWake); }
        };
      }, [key]);

      const entry = key ? _swr.data.get(key) : null;
      const data = entry ? entry.data : undefined;
      return {
        data,
        error: entry ? entry.err : null,
        isLoading: data === undefined && !(entry && entry.err),
        isValidating: !!_swr.inflight.get(key),
        mutate: (d, rev) => swrMutate(key, d, rev !== false, fetcher)
      };
    }

    // page registry — drives sidebar, header title, routing
    const PAGE_META = {
      dashboard:    { label:'Tổng quan',            icon:'fa-chart-pie',          group:'TỔNG QUAN' },
      ai:           { label:'Trợ lý AI',            icon:'fa-robot',              group:'TỔNG QUAN' },
      properties:   { label:'Bất động sản',         icon:'fa-building',           group:'CRM' },
      leads:        { label:'Khách hàng tiềm năng', icon:'fa-user-tag',           group:'CRM' },
      followups:    { label:'Chăm sóc khách hàng',  icon:'fa-bell',               group:'CRM' },
      appointments: { label:'Lịch hẹn',             icon:'fa-calendar-check',     group:'CRM' },
      deals:        { label:'Giao dịch',            icon:'fa-handshake',          group:'TÀI CHÍNH' },
      tenancies:    { label:'Hợp đồng thuê',        icon:'fa-house-user',         group:'TÀI CHÍNH' },
      agreements:   { label:'Hợp đồng & Biểu mẫu',  icon:'fa-file-contract',      group:'TÀI CHÍNH' },
      reports:      { label:'Báo cáo doanh số',     icon:'fa-chart-pie',          group:'TÀI CHÍNH' },
      owners:       { label:'Chủ sở hữu',           icon:'fa-user-tie',           group:'DANH MỤC' },
      locations:    { label:'Khu vực',              icon:'fa-map-location-dot',   group:'DANH MỤC' },
      amenities:    { label:'Tiện ích',             icon:'fa-list-check',         group:'DANH MỤC' },
      users:        { label:'Người dùng',           icon:'fa-users',              group:'HỆ THỐNG' },
      settings:     { label:'Cài đặt',              icon:'fa-cog',                group:'HỆ THỐNG' },
      logs:         { label:'Nhật ký hoạt động',    icon:'fa-clock-rotate-left',  group:'HỆ THỐNG' },
      trash:        { label:'Thùng rác',            icon:'fa-trash-arrow-up',     group:'HỆ THỐNG' },
      permissions:  { label:'Phân quyền',           icon:'fa-user-shield',        group:'HỆ THỐNG' },
      account:      { label:'Tài khoản của tôi',    icon:'fa-user-circle',        group:'HỆ THỐNG' },
      about:        { label:'Thông tin hệ thống',   icon:'fa-circle-info',        group:'HỆ THỐNG' }
    };
    const PAGE_GROUPS = ['TỔNG QUAN', 'CRM', 'TÀI CHÍNH', 'DANH MỤC', 'HỆ THỐNG'];
    const ALWAYS_PAGES = ['account', 'about']; // every signed-in user

    // can(perms, page, perm)  perm = 'v'(default)|'a'|'e'|'d'
    const can = (perms, page, perm) => !!(perms && perms[page] && perms[page][perm || 'v']);
    const scopeAll = (role) => role === 'Admin' || role === 'Manager'; // Own-vs-All (mirrors backend)

    // ---- CRM shared: enums, formatters, badges ----
    const { useCallback, useDeferredValue } = React;
    const ENUMS = {
      propertyType: ['House','Flat','Upper Portion','Lower Portion','Farm House','Plot','Commercial Plot','Shop','Office','Warehouse','Building'],
      listingType: ['Sale','Rent'],
      propertyStatus: ['Draft','Available','Reserved','Sold','Rented','Withdrawn'],
      rentFrequency: ['Monthly','Yearly'],
      areaUnit: ['Sq M'],
      locationLevel: ['City','Area','Society'],
      leadSource: ['Website','Zalo','Facebook','Walk-in','Referral','Phone Call','Other'],
      interestType: ['Buy','Rent','Sell','Rent Out'],
      leadStatus: ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost'],
      followUpType: ['Call','Zalo','Email','Meeting','Note'],
      followUpStatus: ['Pending','Completed','Cancelled'],
      appointmentStatus: ['Scheduled','Confirmed','Completed','Cancelled','No Show'],
      dealStatus: ['Token','Agreement','Completed','Cancelled'],
      paymentMethod: ['Cash','Bank Transfer','Cheque','Online'],
      tenancyStatus: ['Active','Ended'],
      expenseCategory: ['Maintenance','Marketing','Legal','Utility','Other'],
      interestLevel: ['Hot','Warm','Cold'],
      offerStatus: ['Open','Countered','Accepted','Rejected'],
      offerBy: ['Buyer','Seller']
    };
    const VI_ENUM_LABELS = {
      House:'Nhà', Flat:'Căn hộ', 'Upper Portion':'Tầng trên', 'Lower Portion':'Tầng dưới', 'Farm House':'Nhà vườn', Plot:'Đất nền',
      'Commercial Plot':'Đất thương mại', Shop:'Cửa hàng', Office:'Văn phòng', Warehouse:'Kho', Building:'Tòa nhà',
      Sale:'Bán', Rent:'Thuê', Draft:'Bản nháp', Available:'Còn trống', Reserved:'Đã giữ chỗ', Sold:'Đã bán', Rented:'Đã cho thuê', Withdrawn:'Đã rút',
      Monthly:'Hàng tháng', Yearly:'Hàng năm', City:'Thành phố', Area:'Khu vực', Society:'Khu đô thị',
      Website:'Trang web', 'Walk-in':'Khách trực tiếp', Referral:'Giới thiệu', 'Phone Call':'Cuộc gọi', Other:'Khác',
      Buy:'Mua', Sell:'Bán', 'Rent Out':'Cho thuê', New:'Mới', Contacted:'Đã liên hệ', Qualified:'Đủ điều kiện',
      'Viewing Scheduled':'Đã lên lịch xem', Negotiating:'Đang thương lượng', Won:'Thành công', Lost:'Thất bại',
      Call:'Cuộc gọi', Meeting:'Cuộc họp', Note:'Ghi chú', Pending:'Đang chờ', Completed:'Hoàn thành', Cancelled:'Đã hủy',
      Scheduled:'Đã lên lịch', Confirmed:'Đã xác nhận', 'No Show':'Không đến', Token:'Đặt cọc', Agreement:'Hợp đồng',
      Cash:'Tiền mặt', 'Bank Transfer':'Chuyển khoản', Cheque:'Séc', Online:'Trực tuyến', Active:'Đang hoạt động', Ended:'Đã kết thúc', Inactive:'Ngừng hoạt động',
      Maintenance:'Bảo trì', Marketing:'Tiếp thị', Legal:'Pháp lý', Utility:'Tiện ích', Hot:'Nóng', Warm:'Ấm', Cold:'Lạnh',
      Open:'Đang mở', Countered:'Đã trả giá', Accepted:'Đã chấp nhận', Rejected:'Đã từ chối', Buyer:'Người mua', Seller:'Người bán',
      Admin:'Quản trị viên', Manager:'Quản lý', Agent:'Nhân viên', Unassigned:'Chưa phân công', Upcoming:'Sắp tới', 'Due Now':'Đến hạn'
    };
    const viEnum = (v) => VI_ENUM_LABELS[v] || (v === 'Sq M' ? 'm²' : v);
    const r2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100; // money — same 2dp half-up rule as the backend
    const opts = (arr) => arr.map((v) => ({ value: v, label: viEnum(v) }));
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
    const fmtPKR = (n) => Number(n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫';
    const pkrShort = (n) => { n = Number(n) || 0;
      if (Math.abs(n) >= 1e9) return (Math.round(n / 1e7) / 100).toLocaleString('vi-VN') + ' tỷ';
      if (Math.abs(n) >= 1e6) return (Math.round(n / 1e4) / 100).toLocaleString('vi-VN') + ' triệu';
      return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' ₫'; };
    const fmtArea = (size, unit) => Number(size || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' ' + (unit === 'Sq M' ? 'm²' : (unit || 'm²'));
    const fmtDate = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { month: 'short', day: '2-digit', year: 'numeric' }); };
    const fmtDT = (v) => { if (!v) return '—'; const d = new Date(v); return isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); };
    const dtLocal = (v) => { if (!v) return ''; const d = new Date(v); if (isNaN(d.getTime())) return ''; const p = (x) => String(x).padStart(2, '0');
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
    const isOverdue = (f) => f.status === 'Pending' && f.dueAt && new Date(f.dueAt) < new Date(); // derived — never stored
    const isDueToday = (f) => f.status === 'Pending' && f.dueAt && new Date(f.dueAt).toDateString() === new Date().toDateString();

    const STATUS_TINT = {
      Draft: 'st-gray', Available: 'st-green', Reserved: 'st-orange', Sold: 'st-purple', Rented: 'st-teal', Withdrawn: 'st-red',
      New: 'st-blue', Contacted: 'st-navy', Qualified: 'st-teal', 'Viewing Scheduled': 'st-amber', Negotiating: 'st-orange', Won: 'st-green', Lost: 'st-red',
      Pending: 'st-amber', Completed: 'st-green', Cancelled: 'st-gray',
      Scheduled: 'st-blue', Confirmed: 'st-teal', 'No Show': 'st-red',
      Overdue: 'st-red', Active: 'st-green', Inactive: 'st-red', Sale: 'st-navy', Rent: 'st-teal',
      Token: 'st-amber', Agreement: 'st-blue', Ended: 'st-gray',
      Open: 'st-blue', Countered: 'st-orange', Accepted: 'st-green', Rejected: 'st-red',
      Hot: 'st-red', Warm: 'st-amber', Cold: 'st-blue', Fixed: 'st-green', Paid: 'st-green', Payable: 'st-amber'
    };
    const badge = (s) => '<span class="status-badge ' + (STATUS_TINT[s] || 'st-gray') + '">' + esc(viEnum(s) || '—') + '</span>'; // dt render
    const Badge = ({ s }) => <span className={'status-badge ' + (STATUS_TINT[s] || 'st-gray')}>{viEnum(s) || '—'}</span>;
    const roleBadge = (r) => '<span class="role-badge role-' + String(r || '').toLowerCase() + '">' + esc(viEnum(r)) + '</span>';

    // ---- chevron pipeline (the SOLE status filter — status never sits in .filters-grid) ----
    const STAGE_COLORS = {
      Draft: '#6c757d', Available: '#2a9d8f', Reserved: '#e07b00', Sold: '#6a1b9a', Rented: '#00695c', Withdrawn: '#c0392b',
      New: '#0074D9', Contacted: '#123a63', Qualified: '#00897b', 'Viewing Scheduled': '#e6a700', Negotiating: '#e07b00', Won: '#2e7d32', Lost: '#c0392b',
      Pending: '#e6a700', Completed: '#2e7d32', Cancelled: '#6c757d',
      Scheduled: '#0074D9', Confirmed: '#00897b', 'No Show': '#c0392b',
      'Due Now': '#c0392b', Upcoming: '#0074D9', Unassigned: '#6a1b9a',
      Token: '#e6a700', Agreement: '#0074D9', Active: '#2e7d32', Ended: '#6c757d',
      Open: '#0074D9', Countered: '#e07b00', Accepted: '#2e7d32', Rejected: '#c0392b'
    };
    function Pipeline({ stages, counts, active, onPick, total }) {
      return (
        <div className="pipeline-stages">
          <div className={'pipeline-stage' + (!active ? ' active' : '')} style={{ background: 'var(--navy-primary)' }} onClick={() => onPick('')}>
            <span className="pipeline-stage-name">Tất cả</span><span className="pipeline-stage-count">({total})</span>
          </div>
          {stages.map((s) => {
            const c = counts[s] || 0;
            return (
              <div key={s} className={'pipeline-stage' + (active === s ? ' active' : '') + (c === 0 ? ' pipeline-empty' : '')}
                   style={{ background: STAGE_COLORS[s] || '#6c757d' }} onClick={() => onPick(s)}>
                <span className="pipeline-stage-name">{viEnum(s)}</span><span className="pipeline-stage-count">({c})</span>
              </div>
            );
          })}
        </div>
      );
    }

    // ---- top loading bar: action-controlled + app-wide SWR-driven ----
    function TopLoadingBar({ active }) { return active ? <div className="top-loadbar"><span></span></div> : null; }
    function GlobalLoadingBar() {
      const [, force] = useState(0);
      useEffect(() => { const cb = () => force((n) => n + 1); _swr.globalSubs.add(cb); return () => { _swr.globalSubs.delete(cb); }; }, []);
      return _swr.loud.size ? <div className="top-loadbar"><span></span></div> : null; // silent polls stay off the bar
    }

    // ---- Chart.js wrapper (destroy-safe) ----
    function ChartCanvas({ type, data, options, height }) {
      const ref = useRef(null), inst = useRef(null);
      const key = JSON.stringify(data);
      useEffect(() => {
        if (!ref.current || !window.Chart) return;
        if (inst.current) { inst.current.destroy(); inst.current = null; }
        inst.current = new Chart(ref.current, { type, data, options: Object.assign({ responsive: true, maintainAspectRatio: false }, options || {}) });
        return () => { if (inst.current) { inst.current.destroy(); inst.current = null; } };
      }, [key, type]);
      return <div style={{ height: height || 260, position: 'relative' }}><canvas ref={ref}></canvas></div>;
    }

    // ---- searchable dropdown (single) — plain <select> is banned ----
    const DropdownItem = React.memo(function DropdownItem({ option, selected, onSelect }) {
      return (
        <div className={`searchable-dropdown-item ${selected ? 'selected' : ''}`} onClick={() => onSelect(option)}>
          {option.label}
        </div>
      );
    });

    function SearchableDropdown({ options, value, onChange, placeholder = 'Select...', label, icon, required = false }) {
      const [isOpen, setIsOpen] = useState(false);
      const [search, setSearch] = useState('');
      const dropdownRef = useRef(null);
      const selectedLabel = (options.find((o) => o.value === value) || {}).label || '';
      const optIdx = useMemo(() => options.map((o) => ({ o, k: String(o.label).toLowerCase() })), [options]);
      const dq = useDeferredValue(search).toLowerCase();
      const filtered = useMemo(() => optIdx.filter((x) => x.k.includes(dq)).map((x) => x.o), [optIdx, dq]);

      useEffect(() => {
        const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) { setIsOpen(false); setSearch(''); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

      const handleSelect = useCallback((option) => { onChange(option.value); setIsOpen(false); setSearch(''); }, [onChange]);

      return (
        <div className="form-group">
          {label && <label>{icon && <i className={icon}></i>} {label}{required && ' *'}</label>}
          <div className="searchable-dropdown" ref={dropdownRef}>
            <input type="text" className="searchable-dropdown-input" placeholder={placeholder}
                   value={isOpen ? search : selectedLabel}
                   onChange={(e) => { setSearch(e.target.value); if (!isOpen) setIsOpen(true); }}
                   onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(''); }}
                   required={required && !value} />
            <span className={`searchable-dropdown-arrow ${isOpen ? 'open' : ''}`}><i className="fas fa-chevron-down"></i></span>
            {isOpen && (
              <div className="searchable-dropdown-list">
                <div className={`searchable-dropdown-item ${!value ? 'selected' : ''}`} onClick={() => handleSelect({ value: '', label: '' })}>
                  {placeholder}
                </div>
                {filtered.length > 0 ? (
                  filtered.map((option) => (
                    <DropdownItem key={option.value} option={option} selected={value === option.value} onSelect={handleSelect} />
                  ))
                ) : (
                  <div className="searchable-dropdown-item no-results">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ---- searchable multi-select (tags) ----
    const MultiItem = React.memo(function MultiItem({ option, checked, onToggle }) {
      return (
        <div className={`searchable-dropdown-item ${checked ? 'checked' : ''}`} onClick={() => onToggle(option.value)}>
          {option.label}
        </div>
      );
    });

    function SearchableMultiSelect({ options, values = [], onChange, placeholder = 'Select...', label, icon, required = false }) {
      const [isOpen, setIsOpen] = useState(false);
      const [search, setSearch] = useState('');
      const dropdownRef = useRef(null);
      const sel = useMemo(() => new Set(values), [values]);
      const selectedLabels = useMemo(() => options.filter((o) => sel.has(o.value)), [options, sel]);
      const optIdx = useMemo(() => options.map((o) => ({ o, k: String(o.label).toLowerCase() })), [options]);
      const dq = useDeferredValue(search).toLowerCase();
      const filtered = useMemo(() => optIdx.filter((x) => x.k.includes(dq)).map((x) => x.o), [optIdx, dq]);

      useEffect(() => {
        const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) { setIsOpen(false); setSearch(''); } };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }, []);

      const toggleOption = useCallback((optionValue) => {
        onChange(sel.has(optionValue) ? values.filter((v) => v !== optionValue) : [...values, optionValue]);
      }, [values, sel, onChange]);

      return (
        <div className="form-group">
          {label && <label>{icon && <i className={icon}></i>} {label}{required && ' *'}</label>}
          {selectedLabels.length > 0 && (
            <div className="searchable-multi-tags">
              {selectedLabels.map((o, i) => (
                <span key={i} className="searchable-multi-tag">
                  {o.label}
                  <button type="button" className="searchable-multi-tag-remove" onClick={() => onChange(values.filter((v) => v !== o.value))}><i className="fas fa-times"></i></button>
                </span>
              ))}
            </div>
          )}
          <div className="searchable-dropdown" ref={dropdownRef}>
            <input type="text" className="searchable-dropdown-input"
                   placeholder={values.length > 0 ? `${values.length} selected` : placeholder}
                   value={isOpen ? search : ''}
                   onChange={(e) => { setSearch(e.target.value); if (!isOpen) setIsOpen(true); }}
                   onClick={() => { setIsOpen(!isOpen); if (!isOpen) setSearch(''); }}
                   required={required && values.length === 0} />
            <span className={`searchable-dropdown-arrow ${isOpen ? 'open' : ''}`}><i className="fas fa-chevron-down"></i></span>
            {isOpen && (
              <div className="searchable-dropdown-list">
                {filtered.length > 0 ? (
                  filtered.map((option) => (
                    <MultiItem key={option.value} option={option} checked={sel.has(option.value)} onToggle={toggleOption} />
                  ))
                ) : (
                  <div className="searchable-dropdown-item no-results">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // ---- shared lookups (locations/amenities/agents) — one SWR key, every form reuses it ----
    const useLookups = (currentUser) => {
      const { data } = useSWR(currentUser ? 'lookups' : null, () => gsRun('getLookups', currentUser), SWR_LIVE);
      return data && data.success ? data : { locations: [], amenities: [], agents: [] };
    };
    const locPathClient = (locs) => { const by = {}; locs.forEach((l) => { by[l.id] = l; });
      return (id) => { const out = []; let cur = by[id], g = 0; while (cur && g++ < 5) { out.unshift(cur.name); cur = by[cur.parentId]; } return out.join(' › '); }; };

    // ---- csv download + import flow (confirm -> bulkImportXxx -> refetch -> result popup) ----
    const downloadCSV = (name, content) => {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    };
    const importCSVFile = (file, requiredHeader, backendFn, currentUser, onDone) => {
      file.text().then((text) => {
        const rows = parseCSV(text);
        if (rows.length < 2) return Swal.fire({ icon: 'error', title: 'Empty CSV', text: 'File has no data rows.' });
        const headers = rows[0].map((h) => String(h || '').replace(/^﻿/, '').trim());
        if (headers.indexOf(requiredHeader) === -1)
          return Swal.fire({ icon: 'error', title: 'Wrong file format', text: 'Column "' + requiredHeader + '" not found — download the Template first.' });
        const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] != null ? r[i] : ''])));
        Swal.fire({ icon: 'question', title: 'Import ' + records.length + ' rows?', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Import' }).then((cf) => {
          if (!cf.isConfirmed) return;
          gsRun(backendFn, records, currentUser).then((res) => {
            if (res && res.success) {
              (res.errors || []).forEach((er) => console.warn('[import skipped]', er));
              Swal.fire({ icon: 'success', title: res.count + ' imported, ' + (res.errors || []).length + ' skipped', timer: 2500, showConfirmButton: false });
              onDone && onDone();
            } else Swal.fire({ icon: 'error', title: 'Import failed', text: (res && res.message) || 'Unknown error' });
          }).catch((e) => Swal.fire({ icon: 'error', title: 'Import failed', text: String((e && e.message) || e) }));
        });
      });
    };

    const DT_VI_LANGUAGE = {
      emptyTable: 'Không có dữ liệu trong bảng',
      zeroRecords: 'Không tìm thấy dữ liệu phù hợp',
      info: 'Hiển thị _START_ đến _END_ trong _TOTAL_ dòng',
      infoEmpty: 'Hiển thị 0 đến 0 trong 0 dòng',
      infoFiltered: '(lọc từ _MAX_ dòng)',
      lengthMenu: 'Hiển thị _MENU_ dòng',
      search: 'Tìm kiếm:',
      loadingRecords: 'Đang tải dữ liệu…',
      processing: 'Đang xử lý…',
      paginate: { first: 'Đầu', last: 'Cuối', next: 'Tiếp theo', previous: 'Trước' }
    };

    // ---- shared DataTable lifecycle: destroy -> empty -> 150ms -> init + .action-icon delegation ----
    // extraDeps: values buildConfig closes over (perm flags) — rebuild when they change, not only on rows
    function useDataTable(tableId, rows, buildConfig, onAction, extraDeps, onRowDoubleClick) {
      const tableRef = useRef(null);
      const sigRef = useRef({ data: '', deps: null }); // last rendered signature — refresh with identical data = no-op
      const actionRef = useRef(onAction);
      const doubleClickRef = useRef(onRowDoubleClick);
      actionRef.current = onAction; // row clicks always see the latest closure
      doubleClickRef.current = onRowDoubleClick;
      useEffect(() => () => { if (tableRef.current) { try { tableRef.current.destroy(); tableRef.current = null; } catch (e) {} } }, []); // destroy on unmount ONLY
      useEffect(() => {
        if (!rows) return;
        const dataSig = JSON.stringify(rows), depsSig = (extraDeps || []).join('|');
        if (tableRef.current && dataSig === sigRef.current.data && depsSig === sigRef.current.deps) return; // background refresh, same data -> untouched
        const sameCols = !!tableRef.current && depsSig === sigRef.current.deps;
        sigRef.current = { data: dataSig, deps: depsSig };
        if (sameCols) { // data-only change -> in-place swap: keeps page/search/order/scroll, zero flash
          try { tableRef.current.clear(); tableRef.current.rows.add(rows); tableRef.current.draw(false); return; } catch (e) {}
        }
        if (tableRef.current) { try { tableRef.current.destroy(); tableRef.current = null; $('#' + tableId).empty(); } catch (e) {} }
        const t = setTimeout(() => {
          try {
            const table = $('#' + tableId).DataTable(Object.assign({
              data: rows, destroy: true, pageLength: 10,
              lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
              language: DT_VI_LANGUAGE,
              responsive: true,
              dom: 'lfrtip', // no B — export buttons live in the page header, fired via API
              columnDefs: [{ targets: '_all', defaultContent: '' }], // json-row schema drift: missing keys render blank, never warn (tn/4)
              buttons: [
                { extend: 'csv',   text: 'CSV',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'pdf',   text: 'PDF',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'print', text: 'Print', exportOptions: { columns: ':not(:last-child)' } }
              ]
            }, buildConfig()));
            $('#' + tableId).off('click', '.action-icon, .table-record-link');
            $('#' + tableId).on('click', '.action-icon, .table-record-link', function () {
              const rowData = table.row($(this).parents('tr')).data();
              if (rowData) actionRef.current($(this).data('action'), rowData);
            });
            $('#' + tableId).off('dblclick', 'tbody tr');
            if (doubleClickRef.current) $('#' + tableId).on('dblclick', 'tbody tr', function (event) {
              if ($(event.target).closest('button, a, input, select, textarea, label, .action-icon, .table-record-link').length) return;
              const rowData = table.row(this).data();
              if (rowData && doubleClickRef.current) doubleClickRef.current(rowData);
            });
            tableRef.current = table;
          } catch (e) { console.error('DataTable init error:', e); }
        }, 150);
        return () => clearTimeout(t);
      }, [rows].concat(extraDeps || []));
      return tableRef;
    }

    // ---- KPI helper row ----
    const KpiRow = ({ items }) => (
      <div className="lte-kpi-grid">
        {items.map(([v, l, ic, c], i) => <SmallBox key={i} value={v} label={l} icon={ic} color={c} />)}
      </div>
    );

    // ---- first-run tour — once per user ----
    function TourModal({ onClose, role }) {
      const [step, setStep] = useState(0);
      const steps = [
        { icon: 'fa-building', t: 'Quản lý nguồn hàng', d: 'Thêm tin đăng cùng hình ảnh, tiện ích, khu vực và thông tin chủ sở hữu. Chỉ cần thay đổi trạng thái để xuất bản lên cổng thông tin công khai.' },
        { icon: 'fa-user-tag', t: 'Quy trình khách hàng và chào giá', d: 'Mọi yêu cầu từ website được tự động chuyển vào đây. Ghi nhận các mức chào giá trong quá trình thương lượng, sau đó chuyển đề nghị được chấp nhận thành giao dịch.' },
        { icon: 'fa-handshake', t: 'Giao dịch và hoa hồng', d: 'Theo dõi từ lúc đặt cọc đến khi hoàn tất với phần tính toán trực tiếp: thanh toán, phân chia hoa hồng và khoản chi trả cho nhân viên theo từng giao dịch.' },
        { icon: 'fa-house-user', t: 'Quản lý cho thuê', d: 'Khi giao dịch thuê hoàn tất, hệ thống tự động tạo hợp đồng thuê. Bạn có thể thu tiền hàng tháng, gia hạn bằng một thao tác và quyết toán tiền cọc khi kết thúc.' },
        scopeAll(role)
          ? { icon: 'fa-chart-pie', t: 'Báo cáo và chi trả', d: 'Chín báo cáo dùng chung một bộ chọn thời gian, bao gồm doanh số, chuyển đổi, tuổi nguồn hàng, tiền thuê, hoa hồng phải trả và mục tiêu nhân viên.' }
          : { icon: 'fa-globe', t: 'Cổng thông tin công khai', d: 'Khách truy cập có thể xem và gửi yêu cầu mà không cần đăng nhập. Thông tin liên hệ của nhân viên được giữ riêng tư và mọi tương tác đều trở thành khách hàng tiềm năng.' }
      ];
      const s = steps[step];
      return (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 430 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '30px 26px 20px' }}>
              <div className="tour-ico"><i className={`fas ${s.icon}`}></i></div>
              <h3 style={{ color: 'var(--navy-primary)', margin: '14px 0 8px' }}>{s.t}</h3>
              <p style={{ color: '#666', fontSize: 13.5, lineHeight: 1.6 }}>{s.d}</p>
              <div className="tour-dots">{steps.map((_, i) => <span key={i} className={i === step ? 'on' : ''} onClick={() => setStep(i)}></span>)}</div>
            </div>
            <div className="form-actions" style={{ justifyContent: 'space-between', marginTop: 0, padding: '0 26px 24px' }}>
              <button className="btn btn-secondary" onClick={onClose}>Bỏ qua</button>
              {step < steps.length - 1
                ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Tiếp theo <i className="fas fa-arrow-right"></i></button>
                : <button className="btn btn-success" onClick={onClose}><i className="fas fa-check"></i> Bắt đầu sử dụng</button>}
            </div>
          </div>
        </div>
      );
    }

    // ============== No Access View ==============
    function NoAccessView() {
      return (
        <div className="data-section" style={{textAlign:'center', padding:'50px 20px'}}>
          <i className="fas fa-lock" style={{fontSize:'42px', color:'#ea4335', marginBottom:'14px'}}></i>
          <h2 style={{color:'var(--navy-primary)', marginBottom:'8px'}}>Access Denied</h2>
          <p style={{color:'#666'}}>You don't have permission to view this page.</p>
        </div>
      );
    }

    // ============== Skeleton Components ==============
    function TableSkeleton({ rows = 5, columns = 6 }) {
      return (
        <div className="skeleton-table">
          <div className="skeleton-table-row">
            {[...Array(columns)].map((_, i) => (
              <div key={i} className="skeleton skeleton-table-cell" style={{flex: 1}}></div>
            ))}
          </div>
          {[...Array(rows)].map((_, r) => (
            <div key={r} className="skeleton-table-row">
              {[...Array(columns)].map((_, c) => (
                <div key={c} className="skeleton skeleton-table-cell" style={{flex: 1}}></div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    function useAgencyBranding() {
      const { data: portalResponse, error } = useSWR('portal', () => gsRun('getPublicPortal'), SWR_LIVE);
      const branding = portalResponse && portalResponse.success && portalResponse.branding
        ? portalResponse.branding
        : {};
      return { branding, loading: !portalResponse && !error };
    }

    function ZaloIcon({ size = 18, style }) {
      return (
        <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle', ...style }}>
          <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" />
          <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" />
          <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
        </svg>
      );
    }

    function BrandLogo({ logo, className = '', alt = 'Logo công ty' }) {
      const [failed, setFailed] = useState(false);
      useEffect(() => setFailed(false), [logo]);
      if (logo && !failed) {
        return <img src={logo} alt={alt} className={className} onError={() => setFailed(true)} />;
      }
      return <div className={`${className} brand-logo-placeholder`} role="img" aria-label={alt}><i className="fas fa-building"></i></div>;
    }

    // ============== Login Page (staff only — public visitors stay on the portal) ==============
    function LoginPage({ onLogin, onBack }) {
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [showPassword, setShowPassword] = useState(false);
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);
      const { branding, loading: brandingLoading } = useAgencyBranding();
      const agencyName = branding.name || (brandingLoading ? 'Đang tải…' : 'Hệ thống CRM');

      const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        google.script.run
          .withSuccessHandler((result) => {
            setLoading(false);
            if (result.success) {
              onLogin(result.username, result.role, result.email, result.profileImage, result.themeMode, result.customColors, result.permissions, result.canEditRbac, result.authSession);
            } else {
              setError(result.message);
            }
          })
          .withFailureHandler((err) => {
            setLoading(false);
            setError('Không thể kết nối hệ thống: ' + err.message);
          })
          .authenticateUser(username, password);
      };

      return (
        <div className="login-container">
          <div className="login-shell">
            <section className="login-showcase" aria-label="Giới thiệu hệ thống">
              <div className="login-brand">
                <BrandLogo logo={branding.logo} className="login-brand-logo" />
                <div>
                  <div className="login-brand-name">{agencyName}</div>
                  <div className="login-brand-note">{branding.slogan || 'Nền tảng quản trị bất động sản'}</div>
                </div>
              </div>

              <div className="login-showcase-copy">
                <div className="login-eyebrow"><i className="fas fa-sparkles"></i> Vận hành thông minh</div>
                <h1>Một hệ thống.<br/>Toàn bộ hoạt động kinh doanh.</h1>
                <p>Quản lý nguồn hàng, khách hàng, lịch chăm sóc và tài chính trên một nền tảng bảo mật, tập trung.</p>
              </div>

              <div className="login-benefits">
                <div className="login-benefit">
                  <div className="login-benefit-icon"><i className="fas fa-chart-line"></i></div>
                  <div><strong>Số liệu theo thời gian thực</strong><span>Theo dõi hiệu suất và dòng tiền chính xác.</span></div>
                </div>
                <div className="login-benefit">
                  <div className="login-benefit-icon"><i className="fas fa-shield-halved"></i></div>
                  <div><strong>Phân quyền bảo mật</strong><span>Mỗi vai trò chỉ truy cập đúng phạm vi công việc.</span></div>
                </div>
                <div className="login-benefit">
                  <div className="login-benefit-icon"><i className="fas fa-database"></i></div>
                  <div><strong>Dữ liệu tập trung</strong><span>Đồng bộ an toàn trên nền tảng Supabase.</span></div>
                </div>
              </div>
            </section>

            <section className="login-box">
              <div className="login-access-badge">Truy cập nội bộ</div>
              <h2>Chào mừng trở lại</h2>
              <p className="login-subtitle">Đăng nhập bằng tài khoản được cấp để tiếp tục vào hệ thống CRM.</p>
              <form onSubmit={handleSubmit}>
                <div className="login-field">
                  <label htmlFor="staff-username">Tên đăng nhập</label>
                  <div className="login-input-wrap">
                    <i className="fas fa-user"></i>
                    <input id="staff-username" type="text" value={username}
                      onChange={(e) => { setUsername(e.target.value); if (error) setError(''); }}
                      required autoComplete="username" placeholder="Nhập tên đăng nhập" autoFocus />
                  </div>
                </div>
                <div className="login-field">
                  <label htmlFor="staff-password">Mật khẩu</label>
                  <div className="login-input-wrap">
                    <i className="fas fa-lock"></i>
                    <input id="staff-password" type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                      required autoComplete="current-password" placeholder="Nhập mật khẩu" />
                    <button type="button" className="login-password-toggle" onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                      <i className={'fas ' + (showPassword ? 'fa-eye-slash' : 'fa-eye')}></i>
                    </button>
                  </div>
                </div>
                {error && <div className="login-error" role="alert"><i className="fas fa-circle-exclamation"></i><span>{error}</span></div>}
                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? <><i className="fas fa-spinner fa-spin"></i> Đang đăng nhập…</> : <><i className="fas fa-arrow-right-to-bracket"></i> Đăng nhập an toàn</>}
                </button>
              </form>
              {onBack && <button type="button" className="login-back" onClick={onBack}><i className="fas fa-arrow-left"></i> Quay lại cổng bất động sản</button>}
              <div className="login-security"><i className="fas fa-lock"></i> Kết nối được mã hóa và kiểm soát truy cập</div>
            </section>
          </div>
        </div>
      );
    }

    // ============== Sidebar Component ==============
    function Sidebar({ activeMenu, setActiveMenu, role, user, profileImage, themeMode, onThemeToggle, onLogout, collapsed, setCollapsed, showMobile, setShowMobile, perms, canEditRbac }) {
      const { branding } = useAgencyBranding();
      const menuVisible = (k) => {
        if (ALWAYS_PAGES.indexOf(k) !== -1) return true;
        if (k === 'permissions') return !!canEditRbac;
        if (role === 'Admin') return true; // Admin ALWAYS sees every option — immune to a stale cached session
        return can(perms, k, 'v');
      };
      const go = (k) => { setActiveMenu(k); setShowMobile(false); };

      return (
        <>
          <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${showMobile ? 'show-mobile' : ''}`}>
            <button className="sidebar-close-btn" onClick={() => setShowMobile(false)}>
              <i className="fas fa-times"></i>
            </button>

            <div className="sidebar-header">
              <div className="sidebar-title">
                <i className="fas fa-city"></i>
                <span>{branding.name || 'Hệ thống CRM'}</span>
              </div>
              <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                <i className={`fas fa-${collapsed ? 'angle-right' : 'angle-left'}`}></i>
              </button>
            </div>

            <div className="sidebar-user-info">
              <div className="sidebar-profile-image">
                <BrandLogo logo={branding.logo || profileImage} alt="Ảnh đại diện" />
              </div>
              <div className="sidebar-user-name">{user}</div>
              <div className="sidebar-user-role">{role}</div>
            </div>

            <div className="sidebar-menu-section">
              {PAGE_GROUPS.map(grp => {
                const items = Object.keys(PAGE_META).filter(k => PAGE_META[k].group === grp && menuVisible(k));
                if (!items.length) return null;
                return (
                  <div className="sidebar-menu-group" key={grp}>
                    <div className="sidebar-menu-title">{grp}</div>
                    <ul className="sidebar-menu">
                      {items.map(k => (
                        <li key={k}>
                          <button className={activeMenu === k ? 'active' : ''} onClick={() => go(k)}>
                            <i className={`fas ${PAGE_META[k].icon}`}></i>
                            <span>{PAGE_META[k].label}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            <div className="sidebar-theme-toggle">
              <button onClick={onThemeToggle} title={`Switch to ${themeMode === 'light' ? 'Dark' : 'Light'} Mode`}>
                <i className={`fas fa-${themeMode === 'light' ? 'moon' : 'sun'}`}></i>
                <span>{themeMode === 'light' ? 'Dark' : 'Light'} Mode</span>
              </button>
            </div>

            <div className="sidebar-logout">
              <button onClick={onLogout}>
                <i className="fas fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      );
    }

    // ============== Mobile Modules Hub (Trang Trung Tâm Phân Hệ Toàn Màn Hình) ==============
    function MobileModulesHub({ isOpen, onClose, activeMenu, setActiveMenu, role, user, profileImage, themeMode, onThemeToggle, onLogout, perms, canEditRbac, pinnedTabs, onTogglePin }) {
      if (!isOpen) return null;
      const { branding } = useAgencyBranding();

      const menuVisible = (k) => {
        if (ALWAYS_PAGES.indexOf(k) !== -1) return true;
        if (k === 'permissions') return !!canEditRbac;
        if (role === 'Admin') return true;
        return can(perms, k, 'v');
      };

      const go = (k) => {
        setActiveMenu(k);
        onClose();
      };

      const groupColors = {
        'TỔNG QUAN': { bg: '#e0f2fe', color: '#0369a1' },
        'CRM': { bg: '#f0fdf4', color: '#15803d' },
        'TÀI CHÍNH': { bg: '#fef3c7', color: '#b45309' },
        'DANH MỤC': { bg: '#fae8ff', color: '#a21caf' },
        'HỆ THỐNG': { bg: '#f1f5f9', color: '#334155' }
      };

      return (
        <div className="mob-hub-overlay">
          <div className="mob-hub-container">
            {/* Header Hub */}
            <div className="mob-hub-header">
              <div className="mob-hub-user">
                <div className="mob-hub-avatar">
                  <BrandLogo logo={branding.logo || profileImage} alt="Avatar" />
                </div>
                <div className="mob-hub-user-info">
                  <div className="mob-hub-name">{user}</div>
                  <div className="mob-hub-role-badge">{role === 'Admin' ? 'Quản Trị Viên' : (role === 'Manager' ? 'Quản Lý' : 'Nhân Viên')}</div>
                </div>
              </div>
              <button className="mob-hub-close-btn" onClick={onClose} aria-label="Đóng">
                <i className="fas fa-times"></i>
              </button>
            </div>



            {/* All Modules Grouped */}
            <div className="mob-hub-modules-scroll">
              {PAGE_GROUPS.map((grp) => {
                const items = Object.keys(PAGE_META).filter((k) => PAGE_META[k].group === grp && menuVisible(k));
                if (!items.length) return null;
                const gColor = groupColors[grp] || { bg: '#f1f5f9', color: '#475569' };

                return (
                  <div className="mob-hub-group" key={grp}>
                    <div className="mob-hub-group-header">
                      <span className="mob-hub-group-title">{grp}</span>
                      <span className="mob-hub-group-count">{items.length} mục</span>
                    </div>

                    <div className="mob-hub-grid">
                      {items.map((k) => {
                        const meta = PAGE_META[k];
                        const isPinned = pinnedTabs.includes(k);
                        const isActive = activeMenu === k;

                        return (
                          <div
                            key={k}
                            className={`mob-hub-card ${isActive ? 'active' : ''}`}
                            onClick={() => go(k)}
                          >
                            <div className="mob-hub-card-top">
                              <div className="mob-hub-card-icon" style={{ background: gColor.bg, color: gColor.color }}>
                                <i className={`fas ${meta.icon}`}></i>
                              </div>
                              <button
                                className={`mob-hub-pin-toggle ${isPinned ? 'pinned' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePin(k);
                                }}
                                title={isPinned ? 'Đã ghim - Bấm để bỏ ghim' : 'Bấm để ghim vào thanh đáy'}
                              >
                                <i className={`fas fa-thumbtack ${isPinned ? 'active-pin' : ''}`}></i>
                              </button>
                            </div>
                            <div className="mob-hub-card-label">{meta.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Bottom Quick Controls in Hub */}
              <div className="mob-hub-footer-controls">
                <button className="mob-hub-ctrl-btn" onClick={onThemeToggle}>
                  <i className={`fas fa-${themeMode === 'light' ? 'moon' : 'sun'}`}></i>
                  <span>Chế độ {themeMode === 'light' ? 'Tối (Dark)' : 'Sáng (Light)'}</span>
                </button>
                <button className="mob-hub-ctrl-btn logout" onClick={onLogout}>
                  <i className="fas fa-sign-out-alt"></i>
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ============== Bottom Navigation (Mobile) - Hiển Thị Phân Hệ Đã Ghim Tùy Chỉnh ==============
    function BottomNavigation({ activeMenu, setActiveMenu, perms, setShowMobileSidebar, pinnedTabs = [] }) {
      const shortLabel = (k) => {
        if (!PAGE_META[k]) return k;
        if (k === 'dashboard') return 'Tổng quan';
        if (k === 'leads') return 'Khách hàng';
        if (k === 'properties') return 'BĐS';
        if (k === 'appointments') return 'Lịch hẹn';
        if (k === 'deals') return 'Giao dịch';
        if (k === 'tenancies') return 'Thuê';
        if (k === 'reports') return 'Báo cáo';
        if (k === 'settings') return 'Cài đặt';
        return PAGE_META[k].label.split(' ')[0];
      };

      const pinnedNavItems = pinnedTabs
        .filter(k => PAGE_META[k] && (can(perms, k, 'v') || ALWAYS_PAGES.includes(k)))
        .map(k => ({
          id: k,
          icon: PAGE_META[k].icon,
          label: shortLabel(k),
          onClick: () => setActiveMenu(k)
        }));

      const navItems = pinnedNavItems.concat([
        { id: 'menu', icon: 'fa-table-cells-large', label: 'Phân hệ', onClick: () => setShowMobileSidebar(true) }
      ]);

      return (
        <div className="bottom-nav">
          <div className="bottom-nav-container">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`bottom-nav-item ${item.id !== 'menu' && activeMenu === item.id ? 'active' : ''}`}
                onClick={item.onClick}
              >
                <i className={`fas ${item.icon}`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

