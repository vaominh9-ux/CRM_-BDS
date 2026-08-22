    // ============== Users Management (Admin Only) ==============
    function UsersView({ currentUser, perms, initialSearch }) {
      const canAdd = can(perms, 'users', 'a');
      const canEdit = can(perms, 'users', 'e');
      const canDel = can(perms, 'users', 'd');
      const { data: res, error, mutate } = useSWR('users:all', () => gsRun('getAllUsers', currentUser), SWR_LIVE);
      const rows = res ? (res.success ? res.data : []) : undefined;
      const loading = rows === undefined && !error;
      const [showModal, setShowModal] = useState(false);
      const [editingUser, setEditingUser] = useState(null);
      const [reassigning, setReassigning] = useState(null); // offboarding: move a user's whole book to someone else
      const [showFilterDrawer, setShowFilterDrawer] = useState(false);
      const tableInstanceRef = useRef(null);

      const [filters, setFilters] = useState({ role: '', status: '', search: initialSearch || '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]); // seed from 360 search

      const counts = useMemo(() => {
        const o = { Admin: 0, Manager: 0, Agent: 0 };
        (rows || []).forEach((u) => { if (o[u.Role] !== undefined) o[u.Role]++; });
        return o;
      }, [rows]);

      const visible = useMemo(() => {
        const q = String(filters.search || '').trim().toLowerCase();
        return (rows || []).filter((u) => {
          if (filters.role && u.Role !== filters.role) return false;
          if (filters.status && u.Status !== filters.status) return false;
          if (q && ![u.Username, u.Email, u.Role, u.Status, viEnum(u.Role), viEnum(u.Status)].some((val) => String(val || '').toLowerCase().includes(q))) return false;
          return true;
        });
      }, [rows, filters.role, filters.status, filters.search]);
      const activeFiltersCount = (filters.search ? 1 : 0) + (filters.role ? 1 : 0) + (filters.status ? 1 : 0);

      // kpi from cached rows — [value, label, icon, color]
      const kpi = useMemo(() => {
        const list = rows || [], active = list.filter((u) => u.Status === 'Active').length;
        return [
          [list.length,          'Tổng người dùng',   'fa-users',       'bg-navy'],
          [active,               'Đang hoạt động',    'fa-user-check',  'bg-success'],
          [list.length - active, 'Ngừng hoạt động',   'fa-user-clock',  'bg-warning'],
          [list.filter((u) => u.Role === 'Admin').length, 'Quản trị viên', 'fa-user-shield', 'bg-info'],
        ];
      }, [rows]);

      // surface a server error (e.g. access denied) once
      useEffect(() => {
        if (res && !res.success) Swal.fire({ icon: 'error', title: 'Lỗi', text: res.message || 'Không thể tải danh sách người dùng' });
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
          if (rows.length < 2) { done(); return Swal.fire({ icon: 'error', title: 'Nhập CSV', text: 'Tệp CSV trống hoặc thiếu dòng tiêu đề' }); }
          const headers = rows[0].map((h) => h.replace(/^\uFEFF/, '').trim()); // strip BOM
          if (headers.indexOf('Username') === -1) { done(); return Swal.fire({ icon: 'error', title: 'Nhập CSV', text: 'Thiếu cột Username — tải tệp mẫu để xem cấu trúc chuẩn' }); }
          const records = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] || '').trim()])));
          Swal.fire({ icon: 'question', title: `Nhập ${records.length} người dùng?`, text: 'Các dòng không hợp lệ sẽ tự động bỏ qua.',
                      showCancelButton: true, confirmButtonText: 'Nhập ngay', confirmButtonColor: '#001f3f' })
            .then((cf) => {
              if (!cf.isConfirmed) return done();
              gsRun('bulkImportUsers', records, currentUser).then((res) => {
                done();
                if (!res || !res.success) return Swal.fire({ icon: 'error', title: 'Nhập thất bại', text: (res && res.message) || 'Thao tác thất bại' });
                mutate(); // refetch list
                const skipped = (res.errors || []).length;
                if (skipped) console.warn('Import errors:', res.errors);
                Swal.fire({ icon: 'success', title: 'Nhập hoàn tất', text: `Đã nhập thành công ${res.count} tài khoản${skipped ? ', bỏ qua ' + skipped + ' dòng' : ''}` });
              }).catch(() => { done(); Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Nhập thất bại' }); });
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
                { data: 'Username', title: 'Tên đăng nhập', render: (d) => '<strong>' + esc(d) + '</strong>' },
                { data: 'Email', title: 'Email' },
                { data: 'Role', title: 'Vai trò', render: (d) => roleBadge(d) },
                {
                  data: 'Status',
                  title: 'Trạng thái',
                  render: (d) => `<span class="status-badge ${d === 'Active' ? 'st-green' : 'st-gray'}">${viEnum(d) || d}</span>`
                },
                {
                  data: 'CreatedAt',
                  title: 'Ngày tạo',
                  render: (d) => fmtDate(d)
                },
                {
                  data: null,
                  title: 'Thao tác',
                  orderable: false,
                  className: 'dt-actions actions-3',
                  width: '106px',
                  render: (d, t, row) => `<div class="table-actions slots-3">
                    ${canEdit ? `<button class="action-icon edit-icon" data-action="edit" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>` : ''}
                    ${canDel ? `<button class="action-icon assign-icon" data-action="reassign" title="Chuyển giao việc"><i class="fas fa-people-arrows"></i></button>` : ''}
                    ${canDel ? `<button class="action-icon delete-icon" data-action="delete" title="Ngừng hoạt động"><i class="fas fa-user-slash"></i></button>` : ''}
                    ${!canEdit && !canDel ? '<span style="color:#999;">—</span>' : ''}
                  </div>`
                }
              ],
              pageLength: 10,
              lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, "Tất cả"]],
              responsive: true,
              columnDefs: [{ targets: '_all', defaultContent: '' }], // missing keys render blank, never warn
              dom: 'lfrtip', // no B — buttons render in the page header, fired via buttons API
              buttons: [
                { extend: 'csv',   text: 'CSV',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'pdf',   text: 'PDF',   exportOptions: { columns: ':not(:last-child)' } },
                { extend: 'print', text: 'In', exportOptions: { columns: ':not(:last-child)' } }
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
            Swal.fire({ icon: 'error', title: 'Lỗi', text: 'Không thể khởi tạo bảng: ' + e.message });
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
                title: 'Thành công!',
                text: result.message,
                timer: 2000,
                showConfirmButton: false
              });
              mutate();                  // refresh users list
              swrMutate('dash:stats');   // + dashboard KPIs
            } else {
              Swal.fire({ icon: 'error', title: 'Lỗi', text: result.message });
            }
          })
          .withFailureHandler((err) => {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
          })
          [action](...params);
      };

      const handleDelete = (user) => {
        const isCurrentlyActive = user.Status === 'Active';
        Swal.fire({
          icon: 'warning',
          title: isCurrentlyActive ? 'Khóa tài khoản người dùng?' : 'Kích hoạt lại tài khoản?',
          text: isCurrentlyActive ? `"${user.Username}" sẽ bị ngừng hoạt động — chặn đăng nhập, bảo toàn toàn bộ lịch sử và phân công khách. Bạn có thể kích hoạt lại sau.` : `Kích hoạt lại tài khoản "${user.Username}" để cho phép đăng nhập lại hệ thống?`,
          showCancelButton: true,
          confirmButtonColor: isCurrentlyActive ? '#ea4335' : '#16a34a',
          confirmButtonText: isCurrentlyActive ? 'Khóa tài khoản' : 'Kích hoạt lại',
          cancelButtonText: 'Hủy'
        }).then((result) => {
          if (result.isConfirmed) {
            google.script.run
              .withSuccessHandler((r) => {
                if (r.success) {
                  mutate();
                  swrMutate('dash:stats');
                  if (r.openLeads > 0) { // offboarding: offer the one-action reassign right away
                    Swal.fire({ icon: 'warning', title: 'Đã khóa tài khoản', text: r.openLeads + ' khách tiềm năng đang giao cho người này — bạn có muốn chuyển giao công việc ngay không?',
                                showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Chuyển việc ngay', cancelButtonText: 'Để sau' })
                      .then((rr) => { if (rr.isConfirmed) setReassigning(user); });
                  } else {
                    Swal.fire({ icon: 'success', text: r.message, timer: 2000, showConfirmButton: false });
                  }
                } else {
                  Swal.fire({ icon: 'error', title: 'Lỗi', text: r.message });
                }
              })
              .withFailureHandler((err) => {
                Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
              })
              .deleteUser(user.Username, currentUser);
          }
        });
      };

      return (
        <>
          <KpiRow items={kpi} />

          {/* 1. Mobile Horizontally Scrollable Role Pills */}
          <div className="mob-pipeline-bar">
            <div className="mob-pills-scroll">
              <button
                className={'mob-pill ' + (!filters.role ? 'active' : '')}
                onClick={() => setFilters((f) => ({ ...f, role: '' }))}
              >
                <span>Tất cả vai trò</span>
                <span className="mob-pill-badge">{(rows || []).length}</span>
              </button>
              {['Admin', 'Manager', 'Agent'].map((r) => {
                const count = counts[r] || 0;
                const col = r === 'Admin' ? '#dc2626' : r === 'Manager' ? '#0284c7' : '#16a34a';
                return (
                  <button
                    key={r}
                    className={'mob-pill ' + (filters.role === r ? 'active' : '') + (count === 0 ? ' empty' : '')}
                    onClick={() => setFilters((f) => ({ ...f, role: f.role === r ? '' : r }))}
                  >
                    <span className="mob-pill-dot" style={{ background: col }}></span>
                    <span>{viEnum(r)}</span>
                    <span className="mob-pill-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Mobile Sub-Toolbar */}
          <div className="mob-users-sub-toolbar">
            <div className="mob-sub-toolbar-left">
              <span className="mob-sub-count">
                <strong>{visible.length}</strong> Người dùng {filters.role ? `· ${viEnum(filters.role)}` : ''}
              </span>
            </div>
            <div className="mob-sub-toolbar-right">
              {canAdd && (
                <button className="mob-tool-btn mob-tool-btn-primary" onClick={() => { setEditingUser(null); setShowModal(true); }} title="Thêm người dùng">
                  <i className="fas fa-plus"></i>
                </button>
              )}
              <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc người dùng">
                <i className="fas fa-sliders"></i>
                {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
              </button>
            </div>
          </div>

          {/* 3. Desktop Filters Section */}
          <div className="filters-section desk-filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Bộ lọc</h3>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                <i className="fas fa-rotate-left"></i> Xóa
              </button>
            </div>
            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  placeholder="Tên đăng nhập, email…"
                  className="filter-input"
                />
              </div>
              <SearchableDropdown label="Vai trò" icon="fas fa-user-tag"
                options={opts(['Admin', 'Manager', 'Agent'])}
                value={filters.role} onChange={(v) => setFilters({ ...filters, role: v })} placeholder="Tất cả vai trò" />
              <SearchableDropdown label="Trạng thái" icon="fas fa-toggle-on"
                options={opts(['Active', 'Inactive'])}
                value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} placeholder="Tất cả trạng thái" />
            </div>
          </div>

          {/* 4. Data Section: Desktop Table & Mobile Luxury Cards */}
          <div className="data-section">
            {/* hidden — opened by the Import CSV toolbar button */}
            <input type="file" id="usersCsvImport" accept=".csv" style={{display: 'none'}} onChange={handleImport} />

            {/* Desktop Table View */}
            <div className="desk-users-table-wrap">
              {loading ? <TableSkeleton rows={8} columns={6} /> : (
                <div style={{ overflowX: 'auto' }}><table id="usersTable" className="display" style={{width: '100%'}}></table></div>
              )}
            </div>

            {/* Mobile Luxury Cards List View */}
            <div className="mob-users-cards-container">
              {loading ? (
                <div className="mob-users-skeleton-list">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mob-user-card-skeleton">
                      <div className="sk-line w50"></div>
                      <div className="sk-line w80"></div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="mob-users-empty-state">
                  <div className="empty-circle"><i className="fas fa-users-slash"></i></div>
                  <h4>Chưa có người dùng phù hợp</h4>
                  <p>Thử tìm kiếm từ khóa khác hoặc thêm tài khoản mới</p>
                  {canAdd && (
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { setEditingUser(null); setShowModal(true); }}>
                      <i className="fas fa-plus"></i> Thêm người dùng
                    </button>
                  )}
                </div>
              ) : (
                visible.map((u) => {
                  const roleClass = (u.Role || 'agent').toLowerCase();
                  const isActive = u.Status === 'Active';
                  return (
                    <div key={u.Username} className={'mob-user-card role-' + roleClass}>
                      {/* HÀNG 1: Avatar + Tên người dùng + Huy hiệu vai trò & Trạng thái */}
                      <div className="mob-user-header-row">
                        <div className="mob-lead-avatar" style={{ background: getLeadAvatarColor(u.Username) }}>
                          {getLeadInitials(u.Username)}
                        </div>
                        <div className="mob-user-info">
                          <div className="mob-user-name">
                            <strong>{u.Username}</strong>
                            <span className={'mob-user-role-badge ' + roleClass}>
                              {viEnum(u.Role) || u.Role}
                            </span>
                          </div>
                          <div className="mob-user-email">
                            <i className="fas fa-envelope"></i> {u.Email || 'Chưa có email'}
                          </div>
                        </div>
                        <span className={'status-badge ' + (isActive ? 'st-green' : 'st-gray')}>
                          {viEnum(u.Status) || u.Status}
                        </span>
                      </div>

                      {/* HÀNG 2: Mục tiêu tháng & Ngày tạo tài khoản */}
                      <div className="mob-user-meta-row">
                        <div className="mob-user-target">
                          <i className="fas fa-bullseye"></i> Mục tiêu: <strong>{u.MonthlyTarget > 0 ? fmtPKR(u.MonthlyTarget) : 'Không đặt'}</strong>
                        </div>
                        <div className="mob-user-date">
                          <i className="fas fa-calendar"></i> {fmtDate(u.CreatedAt)}
                        </div>
                      </div>

                      {/* HÀNG 3: Các nút hành động 1-chạm */}
                      {(canEdit || canDel) && (
                        <div className="mob-user-actions">
                          {canEdit && (
                            <button className="mob-btn mob-btn-edit" onClick={() => { setEditingUser(u); setShowModal(true); }} title="Chỉnh sửa tài khoản">
                              <i className="fas fa-pen-to-square"></i> Sửa
                            </button>
                          )}
                          {canDel && (
                            <button className="mob-btn mob-btn-reassign" onClick={() => setReassigning(u)} title="Chuyển giao việc">
                              <i className="fas fa-people-arrows"></i> Chuyển việc
                            </button>
                          )}
                          {canDel && (
                            <button className={'mob-btn ' + (isActive ? 'mob-btn-del' : 'mob-btn-activate')} onClick={() => handleDelete(u)} title={isActive ? 'Khóa tài khoản' : 'Kích hoạt lại'}>
                              <i className={'fas ' + (isActive ? 'fa-user-slash' : 'fa-user-check')}></i> {isActive ? 'Khóa' : 'Kích hoạt'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 5. Mobile Filter Drawer (Bottom Sheet) */}
          {showFilterDrawer && (
            <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
              <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mob-sheet-handle"></div>
                <div className="mob-sheet-header">
                  <h4><i className="fas fa-sliders"></i> Bộ lọc người dùng</h4>
                  <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
                </div>
                <div className="mob-sheet-body">
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm người dùng</label>
                    <input className="filter-input" value={filters.search} placeholder="Tên đăng nhập, email..." onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-user-tag"></i> Vai trò</label>
                    <select className="filter-input" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                      <option value="">Tất cả vai trò</option>
                      {['Admin', 'Manager', 'Agent'].map((r) => (
                        <option key={r} value={r}>{viEnum(r)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-toggle-on"></i> Trạng thái</label>
                    <select className="filter-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                      <option value="">Tất cả trạng thái</option>
                      {['Active', 'Inactive'].map((s) => (
                        <option key={s} value={s}>{viEnum(s)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mob-sheet-footer">
                  <button className="btn btn-secondary" onClick={() => { clearFilters(); setShowFilterDrawer(false); }}>
                    <i className="fas fa-rotate-left"></i> Đặt lại
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                    <i className="fas fa-check"></i> Áp dụng ({visible.length} Người dùng)
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </>
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
              html: '<small>Bất động sản: ' + (m.Properties || 0) + ' · Tiềm năng: ' + (m.Leads || 0) + ' · Chăm sóc: ' + (m.FollowUps || 0) + ' · Lịch hẹn: ' + (m.Appointments || 0) + '</small>' });
            onSaved();
          } else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Lỗi', text: String((err && err.message) || err) }); });
      };
      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal modal-reassign-form" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3><i className="fas fa-people-arrows"></i> Chuyển giao việc của "{fromUser.Username}"</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 14, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px dashed #e2e8f0' }}>
                <i className="fas fa-info-circle" style={{ color: '#0284c7' }}></i> Toàn bộ BĐS, khách tiềm năng, lịch chăm sóc và cuộc hẹn được phân công cho <strong>{fromUser.Username}</strong> sẽ chuyển sang người bạn chọn.
              </p>
              <form onSubmit={submit}>
                <SearchableDropdown label="Chuyển toàn bộ dữ liệu sang" icon="fas fa-user-tie"
                  options={targets.map((u) => ({ value: u.Username, label: u.Username + ' (' + viEnum(u.Role) + ')' }))}
                  value={toUser} onChange={setToUser} placeholder="Chọn nhân viên tiếp nhận…" required={true} />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !toUser}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang chuyển…</> : <><i className="fas fa-people-arrows"></i> Chuyển giao toàn bộ</>}
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
          <div className="modal modal-user-form" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>
                <i className={'fas ' + (user ? 'fa-user-pen' : 'fa-user-plus')}></i> {user ? 'Chỉnh sửa tài khoản' : 'Thêm người dùng mới'}
              </h3>
              <button className="close-btn" onClick={onClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Tên đăng nhập *</label>
                    <input
                      type="text"
                      value={formData.Username}
                      onChange={(e) => setFormData({...formData, Username: e.target.value})}
                      required
                      disabled={!!user}
                      placeholder="Ví dụ: agent_nam"
                    />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-envelope"></i> Email liên hệ *</label>
                    <input
                      type="email"
                      value={formData.Email}
                      onChange={(e) => setFormData({...formData, Email: e.target.value})}
                      required
                      placeholder="agent@company.com"
                    />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-key"></i> Mật khẩu {user ? '(để trống nếu giữ mật khẩu hiện tại)' : '*'}</label>
                    <input
                      type="password"
                      value={formData.Password}
                      onChange={(e) => setFormData({...formData, Password: e.target.value})}
                      required={!user}
                      autoComplete="new-password"
                      placeholder={user ? '••••••••' : 'Nhập mật khẩu...'}
                    />
                  </div>
                  <SearchableDropdown label="Vai trò hệ thống" icon="fas fa-user-shield"
                    options={opts(['Admin', 'Manager', 'Agent'])}
                    value={formData.Role} onChange={(v) => setFormData({ ...formData, Role: v })} placeholder="Chọn vai trò…" required={true} />
                  <SearchableDropdown label="Trạng thái tài khoản" icon="fas fa-toggle-on"
                    options={opts(['Active', 'Inactive'])}
                    value={formData.Status} onChange={(v) => setFormData({ ...formData, Status: v })} placeholder="Chọn trạng thái…" required={true} />
                  <div className="form-group">
                    <label><i className="fas fa-bullseye"></i> Mục tiêu doanh số tháng (VNĐ) <small style={{ color: '#64748b', textTransform: 'none' }}>(0 = không đặt mục tiêu)</small></label>
                    <input type="number" min="0" step="any" value={formData.MonthlyTarget}
                           onChange={(e) => setFormData({...formData, MonthlyTarget: e.target.value})} placeholder="Ví dụ: 100000000" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>
                    <i className="fas fa-times"></i> Hủy
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? (
                      <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                    ) : (
                      <><i className="fas fa-save"></i> {user ? 'Cập nhật tài khoản' : 'Lưu người dùng'}</>
                    )}
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
      const [showCurPass, setShowCurPass] = useState(false);
      const [showNewPass, setShowNewPass] = useState(false);
      const [showCfmPass, setShowCfmPass] = useState(false);
      const [saving, setSaving] = useState(false);
      const [savingPass, setSavingPass] = useState(false);
      const [uploading, setUploading] = useState(false);
      const fileInputRef = useRef(null);

      const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          Swal.fire({ icon: 'error', title: 'Định dạng không hợp lệ', text: 'Vui lòng chọn một tệp hình ảnh (PNG, JPG, WEBP)' });
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
                Swal.fire({ icon: 'error', title: 'Lỗi', text: result.message });
              }
            })
            .withFailureHandler((err) => {
              setUploading(false);
              Swal.fire({ icon: 'error', title: 'Lỗi tải ảnh', text: err.message });
            })
            .uploadFile(base64Data, file.name, 'profile');
        };
        reader.readAsDataURL(file);
      };

      const handleUpdateInfo = (e) => {
        e.preventDefault();
        setSaving(true);
        google.script.run
          .withSuccessHandler((result) => {
            setSaving(false);
            if (result.success) {
              Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Đã cập nhật thông tin tài khoản!',
                timer: 2000,
                showConfirmButton: false
              });
            } else {
              Swal.fire({ icon: 'error', title: 'Lỗi', text: result.message });
            }
          })
          .withFailureHandler((err) => {
            setSaving(false);
            Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
          })
          .updateMyAccount(currentUser, { Email: formData.Email });
      };

      const handleUpdatePassword = (e) => {
        e.preventDefault();

        if (!formData.CurrentPassword) {
          Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập mật khẩu hiện tại để xác thực!' });
          return;
        }

        if (!formData.NewPassword) {
          Swal.fire({ icon: 'warning', title: 'Thiếu thông tin', text: 'Vui lòng nhập mật khẩu mới!' });
          return;
        }

        if (formData.NewPassword !== formData.ConfirmPassword) {
          Swal.fire({ icon: 'error', title: 'Mật khẩu không khớp', text: 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới!' });
          return;
        }

        setSavingPass(true);
        google.script.run
          .withSuccessHandler((result) => {
            setSavingPass(false);
            if (result.success) {
              Swal.fire({
                icon: 'success',
                title: 'Thành công!',
                text: 'Mật khẩu đã được thay đổi thành công!',
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
              Swal.fire({ icon: 'error', title: 'Lỗi', text: result.message });
            }
          })
          .withFailureHandler((err) => {
            setSavingPass(false);
            Swal.fire({ icon: 'error', title: 'Lỗi', text: err.message });
          })
          .updateMyAccount(currentUser, formData);
      };

      return (
        <div className="profile-section mob-account-page">
          {/* HERO CARD: Avatar, Tên đăng nhập & Vai trò */}
          <div className="mob-account-hero-card">
            <div className="mob-account-avatar-wrapper">
              <div className="mob-account-avatar" style={{ background: getLeadAvatarColor(currentUser) }}>
                {getLeadInitials(currentUser)}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                className="mob-account-avatar-cam-btn"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
                title="Thay đổi ảnh đại diện"
              >
                <i className={'fas ' + (uploading ? 'fa-spinner fa-spin' : 'fa-camera')}></i>
              </button>
            </div>
            <div className="mob-account-hero-info">
              <h2 className="mob-account-hero-title">{currentUser}</h2>
              <div className="mob-account-hero-meta">
                <span className={'mob-user-role-badge ' + String(role || 'agent').toLowerCase()}>
                  {viEnum(role) || role}
                </span>
                <span className="mob-account-email-pill">
                  <i className="fas fa-envelope"></i> {formData.Email || 'Chưa có email'}
                </span>
              </div>
            </div>
          </div>

          <div className="mob-account-grid">
            {/* THẺ 1: THÔNG TIN CÁ NHÂN */}
            <div className="mob-account-card">
              <div className="mob-account-card-header">
                <div className="mob-account-header-icon info">
                  <i className="fas fa-id-card"></i>
                </div>
                <div>
                  <h3 className="mob-account-card-title">Thông tin tài khoản</h3>
                  <p className="mob-account-card-desc">Cập nhật địa chỉ email liên hệ nhận thông báo</p>
                </div>
              </div>

              <form onSubmit={handleUpdateInfo}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label><i className="fas fa-user-lock"></i> Tên đăng nhập</label>
                  <input
                    type="text"
                    value={currentUser}
                    disabled
                    className="filter-input"
                    style={{ background: '#f1f5f9', cursor: 'not-allowed', color: '#64748b' }}
                  />
                  <small style={{ color: '#94a3b8', fontSize: 11.5, marginTop: 4, display: 'block' }}>
                    <i className="fas fa-lock"></i> Tên đăng nhập là định danh cố định của hệ thống và không thể thay đổi.
                  </small>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label><i className="fas fa-envelope"></i> Địa chỉ Email *</label>
                  <input
                    type="email"
                    value={formData.Email}
                    onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                    required
                    className="filter-input"
                    placeholder="email@congty.com"
                  />
                </div>

                <button type="submit" className="btn btn-primary mob-account-save-btn" disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin"></i> Đang lưu...</>
                  ) : (
                    <><i className="fas fa-floppy-disk"></i> Cập nhật thông tin</>
                  )}
                </button>
              </form>
            </div>

            {/* THẺ 2: ĐỔI MẬT KHẨU */}
            <div className="mob-account-card">
              <div className="mob-account-card-header">
                <div className="mob-account-header-icon security">
                  <i className="fas fa-shield-halved"></i>
                </div>
                <div>
                  <h3 className="mob-account-card-title">Bảo mật & Mật khẩu</h3>
                  <p className="mob-account-card-desc">Thay đổi mật khẩu đăng nhập định kỳ để đảm bảo an toàn</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword}>
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label><i className="fas fa-key"></i> Mật khẩu hiện tại *</label>
                  <div className="mob-password-input-wrap">
                    <input
                      type={showCurPass ? 'text' : 'password'}
                      value={formData.CurrentPassword}
                      onChange={(e) => setFormData({ ...formData, CurrentPassword: e.target.value })}
                      required
                      autoComplete="current-password"
                      className="filter-input"
                      placeholder="Nhập mật khẩu hiện tại..."
                    />
                    <button
                      type="button"
                      className="mob-pwd-toggle-btn"
                      onClick={() => setShowCurPass(!showCurPass)}
                      tabIndex="-1"
                    >
                      <i className={'fas ' + (showCurPass ? 'fa-eye-slash' : 'fa-eye')}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label><i className="fas fa-lock"></i> Mật khẩu mới</label>
                  <div className="mob-password-input-wrap">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      value={formData.NewPassword}
                      onChange={(e) => setFormData({ ...formData, NewPassword: e.target.value })}
                      autoComplete="new-password"
                      className="filter-input"
                      placeholder="Nhập mật khẩu mới..."
                    />
                    <button
                      type="button"
                      className="mob-pwd-toggle-btn"
                      onClick={() => setShowNewPass(!showNewPass)}
                      tabIndex="-1"
                    >
                      <i className={'fas ' + (showNewPass ? 'fa-eye-slash' : 'fa-eye')}></i>
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                  <label><i className="fas fa-check-double"></i> Xác nhận mật khẩu mới</label>
                  <div className="mob-password-input-wrap">
                    <input
                      type={showCfmPass ? 'text' : 'password'}
                      value={formData.ConfirmPassword}
                      onChange={(e) => setFormData({ ...formData, ConfirmPassword: e.target.value })}
                      autoComplete="new-password"
                      className="filter-input"
                      placeholder="Nhập lại mật khẩu mới..."
                    />
                    <button
                      type="button"
                      className="mob-pwd-toggle-btn"
                      onClick={() => setShowCfmPass(!showCfmPass)}
                      tabIndex="-1"
                    >
                      <i className={'fas ' + (showCfmPass ? 'fa-eye-slash' : 'fa-eye')}></i>
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn btn-secondary mob-account-save-btn" disabled={savingPass || !formData.CurrentPassword || !formData.NewPassword}>
                  {savingPass ? (
                    <><i className="fas fa-spinner fa-spin"></i> Đang đổi mật khẩu...</>
                  ) : (
                    <><i className="fas fa-lock"></i> Đổi mật khẩu</>
                  )}
                </button>
              </form>
            </div>
          </div>
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
      const [filterCategory, setFilterCategory] = useState('');
      const [showFilterDrawer, setShowFilterDrawer] = useState(false);
      const [filters, setFilters] = useState({ search: initialSearch || '', user: '', action: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);

      const usersList = useMemo(() => {
        return Array.from(new Set((rows || []).map((l) => l.User).filter(Boolean))).sort();
      }, [rows]);

      const isToday = (t) => {
        try { const d = new Date(t); return !isNaN(d.getTime()) && d.toDateString() === new Date().toDateString(); } catch (e) { return false; }
      };

      const counts = useMemo(() => {
        const list = rows || [];
        return {
          all: list.length,
          today: list.filter((l) => isToday(l.Timestamp)).length,
          login: list.filter((l) => /login/i.test(l.Action || '')).length,
          add: list.filter((l) => /add|create|tạo|thêm/i.test(l.Action || '')).length,
          update: list.filter((l) => /update|edit|sửa|đổi|chuyển/i.test(l.Action || '')).length,
          delete: list.filter((l) => /delete|remove|xóa|khóa/i.test(l.Action || '')).length
        };
      }, [rows]);

      const visible = useMemo(() => {
        const q = String(filters.search || '').trim().toLowerCase();
        return (rows || []).filter((l) => {
          if (filters.user && l.User !== filters.user) return false;
          if (filters.action && l.Action !== filters.action) return false;
          if (filterCategory === 'today' && !isToday(l.Timestamp)) return false;
          if (filterCategory === 'login' && !/login/i.test(l.Action || '')) return false;
          if (filterCategory === 'add' && !/add|create|tạo|thêm/i.test(l.Action || '')) return false;
          if (filterCategory === 'update' && !/update|edit|sửa|đổi|chuyển/i.test(l.Action || '')) return false;
          if (filterCategory === 'delete' && !/delete|remove|xóa|khóa/i.test(l.Action || '')) return false;
          if (q) {
            const chgText = (l.Changes || []).map((c) => (c.f || '') + ' ' + (c.a || '') + ' ' + (c.b || '')).join(' ');
            if (![l.User, l.Action, l.Details, chgText].some((val) => String(val || '').toLowerCase().includes(q))) return false;
          }
          return true;
        });
      }, [rows, filterCategory, filters.user, filters.action, filters.search]);
      const activeFiltersCount = (filters.search ? 1 : 0) + (filters.user ? 1 : 0) + (filters.action ? 1 : 0) + (filterCategory ? 1 : 0);

      // kpi from cached rows — [value, label, icon, color]
      const kpi = useMemo(() => {
        const list = rows || [];
        return [
          [list.length, 'Tổng số hoạt động', 'fa-list-check', 'bg-navy'],
          [counts.today, 'Hoạt động hôm nay', 'fa-calendar-day', 'bg-success'],
          [new Set(list.map((l) => l.User).filter(Boolean)).size, 'Người dùng phát sinh', 'fa-user-group', 'bg-info'],
          [counts.login, 'Lượt đăng nhập', 'fa-right-to-bracket', 'bg-warning'],
        ];
      }, [rows, counts]);
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
                { data: 'User', title: 'Người dùng', render: (d) => '<strong>' + esc(d) + '</strong>' },
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
              pageLength: 10, lengthMenu: [[10, 25, 50, 100, -1], [10, 25, 50, 100, 'Tất cả']],
              responsive: true, order: [], dom: 'lfrtip', // no B — buttons live in the page header
              columnDefs: [{ targets: '_all', defaultContent: '' }], // missing keys render blank, never warn
              buttons: [
                { extend: 'csv', text: 'CSV' },
                { extend: 'pdf', text: 'PDF' },
                { extend: 'print', text: 'In' }
              ]
            });
            if (initialSearch) tableRef.current.search(initialSearch).draw();
          } catch (e) { console.error('Logs table error:', e); }
        }, 150);
      };

      const getLogIcon = (act) => {
        const a = String(act || '').toLowerCase();
        if (a.includes('login')) return { icon: 'fa-right-to-bracket', col: '#0284c7', bg: '#f0f9ff' };
        if (a.includes('add') || a.includes('create') || a.includes('tạo') || a.includes('thêm')) return { icon: 'fa-plus-circle', col: '#16a34a', bg: '#f0fdf4' };
        if (a.includes('update') || a.includes('edit') || a.includes('sửa') || a.includes('đổi') || a.includes('chuyển')) return { icon: 'fa-pen-to-square', col: '#d97706', bg: '#fffbeb' };
        if (a.includes('delete') || a.includes('remove') || a.includes('xóa') || a.includes('khóa')) return { icon: 'fa-trash-can', col: '#dc2626', bg: '#fef2f2' };
        return { icon: 'fa-bolt', col: '#7c3aed', bg: '#f5f3ff' };
      };

      const formatLogTime = (ts) => {
        if (!ts) return 'N/A';
        try {
          const d = new Date(ts);
          if (isNaN(d.getTime())) return String(ts);
          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return String(ts); }
      };

      return (
        <>
          <KpiRow items={kpi} />

          {/* 1. Mobile Horizontally Scrollable Action Category Pills */}
          <div className="mob-pipeline-bar">
            <div className="mob-pills-scroll">
              <button
                className={'mob-pill ' + (!filterCategory ? 'active' : '')}
                onClick={() => setFilterCategory('')}
              >
                <span>Tất cả</span>
                <span className="mob-pill-badge">{counts.all}</span>
              </button>
              <button
                className={'mob-pill ' + (filterCategory === 'today' ? 'active' : '') + (counts.today === 0 ? ' empty' : '')}
                onClick={() => setFilterCategory((c) => c === 'today' ? '' : 'today')}
              >
                <span className="mob-pill-dot" style={{ background: '#16a34a' }}></span>
                <span>Hôm nay</span>
                <span className="mob-pill-badge">{counts.today}</span>
              </button>
              <button
                className={'mob-pill ' + (filterCategory === 'login' ? 'active' : '') + (counts.login === 0 ? ' empty' : '')}
                onClick={() => setFilterCategory((c) => c === 'login' ? '' : 'login')}
              >
                <span className="mob-pill-dot" style={{ background: '#0284c7' }}></span>
                <span>Đăng nhập</span>
                <span className="mob-pill-badge">{counts.login}</span>
              </button>
              <button
                className={'mob-pill ' + (filterCategory === 'add' ? 'active' : '') + (counts.add === 0 ? ' empty' : '')}
                onClick={() => setFilterCategory((c) => c === 'add' ? '' : 'add')}
              >
                <span className="mob-pill-dot" style={{ background: '#0d9488' }}></span>
                <span>Thêm mới</span>
                <span className="mob-pill-badge">{counts.add}</span>
              </button>
              <button
                className={'mob-pill ' + (filterCategory === 'update' ? 'active' : '') + (counts.update === 0 ? ' empty' : '')}
                onClick={() => setFilterCategory((c) => c === 'update' ? '' : 'update')}
              >
                <span className="mob-pill-dot" style={{ background: '#d97706' }}></span>
                <span>Cập nhật</span>
                <span className="mob-pill-badge">{counts.update}</span>
              </button>
              <button
                className={'mob-pill ' + (filterCategory === 'delete' ? 'active' : '') + (counts.delete === 0 ? ' empty' : '')}
                onClick={() => setFilterCategory((c) => c === 'delete' ? '' : 'delete')}
              >
                <span className="mob-pill-dot" style={{ background: '#dc2626' }}></span>
                <span>Xóa / Khóa</span>
                <span className="mob-pill-badge">{counts.delete}</span>
              </button>
            </div>
          </div>

          {/* 2. Mobile Sub-Toolbar */}
          <div className="mob-logs-sub-toolbar">
            <div className="mob-sub-toolbar-left">
              <span className="mob-sub-count">
                <strong>{visible.length}</strong> Hoạt động {filterCategory ? `· ${filterCategory}` : ''}
              </span>
            </div>
            <div className="mob-sub-toolbar-right">
              <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc hoạt động">
                <i className="fas fa-sliders"></i>
                {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
              </button>
            </div>
          </div>

          {/* 3. Data Section: Desktop Table & Mobile Luxury Cards */}
          <div className="data-section">
            {/* Desktop Table View */}
            <div className="desk-logs-table-wrap">
              {loading ? <TableSkeleton rows={8} columns={4} /> : (
                <div style={{ overflowX: 'auto' }}><table id="logsTable" className="display" style={{ width: '100%' }}></table></div>
              )}
            </div>

            {/* Mobile Luxury Cards List View */}
            <div className="mob-logs-cards-container">
              {loading ? (
                <div className="mob-logs-skeleton-list">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="mob-log-card-skeleton">
                      <div className="sk-line w50"></div>
                      <div className="sk-line w80"></div>
                    </div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="mob-logs-empty-state">
                  <div className="empty-circle"><i className="fas fa-list-check"></i></div>
                  <h4>Chưa có nhật ký hoạt động phù hợp</h4>
                  <p>Thử chọn bộ lọc khác hoặc kiểm tra lại sau</p>
                </div>
              ) : (
                visible.map((l, idx) => {
                  const style = getLogIcon(l.Action);
                  const changes = l.Changes || [];
                  return (
                    <div key={l.id || idx} className="mob-log-card">
                      {/* HÀNG 1: Icon Hành động + Người thực hiện + Thời gian + Badge Hành động */}
                      <div className="mob-log-header-row">
                        <div className="mob-log-icon-box" style={{ color: style.col, background: style.bg, borderColor: style.col + '33' }}>
                          <i className={'fas ' + style.icon}></i>
                        </div>
                        <div className="mob-log-header-info">
                          <div className="mob-log-user-line">
                            <strong className="mob-log-username">{l.User || 'Hệ thống'}</strong>
                            <span className="mob-log-action-badge" style={{ color: style.col, borderColor: style.col + '44' }}>
                              {l.Action || 'Hoạt động'}
                            </span>
                          </div>
                          <div className="mob-log-time">
                            <i className="fas fa-clock"></i> {formatLogTime(l.Timestamp)}
                          </div>
                        </div>
                      </div>

                      {/* HÀNG 2: Chi tiết hoạt động */}
                      {l.Details && (
                        <div className="mob-log-details-row">
                          <i className="fas fa-file-lines"></i>
                          <span>{l.Details}</span>
                        </div>
                      )}

                      {/* HÀNG 3: Diff thay đổi nếu có (Changes) */}
                      {changes.length > 0 && (
                        <div className="mob-log-changes-box">
                          <div className="mob-log-changes-title">
                            <i className="fas fa-code-compare"></i> Chi tiết thay đổi ({changes.length})
                          </div>
                          <div className="mob-log-changes-list">
                            {changes.map((c, cIdx) => (
                              <div key={cIdx} className="mob-log-chg-item">
                                <span className="mob-log-chg-field">{c.f}</span>
                                <span className="mob-log-chg-old">{c.a || '—'}</span>
                                <i className="fas fa-arrow-right mob-log-chg-arrow"></i>
                                <span className="mob-log-chg-new">{c.b || '—'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 4. Mobile Filter Drawer (Bottom Sheet) */}
          {showFilterDrawer && (
            <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
              <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mob-sheet-handle"></div>
                <div className="mob-sheet-header">
                  <h4><i className="fas fa-sliders"></i> Bộ lọc nhật ký</h4>
                  <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
                </div>
                <div className="mob-sheet-body">
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm nhật ký</label>
                    <input className="filter-input" value={filters.search} placeholder="Người dùng, hành động, chi tiết..." onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-user"></i> Người thực hiện</label>
                    <select className="filter-input" value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })}>
                      <option value="">Tất cả người dùng</option>
                      {usersList.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mob-sheet-footer">
                  <button className="btn btn-secondary" onClick={() => { setFilters({ search: '', user: '', action: '' }); setFilterCategory(''); setShowFilterDrawer(false); }}>
                    <i className="fas fa-rotate-left"></i> Đặt lại
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                    <i className="fas fa-check"></i> Áp dụng ({visible.length} Bản ghi)
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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

