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

    const getLeadInitial = (name) => {
      const parts = String(name || '').trim().split(/\s+/);
      if (!parts.length || !parts[0]) return 'K';
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const getLeadAvatarColor = (name) => {
      const colors = [
        'linear-gradient(135deg, #1e3a8a, #3b82f6)',
        'linear-gradient(135deg, #065f46, #10b981)',
        'linear-gradient(135deg, #581c87, #8b5cf6)',
        'linear-gradient(135deg, #7c2d12, #f97316)',
        'linear-gradient(135deg, #075985, #0ea5e9)',
        'linear-gradient(135deg, #831843, #ec4899)',
        'linear-gradient(135deg, #134e4a, #14b8a6)'
      ];
      let hash = 0;
      const str = String(name || '');
      for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
    };

    const fmtLeadPhone = (phone) => {
      const p = String(phone || '').trim().replace(/\D/g, '');
      if (!p) return '';
      if (p.length === 10) return p.slice(0, 4) + '.' + p.slice(4, 7) + '.' + p.slice(7);
      if (p.length === 11) return p.slice(0, 4) + '.' + p.slice(4, 7) + '.' + p.slice(7);
      if (p.length > 11) return p.slice(0, 4) + '.' + p.slice(4, 7) + '.' + p.slice(7, 10) + '.' + p.slice(10);
      if (p.length === 9) return p.slice(0, 3) + '.' + p.slice(3, 6) + '.' + p.slice(6);
      return phone;
    };

    const getLeadSourceIcon = (src) => {
      const map = {
        'Walk-in': 'fa-person-walking',
        'Website': 'fa-globe',
        'Trang web': 'fa-globe',
        'Referral': 'fa-users',
        'Giới thiệu': 'fa-users',
        'Social Media': 'fa-hashtag',
        'Mạng xã hội': 'fa-hashtag',
        'Call / Inquiry': 'fa-phone-volume',
        'Direct': 'fa-handshake',
        'Trực tiếp': 'fa-handshake',
        'Portal': 'fa-building-columns'
      };
      return map[src] || 'fa-bullhorn';
    };

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
      const [showFilterDrawer, setShowFilterDrawer] = useState(false);
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
        [r.filter((l) => ['Won', 'Lost'].indexOf(l.status) === -1).length, 'Khách hàng đang xử lý', 'fa-user-tag', 'bg-navy'],
        [r.filter((l) => l.status === 'New').length, 'Mới', 'fa-user-plus', 'bg-info'],
        [r.filter((l) => l.status === 'Won').length, 'Thành công', 'fa-trophy', 'bg-success'],
        [r.filter((l) => l.status === 'Lost').length, 'Thất bại', 'fa-user-xmark', 'bg-danger']
      ]; }, [rows]);

      const activeFiltersCount = (filters.source ? 1 : 0) + (filters.interest ? 1 : 0) + (filters.agent ? 1 : 0) + (filters.search ? 1 : 0);

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
          Swal.fire({ icon: 'warning', title: 'Xóa khách hàng "' + l.fullName + '"?', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa' })
            .then((r) => { if (r.isConfirmed) gsRun('deleteLead', l.id, currentUser).then((res) => {
              if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
              else Swal.fire({ icon: 'error', title: 'Error', text: (res && res.message) || 'Failed' }); }); });
        }
      };

      // board drag/menu -> status-only patch; server re-checks own-scope + Lost reason
      const moveLead = (l, to) => {
        const send = (lostReason) => gsRun('updateLead', { id: l.id, status: to, lostReason: lostReason || '' }, currentUser).then((r) => {
          if (r && r.success) { mutate(); swrMutate('dash:stats'); Swal.fire({ icon: 'success', title: l.fullName + ' → ' + viEnum(to), timer: 1400, showConfirmButton: false }); }
          else Swal.fire({ icon: 'error', title: 'Cập nhật thất bại', text: (r && r.message) || 'Lỗi hệ thống' });
        });
        if (to !== 'Lost') return send();
        Swal.fire({ icon: 'warning', title: 'Đánh dấu "' + l.fullName + '" là Thất bại?', input: 'text', inputLabel: 'Lý do thất bại (bắt buộc)',
          inputPlaceholder: 'Nhập lý do khách từ chối / mua chỗ khác...', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xác nhận',
          inputValidator: (v) => (!String(v || '').trim() ? 'Vui lòng nhập lý do thất bại' : undefined)
        }).then((r) => { if (r.isConfirmed) send(r.value); });
      };

      const tableRef = useDataTable('leadsTable', rows === undefined ? null : visible, () => ({
        search: { search: filters.search },
        columns: [
          { data: 'fullName', title: 'Khách hàng', render: (d, t, l) => '<strong>' + esc(d) + '</strong><br><small style="color:#789"><i class="fas fa-phone" style="font-size:10px"></i> ' + esc(l.phone) + '</small>' },
          { data: 'interestType', title: 'Nhu cầu' },
          { data: 'source', title: 'Nguồn' },
          { data: null, title: 'BĐS / Vị trí quan tâm', orderable: false, render: (d, t, l) =>
              l.propertyRef ? '<span class="prop-ref">' + esc(l.propertyRef) + '</span><br><small style="color:#789">' + esc(l.propertyTitle || '') + '</small>'
              : (l.preferredLocationPath ? '<small style="color:#789"><i class="fas fa-location-dot"></i> ' + esc(l.preferredLocationPath) + '</small>' : '—') },
          { data: null, title: 'Ngân sách', render: (d, t, l) => (l.budgetMin || l.budgetMax) ? esc(pkrShort(l.budgetMin || 0)) + ' – ' + esc(pkrShort(l.budgetMax || 0)) : '—' },
          { data: 'status', title: 'Trạng thái', render: (d, t, l) => t === 'display'
              ? badge(d) + (d === 'Lost' && l.lostReason ? '<br><small style="color:#c62828" title="' + esc(l.lostReason) + '">' + esc(String(l.lostReason).substr(0, 34)) + (l.lostReason.length > 34 ? '…' : '') + '</small>' : '') : d },
          { data: 'assignedAgent', title: 'Phụ trách', render: (d) => d ? esc(d) : '<span class="status-badge st-purple">Chưa gán</span>' },
          { data: 'created', title: 'Ngày tạo', render: (d, t) => t === 'display' ? fmtDate(d) : (d || '') },
          { data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-6', width: '208px', render: (d, t, l) => `<div class="table-actions slots-6 lead-actions">
            <button class="action-icon view-icon" data-action="view" title="Lead 360"><i class="fas fa-id-card-clip"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit && ['Negotiating','Won'].indexOf(l.status) !== -1 ? '<button class="action-icon assign-icon" data-action="deal" title="Chuyển thành giao dịch"><i class="fas fa-handshake"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${all && !l.assignedAgent ? '<button class="action-icon assign-icon" data-action="assign" title="Gán nhân viên"><i class="fas fa-user-plus"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Sửa"><i class="fas fa-edit"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
          </div>` }
        ],
        createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng 360'); },
        order: []
      }), onAction, [canEdit, canDel], (lead) => setViewing360(lead));
      useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]); // redraw only on a REAL search change — background refreshes keep page/scroll

      return (
        <div className="leads-module-view">
          {/* 1. Desktop KPI Grid & Pipeline */}
          <div className="desk-pipeline-block">
            <KpiRow items={kpi} />
            {!board && <Pipeline stages={stages} counts={counts} active={stage} onPick={setStage} total={base.length} />}
          </div>

          {/* 2. Mobile Horizontal Pill Bar */}
          <div className="mob-pipeline-bar">
            <div className="mob-pills-scroll">
              <button className={'mob-pill' + (!stage ? ' active' : '')} onClick={() => setStage('')}>
                <span>Tất cả</span>
                <span className="mob-pill-badge">{base.length}</span>
              </button>
              {stages.map((s) => {
                const c = counts[s] || 0;
                return (
                  <button
                    key={s}
                    className={'mob-pill' + (stage === s ? ' active' : '') + (c === 0 ? ' empty' : '')}
                    onClick={() => setStage(s)}
                  >
                    <span className="mob-pill-dot" style={{ background: STAGE_COLORS[s] || '#6c757d' }}></span>
                    <span>{viEnum(s)}</span>
                    <span className="mob-pill-badge">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Mobile Compact Toolbar (Sub-Bar on Mobile) */}
          <div className="mob-leads-sub-toolbar">
            <div className="mob-sub-toolbar-left">
              <span className="mob-sub-count">
                <strong>{visible.length}</strong> khách hàng {stage ? `· ${viEnum(stage)}` : ''}
              </span>
            </div>
            <div className="mob-sub-toolbar-right">
              <button className={'mob-tool-btn ' + (!board ? 'active' : '')} onClick={() => setBoard(false)} title="Xem dạng danh sách thẻ">
                <i className="fas fa-list"></i>
              </button>
              <button className={'mob-tool-btn ' + (board ? 'active' : '')} onClick={() => setBoard(true)} title="Xem dạng bảng Kanban">
                <i className="fas fa-table-columns"></i>
              </button>
              <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)}>
                <i className="fas fa-sliders"></i>
                {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
              </button>
            </div>
          </div>

          {/* 4. Desktop Filters Section */}
          <div className="filters-section desk-filters-section">
            <div className="filters-header">
              <h3><i className="fas fa-filter"></i> Bộ lọc</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button className={'btn btn-sm ' + (board ? 'btn-secondary' : 'btn-primary')} onClick={() => setBoard(false)}>
                  <i className="fas fa-list"></i> <span>Danh sách</span>
                </button>
                <button className={'btn btn-sm ' + (board ? 'btn-primary' : 'btn-secondary')} onClick={() => setBoard(true)}>
                  <i className="fas fa-table-columns"></i> <span>Bảng</span>
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setFilters({ search: '', source: '', interest: '', agent: '' }); setStage(''); }} title="Xóa bộ lọc">
                  <i className="fas fa-rotate-left"></i> <span>Xóa</span>
                </button>
              </div>
            </div>

            <div className="filters-grid">
              <div className="filter-group">
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm</label>
                <input className="filter-input" value={filters.search} placeholder="Tên, SĐT, trạng thái…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <SearchableDropdown label="Nguồn" icon="fas fa-bullhorn" options={opts(ENUMS.leadSource)} value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })} placeholder="Tất cả nguồn" />
              <SearchableDropdown label="Nhu cầu" icon="fas fa-hand-holding-dollar" options={opts(ENUMS.interestType)} value={filters.interest} onChange={(v) => setFilters({ ...filters, interest: v })} placeholder="Tất cả nhu cầu" />
              {all && <SearchableDropdown label="Nhân viên" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="Tất cả nhân viên" />}
            </div>
          </div>

          {/* 5. Data Content: Desktop DataTable / Kanban / Mobile Luxury Cards */}
          <div className="data-section">
            <input type="file" id="leadsCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'FullName', 'bulkImportLeads', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />

            {/* Kanban view (desktop & mobile) */}
            {board && <LeadKanban leads={boardRows} stages={ENUMS.leadStatus} canEdit={canEdit} onMove={moveLead} onAction={onAction} />}

            {/* Desktop Table View */}
            {!board && (
              <div className="desk-leads-table-wrap">
                {loading ? <TableSkeleton rows={8} columns={8} /> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table id="leadsTable" className="display" style={{ width: '100%' }}></table>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Cards List View */}
            {!board && (
              <div className="mob-leads-cards-container">
                {loading ? (
                  <div className="mob-leads-skeleton-list">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="mob-lead-card-skeleton">
                        <div className="sk-head"><div className="sk-avatar"></div><div className="sk-lines"><div className="sk-line w60"></div><div className="sk-line w40"></div></div></div>
                        <div className="sk-body"><div className="sk-line w80"></div></div>
                      </div>
                    ))}
                  </div>
                ) : visible.length === 0 ? (
                  <div className="mob-leads-empty-state">
                    <div className="empty-circle"><i className="fas fa-user-tag"></i></div>
                    <h4>Chưa có khách hàng phù hợp</h4>
                    <p>Thử đổi bộ lọc hoặc thêm khách hàng tiềm năng mới vào hệ thống</p>
                    {canAdd && (
                      <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { setEditing(null); setShowModal(true); }}>
                        <i className="fas fa-plus"></i> Thêm khách hàng mới
                      </button>
                    )}
                  </div>
                ) : (
                  visible.map((l) => (
                    <div key={l.id} className="mob-lead-card" onClick={() => onAction('view', l)}>
                      {/* HÀNG 1: Avatar + Tên khách hàng + Tag trạng thái */}
                      <div className="mob-lead-row1">
                        <div className="mob-lead-avatar" style={{ background: getLeadAvatarColor(l.fullName) }}>
                          {getLeadInitial(l.fullName)}
                        </div>
                        <div className="mob-lead-name-box">
                          <span className="mob-lead-name">{l.fullName}</span>
                        </div>
                        <div className="mob-lead-stage-wrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            className="mob-lead-stage-select"
                            value={l.status}
                            style={{
                              background: (STAGE_COLORS[l.status] || '#475569') + '15',
                              color: STAGE_COLORS[l.status] || '#475569',
                              borderColor: (STAGE_COLORS[l.status] || '#475569') + '40'
                            }}
                            onChange={(e) => moveLead(l, e.target.value)}
                            disabled={!canEdit}
                            title="Chạm để chuyển giai đoạn"
                          >
                            {ENUMS.leadStatus.map((st) => (
                              <option key={st} value={st}>{viEnum(st)}</option>
                            ))}
                          </select>
                          <i className="fas fa-chevron-down mob-stage-caret" style={{ color: STAGE_COLORS[l.status] || '#475569' }}></i>
                        </div>
                      </div>

                      {/* HÀNG 2: Dải thông tin liên hệ & Nhu cầu (SĐT, Nguồn, Nhu cầu Mua/Thuê/Bán, Ngân sách) */}
                      <div className="mob-lead-row2 mob-lead-tags-strip">
                        {l.phone ? (
                          <span className="mob-lead-phone-text">
                            <i className="fas fa-phone-volume"></i> {fmtLeadPhone(l.phone)}
                          </span>
                        ) : (
                          <span className="mob-lead-no-phone">
                            <i className="fas fa-phone-slash"></i> Chưa có SĐT
                          </span>
                        )}
                        {l.source && (
                          <span className="mob-lead-source-tag">
                            <i className={'fas ' + getLeadSourceIcon(l.source)}></i> {viEnum(l.source)}
                          </span>
                        )}
                        {l.interestType && (
                          <span className="mob-chip chip-interest">
                            <i className="fas fa-tag"></i> {viEnum(l.interestType)}
                          </span>
                        )}
                        {(l.budgetMin || l.budgetMax) && (
                          <span className="mob-chip chip-budget">
                            <i className="fas fa-wallet"></i> {pkrShort(l.budgetMin || 0)} – {pkrShort(l.budgetMax || 0)}
                          </span>
                        )}
                        {l.preferredLocationPath && (
                          <span className="mob-chip chip-loc">
                            <i className="fas fa-location-dot"></i> {l.preferredLocationPath}
                          </span>
                        )}
                      </div>

                      {/* HÀNG 3: BĐS quan tâm & Ghi chú */}
                      {(l.propertyRef || l.message) && (
                        <div className="mob-lead-row3">
                          {l.propertyRef && (
                            <div className="mob-lead-prop-box">
                              <i className="fas fa-building"></i>
                              <span className="prop-code">{l.propertyRef}</span>
                              <span className="prop-title">{l.propertyTitle || ''}</span>
                            </div>
                          )}
                          {l.message && (
                            <div className="mob-lead-note-box">
                              <i className="fas fa-comment-dots"></i>
                              <span>{l.message}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* HÀNG 4: Nhân viên phụ trách & Ngày tạo */}
                      <div className="mob-lead-row4 mob-lead-meta-row">
                        <span className="mob-meta-agent">
                          <i className="fas fa-user-tie"></i> {l.assignedAgent || 'Chưa phân công'}
                        </span>
                        <span className="mob-meta-date">
                          <i className="fas fa-clock"></i> {fmtDate(l.created)}
                        </span>
                      </div>

                      {/* HÀNG 5: 4 Nút hành động 1-chạm */}
                      <div className="mob-lead-row5 mob-lead-action-bar" onClick={(e) => e.stopPropagation()}>
                        <a href={'tel:' + String(l.phone || '').replace(/\D/g, '')} className={'mob-btn mob-btn-call' + (!l.phone ? ' disabled' : '')} title="Gọi điện">
                          <i className="fas fa-phone"></i> Gọi ngay
                        </a>
                        <button className={'mob-btn mob-btn-zalo' + (!l.phone ? ' disabled' : '')} onClick={() => l.phone && onAction('wa', l)} title="Nhắn Zalo">
                          <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14, marginRight: 5 }}>
                            <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5"/>
                            <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/>
                            <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                          </svg>
                          Zalo
                        </button>
                        <button className="mob-btn mob-btn-360" onClick={() => onAction('view', l)} title="Hồ sơ 360">
                          <i className="fas fa-id-card-clip"></i> Hồ sơ 360
                        </button>
                        {canEdit && (
                          <button className="mob-btn mob-btn-edit" onClick={() => onAction('edit', l)} title="Sửa thông tin">
                            <i className="fas fa-pen-to-square"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 6. Mobile Filter Drawer (Bottom Sheet) */}
          {showFilterDrawer && (
            <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
              <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mob-sheet-handle"></div>
                <div className="mob-sheet-header">
                  <h4><i className="fas fa-sliders"></i> Bộ lọc khách hàng</h4>
                  <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
                </div>
                <div className="mob-sheet-body">
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-magnifying-glass"></i> Từ khóa tìm kiếm</label>
                    <input className="filter-input" value={filters.search} placeholder="Tên, SĐT, ghi chú..." onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                  </div>
                  <SearchableDropdown label="Nguồn khách hàng" icon="fas fa-bullhorn" options={opts(ENUMS.leadSource)} value={filters.source} onChange={(v) => setFilters({ ...filters, source: v })} placeholder="Tất cả nguồn" />
                  <SearchableDropdown label="Nhu cầu" icon="fas fa-hand-holding-dollar" options={opts(ENUMS.interestType)} value={filters.interest} onChange={(v) => setFilters({ ...filters, interest: v })} placeholder="Tất cả nhu cầu" />
                  {all && <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="Tất cả nhân viên" />}
                </div>
                <div className="mob-sheet-footer">
                  <button className="btn btn-secondary" onClick={() => { setFilters({ search: '', source: '', interest: '', agent: '' }); setStage(''); setShowFilterDrawer(false); }}>
                    <i className="fas fa-rotate-left"></i> Đặt lại
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                    <i className="fas fa-check"></i> Áp dụng ({visible.length} khách)
                  </button>
                </div>
              </div>
            </div>
          )}

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
        </div>
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
          <div className="modal modal-lead-form">
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-user-plus')}></i> {editing ? 'Chỉnh sửa khách hàng #' + lead.id : 'Thêm khách hàng tiềm năng'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Họ và tên *</label>
                    <input value={form.fullName} onChange={setEv('fullName')} required placeholder="Ví dụ: Nguyễn Văn An" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-phone"></i> Điện thoại * <small style={{ color: '#94a3b8', textTransform: 'none' }}>(khóa định danh)</small></label>
                    <input value={form.phone} onChange={setEv('phone')} required placeholder="0901234567" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-envelope"></i> Email</label>
                    <input type="email" value={form.email} onChange={setEv('email')} placeholder="email@domain.com" />
                  </div>
                  <SearchableDropdown label="Nguồn khách hàng" icon="fas fa-bullhorn" options={opts(ENUMS.leadSource)} value={form.source} onChange={set('source')} placeholder="Chọn nguồn…" required={true} />
                  <SearchableDropdown label="Nhu cầu" icon="fas fa-hand-holding-dollar" options={opts(ENUMS.interestType)} value={form.interestType} onChange={set('interestType')} placeholder="Chọn nhu cầu…" required={true} />
                  <SearchableDropdown label="Bất động sản quan tâm" icon="fas fa-building"
                    options={props.map((p) => ({ value: String(p.id), label: (p.referenceCode || '#' + p.id) + ' — ' + p.title }))}
                    value={form.propertyId} onChange={set('propertyId')} placeholder="Không chọn / Tìm kiếm…" />
                  <SearchableDropdown label="Khu vực mong muốn" icon="fas fa-map-location-dot"
                    options={(lookups.locations || []).map((l) => ({ value: String(l.id), label: pathOf(l.id) }))}
                    value={form.preferredLocationId} onChange={set('preferredLocationId')} placeholder="Mọi khu vực" />
                  <div className="form-group">
                    <label><i className="fas fa-money-bill"></i> Ngân sách tối thiểu (VNĐ)</label>
                    <input type="number" min="0" step="any" value={form.budgetMin} onChange={setEv('budgetMin')} placeholder="Ví dụ: 1000000000" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-money-bill-trend-up"></i> Ngân sách tối đa (VNĐ)</label>
                    <input type="number" min="0" step="any" value={form.budgetMax} onChange={setEv('budgetMax')} placeholder="Ví dụ: 3000000000" />
                  </div>
                  {all && (
                    <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                      value={form.assignedAgent} onChange={set('assignedAgent')} placeholder="Hàng đợi chưa phân công" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Giai đoạn / Trạng thái" icon="fas fa-flag" options={opts(ENUMS.leadStatus)} value={form.status} onChange={set('status')} placeholder="Trạng thái…" />
                  )}
                </div>
                {editing && form.status === 'Lost' && (
                  <div className="form-group">
                    <label><i className="fas fa-circle-question"></i> Lý do thất bại *</label>
                    <textarea rows="2" value={form.lostReason} onChange={setEv('lostReason')} placeholder="Ví dụ: Giá quá cao — đã mua chỗ khác" required></textarea>
                  </div>
                )}
                <div className="form-group">
                  <label><i className="fas fa-message"></i> Ghi chú / Nội dung trao đổi</label>
                  <textarea rows="3" value={form.message} onChange={setEv('message')} placeholder="Nhu cầu cụ thể của khách hàng..."></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Lưu thay đổi' : 'Thêm khách hàng'}</>}
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
          <div className="modal modal-lead-form" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3><i className="fas fa-user-plus"></i> Phân công "{lead.fullName}"</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie"
                  options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))}
                  value={agent} onChange={setAgent} placeholder="Chọn nhân viên…" required={true} />
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !agent}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang phân công…</> : <><i className="fas fa-check"></i> Xác nhận</>}
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
      const [showFilterDrawer, setShowFilterDrawer] = useState(false);
      const [filters, setFilters] = useState({ search: initialSearch || '', agent: '', range: '' });
      useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch, range: '' })); }, [initialSearch]);
      useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Tải dữ liệu thất bại', text: String((error && error.message) || error) }); }, [error]);

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
      const activeFiltersCount = (filters.search ? 1 : 0) + (filters.agent ? 1 : 0) + (filters.range ? 1 : 0);

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
        if (action === 'wa') {
          const n = String(a.leadPhone || '').replace(/\D/g, '');
          const msg = 'Xin chào ' + (a.leadName || 'Quý khách') + ', tôi là ' + (a.agent || 'chuyên viên') + ' từ công ty BĐS. Tôi xin phép liên hệ xác nhận lịch hẹn xem nhà ' + (a.propertyRef ? 'mã ' + a.propertyRef : '') + (a.propertyTitle ? ' (' + a.propertyTitle + ')' : '') + ' vào lúc ' + fmtDT(a.scheduledAt) + '.';
          waOpen(n, msg);
        }
        else if (action === 'confirm') {
          gsRun('updateAppointment', { id: a.id, status: 'Confirmed' }, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: 'Đã xác nhận lịch hẹn', timer: 1500, showConfirmButton: false }); mutate(); swrMutate('dash:stats'); }
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

          {/* 1. Desktop Pipeline */}
          <div className="desk-pipeline-block">
            <Pipeline stages={ENUMS.appointmentStatus} counts={counts} active={stage} onPick={setStage} total={base.length} />
          </div>

          {/* 2. Mobile Horizontally Scrollable Pipeline Pills */}
          <div className="mob-pipeline-bar">
            <div className="mob-pills-scroll">
              <button
                className={'mob-pill ' + (!stage ? 'active' : '')}
                onClick={() => setStage('')}
              >
                <span>Tất cả</span>
                <span className="mob-pill-badge">{base.length}</span>
              </button>
              {ENUMS.appointmentStatus.map((st) => {
                const count = counts[st] || 0;
                const col = STAGE_COLORS[st] || '#64748b';
                return (
                  <button
                    key={st}
                    className={'mob-pill ' + (stage === st ? 'active' : '') + (count === 0 ? ' empty' : '')}
                    onClick={() => setStage(stage === st ? '' : st)}
                  >
                    <span className="mob-pill-dot" style={{ background: col }}></span>
                    <span>{viEnum(st)}</span>
                    <span className="mob-pill-badge">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Mobile Sub-Toolbar */}
          <div className="mob-appts-sub-toolbar">
            <div className="mob-sub-toolbar-left">
              <span className="mob-sub-count">
                <strong>{visible.length}</strong> Lịch hẹn {stage ? `· ${viEnum(stage)}` : ''}
              </span>
            </div>
            <div className="mob-sub-toolbar-right">
              <button
                className={'mob-tool-btn ' + (calView ? 'active' : '')}
                onClick={() => setCalView(!calView)}
                title={calView ? 'Xem danh sách' : 'Xem dạng lịch'}
              >
                <i className={'fas ' + (calView ? 'fa-list' : 'fa-calendar-days')}></i>
              </button>
              {canAdd && (
                <button className="mob-tool-btn mob-tool-btn-primary" onClick={() => { setEditing(null); setShowModal(true); }} title="Đặt lịch xem">
                  <i className="fas fa-plus"></i>
                </button>
              )}
              <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc lịch hẹn">
                <i className="fas fa-sliders"></i>
                {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
              </button>
            </div>
          </div>

          {/* 4. Desktop Filters Section */}
          <div className="filters-section desk-filters-section">
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

          {/* 5. Data Section: Desktop Table & Mobile Luxury Cards */}
          <div className="data-section">
            <input type="file" id="apptCsvImport" accept=".csv" style={{ display: 'none' }}
                   onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'LeadPhone', 'bulkImportAppointments', currentUser, () => { mutate(); swrMutate('dash:stats'); }); e.target.value = ''; }} />

            {/* Desktop Table or Desktop Calendar Grid */}
            <div className="desk-appts-table-wrap">
              {calView && <CalendarGrid appts={visible} onSelectAppt={(a) => { setEditing(a); setShowModal(true); }} />}
              {loading ? (!calView && <TableSkeleton rows={8} columns={7} />)
                : <div style={{ overflowX: 'auto', display: calView ? 'none' : 'block' }}><table id="apptTable" className="display" style={{ width: '100%' }}></table></div>}
            </div>

            {/* Mobile View: List or Calendar Grid */}
            <div className="mob-appts-view-container">
              {calView ? (
                <div className="mob-calendar-wrapper">
                  <CalendarGrid appts={visible} onSelectAppt={(a) => { setEditing(a); setShowModal(true); }} />
                </div>
              ) : (
                <div className="mob-appts-cards-container">
                  {loading ? (
                    <div className="mob-appts-skeleton-list">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="mob-appt-card-skeleton">
                          <div className="sk-line w50"></div>
                          <div className="sk-line w80"></div>
                          <div className="sk-line w40"></div>
                        </div>
                      ))}
                    </div>
                  ) : visible.length === 0 ? (
                    <div className="mob-appts-empty-state">
                      <div className="empty-circle"><i className="fas fa-calendar-xmark"></i></div>
                      <h4>Chưa có lịch hẹn phù hợp</h4>
                      <p>Thử đổi bộ lọc hoặc tạo lịch hẹn xem nhà mới</p>
                      {canAdd && (
                        <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { setEditing(null); setShowModal(true); }}>
                          <i className="fas fa-plus"></i> Đặt lịch xem
                        </button>
                      )}
                    </div>
                  ) : (
                    visible.map((a) => {
                      const isUpcoming = ['Scheduled', 'Confirmed'].indexOf(a.status) !== -1;
                      const initial = (a.leadName || 'K').trim().charAt(0).toUpperCase();
                      return (
                        <div key={a.id} className={'mob-appt-card status-' + (a.status || '').toLowerCase()}>
                          {/* HÀNG 1: Thời gian lịch hẹn & Trạng thái */}
                          <div className="mob-appt-header-row">
                            <div className="mob-appt-time-pill">
                              <i className="fas fa-calendar-day"></i>
                              <span><strong>{fmtDT(a.scheduledAt)}</strong> ({a.durationMinutes || 30} phút)</span>
                            </div>
                            <div className="mob-appt-status-tags">
                              <Badge s={a.status} />
                              {a.interestLevel ? <Badge s={a.interestLevel} /> : null}
                            </div>
                          </div>

                          {/* HÀNG 2: Khách hàng & Bất động sản */}
                          <div className="mob-appt-body">
                            {/* Khách hàng */}
                            <div className="mob-appt-lead-row" onClick={() => setViewingLead(a)}>
                              <div className="mob-lead-avatar">{initial}</div>
                              <div className="mob-appt-lead-info">
                                <div className="mob-appt-lead-name">
                                  <strong>{a.leadName || 'Khách vãng lai'}</strong>
                                  <span className="mob-view-profile-hint"><i className="fas fa-address-card"></i> Hồ sơ</span>
                                </div>
                                <div className="mob-appt-lead-phone">{a.leadPhone || 'Chưa có SĐT'}</div>
                              </div>
                            </div>

                            {/* Bất động sản */}
                            <div className="mob-appt-prop-box">
                              <div className="mob-appt-prop-icon"><i className="fas fa-building"></i></div>
                              <div className="mob-appt-prop-info">
                                <span className="prop-ref">{a.propertyRef || 'Mã #' + (a.propertyId || '—')}</span>
                                <span className="mob-appt-prop-title">{a.propertyTitle || 'Bất động sản quan tâm'}</span>
                              </div>
                            </div>
                          </div>

                          {/* HÀNG 3: Nhân viên & Ghi chú / Phản hồi / Lý do hủy */}
                          <div className="mob-appt-meta-info">
                            <div className="mob-appt-agent">
                              <i className="fas fa-user-tie"></i> Phụ trách: <strong>{a.agent || 'Chưa phân công'}</strong>
                            </div>
                            {a.status === 'Cancelled' && a.cancellationReason ? (
                              <div className="mob-appt-cancel-reason">
                                <i className="fas fa-triangle-exclamation"></i> Lý do hủy: {a.cancellationReason}
                              </div>
                            ) : null}
                            {a.feedback ? (
                              <div className="mob-appt-feedback">
                                <i className="fas fa-comment-dots"></i> Phản hồi: {a.feedback}
                              </div>
                            ) : a.notes ? (
                              <div className="mob-appt-notes">
                                <i className="fas fa-note-sticky"></i> Ghi chú: {a.notes}
                              </div>
                            ) : null}
                          </div>

                          {/* HÀNG 4: Các nút hành động 1 chạm */}
                          <div className="mob-appt-actions">
                            {canEdit && a.status === 'Scheduled' && (
                              <button className="mob-btn mob-btn-confirm" onClick={() => onAction('confirm', a)} title="Xác nhận lịch hẹn">
                                <i className="fas fa-check"></i> Xác nhận
                              </button>
                            )}
                            {canEdit && isUpcoming && (
                              <button className="mob-btn mob-btn-complete" onClick={() => onAction('complete', a)} title="Hoàn thành & Ghi phản hồi">
                                <i className="fas fa-flag-checkered"></i> Hoàn thành
                              </button>
                            )}
                            <button className="mob-btn mob-btn-zalo" onClick={() => onAction('wa', a)} title="Nhắn Zalo khách hàng">
                              <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14, marginRight: 5 }}>
                                <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5"/>
                                <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/>
                                <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                              </svg>
                              Zalo
                            </button>
                            {canEdit && (
                              <button className="mob-btn mob-btn-edit" onClick={() => onAction('edit', a)} title="Chỉnh sửa lịch hẹn">
                                <i className="fas fa-pen-to-square"></i>
                              </button>
                            )}
                            {canDel && (
                              <button className="mob-btn mob-btn-del" onClick={() => onAction('delete', a)} title="Xóa lịch hẹn">
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Mobile Filter Drawer (Bottom Sheet) */}
          {showFilterDrawer && (
            <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
              <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="mob-sheet-handle"></div>
                <div className="mob-sheet-header">
                  <h4><i className="fas fa-sliders"></i> Bộ lọc lịch hẹn</h4>
                  <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
                </div>
                <div className="mob-sheet-body">
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm lịch hẹn</label>
                    <input className="filter-input" value={filters.search} placeholder="Tên khách, SĐT, BĐS, nhân viên…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
                  </div>
                  <SearchableDropdown label="Khoảng thời gian" icon="fas fa-calendar-week" options={RANGES.filter((r) => r.value)} value={filters.range} onChange={(v) => setFilters({ ...filters, range: v })} placeholder="Toàn thời gian" />
                  {all && <SearchableDropdown label="Nhân viên" icon="fas fa-user-tie" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + viEnum(a.role) + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="Tất cả nhân viên" />}
                </div>
                <div className="mob-sheet-footer">
                  <button className="btn btn-secondary" onClick={() => { setFilters({ search: '', agent: '', range: '' }); setStage(''); setShowFilterDrawer(false); }}>
                    <i className="fas fa-rotate-left"></i> Đặt lại
                  </button>
                  <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                    <i className="fas fa-check"></i> Áp dụng ({visible.length} Lịch hẹn)
                  </button>
                </div>
              </div>
            </div>
          )}

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
        if (!editing && (!form.leadId || !form.propertyId)) return Swal.fire({ icon: 'warning', title: 'Chưa chọn khách hàng và BĐS', text: 'Vui lòng chọn khách hàng và bất động sản cần xem.' });
        if (form.status === 'Cancelled' && !form.cancellationReason.trim())
          return Swal.fire({ icon: 'warning', title: 'Cần nhập lý do hủy', text: 'Vui lòng ghi rõ lý do hủy lịch hẹn.' });
        setSaving(true);
        const payload = editing
          ? { id: appt.id, scheduledAt: form.scheduledAt, durationMinutes: form.durationMinutes, agent: form.agent, status: form.status, cancellationReason: form.cancellationReason, notes: form.notes }
          : { leadId: form.leadId, propertyId: form.propertyId, agent: form.agent, scheduledAt: form.scheduledAt, durationMinutes: form.durationMinutes, notes: form.notes };
        gsRun(editing ? 'updateAppointment' : 'addAppointment', payload, currentUser).then((r) => {
          setSaving(false);
          if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2200, showConfirmButton: false }); onSaved(); }
          else Swal.fire({ icon: 'error', title: 'Không thể đặt lịch', text: (r && r.message) || 'Thao tác thất bại' }); // conflict message surfaces here
        }).catch((err) => { setSaving(false); Swal.fire({ icon: 'error', title: 'Lỗi', text: String((err && err.message) || err) }); });
      };

      return (
        <div className="modal-overlay">
          <TopLoadingBar active={saving} />
          <div className="modal modal-appt-form">
            <div className="modal-header">
              <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-calendar-plus')}></i> {editing ? 'Chỉnh sửa lịch xem #' + appt.id : 'Đặt lịch hẹn xem nhà'}</h3>
              <button className="close-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={submit}>
                {!editing && (
                  <SearchableDropdown label="Khách hàng tiềm năng" icon="fas fa-user-tag"
                    options={leads.map((l) => ({ value: String(l.id), label: l.fullName + ' (' + l.phone + ') · ' + viEnum(l.status) }))}
                    value={form.leadId} onChange={set('leadId')} placeholder="Tìm khách hàng…" required={true} />
                )}
                {!editing && (
                  <SearchableDropdown label="Bất động sản cần xem" icon="fas fa-building"
                    options={props.filter((p) => ['Sold', 'Rented'].indexOf(p.status) === -1).map((p) => ({ value: String(p.id), label: (p.referenceCode || '#' + p.id) + ' — ' + p.title }))}
                    value={form.propertyId} onChange={set('propertyId')} placeholder="Tìm bất động sản…" required={true} />
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-clock"></i> Thời gian hẹn *</label>
                    <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))} required />
                  </div>
                  <SearchableDropdown label="Thời lượng dự kiến" icon="fas fa-hourglass-half"
                    options={[{ value: '30', label: '30 phút' }, { value: '45', label: '45 phút' }, { value: '60', label: '1 tiếng' }, { value: '90', label: '1.5 tiếng' }]}
                    value={form.durationMinutes} onChange={set('durationMinutes')} placeholder="Thời lượng…" />
                  {all && (
                    <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + viEnum(a.role) + ')' }))}
                      value={form.agent} onChange={set('agent')} placeholder="Chọn nhân viên…" />
                  )}
                  {editing && (
                    <SearchableDropdown label="Trạng thái" icon="fas fa-flag" options={opts(ENUMS.appointmentStatus)} value={form.status} onChange={set('status')} placeholder="Trạng thái…" />
                  )}
                </div>
                {editing && form.status === 'Cancelled' && (
                  <div className="form-group">
                    <label><i className="fas fa-circle-question"></i> Lý do hủy lịch hẹn *</label>
                    <textarea rows="2" value={form.cancellationReason} onChange={(e) => setForm((f) => ({ ...f, cancellationReason: e.target.value }))} required placeholder="Ghi rõ lý do khách hoặc công ty hủy…"></textarea>
                  </div>
                )}
                <div className="form-group">
                  <label><i className="fas fa-align-left"></i> Ghi chú nội bộ</label>
                  <textarea rows="2" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Lưu ý địa điểm gặp, tài liệu cần mang theo…"></textarea>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật lịch xem' : 'Xác nhận đặt lịch'}</>}
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

