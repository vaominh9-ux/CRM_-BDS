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

