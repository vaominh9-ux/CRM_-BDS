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

