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
          title: 'Đăng xuất?',
          text: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
          showCancelButton: true,
          confirmButtonColor: '#001f3f',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Đăng xuất',
          cancelButtonText: 'Hủy'
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
              title: 'Đã đăng xuất',
              text: 'Bạn đã đăng xuất thành công khỏi hệ thống.',
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
  