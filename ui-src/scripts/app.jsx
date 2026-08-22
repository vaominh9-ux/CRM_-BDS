
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

    // ============== AdminLTE dashboard components ==============
    // small-box KPI (big num + faded icon + optional "More info" footer)
    function SmallBox({ value, label, icon, color, onMore }) {
      return (
        <div className={'small-box ' + (color || 'bg-navy')}>
          <div className="inner"><h3>{value}</h3><p>{label}</p></div>
          <div className="icon"><i className={'fas ' + icon}></i></div>
          {onMore && <button className="small-box-footer" onClick={onMore}>More info <i className="fas fa-arrow-circle-right"></i></button>}
        </div>
      );
    }

    // % vs previous period — null baseline means no chip (never fake a trend)
    const delta = (cur, prev) => (!prev ? null : ((cur - prev) / prev) * 100);
    const TrendChip = ({ pct }) => {
      if (pct == null || !isFinite(pct)) return null;
      const flat = Math.abs(pct) < 0.05, up = pct > 0;
      return (
        <span className={'trend-chip ' + (flat ? 'trend-flat' : up ? 'trend-up' : 'trend-down')}>
          <i className={'fas fa-' + (flat ? 'minus' : up ? 'arrow-up' : 'arrow-down')}></i>
          {Math.abs(Math.round(pct * 10) / 10)}%
        </span>
      );
    };

    // secondary mini metric — trend/sub/onClick are optional add-ons
    function InfoBox({ value, label, icon, color, trend, sub, onClick }) {
      return (
        <div className={'info-box' + (onClick ? ' clickable' : '')} onClick={onClick}>
          <div className={'info-box-icon ' + (color || 'bg-navy')}><i className={'fas ' + icon}></i></div>
          <div className="info-box-content">
            <div className="info-box-text">{label}</div>
            <div className="info-box-number">{value}<TrendChip pct={trend} /></div>
            {sub && <div className="info-box-sub">{sub}</div>}
          </div>
        </div>
      );
    }

    // collapsible card wrapper for charts/tables/content
    function LteCard({ title, icon, tools, children }) {
      const [open, setOpen] = useState(true);
      return (
        <div className={'lte-card' + (open ? '' : ' collapsed')}>
          <div className="lte-card-header">
            <h3 className="lte-card-title"><i className={'fas ' + icon}></i> {title}</h3>
            <div className="lte-card-tools">
              {tools}
              <button onClick={() => setOpen(!open)} title={open ? 'Collapse' : 'Expand'}><i className={'fas fa-' + (open ? 'minus' : 'plus')}></i></button>
            </div>
          </div>
          <div className="lte-card-body">{children}</div>
        </div>
      );
    }

    // skeleton kpi row while stats load
    function KpiSkeleton({ count }) {
      return (
        <div className="lte-kpi-grid">
          {[...Array(count || 4)].map((_, i) => (
            <div key={i} className="small-box bg-navy" style={{opacity: .55}}>
              <div className="inner">
                <div className="skeleton" style={{height: '30px', width: '55%', marginBottom: '8px'}}></div>
                <div className="skeleton" style={{height: '14px', width: '75%'}}></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ============== Dashboard widgets (donut / trend / lists / funnel / agents) ==============
    // status doughnut with the total in the hole + share legend
    function StatusDonut({ counts, order, total, caption }) {
      const labels = order.filter((s) => counts[s]);
      if (!labels.length) return <p className="dash-empty"><i className="fas fa-chart-pie"></i>Nothing to chart yet</p>;
      const data = { labels, datasets: [{ data: labels.map((s) => counts[s]), backgroundColor: labels.map((s) => STAGE_COLORS[s] || '#6c757d'), borderWidth: 0 }] };
      return (
        <div className="donut-box">
          <div className="donut-hold">
            <ChartCanvas type="doughnut" data={data} height={186} options={{ cutout: '68%', plugins: { legend: { display: false } } }} />
            <div className="donut-mid"><b>{total}</b><span>{caption}</span></div>
          </div>
          <div className="donut-legend">
            {labels.map((s) => (
              <div className="dl-item" key={s}>
                <span className="dl-dot" style={{ background: STAGE_COLORS[s] || '#6c757d' }}></span>
                <span className="dl-name">{s}</span>
                <span className="dl-num">{counts[s]}</span>
                <span className="dl-pct">({total ? Math.round((counts[s] / total) * 1000) / 10 : 0}%)</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // leads/day area line — client slices the 90-day series the backend already sent
    function LeadsTrend({ series, days }) {
      const cut = (series || []).slice(-days);
      const data = { labels: cut.map((p) => p.d.substr(5).replace('-', '/')),
        datasets: [{ label: 'Leads', data: cut.map((p) => p.n), borderColor: '#0074D9', backgroundColor: 'rgba(0,116,217,.18)',
          fill: true, tension: .38, borderWidth: 2, pointRadius: days > 30 ? 0 : 2, pointHoverRadius: 4 }] };
      return (
        <>
          <ChartCanvas type="line" data={data} height={214}
            options={{ plugins: { legend: { display: false } }, interaction: { mode: 'index', intersect: false },
              scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 8, autoSkip: true } } } }} />
          <div className="fn-foot" style={{ color: '#8b9aa8', fontWeight: 600 }}>
            {cut.reduce((s, p) => s + p.n, 0)} khách hàng mới trong {days} ngày qua
          </div>
        </>
      );
    }

    // thumbnail row used by Recent Properties + Upcoming Viewings
    const DashRow = ({ image, icon, title, sub, right, small, onClick }) => (
      <div className="dlist-row" onClick={onClick}>
        {image ? <img className="dlist-thumb" src={image} alt="" loading="lazy" onError={(e) => { e.target.style.visibility = 'hidden'; }} />
               : <div className="dlist-thumb ph"><i className={'fas ' + (icon || 'fa-image')}></i></div>}
        <div className="dlist-main"><div className="dlist-t">{title}</div><div className="dlist-s">{sub}</div></div>
        <div className="dlist-r"><div className="dlist-p">{right}</div><div className="dlist-d">{small}</div></div>
        <i className="fas fa-chevron-right dlist-chev"></i>
      </div>
    );

    // cumulative pipeline funnel — width relative to the top stage, step-over-step %
    function FunnelChart({ steps, rate, onPick }) {
      const top = (steps && steps[0] && steps[0].count) || 0;
      if (!top) return <p className="dash-empty"><i className="fas fa-filter"></i>No leads in the pipeline yet</p>;
      return (
        <div>
          {steps.map((s, i) => (
            <div className="fn-row" key={s.stage}>
              <span className="fn-label">{s.stage}</span>
              <div className="fn-bar" style={{ width: Math.max(26, Math.round((s.count / top) * 100)) + '%', background: STAGE_COLORS[s.stage] || '#6c757d' }}
                   onClick={onPick} title={'Open Leads'}>{s.count}</div>
              <span className="fn-pct">{i && steps[i - 1].count ? Math.round((s.count / steps[i - 1].count) * 100) + '%' : ''}</span>
            </div>
          ))}
          <div className="fn-foot">Tỷ lệ chuyển đổi: {rate}%</div>
        </div>
      );
    }

    // top 5 by closed value this month
    function TopAgents({ rows }) {
      const top = (rows || []).slice(0, 5), max = top.reduce((m, a) => Math.max(m, a.dealValueM || 0), 0);
      if (!top.length) return <p className="dash-empty"><i className="fas fa-ranking-star"></i>No agent activity yet</p>;
      return (
        <>
          {top.map((a) => (
            <div className="ag-row" key={a.agent}>
              <div className="ag-av">{String(a.agent || '?').substr(0, 2)}</div>
              <div className="ag-main">
                <div className="ag-n">{a.agent}</div>
                <div className="ag-s">{a.won} thành công · {a.listings} tin đăng · {a.openLeads} đang xử lý</div>
                <div className="ag-bar"><span style={{ width: (max ? Math.round((a.dealValueM || 0) / max * 100) : 0) + '%' }}></span></div>
              </div>
              <div className="ag-v">{pkrShort(a.dealValueM || 0)}<div className="ag-s" style={{ fontWeight: 400 }}>Closed</div></div>
            </div>
          ))}
        </>
      );
    }

    // ============== Dashboard View (role-scoped: agency-wide vs own-book) ==============
    function DashboardView({ currentUser, setActiveMenu }) {
      const { data, error, isLoading, mutate } = useSWR('dash:stats', () => gsRun('getDashboardStats', currentUser), SWR_LIVE);
      const [leadDays, setLeadDays] = useState(30); // leads-trend range chips — hook stays above the early returns
      const [kpiTab, setKpiTab] = useState('finance'); // Hook kpiTab đặt ở đầu component để tuân thủ Rules of Hooks
      const stats = data && data.success ? data.data : null;
      const go = (p) => setActiveMenu && setActiveMenu(p);

      if (isLoading) return <KpiSkeleton />;
      if (!stats) return ( // failed load — say so, don't skeleton forever
        <div className="data-section" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <i className="fas fa-triangle-exclamation" style={{ fontSize: 36, color: '#e6a700', marginBottom: 10 }}></i>
          <h3 style={{ color: 'var(--navy-primary)', marginBottom: 6 }}>Dashboard failed to load</h3>
          <p style={{ color: '#789', marginBottom: 14 }}>{(data && data.message) || (error && String(error.message || error)) || 'Server error'}</p>
          <button className="btn btn-primary" onClick={() => mutate()}><i className="fas fa-rotate-right"></i> Retry</button>
        </div>
      );

      const agency = stats.scope === 'agency';
      const inv = stats.inventory || {}, prev = stats.prev || {};
      const invTotal = Object.keys(inv).reduce((s, k) => s + (inv[k] || 0), 0);
      const targetPct = stats.myTarget ? Math.round((stats.dealsMonthValue || 0) / stats.myTarget * 100) : 0;
      // [value, label, icon, color, page]
      const KPI = [
        [stats.activeListings || 0, agency ? 'Bất động sản đang mở' : 'BĐS tôi phụ trách', 'fa-building', 'bg-navy', 'properties'],
        [stats.openLeads || 0, agency ? 'Khách hàng đang xử lý' : 'Khách hàng của tôi', 'fa-user-tag', 'bg-info', 'leads'],
        [stats.overdueFollowUps || 0, 'Lịch chăm sóc quá hạn', 'fa-bell', 'bg-danger', 'followups'],
        [stats.todayAppointments || 0, 'Lịch xem nhà hôm nay', 'fa-calendar-check', 'bg-success', 'appointments']
      ];
      const viewAll = (p) => <button className="card-link" onClick={() => go(p)}>Xem tất cả <i className="fas fa-arrow-right" style={{ fontSize: 10 }}></i></button>;

      return (
        <>
          {/* GIAO DIỆN DESKTOP: Giữ nguyên 100% 4 hàng lưới AdminLTE */}
          <div className="dash-desktop-kpis">
            <div className="lte-kpi-grid">
              {KPI.map(([v, l, ic, c, page], i) => <SmallBox key={i} value={v} label={l} icon={ic} color={c} onMore={() => go(page)} />)}
            </div>
            <div className="lte-kpi-grid">
              <InfoBox value={stats.dealsMonth || 0} label="Giao dịch chốt trong tháng" icon="fa-handshake" color="bg-navy"
                       trend={delta(stats.dealsMonth || 0, prev.deals || 0)} sub={'Tháng trước: ' + (prev.deals || 0)} onClick={() => go('deals')} />
              <InfoBox value={pkrShort(stats.dealsMonthValue || 0)} label="Doanh số tháng" icon="fa-sack-dollar" color="bg-success"
                       trend={delta(stats.dealsMonthValue || 0, prev.dealsValue || 0)} sub={'Tháng trước: ' + pkrShort(prev.dealsValue || 0)} onClick={() => go('deals')} />
              <InfoBox value={pkrShort(stats.commissionMonth || 0)} label="Hoa hồng tháng" icon="fa-percent" color="bg-info"
                       trend={delta(stats.commissionMonth || 0, prev.commission || 0)} sub={'Tháng trước: ' + pkrShort(prev.commission || 0)} />
              <InfoBox value={pkrShort(stats.collectedMonth || 0)} label="Đã thu trong tháng" icon="fa-money-bill-wave" color="bg-warning"
                       trend={delta(stats.collectedMonth || 0, prev.collected || 0)} sub={'Tháng trước: ' + pkrShort(prev.collected || 0)} />
            </div>
            <div className="lte-kpi-grid">
              <InfoBox value={stats.featured || 0} label="Tin đăng nổi bật" icon="fa-star" color="bg-warning" onClick={() => go('properties')} />
              <InfoBox value={(stats.totalViews || 0).toLocaleString('vi-VN')} label="Lượt xem cổng thông tin" icon="fa-eye" color="bg-info" sub="Tất cả tin đăng, toàn thời gian" />
              <InfoBox value={stats.wonLeads || 0} label="Khách hàng thành công" icon="fa-trophy" color="bg-success"
                       sub={(stats.conversionRate || 0) + '% chuyển đổi'} onClick={() => go('leads')} />
              {agency
                ? <InfoBox value={pkrShort(stats.payable || 0)} label="Hoa hồng nhân viên cần trả" icon="fa-hand-holding-dollar" color="bg-danger" onClick={() => go('deals')} />
                : <InfoBox value={stats.dueTodayFollowUps || 0} label="Đến hạn hôm nay" icon="fa-clock" color="bg-navy" onClick={() => go('followups')} />}
            </div>
            <div className="lte-kpi-grid">
              <InfoBox value={(stats.totalLeads || 0).toLocaleString('vi-VN')} label="Tổng yêu cầu tư vấn" icon="fa-comments" color="bg-info"
                       trend={delta(stats.leadsMonth || 0, prev.leads || 0)} sub={(stats.leadsMonth || 0) + ' trong tháng này'} onClick={() => go('leads')} />
              <InfoBox value={pkrShort(stats.rentArrears || 0)} label="Công nợ tiền thuê" icon="fa-triangle-exclamation" color="bg-danger"
                       sub={(stats.activeTenancies || 0) + ' hợp đồng đang hoạt động'} onClick={() => go('tenancies')} />
              <InfoBox value={pkrShort(stats.balanceDue || 0)} label="Số tiền còn lại" icon="fa-file-invoice-dollar" color="bg-warning"
                       sub="Giao dịch đang mở — chưa tất toán" onClick={() => go('deals')} />
              {agency
                ? <InfoBox value={stats.activeAgents || 0} label="Nhân viên đang hoạt động" icon="fa-user-check" color="bg-success" sub="Đang hoạt động trong danh sách nhân sự" />
                : <InfoBox value={stats.myTarget ? targetPct + '%' : '—'} label="Mục tiêu tháng" icon="fa-bullseye" color="bg-success"
                           sub={stats.myTarget ? pkrShort(stats.dealsMonthValue || 0) + ' / ' + pkrShort(stats.myTarget) : 'Chưa đặt mục tiêu'} />}
            </div>
          </div>

          {/* GIAO DIỆN MOBILE: Lưới 2x2 Top + Thẻ Performance Hub Phân Tab Siêu Sang */}
          <div className="dash-mobile-kpis">
            <div className="lte-kpi-grid">
              {KPI.map(([v, l, ic, c, page], i) => <SmallBox key={i} value={v} label={l} icon={ic} color={c} onMore={() => go(page)} />)}
            </div>

            <div className="mob-kpi-hub-card">
              <div className="mob-kpi-tabs">
                <button className={'mob-kpi-tab ' + (kpiTab === 'finance' ? 'active' : '')} onClick={() => setKpiTab('finance')}>
                  <i className="fas fa-wallet"></i> Tài chính
                </button>
                <button className={'mob-kpi-tab ' + (kpiTab === 'leads' ? 'active' : '')} onClick={() => setKpiTab('leads')}>
                  <i className="fas fa-user-tag"></i> Khách hàng
                </button>
                <button className={'mob-kpi-tab ' + (kpiTab === 'ops' ? 'active' : '')} onClick={() => setKpiTab('ops')}>
                  <i className="fas fa-building"></i> Nguồn hàng & Web
                </button>
              </div>

              <div className="mob-kpi-tab-body">
                {kpiTab === 'finance' && (
                  <div className="mob-kpi-rows">
                    <div className="mob-kpi-row" onClick={() => go('deals')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#e8f5e9', color: '#2e7d32' }}><i className="fas fa-sack-dollar"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Doanh số tháng</div>
                        <div className="mob-kpi-sub">Tháng trước: {pkrShort(prev.dealsValue || 0)}</div>
                      </div>
                      <div className="mob-kpi-val" style={{ color: '#2e7d32' }}>{pkrShort(stats.dealsMonthValue || 0)}</div>
                    </div>

                    <div className="mob-kpi-row" onClick={() => go('deals')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#fff8e1', color: '#f57f17' }}><i className="fas fa-money-bill-wave"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Đã thu trong tháng</div>
                        <div className="mob-kpi-sub">Tháng trước: {pkrShort(prev.collected || 0)}</div>
                      </div>
                      <div className="mob-kpi-val">{pkrShort(stats.collectedMonth || 0)}</div>
                    </div>

                    <div className="mob-kpi-row">
                      <div className="mob-kpi-ic" style={{ background: '#e1f5fe', color: '#0288d1' }}><i className="fas fa-percent"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Hoa hồng tháng</div>
                        <div className="mob-kpi-sub">Tháng trước: {pkrShort(prev.commission || 0)}</div>
                      </div>
                      <div className="mob-kpi-val" style={{ color: '#0288d1' }}>{pkrShort(stats.commissionMonth || 0)}</div>
                    </div>

                    {agency && (
                      <div className="mob-kpi-row" onClick={() => go('deals')} style={{ cursor: 'pointer' }}>
                        <div className="mob-kpi-ic" style={{ background: '#ffebee', color: '#c62828' }}><i className="fas fa-hand-holding-dollar"></i></div>
                        <div className="mob-kpi-info">
                          <div className="mob-kpi-label">Hoa hồng nhân viên cần trả</div>
                          <div className="mob-kpi-sub">Khoản chi trả môi giới</div>
                        </div>
                        <div className="mob-kpi-val" style={{ color: '#c62828' }}>{pkrShort(stats.payable || 0)}</div>
                      </div>
                    )}

                    <div className="mob-kpi-row" onClick={() => go('tenancies')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#ffebee', color: '#d32f2f' }}><i className="fas fa-triangle-exclamation"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Công nợ tiền thuê</div>
                        <div className="mob-kpi-sub">{stats.activeTenancies || 0} hợp đồng đang hoạt động</div>
                      </div>
                      <div className="mob-kpi-val" style={{ color: '#d32f2f' }}>{pkrShort(stats.rentArrears || 0)}</div>
                    </div>

                    <div className="mob-kpi-row" onClick={() => go('deals')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#fffde7', color: '#fbc02d' }}><i className="fas fa-file-invoice-dollar"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Số tiền còn lại</div>
                        <div className="mob-kpi-sub">Giao dịch đang mở chưa tất toán</div>
                      </div>
                      <div className="mob-kpi-val">{pkrShort(stats.balanceDue || 0)}</div>
                    </div>
                  </div>
                )}

                {kpiTab === 'leads' && (
                  <div className="mob-kpi-rows">
                    <div className="mob-kpi-row" onClick={() => go('leads')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#e1f5fe', color: '#0288d1' }}><i className="fas fa-comments"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Tổng yêu cầu tư vấn</div>
                        <div className="mob-kpi-sub">{stats.leadsMonth || 0} yêu cầu trong tháng này</div>
                      </div>
                      <div className="mob-kpi-val">{(stats.totalLeads || 0).toLocaleString('vi-VN')}</div>
                    </div>

                    <div className="mob-kpi-row" onClick={() => go('leads')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#e8f5e9', color: '#2e7d32' }}><i className="fas fa-trophy"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Khách hàng thành công</div>
                        <div className="mob-kpi-sub">Tỷ lệ chuyển đổi: {stats.conversionRate || 0}%</div>
                      </div>
                      <div className="mob-kpi-val" style={{ color: '#2e7d32' }}>{stats.wonLeads || 0}</div>
                    </div>

                    <div className="mob-kpi-row" onClick={() => go('deals')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#e8eaf6', color: '#303f9f' }}><i className="fas fa-handshake"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Giao dịch chốt trong tháng</div>
                        <div className="mob-kpi-sub">Tháng trước: {prev.deals || 0} giao dịch</div>
                      </div>
                      <div className="mob-kpi-val">{stats.dealsMonth || 0}</div>
                    </div>
                  </div>
                )}

                {kpiTab === 'ops' && (
                  <div className="mob-kpi-rows">
                    <div className="mob-kpi-row">
                      <div className="mob-kpi-ic" style={{ background: '#e0f2fe', color: '#0369a1' }}><i className="fas fa-eye"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Lượt xem cổng thông tin</div>
                        <div className="mob-kpi-sub">Toàn thời gian, tất cả BĐS</div>
                      </div>
                      <div className="mob-kpi-val">{(stats.totalViews || 0).toLocaleString('vi-VN')}</div>
                    </div>

                    <div className="mob-kpi-row" onClick={() => go('properties')} style={{ cursor: 'pointer' }}>
                      <div className="mob-kpi-ic" style={{ background: '#fef3c7', color: '#d97706' }}><i className="fas fa-star"></i></div>
                      <div className="mob-kpi-info">
                        <div className="mob-kpi-label">Tin đăng nổi bật</div>
                        <div className="mob-kpi-sub">BĐS gắn cờ VIP/Featured</div>
                      </div>
                      <div className="mob-kpi-val">{stats.featured || 0}</div>
                    </div>

                    {agency && (
                      <div className="mob-kpi-row">
                        <div className="mob-kpi-ic" style={{ background: '#f0fdf4', color: '#16a34a' }}><i className="fas fa-user-check"></i></div>
                        <div className="mob-kpi-info">
                          <div className="mob-kpi-label">Nhân viên đang hoạt động</div>
                          <div className="mob-kpi-sub">Đang sẵn sàng nhận khách</div>
                        </div>
                        <div className="mob-kpi-val">{stats.activeAgents || 0}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="dash-grid-3">
            <LteCard title="Trạng thái bất động sản" icon="fa-house-chimney" tools={viewAll('properties')}>
              <StatusDonut counts={inv} order={ENUMS.propertyStatus} total={invTotal} caption="Tổng cộng" />
            </LteCard>
            <LteCard title="Tổng quan khách hàng" icon="fa-chart-line"
                     tools={[7, 30, 90].map((d) => (
                       <button key={d} className={'rng-chip' + (leadDays === d ? ' on' : '')} onClick={() => setLeadDays(d)}>{d}d</button>
                     ))}>
              <LeadsTrend series={stats.leadsSeries} days={leadDays} />
            </LteCard>
            <LteCard title="Lịch xem sắp tới" icon="fa-calendar-day" tools={viewAll('appointments')}>
              {(stats.upcomingViewings || []).length === 0
                ? <p className="dash-empty"><i className="fas fa-calendar-check"></i>Không có lịch xem nào sắp tới</p>
                : stats.upcomingViewings.map((v) => (
                    <DashRow key={v.id} image={v.image} icon="fa-building" title={v.title} sub={v.address || '—'}
                             right={<Badge s={v.status} />} small={fmtDT(v.when)} onClick={() => go('appointments')} />
                  ))}
            </LteCard>
          </div>

          <div className="dash-grid-3">
            <LteCard title="Bất động sản gần đây" icon="fa-building-circle-check" tools={viewAll('properties')}>
              {(stats.recentProperties || []).length === 0
                ? <p className="dash-empty"><i className="fas fa-building"></i>Chưa có bất động sản nào</p>
                : stats.recentProperties.map((p) => {
                    const imgUrl = p.image || (p.images && p.images.length ? (p.images.find(x => x.isPrimary) || p.images[0]).url : '') || '';
                    return (
                      <DashRow key={p.id} image={imgUrl} icon="fa-house" title={p.title} sub={p.address || '—'}
                               right={<>{pkrShort(p.price)}<div style={{ marginTop: 4 }}><Badge s={p.status} /></div></>}
                               small={'Đã thêm ' + fmtDate(p.created)} onClick={() => go('properties')} />
                    );
                  })}
            </LteCard>
            <LteCard title="Quy trình giao dịch" icon="fa-filter" tools={viewAll('leads')}>
              <FunnelChart steps={stats.funnelSteps} rate={stats.conversionRate || 0} onPick={() => go('leads')} />
            </LteCard>
            {agency ? (
              <LteCard title="Nhân viên xuất sắc" icon="fa-ranking-star" tools={viewAll('reports')}>
                <TopAgents rows={stats.leaderboard} />
              </LteCard>
            ) : (
              <LteCard title="Tháng của tôi" icon="fa-bullseye">
                <div className="mm-row"><span>Giao dịch đã chốt</span><b>{stats.dealsMonth || 0}</b></div>
                <div className="mm-row"><span>Doanh số đạt được</span><b>{pkrShort(stats.dealsMonthValue || 0)}</b></div>
                <div className="mm-row"><span>Hoa hồng nhận được</span><b>{pkrShort(stats.commissionMonth || 0)}</b></div>
                <div className="mm-row"><span>Khách thành công</span><b>{stats.wonLeads || 0}</b></div>
                <div className="mm-row"><span>Mục tiêu tháng</span><b>{stats.myTarget ? pkrShort(stats.myTarget) : '—'}</b></div>
                {stats.myTarget > 0 && (
                  <>
                    <div className="ag-bar" style={{ height: 6, marginTop: 12 }}><span style={{ width: Math.min(100, targetPct) + '%' }}></span></div>
                    <div className="fn-foot" style={{ marginTop: 8, paddingTop: 8 }}>{targetPct}% mục tiêu tháng</div>
                  </>
                )}
              </LteCard>
            )}
          </div>

          <div className="dash-grid-2">
            <LteCard title="Khách hàng gần đây" icon="fa-user-clock" tools={<button onClick={() => go('leads')} title="Mở danh sách khách hàng"><i className="fas fa-arrow-right"></i></button>}>
              {(stats.recentLeads || []).length === 0
                ? <p style={{ color: '#789', textAlign: 'center', padding: '20px 0' }}>Chưa có khách hàng nào</p>
                : stats.recentLeads.map((l) => (
                    <div className="recent-lead-row" key={l.id}>
                      <div className="recent-lead-ic"><i className="fas fa-user"></i></div>
                      <div className="recent-lead-t">
                        <div className="n">{l.fullName}</div>
                        <div className="s">{l.phone} · {l.source} · {l.assignedAgent || 'Chưa phân công'} · {fmtDate(l.created)}</div>
                      </div>
                      <Badge s={l.status} />
                    </div>
                  ))}
            </LteCard>
            {agency ? (
              <LteCard title="Bảng xếp hạng nhân viên — chi tiết" icon="fa-table-list">
                {(stats.leaderboard || []).length === 0
                  ? <p style={{ color: '#789', textAlign: 'center', padding: '20px 0' }}>Chưa có số liệu nhân viên</p>
                  : (
                    <div className="about-table-wrapper">
                      <table className="about-roles-table">
                        <thead><tr><th>Nhân viên</th><th>Tin đăng</th><th>Khách đang mở</th><th>Thành công</th><th>Quá hạn</th><th>Đã chốt trong tháng</th><th>Mục tiêu</th></tr></thead>
                        <tbody>
                          {stats.leaderboard.map((a) => (
                            <tr key={a.agent}>
                              <td>{a.agent}</td><td>{a.listings}</td><td>{a.openLeads}</td>
                              <td style={{ color: '#2e7d32', fontWeight: 700 }}>{a.won}</td>
                              <td style={{ color: a.overdue ? '#c62828' : 'inherit', fontWeight: a.overdue ? 700 : 400 }}>{a.overdue}</td>
                              <td style={{ fontWeight: 700 }}>{pkrShort(a.dealValueM || 0)}</td>
                              <td>{a.target > 0 ? Math.round((a.dealValueM || 0) / a.target * 100) + '%' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </LteCard>
            ) : (
              <LteCard title="Thao tác nhanh" icon="fa-bolt">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 6 }}>
                  <button className="btn btn-primary" onClick={() => go('leads')}><i className="fas fa-user-plus"></i> New Lead</button>
                  <button className="btn btn-secondary" onClick={() => go('followups')}><i className="fas fa-bell"></i> Follow-Ups</button>
                  <button className="btn btn-secondary" onClick={() => go('appointments')}><i className="fas fa-calendar-plus"></i> Viewings</button>
                  <button className="btn btn-secondary" onClick={() => go('properties')}><i className="fas fa-building"></i> My Listings</button>
                </div>
              </LteCard>
            )}
          </div>
        </>
      );
    }

    // ============== Notification bell (header) — LIVE computed alerts, each deep-links to its section ==============
    function NotificationBell({ currentUser, perms, setActiveMenu }) {
      const { data } = useSWR('notif:live', () => gsRun('getNotifications', currentUser), { refreshInterval: 30000 });
      const items = data && data.success ? (data.items || []) : [];
      const [open, setOpen] = useState(false);
      const [seen, setSeen] = useState(() => { try { return localStorage.getItem('notif_seen_' + currentUser) || ''; } catch (e) { return ''; } });
      const sig = items.map((n) => `${n.page}:${n.count}:${n.text}`).join('|');
      const unread = items.length > 0 && sig !== seen;
      const ref = useRef(null);

      useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, []);
      
      const openMenu = () => {
        const nextOpen = !open;
        setOpen(nextOpen);
        if (nextOpen) { setSeen(sig); try { localStorage.setItem('notif_seen_' + currentUser, sig); } catch (e) {} }
      };

      const markAllRead = (e) => {
        e.stopPropagation();
        setSeen(sig);
        try { localStorage.setItem('notif_seen_' + currentUser, sig); } catch (e) {} 
      };

      return (
        <div className={'notif-bell' + (open ? ' open' : '')} ref={ref}>
          <button className="notif-btn" onClick={openMenu} title="Thông báo công việc cần xử lý">
            <i className="fas fa-bell"></i>
            {unread && <span className="notif-badge" title="Có thông báo mới chưa đọc">{items.length}</span>}
          </button>
          <div className="notif-menu">
            <div className="notif-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Cần xử lý {items.length > 0 && <span className="notif-count-pill">{items.length} danh mục</span>}</span>
              {unread && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--blue-primary, #1877f2)', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600, padding: '2px 6px' }}
                >
                  <i className="fas fa-check-double"></i> Đã xem
                </button>
              )}
            </div>
            <div className="notif-list">
              {items.length === 0 ? (
                <div className="notif-empty"><i className="fas fa-bell-slash" style={{fontSize: '22px', display: 'block', marginBottom: '8px', opacity: .5}}></i>Tuyệt vời! Không còn việc tồn đọng cần xử lý</div>
              ) : items.map((n, i) => (
                <div className="notif-item" key={i} style={{ cursor: 'pointer' }} onClick={() => { setActiveMenu(n.page); setOpen(false); }}>
                  <i className={'fas ' + n.icon}></i>
                  <div className="ni-body">
                    <div className="ni-act">{n.text}</div>
                    <div className="ni-meta">Mở {(PAGE_META[n.page] || {}).label || n.page} <i className="fas fa-arrow-right" style={{ fontSize: 9 }}></i></div>
                  </div>
                </div>
              ))}
            </div>
            {can(perms, 'logs', 'v') && <div className="notif-foot"><button onClick={() => { setActiveMenu('logs'); setOpen(false); }}><i className="fas fa-list"></i> Xem nhật ký hoạt động</button></div>}
          </div>
        </div>
      );
    }

    // ============== Header quick theme switcher — dark toggle + live palette (ephemeral until Apply) ==============
    function HeaderThemeMenu({ currentUser, themeMode, onThemeToggle, onSettingsUpdate }) {
      const [open, setOpen] = useState(false);
      const [pickedId, setPickedId] = useState('');   // last previewed preset
      const [dirty, setDirty] = useState(false);       // unsaved live change present
      const [saving, setSaving] = useState(false);
      const ref = useRef(null);

      useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, []);

      // click a swatch → recolor the WHOLE system live, but don't save anywhere yet
      const preview = (t) => { applyThemeVars(themeVars(t)); setPickedId(t.id); setDirty(true); };
      // drop the ephemeral change, snap back to the saved theme
      const revert = () => { applySavedTheme(); setPickedId(''); setDirty(false); };
      // commit the liked palette: cache on device + persist to backend
      const apply = () => {
        const t = findTheme(pickedId); if (!t) return;
        const vars = themeVars(t); cacheThemeVars(vars); setSaving(true);
        gsRun('updateUserSettings', currentUser, { customColors: JSON.stringify({ themeId: t.id, vars, primary: t.primary, accent: t.accent, text: '#1A1A1A' }) })
          .then((r) => { setSaving(false);
            if (r && r.success) { setDirty(false); swrMutate('settings:' + currentUser); onSettingsUpdate && onSettingsUpdate();
              Swal.fire({ icon: 'success', title: 'Theme applied!', text: t.name, timer: 1300, showConfirmButton: false }); } })
          .catch(() => setSaving(false));
      };

      const isDark = themeMode === 'dark';
      return (
        <div className={'thm-dd' + (open ? ' open' : '')} ref={ref}>
          <button className="notif-btn" onClick={() => setOpen(!open)} title="Theme"><i className="fas fa-palette"></i></button>
          <div className="thm-menu">
            <div className="thm-row">
              <span className="thm-lbl"><i className={'fas fa-' + (isDark ? 'moon' : 'sun')}></i> Dark Mode</span>
              <label className="tgl"><input type="checkbox" checked={isDark} onChange={onThemeToggle} /><span className="tgl-track"></span></label>
            </div>
            <div className="thm-sec">
              <div className="thm-sec-h">Color Palette</div>
              <div className="thm-grid">
                {UI_THEMES.map((t) => (
                  <div key={t.id} className={'thm-sw' + (pickedId === t.id ? ' on' : '')} title={t.name} onClick={() => preview(t)}>
                    <span style={{background: t.primary}}></span>
                    <span style={{background: t.secondary}}></span>
                    <span className="a" style={{background: t.accent}}></span>
                  </div>
                ))}
              </div>
            </div>
            <div className="thm-hint">Previews live across the whole app — hit Apply to keep it.</div>
            <div className="thm-foot">
              <button className="thm-reset" onClick={revert} disabled={!dirty}><i className="fas fa-rotate-left"></i> Reset</button>
              <button className="thm-apply" onClick={apply} disabled={!dirty || saving}>
                <i className={'fas fa-' + (saving ? 'spinner fa-spin' : 'check')}></i> {saving ? 'Saving' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ============== 360 global search — pages + users + logs in one box (SWR-backed) ==============
    function GlobalSearch({ currentUser, perms, canEditRbac, jump }) {
      const [q, setQ] = useState('');
      const [open, setOpen] = useState(false);
      const ref = useRef(null);
      const term = q.trim().toLowerCase();
      const canU = can(perms, 'users', 'v'), canL = can(perms, 'logs', 'v');
      const canP = can(perms, 'properties', 'v'), canLd = can(perms, 'leads', 'v');

      // fetch sources only once the user types — shares cache with the list views (dedupe)
      const { data: uRes } = useSWR(term && canU ? 'users:all' : null, () => gsRun('getAllUsers', currentUser), SWR_LIVE);
      const { data: lRes } = useSWR(term && canL ? 'logs:all'  : null, () => gsRun('getLogs', currentUser), SWR_LIVE);
      const { data: pRes } = useSWR(term && canP ? 'props:all' : null, () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: dRes } = useSWR(term && canLd ? 'leads:all' : null, () => gsRun('getLeads', currentUser), SWR_LIVE);

      useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, []);

      const hit = (s) => String(s == null ? '' : s).toLowerCase().includes(term);
      const groups = [];
      if (term) {
        const pages = Object.keys(PAGE_META)
          .filter((k) => (ALWAYS_PAGES.indexOf(k) !== -1 || (k === 'permissions' ? canEditRbac : can(perms, k, 'v'))) && (hit(PAGE_META[k].label) || hit(k)))
          .map((k) => ({ icon: PAGE_META[k].icon, title: PAGE_META[k].label, sub: 'Open page', page: k, term: '' }));
        if (pages.length) groups.push(['Pages', pages]);
        if (canP && pRes && pRes.success) {
          const ps = pRes.data.filter((p) => hit(p.title) || hit(p.referenceCode) || hit(p.locationPath) || hit(p.propertyType)).slice(0, 8)
            .map((p) => ({ icon: 'fa-building', title: p.title, sub: (p.referenceCode || '') + ' · ' + pkrShort(p.price) + ' · ' + (p.locationPath || ''), page: 'properties', term: p.referenceCode || p.title }));
          if (ps.length) groups.push(['Properties', ps]);
        }
        if (canLd && dRes && dRes.success) {
          const ds = dRes.data.filter((l) => hit(l.fullName) || hit(l.phone) || hit(l.status) || hit(l.source)).slice(0, 8)
            .map((l) => ({ icon: 'fa-user-tag', title: l.fullName, sub: l.phone + ' · ' + l.status + (l.assignedAgent ? ' · ' + l.assignedAgent : ''), page: 'leads', term: l.phone }));
          if (ds.length) groups.push(['Leads', ds]);
        }
        if (canU && uRes && uRes.success) {
          const us = uRes.data.filter((u) => hit(u.Username) || hit(u.Email) || hit(u.Role) || hit(u.Status)).slice(0, 8)
            .map((u) => ({ icon: 'fa-user', title: u.Username, sub: u.Email + ' · ' + u.Role, page: 'users', term: u.Username }));
          if (us.length) groups.push(['Users', us]);
        }
        if (canL && lRes && lRes.success) {
          const ls = lRes.data.filter((g) => hit(g.Action) || hit(g.User) || hit(g.Details)).slice(0, 8)
            .map((g) => ({ icon: 'fa-clock-rotate-left', title: g.Action, sub: g.User + (g.Details ? ' · ' + g.Details : ''), page: 'logs', term: g.Action }));
          if (ls.length) groups.push(['Activity', ls]);
        }
      }
      const count = groups.reduce((n, g) => n + g[1].length, 0);
      const pick = (r) => { setOpen(false); setQ(''); jump(r.page, r.term); };

      return (
        <div className="gsearch" ref={ref}>
          <i className="fas fa-magnifying-glass gs-lead"></i>
          <input className="gs-input" value={q} placeholder="Search everything…"
                 onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => term && setOpen(true)} />
          {q && <button className="gs-x" onClick={() => { setQ(''); setOpen(false); }} title="Clear"><i className="fas fa-xmark"></i></button>}
          {open && term && (
            <div className="gs-menu">
              <div className="gs-scroll">
                {count === 0
                  ? <div className="gs-empty"><i className="fas fa-magnifying-glass"></i>No matches for "{q}"</div>
                  : groups.map(([name, items]) => (
                      <div className="gs-group" key={name}>
                        <div className="gs-group-h">{name}<span>{items.length}</span></div>
                        {items.map((r, i) => (
                          <div className="gs-item" key={i} onClick={() => pick(r)}>
                            <i className={'fas ' + r.icon + ' gs-ic'}></i>
                            <div className="gs-txt"><div className="gs-t">{r.title}</div><div className="gs-s">{r.sub}</div></div>
                            <i className="fas fa-arrow-right-long gs-go"></i>
                          </div>
                        ))}
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ============== Header clear-cache — drop SWR cache + refetch fresh ==============
    function ClearCacheButton() {
      const [busy, setBusy] = useState(false);
      const clear = () => { setBusy(true);
        Promise.resolve(swrClearAll()).finally(() => { setBusy(false);
          Swal.fire({ icon: 'success', title: 'Cache cleared', text: 'Fresh data reloaded from server.', timer: 1200, showConfirmButton: false }); }); };
      return (
        <button className="notif-btn" onClick={clear} disabled={busy} title="Clear cache & refresh">
          <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-broom')}></i>
        </button>
      );
    }

    // ============== Users Management (Admin Only) ==============
    function UsersView({ currentUser, perms, initialSearch }) {
      const canAdd = can(perms, 'users', 'a');
      const canEdit = can(perms, 'users', 'e');
      const canDel = can(perms, 'users', 'd');
      const { data: res, error, mutate } = useSWR('users:all', () => gsRun('getAllUsers', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      // kpi from cached rows — [value, label, icon, color]
      const kpi = useMemo(() => {
        const list = rows || [], active = list.filter((u) => u.Status === 'Active').length;
        return [
          [list.length,          'Total Users',  'fa-users',       'bg-navy'],
          [active,               'Active Users', 'fa-user-check',  'bg-success'],
          [list.length - active, 'Inactive',     'fa-user-clock',  'bg-warning'],
          [list.filter((u) => u.Role === 'Admin').length, 'Admin Users', 'fa-user-shield', 'bg-info'],
        ];
      }, [rows]);
      const [showModal, setShowModal] = useState(false);
      const [editingUser, setEditingUser] = useState(null);
      const [reassigning, setReassigning] = useState(null); // offboarding: move a user's whole book to someone else
      const tableInstanceRef = useRef(null);

      const [filters, setFilters] = useState({ role: '', status: '', search: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]); // seed from 360 search

      // surface a server error (e.g. access denied) once
      useEffect(() => {
        if (res && !res.success) Swal.fire({ icon: 'error', title: 'Error', text: res.message || 'Failed to load users' });
      }, [res]);

      // rows change: same data -> untouched · changed -> in-place swap (keeps page/search) · first load -> full build
      const rowsSigRef = useRef('');
      useEffect(() => {
        if (!rows) return;
        const sig = JSON.stringify(rows);
        if (tableInstanceRef.current && sig === rowsSigRef.current) return; // background refresh, nothing changed
        rowsSigRef.current = sig;
        if (tableInstanceRef.current) {
          try { tableInstanceRef.current.clear(); tableInstanceRef.current.rows.add(rows); tableInstanceRef.current.draw(false); return; } catch (e) {}
        }
        initializeDataTable(rows);
      }, [rows]);
      useEffect(() => () => { // destroy on unmount ONLY
        if (tableInstanceRef.current) { try { tableInstanceRef.current.destroy(); tableInstanceRef.current = null; } catch (e) {} }
      }, []);

      // csv import — client parse -> confirm -> bulk insert -> refetch
      const handleImport = (e) => {
        const file = e.target.files[0]; if (!file) return;
        const done = () => { e.target.value = ''; }; // reset so same file re-imports
        file.text().then((text) => {
          const rows = parseCSV(text);
          if (rows.length < 2) { done(); return Swal.fire({ icon: 'error', title: 'Import', text: 'CSV is empty or missing header row' }); }
          const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim()); // strip BOM
          if (headers.indexOf('Username') === -1) { done(); return Swal.fire({ icon: 'error', title: 'Import', text: 'Missing Username column — download the Template for the exact shape' }); }
          const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
          Swal.fire({ icon: 'question', title: `Import ${records.length} rows?`, text: 'Invalid rows are skipped — errors shown after.',
                      showCancelButton: true, confirmButtonText: 'Import', confirmButtonColor: '#001f3f' })
            .then((cf) => {
              if (!cf.isConfirmed) return done();
              gsRun('bulkImportUsers', records, currentUser).then((res) => {
                done();
                if (!res || !res.success) return Swal.fire({ icon: 'error', title: 'Import failed', text: (res && res.message) || 'Import failed' });
                mutate(); // refetch list
                const skipped = (res.errors || []).length;
                if (skipped) console.warn('Import errors:', res.errors);
                Swal.fire({ icon: 'success', title: 'Import complete', text: `${res.count} imported${skipped ? ', ' + skipped + ' skipped' : ''}` });
              }).catch(() => { done(); Swal.fire({ icon: 'error', title: 'Error', text: 'Import failed' }); });
            });
        });
      };

      // template csv — header + 1 generic demo row
      const downloadTemplate = () => {
        const csv = 'Username,Email,Password,Role,Status\nagent9,agent9@demo.com,demo123,Agent,Active\n';
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a');
        a.href = url; a.download = 'users_template.csv'; a.click();
        URL.revokeObjectURL(url);
      };

      // publish this section's buttons -> header toolbar; cleared on unmount
      useEffect(() => {
        const dt = () => tableInstanceRef.current; // resolve at click time (table rebuilds)
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm người dùng', primary: true, onClick: () => { setEditingUser(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('usersCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate },
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const initializeDataTable = (data) => {
        if (tableInstanceRef.current) {
          try {
            tableInstanceRef.current.destroy();
            tableInstanceRef.current = null;
            $('#usersTable').empty();
          } catch (e) {}
        }

        setTimeout(() => {
          try {
            const table = $('#usersTable').DataTable({
              data: data,
              destroy: true,
              language: DT_VI_LANGUAGE,
              columns: [
                { data: 'Username', title: 'Username' },
                { data: 'Email', title: 'Email' },
                { data: 'Role', title: 'Role' },
                {
                  data: 'Status',
                  title: 'Status',
                  render: (d) => `<span class="status-badge ${d === 'Active' ? 'status-active' : 'status-inactive'}">${d}</span>`
                },
                {
                  data: 'CreatedAt',
                  title: 'Created',
                  render: (d, type, row) => {
                    // Handle null, undefined, or empty values
                    if (d === null || d === undefined || d === '' || d === 'N/A') {
                      return '<span style="color: #999;">N/A</span>';
                    }

                    try {
                      let date;

                      // Parse different date formats
                      if (typeof d === 'string') {
                        // Handle string dates
                        if (d.trim() === '') return '<span style="color: #999;">N/A</span>';
                        date = new Date(d);
                      } else if (typeof d === 'number') {
                        // Handle Excel serial numbers
                        if (d <= 0) return '<span style="color: #999;">N/A</span>';
                        date = new Date((d - 25569) * 86400 * 1000);
                      } else if (d instanceof Date) {
                        date = d;
                      } else {
                        return '<span style="color: #999;">N/A</span>';
                      }

                      // Validate the date object
                      if (!date || isNaN(date.getTime()) || date.getTime() === 0) {
                        return '<span style="color: #999;">N/A</span>';
                      }

                      // Additional validation - check if year is reasonable
                      const year = date.getFullYear();
                      if (year < 1900 || year > 2100) {
                        return '<span style="color: #999;">N/A</span>';
                      }

                      // Safe date formatting
                      const month = date.toLocaleString('en-US', { month: 'short' });
                      const day = String(date.getDate()).padStart(2, '0');
                      const formattedYear = date.getFullYear();

                      return `${month} ${day}, ${formattedYear}`;

                    } catch (e) {
                      console.error('Date rendering error:', e, 'Value:', d);
                      return '<span style="color: #999;">N/A</span>';
                    }
                  }
                },
                {
                  data: null,
                  title: 'Actions',
                  orderable: false,
                  className: 'dt-actions actions-3',
                  width: '106px',
                  render: (d, t, row) => `<div class="table-actions slots-3">
                    ${canEdit ? `<button class="action-icon edit-icon" data-action="edit" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDel ? `<button class="action-icon assign-icon" data-action="reassign" title="Reassign work"><i class="fas fa-people-arrows"></i></button>` : ''}
                    ${canDel ? `<button class="action-icon delete-icon" data-action="delete" title="Deactivate"><i class="fas fa-user-slash"></i></button>` : ''}
                    ${!canEdit && !canDel ? '<span style="color:#999;">—</span>' : ''}
                  </div>`
                }
              ],
              pageLength: 10,
              lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "All"]],
              responsive: true,
              columnDefs: [{ targets: '_all', defaultContent: '' }], // missing keys render blank, never warn
              dom: 'lfrtip', // no B — buttons render in the page header, fired via buttons API
              buttons: [
                { extend: 'csv',   text: 'CSV',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'pdf',   text: 'PDF',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'print', text: 'Print', exportOptions: { columns: ':not(:last-child)' } }
              ],
              order: [[4, 'desc']]
            });

            $('#usersTable').off('click', '.action-icon');
            $('#usersTable').on('click', '.action-icon', function() {
              const action = $(this).data('action');
              const rowData = table.row($(this).parents('tr')).data();

              if (action === 'edit') {
                setEditingUser(rowData);
                setShowModal(true);
              } else if (action === 'reassign') {
                setReassigning(rowData);
              } else if (action === 'delete') {
                handleDelete(rowData);
              }
            });

            tableInstanceRef.current = table;
            if (filters.search || filters.role || filters.status) applyFilters(); // re-apply active filter after (re)build
          } catch (e) {
            console.error('DataTable initialization error:', e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to initialize table: ' + e.message });
          }
        }, 150);
      };

      const applyFilters = () => {
        if (!tableInstanceRef.current) return;

        tableInstanceRef.current.columns().search('').draw();

        if (filters.role) {
          tableInstanceRef.current.column(2).search(filters.role).draw(false);
        }
        if (filters.status) {
          tableInstanceRef.current.column(3).search(filters.status).draw(false);
        }
        if (filters.search) {
          tableInstanceRef.current.search(filters.search).draw(false);
        }

        tableInstanceRef.current.draw();
      };

      const clearFilters = () => {
        setFilters({ role: '', status: '', search: '' });
        if (tableInstanceRef.current) {
          tableInstanceRef.current.search('').columns().search('').draw();
        }
      };

      useEffect(() => {
        if (tableInstanceRef.current && rows && rows.length) {
          applyFilters();
        }
      }, [filters]);

      const handleSave = (userData) => {
        const action = editingUser ? 'updateUser' : 'addUser';
        const params = editingUser ? [editingUser.Username, userData, currentUser] : [userData, currentUser];

        google.script.run
          .withSuccessHandler((result) => {
            if (result.success) {
              setShowModal(false);
              setEditingUser(null);
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                timer: 2000,
                showConfirmButton: false
              });
              mutate();                  // refresh users list
              swrMutate('dash:stats');   // + dashboard KPIs
            } else {
              Swal.fire({ icon: 'error', title: 'Error', text: result.message });
            }
          })
          .withFailureHandler((err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
          })
          [action](...params);
      };

      const handleDelete = (user) => {
        Swal.fire({
          icon: 'warning',
          title: 'Deactivate User?',
          text: `"${user.Username}" is set Inactive — login blocked, history and lead attribution kept. You can reactivate later from Edit.`,
          showCancelButton: true,
          confirmButtonColor: '#ea4335',
          confirmButtonText: 'Deactivate'
        }).then((result) => {
          if (result.isConfirmed) {
            google.script.run
              .withSuccessHandler((r) => {
                if (r.success) {
                  mutate();
                  swrMutate('dash:stats');
                  if (r.openLeads > 0) { // offboarding: offer the one-action reassign right away
                    Swal.fire({ icon: 'warning', title: 'User deactivated', text: r.openLeads + ' open lead(s) still assigned — reassign their work now?',
                                showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Reassign now', cancelButtonText: 'Later' })
                      .then((rr) => { if (rr.isConfirmed) setReassigning(user); });
                  } else {
                    Swal.fire({ icon: 'success', text: r.message, timer: 2000, showConfirmButton: false });
                  }
                } else {
                  Swal.fire({ icon: 'error', title: 'Error', text: r.message });
                }
              })
              .withFailureHandler((err) => {
                Swal.fire({ icon: 'error', title: 'Error', text: err.message });
              })
              .deleteUser(user.Username, currentUser);
          }
        });
      };

      return (
        <div className="data-section">
          {loading ? <KpiSkeleton /> : (
            <div className="lte-kpi-grid">
              {kpi.map(([v, l, ic, c], i) => <SmallBox key={i} value={v} label={l} icon={ic} color={c} />)}
            </div>
          )}

          {!loading && (
            <div className="filters-section">
              <div className="filters-header">
                <h3><i className="fas fa-filter"></i> Filters</h3>
                <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  <i className="fas fa-times-circle"></i> Clear
                </button>
              </div>
              <div className="filters-grid">
                <div className="filter-group">
                  <label><i className="fas fa-search"></i> Search</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Search users..."
                    className="filter-input"
                  />
                </div>
                <SearchableDropdown label="Role" icon="fas fa-user-tag"
                  options={opts(['Admin', 'Manager', 'Agent'])}
                  value={filters.role} onChange={(v) => setFilters({ ...filters, role: v })} placeholder="All Roles" />
                <SearchableDropdown label="Status" icon="fas fa-check-circle"
                  options={opts(['Active', 'Inactive'])}
                  value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} placeholder="All Status" />
              </div>
            </div>
          )}

          {loading && <TableSkeleton rows={8} columns={6} />}
          <div style={{ display: loading ? 'none' : 'block' }}>
            <table id="usersTable" className="display" style={{width: '100%'}}></table>
          </div>

          {/* hidden — opened by the Import CSV toolbar button */}
          <input type="file" id="usersCsvImport" accept=".csv" style={{display: 'none'}} onChange={handleImport} />

          {showModal && (
            <UserModal
              user={editingUser}
              onClose={() => {
                setShowModal(false);
                setEditingUser(null);
              }}
              onSave={handleSave}
            />
          )}

          {reassigning && (
            <ReassignWorkModal fromUser={reassigning} users={rows || []} currentUser={currentUser}
                               onClose={() => setReassigning(null)}
                               onSaved={() => { setReassigning(null); mutate();
                                 ['props:all', 'leads:all', 'fus:all', 'appts:all', 'dash:stats', 'lookups'].forEach((k) => swrMutate(k)); }} />
          )}
        </div>
      );
    }

    // offboarding action — properties/leads/follow-ups/appointments move in ONE call
    function ReassignWorkModal({ fromUser, users, currentUser, onClose, onSaved }) {
      const [toUser, setToUser] = useState('');
      const [saving, setSaving] = useState(false);
      const targets = users.filter((u) => u.Status === 'Active' && u.Username !== fromUser.Username);
      const submit = (e) => {
        e.preventDefault();
        if (!toUser) return;
        setSaving(true);
        gsRun('reassignAgentWork', fromUser.Username, toUser, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) {
            const m = r.moved || {};
            Swal.fire({ icon: 'success', title: r.message,
              html: '<small>Properties: ' + (m.Properties || 0) + ' · Leads: ' + (m.Leads || 0) + ' · Follow-ups: ' + (m.FollowUps || 0) + ' · Appointments: ' + (m.Appointments || 0) + '</small>' });
            onSaved();
          } else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };
      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3><i className="fas fa-people-arrows"></i> Reassign "{fromUser.Username}"'s work</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#789', fontSize: 13.5, marginBottom: 12 }}>Every property, lead, follow-up and appointment assigned to <strong>{fromUser.Username}</strong> moves to the user you pick — the standard offboarding step before deactivation.</p>
              <form onSubmit={submit}>
                <SearchableDropdown label="Move everything to" icon="fas fa-user-tie"
                  options={targets.map((u) => ({ value: u.Username, label: u.Username + ' (' + u.Role + ')' }))}
                  value={toUser} onChange={setToUser} placeholder="Pick a user…" required={true} />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !toUser}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Moving…</> : <><i className="fas fa-people-arrows"></i> Reassign All</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== User Modal ==============
    function UserModal({ user, onClose, onSave }) {
      const [formData, setFormData] = useState({
        Username: user?.Username || '',
        Email: user?.Email || '',
        Password: '',
        Role: user?.Role || 'Agent',
        Status: user?.Status || 'Active',
        MonthlyTarget: user?.MonthlyTarget || 0
      });
      const [saving, setSaving] = useState(false);

      const handleSubmit = (e) => {
        e.preventDefault();
        setSaving(true);
        onSave(formData);
      };

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <i className="fas fa-user-edit"></i> {user ? 'Sửa người dùng' : 'Thêm người dùng'}
              </h3>
              <button className="close-btn" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tên đăng nhập *</label>
                    <input
                      type="text"
                      value={formData.Username}
                      onChange={(e) => setFormData({...formData, Username: e.target.value})}
                      required
                      disabled={!!user}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={formData.Email}
                      onChange={(e) => setFormData({...formData, Email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mật khẩu {user ? '(để trống nếu giữ mật khẩu hiện tại)' : '*'}</label>
                    <input
                      type="password"
                      value={formData.Password}
                      onChange={(e) => setFormData({...formData, Password: e.target.value})}
                      required={!user}
                      autoComplete="new-password"
                    />
                  </div>
                  <SearchableDropdown label="Role" icon="fas fa-user-shield"
                    options={opts(['Admin', 'Manager', 'Agent'])}
                    value={formData.Role} onChange={(v) => setFormData({ ...formData, Role: v })} placeholder="Role…" required={true} />
                  <SearchableDropdown label="Status" icon="fas fa-toggle-on"
                    options={opts(['Active', 'Inactive'])}
                    value={formData.Status} onChange={(v) => setFormData({ ...formData, Status: v })} placeholder="Status…" required={true} />
                  <div className="form-group">
                    <label><i className="fas fa-bullseye"></i> Mục tiêu tháng (VNĐ) <small style={{ color: '#999', textTransform: 'none' }}>(0 = không đặt mục tiêu — dùng tính tỷ lệ bảng xếp hạng)</small></label>
                    <input type="number" min="0" step="any" value={formData.MonthlyTarget}
                           onChange={(e) => setFormData({...formData, MonthlyTarget: e.target.value})} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                    ) : (
                      <><i className="fas fa-save"></i> Lưu</>
                    )}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    <i className="fas fa-times"></i> Hủy
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== My Account (User Profile) ==============
    function AccountView({ currentUser, currentEmail, role }) {
      const [formData, setFormData] = useState({
        Email: currentEmail || '',
        CurrentPassword: '',
        NewPassword: '',
        ConfirmPassword: ''
      });
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);
      const fileInputRef = useRef(null);

      const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng chọn một tệp hình ảnh' });
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          setUploading(true);
          const base64Data = event.target.result;

          google.script.run
            .withSuccessHandler((result) => {
              setUploading(false);
              if (result.success) {
                google.script.run
                  .withSuccessHandler((r) => {
                    if (r.success) {
                      Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật ảnh đại diện!', timer: 2000, showConfirmButton: false });
                    }
                  })
                  .updateUserSettings(currentUser, { profileImage: result.fileUrl });
              } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message });
              }
            })
            .withFailureHandler((err) => {
              setUploading(false);
              Swal.fire({ icon: 'error', title: 'Error', text: err.message });
            })
            .uploadFile(base64Data, file.name, 'profile');
        };
        reader.readAsDataURL(file);
      };

      const handleSubmit = (e) => {
        e.preventDefault();

        if (formData.NewPassword && formData.NewPassword !== formData.ConfirmPassword) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'New passwords do not match!' });
          return;
        }

        setSaving(true);
        google.script.run
          .withSuccessHandler((result) => {
            setSaving(false);
            if (result.success) {
              Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: result.message,
                timer: 2000,
                showConfirmButton: false
              });
              setFormData({
                ...formData,
                CurrentPassword: '',
                NewPassword: '',
                ConfirmPassword: ''
              });
            } else {
              Swal.fire({ icon: 'error', title: 'Error', text: result.message });
            }
          })
          .withFailureHandler((err) => {
            setSaving(false);
            Swal.fire({ icon: 'error', title: 'Error', text: err.message });
          })
          .updateMyAccount(currentUser, formData);
      };

      return (
        <div className="profile-section">
          <div className="profile-header">
            <div className="profile-avatar">
              {currentUser.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h2>{currentUser}</h2>
              <p>{role} Account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username (Cannot be changed)</label>
              <input
                type="text"
                value={currentUser}
                disabled
                style={{background: '#f5f5f5', cursor: 'not-allowed'}}
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.Email}
                onChange={(e) => setFormData({...formData, Email: e.target.value})}
                required
              />
            </div>

            <div style={{marginTop: '25px'}}>
            <h3 style={{marginBottom: '18px', color: 'var(--navy-primary)', fontSize: '17px'}}>
              <i className="fas fa-image"></i> Ảnh đại diện
            </h3>
            <div style={{marginBottom: '18px'}}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{display: 'none'}}
              />
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Đang tải lên...</>
                ) : (
                  <><i className="fas fa-upload"></i> Tải ảnh lên</>
                )}
              </button>
              <p style={{marginTop: '10px', fontSize: '13px', color: '#666'}}>
                Tải ảnh đại diện mới (tự động đồng bộ làm Logo &amp; Ảnh đại diện toàn hệ thống). Kích thước đề xuất: 200×200 px
              </p>
            </div>
          </div>

          <hr style={{margin: '25px 0', border: 'none', borderTop: '2px solid #e0e0e0'}} />

            <h3 style={{color: 'var(--navy-primary)', marginBottom: '18px', fontSize: '18px'}}>
              <i className="fas fa-lock"></i> Đổi mật khẩu
            </h3>

            <div className="form-group">
              <label>Current Password *</label>
              <input
                type="password"
                value={formData.CurrentPassword}
                onChange={(e) => setFormData({...formData, CurrentPassword: e.target.value})}
                required
                autoComplete="current-password"
              />
            </div>

            <div className="form-group">
              <label>New Password (Leave blank to keep current)</label>
              <input
                type="password"
                value={formData.NewPassword}
                onChange={(e) => setFormData({...formData, NewPassword: e.target.value})}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={formData.ConfirmPassword}
                onChange={(e) => setFormData({...formData, ConfirmPassword: e.target.value})}
                autoComplete="new-password"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin"></i> Saving...</>
                ) : (
                  <><i className="fas fa-save"></i> Update Account</>
                )}
              </button>
            </div>
          </form>
        </div>
      );
    }

    // ============== Settings Page ==============
    // admin-only: OpenAI key + model for the AI assistant (key write-only — server never returns it)
    function AiSettingsCard({ currentUser }) {
      const { data, mutate } = useSWR('ai:cfg', () => gsRun('getAiConfig', currentUser), SWR_LIVE);
      const cfg = data && data.success ? data : null;
      const [key, setKey] = useState('');
      const [model, setModel] = useState('');
      const [saving, setSaving] = useState(false);
      useEffect(() => { if (cfg && !model) setModel(cfg.model); }, [cfg]);
      const AI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'gpt-5-mini', 'gpt-5', 'o4-mini'];
      const options = Array.from(new Set(AI_MODELS.concat(cfg && cfg.model ? [cfg.model] : []))).map((m) => ({ value: m, label: m }));
      const save = () => {
        if (!key.trim() && !(cfg && cfg.hasKey)) return Swal.fire({ icon: 'warning', title: 'API key required', text: 'Paste your OpenAI key (sk-…) the first time.' });
        setSaving(true);
        gsRun('setAiConfig', key.trim(), model, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { setKey(''); mutate(); Swal.fire({ icon: 'success', title: r.message, timer: 1600, showConfirmButton: false }); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch(() => setSaving(false));
      };
      return (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 14, color: 'var(--navy-primary)', fontSize: 17 }}><i className="fas fa-robot"></i> Trợ lý AI (ChatGPT)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label><i className="fas fa-key"></i> Khóa API OpenAI {cfg && cfg.hasKey
                ? <small style={{ color: '#2e7d32', textTransform: 'none' }}>(đã lưu ✓ đuôi …{cfg.keyTail} — dán khóa mới để thay thế)</small>
                : <small style={{ color: '#c0392b', textTransform: 'none' }}>(chưa thiết lập)</small>}</label>
              <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="sk-…" autoComplete="off" />
            </div>
            <SearchableDropdown label="Mô hình" icon="fas fa-microchip" options={options} value={model} onChange={setModel} placeholder="Chọn mô hình…" />
          </div>
          <p style={{ fontSize: 12.5, color: '#789', margin: '2px 0 10px' }}><i className="fas fa-shield-halved"></i> Khóa được lưu trong Script Properties và chỉ sử dụng phía máy chủ; không bao giờ gửi xuống trình duyệt. Mỗi người dùng chỉ trò chuyện trên dữ liệu được cấp quyền.</p>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Lưu cài đặt AI</>}
          </button>
        </div>
      );
    }

    // admin-only: agency money defaults + round-robin toggle (Script Properties backed)
    function MoneyDefaultsCard({ currentUser }) {
      const { data, mutate } = useSWR('cfg', () => gsRun('getAppConfig', currentUser), SWR_LIVE);
      const cfg = data && data.success ? data.cfg : null;
      const [form, setForm] = useState(null);
      const [saving, setSaving] = useState(false);
      useEffect(() => { if (cfg && !form) setForm({ ...cfg }); }, [cfg]);
      if (!form) return null;
      const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      const save = () => {
        setSaving(true);
        gsRun('setAppConfig', form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { mutate(); Swal.fire({ icon: 'success', title: r.message, timer: 1600, showConfirmButton: false }); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch(() => setSaving(false));
      };
      return (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 14, color: 'var(--navy-primary)', fontSize: 17 }}><i className="fas fa-sack-dollar"></i> Thiết lập tài chính mặc định (toàn công ty)</h3>
          <div className="form-grid">
            <div className="form-group">
              <label><i className="fas fa-percent"></i> Hoa hồng % — Bán</label>
              <input type="number" min="0" step="any" value={form.commissionPctSale} onChange={setEv('commissionPctSale')} />
            </div>
            <div className="form-group">
              <label><i className="fas fa-percent"></i> Hoa hồng % — Thuê <small style={{ color: '#999', textTransform: 'none' }}>(100 = một tháng tiền thuê)</small></label>
              <input type="number" min="0" step="any" value={form.commissionPctRent} onChange={setEv('commissionPctRent')} />
            </div>
            <div className="form-group">
              <label><i className="fas fa-user-tie"></i> Tỷ lệ hoa hồng của nhân viên</label>
              <input type="number" min="0" max="100" step="any" value={form.agentSharePct} onChange={setEv('agentSharePct')} />
            </div>
            <div className="form-group">
              <label><i className="fas fa-file-signature"></i> Tỷ lệ tăng khi gia hạn</label>
              <input type="number" min="0" step="any" value={form.renewalIncrementPct} onChange={setEv('renewalIncrementPct')} />
            </div>
            <div className="form-group">
              <label><i className="fas fa-shuffle"></i> Luân phiên khách hàng từ website <small style={{ color: '#999', textTransform: 'none' }}>(tự động giao cho nhân viên đang hoạt động)</small></label>
              <div className="toggle-row">
                <input type="checkbox" className="toggle" id="cfgRoundRobin" checked={Number(form.roundRobin) === 1}
                       onChange={(e) => setForm((f) => ({ ...f, roundRobin: e.target.checked ? 1 : 0 }))} />
                <label htmlFor="cfgRoundRobin" style={{ textTransform: 'none', fontSize: 13, color: '#6b7a89', cursor: 'pointer' }}>
                  {Number(form.roundRobin) === 1 ? 'Bật — khách hàng mới từ website được luân phiên giữa các nhân viên' : 'Tắt — khách hàng từ website chưa được phân công'}
                </label>
              </div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Lưu thiết lập tài chính</>}
          </button>
        </div>
      );
    }

    // Agency Company Information Card
    function AgencyBrandingCard({ currentUser }) {
      const [branding, setBranding] = useState({ name: '', logo: '', phone: '', address: '', slogan: '' });
      const [saving, setSaving] = useState(false);

      useEffect(() => {
        google.script.run
          .withSuccessHandler((res) => {
            if (res && res.success && res.branding) {
              setBranding(res.branding);
            }
          })
          .getAgencyBranding();
      }, []);

      const handleSave = (e) => {
        e.preventDefault();
        setSaving(true);
        google.script.run
          .withSuccessHandler((res) => {
            setSaving(false);
            if (res && res.success) {
              Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Đã cập nhật Tên công ty & Thông tin liên hệ!',
                timer: 1600,
                showConfirmButton: false
              }).then(() => {
                window.location.reload();
              });
            } else {
              Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Không thể lưu' });
            }
          })
          .withFailureHandler((err) => {
            setSaving(false);
            Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
          })
          .saveAgencyBranding(branding, currentUser);
      };

      return (
        <div style={{ marginTop: 22 }}>
          <h3 style={{ marginBottom: 14, color: 'var(--navy-primary)', fontSize: 17 }}>
            <i className="fas fa-building"></i> Thông tin &amp; Tên công ty
          </h3>
          <form onSubmit={handleSave}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <div className="form-group">
                <label><i className="fas fa-signature"></i> Tên công ty / Sàn BĐS *</label>
                <input
                  value={branding.name || ''}
                  onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                  required
                  placeholder="Ví dụ: Tên công ty bất động sản"
                />
              </div>

              <div className="form-group">
                <label><i className="fas fa-phone"></i> Hotline / SĐT liên hệ</label>
                <input
                  value={branding.phone || ''}
                  onChange={(e) => setBranding({ ...branding, phone: e.target.value })}
                  placeholder="0901 234 567"
                />
              </div>

              <div className="form-group">
                <label><i className="fas fa-location-dot"></i> Địa chỉ trụ sở</label>
                <input
                  value={branding.address || ''}
                  onChange={(e) => setBranding({ ...branding, address: e.target.value })}
                  placeholder="Hà Nội & TP. Hồ Chí Minh, Việt Nam"
                />
              </div>
            </div>

            <p style={{ fontSize: 12.5, color: '#789', margin: '6px 0 10px' }}>
              <i className="fas fa-circle-info"></i> Tên công ty và hotline sẽ hiển thị trên Cổng thông tin BĐS, Màn hình đăng nhập, Menu CRM và các tài liệu/hợp đồng xuất ra.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 8 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Lưu thông tin công ty</>}
              </button>
            </div>
          </form>
        </div>
      );
    }

    function SettingsView({ currentUser, role, onSettingsUpdate }) {
      const [uploading, setUploading] = useState(false);
      const [customColors, setCustomColors] = useState({
        primary: '#001f3f',
        accent: '#0074D9',
        text: '#333333'
      });
      const [themeId, setThemeId] = useState('');        // currently applied preset (saved)
      const [previewId, setPreviewId] = useState('');    // preset being previewed (not yet committed)
      const [defaultId, setDefaultId] = useState('');    // app-wide default (admin-set)
      const [showAdvanced, setShowAdvanced] = useState(false);
      const isAdmin = role === 'Admin';
      const fileInputRef = useRef(null);

      const { data: settingsRes } = useSWR('settings:' + currentUser, () => gsRun('getUserSettings', currentUser), SWR_LIVE);
      useEffect(() => {
        const cc = settingsRes && settingsRes.success && settingsRes.settings && settingsRes.settings.customColors;
        if (cc) { try { const o = JSON.parse(cc); if (o.themeId) { setThemeId(o.themeId); setPreviewId(o.themeId); } if (o.primary) setCustomColors({ primary: o.primary, accent: o.accent, text: o.text || '#333333' }); } catch (e) {} }
      }, [settingsRes]);

      const { data: defRes } = useSWR('defaultTheme', () => gsRun('getDefaultTheme'), SWR_LIVE);
      useEffect(() => { if (defRes && defRes.success && defRes.id) setDefaultId(defRes.id); }, [defRes]);

      // click a card → preview only (no apply, no save)
      const previewTheme = (t) => setPreviewId(t.id);

      // "Set Now" → commit the previewed preset: apply live + persist to this user
      const applySelectedTheme = () => {
        const t = findTheme(previewId) || findTheme(themeId) || UI_THEMES[0];
        const vars = themeVars(t);
        applyThemeVars(vars);
        cacheThemeVars(vars);
        setThemeId(t.id);
        const payload = { themeId: t.id, vars: vars, primary: t.primary, accent: t.accent, text: '#1A1A1A' };
        google.script.run
          .withSuccessHandler((r) => { if (r.success) { Swal.fire({ icon: 'success', title: 'Đã áp dụng giao diện!', text: t.name, timer: 1400, showConfirmButton: false }); onSettingsUpdate(); } })
          .updateUserSettings(currentUser, { customColors: JSON.stringify(payload) });
      };

      // admin: make this preset the first-load default for everyone
      const makeDefault = (t) => {
        google.script.run
          .withSuccessHandler((r) => {
            if (r && r.success) { setDefaultId(t.id); Swal.fire({ icon: 'success', title: 'Đã đặt làm mặc định!', text: t.name + ' sẽ được tải cho mọi người dùng trong lần mở đầu tiên.', timer: 1800, showConfirmButton: false }); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
          })
          .setDefaultTheme(t.id, JSON.stringify(themeVars(t)), currentUser);
      };

      const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Vui lòng chọn một tệp hình ảnh' });
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          setUploading(true);
          const base64Data = event.target.result;

          google.script.run
            .withSuccessHandler((result) => {
              setUploading(false);
              if (result.success) {
                google.script.run
                  .withSuccessHandler((r) => {
                    if (r.success) {
                      Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã cập nhật ảnh đại diện!', timer: 2000, showConfirmButton: false });
                      onSettingsUpdate();
                    }
                  })
                  .updateUserSettings(currentUser, { profileImage: result.fileUrl });
              } else {
                Swal.fire({ icon: 'error', title: 'Error', text: result.message });
              }
            })
            .withFailureHandler((err) => {
              setUploading(false);
              Swal.fire({ icon: 'error', title: 'Error', text: err.message });
            })
            .uploadProfileImage(base64Data, file.name, currentUser);
        };
        reader.readAsDataURL(file);
      };

      const handleColorChange = (type, color) => {
        setCustomColors({...customColors, [type]: color});
      };

      const applyColors = () => {
        setThemeId(''); // custom overrides preset
        const vars = { '--navy-primary': customColors.primary, '--navy-dark': customColors.primary, '--navy-light': customColors.accent, '--navy-accent': customColors.accent, '--text-primary': customColors.text };
        applyThemeVars(vars); cacheThemeVars(vars);
        const payload = { primary: customColors.primary, accent: customColors.accent, text: customColors.text, vars: vars };
        google.script.run
          .withSuccessHandler((result) => {
            if (result.success) {
              Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã áp dụng bảng màu!', timer: 2000, showConfirmButton: false });
              onSettingsUpdate();
            }
          })
          .updateUserSettings(currentUser, { customColors: JSON.stringify(payload) });
      };

      const resetToDefaultColors = () => {
        const defaultColors = { primary: '#001f3f', accent: '#0074D9', text: '#333333' };
        setCustomColors(defaultColors); setThemeId('');
        try { localStorage.removeItem('app_theme_vars'); } catch (e) {}
        const root = document.documentElement;
        ['--navy-primary','--navy-dark','--navy-light','--navy-hover','--navy-accent','--c-secondary','--c-bg','--c-card','--c-on-accent','--text-primary','--text-muted'].forEach(k => root.style.removeProperty(k));

        google.script.run
          .withSuccessHandler((result) => {
            if (result.success) {
              Swal.fire({ icon: 'success', title: 'Đã đặt lại!', text: 'Màu sắc đã trở về giao diện Xanh hải quân mặc định!', timer: 2000, showConfirmButton: false });
              onSettingsUpdate();
            }
          })
          .updateUserSettings(currentUser, { customColors: '' });
      };

      const pv = findTheme(previewId) || findTheme(themeId) || UI_THEMES[0]; // theme shown in preview panel

      return (
        <div className="data-section">
          <div className="settings-info-message">
            <i className="fas fa-info-circle" style={{marginRight: '6px'}}></i>
            <strong>Lưu ý:</strong> Ảnh đại diện và màu giao diện là thiết lập cá nhân — thay đổi chỉ áp dụng cho tài khoản của bạn.
          </div>

          {isAdmin && <AgencyBrandingCard currentUser={currentUser} />}
          {isAdmin && <MoneyDefaultsCard currentUser={currentUser} />}
          {isAdmin && <AiSettingsCard currentUser={currentUser} />}

          <div style={{marginTop: '25px'}}>
            <h3 style={{marginBottom: '18px', color: 'var(--navy-primary)', fontSize: '17px'}}>
              <i className="fas fa-image"></i> Ảnh đại diện
            </h3>
            <div style={{marginBottom: '18px'}}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{display: 'none'}}
              />
              <button
                className="btn btn-primary"
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Đang tải lên...</>
                ) : (
                  <><i className="fas fa-upload"></i> Tải ảnh lên</>
                )}
              </button>
              <p style={{marginTop: '10px', fontSize: '13px', color: '#666'}}>
                Tải ảnh đại diện mới. Kích thước đề xuất: 200×200 px
              </p>
            </div>
          </div>

          

          <hr style={{margin: '25px 0', border: 'none', borderTop: '2px solid #e0e0e0'}} />

          <div style={{marginTop: '25px'}}>
            <h3 style={{marginBottom: '6px', color: 'var(--navy-primary)', fontSize: '17px'}}>
              <i className="fas fa-palette"></i> Giao diện
            </h3>
            <p style={{fontSize: '12px', color: '#666', marginBottom: '14px'}}>
              Chọn một bảng màu để xem trước bên dưới — hệ thống chỉ thay đổi khi bạn nhấn <strong>Áp dụng ngay</strong>.
              {isAdmin && ' Quản trị viên cũng có thể đặt giao diện mặc định cho người dùng trong lần truy cập đầu tiên.'}
            </p>

            <div className="theme-gallery">
              {UI_THEMES.map((t) => (
                <div
                  key={t.id}
                  className={'theme-card' + (themeId === t.id ? ' active' : '') + (pv.id === t.id ? ' previewing' : '')}
                  onClick={() => previewTheme(t)}
                  title={'Xem trước ' + t.name}
                >
                  <div className="theme-swatch">
                    <span style={{background: t.primary}}></span>
                    <span style={{background: t.secondary}}></span>
                    <span style={{background: t.bg}}></span>
                    <span className="sw-accent" style={{background: t.accent}}></span>
                  </div>
                  <div className="theme-body">
                    <div className="theme-name">
                      {t.name}
                      {defaultId === t.id && <span className="theme-default-badge">MẶC ĐỊNH</span>}
                    </div>
                    <div className="theme-id">{t.id}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* live preview of the picked palette on a mini dashboard */}
            <div className="theme-preview-panel">
              <div className="tp-head">
                <span className="tp-title"><i className="fas fa-eye" style={{marginRight: '6px', color: 'var(--navy-accent)'}}></i>{pv.name}</span>
                <span className="tp-chip">{pv.id}</span>
                {themeId === pv.id && <span className="tp-tag applied">ĐANG ÁP DỤNG</span>}
                {defaultId === pv.id && <span className="tp-tag deft">MẶC ĐỊNH</span>}
              </div>

              <div className="tp-mock" style={{background: pv.bg}}>
                <div className="tp-side" style={{background: pv.primary}}>
                  <div className="tp-logo"></div>
                  {['fa-gauge-high','fa-table-cells-large','fa-users','fa-gear'].map(ic => <i className={'fas ' + ic} key={ic}></i>)}
                </div>
                <div className="tp-body2">
                  <div className="tp-nav" style={{background: pv.card}}>
                    <span className="tp-h" style={{background: pv.secondary}}></span>
                    <span className="tp-av" style={{background: pv.accent}}></span>
                  </div>
                  <div className="tp-content">
                    <div className="tp-kpis">
                      {[['128','ĐƠN HÀNG',pv.primary,'#fff'],['9,4tr','DOANH THU',pv.secondary,'#fff'],['+18%','TĂNG TRƯỞNG',pv.accent,pv.onAccent]].map(([n,l,bg,c],i) =>
                        <div className="tp-kpi" style={{background: bg, color: c}} key={i}><b>{n}</b><small>{l}</small></div>)}
                    </div>
                    <div className="tp-row">
                      <button className="tp-btn" style={{background: pv.accent, color: pv.onAccent}}>Thao tác chính</button>
                      <span className="tp-badge" style={{background: pv.secondary, color: '#fff'}}>Hoạt động</span>
                      <span style={{flex: 1, height: '8px', background: 'rgba(0,0,0,.06)'}}></span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="tp-legend">
                {[['Màu chính','primary'],['Màu phụ','secondary'],['Nền','bg'],['Thẻ','card'],['Điểm nhấn','accent']].map(([l,k]) =>
                  <span className="tp-leg" key={k}><span className="tp-sw" style={{background: pv[k]}}></span>{l}</span>)}
              </div>

              <div className="tp-actions">
                <button className="btn btn-success" onClick={applySelectedTheme} disabled={themeId === pv.id}>
                  <i className="fas fa-check"></i> {themeId === pv.id ? 'Đang áp dụng' : 'Áp dụng ngay'}
                </button>
                {isAdmin && (
                  <button className="btn btn-secondary" onClick={() => makeDefault(pv)} disabled={defaultId === pv.id}>
                    <i className="fas fa-thumbtack"></i> {defaultId === pv.id ? 'Đang là mặc định' : 'Đặt làm mặc định'}
                  </button>
                )}
                {themeId === pv.id && <span className="tp-applied-note"><i className="fas fa-circle-check"></i> Bảng màu này đang được áp dụng cho tài khoản của bạn</span>}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{marginTop: '18px'}}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              <i className={'fas fa-' + (showAdvanced ? 'chevron-up' : 'sliders-h')}></i> {showAdvanced ? 'Ẩn tùy chỉnh màu nâng cao' : 'Tùy chỉnh màu nâng cao'}
            </button>

            {showAdvanced && (
            <div style={{marginTop: '18px'}}>
            <div className="form-grid">
              <div className="form-group">
                <label>Màu chính</label>
                <input
                  type="color"
                  value={customColors.primary}
                  onChange={(e) => handleColorChange('primary', e.target.value)}
                  style={{width: '100%', height: '48px', cursor: 'pointer'}}
                />
              </div>
              <div className="form-group">
                <label>Màu điểm nhấn</label>
                <input
                  type="color"
                  value={customColors.accent}
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  style={{width: '100%', height: '48px', cursor: 'pointer'}}
                />
              </div>
              <div className="form-group">
                <label>Màu chữ</label>
                <input
                  type="color"
                  value={customColors.text}
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  style={{width: '100%', height: '48px', cursor: 'pointer'}}
                />
              </div>
            </div>

            <div className="color-preview-section">
              <h4 style={{fontSize: '14px', fontWeight: '600', marginBottom: '5px', color: 'var(--navy-primary)'}}>
                <i className="fas fa-eye"></i> Xem trước trực tiếp
              </h4>
              <p style={{fontSize: '12px', color: '#666', marginBottom: '10px'}}>Xem cách các màu phối hợp với nhau</p>
              <div className="color-preview-grid">
                <div className="color-preview-item">
                  <div className="color-preview-box" style={{backgroundColor: customColors.primary}}></div>
                  <div className="color-preview-label">Màu chính</div>
                  <div className="color-preview-value">{customColors.primary}</div>
                </div>
                <div className="color-preview-item">
                  <div className="color-preview-box" style={{backgroundColor: customColors.accent}}></div>
                  <div className="color-preview-label">Điểm nhấn</div>
                  <div className="color-preview-value">{customColors.accent}</div>
                </div>
                <div className="color-preview-item">
                  <div className="color-preview-box" style={{backgroundColor: customColors.text}}></div>
                  <div className="color-preview-label">Màu chữ</div>
                  <div className="color-preview-value">{customColors.text}</div>
                </div>
              </div>
            </div>

            <div style={{display: 'flex', gap: '10px', marginTop: '18px', flexWrap: 'wrap'}}>
              <button className="btn btn-success" onClick={applyColors}>
                <i className="fas fa-check"></i> Áp dụng màu
              </button>
              <button className="btn btn-secondary" onClick={resetToDefaultColors}>
                <i className="fas fa-undo"></i> Đặt lại màu xanh mặc định
              </button>
            </div>
            </div>
            )}
          </div>
        </div>
      );
    }

    // ============== Activity Logs View ==============
    function LogsView({ currentUser, initialSearch }) {
      const { data, error } = useSWR('logs:all', () => gsRun('getLogs', currentUser), SWR_LIVE);
      const rows = data ? (data.success ? data.data : []) : undefined;
      const loading = rows === undefined && !error;
      // kpi from cached rows — [value, label, icon, color]
      const kpi = useMemo(() => {
        const list = rows || [], today = new Date().toDateString();
        const isToday = (t) => { try { const d = new Date(t); return !isNaN(d.getTime()) && d.toDateString() === today; } catch (e) { return false; } };
        return [
          [list.length, 'Tổng số hoạt động', 'fa-list-check', 'bg-navy'],
          [list.filter((l) => isToday(l.Timestamp)).length, 'Hoạt động hôm nay', 'fa-calendar-day', 'bg-success'],
          [new Set(list.map((l) => l.User).filter(Boolean)).size, 'Người dùng phát sinh', 'fa-user-group', 'bg-info'],
          [list.filter((l) => /login/i.test(l.Action || '')).length, 'Lượt đăng nhập', 'fa-right-to-bracket', 'bg-warning'],
        ];
      }, [rows]);
      const tableRef = useRef(null);

      // rows change: same data -> untouched · changed -> in-place swap (keeps page/search) · first load -> full build
      const rowsSigRef = useRef('');
      useEffect(() => {
        if (!rows) return;
        const sig = JSON.stringify(rows);
        if (tableRef.current && sig === rowsSigRef.current) return; // background refresh, nothing changed
        rowsSigRef.current = sig;
        if (tableRef.current) { try { tableRef.current.clear(); tableRef.current.rows.add(rows); tableRef.current.draw(false); return; } catch (e) {} }
        initTable(rows);
      }, [rows]);
      useEffect(() => () => { if (tableRef.current) { try { tableRef.current.destroy(); tableRef.current = null; } catch (e) {} } }, []); // destroy on unmount ONLY

      useEffect(() => { if (initialSearch && tableRef.current) tableRef.current.search(initialSearch).draw(); }, [initialSearch, rows]); // seed from 360 search

      // publish this section's buttons -> header toolbar; audit view = exports only, no import
      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
        ]);
        return () => setPageActions([]);
      }, []);

      const initTable = (data) => {
        if (tableRef.current) { try { tableRef.current.destroy(); tableRef.current = null; $('#logsTable').empty(); } catch (e) {} }
        setTimeout(() => {
          try {
            tableRef.current = $('#logsTable').DataTable({
              data, destroy: true,
              language: DT_VI_LANGUAGE,
              columns: [
                { data: 'Timestamp', title: 'Thời gian', render: (d) => {
                    if (!d) return '<span style="color:#999;">N/A</span>';
                    try { const dt = new Date(d); if (isNaN(dt.getTime())) return d;
                      return dt.toLocaleString('vi-VN', { year:'numeric', month:'short', day:'2-digit', hour:'2-digit', minute:'2-digit' }); }
                    catch (e) { return d; }
                  } },
                { data: 'User', title: 'Người dùng' },
                { data: 'Action', title: 'Hành động', render: (d) => `<span class="status-badge status-active">${esc(d)}</span>` },
                { data: 'Details', title: 'Chi tiết', render: (d, t) => (t === 'display' ? esc(d) : d) },
                { data: 'Changes', title: 'Nội dung thay đổi', orderable: false, render: (d, t) => {
                    if (t !== 'display') return (d || []).map((c) => c.f + ' ' + c.a + ' ' + c.b).join(' '); // still searchable
                    if (!d || !d.length) return '<span style="color:#b8c6d4">—</span>';
                    return d.map((c) => '<div class="chg"><b>' + esc(c.f) + '</b>'
                      + '<span class="chg-a">' + esc(c.a) + '</span>'
                      + '<i class="fas fa-arrow-right"></i>'
                      + '<span class="chg-b">' + esc(c.b) + '</span></div>').join('');
                  } }
              ],
              pageLength: 10, lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'All']],
              responsive: true, order: [], dom: 'lfrtip', // no B — buttons live in the page header
              columnDefs: [{ targets: '_all', defaultContent: '' }], // missing keys render blank, never warn
              buttons: [
                { extend: 'csv', text: 'CSV' },
                { extend: 'pdf', text: 'PDF' },
                { extend: 'print', text: 'In' }
              ]
            });
            if (initialSearch) tableRef.current.search(initialSearch).draw(); // seed from 360 search after (re)build
          } catch (e) { console.error('Logs table error:', e); }
        }, 150);
      };

      return (
        <div className="data-section">
          {loading ? <KpiSkeleton /> : (
            <div className="lte-kpi-grid">
              {kpi.map(([v, l, ic, c], i) => <SmallBox key={i} value={v} label={l} icon={ic} color={c} />)}
            </div>
          )}
          {loading && <TableSkeleton rows={8} columns={4} />}
          <div style={{ display: loading ? 'none' : 'block' }}>
            <table id="logsTable" className="display" style={{ width: '100%' }}></table>
          </div>
        </div>
      );
    }

    // ============== Roles & Permissions Matrix (Editor Only) ==============
    function PermissionsMatrixView({ currentUser }) {
      const { data: res, isLoading, mutate } = useSWR('rbac:matrix', () => gsRun('getRbacMatrix', currentUser), SWR_LIVE);
      const data = res && res.success ? res : null;
      const PERMS = [['v', 'View'], ['a', 'Add'], ['e', 'Edit'], ['d', 'Delete']];

      const toggle = (roleKey, pageKey, perm, cur, locked) => {
        if (locked) return;
        const nv = cur ? 0 : 1;
        mutate((d) => { // optimistic — mirror server logic (d = cached response)
          if (!d || !d.perms) return d;
          const perms = { ...d.perms }, rp = { ...(perms[roleKey] || {}) }, cell = { ...(rp[pageKey] || { v:0, a:0, e:0, d:0 }) };
          cell[perm] = nv;
          if (perm === 'v' && !nv) { cell.a = 0; cell.e = 0; cell.d = 0; }
          if (perm !== 'v' && nv) cell.v = 1;
          rp[pageKey] = cell; perms[roleKey] = rp; return { ...d, perms };
        }, false);
        gsRun('toggleRbac', roleKey, pageKey, perm, nv, currentUser)
          .then((r) => { if (!r || !r.success) { Swal.fire({ icon:'error', title:'Error', text:(r && r.message) || 'Failed' }); mutate(); } })
          .catch(() => mutate());
      };

      if (isLoading) return <div className="data-section"><TableSkeleton rows={8} columns={4} /></div>;
      if (!data) return <NoAccessView />;
      const groups = data.pages.map((p) => p.group).filter((g, i, a) => a.indexOf(g) === i);
      const tableMinW = 200 + data.roles.length * 120; // page col + min role col → wrap scrolls when many roles

      return (
        <div className="data-section">
          <p style={{ color:'#666', fontSize:'13px', marginBottom:'12px' }}>
            <i className="fas fa-info-circle"></i> Bật hoặc tắt quyền V·A·E·D theo từng vai trò và màn hình. Mọi thay đổi được lưu ngay. Quyền Admin được khóa toàn quyền.
          </p>
          <div className="rbac-wrap">
            <table className="rbac-table" style={{ minWidth: tableMinW + 'px' }}>
              <thead><tr>
                <th className="rbac-pagecol">Màn hình</th>
                {data.roles.map((r) => (
                  <th key={r.key}>
                    <span className="rbac-rolehead" style={{ background:r.color }}>{r.label}</span>
                    <div className="rbac-perm-legend">V·A·E·D</div>
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {groups.map((grp) => (
                  <React.Fragment key={grp}>
                    <tr className="rbac-grouprow"><td className="rbac-pagecol">{grp}</td>{data.roles.map((r) => <td key={r.key}></td>)}</tr>
                    {data.pages.filter((p) => p.group === grp).map((pg) => (
                      <tr key={pg.key}>
                        <td className="rbac-pagecol">{pg.label}</td>
                        {data.roles.map((r) => {
                          const cell = (data.perms[r.key] && data.perms[r.key][pg.key]) || { v:0, a:0, e:0, d:0 };
                          const locked = !!r.is_super;
                          return (
                            <td key={r.key}><div className="rbac-cell">
                              {PERMS.map(([pk, label]) => (
                                <button key={pk} title={label}
                                  className={`rbac-dot${cell[pk] ? ' on' : ''}${locked ? ' locked' : ''}`}
                                  disabled={locked}
                                  onClick={() => toggle(r.key, pg.key, pk, cell[pk], locked)}>{pk.toUpperCase()}</button>
                              ))}
                            </div></td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ============== Properties (inventory core) ==============
    function PropertiesView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const canAdd = can(perms, 'properties', 'a'), canEdit = can(perms, 'properties', 'e'), canDel = can(perms, 'properties', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [viewing, setViewing] = useState(null);
      const [dealFor, setDealFor] = useState(null); // property -> new deal prefill
      const [stage, setStage] = useState('');
      const [filters, setFilters] = useState({ search: initialSearch || '', type: '', listing: '', city: '', agent: '', mineOnly: !all }); // agents land on My Listings
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Tải dữ liệu thất bại', text: String((error && error.message) || error) }); }, [error]);

      const cityOf = useMemo(() => { const by = {}; (lookups.locations || []).forEach((l) => { by[l.id] = l; });
        return (id) => { let cur = by[id], g = 0; while (cur && cur.parentId && g++ < 5) cur = by[cur.parentId]; return cur ? cur.name : ''; }; }, [lookups.locations]);

      const base = useMemo(() => (rows || []).filter((p) =>
        (!filters.mineOnly || p.assignedAgent === currentUser) &&
        (!filters.type || p.propertyType === filters.type) &&
        (!filters.listing || p.listingType === filters.listing) &&
        (!filters.city || cityOf(p.locationId) === filters.city) &&
        (!filters.agent || p.assignedAgent === filters.agent)
      ), [rows, filters.mineOnly, filters.type, filters.listing, filters.city, filters.agent, cityOf, currentUser]);
      const counts = useMemo(() => { const o = {}; base.forEach((p) => { o[p.status] = (o[p.status] || 0) + 1; }); return o; }, [base]);
      const visible = useMemo(() => (stage ? base.filter((p) => p.status === stage) : base), [base, stage]);

      const kpi = useMemo(() => { const r = rows || []; return [
        [r.length, 'Total Listings', 'fa-building', 'bg-navy'],
        [r.filter((p) => p.status === 'Available').length, 'Available', 'fa-circle-check', 'bg-success'],
        [r.filter((p) => p.isFeatured && p.status === 'Available').length, 'Featured', 'fa-star', 'bg-warning'],
        [r.reduce((s, p) => s + (p.viewsCount || 0), 0).toLocaleString('en-US'), 'Portal Views', 'fa-eye', 'bg-info']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('properties_template.csv',
        'Title,PropertyType,ListingType,Price,RentFrequency,AreaSize,AreaUnit,Bedrooms,Bathrooms,Location,Address,OwnerName,OwnerPhone,AssignedAgent\n' +
        'Nhà phố mẫu,House,Sale,2350000000,,100,Sq M,3,3,Phase 5,Đường số 1,Chủ nhà 99,0905000099,agent1\n');

      // publish this section's buttons -> header toolbar; cleared on unmount
      useEffect(() => {
        const dt = () => tableRef.current; // resolve at click time (table rebuilds)
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Add Property', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('propsCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, p) => {
        if (action === 'view') setViewing(p);
        else if (action === 'edit') { setEditing(p); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Delete ' + (p.referenceCode || 'listing') + '?', text: 'It disappears from the portal and all CRM lists.', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Delete' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteProperty', p.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      const tableRef = useDataTable('propsTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: null, title: 'Photo', orderable: false, render: (d, t, p) => { const im = (p.images || []).find((i) => i.isPrimary) || (p.images || [])[0];
              return im ? '<img class="prop-thumb" src="' + esc(im.url) + '" loading="lazy">' : '<span style="color:#9ab"><i class="fas fa-image"></i></span>'; } },
          { data: 'referenceCode', title: 'Ref', render: (d) => '<span class="prop-ref">' + esc(d || '—') + '</span>' },
          { data: 'title', title: 'Title', render: (d, t, p) => '<strong>' + esc(d) + '</strong><br><small style="color:#789">' + esc(p.locationPath || '') + '</small>' },
          { data: 'propertyType', title: 'Type' },
          { data: 'price', title: 'Price', render: (d, t, p) => t === 'display'
              ? '<strong>' + esc(pkrShort(d)) + '</strong>' + (p.listingType === 'Rent' ? '<small style="color:#789">/' + esc((p.rentFrequency || 'Monthly').toLowerCase()) + '</small>' : '')
              : d },
          { data: 'listingType', title: 'Listing', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: 'status', title: 'Status', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: 'assignedAgent', title: 'Agent', render: (d) => esc(d || '—') },
          { data: 'viewsCount', title: 'Views', render: (d, t) => t === 'display' ? Number(d || 0).toLocaleString('en-US') : d },
          { data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-3', width: '106px', render: () => `<div class="table-actions slots-3">
            <button class="action-icon view-icon" data-action="view" title="Details"><i class="fas fa-eye"></i></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : ''}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để xem nhanh thông tin'); },
        order: []
      }), onAction, [canEdit, canDel], (property) => setViewing(property));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      return (
        <>
          <KpiRow items={kpi} />
          <Pipeline stages={ENUMS.propertyStatus} counts={counts} active={stage} onPick={setStage} total={base.length} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Filters</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', type: '', listing: '', city: '', agent: '', mineOnly: false }); setStage(''); }}>
                <i className="fas fa-rotate-left"></i> Clear
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
                <input className="filter-input" value={filters.search} placeholder="Title, ref, type, agent…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Property Type" icon="fas fa-house" options={opts(ENUMS.propertyType)} value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} placeholder="All Types" />
              <SearchableDropdown label="Listing" icon="fas fa-tags" options={opts(ENUMS.listingType)} value={filters.listing} onChange={(v) => setFilters({ ...filters, listing: v })} placeholder="Sale & Rent" />
              <SearchableDropdown label="City" icon="fas fa-city" options={(lookups.locations || []).filter((l) => l.level === 'City').map((c) => ({ value: c.name, label: c.name }))} value={filters.city} onChange={(v) => setFilters({ ...filters, city: v })} placeholder="All Cities" />
              {all && <SearchableDropdown label="Agent" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="All Agents" />}
              <div className="filter-group">
                <label><i className="fas fa-user-check"></i> My Listings Only</label>
                <div className="filter-toggle">
                  <input type="checkbox" className="toggle" id="propMineOnly" checked={filters.mineOnly}
                         onChange={(e) => setFilters({ ...filters, mineOnly: e.target.checked })} />
                  <label className="ft-txt" htmlFor="propMineOnly">{filters.mineOnly ? 'Mine only' : 'Everyone'}</label>
                </div>
              </div>
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="propsCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'Title', 'bulkImportProperties', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={9} /> : <div style={{ overflowX: 'auto' }}><table id="propsTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <PropertyModal prop={editing} currentUser={currentUser} role={role} lookups={lookups}
                           onClose={() => { setShowModal(false); setEditing(null); }}
                           onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('dash:stats'); }} />
          )}
          {viewing && <PropertyDetailModal prop={(rows || []).find((x) => x.id === viewing.id) || viewing} lookups={lookups}
                        currentUser={currentUser} role={role} perms={perms}
                        onClose={() => setViewing(null)} onDeal={(p) => setDealFor(p)} />}
          {dealFor && (
            <DealModal prefill={{ propertyId: dealFor.id }} currentUser={currentUser} role={role} lookups={lookups}
                       onClose={() => setDealFor(null)}
                       onSaved={() => { setDealFor(null); mutate(); ['deals:all', 'dash:stats'].forEach((k) => swrMutate(k)); }} />
          )}
        </>
      );
    }

    // add/edit modal — gallery upload, amenity multi-select, cascading City → Area → Society, owner registry picker
    function PropertyModal({ prop, prefill, currentUser, role, lookups, onClose, onSaved }) {
      const all = scopeAll(role);
      const editing = !!prop;
      const locs = lookups.locations || [];
      const { data: oRes, mutate: mutateOwners } = useSWR('owners:all', () => gsRun('getOwners', currentUser), SWR_LIVE); // access-denied -> [] (agents still type free-text)
      const owners = oRes && oRes.success ? oRes.data : [];
      const [showOwnerModal, setShowOwnerModal] = useState(false);
      const [form, setForm] = useState(() => prop ? {
        title: prop.title || '', description: prop.description || '', propertyType: prop.propertyType || '', listingType: prop.listingType || 'Sale',
        price: prop.price || '', rentFrequency: prop.rentFrequency || 'Monthly', areaSize: prop.areaSize || '', areaUnit: prop.areaUnit || 'Sq M',
        bedrooms: prop.bedrooms == null ? '' : prop.bedrooms, bathrooms: prop.bathrooms == null ? '' : prop.bathrooms,
        address: prop.address || '', latitude: prop.latitude == null ? '' : prop.latitude, longitude: prop.longitude == null ? '' : prop.longitude,
        ownerName: prop.ownerName || '', ownerPhone: prop.ownerPhone || '', ownerId: prop.ownerId ? String(prop.ownerId) : '',
        assignedAgent: prop.assignedAgent || currentUser,
        isFeatured: !!prop.isFeatured, status: prop.status || 'Draft', amenityIds: (prop.amenityIds || []).map(String), images: (prop.images || []).slice()
      } : {
        title: '', description: (prefill && prefill.description) || '', propertyType: '', listingType: (prefill && prefill.listingType) || 'Sale',
        price: '', rentFrequency: 'Monthly', areaSize: '', areaUnit: 'Sq M',
        bedrooms: '', bathrooms: '', address: '', latitude: '', longitude: '',
        ownerName: (prefill && prefill.ownerName) || '', ownerPhone: (prefill && prefill.ownerPhone) || '', ownerId: prefill && prefill.ownerId ? String(prefill.ownerId) : '',
        assignedAgent: currentUser, isFeatured: false, status: 'Draft', amenityIds: [], images: []
      });
      const by = useMemo(() => { const o = {}; locs.forEach((l) => { o[l.id] = l; }); return o; }, [locs]);
      const chain = (id) => { const out = []; let cur = by[id], g = 0; while (cur && g++ < 5) { out.unshift(cur); cur = by[cur.parentId]; } return out; };
      const [cityId, setCityId] = useState('');
      const [areaId, setAreaId] = useState('');
      const [socId, setSocId] = useState('');
      useEffect(() => { // seed the cascade once lookups arrive (edit mode OR an acquisition prefill)
        const seedLoc = editing ? prop.locationId : (prefill && prefill.locationId);
        if (seedLoc && !cityId && locs.length) {
          const ch = chain(seedLoc);
          setCityId(ch[0] ? String(ch[0].id) : ''); setAreaId(ch[1] ? String(ch[1].id) : ''); setSocId(ch[2] ? String(ch[2].id) : '');
        }
      }, [locs.length]);
      const [saving, setSaving] = useState(false);
      const [uploading, setUploading] = useState(false);

      const selectedCity = cityId ? by[cityId] : null;
      const isVietnamLocation = (location) => !!location && (
        String(location.slug || '').indexOf('vn-province-') === 0 ||
        (Number(location.id) >= 100000 && Number(location.id) < 200000)
      );
      const cities = locs.filter((l) => l.level === 'City').sort((a, b) => {
        const avn = isVietnamLocation(a) ? 0 : 1;
        const bvn = isVietnamLocation(b) ? 0 : 1;
        return avn - bvn || String(a.name || '').localeCompare(String(b.name || ''), 'vi');
      });
      const areas = locs.filter((l) => l.level === 'Area' && String(l.parentId) === String(cityId));
      const socs = locs.filter((l) => l.level === 'Society' && String(l.parentId) === String(areaId));
      const isVietnamAddress = isVietnamLocation(selectedCity);
      const locationId = socId || areaId || cityId;
      const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
      const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      const noBeds = ['Plot', 'Commercial Plot', 'Warehouse'].indexOf(form.propertyType) !== -1;
      const statusOptions = ENUMS.propertyStatus.filter((s) => all || ['Sold', 'Rented'].indexOf(s) === -1 || s === form.status); // closing inventory = Manager/Admin

      const handleImages = (e) => {
        const files = Array.from(e.target.files || []);
        const list = files.slice(0, Math.max(0, 15 - form.images.length));
        e.target.value = '';
        if (!list.length) return Swal.fire({ icon: 'warning', title: 'Đã đạt giới hạn ảnh', text: 'Mỗi bất động sản được tải tối đa 15 ảnh.' });
        setUploading(true);
        let done = 0; const added = []; const failures = [];
        const finishOne = () => {
          done++;
          if (done !== list.length) return;
          setForm((f) => {
            const imgs = [...f.images, ...added.sort((a, b) => a.sortOrder - b.sortOrder)].map((im, i) => ({ ...im, sortOrder: i }));
            if (imgs.length && !imgs.some((x) => x.isPrimary)) imgs[0] = { ...imgs[0], isPrimary: 1 };
            return { ...f, images: imgs };
          });
          setUploading(false);
          if (failures.length) Swal.fire({
            icon: added.length ? 'warning' : 'error',
            title: added.length ? 'Một số ảnh chưa tải được' : 'Tải ảnh thất bại',
            text: failures[0] + (failures.length > 1 ? ` (và ${failures.length - 1} lỗi khác)` : '')
          });
        };
        list.forEach((file, fileIndex) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            gsRun('uploadPropertyImage', ev.target.result, file.name, currentUser)
              .then((r) => {
                if (r && r.success) added.push({ url: r.url, isPrimary: 0, sortOrder: fileIndex });
                else failures.push((r && r.message) || ('Không thể tải ảnh ' + file.name));
              })
              .catch((err) => failures.push(String((err && err.message) || err || ('Không thể tải ảnh ' + file.name))))
              .finally(finishOne);
          };
          reader.onerror = () => {
            failures.push('Không thể đọc tệp ' + file.name);
            finishOne();
          };
          reader.readAsDataURL(file);
        });
      };
      const setPrimary = (i) => setForm((f) => ({ ...f, images: f.images.map((im, idx) => ({ ...im, isPrimary: idx === i ? 1 : 0 })) }));
      const removeImg = (i) => setForm((f) => {
        const imgs = f.images.filter((_, idx) => idx !== i).map((im, idx) => ({ ...im, sortOrder: idx }));
        if (imgs.length && !imgs.some((x) => x.isPrimary)) imgs[0] = { ...imgs[0], isPrimary: 1 };
        return { ...f, images: imgs };
      });

      // server flags look-alike listings; the agent can still proceed, and the override is logged against them
      const dupePrompt = (dupes) => Swal.fire({
        icon: 'warning', title: 'Possible duplicate listing', width: 620, showCancelButton: true,
        confirmButtonColor: '#e6a700', confirmButtonText: 'It\'s different — save anyway', cancelButtonText: 'Let me check',
        html: '<p style="text-align:left;margin-bottom:8px">This matches ' + (dupes.length > 1 ? dupes.length + ' listings already on file' : 'a listing already on file') + ':</p>'
          + '<ul style="text-align:left;padding-left:18px;margin:0 0 10px">' + dupes.map((x) =>
              '<li style="margin:7px 0"><b>' + esc(x.referenceCode) + '</b> — ' + esc(x.title)
              + '<br><small style="color:#789">' + esc(x.status) + ' · ' + esc(x.assignedAgent || 'unassigned')
              + ' · matched on ' + esc(x.reasons.join(', ')) + '</small></li>').join('')
          + '</ul><p style="text-align:left;font-size:12.5px;color:#888">Saving anyway is recorded in the activity log under your name.</p>'
      }).then((c) => { if (c.isConfirmed) doSave(true); });

      const doSave = (confirmDupe) => {
        setSaving(true);
        const payload = { ...form, locationId, isFeatured: form.isFeatured ? 1 : 0, id: prop ? prop.id : undefined, confirmDupe: confirmDupe ? 1 : 0 };
        gsRun(editing ? 'updateProperty' : 'addProperty', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) {
            if (prefill && prefill.fromLeadId) // acquisition trail: stamp the seller lead's timeline
              gsRun('addFollowUp', { leadId: prefill.fromLeadId, type: 'Note', notes: 'Converted to listing — property added from this seller lead', dueAt: '' }, currentUser).catch(() => {});
            Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved();
            return;
          }
          if (r && r.dupes && r.dupes.length) return dupePrompt(r.dupes);
          Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };

      const submit = (e) => {
        e.preventDefault();
        if (!locationId) return Swal.fire({ icon: 'warning', title: 'Chưa chọn địa chỉ', text: 'Vui lòng chọn ít nhất tỉnh hoặc thành phố.' });
        doSave(false);
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving || uploading} />
          <div className="modal">
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-plus')}></i> {editing ? 'Edit ' + (prop.referenceCode || 'Property') : 'Add Property'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title} onChange={setEv('title')} required placeholder="Ví dụ: Nhà phố hiện đại 100 m²" />
                </div>
                <div className="form-grid">
                  <SearchableDropdown label="Property Type" icon="fas fa-house" options={opts(ENUMS.propertyType)} value={form.propertyType} onChange={set('propertyType')} placeholder="Select type…" required={true} />
                  <SearchableDropdown label="Listing Type" icon="fas fa-tags" options={opts(ENUMS.listingType)} value={form.listingType} onChange={set('listingType')} placeholder="Sale / Rent" required={true} />
                  <div className="form-group">
                    <label><i className="fas fa-money-bill-wave"></i> Price (VNĐ) *</label>
                    <input type="number" min="1" step="any" value={form.price} onChange={setEv('price')} required />
                  </div>
                  {form.listingType === 'Rent' && (
                    <SearchableDropdown label="Rent Frequency" icon="fas fa-calendar" options={opts(ENUMS.rentFrequency)} value={form.rentFrequency} onChange={set('rentFrequency')} placeholder="Monthly / Yearly" />
                  )}
                  <div className="form-group">
                    <label><i className="fas fa-ruler-combined"></i> Area Size *</label>
                    <input type="number" min="0.1" step="any" value={form.areaSize} onChange={setEv('areaSize')} required />
                  </div>
                  <SearchableDropdown label="Area Unit" icon="fas fa-ruler" options={opts(ENUMS.areaUnit)} value={form.areaUnit} onChange={set('areaUnit')} placeholder="Unit…" required={true} />
                  {!noBeds && (
                    <div className="form-group">
                      <label><i className="fas fa-bed"></i> Bedrooms</label>
                      <input type="number" min="0" value={form.bedrooms} onChange={setEv('bedrooms')} />
                    </div>
                  )}
                  {!noBeds && (
                    <div className="form-group">
                      <label><i className="fas fa-bath"></i> Bathrooms</label>
                      <input type="number" min="0" value={form.bathrooms} onChange={setEv('bathrooms')} />
                    </div>
                  )}
                  <SearchableDropdown label="Tỉnh / Thành phố" icon="fas fa-city" options={cities.map((c) => ({ value: String(c.id), label: c.name }))} value={cityId} onChange={(v) => { setCityId(v); setAreaId(''); setSocId(''); }} placeholder="Chọn tỉnh hoặc thành phố…" required={true} />
                  <SearchableDropdown label={isVietnamAddress ? 'Phường / Xã / Đặc khu' : 'Khu vực'} icon="fas fa-map" options={areas.map((a) => ({ value: String(a.id), label: a.name }))} value={areaId} onChange={(v) => { setAreaId(v); setSocId(''); }} placeholder={cityId ? (isVietnamAddress ? 'Chọn phường, xã hoặc đặc khu…' : 'Chọn khu vực…') : 'Chọn tỉnh/thành phố trước'} required={isVietnamAddress} />
                  {selectedCity && !isVietnamAddress && <SearchableDropdown label="Khu đô thị / Giai đoạn" icon="fas fa-map-pin" options={socs.map((s) => ({ value: String(s.id), label: s.name }))} value={socId} onChange={setSocId} placeholder={areaId ? 'Chọn khu đô thị…' : 'Chọn khu vực trước'} />}
                  <div className="form-group">
                    <label><i className="fas fa-location-dot"></i> {isVietnamAddress ? 'Số nhà, tên đường / thôn, ấp' : 'Địa chỉ đường/phố'}</label>
                    <input value={form.address} onChange={setEv('address')} placeholder={isVietnamAddress ? 'Ví dụ: 25 Nguyễn Huệ' : 'Nhập địa chỉ chi tiết'} />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-globe"></i> Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={setEv('latitude')} placeholder="31.4676" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-globe"></i> Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={setEv('longitude')} placeholder="74.4107" />
                  </div>
                  {owners.length > 0 && (
                    <div className="form-group">
                      <label><i className="fas fa-address-book"></i> Owner Registry <small style={{ color: '#999', textTransform: 'none' }}>(auto-fills name & phone)</small></label>
                      <div className="owner-picker-row">
                        <div className="owner-picker-field">
                          <SearchableDropdown label="" icon="fas fa-user-tie"
                            options={owners.map((o) => ({ value: String(o.id), label: o.name + ' (' + o.phone + ')' }))}
                            value={form.ownerId}
                            onChange={(v) => { const o = owners.find((x) => String(x.id) === v);
                              setForm((f) => ({ ...f, ownerId: v, ownerName: o ? o.name : f.ownerName, ownerPhone: o ? o.phone : f.ownerPhone })); }}
                            placeholder="Pick from registry…" />
                        </div>
                        <button type="button" className="btn btn-secondary btn-sm owner-picker-add" title="New owner" onClick={() => setShowOwnerModal(true)}><i className="fas fa-plus"></i></button>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label><i className="fas fa-user-lock"></i> Tên chủ sở hữu * <small style={{ color: '#999', textTransform: 'none' }}>(không công khai)</small></label>
                    <input value={form.ownerName} onChange={setEv('ownerName')} required />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-phone-lock"></i> Điện thoại chủ sở hữu * <small style={{ color: '#999', textTransform: 'none' }}>(không công khai)</small></label>
                    <input value={form.ownerPhone} onChange={setEv('ownerPhone')} required placeholder="+92300…" />
                  </div>
                  {all && (
                    <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={form.assignedAgent} onChange={set('assignedAgent')} placeholder="Chọn nhân viên…" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Status" icon="fas fa-flag" options={opts(statusOptions)} value={form.status} onChange={set('status')} placeholder="Status…" />
                  )}
                  <div className="form-group">
                    <label><i className="fas fa-star"></i> Featured on Portal</label>
                    <input type="checkbox" className="toggle" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} />
                  </div>
                </div>
                <SearchableMultiSelect label="Amenities" icon="fas fa-list-check"
                  options={(lookups.amenities || []).map((a) => ({ value: String(a.id), label: a.name }))}
                  values={form.amenityIds} onChange={set('amenityIds')} placeholder="Tag amenities…" />
                <div className="form-group">
                  <label><i className="fas fa-align-left"></i> Description</label>
                  <textarea rows="4" value={form.description} onChange={setEv('description')} placeholder="Selling points, condition, nearby landmarks…"></textarea>
                </div>
                <div className="form-group">
                  <label><i className="fas fa-images"></i> Hình ảnh ({form.images.length}/15)</label>
                  <input type="file" className="file-input" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={handleImages} disabled={uploading} />
                  {form.images.length > 0 && (
                    <div className="img-grid">
                      {form.images.map((im, i) => (
                        <div key={i} className={'img-cell' + (im.isPrimary ? ' primary' : '')}>
                          <img src={im.url} alt="" loading="lazy" />
                          <div className="img-acts">
                            <button type="button" title="Set as cover" onClick={() => setPrimary(i)} className={im.isPrimary ? 'on' : ''}><i className="fas fa-star"></i></button>
                            <button type="button" title="Remove" onClick={() => removeImg(i)}><i className="fas fa-trash"></i></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật bất động sản' : 'Lưu bản nháp'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
          {showOwnerModal && (
            <OwnerModal owner={null} currentUser={currentUser}
                        onClose={() => setShowOwnerModal(false)}
                        onSaved={(r) => { setShowOwnerModal(false); mutateOwners();
                          if (r && r.owner) setForm((f) => ({ ...f, ownerId: String(r.owner.id), ownerName: r.owner.name, ownerPhone: r.owner.phone })); }} />
          )}
        </div>
      );
    }

    // Property 360 — record hub: overview · gallery · interested leads · viewings · deal · docs · expenses (owner info CRM-side only)
    function PropertyDetailModal({ prop, lookups, currentUser, role, perms, onClose, onDeal }) {
      const [imgIdx, setImgIdx] = useState(0);
      const [tab, setTab] = useState('over');
      const [busy, setBusy] = useState(false);
      const canEdit = can(perms || {}, 'properties', 'e');
      const { data: lRes } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const { data: aRes } = useSWR('appts:all', () => gsRun('getAppointments', currentUser), SWR_LIVE);
      const { data: dRes, mutate: mutDeals } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const leads = (lRes && lRes.success ? lRes.data : []).filter((l) => l.propertyId == prop.id);
      const appts = (aRes && aRes.success ? aRes.data : []).filter((a) => a.propertyId == prop.id);
      const deals = (dRes && dRes.success ? dRes.data : []).filter((x) => x.propertyId == prop.id);
      const imgs = prop.images || [];
      const amenNames = useMemo(() => { const by = {}; (lookups.amenities || []).forEach((a) => { by[a.id] = a; });
        return (prop.amenityIds || []).map((id) => by[id]).filter(Boolean); }, [lookups.amenities, prop]);
      const dom = prop.publishedAt ? Math.round((Date.now() - new Date(prop.publishedAt).getTime()) / 864e5) : null;
      const portalLink = (window.__APP_URL__ || '') + '?p=' + (prop.slug || prop.id);

      const doBrochure = () => {
        setBusy(true);
        gsRun('brochurePdf', prop.id, currentUser).then((r) => {
          setBusy(false);
          if (r && r.success) { const a = document.createElement('a'); a.href = 'data:application/pdf;base64,' + r.base64; a.download = r.filename; a.click(); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch(() => setBusy(false));
      };
      const doEmail = () => {
        Swal.fire({ icon: 'question', title: 'Email this listing', input: 'email', inputPlaceholder: 'client@demo.com', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Send' })
          .then((r) => { if (r.isConfirmed && r.value) gsRun('emailPropertyPack', prop.id, r.value, currentUser).then((res) => {
            Swal.fire({ icon: res && res.success ? 'success' : 'error', title: (res && res.message) || 'Failed', timer: res && res.success ? 1800 : undefined, showConfirmButton: !(res && res.success) }); }); });
      };
      const doCopy = () => { try { navigator.clipboard.writeText(portalLink); Swal.fire({ icon: 'success', title: 'Portal link copied!', timer: 1300, showConfirmButton: false }); } catch (e) { Swal.fire({ icon: 'info', title: 'Portal link', text: portalLink }); } };
      const waShare = () => window.open('https://zalo.me/?text=' + encodeURIComponent(prop.title + ' (' + (prop.referenceCode || '') + ') — ' + fmtPKR(prop.price) + '\n' + portalLink), '_blank');

      const addDoc = (e) => {
        const file = e.target.files[0]; e.target.value = '';
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          setBusy(true);
          gsRun('uploadPropertyDoc', prop.id, ev.target.result, file.name, currentUser).then((r) => {
            setBusy(false);
            if (r && r.success) { swrMutate('props:all'); Swal.fire({ icon: 'success', title: r.message, timer: 1500, showConfirmButton: false }); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
          }).catch(() => setBusy(false));
        };
        reader.readAsDataURL(file);
      };
      const delDoc = (doc) => {
        Swal.fire({ icon: 'warning', title: 'Xóa tài liệu?', text: doc.name, showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa' })
          .then((r) => { if (r.isConfirmed) gsRun('removePropertyDoc', prop.id, doc.url, currentUser).then(() => swrMutate('props:all')); });
      };
      const addExpense = () => {
        Swal.fire({
          title: 'Ghi nhận chi phí', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Lưu',
          html: '<select id="exCat" class="swal2-select">' + ENUMS.expenseCategory.map((c) => '<option value="' + c + '">' + viEnum(c) + '</option>').join('') + '</select>' +
                '<input id="exAmt" type="number" class="swal2-input" placeholder="Số tiền (VNĐ)">' +
                '<input id="exNotes" class="swal2-input" placeholder="Ghi chú">',
          preConfirm: () => ({ category: document.getElementById('exCat').value, amount: document.getElementById('exAmt').value, notes: document.getElementById('exNotes').value })
        }).then((r) => { if (r.isConfirmed) gsRun('addPropertyExpense', prop.id, r.value, currentUser).then((res) => {
          if (res && res.success) { swrMutate('props:all'); Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false }); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' }); }); });
      };

      const facts = [
        ['Mã tham chiếu', prop.referenceCode || '—'], ['Loại hình', viEnum(prop.propertyType)], ['Tin đăng', viEnum(prop.listingType)],
        ['Giá', fmtPKR(prop.price) + (prop.listingType === 'Rent' ? ' / ' + viEnum(prop.rentFrequency || 'Monthly') : '')],
        ['Diện tích', fmtArea(prop.areaSize, prop.areaUnit)], ['Phòng ngủ', prop.bedrooms == null ? '—' : prop.bedrooms],
        ['Phòng tắm', prop.bathrooms == null ? '—' : prop.bathrooms], ['Lượt xem cổng thông tin', (prop.viewsCount || 0).toLocaleString('vi-VN')],
        ['Số ngày trên thị trường', dom == null ? 'Chưa công khai' : dom + ' ngày'], ['Nhân viên', prop.assignedAgent || '—'],
        ['Chủ sở hữu (riêng tư)', prop.ownerName || '—'], ['Điện thoại chủ sở hữu (riêng tư)', prop.ownerPhone || '—']
      ];
      const expTotal = r2((prop.expenses || []).reduce((s, x) => s + (x.amount || 0), 0));

      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-building"></i> {prop.title}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <Badge s={prop.status} />
                <span style={{ color: '#475569', fontSize: '13.5px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-location-dot" style={{ color: 'var(--navy-accent, #0284c7)' }}></i>
                  {prop.locationPath || prop.address || 'Chưa có địa chỉ'}
                </span>
              </div>
              <div className="pd-meta-actions" style={{ marginBottom: '16px' }}>
                <button className="btn btn-secondary btn-sm" onClick={waShare} title="Chia sẻ qua Zalo"><ZaloIcon size={16} style={{ marginRight: 5 }} /> Chia sẻ Zalo</button>
                <button className="btn btn-secondary btn-sm" onClick={doBrochure} disabled={busy} title="Tờ giới thiệu PDF"><i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-file-pdf')}></i> Tờ giới thiệu</button>
                <button className="btn btn-secondary btn-sm" onClick={doEmail} title="Gửi tin đăng qua email"><i className="fas fa-envelope"></i> Email</button>
                <button className="btn btn-secondary btn-sm" onClick={doCopy} title="Sao chép liên kết cổng"><i className="fas fa-link"></i> Liên kết</button>
                {onDeal && ['Available', 'Reserved'].indexOf(prop.status) !== -1 && deals.filter((x) => ['Token','Agreement'].indexOf(x.status) !== -1).length === 0 && can(perms || {}, 'deals', 'a') && (
                  <button className="btn btn-primary btn-sm" onClick={() => { onClose(); onDeal(prop); }}><i className="fas fa-handshake"></i> Giao dịch mới</button>
                )}
              </div>
              <Tabs tab={tab} setTab={setTab} tabs={[
                ['over', 'fa-circle-info', 'Tổng quan'], ['gal', 'fa-images', 'Hình ảnh (' + imgs.length + ')'],
                ['leads', 'fa-user-tag', 'Khách quan tâm (' + leads.length + ')'], ['appts', 'fa-calendar-check', 'Lịch xem (' + appts.length + ')'],
                ['deal', 'fa-handshake', 'Giao dịch (' + deals.length + ')'], ['docs', 'fa-paperclip', 'Tài liệu (' + (prop.documents || []).length + ')'],
                ['exp', 'fa-receipt', 'Chi phí (' + (prop.expenses || []).length + ')']]} />
              {tab === 'over' && (
                <>
                  <div className="pd-facts">
                    {facts.map(([k, v], i) => <div key={i} className="pd-fact"><div className="k">{k}</div><div className="v">{v}</div></div>)}
                  </div>
                  {amenNames.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      {amenNames.map((a) => <span key={a.id} className="amen-chip"><i className={'fas ' + (a.icon || 'fa-check')}></i>{a.name}</span>)}
                    </div>
                  )}
                  {(prop.priceHistory || []).length > 0 && (
                    <>
                      <div className="txn-h" style={{ marginTop: 8 }}><i className="fas fa-clock-rotate-left"></i> Lịch sử giá</div>
                      {(prop.priceHistory || []).slice().reverse().map((h, i) => (
                        <div key={i} className="tl-item"><i className={'fas fa-arrow-trend-' + (h.newPrice >= h.oldPrice ? 'up' : 'down')}></i>
                          <div style={{ flex: 1 }}><div className="w">{fmtPKR(h.oldPrice)} → <b>{fmtPKR(h.newPrice)}</b></div><div className="m">{fmtDT(h.date)} · bởi {h.changedBy}</div></div>
                        </div>))}
                    </>
                  )}
                  {prop.description && <p style={{ color: '#556', lineHeight: 1.7, fontSize: 14 }}>{prop.description}</p>}
                  {prop.latitude != null && prop.longitude != null && prop.latitude !== '' && (
                    <iframe className="pd-map" src={'https://maps.google.com/maps?q=' + prop.latitude + ',' + prop.longitude + '&z=15&output=embed'} loading="lazy" title="map"></iframe>
                  )}
                </>
              )}
              {tab === 'gal' && (imgs.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có hình ảnh.</p> : (
                <>
                  <div className="pd-gallery-main"><img src={(imgs[imgIdx] || imgs[0]).url} alt="" /></div>
                  {imgs.length > 1 && (
                    <div className="pd-thumbs">
                      {imgs.map((im, i) => <img key={i} src={im.url} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} alt="" loading="lazy" />)}
                    </div>
                  )}
                </>
              ))}
              {tab === 'leads' && (leads.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có khách hàng quan tâm tin này.</p>
                : leads.map((l) => <div key={l.id} className="tl-item"><i className="fas fa-user"></i>
                    <div style={{ flex: 1 }}><div className="w"><b>{l.fullName}</b> · {l.phone}</div><div className="m">{viEnum(l.source)} · {l.assignedAgent || 'Chưa phân công'} · {fmtDate(l.created)}</div></div>
                    <Badge s={l.status} />
                    <button className="action-icon wa-icon" title="Nhắn Zalo" onClick={() => waOpen(l.phone)}><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
                  </div>))}
              {tab === 'appts' && (appts.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có lịch xem.</p>
                : appts.map((a) => <div key={a.id} className="tl-item"><i className="fas fa-calendar-check"></i>
                    <div style={{ flex: 1 }}><div className="w">{a.leadName}</div><div className="m">{fmtDT(a.scheduledAt)} · {a.agent}{a.feedback ? ' · "' + a.feedback + '"' : ''}</div></div>
                    {a.interestLevel && <Badge s={a.interestLevel} />} <Badge s={a.status} />
                  </div>))}
              {tab === 'deal' && (deals.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có giao dịch cho tin này.</p>
                : deals.map((x) => <div key={x.id} className="tl-item"><i className="fas fa-handshake"></i>
                    <div style={{ flex: 1 }}><div className="w"><b>{x.buyerName}</b> — {fmtPKR(x.dealAmount)}</div>
                      <div className="m">đã thanh toán {fmtPKR(x.paid)} · còn lại {fmtPKR(x.balance)} · hoa hồng {fmtPKR(x.commissionAmt)} · {x.agent}</div></div>
                    <Badge s={x.status} />
                  </div>))}
              {tab === 'docs' && (
                <>
                  {canEdit && <div className="form-group"><label><i className="fas fa-file-arrow-up"></i> Tải tài liệu lên <small style={{ color: '#999', textTransform: 'none' }}>(hợp đồng, CCCD/CMND, giấy tờ chuyển nhượng — không công khai)</small></label>
                    <input type="file" className="file-input" onChange={addDoc} disabled={busy} /></div>}
                  {(prop.documents || []).length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có tài liệu đính kèm.</p>
                    : (prop.documents || []).map((doc, i) => (
                      <div key={i} className="doc-row"><i className="fas fa-file-lines" style={{ color: 'var(--navy-accent)' }}></i>
                        <a href={doc.url} target="_blank" rel="noreferrer">{doc.name}</a>
                        <small style={{ color: '#89a' }}>{fmtDate(doc.uploadedAt)} · {doc.uploadedBy}</small>
                        {canEdit && <button className="action-icon delete-icon" title="Xóa" onClick={() => delDoc(doc)}><i className="fas fa-trash"></i></button>}
                      </div>))}
                </>
              )}
              {tab === 'exp' && (
                <>
                  {canEdit && <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={addExpense}><i className="fas fa-plus"></i> Ghi nhận chi phí</button>}
                  {(prop.expenses || []).length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa ghi nhận chi phí.</p>
                    : (prop.expenses || []).slice().reverse().map((x, i) => (
                      <div key={i} className="tl-item"><i className="fas fa-receipt"></i>
                        <div style={{ flex: 1 }}><div className="w"><b>{x.category}</b> — {fmtPKR(x.amount)}</div><div className="m">{x.date} · {x.addedBy}{x.notes ? ' · ' + x.notes : ''}</div></div>
                      </div>))}
                  {(prop.expenses || []).length > 0 && <div className="txn-line total"><span className="f">Tổng chi phí</span><span className="v">{fmtPKR(expTotal)}</span></div>}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============== Leads (pipeline — Agent reads are hard own-scoped server-side) ==============
    // ---- Leads kanban: HTML5 drag between stages (desktop) + per-card move menu (touch) ----
    function LeadKanban({ leads, stages, canEdit, onMove, onAction }) {
      const [over, setOver] = useState('');
      const [drag, setDrag] = useState(null);
      const [menu, setMenu] = useState(0);
      useEffect(() => { const c = () => setMenu(0); document.addEventListener('click', c); return () => document.removeEventListener('click', c); }, []);
      const byStage = useMemo(() => { const o = {}; stages.forEach((s) => { o[s] = []; });
        leads.forEach((l) => { (o[l.status] || (o[l.status] = [])).push(l); }); return o; }, [leads, stages]); // one pass, no per-column filter scans

      return (
        <div className="kb-wrap">
          {stages.map((s) => {
            const list = byStage[s] || [];
            return (
              <div key={s} className={'kb-col' + (over === s ? ' over' : '')}
                   onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); if (over !== s) setOver(s); }}
                   onDrop={(e) => { e.preventDefault(); setOver(''); if (drag && drag.status !== s) onMove(drag, s); setDrag(null); }}>
                <div className="kb-head">
                  <span className="kb-bar" style={{ background: STAGE_COLORS[s] || '#6c757d' }}></span>
                  <span className="kb-name">{s}</span>
                  <span className="kb-count">{list.length}</span>
                </div>
                <div className="kb-body">
                  {list.length === 0 && <div className="kb-empty"><i className="fas fa-inbox"></i> No leads here</div>}
                  {list.slice(0, 50).map((l) => (
                    <div key={l.id} className={'kb-card' + (drag && drag.id === l.id ? ' dragging' : '')}
                         style={{ borderLeftColor: STAGE_COLORS[s] || '#6c757d', cursor: canEdit ? 'grab' : 'default' }}
                         draggable={canEdit} onDragStart={() => setDrag(l)} onDragEnd={() => { setDrag(null); setOver(''); }}
                         onDoubleClick={() => onAction('view', l)} title="Double-click for Lead 360">
                      {canEdit && (
                        <div className="kb-move">
                          <button className="kb-move-btn" title="Move to…" onClick={(e) => { e.stopPropagation(); setMenu(menu === l.id ? 0 : l.id); }}>
                            <i className="fas fa-ellipsis-vertical"></i>
                          </button>
                          {menu === l.id && (
                            <div className="kb-move-menu" onClick={(e) => e.stopPropagation()}>
                              {stages.filter((x) => x !== l.status).map((x) => (
                                <button key={x} onClick={() => { setMenu(0); onMove(l, x); }}>
                                  <span className="kb-dot" style={{ background: STAGE_COLORS[x] || '#6c757d' }}></span> Move to {x}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="kb-t">{l.fullName}</div>
                      <div className="kb-s"><i className="fas fa-phone" style={{ fontSize: 9 }}></i> {l.phone}</div>
                      <div className="kb-tags">
                        {l.interestType && <span className="kb-tag">{l.interestType}</span>}
                        {l.source && <span className="kb-tag">{l.source}</span>}
                        {(l.budgetMin || l.budgetMax) ? <span className="kb-tag">{pkrShort(l.budgetMin || 0)} – {pkrShort(l.budgetMax || 0)}</span> : null}
                        {l.propertyRef && <span className="kb-tag">{l.propertyRef}</span>}
                      </div>
                      <div className="kb-foot">
                        <span className="kb-agent"><i className="fas fa-user-tie"></i>{l.assignedAgent || 'Unassigned'} · {fmtDate(l.created)}</span>
                        <span className="kb-acts">
                          <button title="Lead 360" onClick={() => onAction('view', l)}><i className="fas fa-id-card-clip"></i></button>
                          <button title="Nhắn Zalo" onClick={() => onAction('wa', l)}><ZaloIcon size={15} /></button>
                          {canEdit && <button title="Edit" onClick={() => onAction('edit', l)}><i className="fas fa-edit"></i></button>}
                        </span>
                      </div>
                    </div>
                  ))}
                  {list.length > 50 && <div className="kb-more">+{list.length - 50} more — narrow it with the filters</div>}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    const customerPhoneKey = (value) => String(value || '').replace(/\D/g, '').replace(/^84(?=\d{9,10}$)/, '0');
    const findLinkedLead = (leads, source) => {
      if (!source) return null;
      const linkedId = source.leadId != null ? source.leadId : (source.fullName ? source.id : null);
      let lead = linkedId != null ? (leads || []).find((x) => String(x.id) === String(linkedId)) : null;
      if (lead) return lead;
      const phone = customerPhoneKey(source.leadPhone || source.buyerPhone || source.tenantPhone || source.phone);
      if (phone) lead = (leads || []).find((x) => customerPhoneKey(x.phone) === phone);
      return lead || null;
    };

    function CrossModuleLeadModal({ source, currentUser, role, perms, lookups, onClose }) {
      const { data: leadRes } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const leads = leadRes && leadRes.success ? leadRes.data : [];
      const lead = findLinkedLead(leads, source);
      if (!source) return null;
      if (!leadRes) return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="modal"><div className="modal-header"><h3><i className="fas fa-id-card-clip"></i> Hồ sơ khách hàng</h3><button className="close-btn" onClick={onClose}>&times;</button></div>
            <div className="modal-body"><div className="loading-container"><div className="spinner"></div><p>Đang tải hồ sơ khách hàng…</p></div></div></div>
        </div>
      );
      if (lead) return <Lead360Modal lead={lead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={onClose} />;
      const name = source.leadName || source.buyerName || source.tenantName || source.fullName || 'Khách hàng';
      const phone = source.leadPhone || source.buyerPhone || source.tenantPhone || source.phone || '—';
      return (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="modal modal-customer-quick">
            <div className="modal-header"><h3><i className="fas fa-id-card-clip"></i> Thông tin khách hàng — {name}</h3><button className="close-btn" onClick={onClose}>&times;</button></div>
            <div className="modal-body">
              <div className="customer-quick-facts">
                <div className="pd-fact"><div className="k">Họ và tên</div><div className="v">{name}</div></div>
                <div className="pd-fact"><div className="k">Điện thoại</div><div className="v">{phone}</div></div>
                <div className="pd-fact"><div className="k">Bất động sản</div><div className="v">{source.propertyRef || source.propertyTitle || '—'}</div></div>
                <div className="pd-fact"><div className="k">Nhân viên phụ trách</div><div className="v">{source.assignedAgent || source.agent || '—'}</div></div>
                <div className="pd-fact"><div className="k">Trạng thái</div><div className="v">{viEnum(source.status || '—')}</div></div>
              </div>
              <div className="customer-quick-footer">
                {phone !== '—' && <button className="btn btn-primary" onClick={() => waOpen(phone)}><ZaloIcon size={18} style={{ marginRight: 6 }} /> Liên hệ Zalo</button>}
                <p className="customer-quick-note"><i className="fas fa-circle-info"></i> Thông tin này chưa liên kết với hồ sơ khách hàng tiềm năng.</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    function LeadsView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const canAdd = can(perms, 'leads', 'a'), canEdit = can(perms, 'leads', 'e'), canDel = can(perms, 'leads', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [assigning, setAssigning] = useState(null);
      const [viewing360, setViewing360] = useState(null);   // Lead 360 hub
      const [offering, setOffering] = useState(null);       // log-offer modal
      const [dealFor, setDealFor] = useState(null);         // {lead, amount} -> DealModal prefilled
      const [propPrefill, setPropPrefill] = useState(null); // acquisition: seller lead -> PropertyModal prefill
      const [stage, setStage] = useState('');
      const [board, setBoard] = useState(false);            // list <-> kanban board toggle
      const [filters, setFilters] = useState({ search: initialSearch || '', source: '', interest: '', agent: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const base = useMemo(() => (rows || []).filter((l) =>
        (!filters.source || l.source === filters.source) &&
        (!filters.interest || l.interestType === filters.interest) &&
        (!filters.agent || l.assignedAgent === filters.agent)
      ), [rows, filters.source, filters.interest, filters.agent]);
      const stages = all ? ENUMS.leadStatus.concat(['Unassigned']) : ENUMS.leadStatus; // queue tab = Admin/Manager only
      const counts = useMemo(() => {
        const o = {}; base.forEach((l) => { o[l.status] = (o[l.status] || 0) + 1;
          if (!l.assignedAgent && ['Won', 'Lost'].indexOf(l.status) === -1) o.Unassigned = (o.Unassigned || 0) + 1; });
        return o;
      }, [base]);
      const visible = useMemo(() => {
        if (!stage) return base;
        if (stage === 'Unassigned') return base.filter((l) => !l.assignedAgent && ['Won', 'Lost'].indexOf(l.status) === -1);
        return base.filter((l) => l.status === stage);
      }, [base, stage]);

      // board ignores the chevron (the columns ARE the stages) — it applies its own text search
      const boardRows = useMemo(() => { const q = (filters.search || '').trim().toLowerCase();
        return !q ? base : base.filter((l) => [l.fullName, l.phone, l.source, l.interestType, l.assignedAgent, l.propertyRef, l.status]
          .join(' ').toLowerCase().indexOf(q) !== -1);
      }, [base, filters.search]);

      const kpi = useMemo(() => { const r = rows || []; return [
        [r.filter((l) => ['Won', 'Lost'].indexOf(l.status) === -1).length, 'Open Leads', 'fa-user-tag', 'bg-navy'],
        [r.filter((l) => l.status === 'New').length, 'New', 'fa-user-plus', 'bg-info'],
        [r.filter((l) => l.status === 'Won').length, 'Won', 'fa-trophy', 'bg-success'],
        [r.filter((l) => l.status === 'Lost').length, 'Lost', 'fa-user-xmark', 'bg-danger']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('leads_template.csv',
        'FullName,Phone,Email,Source,InterestType,Status,AssignedAgent,BudgetMin,BudgetMax,Message,LostReason\n' +
        'Lead 99,03001000099,lead99@demo.com,Walk-in,Buy,New,agent1,10000000,15000000,Looking for a 5 marla house,\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm khách hàng', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('leadsCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const convertToProperty = (l) => { // Sell/Rent Out -> dedup owner server-side, open the property form prefilled
        gsRun('convertLeadToProperty', l.id, currentUser).then((r) => {
          if (r && r.success) setPropPrefill(r.prefill);
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        });
      };
      const onAction = (action, l) => {
        if (action === 'wa') { const n = String(l.phone || '').replace(/\D/g, ''); if (n) window.open('https://zalo.me/' + n, '_blank'); }
        else if (action === 'view') setViewing360(l);
        else if (action === 'deal') { const acc = (l.offers || []).find((o) => o.status === 'Accepted'); setDealFor({ lead: l, amount: acc ? acc.amount : '' }); }
        else if (action === 'edit') { setEditing(l); setShowModal(true); }
        else if (action === 'assign') setAssigning(l);
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Delete lead "' + l.fullName + '"?', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Delete' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteLead', l.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      // board drag/menu -> status-only patch; server re-checks own-scope + Lost reason
      const moveLead = (l, to) => {
        const send = (lostReason) => gsRun('updateLead', { id: l.id, status: to, lostReason: lostReason || '' }, currentUser).then((r) => {
          if (r && r.success) { mutate(); swrMutate('dash:stats'); Swal.fire({ icon: 'success', title: l.fullName + ' → ' + to, timer: 1400, showConfirmButton: false }); }
          else Swal.fire({ icon: 'error', title: 'Move failed', text: (r && r.message) || 'Failed' });
        });
        if (to !== 'Lost') return send();
        Swal.fire({ icon: 'warning', title: 'Mark "' + l.fullName + '" as Lost?', input: 'text', inputLabel: 'Reason (required)',
          inputPlaceholder: 'Why was this lead lost?', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Mark Lost',
          inputValidator: (v) => (!String(v || '').trim() ? 'Reason is required' : undefined)
        }).then((r) => { if (r.isConfirmed) send(r.value); });
      };

      const tableRef = useDataTable('leadsTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'fullName', title: 'Lead', render: (d, t, l) => '<strong>' + esc(d) + '</strong><br><small style="color:#789"><i class="fas fa-phone" style="font-size:10px"></i> ' + esc(l.phone) + '</small>' },
          { data: 'interestType', title: 'Interest' },
          { data: 'source', title: 'Source' },
          { data: null, title: 'Property / Preference', orderable: false, render: (d, t, l) =>
              l.propertyRef ? '<span class="prop-ref">' + esc(l.propertyRef) + '</span><br><small style="color:#789">' + esc(l.propertyTitle || '') + '</small>'
              : (l.preferredLocationPath ? '<small style="color:#789"><i class="fas fa-location-dot"></i> ' + esc(l.preferredLocationPath) + '</small>' : '—') },
          { data: null, title: 'Budget', render: (d, t, l) => (l.budgetMin || l.budgetMax) ? esc(pkrShort(l.budgetMin || 0)) + ' – ' + esc(pkrShort(l.budgetMax || 0)) : '—' },
          { data: 'status', title: 'Status', render: (d, t, l) => t === 'display'
              ? badge(d) + (d === 'Lost' && l.lostReason ? '<br><small style="color:#c62828" title="' + esc(l.lostReason) + '">' + esc(String(l.lostReason).substr(0, 34)) + (l.lostReason.length > 34 ? '…' : '') + '</small>' : '') : d },
          { data: 'assignedAgent', title: 'Agent', render: (d) => d ? esc(d) : '<span class="status-badge st-purple">Unassigned</span>' },
          { data: 'created', title: 'Created', render: (d, t) => t === 'display' ? fmtDate(d) : (d || '') },
          { data: null, title: 'Actions', orderable: false, className: 'dt-actions actions-6', width: '208px', render: (d, t, l) => `<div class="table-actions slots-6 lead-actions">
            <button class="action-icon view-icon" data-action="view" title="Lead 360"><i class="fas fa-id-card-clip"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit && ['Negotiating','Won'].indexOf(l.status) !== -1 ? '<button class="action-icon assign-icon" data-action="deal" title="Convert to Deal"><i class="fas fa-handshake"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${all && !l.assignedAgent ? '<button class="action-icon assign-icon" data-action="assign" title="Assign agent"><i class="fas fa-user-plus"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
          </div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng 360'); },
        order: []
      }), onAction, [canEdit, canDel], (lead) => setViewing360(lead));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      return (
        <>
          <KpiRow items={kpi} />
          {!board && <Pipeline stages={stages} counts={counts} active={stage} onPick={setStage} total={base.length} />}
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Filters</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={'btn btn-sm ' + (board ? 'btn-secondary' : 'btn-primary')} onClick={() => setBoard(false)}><i className="fas fa-list"></i> List</button>
                <button className={'btn btn-sm ' + (board ? 'btn-primary' : 'btn-secondary')} onClick={() => setBoard(true)}><i className="fas fa-table-columns"></i> Board</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', source: '', interest: '', agent: '' }); setStage(''); }}>
                  <i className="fas fa-rotate-left"></i> Clear
                </button>
              </div>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={filters.search} placeholder="Name, phone, status…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Source" icon="fas fa-bullhorn" options={opts(ENUMS.leadSource)} value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })} placeholder="All Sources" />
              <SearchableDropdown label="Interest" icon="fas fa-hand-holding-dollar" options={opts(ENUMS.interestType)} value={filters.interest} onChange={(v) => setFilters({ ...filters, interest: v })} placeholder="All Interests" />
              {all && <SearchableDropdown label="Agent" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="All Agents" />}
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="leadsCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'FullName', 'bulkImportLeads', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />
            {board && <LeadKanban leads={boardRows} stages={ENUMS.leadStatus} canEdit={canEdit} onMove={moveLead} onAction={onAction} />}
            {loading ? (!board && <TableSkeleton rows={8} columns={8} />)
              : <div style={{ overflowX: 'auto', display: board ? 'none' : 'block' }}><table id="leadsTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <LeadModal lead={editing} currentUser={currentUser} role={role} lookups={lookups}
                       onClose={() => { setShowModal(false); setEditing(null); }}
                       onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('dash:stats'); }} />
          )}
          {assigning && (
            <AssignLeadModal lead={assigning} currentUser={currentUser} lookups={lookups}
                             onClose={() => setAssigning(null)}
                             onSaved={() => { setAssigning(null); mutate(); swrMutate('dash:stats'); }} />
          )}
          {viewing360 && (
            <Lead360Modal lead={(rows || []).find((x) => x.id === viewing360.id) || viewing360}
                          currentUser={currentUser} role={role} perms={perms} lookups={lookups}
                          onClose={() => setViewing360(null)}
                          onConvertDeal={(l, amount) => setDealFor({ lead: l, amount })}
                          onAddOffer={(l) => setOffering(l)}
                          onConvertProperty={convertToProperty} />
          )}
          {offering && (
            <OfferModal lead={offering} currentUser={currentUser}
                        onClose={() => setOffering(null)}
                        onSaved={() => { setOffering(null); mutate(); }} />
          )}
          {dealFor && (
            <DealModal prefill={{ propertyId: dealFor.lead.propertyId, leadId: dealFor.lead.id,
                                  buyerName: dealFor.lead.fullName, buyerPhone: dealFor.lead.phone, dealAmount: dealFor.amount }}
                       currentUser={currentUser} role={role} lookups={lookups}
                       onClose={() => setDealFor(null)}
                       onSaved={() => { setDealFor(null); mutate(); ['deals:all', 'props:all', 'dash:stats'].forEach((k) => swrMutate(k)); }} />
          )}
          {propPrefill && (
            <PropertyModal prop={null} prefill={propPrefill} currentUser={currentUser} role={role} lookups={lookups}
                           onClose={() => setPropPrefill(null)}
                           onSaved={() => { setPropPrefill(null); ['props:all', 'owners:all', 'dash:stats'].forEach((k) => swrMutate(k)); }} />
          )}
        </>
      );
    }

    function LeadModal({ lead, currentUser, role, lookups, onClose, onSaved }) {
      const all = scopeAll(role);
      const editing = !!lead;
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const props = pRes && pRes.success ? pRes.data : [];
      const [form, setForm] = useState(() => lead ? {
        fullName: lead.fullName || '', phone: lead.phone || '', email: lead.email || '', source: lead.source || 'Walk-in',
        interestType: lead.interestType || 'Buy', propertyId: lead.propertyId ? String(lead.propertyId) : '',
        preferredLocationId: lead.preferredLocationId ? String(lead.preferredLocationId) : '',
        budgetMin: lead.budgetMin == null ? '' : lead.budgetMin, budgetMax: lead.budgetMax == null ? '' : lead.budgetMax,
        message: lead.message || '', status: lead.status || 'New', lostReason: lead.lostReason || '', assignedAgent: lead.assignedAgent || ''
      } : { fullName: '', phone: '', email: '', source: 'Walk-in', interestType: 'Buy', propertyId: '', preferredLocationId: '',
            budgetMin: '', budgetMax: '', message: '', status: 'New', lostReason: '', assignedAgent: all ? '' : currentUser });
      const [saving, setSaving] = useState(false);
      const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
      const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      const pathOf = useMemo(() => locPathClient(lookups.locations || []), [lookups.locations]);

      const submit = (e) => {
        e.preventDefault();
        if (form.status === 'Lost' && !form.lostReason.trim())
          return Swal.fire({ icon: 'warning', title: 'Lost reason required', text: 'Without it, pipeline reporting cannot tell you why deals die.' });
        setSaving(true);
        gsRun(editing ? 'updateLead' : 'addLead', { ...form, id: lead ? lead.id : undefined }, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal">
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-user-plus')}></i> {editing ? 'Edit Lead #' + lead.id : 'Add Lead'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Full Name *</label>
                    <input value={form.fullName} onChange={setEv('fullName')} required />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-phone"></i> Điện thoại * <small style={{ color: '#999', textTransform: 'none' }}>(khóa định danh)</small></label>
                    <input value={form.phone} onChange={setEv('phone')} required placeholder="+92300…" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-envelope"></i> Email</label>
                    <input type="email" value={form.email} onChange={setEv('email')} />
                  </div>
                  <SearchableDropdown label="Source" icon="fas fa-bullhorn" options={opts(ENUMS.leadSource)} value={form.source} onChange={set('source')} placeholder="Source…" required={true} />
                  <SearchableDropdown label="Interest" icon="fas fa-hand-holding-dollar" options={opts(ENUMS.interestType)} value={form.interestType} onChange={set('interestType')} placeholder="Interest…" required={true} />
                  <SearchableDropdown label="Interested Property" icon="fas fa-building"
                    options={props.map((p) => ({ value: String(p.id), label: (p.referenceCode || '#' + p.id) + ' — ' + p.title }))}
                    value={form.propertyId} onChange={set('propertyId')} placeholder="None / search…" />
                  <SearchableDropdown label="Preferred Location" icon="fas fa-map-location-dot"
                    options={(lookups.locations || []).map((l) => ({ value: String(l.id), label: pathOf(l.id) }))}
                    value={form.preferredLocationId} onChange={set('preferredLocationId')} placeholder="Any location" />
                  <div className="form-group">
                    <label><i className="fas fa-money-bill"></i> Budget Min (VNĐ)</label>
                    <input type="number" min="0" step="any" value={form.budgetMin} onChange={setEv('budgetMin')} />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-money-bill-trend-up"></i> Budget Max (VNĐ)</label>
                    <input type="number" min="0" step="any" value={form.budgetMax} onChange={setEv('budgetMax')} />
                  </div>
                  {all && (
                    <SearchableDropdown label="Assigned Agent" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                      value={form.assignedAgent} onChange={set('assignedAgent')} placeholder="Unassigned queue" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Pipeline Status" icon="fas fa-flag" options={opts(ENUMS.leadStatus)} value={form.status} onChange={set('status')} placeholder="Status…" />
                  )}
                </div>
                {editing && form.status === 'Lost' && (
                  <div className="form-group">
                    <label><i className="fas fa-circle-question"></i> Lost Reason *</label>
                    <textarea rows="2" value={form.lostReason} onChange={setEv('lostReason')} placeholder="e.g. Budget too high — bought elsewhere" required></textarea>
                  </div>
                )}
                <div className="form-group">
                  <label><i className="fas fa-message"></i> Ghi chú / Nội dung trao đổi</label>
                  <textarea rows="3" value={form.message} onChange={setEv('message')}></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> {editing ? 'Update Lead' : 'Add Lead'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // quick-assign from the unassigned queue (Admin/Manager)
    function AssignLeadModal({ lead, currentUser, lookups, onClose, onSaved }) {
      const [agent, setAgent] = useState('');
      const [saving, setSaving] = useState(false);
      const submit = (e) => {
        e.preventDefault();
        if (!agent) return;
        setSaving(true);
        gsRun('assignLead', lead.id, agent, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2000, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };
      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3><i className="fas fa-user-plus"></i> Assign "{lead.fullName}"</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <SearchableDropdown label="Agent" icon="fas fa-user-tie"
                  options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                  value={agent} onChange={setAgent} placeholder="Pick an agent…" required={true} />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !agent}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Assigning…</> : <><i className="fas fa-check"></i> Assign</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Follow-Ups (activity log + reminder queue; Overdue is DERIVED, never stored) ==============
    function FollowUpsView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('fus:all', () => gsRun('getFollowUps', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const canAdd = can(perms, 'followups', 'a'), canEdit = can(perms, 'followups', 'e'), canDel = can(perms, 'followups', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [viewingLead, setViewingLead] = useState(null);
      const [stage, setStage] = useState(all ? '' : 'Due Now'); // agents land on what needs action today
      const [filters, setFilters] = useState({ search: initialSearch || '', type: '', agent: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const FU_STAGES = ['Due Now', 'Upcoming', 'Completed', 'Cancelled'];
      const stageOf = (f) => f.status === 'Cancelled' ? 'Cancelled' : f.status === 'Completed' ? 'Completed' : (isOverdue(f) || isDueToday(f) ? 'Due Now' : 'Upcoming');

      const base = useMemo(() => (rows || []).filter((f) =>
        (!filters.type || f.type === filters.type) &&
        (!filters.agent || f.assignedAgent === filters.agent)
      ), [rows, filters.type, filters.agent]);
      const counts = useMemo(() => { const o = {}; base.forEach((f) => { const s = stageOf(f); o[s] = (o[s] || 0) + 1; }); return o; }, [base]);
      const visible = useMemo(() => (stage ? base.filter((f) => stageOf(f) === stage) : base), [base, stage]);

      const kpi = useMemo(() => { const r = rows || []; return [
        [r.filter((f) => f.status === 'Pending').length, 'Pending', 'fa-hourglass-half', 'bg-navy'],
        [r.filter(isOverdue).length, 'Overdue', 'fa-triangle-exclamation', 'bg-danger'],
        [r.filter(isDueToday).length, 'Due Today', 'fa-clock', 'bg-warning'],
        [r.filter((f) => f.status === 'Completed').length, 'Completed', 'fa-circle-check', 'bg-success']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('followups_template.csv',
        'LeadPhone,Type,Notes,DueAt,AssignedAgent\n03001000001,Call,Discuss offer,2026-07-20 15:00,agent1\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm lịch chăm sóc', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('fuCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, f) => {
        if (action === 'wa') { const n = String(f.leadPhone || '').replace(/\D/g, ''); if (n) window.open('https://zalo.me/' + n, '_blank'); }
        else if (action === 'done') {
          gsRun('updateFollowUp', { id: f.id, status: 'Completed' }, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: 'Marked completed', timer: 1500, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
            else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' });
          });
        }
        else if (action === 'edit') { setEditing(f); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Delete follow-up #' + f.id + '?', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Delete' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteFollowUp', f.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      const FU_ICONS = { Call: 'fa-phone', Zalo: 'fa-comment-dots', WhatsApp: 'fa-comment-dots', Email: 'fa-envelope', Meeting: 'fa-handshake', Note: 'fa-note-sticky' };
      const tableRef = useDataTable('fuTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'leadName', title: 'Lead', render: (d, t, f) => '<strong>' + esc(d) + '</strong><br><small style="color:#789">' + esc(f.leadPhone || '') + '</small>' },
          { data: 'type', title: 'Type', render: (d, t) => t === 'display' ? '<i class="fas ' + (FU_ICONS[d] || 'fa-circle') + '" style="color:var(--navy-accent);margin-right:6px"></i>' + esc(d) : d },
          { data: 'notes', title: 'Notes', render: (d) => esc(String(d || '').substr(0, 70)) + (String(d || '').length > 70 ? '…' : '') },
          { data: 'dueAt', title: 'Due', render: (d, t, f) => t === 'display'
              ? (d ? fmtDT(d) + (isOverdue(f) ? ' ' + badge('Overdue') : '') : '<small style="color:#999">logged activity</small>') : (d || '') },
          { data: 'status', title: 'Status', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: 'assignedAgent', title: 'Agent', render: (d) => esc(d || '—') },
          { data: null, title: 'Actions', orderable: false, className: 'dt-actions actions-4', width: '140px', render: (d, t, f) => `<div class="table-actions slots-4">
            ${canEdit && f.status === 'Pending' ? '<button class="action-icon view-icon" data-action="done" title="Mark completed"><i class="fas fa-check"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo khách hàng"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>' : ''}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
        order: []
      }), onAction, [canEdit, canDel], (record) => setViewingLead(record));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      return (
        <>
          <KpiRow items={kpi} />
          <Pipeline stages={FU_STAGES} counts={counts} active={stage} onPick={setStage} total={base.length} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Filters</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', type: '', agent: '' }); setStage(''); }}>
                <i className="fas fa-rotate-left"></i> Clear
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={filters.search} placeholder="Lead, notes, agent…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Type" icon="fas fa-list" options={opts(ENUMS.followUpType)} value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} placeholder="All Types" />
              {all && <SearchableDropdown label="Agent" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="All Agents" />}
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="fuCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'LeadPhone', 'bulkImportFollowUps', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={7} /> : <div style={{ overflowX: 'auto' }}><table id="fuTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <FollowUpModal fu={editing} currentUser={currentUser} role={role} lookups={lookups}
                           onClose={() => { setShowModal(false); setEditing(null); }}
                           onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('dash:stats'); }} />
          )}
          {viewingLead && <CrossModuleLeadModal source={viewingLead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={() => setViewingLead(null)} />}
        </>
      );
    }

    function FollowUpModal({ fu, currentUser, role, lookups, onClose, onSaved }) {
      const all = scopeAll(role);
      const editing = !!fu;
      const { data: lRes } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const leads = lRes && lRes.success ? lRes.data : [];
      const [form, setForm] = useState(() => fu ? {
        leadId: String(fu.leadId || ''), type: fu.type || 'Call', notes: fu.notes || '',
        dueAt: dtLocal(fu.dueAt), status: fu.status || 'Pending', assignedAgent: fu.assignedAgent || currentUser
      } : { leadId: '', type: 'Call', notes: '', dueAt: '', status: 'Pending', assignedAgent: currentUser });
      const [saving, setSaving] = useState(false);
      const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

      const submit = (e) => {
        e.preventDefault();
        if (!form.leadId) return Swal.fire({ icon: 'warning', title: 'Pick a lead' });
        setSaving(true);
        const payload = editing
          ? { id: fu.id, type: form.type, notes: form.notes, dueAt: form.dueAt, status: form.status, assignedAgent: form.assignedAgent }
          : { leadId: form.leadId, type: form.type, notes: form.notes, dueAt: form.dueAt, assignedAgent: form.assignedAgent };
        gsRun(editing ? 'updateFollowUp' : 'addFollowUp', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-bell')}></i> {editing ? 'Edit Follow-Up #' + fu.id : 'Add Follow-Up'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                {!editing && (
                  <SearchableDropdown label="Lead" icon="fas fa-user-tag"
                    options={leads.map((l) => ({ value: String(l.id), label: l.fullName + ' (' + l.phone + ') · ' + l.status }))}
                    value={form.leadId} onChange={set('leadId')} placeholder="Search lead…" required={true} />
                )}
                <div className="form-grid">
                  <SearchableDropdown label="Type" icon="fas fa-list" options={opts(ENUMS.followUpType)} value={form.type} onChange={set('type')} placeholder="Chọn loại tài liệu…" required={true} />
                  <div className="form-group">
                    <label><i className="fas fa-clock"></i> Due At <small style={{ color: '#999', textTransform: 'none' }}>(empty = log past activity)</small></label>
                    <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))} />
                  </div>
                  {all && (
                    <SearchableDropdown label="Assigned To" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                      value={form.assignedAgent} onChange={set('assignedAgent')} placeholder="Agent…" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Status" icon="fas fa-flag" options={opts(ENUMS.followUpStatus)} value={form.status} onChange={set('status')} placeholder="Status…" />
                  )}
                </div>
                <div className="form-group">
                  <label><i className="fas fa-align-left"></i> Ghi chú</label>
                  <textarea rows="3" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="What needs to happen / what happened…"></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> {editing ? 'Update' : 'Save'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Appointments (viewing scheduler — conflicts checked server-side) ==============
    function AppointmentsView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('appts:all', () => gsRun('getAppointments', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const canAdd = can(perms, 'appointments', 'a'), canEdit = can(perms, 'appointments', 'e'), canDel = can(perms, 'appointments', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [completing, setCompleting] = useState(null); // feedback capture on Complete
      const [viewingLead, setViewingLead] = useState(null);
      const [calView, setCalView] = useState(false);      // list <-> month grid toggle
      const [stage, setStage] = useState('');
      const [filters, setFilters] = useState({ search: initialSearch || '', agent: '', range: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch, range: '' })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const inRange = (a) => {
        if (!filters.range) return true;
        const t = new Date(a.scheduledAt), now = new Date();
        if (filters.range === 'today') return t.toDateString() === now.toDateString();
        if (filters.range === 'week') { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
          const end = new Date(start); end.setDate(start.getDate() + 7); return t >= start && t < end; }
        if (filters.range === 'month') return t.getMonth() === now.getMonth() && t.getFullYear() === now.getFullYear();
        if (filters.range === 'past') return t < now;
        return true;
      };
      const base = useMemo(() => (rows || []).filter((a) => (!filters.agent || a.agent === filters.agent) && inRange(a)),
        [rows, filters.agent, filters.range]);
      const counts = useMemo(() => { const o = {}; base.forEach((a) => { o[a.status] = (o[a.status] || 0) + 1; }); return o; }, [base]);
      const visible = useMemo(() => {
        const q=String(filters.search||'').trim().toLowerCase();
        return (stage ? base.filter((a)=>a.status===stage) : base).filter((a)=>!q||[
          a.leadName,a.leadPhone,a.propertyRef,a.propertyTitle,a.agent,a.status,a.notes,a.feedback
        ].some((value)=>String(value||'').toLowerCase().includes(q)));
      }, [base,stage,filters.search]);

      const kpi = useMemo(() => { const r = rows || [], now = new Date(); return [
        [r.filter((a) => ['Scheduled', 'Confirmed'].indexOf(a.status) !== -1 && new Date(a.scheduledAt) >= now).length, 'Sắp tới', 'fa-calendar-plus', 'bg-navy'],
        [r.filter((a) => ['Scheduled', 'Confirmed'].indexOf(a.status) !== -1 && new Date(a.scheduledAt).toDateString() === now.toDateString()).length, 'Hôm nay', 'fa-calendar-day', 'bg-info'],
        [r.filter((a) => a.status === 'Completed').length, 'Hoàn thành', 'fa-flag-checkered', 'bg-success'],
        [r.filter((a) => a.status === 'No Show').length, 'Không đến', 'fa-user-slash', 'bg-danger']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('appointments_template.csv',
        'LeadPhone,PropertyRef,ScheduledAt,DurationMinutes,Agent,Notes\n03001000001,RS-LAH-1001,2026-07-21 15:00,45,agent1,First viewing\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Đặt lịch xem', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('apptCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, a) => {
        if (action === 'wa') { const n = String(a.leadPhone || '').replace(/\D/g, ''); if (n) window.open('https://zalo.me/' + n, '_blank'); }
        else if (action === 'confirm') {
          gsRun('updateAppointment', { id: a.id, status: 'Confirmed' }, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: 'Đã xác nhận', timer: 1500, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' });
          });
        }
        else if (action === 'complete') setCompleting(a);
        else if (action === 'edit') { setEditing(a); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Xóa lịch hẹn #' + a.id + '?', text: 'Nên chuyển sang trạng thái Đã hủy để giữ lại lịch sử khách không đến.', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteAppointment', a.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
              else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' }); }); });
        }
      };

      const tableRef = useDataTable('apptTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'scheduledAt', title: 'Thời gian', render: (d, t, a) => t === 'display'
              ? '<strong>' + fmtDT(d) + '</strong><br><small style="color:#789">' + (a.durationMinutes || 30) + ' phút</small>' : (d || '') },
          { data: 'leadName', title: 'Khách hàng', render: (d, t, a) => esc(d) + '<br><small style="color:#789">' + esc(a.leadPhone || '') + '</small>' },
          { data: null, title: 'Bất động sản', render: (d, t, a) => '<span class="prop-ref">' + esc(a.propertyRef || '') + '</span><br><small style="color:#789">' + esc(a.propertyTitle || '') + '</small>' },
          { data: 'agent', title: 'Nhân viên', render: (d) => esc(d || '—') },
          { data: 'status', title: 'Trạng thái', render: (d, t, a) => t === 'display'
              ? badge(d) + (a.interestLevel ? ' ' + badge(a.interestLevel) : '') + (d === 'Cancelled' && a.cancellationReason ? '<br><small style="color:#c62828">' + esc(String(a.cancellationReason).substr(0, 34)) + '</small>' : '') : d },
          { data: 'notes', title: 'Ghi chú', render: (d, t, a) => esc(String(a.feedback || d || '').substr(0, 50)) + (String(a.feedback || d || '').length > 50 ? '…' : '') },
          { data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-5', width: '174px', render: (d, t, a) => `<div class="table-actions slots-5">
            ${canEdit && a.status === 'Scheduled' ? '<button class="action-icon view-icon" data-action="confirm" title="Xác nhận"><i class="fas fa-check"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canEdit && ['Scheduled','Confirmed'].indexOf(a.status) !== -1 ? '<button class="action-icon assign-icon" data-action="complete" title="Hoàn thành và ghi phản hồi"><i class="fas fa-flag-checkered"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo khách hàng"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : ''}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
        order: [[0, 'asc']]
      }), onAction, [canEdit, canDel], (record) => setViewingLead(record));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      const RANGES = [{ value: '', label: 'Toàn thời gian' }, { value: 'today', label: 'Hôm nay' }, { value: 'week', label: 'Tuần này' }, { value: 'month', label: 'Tháng này' }, { value: 'past', label: 'Đã qua' }];
      return (
        <>
          <KpiRow items={kpi} />
          <Pipeline stages={ENUMS.appointmentStatus} counts={counts} active={stage} onPick={setStage} total={base.length} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Bộ lọc</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={'btn btn-sm ' + (calView ? 'btn-secondary' : 'btn-primary')} onClick={() => setCalView(false)}><i className="fas fa-list"></i> Danh sách</button>
                <button className={'btn btn-sm ' + (calView ? 'btn-primary' : 'btn-secondary')} onClick={() => setCalView(true)}><i className="fas fa-calendar-days"></i> Lịch</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', agent: '', range: '' }); setStage(''); }}>
                  <i className="fas fa-rotate-left"></i> Xóa
                </button>
              </div>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
                <input className="filter-input" value={filters.search} placeholder="Khách hàng, bất động sản, nhân viên…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Khoảng thời gian" icon="fas fa-calendar-week" options={RANGES.filter((r) => r.value)} value={filters.range} onChange={(v) => setFilters({ ...filters, range: v })} placeholder="Toàn thời gian" />
              {all && <SearchableDropdown label="Nhân viên" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + viEnum(a.role) + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="Tất cả nhân viên" />}
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="apptCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'LeadPhone', 'bulkImportAppointments', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />
            {calView && <CalendarGrid appts={visible} onSelectAppt={(a) => { setEditing(a); setShowModal(true); }} />}
            {loading ? (!calView && <TableSkeleton rows={8} columns={7} />)
              : <div style={{ overflowX: 'auto', display: calView ? 'none' : 'block' }}><table id="apptTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <AppointmentModal appt={editing} currentUser={currentUser} role={role} lookups={lookups}
                              onClose={() => { setShowModal(false); setEditing(null); }}
                              onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('dash:stats'); swrMutate('leads:all'); }} />
          )}
          {completing && (
            <FeedbackModal appt={completing} currentUser={currentUser}
                           onClose={() => setCompleting(null)}
                           onSaved={() => { setCompleting(null); mutate(); swrMutate('dash:stats'); }} />
          )}
          {viewingLead && <CrossModuleLeadModal source={viewingLead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={() => setViewingLead(null)} />}
        </>
      );
    }

    function AppointmentModal({ appt, currentUser, role, lookups, onClose, onSaved }) {
      const all = scopeAll(role);
      const editing = !!appt;
      const { data: lRes } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const leads = (lRes && lRes.success ? lRes.data : []).filter((l) => ['Won', 'Lost'].indexOf(l.status) === -1 || (appt && appt.leadId == l.id));
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const props = pRes && pRes.success ? pRes.data : [];
      const [form, setForm] = useState(() => appt ? {
        leadId: String(appt.leadId || ''), propertyId: String(appt.propertyId || ''), agent: appt.agent || currentUser,
        scheduledAt: dtLocal(appt.scheduledAt), durationMinutes: String(appt.durationMinutes || 30),
        status: appt.status || 'Scheduled', cancellationReason: appt.cancellationReason || '', notes: appt.notes || ''
      } : { leadId: '', propertyId: '', agent: currentUser, scheduledAt: '', durationMinutes: '30', status: 'Scheduled', cancellationReason: '', notes: '' });
      const [saving, setSaving] = useState(false);
      const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

      const submit = (e) => {
        e.preventDefault();
        if (!editing && (!form.leadId || !form.propertyId)) return Swal.fire({ icon: 'warning', title: 'Lead and property are required' });
        if (form.status === 'Cancelled' && !form.cancellationReason.trim())
          return Swal.fire({ icon: 'warning', title: 'Cancellation reason required' });
        setSaving(true);
        const payload = editing
          ? { id: appt.id, scheduledAt: form.scheduledAt, durationMinutes: form.durationMinutes, agent: form.agent, status: form.status, cancellationReason: form.cancellationReason, notes: form.notes }
          : { leadId: form.leadId, propertyId: form.propertyId, agent: form.agent, scheduledAt: form.scheduledAt, durationMinutes: form.durationMinutes, notes: form.notes };
        gsRun(editing ? 'updateAppointment' : 'addAppointment', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Cannot book', text: (r && r.message) || 'Failed' }); // conflict message surfaces here
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-calendar-plus')}></i> {editing ? 'Edit Viewing #' + appt.id : 'Book Viewing'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                {!editing && (
                  <SearchableDropdown label="Lead" icon="fas fa-user-tag"
                    options={leads.map((l) => ({ value: String(l.id), label: l.fullName + ' (' + l.phone + ') · ' + l.status }))}
                    value={form.leadId} onChange={set('leadId')} placeholder="Search lead…" required={true} />
                )}
                {!editing && (
                  <SearchableDropdown label="Property" icon="fas fa-building"
                    options={props.filter((p) => ['Sold', 'Rented'].indexOf(p.status) === -1).map((p) => ({ value: String(p.id), label: (p.referenceCode || '#' + p.id) + ' — ' + p.title }))}
                    value={form.propertyId} onChange={set('propertyId')} placeholder="Search property…" required={true} />
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-clock"></i> Date & Time *</label>
                    <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} required />
                  </div>
                  <SearchableDropdown label="Duration" icon="fas fa-hourglass-half"
                    options={[{ value: '30', label: '30 minutes' }, { value: '45', label: '45 minutes' }, { value: '60', label: '1 hour' }, { value: '90', label: '1.5 hours' }]}
                    value={form.durationMinutes} onChange={set('durationMinutes')} placeholder="Duration…" />
                  {all && (
                    <SearchableDropdown label="Agent" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                      value={form.agent} onChange={set('agent')} placeholder="Agent…" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Status" icon="fas fa-flag" options={opts(ENUMS.appointmentStatus)} value={form.status} onChange={set('status')} placeholder="Status…" />
                  )}
                </div>
                {editing && form.status === 'Cancelled' && (
                  <div className="form-group">
                    <label><i className="fas fa-circle-question"></i> Cancellation Reason *</label>
                    <textarea rows="2" value={form.cancellationReason} onChange={(e) => setForm((f) => ({ ...f, cancellationReason: e.target.value }))} required></textarea>
                  </div>
                )}
                <div className="form-group">
                  <label><i className="fas fa-align-left"></i> Notes</label>
                  <textarea rows="2" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> {editing ? 'Update' : 'Book Viewing'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Locations (City → Area → Society hierarchy) ==============
    const LOCATION_LEVEL_LABELS = { City: 'Thành phố', Area: 'Khu vực', Society: 'Khu đô thị' };
    function LocationsView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('locs:all', () => gsRun('getLocations', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const canAdd = can(perms, 'locations', 'a'), canEdit = can(perms, 'locations', 'e'), canDel = can(perms, 'locations', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [filters, setFilters] = useState({ search: initialSearch || '', level: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Tải dữ liệu thất bại', text: String((error && error.message) || error) }); }, [error]);

      const visible = useMemo(() => (rows || []).filter((l) => !filters.level || l.level === filters.level), [rows, filters.level]);
      const kpi = useMemo(() => { const r = rows || []; return [
        [r.filter((l) => l.level === 'City').length, 'Thành phố', 'fa-city', 'bg-navy'],
        [r.filter((l) => l.level === 'Area').length, 'Khu vực', 'fa-map', 'bg-info'],
        [r.filter((l) => l.level === 'Society').length, 'Khu đô thị', 'fa-map-pin', 'bg-success'],
        [r.reduce((s, l) => s + (l.propertyCount || 0), 0), 'Tin đăng liên kết', 'fa-building', 'bg-warning']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('locations_template.csv',
        'Name,Level,Parent\nMultan,City,\nModel Town,Area,Multan\nBlock A,Society,Model Town\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm khu vực', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('locCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, l) => {
        if (action === 'edit') { setEditing(l); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Xóa “' + l.name + '”?', text: 'Thao tác này có thể làm hỏng đường dẫn công khai đang sử dụng. Chỉ xóa khi dữ liệu được tạo nhầm.', showCancelButton: true, cancelButtonText: 'Hủy', confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteLocation', l.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('lookups'); }
              else Swal.fire({ icon: 'error', title: 'Không thể xóa', text: (res && res.message) || 'Thao tác thất bại' }); }); });
        }
      };

      const LEVEL_TINT = { City: 'st-navy', Area: 'st-blue', Society: 'st-teal' };
      const tableRef = useDataTable('locTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'name', title: 'Tên', render: (d, t, l) => '<strong>' + esc(d) + '</strong>' },
          { data: 'level', title: 'Cấp độ', render: (d, t) => t === 'display' ? '<span class="status-badge ' + (LEVEL_TINT[d] || 'st-gray') + '">' + esc(LOCATION_LEVEL_LABELS[d] || d) + '</span>' : d },
          { data: 'path', title: 'Đường dẫn đầy đủ', render: (d) => esc(d || '') },
          { data: 'slug', title: 'Đường dẫn công khai', render: (d) => '<span class="prop-ref">' + esc(d || '') + '</span>' },
          { data: 'propertyCount', title: 'Tin đăng' },
          { data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-2', width: '72px', render: () => `<div class="table-actions slots-2">
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Đổi tên"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : ''}
            ${!canEdit && !canDel ? '<span style="color:#999;">—</span>' : ''}</div>` }
        ],
        order: []
      }), onAction, [canEdit, canDel]);
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      return (
        <>
          <KpiRow items={kpi} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Bộ lọc</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '', level: '' })}><i className="fas fa-rotate-left"></i> Xóa</button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
                <input className="filter-input" value={filters.search} placeholder="Tên, đường dẫn, định danh…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Cấp độ" icon="fas fa-layer-group" options={ENUMS.locationLevel.map((v) => ({ value: v, label: LOCATION_LEVEL_LABELS[v] }))} value={filters.level} onChange={(v) => setFilters({ ...filters, level: v })} placeholder="Tất cả cấp độ" />
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="locCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'Name', 'bulkImportLocations', currentUser, () => { mutate(); swrMutate('lookups'); }); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={6} /> : <div style={{ overflowX: 'auto' }}><table id="locTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <LocationModal loc={editing} currentUser={currentUser} locations={rows || []}
                           onClose={() => { setShowModal(false); setEditing(null); }}
                           onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('lookups'); }} />
          )}
        </>
      );
    }

    function LocationModal({ loc, currentUser, locations, onClose, onSaved }) {
      const editing = !!loc;
      const [form, setForm] = useState(() => loc
        ? { name: loc.name || '', level: loc.level || 'City', parentId: loc.parentId ? String(loc.parentId) : '' }
        : { name: '', level: 'City', parentId: '' });
      const [saving, setSaving] = useState(false);
      const parentLevel = form.level === 'Area' ? 'City' : form.level === 'Society' ? 'Area' : '';
      const parents = locations.filter((l) => l.level === parentLevel);

      const submit = (e) => {
        e.preventDefault();
        if (parentLevel && !form.parentId) return Swal.fire({ icon: 'warning', title: 'Cần chọn cấp cha', text: (LOCATION_LEVEL_LABELS[form.level] || form.level) + ' phải trực thuộc ' + (LOCATION_LEVEL_LABELS[parentLevel] || parentLevel) + '.' });
        setSaving(true);
        const payload = editing ? { id: loc.id, name: form.name } : { name: form.name, level: form.level, parentId: form.parentId || null };
        gsRun(editing ? 'updateLocation' : 'addLocation', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2000, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Lỗi', text: String((err && err.message) || err) }); });
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-map-location-dot')}></i> {editing ? 'Đổi tên khu vực' : 'Thêm khu vực'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-group">
                  <label><i className="fas fa-signature"></i> Tên *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                {!editing && (
                  <SearchableDropdown label="Cấp độ" icon="fas fa-layer-group" options={ENUMS.locationLevel.map((v) => ({ value: v, label: LOCATION_LEVEL_LABELS[v] }))} value={form.level}
                    onChange={(v) => setForm((f) => ({ ...f, level: v, parentId: '' }))} placeholder="Chọn cấp độ…" required={true} />
                )}
                {!editing && parentLevel && (
                  <SearchableDropdown label={'Trực thuộc ' + (LOCATION_LEVEL_LABELS[parentLevel] || parentLevel)} icon="fas fa-sitemap"
                    options={parents.map((p) => ({ value: String(p.id), label: p.path || p.name }))}
                    value={form.parentId} onChange={(v) => setForm((f) => ({ ...f, parentId: v }))} placeholder={'Chọn ' + (LOCATION_LEVEL_LABELS[parentLevel] || parentLevel).toLowerCase() + '…'} required={true} />
                )}
                {editing && <p style={{ color: '#789', fontSize: 13 }}><i className="fas fa-link"></i> Định danh <strong>{loc.slug}</strong> được giữ nguyên để đường dẫn công khai không bị gián đoạn.</p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật' : 'Thêm'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Amenities (Admin-only taxonomy — kept clean so portal facets never fragment) ==============
    function AmenitiesView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('amens:all', () => gsRun('getAmenities', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const canAdd = can(perms, 'amenities', 'a'), canEdit = can(perms, 'amenities', 'e'), canDel = can(perms, 'amenities', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [search, setSearch] = useState(initialSearch || '');
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const kpi = useMemo(() => { const r = rows || []; const used = r.filter((a) => a.propertyCount > 0);
        const top = used.slice().sort((a, b) => b.propertyCount - a.propertyCount)[0];
        return [
          [r.length, 'Amenities', 'fa-list-check', 'bg-navy'],
          [used.length, 'In Use', 'fa-circle-check', 'bg-success'],
          [r.length - used.length, 'Unused', 'fa-circle-minus', 'bg-warning'],
          [top ? top.name : '—', 'Most Tagged', 'fa-star', 'bg-info']
        ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('amenities_template.csv', 'Name,Icon\nSolar Panels,fa-solar-panel\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm tiện ích', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('amenCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, a) => {
        if (action === 'edit') { setEditing(a); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Delete "' + a.name + '"?', text: a.propertyCount ? 'Tagged on ' + a.propertyCount + ' listings — the tag will drop off them.' : undefined, showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Delete' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteAmenity', a.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('lookups'); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      const tableRef = useDataTable('amenTable', rows === undefined ? null : (rows || []), () => ({
        search: { search: search },
        columns: [
          { data: 'icon', title: 'Icon', orderable: false, render: (d) => '<i class="fas ' + esc(d || 'fa-check') + '" style="color:var(--navy-accent);font-size:18px"></i>' },
          { data: 'name', title: 'Name', render: (d) => '<strong>' + esc(d) + '</strong>' },
          { data: 'propertyCount', title: 'Tagged Listings' },
          { data: 'created', title: 'Created', render: (d, t) => t === 'display' ? fmtDate(d) : (d || '') },
          { data: null, title: 'Actions', orderable: false, className: 'dt-actions actions-2', width: '72px', render: () => `<div class="table-actions slots-2">
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>' : ''}</div>` }
        ],
        order: [[1, 'asc']]
      }), onAction, [canEdit, canDel]);
      useEffect(() => { const t = tableRef.current; if (t) t.search(search || '').draw(); }, [search, rows]);

      return (
        <>
          <KpiRow items={kpi} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Filters</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSearch('')}><i className="fas fa-rotate-left"></i> Clear</button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={search} placeholder="Amenity name…" onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="amenCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'Name', 'bulkImportAmenities', currentUser, () => { mutate(); swrMutate('lookups'); }); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={5} /> : <div style={{ overflowX: 'auto' }}><table id="amenTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <AmenityModal amenity={editing} currentUser={currentUser}
                          onClose={() => { setShowModal(false); setEditing(null); }}
                          onSaved={() => { setShowModal(false); setEditing(null); mutate(); swrMutate('lookups'); }} />
          )}
        </>
      );
    }

    const AMEN_ICONS = ['fa-bolt','fa-car','fa-user-tie','fa-tree','fa-person-swimming','fa-shield-halved','fa-elevator','fa-vector-square','fa-couch','fa-fire-flame-simple','fa-stairs','fa-building','fa-solar-panel','fa-wifi','fa-dumbbell','fa-mosque','fa-school','fa-kitchen-set','fa-water','fa-video','fa-warehouse','fa-tv','fa-snowflake','fa-key'];
    function AmenityModal({ amenity, currentUser, onClose, onSaved }) {
      const editing = !!amenity;
      const [form, setForm] = useState(() => amenity ? { name: amenity.name || '', icon: amenity.icon || '' } : { name: '', icon: '' });
      const [saving, setSaving] = useState(false);
      const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        gsRun(editing ? 'updateAmenity' : 'addAmenity', { ...form, id: amenity ? amenity.id : undefined }, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2000, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((err && err.message) || err) }); });
      };
      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-list-check')}></i> {editing ? 'Edit Amenity' : 'Add Amenity'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-group">
                  <label><i className="fas fa-signature"></i> Name *</label>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ví dụ: Điện mặt trời" />
                </div>
                <SearchableDropdown label="Icon" icon="fas fa-icons"
                  options={AMEN_ICONS.map((ic) => ({ value: ic, label: ic.replace('fa-', '').replace(/-/g, ' ') }))}
                  value={form.icon} onChange={(v) => setForm((f) => ({ ...f, icon: v }))} placeholder="Pick an icon…" />
                {form.icon && <p style={{ margin: '4px 0 10px', color: '#789' }}>Preview: <i className={'fas ' + form.icon} style={{ color: 'var(--navy-accent)', fontSize: 18 }}></i></p>}
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> {editing ? 'Update' : 'Add'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== About App (living document — RBAC matrix + every formula in the app) ==============
    // ============== Money-layer shared bits ==============
    const Tabs = ({ tabs, tab, setTab }) => (
      <div className="rs-tabs">
        {tabs.map(([k, ic, lbl]) => (
          <button key={k} type="button" className={'rs-tab' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}><i className={'fas ' + ic}></i>{lbl}</button>
        ))}
      </div>
    );
    const useAppCfg = (currentUser) => {
      const { data } = useSWR(currentUser ? 'cfg' : null, () => gsRun('getAppConfig', currentUser), SWR_LIVE);
      return (data && data.success && data.cfg) || { commissionPctSale: 1, commissionPctRent: 100, agentSharePct: 40, renewalIncrementPct: 10, roundRobin: 0 };
    };
    const waOpen = (phone, msg) => { const n = String(phone || '').replace(/\D/g, ''); if (n) window.open('https://zalo.me/' + n + (msg ? '?text=' + encodeURIComponent(msg) : ''), '_blank'); };
    const ymNow = () => { const d = new Date(), p = (x) => String(x).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1); };
    const monthsDue = (t) => { // due month list since startDate — mirrors backend tenMonths_
      const out = [], s = new Date(t.startDate + 'T00:00:00'), now = new Date();
      let m = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
      if (now.getDate() >= (t.rentDueDay || 5)) m++;
      for (let i = 0; i < Math.max(0, m); i++) { const d = new Date(s.getFullYear(), s.getMonth() + i, 1), p = (x) => String(x).padStart(2, '0'); out.push(d.getFullYear() + '-' + p(d.getMonth() + 1)); }
      return out;
    };
    // lead <-> inventory matching: location subtree > type > budget fit (client-side — data is already cached)
    const matchProps = (lead, props, locs) => {
      const by = {}; (locs || []).forEach((l) => { by[l.id] = l; });
      const chainOf = (id) => { const out = []; let c = by[id], g = 0; while (c && g++ < 5) { out.push(c.id); c = by[c.parentId]; } return out; };
      const want = lead.interestType === 'Rent' ? 'Rent' : lead.interestType === 'Buy' ? 'Sale' : null;
      const refType = lead.propertyId ? (props.find((x) => x.id == lead.propertyId) || {}).propertyType : null;
      return props.filter((p) => ['Available', 'Reserved'].indexOf(p.status) !== -1 && p.id != lead.propertyId && (!want || p.listingType === want))
        .map((p) => { let s = 0;
          if (lead.preferredLocationId && chainOf(p.locationId).indexOf(lead.preferredLocationId) !== -1) s += 3;
          if (refType && refType === p.propertyType) s += 2;
          const min = (lead.budgetMin || 0) * 0.9, max = lead.budgetMax ? lead.budgetMax * 1.1 : Infinity;
          if (p.price >= min && p.price <= max) s += 1;
          return { p, s };
        }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 8);
    };

    // ============== Deal modal — transaction split: form left, live math right (ONE calc, mirrors backend dealCalc_) ==============
    function DealModal({ deal, prefill, currentUser, role, lookups, onClose, onSaved }) {
      const all = scopeAll(role);
      const editing = !!deal;
      const cfg = useAppCfg(currentUser);
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: dRes } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const props = pRes && pRes.success ? pRes.data : [];
      const allDeals = dRes && dRes.success ? dRes.data : [];
      const openProp = useMemo(() => { const o = {}; allDeals.forEach((x) => { if (['Token','Agreement'].indexOf(x.status) !== -1) o[x.propertyId] = 1; }); return o; }, [allDeals]);
      const [form, setForm] = useState(() => deal ? {
        propertyId: String(deal.propertyId), buyerName: deal.buyerName || '', buyerPhone: deal.buyerPhone || '',
        dealAmount: deal.dealAmount, commissionPct: deal.commissionPct, agentSharePct: deal.agentSharePct,
        tokenAmount: '', tokenMethod: 'Cash', agent: deal.agent, notes: deal.notes || '', status: deal.status,
        cancellationReason: deal.cancellationReason || '', securityDeposit: '', endDate: '', rentDueDay: 5
      } : {
        propertyId: prefill && prefill.propertyId ? String(prefill.propertyId) : '',
        buyerName: (prefill && prefill.buyerName) || '', buyerPhone: (prefill && prefill.buyerPhone) || '',
        dealAmount: (prefill && prefill.dealAmount) || '', commissionPct: '', agentSharePct: '',
        tokenAmount: '', tokenMethod: 'Cash', agent: currentUser, notes: '', status: 'Token',
        cancellationReason: '', securityDeposit: '', endDate: '', rentDueDay: 5
      });
      const [saving, setSaving] = useState(false);
      const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
      const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      const prop = props.find((p) => String(p.id) === String(form.propertyId));
      const dealType = deal ? deal.dealType : (prop ? prop.listingType : 'Sale');
      const closed = editing && ['Completed','Cancelled'].indexOf(deal.status) !== -1;

      // the ONE calc — preview + payload share it; server recomputes anyway
      const amt = r2(form.dealAmount);
      const cPct = form.commissionPct === '' ? (dealType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale) : (parseFloat(form.commissionPct) || 0);
      const sPct = form.agentSharePct === '' ? cfg.agentSharePct : (parseFloat(form.agentSharePct) || 0);
      const commission = r2(amt * cPct / 100);
      const agentShare = r2(commission * sPct / 100);
      const paid = editing ? r2((deal.payments || []).reduce((s, q) => s + (q.amount || 0), 0)) : r2(form.tokenAmount);
      const balance = r2(amt - paid);
      const err = !form.propertyId ? 'Chọn một bất động sản' : !(amt > 0) ? 'Cần nhập giá trị giao dịch'
        : !form.buyerName.trim() || String(form.buyerPhone).replace(/\D/g, '').length < 9 ? 'Cần nhập tên và số điện thoại người mua hợp lệ'
        : paid > amt ? 'Tổng thanh toán vượt giá trị giao dịch' : (!editing && openProp[form.propertyId]) ? 'Bất động sản đã có giao dịch đang mở'
        : (form.status === 'Cancelled' && editing && !form.cancellationReason.trim()) ? 'Cần nhập lý do hủy' : '';
      const completing = editing && form.status === 'Completed' && deal.status !== 'Completed';

      const submit = (e) => {
        e.preventDefault();
        if (err) return;
        setSaving(true);
        const payload = editing
          ? { id: deal.id, buyerName: form.buyerName, buyerPhone: form.buyerPhone, dealAmount: form.dealAmount,
              commissionPct: cPct, agentSharePct: sPct, agent: form.agent, notes: form.notes, status: form.status,
              cancellationReason: form.cancellationReason, securityDeposit: form.securityDeposit, endDate: form.endDate, rentDueDay: form.rentDueDay }
          : { propertyId: form.propertyId, leadId: prefill && prefill.leadId, buyerName: form.buyerName, buyerPhone: form.buyerPhone,
              dealAmount: form.dealAmount, commissionPct: cPct, agentSharePct: sPct, tokenAmount: form.tokenAmount, tokenMethod: form.tokenMethod,
              agent: form.agent, notes: form.notes };
        gsRun(editing ? 'updateDeal' : 'addDeal', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((e2) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Error', text: String((e2 && e2.message) || e2) }); });
      };

      return (
        <div className="modal-overlay">
          <div className="modal modal-txn">
            <div className="modal-header">
              <h3><i className="fas fa-handshake"></i> {editing ? 'Deal #' + deal.id + ' — ' + (deal.propertyRef || '') : 'New Deal'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="txn-split">
                  <div className="txn-form">
                    <div className="form-grid">
                      {!editing && (
                        <SearchableDropdown label="Property" icon="fas fa-building"
                          options={props.filter((p) => ['Available','Reserved'].indexOf(p.status) !== -1 && !openProp[p.id]).map((p) => ({ value: String(p.id), label: (p.referenceCode || '#' + p.id) + ' — ' + p.title }))}
                          value={form.propertyId} onChange={set('propertyId')} placeholder="Live listings only…" required={true} />
                      )}
                      <div className="form-group">
                        <label><i className="fas fa-user"></i> Buyer / Tenant Name *</label>
                        <input value={form.buyerName} onChange={setEv('buyerName')} disabled={closed} required />
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-phone"></i> Buyer Phone *</label>
                        <input value={form.buyerPhone} onChange={setEv('buyerPhone')} disabled={closed} required placeholder="+92300…" />
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-money-bill-wave"></i> Giá trị giao dịch (VNĐ) *{dealType === 'Rent' ? ' — tiền thuê tháng' : ''}</label>
                        <input type="number" min="1" step="any" value={form.dealAmount} onChange={setEv('dealAmount')} disabled={closed} required />
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-percent"></i> Tỷ lệ hoa hồng <small style={{ color: '#999', textTransform: 'none' }}>(mặc định {dealType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale}%)</small></label>
                        <input type="number" min="0" step="any" value={form.commissionPct} onChange={setEv('commissionPct')} disabled={closed} placeholder={String(dealType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale)} />
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-user-tie"></i> Tỷ lệ nhân viên <small style={{ color: '#999', textTransform: 'none' }}>(mặc định {cfg.agentSharePct}%)</small></label>
                        <input type="number" min="0" max="100" step="any" value={form.agentSharePct} onChange={setEv('agentSharePct')} disabled={closed} placeholder={String(cfg.agentSharePct)} />
                      </div>
                      {!editing && (
                        <div className="form-group">
                          <label><i className="fas fa-coins"></i> Token Money (VNĐ)</label>
                          <input type="number" min="0" step="any" value={form.tokenAmount} onChange={setEv('tokenAmount')} />
                        </div>
                      )}
                      {!editing && r2(form.tokenAmount) > 0 && (
                        <SearchableDropdown label="Token Method" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.tokenMethod} onChange={set('tokenMethod')} placeholder="Method…" />
                      )}
                      {all && (
                        <SearchableDropdown label="Agent" icon="fas fa-user-tie"
                          options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                          value={form.agent} onChange={set('agent')} placeholder="Agent…" />
                      )}
                      {editing && !closed && (
                        <SearchableDropdown label="Status" icon="fas fa-flag"
                          options={opts(all ? ENUMS.dealStatus : ['Token', 'Agreement'])}
                          value={form.status} onChange={set('status')} placeholder="Status…" />
                      )}
                    </div>
                    {editing && form.status === 'Cancelled' && deal.status !== 'Cancelled' && (
                      <div className="form-group">
                        <label><i className="fas fa-circle-question"></i> Cancellation Reason *</label>
                        <textarea rows="2" value={form.cancellationReason} onChange={setEv('cancellationReason')} required></textarea>
                      </div>
                    )}
                    {completing && dealType === 'Rent' && (
                      <div className="form-grid">
                        <div className="form-group">
                          <label><i className="fas fa-shield-halved"></i> Security Deposit (VNĐ)</label>
                          <input type="number" min="0" step="any" value={form.securityDeposit} onChange={setEv('securityDeposit')} />
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-calendar-day"></i> Contract End Date</label>
                          <input type="date" value={form.endDate} onChange={setEv('endDate')} />
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-calendar-check"></i> Ngày đến hạn thuê (1–28)</label>
                          <input type="number" min="1" max="28" value={form.rentDueDay} onChange={setEv('rentDueDay')} />
                        </div>
                      </div>
                    )}
                    <div className="form-group">
                      <label><i className="fas fa-align-left"></i> Ghi chú</label>
                      <textarea rows="2" value={form.notes} onChange={setEv('notes')}></textarea>
                    </div>
                  </div>
                  <div className="txn-preview">
                    <div className="txn-h"><i className="fas fa-calculator"></i> Tính toán trực tiếp</div>
                    <div className="txn-line"><span className="f">Giá trị giao dịch</span><span className="v">{fmtPKR(amt)}</span></div>
                    <div className="txn-line"><span className="f">Σ thanh toán{!editing ? ' (đặt cọc)' : ''}</span><span className="v">{fmtPKR(paid)}</span></div>
                    <div className={'txn-line' + (balance < 0 ? ' bad' : '')}><span className="f">Số dư</span><span className="v">{fmtPKR(balance)}</span></div>
                    <div className="txn-line"><span className="f">Hoa hồng {cPct}% × giá trị</span><span className="v">{fmtPKR(commission)}</span></div>
                    <div className="txn-line"><span className="f">Phần nhân viên {sPct}% × hoa hồng</span><span className="v">{fmtPKR(agentShare)}</span></div>
                    <div className="txn-line total"><span className="f">Phần công ty</span><span className="v">{fmtPKR(r2(commission - agentShare))}</span></div>
                    {editing && (deal.payments || []).length > 0 && (
                      <>
                        <div className="txn-h" style={{ marginTop: 12 }}><i className="fas fa-receipt"></i> Các khoản thanh toán</div>
                        {(deal.payments || []).map((q, i) => (
                          <div key={i} className="txn-pay-row"><span>{fmtDate(q.date)} · {q.method}{q.ref ? ' · ' + q.ref : ''}</span><span>{fmtPKR(q.amount)}</span></div>
                        ))}
                      </>
                    )}
                    <div className="txn-impact">
                      <i className="fas fa-arrow-right-arrow-left"></i>{' '}
                      {!editing && <>Bất động sản {prop ? viEnum(prop.status) : '—'} → <b>Đã giữ chỗ</b></>}
                      {completing && <>Bất động sản → <b>{dealType === 'Rent' ? 'Đã cho thuê (tự tạo hợp đồng thuê)' : 'Đã bán'}</b>{deal.leadId ? <> · Khách hàng → <b>Thành công</b></> : null}</>}
                      {editing && form.status === 'Cancelled' && deal.status !== 'Cancelled' && <>Bất động sản Đã giữ chỗ → <b>Còn trống</b></>}
                      {editing && !completing && form.status !== 'Cancelled' && <>Trạng thái: <b>{viEnum(form.status)}</b></>}
                    </div>
                    {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>Đóng</button>
                      {!closed && (
                        <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                          {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật giao dịch' : 'Mở giao dịch'}</>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // quick payment against a deal — split-lite: amount left, balance impact right
    function DealPaymentModal({ deal, currentUser, onClose, onSaved }) {
      const [form, setForm] = useState({ amount: '', method: 'Cash', ref: '', notes: '' });
      const [saving, setSaving] = useState(false);
      const paid = r2((deal.payments || []).reduce((s, q) => s + (q.amount || 0), 0));
      const amt = r2(form.amount);
      const after = r2(deal.dealAmount - paid - amt);
      const err = !(amt > 0) ? 'Enter the amount' : after < -0.01 ? 'Overpay — balance is only ' + fmtPKR(r2(deal.dealAmount - paid)) : '';
      const submit = (e) => {
        e.preventDefault();
        if (err) return;
        setSaving(true);
        gsRun('addDealPayment', deal.id, form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal modal-txn" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3><i className="fas fa-money-bill-wave"></i> Payment — {deal.propertyRef} · {deal.buyerName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="txn-split">
                  <div className="txn-form">
                    <div className="form-grid">
                      <div className="form-group">
                        <label><i className="fas fa-money-bill"></i> Amount (VNĐ) *</label>
                        <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus />
                      </div>
                      <SearchableDropdown label="Method" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.method} onChange={(v) => setForm({ ...form, method: v })} placeholder="Method…" />
                      <div className="form-group">
                        <label><i className="fas fa-hashtag"></i> Reference</label>
                        <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="Cheque / TT no." />
                      </div>
                      <div className="form-group">
                        <label><i className="fas fa-align-left"></i> Notes</label>
                        <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                      </div>
                    </div>
                  </div>
                  <div className="txn-preview">
                    <div className="txn-h"><i className="fas fa-calculator"></i> Impact</div>
                    <div className="txn-line"><span className="f">Deal amount</span><span className="v">{fmtPKR(deal.dealAmount)}</span></div>
                    <div className="txn-line"><span className="f">Paid so far</span><span className="v">{fmtPKR(paid)}</span></div>
                    <div className="txn-line"><span className="f">This payment</span><span className="v">{fmtPKR(amt)}</span></div>
                    <div className={'txn-line total' + (after < 0 ? ' bad' : '')}><span className="f">Balance after</span><span className="v">{fmtPKR(after)}</span></div>
                    {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Record Payment</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Deals view ==============
    function DealsView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const canAdd = can(perms, 'deals', 'a'), canEdit = can(perms, 'deals', 'e'), canDel = can(perms, 'deals', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [paying, setPaying] = useState(null);
      const [viewingLead, setViewingLead] = useState(null);
      const [stage, setStage] = useState('');
      const [filters, setFilters] = useState({ search: initialSearch || '', type: '', agent: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const base = useMemo(() => (rows || []).filter((x) =>
        (!filters.type || x.dealType === filters.type) && (!filters.agent || x.agent === filters.agent)
      ), [rows, filters.type, filters.agent]);
      const counts = useMemo(() => { const o = {}; base.forEach((x) => { o[x.status] = (o[x.status] || 0) + 1; }); return o; }, [base]);
      const visible = useMemo(() => (stage ? base.filter((x) => x.status === stage) : base), [base, stage]);

      const mm = ymNow();
      const kpi = useMemo(() => { const r = rows || [];
        const closedM = r.filter((x) => x.status === 'Completed' && String(x.closedAt || '').substr(0, 7) === mm);
        return [
          [r.filter((x) => ['Token', 'Agreement'].indexOf(x.status) !== -1).length, 'Open Deals', 'fa-handshake', 'bg-navy'],
          [pkrShort(closedM.reduce((s, x) => s + x.dealAmount, 0)), 'Closed Value (month)', 'fa-sack-dollar', 'bg-success'],
          [pkrShort(closedM.reduce((s, x) => s + (x.commissionAmt || 0), 0)), 'Commission (month)', 'fa-percent', 'bg-info'],
          [pkrShort(r.filter((x) => ['Token', 'Agreement'].indexOf(x.status) !== -1).reduce((s, x) => s + (x.balance || 0), 0)), 'Outstanding', 'fa-hourglass-half', 'bg-warning']
        ]; }, [rows, mm]);

      const downloadTemplate = () => downloadCSV('deals_template.csv',
        'PropertyRef,BuyerName,BuyerPhone,DealAmount,CommissionPct,AgentSharePct,TokenAmount,Agent,Status,Notes\n' +
        'RS-LAH-1001,Buyer 99,03006000099,25000000,1,40,1000000,agent1,Token,Token received\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Giao dịch mới', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('dealsCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const refetch = () => { mutate(); ['props:all', 'leads:all', 'tenancies:all', 'dash:stats'].forEach((k) => swrMutate(k)); };
      const onAction = (action, x) => {
        if (action === 'wa') waOpen(x.buyerPhone);
        else if (action === 'pay') setPaying(x);
        else if (action === 'edit') { setEditing(x); setShowModal(true); }
        else if (action === 'paidout') {
          Swal.fire({ icon: 'question', title: 'Mark agent share paid?', text: x.agent + ' · ' + fmtPKR(x.agentShareAmt), showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Mark Paid' })
            .then((r) => { if (r.isConfirmed) gsRun('markAgentPaid', x.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); refetch(); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Delete deal #' + x.id + '?', text: 'The property goes back to Available.', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Delete' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteDeal', x.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); refetch(); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      const tableRef = useDataTable('dealsTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'propertyRef', title: 'Property', render: (d, t, x) => '<span class="prop-ref">' + esc(d || '—') + '</span><br><small style="color:#789">' + esc(String(x.propertyTitle || '').substr(0, 34)) + '</small>' },
          { data: 'buyerName', title: 'Buyer', render: (d, t, x) => '<strong>' + esc(d) + '</strong><br><small style="color:#789">' + esc(x.buyerPhone || '') + '</small>' },
          { data: 'dealType', title: 'Type', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: 'dealAmount', title: 'Amount', render: (d, t) => t === 'display' ? '<strong>' + esc(pkrShort(d)) + '</strong>' : d },
          { data: 'paid', title: 'Paid', render: (d, t) => t === 'display' ? esc(pkrShort(d)) : d },
          { data: 'balance', title: 'Balance', render: (d, t) => t === 'display' ? '<span style="color:' + (d > 0 ? '#c0392b' : '#2e7d32') + ';font-weight:700">' + esc(pkrShort(d)) + '</span>' : d },
          { data: 'commissionAmt', title: 'Commission', render: (d, t, x) => t === 'display'
              ? esc(pkrShort(d)) + '<br>' + (x.status === 'Completed' ? badge(x.agentPaidAt ? 'Paid' : 'Payable') : '<small style="color:#789">' + esc(pkrShort(x.agentShareAmt || 0)) + ' agent</small>') : d },
          { data: 'agent', title: 'Agent' },
          { data: 'status', title: 'Status', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: null, title: 'Actions', orderable: false, className: 'dt-actions actions-5', width: '174px', render: (d, t, x) => `<div class="table-actions slots-5">
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit deal"><i class="fas fa-pen-to-square"></i></button>' : ''}
            ${canEdit && ['Token','Agreement'].indexOf(x.status) !== -1 ? '<button class="action-icon assign-icon" data-action="pay" title="Add payment"><i class="fas fa-money-bill-wave"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo người mua"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${all && x.status === 'Completed' && !x.agentPaidAt ? '<button class="action-icon edit-icon" data-action="paidout" title="Mark agent paid"><i class="fas fa-hand-holding-dollar"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canDel && x.status !== 'Completed' ? '<button class="action-icon delete-icon" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
        order: []
      }), onAction, [canEdit, canDel, all], (record) => setViewingLead(record));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]);

      return (
        <>
          <KpiRow items={kpi} />
          <Pipeline stages={ENUMS.dealStatus} counts={counts} active={stage} onPick={setStage} total={base.length} />
          <div className="filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Filters</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', type: '', agent: '' }); setStage(''); }}>
                <i className="fas fa-rotate-left"></i> Clear
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={filters.search} placeholder="Buyer, ref, agent…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Type" icon="fas fa-tags" options={opts(ENUMS.listingType)} value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} placeholder="Sale & Rent" />
              {all && <SearchableDropdown label="Agent" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="All Agents" />}
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="dealsCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'PropertyRef', 'bulkImportDeals', currentUser, refetch); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={10} /> : <div style={{ overflowX: 'auto' }}><table id="dealsTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && (
            <DealModal deal={editing} currentUser={currentUser} role={role} lookups={lookups}
                       onClose={() => { setShowModal(false); setEditing(null); }}
                       onSaved={() => { setShowModal(false); setEditing(null); refetch(); }} />
          )}
          {paying && <DealPaymentModal deal={paying} currentUser={currentUser} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); refetch(); }} />}
          {viewingLead && <CrossModuleLeadModal source={viewingLead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={() => setViewingLead(null)} />}
        </>
      );
    }

    // ============== Owners (party registry) ==============
    function OwnerModal({ owner, currentUser, onClose, onSaved }) {
      const editing = !!owner;
      const [form, setForm] = useState(() => owner
        ? { name: owner.name || '', phone: owner.phone || '', email: owner.email || '', cnic: owner.cnic || '', address: owner.address || '', notes: owner.notes || '' }
        : { name: '', phone: '', email: '', cnic: '', address: '', notes: '' });
      const [saving, setSaving] = useState(false);
      const setEv = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
      const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        gsRun(editing ? 'updateOwner' : 'addOwner', { ...form, id: owner ? owner.id : undefined }, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(r); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-user-plus')}></i> {editing ? 'Chỉnh sửa chủ sở hữu #' + owner.id : 'Thêm chủ sở hữu'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group"><label><i className="fas fa-user"></i> Họ và tên *</label><input value={form.name} onChange={setEv('name')} required /></div>
                  <div className="form-group"><label><i className="fas fa-phone"></i> Điện thoại * <small style={{ color: '#999', textTransform: 'none' }}>(khóa định danh)</small></label><input value={form.phone} onChange={setEv('phone')} required placeholder="+92300…" /></div>
                  <div className="form-group"><label><i className="fas fa-envelope"></i> Email</label><input type="email" value={form.email} onChange={setEv('email')} /></div>
                  <div className="form-group"><label><i className="fas fa-id-card"></i> Số CCCD / CMND</label><input value={form.cnic} onChange={setEv('cnic')} placeholder="Nhập số CCCD/CMND..." /></div>
                </div>
                <div className="form-group"><label><i className="fas fa-location-dot"></i> Địa chỉ</label><input value={form.address} onChange={setEv('address')} /></div>
                <div className="form-group"><label><i className="fas fa-align-left"></i> Notes</label><textarea rows="2" value={form.notes} onChange={setEv('notes')}></textarea></div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật chủ sở hữu' : 'Thêm chủ sở hữu'}</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    function Owner360Modal({ owner, currentUser, onClose }) {
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: dRes } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const props = (pRes && pRes.success ? pRes.data : []).filter((p) => p.ownerId == owner.id);
      const propIds = {}; props.forEach((p) => { propIds[p.id] = 1; });
      const deals = (dRes && dRes.success ? dRes.data : []).filter((x) => propIds[x.propertyId]);
      const [tab, setTab] = useState('over');
      return (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-user-tie"></i> Hồ sơ chủ sở hữu 360 — {owner.name}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="id-head">
                <div>
                  <div className="nm">{owner.name}</div>
                  <div className="sub"><i className="fas fa-phone"></i> {owner.phone}{owner.email ? ' · ' + owner.email : ''}{owner.cnic ? ' · ' + owner.cnic : ''}</div>
                </div>
                <div className="id-kpis">
                  <div className="id-kpi"><div className="v">{props.length}</div><div className="l">Bất động sản</div></div>
                  <div className="id-kpi"><div className="v">{deals.filter((x) => x.status === 'Completed').length}</div><div className="l">Giao dịch hoàn tất</div></div>
                  <div className="id-kpi"><div className="v">{pkrShort(deals.filter((x) => x.status === 'Completed').reduce((s, x) => s + x.dealAmount, 0))}</div><div className="l">Tổng doanh số</div></div>
                </div>
              </div>
              <Tabs tab={tab} setTab={setTab} tabs={[['over', 'fa-circle-info', 'Tổng quan'], ['props', 'fa-building', 'Bất động sản (' + props.length + ')'], ['deals', 'fa-handshake', 'Giao dịch (' + deals.length + ')']]} />
              {tab === 'over' && (
                <div className="pd-facts">
                  <div className="pd-fact"><div className="k">Điện thoại</div><div className="v">{owner.phone}</div></div>
                  <div className="pd-fact"><div className="k">Email</div><div className="v">{owner.email || '—'}</div></div>
                  <div className="pd-fact"><div className="k">Số CCCD / CMND</div><div className="v">{owner.cnic || '—'}</div></div>
                  <div className="pd-fact"><div className="k">Địa chỉ</div><div className="v">{owner.address || '—'}</div></div>
                  <div className="pd-fact"><div className="k">Ngày tạo</div><div className="v">{fmtDate(owner.created)}</div></div>
                  <div className="pd-fact"><div className="k">Ghi chú</div><div className="v">{owner.notes || '—'}</div></div>
                </div>
              )}
              {tab === 'props' && (props.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có bất động sản liên kết — chọn chủ sở hữu trong biểu mẫu bất động sản để liên kết.</p> : props.map((p) => (
                <div key={p.id} className="tl-item"><i className="fas fa-building"></i>
                  <div style={{ flex: 1 }}><div className="w"><b>{p.referenceCode}</b> {p.title}</div><div className="m">{pkrShort(p.price)} · {p.locationPath}</div></div>
                  <Badge s={p.status} />
                </div>
              )))}
              {tab === 'deals' && (deals.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có giao dịch trên bất động sản của chủ sở hữu này.</p> : deals.map((x) => (
                <div key={x.id} className="tl-item"><i className="fas fa-handshake"></i>
                  <div style={{ flex: 1 }}><div className="w"><b>{x.propertyRef}</b> — {x.buyerName}</div><div className="m">{fmtPKR(x.dealAmount)} · {fmtDate(x.created)}</div></div>
                  <Badge s={x.status} />
                </div>
              )))}
            </div>
          </div>
        </div>
      );
    }

    function OwnersView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('owners:all', () => gsRun('getOwners', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const canAdd = can(perms, 'owners', 'a'), canEdit = can(perms, 'owners', 'e'), canDel = can(perms, 'owners', 'd');
      const [showModal, setShowModal] = useState(false);
      const [editing, setEditing] = useState(null);
      const [viewing, setViewing] = useState(null);
      const [filters, setFilters] = useState({ search: initialSearch || '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);

      const kpi = useMemo(() => { const r = rows || []; return [
        [r.length, 'Tổng chủ sở hữu', 'fa-user-tie', 'bg-navy'],
        [r.filter((o) => o.propertyCount > 0).length, 'Có BĐS gửi bán/thuê', 'fa-building', 'bg-info'],
        [r.reduce((s, o) => s + (o.propertyCount || 0), 0), 'BĐS liên kết', 'fa-link', 'bg-success'],
        [pkrShort(r.reduce((s, o) => s + (o.totalBusiness || 0), 0)), 'Tổng doanh số', 'fa-sack-dollar', 'bg-warning']
      ]; }, [rows]);

      const downloadTemplate = () => downloadCSV('owners_template.csv', 'Name,Phone,Email,CNIC,Address,Notes\nOwner 99,03005000099,owner99@demo.com,,DHA Lahore,\n');

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          ...(canAdd ? [{ icon: 'fa-plus', label: 'Thêm chủ sở hữu', primary: true, onClick: () => { setEditing(null); setShowModal(true); } }] : []),
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() },
          ...(canAdd ? [{ icon: 'fa-file-import', label: 'Nhập CSV', onClick: () => document.getElementById('ownersCsvImport').click() }] : []),
          { icon: 'fa-download', label: 'Tệp mẫu', onClick: downloadTemplate }
        ]);
        return () => setPageActions([]);
      }, [canAdd]);

      const onAction = (action, o) => {
        if (action === 'view') setViewing(o);
        else if (action === 'wa') waOpen(o.phone);
        else if (action === 'edit') { setEditing(o); setShowModal(true); }
        else if (action === 'delete') {
          Swal.fire({ icon: 'warning', title: 'Xóa chủ sở hữu "' + o.name + '"?', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteOwner', o.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      const tableRef = useDataTable('ownersTable', rows === undefined ? null : rows, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'name', title: 'Chủ sở hữu', render: (d, t, o) => t === 'display'
              ? '<button type="button" class="table-record-link" data-action="view" title="Xem hồ sơ chủ sở hữu"><strong>' + esc(d) + '</strong><span class="record-phone">' + esc(o.phone) + '</span></button>'
              : d },
          { data: 'email', title: 'Email', render: (d) => esc(d || '—') },
          { data: 'address', title: 'Địa chỉ', render: (d) => esc(d || '—') },
          { data: 'propertyCount', title: 'Số BĐS' },
          { data: 'totalBusiness', title: 'Tổng doanh số', render: (d, t) => t === 'display' ? esc(pkrShort(d)) : d },
          { data: 'created', title: 'Ngày tạo', render: (d, t) => t === 'display' ? fmtDate(d) : (d || '') },
          { data: null, title: 'Actions', orderable: false, className: 'dt-actions actions-4', width: '140px', render: () => `<div class="table-actions slots-4">
            <button class="action-icon view-icon" data-action="view" title="Hồ sơ chủ sở hữu 360"><i class="fas fa-id-card-clip"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Edit"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Delete"><i class="fas fa-trash"></i></button>' : ''}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ chủ sở hữu 360'); },
        order: []
      }), onAction, [canEdit, canDel], (owner) => setViewing(owner));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, rows]);

      return (
        <>
          <KpiRow items={kpi} />
          <div className="filters-section">
            <div className="filters-header"><h3><i className="fas fa-filter"></i> Bộ lọc</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ search: '' })}><i className="fas fa-rotate-left"></i> Xóa lọc</button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={filters.search} placeholder="Tên, số điện thoại, địa chỉ, CCCD…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="data-section">
            <input type="file" id="ownersCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'Name', 'bulkImportOwners', currentUser, () => mutate()); e.target.value = ''; }} />
            {loading ? <TableSkeleton rows={8} columns={7} /> : <div style={{ overflowX: 'auto' }}><table id="ownersTable" className="display" style={{ width: '100%' }}></table></div>}
          </div>
          {showModal && <OwnerModal owner={editing} currentUser={currentUser} onClose={() => { setShowModal(false); setEditing(null); }} onSaved={() => { setShowModal(false); setEditing(null); mutate(); }} />}
          {viewing && <Owner360Modal owner={viewing} currentUser={currentUser} onClose={() => setViewing(null)} />}
        </>
      );
    }

    // ============== Tenancies (rental management) ==============
    function CollectRentModal({ ten, currentUser, onClose, onSaved }) {
      const due = monthsDue(ten).filter((m) => !(ten.rentLog || []).some((q) => q.month === m));
      const [form, setForm] = useState({ month: due[0] || ymNow(), amount: ten.monthlyRent, method: 'Cash', ref: '' });
      const [saving, setSaving] = useState(false);
      const amt = r2(form.amount);
      const arrearsNow = r2(ten.arrears || 0);
      const err = !/^\d{4}-\d{2}$/.test(form.month) ? 'Pick the month' : !(amt > 0) ? 'Enter the amount'
        : (ten.rentLog || []).some((q) => q.month === form.month) ? form.month + ' is already collected' : '';
      const submit = (e) => {
        e.preventDefault();
        if (err) return;
        setSaving(true);
        gsRun('collectRent', ten.id, form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal modal-txn" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3><i className="fas fa-money-bill-wave"></i> Thu tiền thuê — {ten.propertyRef} · {ten.tenantName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="txn-split">
                  <div className="txn-form">
                    <div className="form-grid">
                      <div className="form-group"><label><i className="fas fa-calendar"></i> Month *</label>
                        <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required /></div>
                      <div className="form-group"><label><i className="fas fa-money-bill"></i> Amount (VNĐ) *</label>
                        <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                      <SearchableDropdown label="Method" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.method} onChange={(v) => setForm({ ...form, method: v })} placeholder="Method…" />
                      <div className="form-group"><label><i className="fas fa-hashtag"></i> Reference</label>
                        <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} /></div>
                    </div>
                  </div>
                  <div className="txn-preview">
                    <div className="txn-h"><i className="fas fa-calculator"></i> Rent Position</div>
                    <div className="txn-line"><span className="f">Monthly rent</span><span className="v">{fmtPKR(ten.monthlyRent)}</span></div>
                    <div className="txn-line"><span className="f">Months unpaid</span><span className="v">{due.length ? due.join(', ') : 'None'}</span></div>
                    <div className={'txn-line' + (arrearsNow > 0 ? ' bad' : '')}><span className="f">Arrears before</span><span className="v">{fmtPKR(arrearsNow)}</span></div>
                    <div className="txn-line total"><span className="f">Arrears after</span><span className="v">{fmtPKR(Math.max(0, r2(arrearsNow - amt)))}</span></div>
                    {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Collect</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    function RenewTenancyModal({ ten, currentUser, cfg, onClose, onSaved }) {
      const [form, setForm] = useState({ newRent: r2(ten.monthlyRent * (1 + (cfg.renewalIncrementPct || 10) / 100)), newEndDate: '', notes: '' });
      const [saving, setSaving] = useState(false);
      const inc = ten.monthlyRent > 0 ? r2((r2(form.newRent) - ten.monthlyRent) / ten.monthlyRent * 100) : 0;
      const err = !(r2(form.newRent) > 0) ? 'New rent is required' : '';
      const submit = (e) => {
        e.preventDefault();
        if (err) return;
        setSaving(true);
        gsRun('renewTenancy', ten.id, form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal modal-txn" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3><i className="fas fa-file-signature"></i> Gia hạn — {ten.propertyRef} · {ten.tenantName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="txn-split">
                  <div className="txn-form">
                    <div className="form-grid">
                      <div className="form-group"><label><i className="fas fa-money-bill-trend-up"></i> New Rent (VNĐ) *</label>
                        <input type="number" min="1" step="any" value={form.newRent} onChange={(e) => setForm({ ...form, newRent: e.target.value })} required /></div>
                      <div className="form-group"><label><i className="fas fa-calendar-day"></i> New End Date</label>
                        <input type="date" value={form.newEndDate} onChange={(e) => setForm({ ...form, newEndDate: e.target.value })} /></div>
                    </div>
                    <div className="form-group"><label><i className="fas fa-align-left"></i> Notes</label>
                      <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}></textarea></div>
                  </div>
                  <div className="txn-preview">
                    <div className="txn-h"><i className="fas fa-calculator"></i> Renewal</div>
                    <div className="txn-line"><span className="f">Current rent</span><span className="v">{fmtPKR(ten.monthlyRent)}</span></div>
                    <div className="txn-line"><span className="f">New rent</span><span className="v">{fmtPKR(r2(form.newRent))}</span></div>
                    <div className="txn-line total"><span className="f">Increment</span><span className="v">{inc}%</span></div>
                    <div className="txn-impact"><i className="fas fa-calendar"></i> Expiry: {ten.endDate || 'open-ended'} → <b>{form.newEndDate || ten.endDate || 'open-ended'}</b></div>
                    {err && <div className="txn-err">{err}</div>}
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving…</> : <><i className="fas fa-save"></i> Renew</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    function EndTenancyModal({ ten, currentUser, onClose, onSaved }) {
      const [form, setForm] = useState({ deductions: '', notes: '' });
      const [saving, setSaving] = useState(false);
      const ded = r2(form.deductions);
      const refund = r2((ten.securityDeposit || 0) - ded);
      const err = ded > (ten.securityDeposit || 0) ? 'Deductions exceed the deposit' : '';
      const submit = (e) => {
        e.preventDefault();
        if (err) return;
        setSaving(true);
        gsRun('endTenancy', ten.id, form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2000, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal modal-txn" style={{ maxWidth: 860 }}>
            <div className="modal-header">
              <h3><i className="fas fa-door-open"></i> Kết thúc hợp đồng thuê — {ten.propertyRef} · {ten.tenantName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="txn-split">
                  <div className="txn-form">
                    <div className="form-grid">
                      <div className="form-group"><label><i className="fas fa-scissors"></i> Khấu trừ (VNĐ)</label>
                        <input type="number" min="0" step="any" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} placeholder="Hư hỏng, hóa đơn chưa thanh toán…" /></div>
                    </div>
                    <div className="form-group"><label><i className="fas fa-align-left"></i> Ghi chú</label>
                      <textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lý do khấu trừ, tình trạng bàn giao…"></textarea></div>
                    {(ten.arrears || 0) > 0 && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> Người thuê còn nợ {fmtPKR(ten.arrears)} — hãy thu hoặc khấu trừ trước khi kết thúc.</div>}
                  </div>
                  <div className="txn-preview">
                    <div className="txn-h"><i className="fas fa-calculator"></i> Quyết toán tiền cọc</div>
                    <div className="txn-line"><span className="f">Tiền cọc</span><span className="v">{fmtPKR(ten.securityDeposit)}</span></div>
                    <div className="txn-line"><span className="f">Khấu trừ</span><span className="v">− {fmtPKR(ded)}</span></div>
                    <div className={'txn-line total' + (refund < 0 ? ' bad' : '')}><span className="f">Hoàn trả người thuê</span><span className="v">{fmtPKR(refund)}</span></div>
                    <div className="txn-impact"><i className="fas fa-arrow-right-arrow-left"></i> Bất động sản → <b>Còn trống</b> (đưa lại lên thị trường)</div>
                    {err && <div className="txn-err">{err}</div>}
                    <div className="form-actions" style={{ marginTop: 14 }}>
                      <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                      <button type="submit" className="btn btn-danger" disabled={saving || !!err}>
                        {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang kết thúc…</> : <><i className="fas fa-door-open"></i> Kết thúc hợp đồng thuê</>}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    function Tenancy360Modal({ ten, currentUser, canEdit, onClose, onChanged }) {
      const [tab, setTab] = useState('over');
      const [issue, setIssue] = useState('');
      const [busy, setBusy] = useState(false);
      const addIssue = () => {
        if (!issue.trim()) return;
        setBusy(true);
        gsRun('addMaintenance', ten.id, { issue }, currentUser).then((r) => {
          setBusy(false);
          if (r && r.success) { setIssue(''); onChanged(); }
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch(() => setBusy(false));
      };
      const fixIssue = (m) => {
        Swal.fire({ icon: 'question', title: 'Đánh dấu đã sửa?', input: 'number', inputLabel: 'Chi phí sửa chữa (VNĐ — đồng bộ vào chi phí bất động sản)', inputValue: m.cost || 0, showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Đã sửa' })
          .then((r) => { if (r.isConfirmed) gsRun('updateMaintenance', ten.id, m.id, { status: 'Fixed', cost: r.value || 0 }, currentUser).then((res) => {
            if (res && res.success) onChanged(); else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' }); }); });
      };
      return (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><i className="fas fa-house-user"></i> Hợp đồng thuê — {ten.propertyRef}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="id-head">
                <div>
                  <div className="nm">{ten.tenantName}</div>
                  <div className="sub"><i className="fas fa-phone"></i> {ten.tenantPhone} · {ten.propertyTitle}</div>
                </div>
                <div className="id-kpis">
                  <div className="id-kpi"><div className="v">{pkrShort(ten.monthlyRent)}</div><div className="l">Tiền thuê / tháng</div></div>
                  <div className="id-kpi"><div className="v">{pkrShort(ten.collected)}</div><div className="l">Đã thu</div></div>
                  <div className="id-kpi"><div className="v" style={{ color: ten.arrears > 0 ? '#ffd9d9' : undefined }}>{pkrShort(ten.arrears)}</div><div className="l">Công nợ</div></div>
                </div>
              </div>
              <Tabs tab={tab} setTab={setTab} tabs={[['over', 'fa-circle-info', 'Tổng quan'], ['rent', 'fa-receipt', 'Lịch sử thu tiền (' + (ten.rentLog || []).length + ')'],
                ['renew', 'fa-file-signature', 'Gia hạn (' + (ten.renewals || []).length + ')'], ['maint', 'fa-screwdriver-wrench', 'Bảo trì (' + (ten.maintenance || []).length + ')']]} />
              {tab === 'over' && (
                <div className="pd-facts">
                  <div className="pd-fact"><div className="k">Bắt đầu</div><div className="v">{ten.startDate}</div></div>
                  <div className="pd-fact"><div className="k">Kết thúc</div><div className="v">{ten.endDate || 'Không thời hạn'}</div></div>
                  <div className="pd-fact"><div className="k">Ngày thu tiền</div><div className="v">Ngày {ten.rentDueDay} hàng tháng</div></div>
                  <div className="pd-fact"><div className="k">Tiền cọc</div><div className="v">{fmtPKR(ten.securityDeposit)}</div></div>
                  <div className="pd-fact"><div className="k">Trạng thái</div><div className="v"><Badge s={ten.status} /></div></div>
                  <div className="pd-fact"><div className="k">Nhân viên</div><div className="v">{ten.agent || '—'}</div></div>
                  {ten.depositRefund && <div className="pd-fact"><div className="k">Hoàn cọc</div><div className="v">{fmtPKR(ten.depositRefund.amount)} (−{fmtPKR(ten.depositRefund.deductions)} khấu trừ)</div></div>}
                </div>
              )}
              {tab === 'rent' && ((ten.rentLog || []).length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa thu tiền thuê.</p>
                : (ten.rentLog || []).slice().reverse().map((q, i) => (
                  <div key={i} className="tl-item"><i className="fas fa-receipt"></i>
                    <div style={{ flex: 1 }}><div className="w"><b>{q.month}</b> — {fmtPKR(q.amount)}</div><div className="m">{viEnum(q.method)}{q.ref ? ' · ' + q.ref : ''} · {fmtDate(q.paidAt)} · bởi {q.receivedBy}</div></div>
                  </div>)))}
              {tab === 'renew' && ((ten.renewals || []).length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có lần gia hạn nào.</p>
                : (ten.renewals || []).slice().reverse().map((q, i) => (
                  <div key={i} className="tl-item"><i className="fas fa-file-signature"></i>
                    <div style={{ flex: 1 }}><div className="w">{fmtPKR(q.oldRent)} → <b>{fmtPKR(q.newRent)}</b></div><div className="m">{fmtDate(q.date)} · hạn mới {q.newEndDate || 'không thời hạn'} · bởi {q.byUser}{q.notes ? ' · ' + q.notes : ''}</div></div>
                  </div>)))}
              {tab === 'maint' && (
                <>
                  {canEdit && ten.status === 'Active' && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input className="filter-input" style={{ flex: 1 }} value={issue} placeholder="Ghi nhận sự cố — ví dụ: Máy bơm nước không hoạt động" onChange={(e) => setIssue(e.target.value)} />
                      <button className="btn btn-primary btn-sm" disabled={busy || !issue.trim()} onClick={addIssue}>
                        <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-plus')}></i> Ghi nhận
                      </button>
                    </div>
                  )}
                  {(ten.maintenance || []).length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa ghi nhận bảo trì.</p>
                    : (ten.maintenance || []).slice().reverse().map((m) => (
                      <div key={m.id} className="tl-item"><i className="fas fa-screwdriver-wrench"></i>
                        <div style={{ flex: 1 }}><div className="w">{m.issue}</div><div className="m">{m.date}{m.cost ? ' · chi phí ' + fmtPKR(m.cost) : ''}{m.fixedAt ? ' · đã sửa ' + fmtDate(m.fixedAt) : ''}</div></div>
                        <Badge s={m.status} />
                        {canEdit && m.status === 'Open' && <button className="action-icon view-icon" title="Đánh dấu đã sửa" onClick={() => fixIssue(m)}><i className="fas fa-check"></i></button>}
                      </div>))}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    function TenanciesView({ currentUser, role, perms, initialSearch }) {
      const { data: res, error, mutate } = useSWR('tenancies:all', () => gsRun('getTenancies', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const lookups = useLookups(currentUser);
      const all = scopeAll(role);
      const cfg = useAppCfg(currentUser);
      const canEdit = can(perms, 'tenancies', 'e'), canDel = can(perms, 'tenancies', 'd');
      const [modal, setModal] = useState(null); // {type:'collect'|'renew'|'end'|'view', ten}
      const [viewingLead, setViewingLead] = useState(null);
      const [stage, setStage] = useState('Active');
      const [filters, setFilters] = useState({ search: initialSearch || '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Load failed', text: String((error && error.message) || error) }); }, [error]);

      const counts = useMemo(() => { const o = {}; (rows || []).forEach((t) => { o[t.status] = (o[t.status] || 0) + 1; }); return o; }, [rows]);
      const visible = useMemo(() => (stage ? (rows || []).filter((t) => t.status === stage) : (rows || [])), [rows, stage]);
      const mm = ymNow();
      const kpi = useMemo(() => { const r = (rows || []).filter((t) => t.status === 'Active'); return [
        [r.length, 'Hợp đồng thuê đang hoạt động', 'fa-house-user', 'bg-navy'],
        [pkrShort(r.reduce((s, t) => s + (t.monthlyRent || 0), 0)), 'Tổng tiền thuê / tháng', 'fa-sack-dollar', 'bg-info'],
        [pkrShort((rows || []).reduce((s, t) => s + (t.rentLog || []).filter((q) => q.month === mm).reduce((a, q) => a + q.amount, 0), 0)), 'Đã thu trong tháng', 'fa-circle-check', 'bg-success'],
        [r.filter((t) => t.arrears > 0).length, 'Đang có công nợ', 'fa-triangle-exclamation', 'bg-danger']
      ]; }, [rows, mm]);

      useEffect(() => {
        const dt = () => tableRef.current;
        setPageActions([
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() }
        ]); // tenancies are BORN from completed Rent deals — no manual add/import by design
        return () => setPageActions([]);
      }, []);

      const refetch = () => { mutate(); ['props:all', 'dash:stats'].forEach((k) => swrMutate(k)); };
      const onAction = (action, t) => {
        if (action === 'view') setModal({ type: 'view', ten: t });
        else if (action === 'collect') setModal({ type: 'collect', ten: t });
        else if (action === 'renew') setModal({ type: 'renew', ten: t });
        else if (action === 'end') setModal({ type: 'end', ten: t });
        else if (action === 'wa') waOpen(t.tenantPhone, 'Xin chào ' + t.tenantName + ', chúng tôi liên hệ về hợp đồng thuê ' + (t.propertyRef || 'của bạn') + '.');
      };

      const expSoon = (t) => t.endDate && t.status === 'Active' && (new Date(t.endDate) - new Date()) / 864e5 <= 30 && (new Date(t.endDate) - new Date()) / 864e5 >= 0;
      const tableRef = useDataTable('tenTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'propertyRef', title: 'Bất động sản', render: (d, t, x) => '<span class="prop-ref">' + esc(d || '—') + '</span><br><small style="color:#789">' + esc(String(x.propertyTitle || '').substr(0, 30)) + '</small>' },
          { data: 'tenantName', title: 'Người thuê', render: (d, t, x) => '<strong>' + esc(d) + '</strong><br><small style="color:#789">' + esc(x.tenantPhone || '') + '</small>' },
          { data: 'monthlyRent', title: 'Tiền thuê', render: (d, t, x) => t === 'display' ? '<strong>' + esc(pkrShort(d)) + '</strong><small style="color:#789">/tháng · đến hạn ngày ' + esc(String(x.rentDueDay)) + '</small>' : d },
          { data: null, title: 'Thanh toán gần nhất', orderable: false, render: (d, t, x) => { const last = (x.rentLog || []).slice(-1)[0]; return last ? esc(last.month) : '<span style="color:#999">Chưa thanh toán</span>'; } },
          { data: 'arrears', title: 'Công nợ', render: (d, t) => t === 'display' ? (d > 0 ? '<span style="color:#c0392b;font-weight:700">' + esc(pkrShort(d)) + '</span>' : '<span style="color:#2e7d32">Không nợ</span>') : d },
          { data: 'endDate', title: 'Ngày kết thúc', render: (d, t, x) => t === 'display' ? (d ? esc(d) + (expSoon(x) ? ' ' + badge('Overdue').replace('Overdue', '≤30 ngày') : '') : 'Không thời hạn') : (d || '') },
          { data: 'status', title: 'Trạng thái', render: (d, t) => t === 'display' ? badge(d) : d },
          { data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-5', width: '174px', render: (d, t, x) => `<div class="table-actions slots-5">
            ${canEdit && x.status === 'Active' ? '<button class="action-icon assign-icon" data-action="collect" title="Collect rent"><i class="fas fa-money-bill-wave"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon view-icon" data-action="view" title="Tenancy 360"><i class="fas fa-eye"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo người thuê"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${all && x.status === 'Active' ? '<button class="action-icon edit-icon" data-action="renew" title="Renew contract"><i class="fas fa-file-signature"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${all && x.status === 'Active' ? '<button class="action-icon delete-icon" data-action="end" title="End tenancy"><i class="fas fa-door-open"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}</div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
        order: []
      }), onAction, [canEdit, canDel, all], (record) => setViewingLead(record));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]);

      return (
        <>
          <KpiRow items={kpi} />
          <Pipeline stages={ENUMS.tenancyStatus} counts={counts} active={stage} onPick={setStage} total={(rows || []).length} />
          <div className="filters-section">
            <div className="filters-header"><h3><i className="fas fa-filter"></i> Filters</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '' }); setStage(''); }}><i className="fas fa-rotate-left"></i> Clear</button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Search</label>
                <input className="filter-input" value={filters.search} placeholder="Tenant, property ref…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="data-section">
            {loading ? <TableSkeleton rows={6} columns={8} /> : <div style={{ overflowX: 'auto' }}><table id="tenTable" className="display" style={{ width: '100%' }}></table></div>}
            {!loading && (rows || []).length === 0 && <p style={{ color: '#789', textAlign: 'center', padding: 16 }}>Chưa có hợp đồng thuê — khi hoàn thành giao dịch thuê, hệ thống sẽ tự động tạo hợp đồng.</p>}
          </div>
          {modal && modal.type === 'collect' && <CollectRentModal ten={modal.ten} currentUser={currentUser} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
          {modal && modal.type === 'renew' && <RenewTenancyModal ten={modal.ten} currentUser={currentUser} cfg={cfg} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
          {modal && modal.type === 'end' && <EndTenancyModal ten={modal.ten} currentUser={currentUser} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
          {modal && modal.type === 'view' && <Tenancy360Modal ten={(visible.find((t) => t.id === modal.ten.id)) || modal.ten} currentUser={currentUser} canEdit={canEdit}
            onClose={() => setModal(null)} onChanged={() => mutate()} />}
          {viewingLead && <CrossModuleLeadModal source={viewingLead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={() => setViewingLead(null)} />}
        </>
      );
    }

    // ============== Viewing feedback (Complete flow) ==============
    function FeedbackModal({ appt, currentUser, onClose, onSaved }) {
      const [form, setForm] = useState({ interestLevel: '', feedback: '' });
      const [saving, setSaving] = useState(false);
      const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        gsRun('completeAppointment', appt.id, form, currentUser).then((r) => {
          setSaving(false);
          if (!r || !r.success) return Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
          onSaved();
          if (r.suggestNegotiating && r.leadId) { // Hot -> offer the pipeline move, never force it
            Swal.fire({ icon: 'question', title: 'Khách hàng rất quan tâm!', text: 'Chuyển ' + (appt.leadName || 'khách hàng') + ' sang Đang thương lượng?', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Chuyển sang thương lượng' })
              .then((c) => { if (c.isConfirmed) gsRun('updateLead', { id: r.leadId, status: 'Negotiating' }, currentUser).then(() => swrMutate('leads:all')); });
          } else {
            Swal.fire({ icon: 'success', title: 'Đã hoàn thành lịch xem!', timer: 1600, showConfirmButton: false });
          }
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3><i className="fas fa-clipboard-check"></i> Hoàn thành lịch xem — {appt.leadName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <SearchableDropdown label="Mức độ quan tâm" icon="fas fa-temperature-half" options={opts(ENUMS.interestLevel)}
                  value={form.interestLevel} onChange={(v) => setForm({ ...form, interestLevel: v })} placeholder="Nóng / Ấm / Lạnh" />
                <div className="form-group">
                  <label><i className="fas fa-comment-dots"></i> Kết quả buổi xem thế nào?</label>
                  <textarea rows="3" value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} placeholder="Điểm chưa phù hợp, điều khách thích, bước tiếp theo…"></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-check"></i> Hoàn thành lịch xem</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Offers ==============
    function OfferModal({ lead, currentUser, onClose, onSaved }) {
      const [form, setForm] = useState({ amount: '', by: 'Buyer', notes: '' });
      const [saving, setSaving] = useState(false);
      const submit = (e) => {
        e.preventDefault();
        setSaving(true);
        gsRun('addOffer', lead.id, form, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1600, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch(() => setSaving(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3><i className="fas fa-scale-balanced"></i> Ghi nhận chào giá — {lead.fullName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group"><label><i className="fas fa-money-bill"></i> Số tiền (VNĐ) *</label>
                    <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus /></div>
                  <SearchableDropdown label="Bên đưa giá" icon="fas fa-user" options={opts(ENUMS.offerBy)} value={form.by} onChange={(v) => setForm({ ...form, by: v })} placeholder="Người mua / Người bán" />
                </div>
                <div className="form-group"><label><i className="fas fa-align-left"></i> Ghi chú</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ví dụ: Trao đổi miệng sau lần xem thứ hai…" /></div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Ghi nhận chào giá</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      );
    }

    // ============== Lead 360 — the record hub ==============
    function Lead360Modal({ lead, currentUser, role, perms, lookups, onClose, onConvertDeal, onAddOffer, onConvertProperty }) {
      const { data: fRes } = useSWR('fus:all', () => gsRun('getFollowUps', currentUser), SWR_LIVE);
      const { data: aRes } = useSWR('appts:all', () => gsRun('getAppointments', currentUser), SWR_LIVE);
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: dRes } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const fus = (fRes && fRes.success ? fRes.data : []).filter((f) => f.leadId == lead.id);
      const appts = (aRes && aRes.success ? aRes.data : []).filter((a) => a.leadId == lead.id);
      const props = pRes && pRes.success ? pRes.data : [];
      const deals = (dRes && dRes.success ? dRes.data : []).filter((x) => x.leadId == lead.id);
      const offers = lead.offers || [];
      const canEdit = can(perms, 'leads', 'e');
      const [tab, setTab] = useState('over');
      const matches = useMemo(() => matchProps(lead, props, lookups.locations || []), [lead, props, lookups.locations]);
      const daysOpen = Math.max(0, Math.round((Date.now() - new Date(lead.created).getTime()) / 864e5));
      const accepted = offers.find((o) => o.status === 'Accepted');

      const setOffer = (o, status) => {
        const doIt = () => gsRun('updateOffer', lead.id, o.id, status, currentUser).then((r) => {
          if (!r || !r.success) return Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
          swrMutate('leads:all');
          if (status === 'Accepted' && onConvertDeal) {
            Swal.fire({ icon: 'question', title: 'Đã chấp nhận chào giá!', text: 'Mở giao dịch với giá ' + fmtPKR(o.amount) + '?', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Chuyển thành giao dịch' })
              .then((c) => { if (c.isConfirmed) { onClose(); onConvertDeal(lead, o.amount); } });
          }
        });
        if (status === 'Accepted') Swal.fire({ icon: 'question', title: 'Chấp nhận ' + fmtPKR(o.amount) + '?', text: 'Các chào giá đang mở còn lại sẽ chuyển sang Đã từ chối.', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Chấp nhận' }).then((c) => { if (c.isConfirmed) doIt(); });
        else doIt();
      };

      const timeline = useMemo(() => {
        const items = [{ t: lead.created, ic: 'fa-user-plus', w: 'Đã tạo khách hàng (' + viEnum(lead.source || '—') + ')' }];
        fus.forEach((f) => items.push({ t: f.completedAt || f.created, ic: 'fa-bell', w: '[' + viEnum(f.type) + '] ' + (f.notes || 'Chăm sóc') + (f.status !== 'Completed' ? ' — ' + viEnum(f.status) : '') }));
        appts.forEach((a) => items.push({ t: a.scheduledAt, ic: 'fa-calendar-check', w: 'Lịch xem ' + (a.propertyRef || '') + ' — ' + viEnum(a.status) + (a.interestLevel ? ' [' + viEnum(a.interestLevel) + ']' : '') }));
        offers.forEach((o) => items.push({ t: o.date, ic: 'fa-scale-balanced', w: 'Chào giá ' + fmtPKR(o.amount) + ' bởi ' + viEnum(o.by) + ' — ' + viEnum(o.status) }));
        deals.forEach((x) => items.push({ t: x.created, ic: 'fa-handshake', w: 'Giao dịch #' + x.id + ' mở với giá ' + fmtPKR(x.dealAmount) + ' — ' + viEnum(x.status) }));
        return items.filter((x) => x.t).sort((a, b) => new Date(b.t) - new Date(a.t));
      }, [lead, fus, appts, deals]);

      return (
        <div className="modal-overlay">
          <div className="modal modal-lead360">
            <div className="modal-header">
              <h3><i className="fas fa-id-card-clip"></i> Hồ sơ khách hàng 360 — {lead.fullName}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="id-head id-head-lead360">
                <div className="lead360-identity">
                  <div className="lead360-avatar"><i className="fas fa-user-tie"></i></div>
                  <div className="lead360-person">
                    <div className="nm">{lead.fullName} <Badge s={lead.status} /></div>
                    <div className="sub">
                      <i className="fas fa-phone"></i> {lead.phone}
                      <button className="action-icon wa-icon" style={{ marginLeft: 6 }} title="Nhắn Zalo" onClick={() => waOpen(lead.phone)}><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
                      {lead.email ? ' · ' + lead.email : ''} · {viEnum(lead.source)} · {viEnum(lead.interestType)}
                    </div>
                  </div>
                </div>
                <div className="id-kpis">
                  <div className="id-kpi"><i className="fas fa-hourglass-half"></i><div className="v">{daysOpen}</div><div className="l">Số ngày đang mở</div></div>
                  <div className="id-kpi"><i className="fas fa-bell"></i><div className="v">{fus.length}</div><div className="l">Lịch chăm sóc</div></div>
                  <div className="id-kpi"><i className="fas fa-calendar-check"></i><div className="v">{appts.length}</div><div className="l">Lịch xem</div></div>
                  <div className="id-kpi"><i className="fas fa-wallet"></i><div className="v">{(lead.budgetMin || lead.budgetMax) ? pkrShort(lead.budgetMax || lead.budgetMin) : '—'}</div><div className="l">Ngân sách</div></div>
                </div>
              </div>
              <Tabs tab={tab} setTab={setTab} tabs={[
                ['over', 'fa-circle-info', 'Tổng quan'], ['tl', 'fa-stream', 'Dòng thời gian'],
                ['fus', 'fa-bell', 'Chăm sóc (' + fus.length + ')'], ['appts', 'fa-calendar-check', 'Lịch xem (' + appts.length + ')'],
                ['offers', 'fa-scale-balanced', 'Chào giá (' + offers.length + ')'], ['match', 'fa-wand-magic-sparkles', 'Bất động sản phù hợp (' + matches.length + ')'],
                ['deal', 'fa-handshake', 'Giao dịch (' + deals.length + ')']]} />
              {tab === 'over' && (
                <>
                  <div className="pd-facts">
                    <div className="pd-fact"><div className="k">Nhu cầu</div><div className="v">{viEnum(lead.interestType)}</div></div>
                    <div className="pd-fact"><div className="k">Ngân sách</div><div className="v">{(lead.budgetMin || lead.budgetMax) ? pkrShort(lead.budgetMin || 0) + ' – ' + pkrShort(lead.budgetMax || 0) : '—'}</div></div>
                    <div className="pd-fact"><div className="k">Bất động sản</div><div className="v">{lead.propertyRef || '—'}</div></div>
                    <div className="pd-fact"><div className="k">Khu vực mong muốn</div><div className="v">{lead.preferredLocationPath || '—'}</div></div>
                    <div className="pd-fact"><div className="k">Nhân viên</div><div className="v">{lead.assignedAgent || 'Chưa phân công'}</div></div>
                    <div className="pd-fact"><div className="k">Ngày tạo</div><div className="v">{fmtDate(lead.created)}</div></div>
                    {lead.status === 'Lost' && <div className="pd-fact"><div className="k">Lý do thất bại</div><div className="v" style={{ color: '#c0392b' }}>{lead.lostReason || '—'}</div></div>}
                  </div>
                  {lead.message && <p style={{ color: '#556', fontSize: 13.5, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{lead.message}</p>}
                  {['Sell', 'Rent Out'].indexOf(lead.interestType) !== -1 && canEdit && onConvertProperty && (
                    <button className="btn btn-primary" onClick={() => { onClose(); onConvertProperty(lead); }}>
                      <i className="fas fa-building-circle-arrow-right"></i> Chuyển thành tin đăng bất động sản
                    </button>
                  )}
                </>
              )}
              {tab === 'tl' && (timeline.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có hoạt động.</p>
                : timeline.map((x, i) => <div key={i} className="tl-item"><i className={'fas ' + x.ic}></i><div style={{ flex: 1 }}><div className="w">{x.w}</div><div className="m">{fmtDT(x.t)}</div></div></div>))}
              {tab === 'fus' && (fus.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có lịch chăm sóc.</p>
                : fus.map((f) => <div key={f.id} className="tl-item"><i className="fas fa-bell"></i><div style={{ flex: 1 }}><div className="w">[{viEnum(f.type)}] {f.notes || '—'}</div><div className="m">{f.dueAt ? 'đến hạn ' + fmtDT(f.dueAt) : 'đã ghi nhận'} · {f.assignedAgent}</div></div><Badge s={f.status} /></div>))}
              {tab === 'appts' && (appts.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có lịch xem.</p>
                : appts.map((a) => <div key={a.id} className="tl-item"><i className="fas fa-calendar-check"></i><div style={{ flex: 1 }}><div className="w">{a.propertyRef} — {a.propertyTitle}</div><div className="m">{fmtDT(a.scheduledAt)} · {a.agent}{a.feedback ? ' · "' + a.feedback + '"' : ''}</div></div>{a.interestLevel && <Badge s={a.interestLevel} />} <Badge s={a.status} /></div>))}
              {tab === 'offers' && (
                <>
                  {canEdit && onAddOffer && !accepted && ['Won', 'Lost'].indexOf(lead.status) === -1 && (
                    <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={() => { onClose(); onAddOffer(lead); }}><i className="fas fa-plus"></i> Ghi nhận chào giá</button>
                  )}
                  {offers.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có chào giá — bắt đầu thương lượng tại đây.</p>
                    : offers.slice().reverse().map((o) => (
                      <div key={o.id} className="tl-item"><i className="fas fa-scale-balanced"></i>
                        <div style={{ flex: 1 }}><div className="w"><b>{fmtPKR(o.amount)}</b> bởi {viEnum(o.by)}</div><div className="m">{fmtDT(o.date)} · {o.addedBy}{o.notes ? ' · ' + o.notes : ''}</div></div>
                        <Badge s={o.status} />
                        {canEdit && ['Open', 'Countered'].indexOf(o.status) !== -1 && (
                          <>
                            <button className="action-icon view-icon" title="Chấp nhận" onClick={() => setOffer(o, 'Accepted')}><i className="fas fa-check"></i></button>
                            <button className="action-icon edit-icon" title="Trả giá" onClick={() => setOffer(o, 'Countered')}><i className="fas fa-arrows-rotate"></i></button>
                            <button className="action-icon delete-icon" title="Từ chối" onClick={() => setOffer(o, 'Rejected')}><i className="fas fa-xmark"></i></button>
                          </>
                        )}
                      </div>))}
                  {accepted && canEdit && onConvertDeal && deals.length === 0 && (
                    <button className="btn btn-primary" onClick={() => { onClose(); onConvertDeal(lead, accepted.amount); }}>
                      <i className="fas fa-handshake"></i> Chuyển thành giao dịch với giá {fmtPKR(accepted.amount)}
                    </button>
                  )}
                </>
              )}
              {tab === 'match' && (matches.length === 0 ? <p style={{ color: '#789', padding: 12 }}>Chưa có bất động sản đang hoạt động phù hợp khu vực, loại hình và ngân sách.</p>
                : matches.map(({ p, s }) => (
                  <div key={p.id} className="tl-item"><i className="fas fa-building"></i>
                    <div style={{ flex: 1 }}><div className="w"><b>{p.referenceCode}</b> {p.title}</div><div className="m">{pkrShort(p.price)} · {p.locationPath} · điểm phù hợp {s}/6</div></div>
                    <Badge s={p.status} />
                    <button className="action-icon wa-icon" title="Chia sẻ qua Zalo" onClick={() => waOpen(lead.phone, 'Xin chào ' + lead.fullName + '! Gửi bạn thông tin bất động sản phù hợp: ' + p.title + ' (' + p.referenceCode + ') — Giá: ' + pkrShort(p.price))}><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
                  </div>)))}
              {tab === 'deal' && (
                <>
                  {deals.length === 0 ? (
                    <>
                      <p style={{ color: '#789', padding: 12 }}>Chưa có giao dịch{accepted ? ' — đã có chào giá được chấp nhận, hãy chốt giao dịch!' : ''}.</p>
                      {canEdit && onConvertDeal && ['Negotiating', 'Won'].indexOf(lead.status) !== -1 && (
                        <button className="btn btn-primary" onClick={() => { onClose(); onConvertDeal(lead, accepted ? accepted.amount : ''); }}>
                          <i className="fas fa-handshake"></i> Chuyển thành giao dịch
                        </button>
                      )}
                    </>
                  ) : deals.map((x) => (
                    <div key={x.id} className="tl-item"><i className="fas fa-handshake"></i>
                      <div style={{ flex: 1 }}><div className="w"><b>{x.propertyRef}</b> — {fmtPKR(x.dealAmount)}</div>
                        <div className="m">đã thanh toán {fmtPKR(x.paid)} · còn lại {fmtPKR(x.balance)} · hoa hồng {fmtPKR(x.commissionAmt)} · {x.agent}</div></div>
                      <Badge s={x.status} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ============== AI Assistant — chat over the caller's own-scope CRM data (key stays server-side) ==============
    const mdLite = (s) => esc(s) // minimal markdown: bold + bullets + line breaks, everything else stays escaped text
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/^#{1,3} (.*)$/gm, '<b>$1</b>')
      .replace(/^[-*] /gm, '• ')
      .replace(/\n/g, '<br>');

    function AiChatView({ currentUser, role }) {
      const { data: cfgRes } = useSWR('ai:cfg', () => gsRun('getAiConfig', currentUser), SWR_LIVE);
      const cfg = cfgRes && cfgRes.success ? cfgRes : null;
      const [msgs, setMsgs] = useState([]);
      const [input, setInput] = useState('');
      const [busy, setBusy] = useState(false);
      const endRef = useRef(null), wrapRef = useRef(null), taRef = useRef(null);
      // fill the viewport exactly — measured, so no dead strip is left under the composer whatever sits above
      useEffect(() => {
        const fit = () => { const el = wrapRef.current; if (el) el.style.height = Math.max(380, window.innerHeight - el.getBoundingClientRect().top - 16) + 'px'; };
        fit(); const raf = requestAnimationFrame(fit);
        window.addEventListener('resize', fit);
        return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); };
      }, []);
      useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);
      useEffect(() => {
        setPageActions(msgs.length ? [{ icon: 'fa-broom', label: 'Xóa cuộc trò chuyện', onClick: () => setMsgs([]) }] : []);
        return () => setPageActions([]);
      }, [msgs.length]);

      const grow = () => { const t = taRef.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; } };
      const send = (text) => {
        const q = String(text || input).trim();
        if (!q || busy) return;
        const hist = [...msgs, { role: 'user', content: q }];
        setMsgs(hist); setInput(''); setBusy(true);
        if (taRef.current) taRef.current.style.height = 'auto';
        gsRun('aiChat', hist.map(({ role: r0, content }) => ({ role: r0, content })), currentUser).then((r) => {
          setBusy(false);
          setMsgs(r && r.success
            ? [...hist, { role: 'assistant', content: r.reply }]
            : [...hist, { role: 'assistant', content: (r && r.message) || 'Thao tác thất bại — vui lòng thử lại.', err: true }]);
        }).catch((e) => { setBusy(false); setMsgs([...hist, { role: 'assistant', content: String((e && e.message) || e), err: true }]); });
      };

      const STARTERS = scopeAll(role)
        ? [['Lịch chăm sóc nào đang quá hạn và do ai phụ trách?', 'fa-bell'], ['Tóm tắt giao dịch và hoa hồng tháng này', 'fa-sack-dollar'],
           ['Người thuê nào đang có công nợ?', 'fa-house-circle-exclamation'], ['Tin đăng nào đã quá 90 ngày chưa phát sinh giao dịch?', 'fa-hourglass-half']]
        : [['Hôm nay tôi nên ưu tiên công việc nào?', 'fa-list-check'], ['Khách hàng nào của tôi đang có chào giá mở?', 'fa-scale-balanced'],
           ['Lịch xem của tôi trong tuần này?', 'fa-calendar-check'], ['Người thuê nào của tôi đang nợ tiền thuê?', 'fa-house-circle-exclamation']];

      return (
        <div className="ai-wrap" ref={wrapRef}>
          <div className="ai-scroll">
            <div className="ai-thread">
              {cfg && !cfg.hasKey && (
                <div className="ai-note">
                  <i className="fas fa-key"></i> Chưa thiết lập khóa API OpenAI{role === 'Admin' ? ' — hãy thêm khóa trong Cài đặt → Trợ lý AI.' : ' — hãy liên hệ quản trị viên để thiết lập.'}
                </div>
              )}
              {msgs.length === 0 && (
                <div className="ai-hello">
                  <h2>Xin chào, {currentUser}</h2>
                  <p>Hãy hỏi bất kỳ điều gì về dữ liệu CRM {scopeAll(role) ? 'của công ty' : 'được phân quyền cho bạn'} — khách hàng, giao dịch, tiền thuê và tin đăng.{cfg && cfg.model ? ' · ' + cfg.model : ''}</p>
                  <div className="ai-cards">
                    {STARTERS.map(([s, ic], i) => <button key={i} className="ai-card" onClick={() => send(s)}>{s}<i className={'fas ' + ic}></i></button>)}
                  </div>
                </div>
              )}
              {msgs.map((m, i) => (m.role === 'user' ? (
                <div className="ai-turn me" key={i}><div className="ai-said">{m.content}</div></div>
              ) : (
                <div className="ai-turn" key={i}>
                  <div className="ai-av"><i className="fas fa-wand-magic-sparkles"></i></div>
                  <div className={'ai-reply' + (m.err ? ' err' : '')} dangerouslySetInnerHTML={{ __html: mdLite(m.content) }}></div>
                </div>
              )))}
              {busy && (
                <div className="ai-turn">
                  <div className="ai-av"><i className="fas fa-wand-magic-sparkles"></i></div>
                  <div className="ai-typing"><span></span><span></span><span></span></div>
                </div>
              )}
              <div ref={endRef}></div>
            </div>
          </div>
          <div className="ai-composer-wrap">
            <div className="ai-composer">
              <textarea ref={taRef} rows={1} value={input} placeholder="Hỏi về dữ liệu của bạn…" disabled={busy}
                        onChange={(e) => { setInput(e.target.value); grow(); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
              <button className="ai-send" onClick={() => send()} disabled={busy || !input.trim()} title="Gửi">
                <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-paper-plane')}></i>
              </button>
            </div>
            <div className="ai-foot">Trợ lý RS đọc dữ liệu CRM theo phạm vi quyền của bạn · hãy kiểm tra thông tin quan trọng trước khi thực hiện</div>
          </div>
        </div>
      );
    }

    // ============== Agreements — professional A4 documents from deals & tenancies ==============
    // ONE html source (server buildAgreement) drives the preview iframe, browser print AND the PDF download
    function A4DocModal({ doc, docType, recId, currentUser, autoPrint, onClose }) {
      const frameRef = useRef(null);
      const [busy, setBusy] = useState(false);
      const printed = useRef(false);
      const doPrint = () => { const w = frameRef.current && frameRef.current.contentWindow; if (w) { w.focus(); w.print(); } };
      const doPdf = () => {
        setBusy(true);
        gsRun('agreementPdf', docType, recId, currentUser).then((r) => {
          setBusy(false);
          if (r && r.success) { const a = document.createElement('a'); a.href = 'data:application/pdf;base64,' + r.base64; a.download = r.filename; a.click(); }
          else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch(() => setBusy(false));
      };
      return (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 920 }}>
            <div className="modal-header">
              <h3><i className="fas fa-file-contract"></i> {doc.title}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={doPrint}><i className="fas fa-print"></i> In văn bản (A4)</button>
                <button className="btn btn-secondary btn-sm" onClick={doPdf} disabled={busy}>
                  <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-file-pdf')}></i> Tải tệp PDF
                </button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#789', alignSelf: 'center' }}><i className="fas fa-circle-info"></i> Định dạng chuẩn A4 — nên chọn lề "Tối thiểu / None" khi in để vừa vặn nhất</span>
              </div>
              <iframe ref={frameRef} srcDoc={doc.html} className="a4-frame" title="document"
                      onLoad={() => { if (autoPrint && !printed.current) { printed.current = true; setTimeout(doPrint, 400); } }}></iframe>
            </div>
          </div>
        </div>
      );
    }

    // eligible records for one document type — 80% wide, View prints that record's document
    function EligibleDocsModal({ meta, records, busyId, onView, onClose }) {
      const ten = meta.src === 'ten';
      return (
        <div className="modal-overlay">
          <div className="modal modal-80">
            <div className="modal-header">
              <h3><i className={'fas ' + meta.icon}></i> {meta.label} — {records.length} hồ sơ phù hợp</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12.5, color: '#789', margin: '0 0 12px' }}>
                <i className="fas fa-circle-info"></i> {meta.hint}. Nhấp <b>Xem</b> trên bất kỳ dòng nào — tài liệu A4 sẽ mở ra để xem và in.
              </p>
              {records.length === 0 ? (
                <p className="dash-empty"><i className="fas fa-file-circle-xmark"></i>Chưa có hồ sơ phù hợp để tạo tài liệu này</p>
              ) : (
                <div className="about-table-wrapper">
                  <table className="about-roles-table">
                    <thead>
                      <tr>
                        <th>#</th><th>Bất động sản</th><th>{ten ? 'Người thuê' : 'Người mua / Khách hàng'}</th>
                        <th>{ten ? 'Tiền thuê / tháng' : 'Giá trị giao dịch'}</th>
                        <th>{ten ? 'Đã thu' : 'Đã nộp'}</th>
                        <th>{ten ? 'Công nợ' : 'Còn lại'}</th>
                        <th>Trạng thái</th><th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, i) => {
                        const outstanding = (ten ? r.arrears : r.balance) || 0;
                        return (
                          <tr key={r.id}>
                            <td>{i + 1}</td>
                            <td style={{ textAlign: 'left' }}>
                              <b>{r.propertyRef || '#' + r.propertyId}</b>
                              <span className="elig-row-sub">{r.propertyTitle || '—'}</span>
                            </td>
                            <td style={{ textAlign: 'left' }}>
                              {(ten ? r.tenantName : r.buyerName) || '—'}
                              <span className="elig-row-sub">{(ten ? r.tenantPhone : r.buyerPhone) || '—'}</span>
                            </td>
                            <td>{pkrShort(ten ? r.monthlyRent : r.dealAmount)}</td>
                            <td>{pkrShort(ten ? (r.collected || 0) : (r.paid || 0))}</td>
                            <td style={{ color: outstanding > 0 ? '#c62828' : '#2e7d32', fontWeight: 700 }}>{pkrShort(outstanding)}</td>
                            <td><Badge s={r.status} /></td>
                            <td>
                              <button className="btn btn-primary btn-sm" disabled={!!busyId} onClick={() => onView(r)}>
                                <i className={'fas ' + (busyId === r.id ? 'fa-spinner fa-spin' : 'fa-eye')}></i> {busyId === r.id ? 'Đang tải…' : 'Xem'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    function AgreementsView({ currentUser, role, perms }) {
      const { data: dRes } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const { data: tRes } = useSWR('tenancies:all', () => gsRun('getTenancies', currentUser), SWR_LIVE);
      const deals = dRes && dRes.success ? dRes.data : [];
      const tens = tRes && tRes.success ? tRes.data : [];
      const [docType, setDocType] = useState('rental');
      const [recId, setRecId] = useState('');
      const [doc, setDoc] = useState(null);
      const [busy, setBusy] = useState(false);
      const [listOpen, setListOpen] = useState(false); // eligible-records popup
      const [rowBusy, setRowBusy] = useState(0);
      const [autoPrint, setAutoPrint] = useState(false);
      useEffect(() => { setPageActions([]); return () => setPageActions([]); }, []); // generator view — no list toolbar

      const DOC_TYPES = [
        { value: 'rental',      label: 'Hợp đồng thuê bất động sản', icon: 'fa-file-signature',   src: 'ten',  hint: 'Hợp đồng chủ nhà – người thuê gồm điều khoản thương mại, tiền cọc và 6 điều khoản chuẩn' },
        { value: 'sale',        label: 'Hợp đồng đặt cọc mua bán',    icon: 'fa-file-contract',    src: 'deal', hint: 'Hợp đồng đặt cọc chuyển nhượng — các bên, giá trị, tiến độ thanh toán và điều khoản' },
        { value: 'receipt',     label: 'Phiếu thu tiền giao dịch',    icon: 'fa-receipt',          src: 'deal', hint: 'Xác nhận toàn bộ các đợt thanh toán đã thu của giao dịch và số dư còn lại' },
        { value: 'rentreceipt', label: 'Phiếu thu & Bảng kê tiền thuê', icon: 'fa-file-invoice',     src: 'ten',  hint: 'Bảng kê các kỳ tiền thuê đã thu, số phải thu đến hiện tại và công nợ' },
        { value: 'dues',        label: 'Thông báo số dư & Công nợ',  icon: 'fa-triangle-exclamation', src: 'deal', hint: 'Bảng tổng hợp công nợ giao dịch với số tiền còn phải thanh toán nổi bật' },
        { value: 'invoice',     label: 'Hóa đơn hoa hồng môi giới', icon: 'fa-file-invoice-dollar', src: 'deal', hint: 'Hóa đơn phí môi giới dịch vụ (mã HDHH) cho giao dịch hoàn tất' }
      ];
      const meta = DOC_TYPES.find((x) => x.value === docType) || DOC_TYPES[0];
      // ONE eligibility rule per type — the dropdown, the counts and the popup all read it
      const eligibleFor = useCallback((t) => {
        if (t === 'rental') return tens;
        if (t === 'rentreceipt') return tens.filter((x) => (x.rentLog || []).length);
        if (t === 'sale') return deals.filter((x) => x.dealType === 'Sale');
        if (t === 'receipt') return deals.filter((x) => (x.payments || []).length);
        if (t === 'dues') return deals.filter((x) => x.status !== 'Cancelled' && x.balance > 0);
        if (t === 'invoice') return deals.filter((x) => x.status === 'Completed');
        return [];
      }, [deals, tens]);
      const records = useMemo(() => eligibleFor(docType), [eligibleFor, docType]);
      useEffect(() => { setRecId(''); }, [docType]); // type change -> stale record never survives
      const recLabel = (r) => meta.src === 'ten'
        ? (r.propertyRef || '#' + r.propertyId) + ' · ' + r.tenantName + ' · ' + pkrShort(r.monthlyRent) + '/tháng (' + viEnum(r.status) + ')'
        : (r.propertyRef || '#' + r.propertyId) + ' · ' + r.buyerName + ' · ' + pkrShort(r.dealAmount) + ' (' + viEnum(r.status) + ')';

      const generate = () => {
        if (!recId) return Swal.fire({ icon: 'warning', title: 'Chọn hồ sơ', text: 'Vui lòng chọn ' + (meta.src === 'ten' ? 'hợp đồng thuê' : 'giao dịch') + ' để tạo tài liệu này.' });
        setBusy(true); setAutoPrint(false);
        gsRun('buildAgreement', docType, parseInt(recId, 10), currentUser).then((r) => {
          setBusy(false);
          if (r && r.success) setDoc(r);
          else Swal.fire({ icon: 'error', title: 'Error', text: (r && r.message) || 'Failed' });
        }).catch((e) => { setBusy(false); Swal.fire({ icon: 'error', title: 'Error', text: String((e && e.message) || e) }); });
      };

      // popup row action: build that record's document, open the A4 sheet and fire the print dialog
      const viewRecord = (r) => {
        setRowBusy(r.id);
        gsRun('buildAgreement', docType, r.id, currentUser).then((res) => {
          setRowBusy(0);
          if (!res || !res.success) return Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' });
          setRecId(String(r.id)); setAutoPrint(true); setDoc(res);
        }).catch((e) => { setRowBusy(0); Swal.fire({ icon: 'error', title: 'Error', text: String((e && e.message) || e) }); });
      };

      const kpi = [
        [tens.filter((t) => t.status === 'Active').length, 'Hợp đồng thuê đang hoạt động', 'fa-house-user', 'bg-navy'],
        [deals.filter((x) => x.dealType === 'Sale' && x.status !== 'Cancelled').length, 'Giao dịch mua bán', 'fa-handshake', 'bg-info'],
        [deals.filter((x) => x.status !== 'Cancelled' && x.balance > 0).length, 'Còn số dư phải thu', 'fa-triangle-exclamation', 'bg-warning'],
        [deals.filter((x) => x.status === 'Completed').length, 'Sẵn sàng xuất hóa đơn', 'fa-file-invoice-dollar', 'bg-success']
      ];

      return (
        <>
          <KpiRow items={kpi} />
          <div className="filters-section">
            <div className="filters-header"><h3><i className="fas fa-file-contract"></i> Tạo tài liệu</h3></div>
            <div className="filters-grid">
              <SearchableDropdown label="Loại tài liệu" icon={'fas ' + meta.icon}
                options={DOC_TYPES.map((x) => ({ value: x.value, label: x.label }))}
                value={docType} onChange={setDocType} placeholder="Type…" />
              <SearchableDropdown label={meta.src === 'ten' ? 'Hợp đồng thuê' : 'Giao dịch'} icon={meta.src === 'ten' ? 'fas fa-house-user' : 'fas fa-handshake'}
                options={records.map((r) => ({ value: String(r.id), label: recLabel(r) }))}
                value={recId} onChange={setRecId}
                placeholder={records.length ? 'Chọn hồ sơ…' : 'Chưa có hồ sơ phù hợp'} />
              <div className="filter-group filter-action">
                <label>&nbsp;</label>
                <button className="btn btn-primary" onClick={generate} disabled={busy || !records.length}>
                  <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}></i> {busy ? 'Đang tạo…' : 'Tạo tài liệu'}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 12.5, color: '#789', margin: '4px 2px 0' }}><i className="fas fa-circle-info"></i> {meta.hint}. Xem trước bản in chuẩn A4 — có thể in trực tiếp hoặc tải về.</p>
          </div>
          <div className="data-section">
            <div className="section-header"><h2><i className="fas fa-list-check"></i> Danh mục tài liệu</h2></div>
            {DOC_TYPES.map((x) => {
              const n = eligibleFor(x.value).length;
              return (
                <div key={x.value} className="tl-item" style={{ cursor: 'pointer' }} onClick={() => setDocType(x.value)}>
                  <i className={'fas ' + x.icon}></i>
                  <div style={{ flex: 1 }}><div className="w"><b>{x.label}</b></div><div className="m">{x.hint}</div></div>
                  <button className={'btn btn-sm elig-btn ' + (n ? 'btn-primary' : 'btn-secondary')} disabled={!n}
                          title={n ? 'Mở ' + n + ' hồ sơ phù hợp' : 'Chưa có hồ sơ phù hợp'}
                          onClick={(e) => { e.stopPropagation(); setDocType(x.value); setListOpen(true); }}>
                    <i className="fas fa-list-check"></i> {n} hồ sơ phù hợp
                  </button>
                </div>
              );
            })}
          </div>
          {listOpen && <EligibleDocsModal meta={meta} records={records} busyId={rowBusy} onView={viewRecord} onClose={() => setListOpen(false)} />}
          {doc && <A4DocModal doc={doc} docType={docType} recId={parseInt(recId, 10)} currentUser={currentUser}
                              autoPrint={autoPrint} onClose={() => { setDoc(null); setAutoPrint(false); }} />}
        </>
      );
    }

    // ============== Reports (read-only, period-first, computed from cached data) ==============
    function ReportsView({ currentUser, role }) {
      const all = scopeAll(role);
      const { data: dRes } = useSWR('deals:all', () => gsRun('getDeals', currentUser), SWR_LIVE);
      const { data: lRes } = useSWR('leads:all', () => gsRun('getLeads', currentUser), SWR_LIVE);
      const { data: pRes } = useSWR('props:all', () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: aRes } = useSWR('appts:all', () => gsRun('getAppointments', currentUser), SWR_LIVE);
      const { data: tRes } = useSWR('tenancies:all', () => gsRun('getTenancies', currentUser), SWR_LIVE);
      const { data: uRes } = useSWR(all ? 'users:all' : null, () => gsRun('getAllUsers', currentUser), SWR_LIVE);
      const { data: dupRes } = useSWR('props:dupes', () => gsRun('getPropertyDuplicates', currentUser), SWR_LIVE);
      const dupes = dupRes && dupRes.success ? dupRes.data : [];
      const deals = dRes && dRes.success ? dRes.data : [];
      const leads = lRes && lRes.success ? lRes.data : [];
      const props = pRes && pRes.success ? pRes.data : [];
      const appts = aRes && aRes.success ? aRes.data : [];
      const tens = tRes && tRes.success ? tRes.data : [];
      const users = uRes && uRes.success ? uRes.data : [];
      const loading = !dRes || !lRes || !pRes;

      const today = new Date(), p0 = (x) => String(x).padStart(2, '0');
      const iso = (d) => d.getFullYear() + '-' + p0(d.getMonth() + 1) + '-' + p0(d.getDate());
      const reportPeriods = [
        { key: 'month', label: 'Tháng này', from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) },
        { key: 'last-month', label: 'Tháng trước', from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: iso(new Date(today.getFullYear(), today.getMonth(), 0)) },
        { key: 'quarter', label: 'Quý', from: iso(new Date(today.getFullYear(), today.getMonth() - 2, 1)), to: iso(today) },
        { key: 'year', label: 'Năm nay', from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) },
        { key: 'all', label: 'Toàn thời gian', from: iso(new Date(2000, 0, 1)), to: iso(today) }
      ];
      const [range, setRange] = useState(() => ({ from: reportPeriods[0].from, to: reportPeriods[0].to }));
      const activePeriod = reportPeriods.find((p) => p.from === range.from && p.to === range.to);
      const chip = (period) => <button key={period.key} type="button" aria-pressed={activePeriod && activePeriod.key === period.key}
        className={'btn btn-secondary btn-sm report-period-chip' + (activePeriod && activePeriod.key === period.key ? ' is-active' : '')}
        onClick={() => setRange({ from: period.from, to: period.to })}>{period.label}</button>;
      const inR = (v) => { if (!v) return false; const d = String(v).substr(0, 10); return d >= range.from && d <= range.to; };

      const [tab, setTab] = useState('sales');
      const closed = deals.filter((x) => x.status === 'Completed' && inR(x.closedAt));
      // by-agent rollup used twice
      const agents = useMemo(() => { const set = {}; leads.forEach((l) => l.assignedAgent && (set[l.assignedAgent] = 1)); deals.forEach((x) => x.agent && (set[x.agent] = 1)); return Object.keys(set).sort(); }, [leads, deals]);
      const live = props.filter((x) => ['Available', 'Reserved'].indexOf(x.status) !== -1 && x.publishedAt);
      const dom = (x) => Math.round((Date.now() - new Date(x.publishedAt).getTime()) / 864e5);
      const mm = ymNow();
      // display-vs-sort renders: the table sorts on the raw number, the cell shows the formatted value
      const money = { render: (d, t) => (t === 'display' ? fmtPKR(d) : (d || 0)) };
      const shortMoney = { render: (d, t) => (t === 'display' ? pkrShort(d) : (d || 0)) };
      const pct = { render: (d, t) => (t === 'display' ? (d == null ? '—' : d + '%') : (d || 0)) };
      const txt = { render: (d, t) => (t === 'display' ? esc(d == null || d === '' ? '—' : d) : (d || '')) };
      const dt = { render: (d, t) => (t === 'display' ? fmtDate(d) : (d || '')) };

      // one definition per tab: columns + row objects + the totals strip above the table
      const REPORTS = useMemo(() => [
        { key: 'sales', label: 'Mua bán và cho thuê', icon: 'fa-sack-dollar', hint: 'Các giao dịch hoàn thành trong khoảng thời gian đã chọn',
          cols: [{ data: 'closedAt', title: 'Closed', ...dt }, { data: 'propertyRef', title: 'Property', ...txt }, { data: 'dealType', title: 'Type', ...txt },
                 { data: 'buyerName', title: 'Buyer', ...txt }, { data: 'agent', title: 'Agent', ...txt },
                 { data: 'dealAmount', title: 'Amount', ...money }, { data: 'commissionAmt', title: 'Commission', ...money }],
          rows: closed,
          sum: [['Giao dịch đã chốt', closed.length, 'fa-handshake', 'bg-navy'],
                ['Tổng giá trị', pkrShort(closed.reduce((s, x) => s + (x.dealAmount || 0), 0)), 'fa-sack-dollar', 'bg-success'],
                ['Hoa hồng', pkrShort(closed.reduce((s, x) => s + (x.commissionAmt || 0), 0)), 'fa-percent', 'bg-info']] },

        { key: 'source', label: 'Chuyển đổi khách hàng', icon: 'fa-bullhorn', hint: 'Khách hàng được tạo trong kỳ, phân nhóm theo nguồn tiếp cận',
          cols: [{ data: 'source', title: 'Source', ...txt }, { data: 'total', title: 'Leads' }, { data: 'won', title: 'Won' },
                 { data: 'lost', title: 'Lost' }, { data: 'open', title: 'Open' }, { data: 'conv', title: 'Conversion', ...pct }],
          rows: ENUMS.leadSource.map((s) => { const g = leads.filter((l) => l.source === s && inR(l.created));
            const won = g.filter((l) => l.status === 'Won').length, lost = g.filter((l) => l.status === 'Lost').length;
            return g.length ? { source: viEnum(s), total: g.length, won, lost, open: g.length - won - lost, conv: Math.round(won / g.length * 100) } : null;
          }).filter(Boolean) },

        { key: 'agents', label: 'Hiệu suất nhân viên', icon: 'fa-ranking-star', adminOnly: true, hint: 'Hoạt động và giá trị giao dịch đã chốt của từng nhân viên trong kỳ',
          cols: [{ data: 'agent', title: 'Agent', ...txt }, { data: 'leads', title: 'Leads (period)' }, { data: 'won', title: 'Won' },
                 { data: 'viewings', title: 'Viewings' }, { data: 'value', title: 'Deal Value', ...money }, { data: 'commission', title: 'Commission', ...money }],
          rows: agents.map((a) => { const c = closed.filter((x) => x.agent === a);
            return { agent: a, leads: leads.filter((l) => l.assignedAgent === a && inR(l.created)).length,
              won: leads.filter((l) => l.assignedAgent === a && l.status === 'Won').length,
              viewings: appts.filter((x) => x.agent === a && inR(x.scheduledAt)).length,
              value: c.reduce((s, x) => s + (x.dealAmount || 0), 0), commission: c.reduce((s, x) => s + (x.commissionAmt || 0), 0) }; }) },

        { key: 'ageing', label: 'Tuổi nguồn hàng', icon: 'fa-hourglass-half', hint: 'Tin đang hoạt động theo số ngày trên thị trường; trên 90 ngày được tính là tồn lâu',
          cols: [{ data: 'referenceCode', title: 'Ref', ...txt }, { data: 'title', title: 'Title', ...txt }, { data: 'price', title: 'Price', ...shortMoney },
                 { data: 'status', title: 'Status', render: (d, t) => (t === 'display' ? badge(d) : d) },
                 { data: 'days', title: 'Số ngày đăng', render: (d, t) => (t === 'display' ? (d > 90 ? '<b style="color:#c62828">' + d + ' ⚠ tồn lâu</b>' : d) : d) }],
          rows: live.map((x) => ({ referenceCode: x.referenceCode, title: x.title, price: x.price, status: x.status, days: dom(x) })),
          sum: [['Tin đang hoạt động', live.length, 'fa-building', 'bg-navy'],
                ['Tồn lâu (90 ngày+)', live.filter((x) => dom(x) > 90).length, 'fa-hourglass-end', 'bg-danger'],
                ['Số ngày trung bình', live.length ? Math.round(live.reduce((s, x) => s + dom(x), 0) / live.length) : 0, 'fa-clock', 'bg-info']] },

        { key: 'portal', label: 'Tương tác trên cổng thông tin', icon: 'fa-eye', hint: 'So sánh lượt xem công khai và yêu cầu tư vấn của từng tin đăng',
          cols: [{ data: 'referenceCode', title: 'Ref', ...txt }, { data: 'title', title: 'Title', ...txt }, { data: 'views', title: 'Views' },
                 { data: 'enq', title: 'Enquiries' }, { data: 'rate', title: 'Enquiry Rate', ...pct }],
          rows: props.map((x) => { const enq = leads.filter((l) => l.propertyId == x.id).length;
            return { referenceCode: x.referenceCode, title: x.title, views: x.viewsCount || 0, enq,
              rate: x.viewsCount ? Math.round(enq / x.viewsCount * 1000) / 10 : null }; }),
          sum: [['Tổng lượt xem', props.reduce((s, x) => s + (x.viewsCount || 0), 0).toLocaleString('vi-VN'), 'fa-eye', 'bg-info'],
                ['Yêu cầu tư vấn', leads.filter((l) => l.propertyId).length, 'fa-comments', 'bg-navy']] },

        { key: 'rentroll', label: 'Bảng theo dõi tiền thuê', icon: 'fa-house-user', hint: 'Hợp đồng thuê đang hoạt động — đối chiếu số phải thu và đã thu trong tháng',
          cols: [{ data: 'propertyRef', title: 'Ref', ...txt }, { data: 'tenantName', title: 'Tenant', ...txt }, { data: 'rent', title: 'Rent / mo', ...money },
                 { data: 'collected', title: 'Đã thu (' + mm + ')', ...money },
                 { data: 'arrears', title: 'Công nợ', render: (d, t) => (t === 'display' ? (d > 0 ? '<b style="color:#c62828">' + fmtPKR(d) + '</b>' : '<span style="color:#2e7d32">đã thanh toán</span>') : (d || 0)) }],
          rows: tens.filter((t) => t.status === 'Active').map((t) => ({ propertyRef: t.propertyRef, tenantName: t.tenantName, rent: t.monthlyRent,
            collected: (t.rentLog || []).filter((q) => q.month === mm).reduce((s, q) => s + q.amount, 0), arrears: t.arrears || 0 })),
          sum: [['Hợp đồng thuê đang hoạt động', tens.filter((t) => t.status === 'Active').length, 'fa-house-user', 'bg-navy'],
                ['Dự kiến mỗi tháng', pkrShort(tens.filter((t) => t.status === 'Active').reduce((s, t) => s + (t.monthlyRent || 0), 0)), 'fa-file-invoice-dollar', 'bg-info'],
                ['Tổng công nợ', pkrShort(tens.reduce((s, t) => s + (t.arrears || 0), 0)), 'fa-triangle-exclamation', 'bg-danger']] },

        { key: 'payouts', label: 'Hoa hồng và chi trả', icon: 'fa-hand-holding-dollar', adminOnly: true, hint: 'Tổng phân chia hoa hồng của từng nhân viên và số tiền còn phải trả',
          cols: [{ data: 'agent', title: 'Agent', ...txt }, { data: 'earned', title: 'Commission Earned', ...money }, { data: 'share', title: 'Agent Share', ...money },
                 { data: 'agency', title: 'Agency Share', ...money }, { data: 'paidOut', title: 'Paid Out', ...money },
                 { data: 'payable', title: 'Payable', render: (d, t) => (t === 'display' ? (d > 0 ? '<b style="color:#c62828">' + fmtPKR(d) + '</b>' : fmtPKR(0)) : (d || 0)) }],
          rows: agents.map((a) => { const c = deals.filter((x) => x.agent === a && x.status === 'Completed');
            const earned = c.reduce((s, x) => s + (x.commissionAmt || 0), 0), share = c.reduce((s, x) => s + (x.agentShareAmt || 0), 0);
            const paidOut = c.filter((x) => x.agentPaidAt).reduce((s, x) => s + (x.agentShareAmt || 0), 0);
            return earned ? { agent: a, earned, share, agency: r2(earned - share), paidOut, payable: r2(share - paidOut) } : null; }).filter(Boolean) },

        { key: 'offers', label: 'Quy trình chào giá', icon: 'fa-scale-balanced', hint: 'Các chào giá được ghi nhận cho khách hàng trong khoảng thời gian đã chọn',
          cols: [{ data: 'lead', title: 'Khách hàng', ...txt }, { data: 'phone', title: 'Điện thoại', ...txt }, { data: 'by', title: 'Bên đưa giá', render: (d, t) => (t === 'display' ? viEnum(d) : d) },
                 { data: 'amount', title: 'Số tiền', ...money }, { data: 'date', title: 'Ngày', ...dt },
                 { data: 'status', title: 'Trạng thái', render: (d, t) => (t === 'display' ? badge(d) : d) }],
          rows: leads.reduce((acc, l) => acc.concat((l.offers || []).filter((o) => inR(o.date))
            .map((o) => ({ lead: l.fullName, phone: l.phone, by: o.by, amount: o.amount, date: o.date, status: o.status }))), []) },

        { key: 'targets', label: 'Tiến độ mục tiêu', icon: 'fa-bullseye', adminOnly: true, hint: 'Giá trị đã chốt trong tháng so với mục tiêu tháng của từng nhân viên',
          cols: [{ data: 'agent', title: 'Nhân viên', ...txt }, { data: 'target', title: 'Mục tiêu tháng', ...money }, { data: 'value', title: 'Giá trị đã chốt', ...money },
                 { data: 'progress', title: 'Tiến độ', render: (d, t) => (t === 'display'
                   ? '<div class="rep-bar"><span style="width:' + Math.min(100, d) + '%;background:' + (d >= 100 ? '#2e7d32' : d >= 50 ? '#0074D9' : '#e6a700') + '"></span></div><small>' + d + '%</small>'
                   : (d || 0)) }],
          rows: users.filter((u) => u.MonthlyTarget > 0).map((u) => { const v = deals.filter((x) => x.agent === u.Username && x.status === 'Completed'
              && String(x.closedAt || '').substr(0, 7) === mm).reduce((s, x) => s + (x.dealAmount || 0), 0);
            return { agent: u.Username, target: u.MonthlyTarget, value: v, progress: Math.round(v / u.MonthlyTarget * 100) }; }) },

        { key: 'dupes', label: 'Có thể trùng lặp', icon: 'fa-clone', hint: 'Cùng một bất động sản được đăng hai lần — ưu tiên trường hợp khác nhân viên để tránh tranh chấp hoa hồng',
          cols: [{ data: 'aRef', title: 'Tin A', ...txt }, { data: 'aTitle', title: 'Tiêu đề A', ...txt }, { data: 'aAgent', title: 'Nhân viên A', ...txt },
                 { data: 'bRef', title: 'Tin B', ...txt }, { data: 'bTitle', title: 'Tiêu đề B', ...txt }, { data: 'bAgent', title: 'Nhân viên B', ...txt },
                 { data: 'crossAgent', title: 'Khác nhân viên', render: (d, t) => (t === 'display'
                   ? (d === 'Yes' ? '<span class="status-badge st-red">Có</span>' : '<span class="status-badge st-gray">Không</span>') : d) },
                 { data: 'why', title: 'Trùng theo', ...txt }],
          rows: dupes,
          sum: [['Cặp nghi trùng', dupes.length, 'fa-clone', dupes.length ? 'bg-warning' : 'bg-success'],
                ['Khác nhân viên', dupes.filter((x) => x.crossAgent === 'Yes').length, 'fa-user-xmark', 'bg-danger'],
                ['Cùng nhân viên', dupes.filter((x) => x.crossAgent !== 'Yes').length, 'fa-user-check', 'bg-info']] }
      ].filter((r) => !r.adminOnly || all), [deals, leads, props, appts, tens, users, dupes, range.from, range.to, all]);

      const active = REPORTS.find((r) => r.key === tab) || REPORTS[0];
      useEffect(() => { if (!REPORTS.some((r) => r.key === tab)) setTab(REPORTS[0].key); }, [REPORTS, tab]); // role change -> never strand on a hidden tab

      const tableRef = useDataTable('reportTable', loading ? null : active.rows, () => ({
        columns: active.cols, order: [], pageLength: 10,
        buttons: [ // reports have no actions column — export EVERY column, unlike the list views
          { extend: 'csv', text: 'CSV', title: active.label },
          { extend: 'pdf', text: 'PDF', title: active.label, orientation: 'landscape', pageSize: 'A4' },
          { extend: 'print', text: 'Print', title: active.label }
        ]
      }), () => {}, [active.key, range.from, range.to]);

      useEffect(() => { // read-only view: export trio only, never import (rule: audit views ship no import)
        const t = () => tableRef.current;
        setPageActions([
          { icon: 'fa-file-csv', label: 'CSV', onClick: () => t() && t().button('.buttons-csv').trigger() },
          { icon: 'fa-file-pdf', label: 'PDF', onClick: () => t() && t().button('.buttons-pdf').trigger() },
          { icon: 'fa-print', label: 'In', onClick: () => t() && t().button('.buttons-print').trigger() }
        ]);
        return () => setPageActions([]);
      }, [tab]);

      if (loading) return <KpiSkeleton />;
      return (
        <>
          <div className="filters-section">
            <div className="filters-header"><h3><i className="fas fa-calendar-days"></i> Kỳ báo cáo</h3>
              <div className="report-periods">
                {reportPeriods.map(chip)}
              </div>
            </div>
            <div className="filters-grid">
              <div className="filter-group"><label><i className="fas fa-play"></i> Từ ngày</label>
                <input type="date" className="filter-input" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
              <div className="filter-group"><label><i className="fas fa-stop"></i> Đến ngày</label>
                <input type="date" className="filter-input" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
            </div>
          </div>

          <div className="rep-tabs">
            {REPORTS.map((r) => (
              <button key={r.key} className={'rep-tab' + (r.key === active.key ? ' on' : '')} onClick={() => setTab(r.key)}>
                <i className={'fas ' + r.icon}></i> {r.label}
                <span className="rep-tab-n">{r.rows.length}</span>
              </button>
            ))}
          </div>

          {active.sum && (
            <div className="lte-kpi-grid">
              {active.sum.map(([label, value, icon, color], i) => <InfoBox key={i} value={value} label={label} icon={icon} color={color} />)}
            </div>
          )}

          <div className="data-section">
            <div className="section-header">
              <h2><i className={'fas ' + active.icon}></i> {active.label}</h2>
              <span className="rep-hint"><i className="fas fa-circle-info"></i> {active.hint}</span>
            </div>
            <div style={{ overflowX: 'auto' }}><table id="reportTable" className="display" style={{ width: '100%' }}></table></div>
          </div>
        </>
      );
    }

    // ============== Trash (Admin — restore soft-deletes) ==============
    function TrashView({ currentUser }) {
      const { data: res, error, mutate } = useSWR('trash:all', () => gsRun('getTrash', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      useEffect(() => { setPageActions([]); return () => setPageActions([]); }, []);
      const restore = (x) => {
        Swal.fire({ icon: 'question', title: 'Restore ' + x.type + ' #' + x.id + '?', showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Restore' })
          .then((r) => { if (r.isConfirmed) gsRun('restoreRecord', x.sheet, x.id, currentUser).then((res2) => {
            if (res2 && res2.success) { Swal.fire({ icon: 'success', title: res2.message, timer: 1600, showConfirmButton: false }); mutate(); swrClearAll(); }
            else Swal.fire({ icon: 'error', title: 'Error', text: (res2 && res2.message) || 'Failed' }); }); });
      };
      return (
        <div className="data-section">
          <div className="section-header"><h2><i className="fas fa-trash-arrow-up"></i> Trash — deleted records</h2></div>
          {loading ? <TableSkeleton rows={6} columns={4} /> : (rows || []).length === 0
            ? <p style={{ color: '#789', textAlign: 'center', padding: 24 }}><i className="fas fa-broom" style={{ display: 'block', fontSize: 26, marginBottom: 8, opacity: .5 }}></i>Trash is empty — nothing has been deleted.</p>
            : (rows || []).map((x, i) => (
              <div key={i} className="tl-item"><i className="fas fa-box-archive"></i>
                <div style={{ flex: 1 }}><div className="w"><b>{x.type}</b> #{x.id} — {x.title}</div><div className="m">deleted {fmtDT(x.updated)}</div></div>
                <button className="btn btn-secondary btn-sm" onClick={() => restore(x)}><i className="fas fa-rotate-left"></i> Restore</button>
              </div>))}
        </div>
      );
    }

    // ============== Appointments month calendar (list <-> grid toggle, derived) ==============
    // ============== Appointments month calendar (list <-> grid toggle, derived) ==============
    function CalendarGrid({ appts, onSelectAppt }) {
      const [ym, setYm] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
      const first = new Date(ym.y, ym.m, 1);
      const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7)); // Monday grid
      const cells = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
      const key = (d) => d.toDateString();
      const byDay = useMemo(() => { const o = {}; (appts || []).forEach((a) => { const k = new Date(a.scheduledAt).toDateString(); (o[k] = o[k] || []).push(a); }); return o; }, [appts]);
      const today = new Date().toDateString();
      const mv = (n) => setYm(({ y, m }) => { const d = new Date(y, m + n, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
      const goToday = () => { const d = new Date(); setYm({ y: d.getFullYear(), m: d.getMonth() }); };
      return (
        <div className="cal-wrap">
          <div className="cal-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px 12px' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => mv(-1)} title="Tháng trước"><i className="fas fa-chevron-left"></i></button>
              <button className="btn btn-secondary btn-sm" onClick={goToday} style={{ fontSize: 12 }}><i className="fas fa-calendar-day"></i> Hôm nay</button>
              <button className="btn btn-secondary btn-sm" onClick={() => mv(1)} title="Tháng sau"><i className="fas fa-chevron-right"></i></button>
            </div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--navy-primary)' }}>
              <i className="fas fa-calendar-days text-accent" style={{ marginRight: 8 }}></i>Tháng {first.getMonth() + 1} năm {first.getFullYear()}
            </h4>
            <div style={{ width: 90 }}></div>
          </div>
          <div className="cal-grid">
            {['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'].map((d) => <div key={d} className="cal-head" style={{ fontWeight: 700, padding: '6px 0', color: 'var(--navy-primary)' }}>{d}</div>)}
            {cells.map((d, i) => {
              const dayList = byDay[key(d)] || [];
              return (
                <div key={i} className={'cal-cell' + (d.getMonth() !== ym.m ? ' out' : '') + (key(d) === today ? ' today' : '')} style={{ minHeight: 88, padding: '6px' }}>
                  <div className="d" style={{ fontWeight: 700, marginBottom: 4 }}>{d.getDate()}</div>
                  {dayList.slice(0, 3).map((a) => {
                    const timeStr = a.scheduledAt ? new Date(a.scheduledAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
                    return (
                      <div key={a.id} className={'cal-ev' + (a.status === 'Completed' ? ' done' : ['Cancelled', 'No Show'].indexOf(a.status) !== -1 ? ' bad' : '')}
                           onClick={() => onSelectAppt && onSelectAppt(a)}
                           style={{ cursor: 'pointer', padding: '3px 6px', marginBottom: 3, borderRadius: 4 }}
                           title={a.leadName + ' · ' + (a.propertyRef || '') + ' · ' + fmtDT(a.scheduledAt) + ' · ' + viEnum(a.status)}>
                        <strong>{timeStr}</strong> {a.leadName}
                      </div>
                    );
                  })}
                  {dayList.length > 3 && (
                    <div style={{ fontSize: 11, color: 'var(--navy-accent)', cursor: 'pointer', fontWeight: 700, marginTop: 4 }}
                         onClick={() => onSelectAppt && onSelectAppt(dayList[3])}>
                      +{dayList.length - 3} lịch hẹn khác…
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    function AboutView({ role }) {
      const { branding } = useAgencyBranding();
      const Y = () => <i className="fas fa-check text-success"></i>;
      const N = () => <i className="fas fa-times text-danger"></i>;
      const RBAC_ROWS = [
        ['Tổng quan', 'Toàn công ty', 'Toàn công ty', 'Chỉ dữ liệu của mình', 'Không'],
        ['Trợ lý AI', 'Trò chuyện trên dữ liệu toàn công ty', 'Trò chuyện trên dữ liệu toàn công ty', 'Chỉ trò chuyện trên dữ liệu của mình', 'Không'],
        ['Bất động sản', 'Toàn quyền và xóa', 'Toàn quyền, xóa và chốt (Đã bán/Đã cho thuê)', 'Xem tất cả · thêm · sửa dữ liệu của mình', 'Chỉ tin đang công khai ở trạng thái Còn trống/Đã giữ chỗ'],
        ['Khách hàng tiềm năng', 'Toàn quyền và xóa', 'Toàn quyền, phân công và xóa', 'Chỉ dữ liệu của mình · thêm · sửa · không xóa', 'Chỉ được gửi biểu mẫu yêu cầu tư vấn'],
        ['Chăm sóc khách hàng', 'Toàn quyền và xóa', 'Toàn quyền (phân công nhân viên) và xóa', 'Chỉ dữ liệu của mình · không xóa (giữ nhật ký)', 'Không'],
        ['Lịch hẹn', 'Toàn quyền và xóa', 'Toàn quyền và xóa', 'Chỉ lịch và khách hàng của mình · không xóa', 'Không'],
        ['Giao dịch', 'Toàn quyền và xóa', 'Toàn quyền · hoàn thành/hủy · xác nhận đã trả nhân viên', 'Chỉ dữ liệu của mình · thêm · sửa · không được chốt/chi trả', 'Không'],
        ['Hợp đồng thuê', 'Toàn quyền và xóa', 'Toàn quyền · gia hạn · kết thúc', 'Chỉ dữ liệu của mình · thu tiền thuê · ghi nhận bảo trì', 'Không'],
        ['Hợp đồng', 'Tạo mọi tài liệu (A4/PDF)', 'Tạo mọi tài liệu', 'Chỉ tạo tài liệu cho dữ liệu của mình', 'Không'],
        ['Báo cáo', 'Tất cả 9 báo cáo', 'Tất cả 9 báo cáo', 'Chỉ số liệu trong phạm vi của mình', 'Không'],
        ['Chủ sở hữu', 'Toàn quyền và xóa', 'Xem · thêm · sửa', 'Xem và thêm nhanh từ biểu mẫu bất động sản', 'Không'],
        ['Khu vực', 'Toàn quyền và xóa', 'Xem · thêm · sửa (không xóa)', 'Chỉ tra cứu trong danh sách chọn', 'Chỉ xem dữ liệu đang hoạt động'],
        ['Tiện ích', 'Toàn quyền (quản lý danh mục)', 'Chỉ chọn qua ô đánh dấu', 'Chỉ chọn qua ô đánh dấu', 'Chỉ xem dữ liệu đang hoạt động'],
        ['Quản lý người dùng', 'Toàn quyền (chỉ ngừng hoạt động, không xóa)', 'Chỉ xem tên/vai trò/trạng thái', 'Chỉ hồ sơ của mình', 'Không'],
        ['Nhật ký hoạt động', 'Xem', 'Xem', 'Không', 'Không'],
        ['Thùng rác', 'Xem và khôi phục', 'Không', 'Không', 'Không']
      ];
      const FORMULAS = [
        ['Chăm sóc quá hạn', "status = 'Pending' AND dueAt < NOW() — tính khi đọc, không lưu cố định", 'Các thẻ chăm sóc, KPI tổng quan, tiến trình nhắc việc'],
        ['Thẻ đến hạn', 'Gộp quá hạn và đến hạn hôm nay (mặc định khi nhân viên mở trang)', 'Thanh trạng thái chăm sóc'],
        ['Điều kiện hiển thị công khai', "deleted = 0 AND publishedAt IS NOT NULL AND status IN ('Available','Reserved')", 'Danh sách và chi tiết trên cổng công khai'],
        ['Dữ liệu trả ra công khai', 'Máy chủ loại bỏ ownerName / ownerPhone / assignedAgent / createdBy trước khi trả dữ liệu', 'getPublicPortal và mọi phản hồi công khai'],
        ['Thời điểm đăng', 'Chỉ ghi một lần khi trạng thái lần đầu rời Bản nháp', 'updateProperty'],
        ['Mã tham chiếu', "'RS-' + 3 ký tự đầu của thành phố gốc + (1000 + id)", 'addProperty và nhập dữ liệu'],
        ['Lượt xem', '+1 cho mỗi lần mở chi tiết công khai; không nhận số đếm từ trình duyệt', 'publicViewProperty và báo cáo người bán'],
        ['Định danh khách hàng', 'Chuẩn hóa số điện thoại; mỗi số chỉ có một hồ sơ đang mở (chưa Thành công/Thất bại)', 'addLead, nhập dữ liệu, yêu cầu công khai'],
        ['Yêu cầu lặp lại', 'Cùng số điện thoại gửi lại → thêm một ghi chú chăm sóc vào hồ sơ đang mở', 'publicSubmitEnquiry'],
        ['Giới hạn gửi yêu cầu', 'Tối đa 3 yêu cầu cho mỗi số điện thoại trong một giờ và có trường chống bot ẩn', 'publicSubmitEnquiry'],
        ['Lý do thất bại', 'Bắt buộc khi khách hàng chuyển sang trạng thái Thất bại', 'updateLead và biểu mẫu khách hàng'],
        ['Trùng lịch xem', 'Cùng nhân viên, trạng thái Đã lên lịch/Đã xác nhận và khoảng thời gian bị chồng lấn', 'addAppointment / updateAppointment'],
        ['Tự động cập nhật trạng thái', 'Đặt lịch xem sẽ chuyển Mới/Đã liên hệ/Đủ điều kiện → Đã lên lịch xem', 'addAppointment'],
        ['Lý do hủy', 'Bắt buộc khi lịch hẹn chuyển sang Đã hủy (hủy không phải xóa)', 'updateAppointment'],
        ['Không gửi nhắc trùng', 'Đánh dấu reminderSent sau khi gửi; đặt lại 0 khi đổi lịch', 'Tiến trình hàng giờ, updateFollowUp/Appointment'],
        ['Phạm vi dữ liệu cá nhân', 'Truy vấn của nhân viên gắn assignedAgent/agent = người dùng phiên hiện tại ngay tại lớp truy vấn', 'getLeads, getFollowUps, getAppointments'],
        ['Chốt bất động sản', 'Chỉ Quản trị viên/Quản lý được chuyển trạng thái sang Đã bán/Đã cho thuê', 'updateProperty'],
        ['Hiển thị giá', 'VNĐ được rút gọn theo tỷ/triệu; tệp xuất giữ giá trị chính xác', 'Tất cả bảng và thẻ tin công khai'],
        ['Ngừng tài khoản', 'Ngừng hoạt động (không xóa) và phân công lại toàn bộ công việc đang mở trong một thao tác', 'deleteUser, reassignAgentWork'],
        ['Hoa hồng', 'commissionAmt = dealAmount × commissionPct / 100 (giao dịch thuê mặc định bằng một tháng tiền thuê); máy chủ tính lại khi lưu', 'Biểu mẫu giao dịch, addDeal/updateDeal, báo cáo'],
        ['Phân chia hoa hồng', 'agentShareAmt = commissionAmt × agentSharePct / 100; phần công ty là số còn lại', 'Biểu mẫu giao dịch, báo cáo chi trả, bảng xếp hạng'],
        ['Phải trả nhân viên', 'Σ agentShareAmt của giao dịch Hoàn thành chưa có agentPaidAt; chỉ tính, không lưu cố định', 'Chân trang giao dịch, tổng quan, báo cáo'],
        ['Số dư giao dịch', 'dealAmount − Σ payments[].amount; máy chủ từ chối thanh toán vượt số tiền', 'Biểu mẫu giao dịch/thanh toán và bảng giao dịch'],
        ['Tác động khi đổi trạng thái', 'Đang mở → Đã giữ chỗ; Hoàn thành → Đã bán/Đã cho thuê và khách hàng Thành công; Hủy → giải phóng (bắt buộc lý do)', 'addDeal / updateDeal theo giao dịch nguyên tử'],
        ['Đề nghị được chấp nhận', 'Mỗi khách hàng tối đa một đề nghị được chấp nhận; các đề nghị còn lại bị từ chối và số tiền được điền vào giao dịch', 'updateOffer, thẻ Đề nghị trong hồ sơ 360'],
        ['Tiền thuê dự kiến', 'monthsElapsed(startDate → now, rentDueDay) × monthlyRent; công nợ = dự kiến − Σ rentLog', 'Hợp đồng thuê, tiến trình thu tiền, sổ tiền thuê'],
        ['Gia hạn', 'Tiền thuê mới mặc định = monthlyRent × (1 + renewalIncrementPct/100); lịch sử lưu trong renewals[]', 'Biểu mẫu gia hạn hợp đồng thuê'],
        ['Hoàn cọc', 'securityDeposit − các khoản khấu trừ; quyết toán khi kết thúc hợp đồng và trả bất động sản về Còn trống', 'Biểu mẫu kết thúc hợp đồng thuê'],
        ['Chi phí bảo trì', 'Khi đánh dấu Đã sửa và có chi phí, hệ thống ghi vào expenses[] của bất động sản với loại Bảo trì', 'updateMaintenance'],
        ['Lịch sử giá', 'Mỗi thay đổi giá được máy chủ thêm {date, old, new, by}; lịch sử giảm giá không thể sửa', 'updateProperty và hồ sơ bất động sản 360'],
        ['Số ngày trên thị trường', 'Hôm nay − publishedAt đối với tin đang hoạt động; trên 90 ngày được đánh dấu tồn lâu', 'Báo cáo tuổi tồn kho và hồ sơ 360'],
        ['Điểm phù hợp', 'Cùng nhánh khu vực (+3) → cùng loại (+2) → ngân sách trong ±10% (+1)', 'Ghép nhu cầu khách hàng và bất động sản 360'],
        ['Tiến độ mục tiêu', 'Σ giá trị giao dịch hoàn thành trong tháng ÷ MonthlyTarget × 100', 'Bảng xếp hạng và báo cáo mục tiêu'],
        ['Phân công luân phiên', 'Khách hàng từ website được luân phiên cho nhân viên đang hoạt động khi bật tính năng', 'publicSubmitEnquiry và Cài đặt'],
        ['Số hiệu tài liệu', 'AGR / REC / DUE / INV-{năm}-{id có đệm}; mọi lần tạo đều được ghi nhật ký và dùng chung nguồn HTML cho xem trước, in, PDF', 'Phân hệ Hợp đồng'],
        ['Phễu quy trình', 'Tích lũy: bước N gồm khách hàng có thứ hạng trạng thái từ N trở lên; khách hàng Thất bại bị loại sau bước đầu', 'Thẻ Quy trình giao dịch trên Tổng quan'],
        ['Tỷ lệ chuyển đổi', 'Khách hàng Thành công ÷ tổng khách hàng × 100 (một chữ số thập phân)', 'Chân phễu tổng quan và chỉ số khách hàng thành công'],
        ['Tỷ lệ chuyển bước', 'Số lượng giai đoạn ÷ số lượng giai đoạn trước × 100', 'Thẻ Quy trình giao dịch trên Tổng quan'],
        ['Tỷ lệ xu hướng', '(tháng này − tháng trước) ÷ tháng trước × 100; không hiện khi tháng trước bằng 0', 'Chỉ số tiền và yêu cầu tư vấn trên Tổng quan'],
        ['Chuỗi khách hàng theo ngày', 'Nhóm theo ngày tạo trong 90 ngày gần nhất; giao diện cắt theo 7/30/90 ngày', 'Biểu đồ Tổng quan khách hàng'],
        ['Tổng công nợ tiền thuê', 'Σ max(0, số tháng × tiền thuê tháng − Σ rentLog) của hợp đồng thuê đang hoạt động trong phạm vi', 'Chỉ số Công nợ tiền thuê trên Tổng quan'],
        ['Tổng số tiền còn lại', 'Σ max(0, dealAmount − Σ payments) của giao dịch Đặt cọc/Hợp đồng trong phạm vi', 'Chỉ số Số tiền còn lại trên Tổng quan'],
        ['Tỷ trọng trạng thái', 'Số lượng trạng thái ÷ tổng bất động sản trong phạm vi × 100 (một chữ số thập phân)', 'Chú giải Tổng quan trạng thái bất động sản'],
        ['Di chuyển trên bảng', 'Kéo/thả chỉ gửi trạng thái; máy chủ vẫn kiểm tra phạm vi và bắt buộc lý do Thất bại', 'Dạng bảng khách hàng → updateLead'],
        ['Phụ lục bất động sản', 'Mọi tài liệu chứa đầy đủ mã, loại, mục đích, trạng thái, mô tả, khu vực, địa chỉ, diện tích, phòng, giá, tọa độ và tiện ích; được coi là phần không tách rời', 'Cả 6 loại tài liệu Hợp đồng'],
        ['Điều kiện tạo tài liệu', 'Thuê = mọi hợp đồng thuê; sao kê = có rentLog; bán = giao dịch bán; biên nhận = có thanh toán; công nợ = giao dịch chưa hủy còn số dư; hóa đơn = giao dịch hoàn thành', 'Hợp đồng → Tài liệu khả dụng'],
        ['Tái xác thực nền', 'Mỗi phân hệ tải lại khi mở, khi quay lại thẻ và mỗi 60 giây; làm mới nền giữ dữ liệu tốt gần nhất và không hiện thông báo lỗi', 'useSWR / SWR_LIVE và mọi phân hệ'],
        ['Điểm trùng tin', 'Bắt buộc cùng khu vực, sau đó: cùng số chủ sở hữu +3; cùng địa chỉ +3; cùng tiêu đề +2; cùng loại, diện tích ±2% và số phòng +2. Tổng ≥ 3 bị cảnh báo', 'addProperty, updateProperty, nhập dữ liệu, báo cáo trùng'],
        ['Xử lý tin trùng', 'Thêm/sửa bị chặn và trả về tin phù hợp; có thể ghi đè và được ghi nhật ký. Khi nhập, dòng trùng bị bỏ qua và báo cáo', 'Biểu mẫu bất động sản và nhập CSV'],
        ['Lịch sử thay đổi trường', 'Mỗi lần cập nhật, hệ thống chỉ ghi trường thực sự có mặt và khác giá trị cũ dưới dạng {field, before, after}; tiền hiển thị theo VNĐ, mảng theo số lượng', 'updateProperty/Lead/Deal/Appointment/FollowUp → Nhật ký hoạt động']
      ];
      return (
        <div className="about-section">
          <div className="about-header">
            <div className="about-logo"><BrandLogo logo={branding.logo} /></div>
            <div className="about-title">
              <h1>CRM và cổng thông tin bất động sản</h1>
              <div className="about-dev">Nền tảng hai lớp — cổng tin đăng công khai và CRM nội bộ cho công ty</div>
            </div>
          </div>

          <div className="about-card">
            <h2><i className="fas fa-circle-info"></i> Chức năng của ứng dụng</h2>
            <p>Nền tảng quản lý toàn diện cho công ty bất động sản: khách truy cập xem tin đã công khai và gửi yêu cầu tư vấn mà không cần đăng nhập; thông tin liên hệ nhân viên được bảo vệ và mỗi yêu cầu được tạo thành một khách hàng tiềm năng. Nhân viên quản lý kho tin, quy trình khách hàng, lịch chăm sóc và lịch xem trong CRM. Hệ thống tự gửi email nhắc việc đến hạn và lịch xem ngày hôm sau theo giờ.</p>
          </div>

          <div className="about-card">
            <h2><i className="fas fa-star"></i> Tính năng chính</h2>
            <ul className="about-features">
              <li><i className="fas fa-building"></i> Kho tin bất động sản và thư viện ảnh</li>
              <li><i className="fas fa-globe"></i> Cổng công khai và biểu mẫu yêu cầu tư vấn</li>
              <li><i className="fas fa-user-tag"></i> Quy trình khách hàng theo trạng thái</li>
              <li><i className="fas fa-bell"></i> Nhắc lịch chăm sóc</li>
              <li><i className="fas fa-calendar-check"></i> Đặt lịch xem và kiểm tra trùng lịch</li>
              <li><i className="fas fa-map-location-dot"></i> Cây Thành phố → Khu vực → Khu dân cư</li>
              <li><i className="fas fa-list-check"></i> Danh mục tiện ích được chuẩn hóa</li>
              <li><i className="fas fa-chart-line"></i> Tổng quan theo phạm vi vai trò</li>
              <li><i className="fas fa-user-shield"></i> Phân quyền và phạm vi dữ liệu cá nhân/toàn bộ</li>
              <li><i className="fas fa-file-csv"></i> Nhập và xuất CSV ở các phân hệ</li>
              <li><i className="fas fa-clock-rotate-left"></i> Nhật ký hoạt động đầy đủ</li>
              <li><i className="fas fa-mobile-screen"></i> Giao diện đáp ứng, ưu tiên thiết bị di động</li>
            </ul>
          </div>

          <div className="about-card">
            <h2><i className="fas fa-user-shield"></i> Vai trò và phân quyền</h2>
            <div className="about-table-wrapper">
              <table className="about-roles-table">
                <thead>
                  <tr>
                    <th>Phân hệ</th>
                    <th><span className="role-badge role-admin">Quản trị viên</span></th>
                    <th><span className="role-badge role-manager">Quản lý</span></th>
                    <th><span className="role-badge role-agent">Nhân viên</span></th>
                    <th><span className="role-badge" style={{ background: '#e9ecef', color: '#495057' }}>Công khai</span></th>
                  </tr>
                </thead>
                <tbody>
                  {RBAC_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c === 'Không' ? <N /> : c}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 13 }}><Y /> Phạm vi dữ liệu cá nhân của nhân viên được áp dụng tại lớp truy vấn phía máy chủ, không phụ thuộc giao diện. Ma trận chỉnh sửa trực tiếp nằm trong <strong>Vai trò và phân quyền</strong> (chỉ Quản trị viên); bảng trên mô tả cấu hình mặc định.</p>
          </div>

          <div className="about-card">
            <h2><i className="fas fa-calculator"></i> Công thức và logic nghiệp vụ</h2>
            <div className="about-table-wrapper">
              <table className="about-roles-table">
                <thead><tr><th>Nội dung</th><th>Công thức / Logic</th><th>Nơi sử dụng</th></tr></thead>
                <tbody>
                  {FORMULAS.map((r, i) => <tr key={i}><td>{r[0]}</td><td style={{ textAlign: 'left' }}>{r[1]}</td><td style={{ textAlign: 'left' }}>{r[2]}</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>

          <div className="about-card">
            <h2><i className="fas fa-database"></i> Lưu trữ dữ liệu</h2>
            <p>Dữ liệu nghiệp vụ, tài khoản, phân quyền và cấu hình thương hiệu được lưu tập trung trong Supabase. Ảnh bất động sản được quản lý trong Supabase Storage; mọi thao tác quan trọng đều tuân theo phân quyền và được ghi nhật ký hoạt động.</p>
          </div>

          <div className="about-footer"><strong>{branding.name || 'Hệ thống CRM'}</strong><br /><span style={{ fontSize: 12, color: '#999' }}>CRM và cổng thông tin bất động sản</span></div>
        </div>
      );
    }

    // ============== Public Property Portal (unauthenticated — the default pre-login surface) ==============
    function PropCard({ p, onOpen }) {
      const im = (p.images || []).find((i) => i.isPrimary) || (p.images || [])[0];
      return (
        <div className="prop-card" onClick={() => onOpen(p)}>
          <div className="prop-card-img">
            {im ? <img src={im.url} alt={p.title} loading="lazy" /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ab' }}><i className="fas fa-image" style={{ fontSize: 34 }}></i></div>}
            {!!p.isFeatured && <span className="prop-ribbon"><i className="fas fa-star"></i> Nổi bật</span>}
            <span className={'prop-lt ' + (p.listingType === 'Rent' ? 'rent' : 'sale')}>{p.listingType === 'Rent' ? 'Cho thuê' : 'Đang bán'}</span>
            {p.status === 'Reserved' && <span className="prop-reserved">Đã giữ chỗ</span>}
          </div>
          <div className="prop-card-body">
            <div className="prop-price">{pkrShort(p.price)}{p.listingType === 'Rent' && <small> /{(p.rentFrequency || 'Monthly').toLowerCase()}</small>}</div>
            <div className="prop-title">{p.title}</div>
            <div className="prop-loc"><i className="fas fa-location-dot"></i> {p.locationPath || ''}</div>
            <div className="prop-meta">
              {p.bedrooms != null && <span><i className="fas fa-bed"></i> {p.bedrooms}</span>}
              {p.bathrooms != null && <span><i className="fas fa-bath"></i> {p.bathrooms}</span>}
              <span><i className="fas fa-ruler-combined"></i> {fmtArea(p.areaSize, p.areaUnit)}</span>
              <span><i className="fas fa-eye"></i> {(p.viewsCount || 0).toLocaleString('en-US')}</span>
            </div>
            <div className="prop-ref">{p.referenceCode}</div>
          </div>
        </div>
      );
    }

    function PortalDetail({ prop, all, onOpen, onClose }) {
      const [imgIdx, setImgIdx] = useState(0);
      const [lb, setLb] = useState(false); // fullscreen lightbox
      const imgs = prop.images || [];
      const [enq, setEnq] = useState({ fullName: '', phone: '', email: '', preferredTime: '', message: 'Tôi quan tâm đến ' + (prop.referenceCode || '') + ' — ' + prop.title, website: '' });
      const [sending, setSending] = useState(false);
      const setEv = (k) => (e) => setEnq((f) => ({ ...f, [k]: e.target.value }));
      const portalLink = (window.__APP_URL__ || '') + '?p=' + (prop.slug || prop.id);
      const similar = useMemo(() => (all || []).filter((x) => x.id !== prop.id && x.propertyType === prop.propertyType &&
        x.listingType === prop.listingType && x.price >= prop.price * 0.7 && x.price <= prop.price * 1.3).slice(0, 3), [all, prop]);
      useEffect(() => { setImgIdx(0); setLb(false); window.scrollTo && setEnq((f) => ({ ...f, message: 'Tôi quan tâm đến ' + (prop.referenceCode || '') + ' — ' + prop.title })); }, [prop.id]);
      const submit = (e) => {
        e.preventDefault();
        setSending(true);
        gsRun('publicSubmitEnquiry', { ...enq, preferredTime: enq.preferredTime ? enq.preferredTime.replace('T', ' ') : '',
          propertyId: prop.id, interestType: prop.listingType === 'Rent' ? 'Rent' : 'Buy' }).then((r) => {
          setSending(false);
          if (r && r.success) { onClose(); Swal.fire({ icon: 'success', title: 'Đã gửi yêu cầu tư vấn!', text: r.message, confirmButtonColor: '#001f3f' }); }
          else Swal.fire({ icon: 'error', title: 'Không thể gửi', text: (r && r.message) || 'Vui lòng thử lại' });
        }).catch((err) => { setSending(false); Swal.fire({ icon: 'error', title: 'Không thể gửi', text: String((err && err.message) || err) }); });
      };
      const facts = [
        ['Loại hình', viEnum(prop.propertyType)], ['Diện tích', fmtArea(prop.areaSize, prop.areaUnit)],
        ['Phòng ngủ', prop.bedrooms == null ? '—' : prop.bedrooms], ['Phòng tắm', prop.bathrooms == null ? '—' : prop.bathrooms],
        ['Mã tham chiếu', prop.referenceCode || '—'], ['Trạng thái', viEnum(prop.status)]
      ];
      return (
        <div className="modal-overlay" onClick={onClose}>
          <TopLoadingBar active={sending} />
          <div className="modal modal-pd-luxury" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fas fa-gem" style={{ color: '#d4af37' }}></i> {prop.title}</h3>
              <button className="close-btn" onClick={onClose} title="Đóng">&times;</button>
            </div>
            <div className="modal-body">
              <div className="pd-grid-layout">
                {/* Cột trái: Gallery & Chi tiết */}
                <div className="pd-col-main">
                  {imgs.length > 0 && (
                    <div className="pd-gallery-wrap">
                      <div className="pd-gallery-main" style={{ cursor: 'zoom-in' }} onClick={() => setLb(true)} title="Nhấn để xem toàn màn hình">
                        <img src={(imgs[imgIdx] || imgs[0]).url} alt={prop.title} />
                        <span className="pd-zoom-tag"><i className="fas fa-expand"></i> Phóng to ảnh</span>
                        <span className={'pd-lt-badge ' + (prop.listingType === 'Rent' ? 'rent' : 'sale')}>
                          {prop.listingType === 'Rent' ? 'Cho Thuê' : 'Đang Bán'}
                        </span>
                        {prop.status === 'Reserved' && <span className="pd-reserved-badge">Đã Giữ Chỗ</span>}
                      </div>
                      {imgs.length > 1 && (
                        <div className="pd-thumbs">
                          {imgs.map((im, i) => <img key={i} src={im.url} className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} alt="" loading="lazy" />)}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pd-sec-title"><i className="fas fa-list-check"></i> Thông số bất động sản</div>
                  <div className="pd-facts">
                    {facts.map(([k, v], i) => <div key={i} className="pd-fact"><div className="k">{k}</div><div className="v">{v}</div></div>)}
                  </div>

                  {(prop.amenities || []).length > 0 && (
                    <>
                      <div className="pd-sec-title"><i className="fas fa-sparkles"></i> Tiện ích tiện nghi</div>
                      <div className="pd-amen-list">
                        {prop.amenities.map((a, i) => <span key={i} className="amen-chip"><i className={'fas ' + (a.icon || 'fa-check')}></i>{a.name}</span>)}
                      </div>
                    </>
                  )}

                  {prop.description && (
                    <>
                      <div className="pd-sec-title"><i className="fas fa-align-left"></i> Mô tả chi tiết</div>
                      <p className="pd-desc">{prop.description}</p>
                    </>
                  )}

                  {prop.latitude != null && prop.longitude != null && prop.latitude !== '' && (
                    <>
                      <div className="pd-sec-title"><i className="fas fa-map-location-dot"></i> Vị trí trên bản đồ</div>
                      <iframe className="pd-map" src={'https://maps.google.com/maps?q=' + prop.latitude + ',' + prop.longitude + '&z=15&output=embed'} loading="lazy" title="map"></iframe>
                    </>
                  )}
                </div>

                {/* Cột phải: Giá & Form liên hệ */}
                <div className="pd-col-side">
                  <div className="pd-side-card">
                    <div className="pd-price-row">
                      <div className="pd-price-val">
                        {pkrShort(prop.price)}
                        {prop.listingType === 'Rent' && <small> /{viEnum(prop.rentFrequency || 'Monthly').toLowerCase()}</small>}
                      </div>
                      <Badge s={prop.status} />
                    </div>
                    <div className="pd-loc-row">
                      <i className="fas fa-location-dot"></i> {prop.locationPath || ''}{prop.address ? ' · ' + prop.address : ''}
                    </div>
                    <div className="pd-share-row">
                      <button className="btn btn-secondary btn-sm" title="Chia sẻ qua Zalo"
                              onClick={() => window.open('https://zalo.me/?text=' + encodeURIComponent(prop.title + ' — ' + pkrShort(prop.price) + '\n' + portalLink), '_blank')}>
                        <ZaloIcon size={16} style={{ marginRight: 4 }} /> Zalo
                      </button>
                      <button className="btn btn-secondary btn-sm" title="Sao chép liên kết"
                              onClick={() => { try { navigator.clipboard.writeText(portalLink); Swal.fire({ icon: 'success', title: 'Đã sao chép liên kết!', timer: 1200, showConfirmButton: false }); } catch (e) {} }}>
                        <i className="fas fa-link"></i> Sao chép link
                      </button>
                    </div>

                    <div className="enquiry-box">
                      <h3><i className="fas fa-calendar-check"></i> Đặt Lịch Xem &amp; Báo Giá</h3>
                      <form onSubmit={submit}>
                        <div className="form-group">
                          <label><i className="fas fa-user"></i> Họ và tên *</label>
                          <input value={enq.fullName} onChange={setEv('fullName')} required placeholder="Nguyễn Văn A" />
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-phone"></i> Điện thoại / Zalo *</label>
                          <input value={enq.phone} onChange={setEv('phone')} required placeholder="0901 234 567" />
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-envelope"></i> Email</label>
                          <input type="email" value={enq.email} onChange={setEv('email')} placeholder="email@example.com" />
                        </div>
                        <div className="form-group">
                          <label><i className="fas fa-clock"></i> Thời gian xem nhà mong muốn</label>
                          <input type="datetime-local" value={enq.preferredTime} onChange={setEv('preferredTime')} />
                        </div>
                        <input type="text" value={enq.website} onChange={setEv('website')} style={{ display: 'none' }} tabIndex="-1" autoComplete="off" aria-hidden="true" />
                        <div className="form-group">
                          <label><i className="fas fa-message"></i> Ghi chú nhu cầu</label>
                          <textarea rows="2" value={enq.message} onChange={setEv('message')} placeholder="Tôi quan tâm đến căn nhà này..."></textarea>
                        </div>
                        <button type="submit" className="pd-submit-btn" disabled={sending}>
                          {sending ? <><i className="fas fa-spinner fa-spin"></i> Đang gửi…</> : <><i className="fas fa-paper-plane"></i> Gửi Yêu Cầu Tư Vấn Ngay</>}
                        </button>
                        <p className="pd-privacy-note"><i className="fas fa-shield-halved"></i> Thông tin của bạn được bảo mật tuyệt đối.</p>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {similar.length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                  <div className="pd-sec-title" style={{ fontSize: 17, marginBottom: 14 }}>
                    <i className="fas fa-wand-magic-sparkles"></i> Bất động sản tương tự
                  </div>
                  <div className="prop-grid">
                    {similar.map((p) => <PropCard key={p.id} p={p} onOpen={(x) => { onClose(); onOpen && onOpen(x); }} />)}
                  </div>
                </div>
              )}
            </div>
          </div>
          {lb && (
            <div className="lightbox" onClick={() => setLb(false)}>
              <button className="lb-x" onClick={() => setLb(false)}>&times;</button>
              {imgs.length > 1 && <button className="lb-nav" style={{ left: 24 }} onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx - 1 + imgs.length) % imgs.length); }}><i className="fas fa-chevron-left"></i></button>}
              <img src={(imgs[imgIdx] || imgs[0]).url} alt="" onClick={(e) => e.stopPropagation()} />
              {imgs.length > 1 && <button className="lb-nav" style={{ right: 24 }} onClick={(e) => { e.stopPropagation(); setImgIdx((imgIdx + 1) % imgs.length); }}><i className="fas fa-chevron-right"></i></button>}
            </div>
          )}
        </div>
      );
    }

    function PublicPortal({ onStaffLogin }) {
      const { data: res, error } = useSWR('portal', () => gsRun('getPublicPortal'), SWR_LIVE);
      const portal = res && res.success ? res : (res && res.properties ? res : null);
      const loading = !portal && !error;
      const props = portal ? portal.properties || [] : [];
      const locs = portal ? portal.locations || [] : [];
      const [lt, setLt] = useState('');
      const [filters, setFilters] = useState({ q: '', city: '', type: '', minPrice: '', maxPrice: '', beds: '', sort: '' });
      const [detail, setDetail] = useState(null);
      const cityOf = useMemo(() => { const by = {}; locs.forEach((l) => { by[l.id] = l; });
        return (id) => { let cur = by[id], g = 0; while (cur && cur.parentId && g++ < 5) cur = by[cur.parentId]; return cur ? cur.name : ''; }; }, [locs]);

      const filtering = !!(lt || filters.q || filters.city || filters.type || filters.minPrice || filters.maxPrice || filters.beds);
      const visible = useMemo(() => {
        const list = props.filter((p) =>
          (!lt || p.listingType === lt) &&
          (!filters.city || cityOf(p.locationId) === filters.city) &&
          (!filters.type || p.propertyType === filters.type) &&
          (!filters.minPrice || p.price >= (parseFloat(filters.minPrice) || 0)) &&
          (!filters.maxPrice || p.price <= (parseFloat(filters.maxPrice) || Infinity)) &&
          (!filters.beds || (p.bedrooms || 0) >= parseInt(filters.beds, 10)) &&
          (!filters.q || (p.title + ' ' + (p.locationPath || '') + ' ' + (p.referenceCode || '')).toLowerCase().includes(filters.q.toLowerCase()))
        );
        return filters.sort === 'plow' ? list.slice().sort((a, b) => a.price - b.price)
             : filters.sort === 'phigh' ? list.slice().sort((a, b) => b.price - a.price) : list; // default = newest first (server order)
      }, [props, lt, filters, cityOf]);
      const featured = useMemo(() => props.filter((p) => p.isFeatured), [props]);
      const openDetail = (p) => { setDetail(p); gsRun('publicViewProperty', p.id).catch(() => {}); }; // fire-and-forget views_count++
      useEffect(() => { // ?p=<slug> deep link -> open that listing once data lands
        const slug = window.__DEEP_LINK__;
        if (slug && props.length) {
          const p = props.find((x) => x.slug === slug || String(x.id) === slug);
          if (p) { window.__DEEP_LINK__ = ''; openDetail(p); }
        }
      }, [props.length]);

      return (
        <div className="portal">
          <nav className="portal-nav">
            <div className="portal-brand">
              <BrandLogo logo={portal && portal.branding && portal.branding.logo} />
              <span>{(portal && portal.branding && portal.branding.name) || 'Hệ thống CRM'}</span>
            </div>
            <button className="portal-login-btn" onClick={onStaffLogin} title="Đăng nhập nhân viên"><i className="fas fa-lock"></i></button>
          </nav>

          <div className="portal-hero">
            <div className="portal-badge"><i className="fas fa-gem"></i> NỀN TẢNG BẤT ĐỘNG SẢN CAO CẤP HÀNG ĐẦU</div>
            <h1>Khám Phá Bất Động Sản Xứng Tầm</h1>
            <p>Nhà phố, biệt thự, căn hộ cao cấp và mặt bằng thương mại đắc địa — 100% nguồn hàng xác thực &amp; pháp lý minh bạch.</p>
          </div>

          <div className="portal-search">
            <div className="form-group">
              <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
              <input className="filter-input" value={filters.q} placeholder="Tiêu đề, khu vực, mã BĐS…" onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
            </div>
            <SearchableDropdown label="Thành phố" icon="fas fa-city"
              options={locs.filter((l) => l.level === 'City').map((c) => ({ value: c.name, label: c.name }))}
              value={filters.city} onChange={(v) => setFilters({ ...filters, city: v })} placeholder="Tất cả" />
            <SearchableDropdown label="Loại hình" icon="fas fa-house"
              options={opts(ENUMS.propertyType).map(o => ({ value: o.value, label: viEnum(o.value) || o.label }))} value={filters.type} onChange={(v) => setFilters({ ...filters, type: v })} placeholder="Tất cả" />
            <div className="form-group">
              <label><i className="fas fa-money-bill"></i> Giá tối thiểu</label>
              <input className="filter-input" type="number" min="0" value={filters.minPrice} placeholder="Bất kỳ" onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label><i className="fas fa-money-bill"></i> Giá tối đa</label>
              <input className="filter-input" type="number" min="0" value={filters.maxPrice} placeholder="Bất kỳ" onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} />
            </div>
            <SearchableDropdown label="Số phòng" icon="fas fa-bed"
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: n + '+ phòng' }))} value={filters.beds} onChange={(v) => setFilters({ ...filters, beds: v })} placeholder="Bất kỳ" />
            <SearchableDropdown label="Sắp xếp" icon="fas fa-arrow-down-wide-short"
              options={[{ value: '', label: 'Mới nhất' }, { value: 'plow', label: 'Giá: Thấp → Cao' }, { value: 'phigh', label: 'Giá: Cao → Thấp' }]}
              value={filters.sort} onChange={(v) => setFilters({ ...filters, sort: v })} placeholder="Mới nhất" />
          </div>

          <div className="portal-body">
            <div className="portal-sec-h">
              <div className="lt-tabs">
                <button className={lt === '' ? 'on' : ''} onClick={() => setLt('')}>Tất cả</button>
                <button className={lt === 'Sale' ? 'on' : ''} onClick={() => setLt('Sale')}>Mua bán</button>
                <button className={lt === 'Rent' ? 'on' : ''} onClick={() => setLt('Rent')}>Cho thuê</button>
              </div>
              <span className="portal-count">{loading ? 'Loading…' : visible.length + ' bất động sản'}</span>
            </div>

            {loading && (
              <div className="prop-grid">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="prop-card" style={{ pointerEvents: 'none' }}>
                    <div className="skeleton" style={{ height: 178 }}></div>
                    <div className="prop-card-body">
                      <div className="skeleton" style={{ height: 22, width: '55%' }}></div>
                      <div className="skeleton" style={{ height: 15, width: '85%' }}></div>
                      <div className="skeleton" style={{ height: 13, width: '65%' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && !filtering && featured.length > 0 && (
              <>
                <div className="portal-sec-h" style={{ margin: '4px 0 14px' }}>
                  <h2><i className="fas fa-star" style={{ color: '#ffb703' }}></i> Bất động sản nổi bật</h2>
                </div>
                <div className="prop-grid" style={{ marginBottom: 28 }}>
                  {featured.map((p) => <PropCard key={p.id} p={p} onOpen={openDetail} />)}
                </div>
                <div className="portal-sec-h" style={{ margin: '4px 0 14px' }}>
                  <h2><i className="fas fa-building"></i> Tất cả bất động sản</h2>
                </div>
              </>
            )}

            {!loading && (visible.length === 0
              ? <div className="portal-empty"><i className="fas fa-house-circle-xmark"></i>Không tìm thấy bất động sản phù hợp — vui lòng thử điều chỉnh lại bộ lọc.</div>
              : <div className="prop-grid">{visible.map((p) => <PropCard key={p.id} p={p} onOpen={openDetail} />)}</div>)}
          </div>

          <footer className="portal-footer">
            <strong>{(portal && portal.branding && portal.branding.name) || 'Hệ thống CRM'}</strong>
            {(portal && portal.branding && portal.branding.slogan) ? ` — ${portal.branding.slogan}` : ' — Cổng thông tin bất động sản.'}
          </footer>

          {detail && <PortalDetail prop={detail} all={props} onOpen={openDetail} onClose={() => setDetail(null)} />}
        </div>
      );
    }

    // ============== Main Content Router ==============
    function MainContent({ activeMenu, user, email, role, perms, canEditRbac, onSettingsUpdate, setActiveMenu, deepSearch }) {
      const seed = (p) => (deepSearch && deepSearch.page === p ? deepSearch.term : ''); // 360-search term for this page
      switch (activeMenu) {
        case 'dashboard':
          return can(perms, 'dashboard', 'v') ? <DashboardView currentUser={user} setActiveMenu={setActiveMenu} /> : <NoAccessView />;
        case 'ai':
          return can(perms, 'ai', 'v') || role === 'Admin' ? <AiChatView currentUser={user} role={role} /> : <NoAccessView />;
        case 'properties':
          return can(perms, 'properties', 'v') ? <PropertiesView currentUser={user} role={role} perms={perms} initialSearch={seed('properties')} /> : <NoAccessView />;
        case 'leads':
          return can(perms, 'leads', 'v') ? <LeadsView currentUser={user} role={role} perms={perms} initialSearch={seed('leads')} /> : <NoAccessView />;
        case 'followups':
          return can(perms, 'followups', 'v') ? <FollowUpsView currentUser={user} role={role} perms={perms} initialSearch={seed('followups')} /> : <NoAccessView />;
        case 'appointments':
          return can(perms, 'appointments', 'v') ? <AppointmentsView currentUser={user} role={role} perms={perms} initialSearch={seed('appointments')} /> : <NoAccessView />;
        case 'deals':
          return can(perms, 'deals', 'v') ? <DealsView currentUser={user} role={role} perms={perms} initialSearch={seed('deals')} /> : <NoAccessView />;
        case 'tenancies':
          return can(perms, 'tenancies', 'v') ? <TenanciesView currentUser={user} role={role} perms={perms} initialSearch={seed('tenancies')} /> : <NoAccessView />;
        case 'agreements':
          return can(perms, 'agreements', 'v') || role === 'Admin' ? <AgreementsView currentUser={user} role={role} perms={perms} /> : <NoAccessView />;
        case 'reports':
          return can(perms, 'reports', 'v') ? <ReportsView currentUser={user} role={role} /> : <NoAccessView />;
        case 'owners':
          return can(perms, 'owners', 'v') ? <OwnersView currentUser={user} role={role} perms={perms} initialSearch={seed('owners')} /> : <NoAccessView />;
        case 'trash':
          return role === 'Admin' ? <TrashView currentUser={user} /> : <NoAccessView />;
        case 'locations':
          return can(perms, 'locations', 'v') ? <LocationsView currentUser={user} role={role} perms={perms} initialSearch={seed('locations')} /> : <NoAccessView />;
        case 'amenities':
          return can(perms, 'amenities', 'v') ? <AmenitiesView currentUser={user} role={role} perms={perms} initialSearch={seed('amenities')} /> : <NoAccessView />;
        case 'about':
          return <AboutView role={role} />;
        case 'users':
          return can(perms, 'users', 'v') ? <UsersView currentUser={user} perms={perms} initialSearch={seed('users')} /> : <NoAccessView />;
        case 'settings':
          return can(perms, 'settings', 'v') ? <SettingsView currentUser={user} role={role} onSettingsUpdate={onSettingsUpdate} /> : <NoAccessView />;
        case 'logs':
          return can(perms, 'logs', 'v') ? <LogsView currentUser={user} initialSearch={seed('logs')} /> : <NoAccessView />;
        case 'permissions':
          return canEditRbac ? <PermissionsMatrixView currentUser={user} /> : <NoAccessView />;
        case 'account':
          return <AccountView currentUser={user} currentEmail={email} role={role} />;
        default:
          return <NoAccessView />;
      }
    }

    // ============== Dashboard Layout ==============
    function Dashboard({ user, email, role, profileImage, themeMode, permissions, canEditRbac, onThemeToggle, onSettingsUpdate, onLogout }) {
      const firstPage = can(permissions, 'dashboard', 'v') ? 'dashboard' : (can(permissions, 'settings', 'v') ? 'settings' : 'account');
      const [activeMenu, setActiveMenu] = useState(firstPage);
      const [deepSearch, setDeepSearch] = useState({ page: '', term: '' }); // seeds destination filter on a 360-search jump
      const go   = (page) => { setActiveMenu(page); setDeepSearch({ page: '', term: '' }); };                 // plain nav — clears the seed
      const jump = (page, term) => { setActiveMenu(page); setDeepSearch({ page: page, term: term || '' }); }; // search nav — carries the term
      const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch (e) { return false; }
      });
      const [showMobileSidebar, setShowMobileSidebar] = useState(false);

      // Quản lý danh sách phân hệ được ghim trên thanh đáy của từng người dùng
      const [pinnedTabs, setPinnedTabs] = useState(() => {
        try {
          const saved = localStorage.getItem('crm_pinned_tabs_' + user);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          }
        } catch (e) {}
        return ['dashboard', 'leads', 'properties', 'appointments'];
      });

      const handleTogglePin = (key) => {
        setPinnedTabs((prev) => {
          let updated;
          if (prev.includes(key)) {
            if (prev.length <= 1) {
              if (window.Swal) Swal.fire({ icon: 'warning', title: 'Cần giữ lại ít nhất 1 phân hệ trên thanh đáy', timer: 1500, showConfirmButton: false });
              return prev;
            }
            updated = prev.filter(k => k !== key);
          } else {
            if (prev.length >= 4) {
              if (window.Swal) Swal.fire({ icon: 'info', title: 'Tối đa 4 phân hệ được ghim', text: 'Vui lòng bỏ ghim bớt một mục trước khi ghim thêm', timer: 2000, showConfirmButton: false });
              return prev;
            }
            updated = [...prev, key];
          }
          // 1. Lưu tức thì trên máy hiện tại
          try { localStorage.setItem('crm_pinned_tabs_' + user, JSON.stringify(updated)); } catch (e) {}
          // 2. Đồng bộ vĩnh viễn lên cơ sở dữ liệu Supabase theo tài khoản người dùng
          gsRun('updateUserSettings', user, { pinnedTabs: updated }).catch(() => {});
          return updated;
        });
      };

      useEffect(() => {
        try { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0'); } catch (e) {}
      }, [collapsed]);

      const pageMeta = PAGE_META[activeMenu] || { label: 'Dashboard', icon: 'fa-tachometer-alt' };

      return (
        <>
          <div className={`sidebar-overlay ${showMobileSidebar ? 'show' : ''}`} onClick={() => setShowMobileSidebar(false)}></div>

          <div className="app-container">
            <Sidebar
              activeMenu={activeMenu}
              setActiveMenu={go}
              role={role}
              user={user}
              profileImage={profileImage}
              themeMode={themeMode}
              onThemeToggle={onThemeToggle}
              onLogout={onLogout}
              collapsed={collapsed}
              setCollapsed={setCollapsed}
              showMobile={showMobileSidebar}
              setShowMobile={setShowMobileSidebar}
              perms={permissions}
              canEditRbac={canEditRbac}
            />
            <div className="main-content">
              <div className="header">
                <h1>
                  <i className={`fas ${pageMeta.icon}`}></i> {pageMeta.label}
                </h1>
                <div className="hdr-actions">
                  <HeaderPageActions />
                  <GlobalSearch currentUser={user} perms={permissions} canEditRbac={canEditRbac} jump={jump} />
                  <HeaderThemeMenu currentUser={user} themeMode={themeMode} onThemeToggle={onThemeToggle} onSettingsUpdate={onSettingsUpdate} />
                  <ClearCacheButton />
                  <NotificationBell currentUser={user} perms={permissions} setActiveMenu={go} />
                  <div className="header-welcome">Xin chào, {user}</div>
                </div>
              </div>
              <MainContent
                activeMenu={activeMenu}
                user={user}
                email={email}
                role={role}
                perms={permissions}
                canEditRbac={canEditRbac}
                onSettingsUpdate={onSettingsUpdate}
                setActiveMenu={go}
                deepSearch={deepSearch}
              />
            </div>
          </div>

          <BottomNavigation
            activeMenu={activeMenu}
            setActiveMenu={go}
            perms={permissions}
            setShowMobileSidebar={setShowMobileSidebar}
            pinnedTabs={pinnedTabs}
          />

          {/* Trang Trung Tâm Phân Hệ Toàn Màn Hình Mobile */}
          <MobileModulesHub
            isOpen={showMobileSidebar}
            onClose={() => setShowMobileSidebar(false)}
            activeMenu={activeMenu}
            setActiveMenu={go}
            role={role}
            user={user}
            profileImage={profileImage}
            themeMode={themeMode}
            onThemeToggle={onThemeToggle}
            onLogout={onLogout}
            perms={permissions}
            canEditRbac={canEditRbac}
            pinnedTabs={pinnedTabs}
            onTogglePin={handleTogglePin}
          />
        </>
      );
    }

    // ============== Main App ==============
    function App() {
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const [currentUser, setCurrentUser] = useState(null);
      const [currentEmail, setCurrentEmail] = useState(null);
      const [userRole, setUserRole] = useState(null);
      const [profileImage, setProfileImage] = useState('');
      const [themeMode, setThemeMode] = useState('light');
      const [customColors, setCustomColors] = useState('');
      const [permissions, setPermissions] = useState(null);
      const [canEditRbac, setCanEditRbac] = useState(false);
      const [showLogin, setShowLogin] = useState(false); // public portal is the default pre-login surface

      // Unified modal behavior: clicking the dark backdrop invokes that popup's existing close button.
      useEffect(() => {
        const closeOnBackdrop = (event) => {
          const overlay = event.target;
          if (!overlay || !overlay.classList || !overlay.classList.contains('modal-overlay')) return;
          const closeButton = overlay.querySelector(':scope > .modal > .modal-header .close-btn')
            || overlay.querySelector(':scope > .modal > .form-actions .btn-secondary');
          if (closeButton) closeButton.click();
        };
        document.addEventListener('click', closeOnBackdrop);
        return () => document.removeEventListener('click', closeOnBackdrop);
      }, []);

      // first-run tour — once per user
      const [tour, setTour] = useState(false);
      useEffect(() => {
        if (isLoggedIn && currentUser && !localStorage.getItem('ai_tour_' + currentUser)) setTour(true);
      }, [isLoggedIn, currentUser]);
      const closeTour = () => { setTour(false); try { localStorage.setItem('ai_tour_' + currentUser, '1'); } catch (e) {} };

      const SESSION_DURATION = 60 * 60 * 1000;

      const applyTheme = (mode) => {
        if (mode === 'dark') {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      };

      const applyCustomColors = (colors) => {
        if (!colors) return;
        try {
          const o = JSON.parse(colors);
          if (o.vars) { applyThemeVars(o.vars); cacheThemeVars(o.vars); return; } // preset theme
          // legacy 3-color shape
          const root = document.documentElement;
          o.primary && root.style.setProperty('--navy-primary', o.primary);
          o.accent && root.style.setProperty('--navy-accent', o.accent);
          o.text && root.style.setProperty('--text-primary', o.text);
        } catch (e) {}
      };

      useEffect(() => {
        applyTheme(themeMode);
        applyCustomColors(customColors);
      }, [themeMode, customColors]);

      useEffect(() => {
        const checkSession = () => {
          try {
            const session = localStorage.getItem('userSession');
            if (session) {
              const sessionData = JSON.parse(session);
              const currentTime = new Date().getTime();
              const sessionAge = currentTime - sessionData.loginTime;

              if (sessionAge < SESSION_DURATION) {
                setIsLoggedIn(true);
                setCurrentUser(sessionData.username);
                setCurrentEmail(sessionData.email);
                setUserRole(sessionData.role);
                setProfileImage(sessionData.profileImage || '');
                setThemeMode(sessionData.themeMode || 'light');
                setCustomColors(sessionData.customColors || '');
                setPermissions(sessionData.permissions || null);
                setCanEditRbac(!!sessionData.canEditRbac);
                // refresh perms from server (may have changed since login)
                gsRun('getMyPermissions', sessionData.username).then((r) => {
                  if (r && r.success) {
                    setPermissions(r.perms);
                    setCanEditRbac(!!r.canEdit);
                    try {
                      const s = JSON.parse(localStorage.getItem('userSession') || '{}');
                      s.permissions = r.perms; s.canEditRbac = !!r.canEdit;
                      localStorage.setItem('userSession', JSON.stringify(s));
                    } catch (e) {}
                  }
                }).catch(() => {});
              } else {
                localStorage.removeItem('userSession');
              }
            }
          } catch (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('userSession');
          }
        };

        checkSession();

        const sessionCheckInterval = setInterval(() => {
          const session = localStorage.getItem('userSession');
          if (session) {
            const sessionData = JSON.parse(session);
            const currentTime = new Date().getTime();
            const sessionAge = currentTime - sessionData.loginTime;

            if (sessionAge >= SESSION_DURATION) {
              localStorage.removeItem('userSession');
              _swr.data.clear(); _swr.inflight.clear(); _swr.fetchers.clear(); // cached role-scoped data must not leak into the next login
              setIsLoggedIn(false);
              setCurrentUser(null);
              setCurrentEmail(null);
              setUserRole(null);
              Swal.fire({
                icon: 'warning',
                title: 'Session Expired',
                text: 'Your session has expired. Please login again.',
                confirmButtonColor: 'var(--navy-primary)'
              });
            }
          }
        }, 60000);

        return () => clearInterval(sessionCheckInterval);
      }, []);

      const handleLogin = (username, role, email, profileImg, theme, colors, perms, canEdit, authSession) => {
        const sessionData = {
          username, role, email,
          profileImage: profileImg || '',
          themeMode: theme || 'light',
          customColors: colors || '',
          permissions: perms || null,
          canEditRbac: !!canEdit,
          authSession: authSession || null,
          loginTime: new Date().getTime()
        };

        localStorage.setItem('userSession', JSON.stringify(sessionData));

        setIsLoggedIn(true);
        setCurrentUser(username);
        setCurrentEmail(email);
        setUserRole(role);
        setProfileImage(profileImg || '');
        setThemeMode(theme || 'light');
        setCustomColors(colors || '');
        setPermissions(perms || null);
        setCanEditRbac(!!canEdit);
      };

      const handleThemeToggle = () => {
        const newTheme = themeMode === 'light' ? 'dark' : 'light';
        setThemeMode(newTheme);

        google.script.run
          .withSuccessHandler(() => {
            const session = JSON.parse(localStorage.getItem('userSession'));
            session.themeMode = newTheme;
            localStorage.setItem('userSession', JSON.stringify(session));
          })
          .updateUserSettings(currentUser, { themeMode: newTheme });
      };

      const handleSettingsUpdate = () => {
        google.script.run
          .withSuccessHandler((result) => {
            if (result.success) {
              const settings = result.settings;
              setProfileImage(settings.profileImage);
              setThemeMode(settings.themeMode);
              setCustomColors(settings.customColors);

              const session = JSON.parse(localStorage.getItem('userSession'));
              session.profileImage = settings.profileImage;
              session.themeMode = settings.themeMode;
              session.customColors = settings.customColors;
              localStorage.setItem('userSession', JSON.stringify(session));
            }
          })
          .getUserSettings(currentUser);
      };

      const handleLogout = () => {
        Swal.fire({
          icon: 'question',
          title: 'Logout?',
          text: 'Are you sure you want to logout?',
          showCancelButton: true,
          confirmButtonColor: 'var(--navy-primary)',
          confirmButtonText: 'Yes, Logout'
        }).then((result) => {
          if (result.isConfirmed) {
            localStorage.removeItem('userSession');
            _swr.data.clear(); _swr.inflight.clear(); _swr.fetchers.clear(); // next login starts with a cold cache — no cross-user flash
            setIsLoggedIn(false);
            setCurrentUser(null);
            setCurrentEmail(null);
            setUserRole(null);
            setProfileImage('');
            setThemeMode('light');
            setCustomColors('');
            setPermissions(null);
            setCanEditRbac(false);
            document.body.classList.remove('dark-mode');

            Swal.fire({
              icon: 'success',
              title: 'Logged Out',
              text: 'You have been logged out successfully.',
              timer: 1500,
              showConfirmButton: false
            });
          }
        });
      };

      return (
        <div>
          <GlobalLoadingBar />
          <ProcessingOverlay profileImage={profileImage} />
          {isLoggedIn && tour && <TourModal role={userRole} onClose={closeTour} />}
          {!isLoggedIn ? (
            showLogin
              ? <LoginPage onLogin={(...a) => { setShowLogin(false); handleLogin(...a); }} onBack={() => setShowLogin(false)} />
              : <PublicPortal onStaffLogin={() => setShowLogin(true)} />
          ) : (
            <Dashboard
              user={currentUser}
              email={currentEmail}
              role={userRole}
              profileImage={profileImage}
              themeMode={themeMode}
              permissions={permissions}
              canEditRbac={canEditRbac}
              onThemeToggle={handleThemeToggle}
              onSettingsUpdate={handleSettingsUpdate}
              onLogout={handleLogout}
            />
          )}
        </div>
      );
    }

    // ============== Render App ==============
    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  