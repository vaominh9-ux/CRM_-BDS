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
    .map((p) => {
      let s = 0;
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
  const openProp = useMemo(() => { const o = {}; allDeals.forEach((x) => { if (['Token', 'Agreement'].indexOf(x.status) !== -1) o[x.propertyId] = 1; }); return o; }, [allDeals]);
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
  const closed = editing && ['Completed', 'Cancelled'].indexOf(deal.status) !== -1;

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
      ? {
        id: deal.id, dealType: dealType, buyerName: form.buyerName, buyerPhone: form.buyerPhone, dealAmount: form.dealAmount,
        commissionPct: cPct, agentSharePct: sPct, agent: form.agent, notes: form.notes, status: form.status,
        cancellationReason: form.cancellationReason, securityDeposit: form.securityDeposit, endDate: form.endDate, rentDueDay: form.rentDueDay
      }
      : {
        propertyId: form.propertyId, dealType: dealType, leadId: prefill && prefill.leadId, buyerName: form.buyerName, buyerPhone: form.buyerPhone,
        dealAmount: form.dealAmount, commissionPct: cPct, agentSharePct: sPct, tokenAmount: form.tokenAmount, tokenMethod: form.tokenMethod,
        agent: form.agent, notes: form.notes
      };
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
          <h3><i className="fas fa-handshake"></i> {editing ? 'Giao dịch #' + deal.id + ' — ' + (deal.propertyRef || '') : 'Mở giao dịch mới'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="txn-split">
              <div className="txn-form">
                <div className="form-grid">
                  {!editing && (
                    <SearchableDropdown label="Bất động sản giao dịch" icon="fas fa-building"
                      options={props.filter((p) => ['Available', 'Reserved'].indexOf(p.status) !== -1 && !openProp[p.id]).map((p) => {
                        const isRent = p.listingType === 'Rent';
                        const tag = isRent ? '🔑 [CHO THUÊ]' : '🏷️ [BÁN]';
                        const priceText = p.price ? ' (' + fmtPKR(p.price) + (isRent ? '/tháng' : '') + ')' : '';
                        return {
                          value: String(p.id),
                          label: tag + ' ' + (p.referenceCode || '#' + p.id) + ' — ' + p.title + priceText
                        };
                      })}
                      value={form.propertyId} onChange={(pid) => {
                        const selectedProp = props.find((p) => String(p.id) === String(pid));
                        setForm((f) => ({
                          ...f,
                          propertyId: pid,
                          dealAmount: selectedProp?.price || f.dealAmount
                        }));
                      }} placeholder="Chọn BĐS đang mở bán / cho thuê…" required={true} />
                  )}
                  {prop && (
                    <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: prop.listingType === 'Rent' ? '#eff6ff' : '#f0fdf4',
                      border: '1px solid ' + (prop.listingType === 'Rent' ? '#bfdbfe' : '#bbf7d0'),
                      borderRadius: '8px',
                      padding: '9px 14px',
                      marginBottom: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={'badge ' + (prop.listingType === 'Rent' ? 'badge-info' : 'badge-success')} style={{ fontSize: '12px', padding: '4px 8px' }}>
                          <i className={'fas ' + (prop.listingType === 'Rent' ? 'fa-key' : 'fa-tag')}></i> {prop.listingType === 'Rent' ? 'BĐS CHO THUÊ' : 'BĐS BÁN'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{prop.title}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: prop.listingType === 'Rent' ? '#1d4ed8' : '#15803d' }}>
                        {prop.listingType === 'Rent' ? fmtPKR(prop.price) + ' / tháng' : fmtPKR(prop.price)}
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label><i className="fas fa-user"></i> Người mua / Khách thuê *</label>
                    <input value={form.buyerName} onChange={setEv('buyerName')} disabled={closed} required placeholder="Ví dụ: Nguyễn Văn An" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-phone"></i> Số điện thoại *</label>
                    <input value={form.buyerPhone} onChange={setEv('buyerPhone')} disabled={closed} required placeholder="0901234567" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-money-bill-wave"></i> Giá trị giao dịch (VNĐ) *{dealType === 'Rent' ? ' — tiền thuê tháng' : ''}</label>
                    <input type="number" min="1" step="any" value={form.dealAmount} onChange={setEv('dealAmount')} disabled={closed} required placeholder="Ví dụ: 2500000000" />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-percent"></i> Tỷ lệ hoa hồng <small style={{ color: '#94a3b8', textTransform: 'none' }}>(mặc định {dealType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale}%)</small></label>
                    <input type="number" min="0" step="any" value={form.commissionPct} onChange={setEv('commissionPct')} disabled={closed} placeholder={String(dealType === 'Rent' ? cfg.commissionPctRent : cfg.commissionPctSale)} />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-user-tie"></i> Tỷ lệ nhân viên <small style={{ color: '#94a3b8', textTransform: 'none' }}>(mặc định {cfg.agentSharePct}%)</small></label>
                    <input type="number" min="0" max="100" step="any" value={form.agentSharePct} onChange={setEv('agentSharePct')} disabled={closed} placeholder={String(cfg.agentSharePct)} />
                  </div>
                  {!editing && (
                    <div className="form-group">
                      <label><i className="fas fa-coins"></i> Tiền đặt cọc ban đầu (VNĐ)</label>
                      <input type="number" min="0" step="any" value={form.tokenAmount} onChange={setEv('tokenAmount')} placeholder="Ví dụ: 50000000" />
                    </div>
                  )}
                  {!editing && r2(form.tokenAmount) > 0 && (
                    <SearchableDropdown label="Hình thức cọc" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.tokenMethod} onChange={set('tokenMethod')} placeholder="Hình thức thanh toán…" />
                  )}
                  {all && (
                    <SearchableDropdown label="Nhân viên phụ trách" icon="fas fa-user-tie"
                      options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + viEnum(a.role) + ')' }))}
                      value={form.agent} onChange={set('agent')} placeholder="Chọn nhân viên…" />
                  )}
                  {editing && !closed && (
                    <SearchableDropdown label="Trạng thái giao dịch" icon="fas fa-flag"
                      options={opts(all ? ENUMS.dealStatus : ['Token', 'Agreement'])}
                      value={form.status} onChange={set('status')} placeholder="Trạng thái…" />
                  )}
                </div>
                {editing && form.status === 'Cancelled' && deal.status !== 'Cancelled' && (
                  <div className="form-group">
                    <label><i className="fas fa-circle-question"></i> Lý do hủy giao dịch *</label>
                    <textarea rows="2" value={form.cancellationReason} onChange={setEv('cancellationReason')} required placeholder="Ghi rõ lý do hủy hợp đồng/giao dịch…"></textarea>
                  </div>
                )}
                {completing && dealType === 'Rent' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label><i className="fas fa-shield-halved"></i> Tiền đặt cọc bảo đảm (VNĐ)</label>
                      <input type="number" min="0" step="any" value={form.securityDeposit} onChange={setEv('securityDeposit')} />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-calendar-day"></i> Ngày kết thúc hợp đồng</label>
                      <input type="date" value={form.endDate} onChange={setEv('endDate')} />
                    </div>
                    <div className="form-group">
                      <label><i className="fas fa-calendar-check"></i> Ngày đến hạn tiền thuê (1–28)</label>
                      <input type="number" min="1" max="28" value={form.rentDueDay} onChange={setEv('rentDueDay')} />
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label><i className="fas fa-align-left"></i> Ghi chú giao dịch</label>
                  <textarea rows="2" value={form.notes} onChange={setEv('notes')} placeholder="Điều khoản thanh toán, thỏa thuận đặc biệt…"></textarea>
                </div>
              </div>
              <div className="txn-preview">
                <div className="txn-h"><i className="fas fa-calculator"></i> Bảng tính tài chính trực tiếp</div>
                <div className="txn-line"><span className="f">Tổng giá trị giao dịch</span><span className="v">{fmtPKR(amt)}</span></div>
                <div className="txn-line"><span className="f">Tổng đã thanh toán{!editing ? ' (tiền cọc)' : ''}</span><span className="v">{fmtPKR(paid)}</span></div>
                <div className={'txn-line' + (balance < 0 ? ' bad' : '')}><span className="f">Số dư còn lại</span><span className="v">{fmtPKR(balance)}</span></div>
                <div className="txn-line"><span className="f">Hoa hồng {cPct}% × giá trị</span><span className="v">{fmtPKR(commission)}</span></div>
                <div className="txn-line"><span className="f">Phần nhân viên {sPct}% × hoa hồng</span><span className="v">{fmtPKR(agentShare)}</span></div>
                <div className="txn-line total"><span className="f">Doanh thu công ty</span><span className="v">{fmtPKR(r2(commission - agentShare))}</span></div>
                {editing && (deal.payments || []).length > 0 && (
                  <>
                    <div className="txn-h" style={{ marginTop: 12 }}><i className="fas fa-receipt"></i> Lịch sử các đợt thanh toán</div>
                    {(deal.payments || []).map((q, i) => (
                      <div key={i} className="txn-pay-row"><span>{fmtDate(q.date)} · {viEnum(q.method)}{q.ref ? ' · ' + q.ref : ''}</span><span>{fmtPKR(q.amount)}</span></div>
                    ))}
                  </>
                )}
                <div className="txn-impact">
                  <i className="fas fa-arrow-right-arrow-left"></i>{' '}
                  {!editing && <>Bất động sản {prop ? viEnum(prop.status) : '—'} → <b>Đã giữ chỗ</b></>}
                  {completing && <>Bất động sản → <b>{dealType === 'Rent' ? 'Đã cho thuê (tự tạo hợp đồng thuê)' : 'Đã bán'}</b>{deal.leadId ? <> · Khách hàng → <b>Thành công</b></> : null}</>}
                  {editing && form.status === 'Cancelled' && deal.status !== 'Cancelled' && <>Bất động sản Đã giữ chỗ → <b>Có sẵn</b></>}
                  {editing && !completing && form.status !== 'Cancelled' && <>Trạng thái: <b>{viEnum(form.status)}</b></>}
                </div>
                {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                <div className="form-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
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
  const err = !(amt > 0) ? 'Nhập số tiền cần thu' : after < -0.01 ? 'Thu vượt mức — số dư chỉ còn ' + fmtPKR(r2(deal.dealAmount - paid)) : '';
  const submit = (e) => {
    e.preventDefault();
    if (err) return;
    setSaving(true);
    gsRun('addDealPayment', deal.id, form, currentUser).then((r) => {
      setSaving(false);
      if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
    }).catch(() => setSaving(false));
  };
  return (
    <div className="modal-overlay">
      <div className="modal modal-txn" style={{ maxWidth: 860 }}>
        <div className="modal-header">
          <h3><i className="fas fa-money-bill-wave"></i> Thu tiền giao dịch — {deal.propertyRef} · {deal.buyerName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="txn-split">
              <div className="txn-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label><i className="fas fa-money-bill"></i> Số tiền thu (VNĐ) *</label>
                    <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus placeholder="Nhập số tiền..." />
                  </div>
                  <SearchableDropdown label="Hình thức thanh toán" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.method} onChange={(v) => setForm({ ...form, method: v })} placeholder="Chọn hình thức…" />
                  <div className="form-group">
                    <label><i className="fas fa-hashtag"></i> Mã giao dịch / Số tham chiếu</label>
                    <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="Số ủy nhiệm chi, số hóa đơn..." />
                  </div>
                  <div className="form-group">
                    <label><i className="fas fa-align-left"></i> Ghi chú thu tiền</label>
                    <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Đợt thanh toán số 2, tiền mặt..." />
                  </div>
                </div>
              </div>
              <div className="txn-preview">
                <div className="txn-h"><i className="fas fa-calculator"></i> Tác động số dư</div>
                <div className="txn-line"><span className="f">Tổng giá trị giao dịch</span><span className="v">{fmtPKR(deal.dealAmount)}</span></div>
                <div className="txn-line"><span className="f">Đã thu trước đợt này</span><span className="v">{fmtPKR(paid)}</span></div>
                <div className="txn-line"><span className="f">Số tiền thu đợt này</span><span className="v">{fmtPKR(amt)}</span></div>
                <div className={'txn-line total' + (after < 0 ? ' bad' : '')}><span className="f">Số dư còn lại sau thu</span><span className="v">{fmtPKR(after)}</span></div>
                {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                <div className="form-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Xác nhận thu tiền</>}
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
  const [printDoc, setPrintDoc] = useState(null);
  const [stage, setStage] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({ search: initialSearch || '', type: '', agent: '' });
  useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
  useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Tải dữ liệu thất bại', text: String((error && error.message) || error) }); }, [error]);

  const base = useMemo(() => (rows || []).filter((x) =>
    (!filters.type || x.dealType === filters.type) && (!filters.agent || x.agent === filters.agent)
  ), [rows, filters.type, filters.agent]);
  const counts = useMemo(() => { const o = {}; base.forEach((x) => { o[x.status] = (o[x.status] || 0) + 1; }); return o; }, [base]);
  const visible = useMemo(() => {
    const q = String(filters.search || '').trim().toLowerCase();
    return (stage ? base.filter((x) => x.status === stage) : base).filter((x) => !q || [
      x.buyerName, x.buyerPhone, x.propertyRef, x.propertyTitle, x.agent, x.status, x.notes
    ].some((val) => String(val || '').toLowerCase().includes(q)));
  }, [base, stage, filters.search]);
  const activeFiltersCount = (filters.search ? 1 : 0) + (filters.type ? 1 : 0) + (filters.agent ? 1 : 0);

  const mm = ymNow();
  const kpi = useMemo(() => {
    const r = rows || [];
    const closedM = r.filter((x) => x.status === 'Completed' && String(x.closedAt || '').substr(0, 7) === mm);
    return [
      [r.filter((x) => ['Token', 'Agreement'].indexOf(x.status) !== -1).length, 'Giao dịch đang mở', 'fa-handshake', 'bg-navy'],
      [pkrShort(closedM.reduce((s, x) => s + x.dealAmount, 0)), 'Giá trị hoàn thành (tháng)', 'fa-sack-dollar', 'bg-success'],
      [pkrShort(closedM.reduce((s, x) => s + (x.commissionAmt || 0), 0)), 'Hoa hồng (tháng)', 'fa-percent', 'bg-info'],
      [pkrShort(r.filter((x) => ['Token', 'Agreement'].indexOf(x.status) !== -1).reduce((s, x) => s + (x.balance || 0), 0)), 'Số dư chưa thu', 'fa-hourglass-half', 'bg-warning']
    ];
  }, [rows, mm]);

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

  const refetch = () => { mutate();['props:all', 'leads:all', 'tenancies:all', 'dash:stats'].forEach((k) => swrMutate(k)); };
  const onAction = (action, x) => {
    if (action === 'wa') {
      const msg = 'Xin chào ' + (x.buyerName || 'Quý khách') + ', tôi là ' + (x.agent || 'chuyên viên') + ' phụ trách giao dịch BĐS ' + (x.propertyRef || '') + '. Tổng giá trị: ' + fmtPKR(x.dealAmount) + ', Đã thanh toán: ' + fmtPKR(x.paid) + ', Số dư còn lại: ' + fmtPKR(x.balance) + '.';
      waOpen(x.buyerPhone, msg);
    }
    else if (action === 'pay') setPaying(x);
    else if (action === 'edit') { setEditing(x); setShowModal(true); }
    else if (action === 'doc') {
      Swal.fire({
        title: 'Tạo văn bản A4 — Giao dịch #' + x.id,
        text: 'Chọn loại tài liệu bạn muốn xuất cho giao dịch này:',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '📄 HĐ Đặt cọc',
        denyButtonText: '🧾 Phiếu thu tiền',
        cancelButtonText: 'Đóng',
        confirmButtonColor: 'var(--navy-primary)',
        denyButtonColor: '#16a34a'
      }).then((res) => {
        if (res.isConfirmed) {
          Swal.showLoading();
          gsRun('buildAgreement', 'sale', x.id, currentUser).then((r) => {
            Swal.close();
            if (r && r.success) setPrintDoc({ doc: r, docType: 'sale', recId: x.id });
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Không thể tạo tài liệu' });
          });
        } else if (res.isDenied) {
          Swal.showLoading();
          gsRun('buildAgreement', 'receipt', x.id, currentUser).then((r) => {
            Swal.close();
            if (r && r.success) setPrintDoc({ doc: r, docType: 'receipt', recId: x.id });
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Không thể tạo tài liệu' });
          });
        }
      });
    }
    else if (action === 'paidout') {
      Swal.fire({ icon: 'question', title: 'Xác nhận đã chi hoa hồng?', text: x.agent + ' · ' + fmtPKR(x.agentShareAmt), showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Đã chi' })
        .then((r) => {
          if (r.isConfirmed) gsRun('markAgentPaid', x.id, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); refetch(); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' });
          });
        });
    }
    else if (action === 'delete') {
      Swal.fire({ icon: 'warning', title: 'Xóa giao dịch #' + x.id + '?', text: 'BĐS sẽ trở lại trạng thái Có sẵn.', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa' })
        .then((r) => {
          if (r.isConfirmed) gsRun('deleteDeal', x.id, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); refetch(); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' });
          });
        });
    }
  };

  const tableRef = useDataTable('dealsTable', rows === undefined ? null : visible, () => ({
    search: { search: filters.search },
    columns: [
      { data: 'propertyRef', title: 'Bất động sản', render: (d, t, x) => '<span class="prop-ref">' + esc(d || '—') + '</span><br><small style="color:#789">' + esc(String(x.propertyTitle || '').substr(0, 34)) + '</small>' },
      { data: 'buyerName', title: 'Người mua / Thuê', render: (d, t, x) => '<strong>' + esc(d) + '</strong><br><small style="color:#789">' + esc(x.buyerPhone || '') + '</small>' },
      { data: 'dealType', title: 'Loại hình', render: (d, t) => t === 'display' ? badge(d) : d },
      { data: 'dealAmount', title: 'Giá trị giao dịch', render: (d, t) => t === 'display' ? '<strong>' + esc(pkrShort(d)) + '</strong>' : d },
      { data: 'paid', title: 'Đã thu', render: (d, t) => t === 'display' ? esc(pkrShort(d)) : d },
      { data: 'balance', title: 'Số dư', render: (d, t) => t === 'display' ? '<span style="color:' + (d > 0 ? '#c0392b' : '#2e7d32') + ';font-weight:700">' + esc(pkrShort(d)) + '</span>' : d },
      {
        data: 'commissionAmt', title: 'Hoa hồng', render: (d, t, x) => t === 'display'
          ? esc(pkrShort(d)) + '<br>' + (x.status === 'Completed' ? badge(x.agentPaidAt ? 'Paid' : 'Payable') : '<small style="color:#789">' + esc(pkrShort(x.agentShareAmt || 0)) + ' NV</small>') : d
      },
      { data: 'agent', title: 'Nhân viên' },
      { data: 'status', title: 'Trạng thái', render: (d, t) => t === 'display' ? badge(d) : d },
      {
        data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-5', width: '180px', render: (d, t, x) => `<div class="table-actions slots-5">
            <button class="action-icon view-icon" data-action="doc" title="Tạo HĐ cọc / Phiếu thu 1-chạm"><i class="fas fa-file-contract"></i></button>
            ${canEdit && ['Token', 'Agreement'].indexOf(x.status) !== -1 ? '<button class="action-icon assign-icon" data-action="pay" title="Ghi nhận thanh toán"><i class="fas fa-money-bill-wave"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo người mua"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Chỉnh sửa giao dịch"><i class="fas fa-pen-to-square"></i></button>' : ''}
            ${all && x.status === 'Completed' && !x.agentPaidAt ? '<button class="action-icon edit-icon" data-action="paidout" title="Chi hoa hồng nhân viên"><i class="fas fa-hand-holding-dollar"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${canDel && x.status !== 'Completed' ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}</div>`
      }
    ],
    createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
    order: []
  }), onAction, [canEdit, canDel, all], (record) => setViewingLead(record));
  useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]);

  return (
    <>
      <KpiRow items={kpi} />

      {/* 1. Desktop Pipeline */}
      <div className="desk-pipeline-block">
        <Pipeline stages={ENUMS.dealStatus} counts={counts} active={stage} onPick={setStage} total={base.length} />
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
          {ENUMS.dealStatus.map((st) => {
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
      <div className="mob-deals-sub-toolbar">
        <div className="mob-sub-toolbar-left">
          <span className="mob-sub-count">
            <strong>{visible.length}</strong> Giao dịch {stage ? `· ${viEnum(stage)}` : ''}
          </span>
        </div>
        <div className="mob-sub-toolbar-right">
          {canAdd && (
            <button className="mob-tool-btn mob-tool-btn-primary" onClick={() => { setEditing(null); setShowModal(true); }} title="Giao dịch mới">
              <i className="fas fa-plus"></i>
            </button>
          )}
          <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc giao dịch">
            <i className="fas fa-sliders"></i>
            {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
          </button>
        </div>
      </div>

      {/* 4. Desktop Filters Section */}
      <div className="filters-section desk-filters-section">
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

      {/* 5. Data Section: Desktop Table & Mobile Luxury Cards */}
      <div className="data-section">
        <input type="file" id="dealsCsvImport" accept=".csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'PropertyRef', 'bulkImportDeals', currentUser, refetch); e.target.value = ''; }} />

        {/* Desktop Table View */}
        <div className="desk-deals-table-wrap">
          {loading ? <TableSkeleton rows={8} columns={10} /> : <div style={{ overflowX: 'auto' }}><table id="dealsTable" className="display" style={{ width: '100%' }}></table></div>}
        </div>

        {/* Mobile Luxury Cards List View */}
        <div className="mob-deals-cards-container">
          {loading ? (
            <div className="mob-deals-skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mob-deal-card-skeleton">
                  <div className="sk-line w50"></div>
                  <div className="sk-line w80"></div>
                  <div className="sk-line w40"></div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mob-deals-empty-state">
              <div className="empty-circle"><i className="fas fa-handshake-slash"></i></div>
              <h4>Chưa có giao dịch phù hợp</h4>
              <p>Thử đổi bộ lọc hoặc tạo hợp đồng giao dịch mới</p>
              {canAdd && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { setEditing(null); setShowModal(true); }}>
                  <i className="fas fa-plus"></i> Giao dịch mới
                </button>
              )}
            </div>
          ) : (
            visible.map((x) => {
              const initial = (x.buyerName || 'K').trim().charAt(0).toUpperCase();
              const isRent = x.dealType === 'Rent';
              return (
                <div key={x.id} className={'mob-deal-card status-' + (x.status || '').toLowerCase()}>
                  {/* HÀNG 1: Mã BĐS, Loại hình & Trạng thái */}
                  <div className="mob-deal-header-row">
                    <div className="mob-deal-ref-box">
                      <span className="prop-ref">{x.propertyRef || '#' + (x.propertyId || '—')}</span>
                      <span className={'mob-deal-type-badge ' + (isRent ? 'rent' : 'sale')}>
                        {isRent ? 'Thuê' : 'Bán'}
                      </span>
                    </div>
                    <Badge s={x.status} />
                  </div>

                  {/* HÀNG 2: Khách hàng mua/thuê & Tiêu đề BĐS */}
                  <div className="mob-deal-parties-row">
                    <div className="mob-deal-buyer-box" onClick={() => setViewingLead(x)}>
                      <div className="mob-lead-avatar" style={{ background: getLeadAvatarColor(x.buyerName || 'Khách hàng') }}>
                        {getLeadInitials(x.buyerName)}
                      </div>
                      <div className="mob-deal-buyer-info">
                        <div className="mob-deal-buyer-name">
                          <strong>{x.buyerName || 'Chưa có tên'}</strong>
                          <span className="mob-view-profile-hint"><i className="fas fa-address-card"></i> Hồ sơ</span>
                        </div>
                        <div className="mob-deal-buyer-phone">{x.buyerPhone || 'Chưa có SĐT'}</div>
                      </div>
                    </div>

                    <div className="mob-deal-prop-title">
                      <i className="fas fa-building"></i>
                      <span>{x.propertyTitle || 'Bất động sản giao dịch'}</span>
                    </div>
                  </div>

                  {/* HÀNG 3: Bảng 4 chỉ số tài chính (Financial KPI Tiles) */}
                  <div className="mob-deal-financial-grid">
                    <div className="mob-deal-fin-tile">
                      <span className="fin-label">Tổng giá trị</span>
                      <span className="fin-val main-val">{pkrShort(x.dealAmount)}</span>
                    </div>
                    <div className="mob-deal-fin-tile">
                      <span className="fin-label">Đã thanh toán</span>
                      <span className="fin-val paid-val">{pkrShort(x.paid)}</span>
                    </div>
                    <div className="mob-deal-fin-tile">
                      <span className="fin-label">Số dư còn lại</span>
                      <span className={'fin-val balance-val ' + (x.balance > 0 ? 'bad' : 'good')}>
                        {pkrShort(x.balance)}
                      </span>
                    </div>
                    <div className="mob-deal-fin-tile">
                      <span className="fin-label">Hoa hồng (HH)</span>
                      <span className="fin-val comm-val">
                        {pkrShort(x.commissionAmt || 0)}
                        {x.status === 'Completed' && (
                          <small className={'comm-status ' + (x.agentPaidAt ? 'paid' : 'due')}>
                            {x.agentPaidAt ? 'Đã chi NV' : 'Chưa chi NV'}
                          </small>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* HÀNG 4: Nhân viên & Ghi chú */}
                  <div className="mob-deal-meta-info">
                    <div className="mob-deal-agent">
                      <i className="fas fa-user-tie"></i> Phụ trách: <strong>{x.agent || 'Chưa phân công'}</strong>
                      <span className="agent-share-tag">({x.agentSharePct || 40}% = {pkrShort(x.agentShareAmt || 0)})</span>
                    </div>
                    {x.notes ? (
                      <div className="mob-deal-notes">
                        <i className="fas fa-note-sticky"></i> {x.notes}
                      </div>
                    ) : null}
                    {x.status === 'Cancelled' && x.cancellationReason ? (
                      <div className="mob-deal-cancel-reason">
                        <i className="fas fa-triangle-exclamation"></i> Lý do hủy: {x.cancellationReason}
                      </div>
                    ) : null}
                  </div>

                  {/* HÀNG 5: Các nút hành động 1-chạm */}
                  <div className="mob-deal-actions">
                    <button className="mob-btn mob-btn-doc" onClick={() => onAction('doc', x)} title="Tạo HĐ cọc / Phiếu thu">
                      <i className="fas fa-file-contract"></i> In HĐ
                    </button>
                    {canEdit && ['Token', 'Agreement'].indexOf(x.status) !== -1 && (
                      <button className="mob-btn mob-btn-pay" onClick={() => onAction('pay', x)} title="Thu tiền / Ghi nhận thanh toán">
                        <i className="fas fa-money-bill-wave"></i> Thu tiền
                      </button>
                    )}
                    <button className="mob-btn mob-btn-zalo" onClick={() => onAction('wa', x)} title="Nhắn Zalo người mua/thuê">
                      <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14, marginRight: 5 }}>
                        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" />
                        <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" />
                        <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                      </svg>
                      Zalo
                    </button>
                    {all && x.status === 'Completed' && !x.agentPaidAt && (
                      <button className="mob-btn mob-btn-paidout" onClick={() => onAction('paidout', x)} title="Chi hoa hồng nhân viên">
                        <i className="fas fa-hand-holding-dollar"></i> Chi HH
                      </button>
                    )}
                    {canEdit && (
                      <button className="mob-btn mob-btn-edit" onClick={() => onAction('edit', x)} title="Chỉnh sửa giao dịch">
                        <i className="fas fa-pen-to-square"></i>
                      </button>
                    )}
                    {canDel && x.status !== 'Completed' && (
                      <button className="mob-btn mob-btn-del" onClick={() => onAction('delete', x)} title="Xóa giao dịch">
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Mobile Filter Drawer (Bottom Sheet) */}
      {showFilterDrawer && (
        <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
          <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob-sheet-handle"></div>
            <div className="mob-sheet-header">
              <h3><i className="fas fa-filter"></i> Bộ lọc giao dịch</h3>
              <button className="mob-sheet-close" onClick={() => setShowFilterDrawer(false)}>&times;</button>
            </div>
            <div className="mob-sheet-body">
              <div className="mob-sheet-field">
                <label>Loại hình</label>
                <div className="mob-sheet-chips">
                  <button className={'mob-sheet-chip ' + (!filters.type ? 'active' : '')} onClick={() => setFilters({ ...filters, type: '' })}>Tất cả</button>
                  <button className={'mob-sheet-chip ' + (filters.type === 'Sale' ? 'active' : '')} onClick={() => setFilters({ ...filters, type: 'Sale' })}>Mua bán</button>
                  <button className={'mob-sheet-chip ' + (filters.type === 'Rent' ? 'active' : '')} onClick={() => setFilters({ ...filters, type: 'Rent' })}>Cho thuê</button>
                </div>
              </div>
              {all && (
                <div className="mob-sheet-field">
                  <label>Nhân viên phụ trách</label>
                  <SearchableDropdown label="" options={(lookups.agents || []).map((a) => ({ value: a.username, label: a.username + ' (' + a.role + ')' }))} value={filters.agent} onChange={(v) => setFilters({ ...filters, agent: v })} placeholder="Tất cả nhân viên" />
                </div>
              )}
            </div>
            <div className="mob-sheet-footer">
              <button className="btn btn-secondary" onClick={() => { setFilters({ search: '', type: '', agent: '' }); setStage(''); setShowFilterDrawer(false); }}>
                <i className="fas fa-rotate-left"></i> Đặt lại
              </button>
              <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                <i className="fas fa-check"></i> Áp dụng ({visible.length} Giao dịch)
              </button>
            </div>
          </div>
        </div>
      )}

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
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
    }).catch(() => setSaving(false));
  };
  return (
    <div className="modal-overlay">
      <div className="modal modal-owner-form" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h3><i className={'fas ' + (editing ? 'fa-pen-to-square' : 'fa-user-plus')}></i> {editing ? 'Chỉnh sửa chủ sở hữu #' + owner.id : 'Thêm chủ sở hữu mới'}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="form-grid">
              <div className="form-group"><label><i className="fas fa-user"></i> Họ và tên *</label><input value={form.name} onChange={setEv('name')} required placeholder="Ví dụ: Nguyễn Văn An" /></div>
              <div className="form-group"><label><i className="fas fa-phone"></i> Điện thoại * <small style={{ color: '#94a3b8', textTransform: 'none' }}>(khóa định danh)</small></label><input value={form.phone} onChange={setEv('phone')} required placeholder="0901234567" /></div>
              <div className="form-group"><label><i className="fas fa-envelope"></i> Email</label><input type="email" value={form.email} onChange={setEv('email')} placeholder="owner@example.com" /></div>
              <div className="form-group"><label><i className="fas fa-id-card"></i> Số CCCD / CMND</label><input value={form.cnic} onChange={setEv('cnic')} placeholder="Nhập số CCCD/CMND..." /></div>
            </div>
            <div className="form-group"><label><i className="fas fa-location-dot"></i> Địa chỉ liên hệ</label><input value={form.address} onChange={setEv('address')} placeholder="Số nhà, tên đường, phường/xã, quận/huyện..." /></div>
            <div className="form-group"><label><i className="fas fa-align-left"></i> Ghi chú</label><textarea rows="2" value={form.notes} onChange={setEv('notes')} placeholder="Thông tin bổ sung, người đại diện..."></textarea></div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> {editing ? 'Cập nhật chủ sở hữu' : 'Lưu chủ sở hữu'}</>}
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
  const props = (pRes && pRes.success ? pRes.data : []).filter((p) => p.ownerId == owner.id || (!p.ownerId && p.ownerPhone && String(p.ownerPhone).trim() === String(owner.phone).trim()));
  const propIds = {}; props.forEach((p) => { propIds[p.id] = 1; });
  const deals = (dRes && dRes.success ? dRes.data : []).filter((x) => propIds[x.propertyId]);
  const [tab, setTab] = useState('over');
  return (
    <div className="modal-overlay">
      <div className="modal modal-owner360">
        <div className="modal-header">
          <h3><i className="fas fa-user-tie"></i> Hồ sơ chủ sở hữu 360 — {owner.name}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="id-head">
            <div>
              <div className="nm">{owner.name}</div>
              <div className="sub"><i className="fas fa-phone"></i> {owner.phone}{owner.email ? ' · ' + owner.email : ''}{owner.cnic ? ' · CCCD: ' + owner.cnic : ''}</div>
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
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({ search: initialSearch || '' });
  useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);

  const visible = useMemo(() => {
    const q = String(filters.search || '').trim().toLowerCase();
    return (rows || []).filter((o) => !q || [
      o.name, o.phone, o.email, o.cnic, o.address, o.notes
    ].some((val) => String(val || '').toLowerCase().includes(q)));
  }, [rows, filters.search]);
  const activeFiltersCount = filters.search ? 1 : 0;

  const kpi = useMemo(() => {
    const r = rows || []; return [
      [r.length, 'Tổng chủ sở hữu', 'fa-user-tie', 'bg-navy'],
      [r.filter((o) => (o.propertyCount || 0) > 0).length, 'Có BĐS gửi bán/thuê', 'fa-building', 'bg-info'],
      [r.reduce((s, o) => s + (o.propertyCount || 0), 0), 'BĐS liên kết', 'fa-link', 'bg-success'],
      [pkrShort(r.reduce((s, o) => s + (o.totalBusiness || 0), 0)), 'Tổng doanh số', 'fa-sack-dollar', 'bg-warning']
    ];
  }, [rows]);

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
    else if (action === 'wa') {
      const msg = 'Xin chào ' + (o.name || 'Quý khách') + ', chúng tôi liên hệ từ bộ phận quản lý BĐS.';
      waOpen(o.phone, msg);
    }
    else if (action === 'edit') { setEditing(o); setShowModal(true); }
    else if (action === 'delete') {
      Swal.fire({ icon: 'warning', title: 'Xóa chủ sở hữu "' + o.name + '"?', text: 'Các BĐS liên kết sẽ bị gỡ liên kết chủ sở hữu.', showCancelButton: true, confirmButtonColor: '#ea4335', confirmButtonText: 'Xóa', cancelButtonText: 'Hủy' })
        .then((r) => {
          if (r.isConfirmed) gsRun('deleteOwner', o.id, currentUser).then((res) => {
            if (res && res.success) { Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false }); mutate(); }
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' });
          });
        });
    }
  };

  const tableRef = useDataTable('ownersTable', rows === undefined ? null : visible, () => ({
    search: { search: filters.search },
    columns: [
      {
        data: 'name', title: 'Chủ sở hữu', render: (d, t, o) => t === 'display'
          ? '<button type="button" class="table-record-link" data-action="view" title="Xem hồ sơ chủ sở hữu"><strong>' + esc(d) + '</strong><span class="record-phone">' + esc(o.phone) + '</span></button>'
          : d
      },
      { data: 'email', title: 'Email', render: (d) => esc(d || '—') },
      { data: 'address', title: 'Địa chỉ', render: (d) => esc(d || '—') },
      { data: 'propertyCount', title: 'Số BĐS', render: (d, t) => t === 'display' ? (Number(d || 0) > 0 ? '<span class="badge badge-success" style="font-weight:700;">' + Number(d || 0) + ' BĐS</span>' : '<span style="color:#94a3b8;">0</span>') : Number(d || 0) },
      { data: 'totalBusiness', title: 'Tổng doanh số', render: (d, t) => t === 'display' ? esc(pkrShort(d)) : d },
      { data: 'created', title: 'Ngày tạo', render: (d, t) => t === 'display' ? fmtDate(d) : (d || '') },
      {
        data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-4', width: '140px', render: () => `<div class="table-actions slots-4">
            <button class="action-icon view-icon" data-action="view" title="Hồ sơ chủ sở hữu 360"><i class="fas fa-id-card-clip"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${canEdit ? '<button class="action-icon edit-icon" data-action="edit" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>' : ''}
            ${canDel ? '<button class="action-icon delete-icon" data-action="delete" title="Xóa"><i class="fas fa-trash"></i></button>' : ''}</div>`
      }
    ],
    createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ chủ sở hữu 360'); },
    order: []
  }), onAction, [canEdit, canDel], (owner) => setViewing(owner));
  useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]);

  return (
    <>
      <KpiRow items={kpi} />

      {/* 1. Mobile Sub-Toolbar */}
      <div className="mob-owners-sub-toolbar">
        <div className="mob-sub-toolbar-left">
          <span className="mob-sub-count">
            <strong>{visible.length}</strong> Chủ sở hữu
          </span>
        </div>
        <div className="mob-sub-toolbar-right">
          {canAdd && (
            <button className="mob-tool-btn mob-tool-btn-primary" onClick={() => { setEditing(null); setShowModal(true); }} title="Thêm chủ sở hữu">
              <i className="fas fa-plus"></i>
            </button>
          )}
          <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc chủ sở hữu">
            <i className="fas fa-sliders"></i>
            {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
          </button>
        </div>
      </div>

      {/* 2. Desktop Filters Section */}
      <div className="filters-section desk-filters-section">
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

      {/* 3. Data Section: Desktop Table & Mobile Luxury Cards */}
      <div className="data-section">
        <input type="file" id="ownersCsvImport" accept=".csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files[0]; if (f) importCSVFile(f, 'Name', 'bulkImportOwners', currentUser, () => mutate()); e.target.value = ''; }} />

        {/* Desktop Table View */}
        <div className="desk-owners-table-wrap">
          {loading ? <TableSkeleton rows={8} columns={7} /> : <div style={{ overflowX: 'auto' }}><table id="ownersTable" className="display" style={{ width: '100%' }}></table></div>}
        </div>

        {/* Mobile Luxury Cards List View */}
        <div className="mob-owners-cards-container">
          {loading ? (
            <div className="mob-owners-skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mob-owner-card-skeleton">
                  <div className="sk-line w50"></div>
                  <div className="sk-line w80"></div>
                  <div className="sk-line w40"></div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mob-owners-empty-state">
              <div className="empty-circle"><i className="fas fa-user-slash"></i></div>
              <h4>Chưa có chủ sở hữu phù hợp</h4>
              <p>Thử tìm kiếm từ khóa khác hoặc thêm chủ sở hữu mới</p>
              {canAdd && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => { setEditing(null); setShowModal(true); }}>
                  <i className="fas fa-plus"></i> Thêm chủ sở hữu
                </button>
              )}
            </div>
          ) : (
            visible.map((o) => {
              const initial = (o.name || 'C').trim().charAt(0).toUpperCase();
              return (
                <div key={o.id} className="mob-owner-card">
                  {/* HÀNG 1: Avatar & Tên chủ sở hữu */}
                  <div className="mob-owner-header-row" onClick={() => setViewing(o)}>
                    <div className="mob-lead-avatar" style={{ background: getLeadAvatarColor(o.name || 'Chủ sở hữu') }}>
                      {getLeadInitials(o.name)}
                    </div>
                    <div className="mob-owner-header-info">
                      <div className="mob-owner-name">
                        <strong>{o.name || 'Chưa có tên'}</strong>
                        <span className="mob-owner-id-badge">#{o.id}</span>
                      </div>
                      <div className="mob-owner-phone">
                        <i className="fas fa-phone"></i> {o.phone || 'Chưa có SĐT'}
                      </div>
                    </div>
                    <span className="mob-view-profile-hint"><i className="fas fa-id-card-clip"></i> 360</span>
                  </div>

                  {/* HÀNG 2: Thông tin chi tiết (Email, CCCD, Địa chỉ) */}
                  <div className="mob-owner-meta-row">
                    {o.email && (
                      <div className="mob-owner-meta-item">
                        <i className="fas fa-envelope"></i> {o.email}
                      </div>
                    )}
                    {o.cnic && (
                      <div className="mob-owner-meta-item">
                        <i className="fas fa-id-card"></i> CCCD: {o.cnic}
                      </div>
                    )}
                    {o.address && (
                      <div className="mob-owner-meta-item">
                        <i className="fas fa-location-dot"></i> {o.address}
                      </div>
                    )}
                    {o.notes && (
                      <div className="mob-owner-notes">
                        <i className="fas fa-note-sticky"></i> {o.notes}
                      </div>
                    )}
                  </div>

                  {/* HÀNG 3: Bảng 3 chỉ số tài sản (Portfolio KPI Grid) */}
                  <div className="mob-owner-kpi-grid">
                    <div className="mob-owner-kpi-tile">
                      <span className="kpi-label">Số BĐS gửi</span>
                      <span className="kpi-val props-val">
                        <i className="fas fa-building"></i> {o.propertyCount || 0}
                      </span>
                    </div>
                    <div className="mob-owner-kpi-tile">
                      <span className="kpi-label">Tổng doanh số</span>
                      <span className="kpi-val biz-val">
                        {pkrShort(o.totalBusiness || 0)}
                      </span>
                    </div>
                    <div className="mob-owner-kpi-tile">
                      <span className="kpi-label">Ngày tham gia</span>
                      <span className="kpi-val date-val">
                        {fmtDate(o.created) || '—'}
                      </span>
                    </div>
                  </div>

                  {/* HÀNG 4: Nút hành động 1-chạm */}
                  <div className="mob-owner-actions">
                    <button className="mob-btn mob-btn-view" onClick={() => onAction('view', o)} title="Hồ sơ chủ sở hữu 360">
                      <i className="fas fa-id-card-clip"></i> 360
                    </button>
                    <button className="mob-btn mob-btn-zalo" onClick={() => onAction('wa', o)} title="Nhắn Zalo">
                      <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14, marginRight: 5 }}>
                        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" />
                        <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" />
                        <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                      </svg>
                      Zalo
                    </button>
                    {canEdit && (
                      <button className="mob-btn mob-btn-edit" onClick={() => onAction('edit', o)} title="Chỉnh sửa">
                        <i className="fas fa-pen-to-square"></i>
                      </button>
                    )}
                    {canDel && (
                      <button className="mob-btn mob-btn-del" onClick={() => onAction('delete', o)} title="Xóa">
                        <i className="fas fa-trash"></i>
                      </button>
                    )}
                  </div>
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
              <h4><i className="fas fa-sliders"></i> Bộ lọc chủ sở hữu</h4>
              <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
            </div>
            <div className="mob-sheet-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm chủ sở hữu</label>
                <input className="filter-input" value={filters.search} placeholder="Tên, SĐT, email, CCCD, địa chỉ…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
            </div>
            <div className="mob-sheet-footer">
              <button className="btn btn-secondary" onClick={() => { setFilters({ search: '' }); setShowFilterDrawer(false); }}>
                <i className="fas fa-rotate-left"></i> Đặt lại
              </button>
              <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                <i className="fas fa-check"></i> Áp dụng ({visible.length} Chủ sở hữu)
              </button>
            </div>
          </div>
        </div>
      )}

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
  const err = !/^\d{4}-\d{2}$/.test(form.month) ? 'Chọn tháng thu tiền' : !(amt > 0) ? 'Nhập số tiền thu'
    : (ten.rentLog || []).some((q) => q.month === form.month) ? 'Tháng ' + form.month + ' đã được thu trước đó' : '';
  const submit = (e) => {
    e.preventDefault();
    if (err) return;
    setSaving(true);
    gsRun('collectRent', ten.id, form, currentUser).then((r) => {
      setSaving(false);
      if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
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
                  <div className="form-group"><label><i className="fas fa-calendar"></i> Tháng thu tiền *</label>
                    <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} required /></div>
                  <div className="form-group"><label><i className="fas fa-money-bill"></i> Số tiền thu (VNĐ) *</label>
                    <input type="number" min="1" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></div>
                  <SearchableDropdown label="Hình thức thanh toán" icon="fas fa-wallet" options={opts(ENUMS.paymentMethod)} value={form.method} onChange={(v) => setForm({ ...form, method: v })} placeholder="Chọn hình thức…" />
                  <div className="form-group"><label><i className="fas fa-hashtag"></i> Mã tham chiếu / Số chứng từ</label>
                    <input value={form.ref} onChange={(e) => setForm({ ...form, ref: e.target.value })} placeholder="Ủy nhiệm chi, hóa đơn..." /></div>
                </div>
              </div>
              <div className="txn-preview">
                <div className="txn-h"><i className="fas fa-calculator"></i> Tình trạng tiền thuê</div>
                <div className="txn-line"><span className="f">Tiền thuê / tháng</span><span className="v">{fmtPKR(ten.monthlyRent)}</span></div>
                <div className="txn-line"><span className="f">Các tháng chưa thu</span><span className="v">{due.length ? due.join(', ') : 'Không có'}</span></div>
                <div className={'txn-line' + (arrearsNow > 0 ? ' bad' : '')}><span className="f">Công nợ trước thu</span><span className="v">{fmtPKR(arrearsNow)}</span></div>
                <div className="txn-line total"><span className="f">Công nợ còn lại sau thu</span><span className="v">{fmtPKR(Math.max(0, r2(arrearsNow - amt)))}</span></div>
                {err && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> {err}</div>}
                <div className="form-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Xác nhận thu tiền</>}
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
  const err = !(r2(form.newRent) > 0) ? 'Nhập giá thuê mới' : '';
  const submit = (e) => {
    e.preventDefault();
    if (err) return;
    setSaving(true);
    gsRun('renewTenancy', ten.id, form, currentUser).then((r) => {
      setSaving(false);
      if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 1800, showConfirmButton: false }); onSaved(); }
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
    }).catch(() => setSaving(false));
  };
  return (
    <div className="modal-overlay">
      <div className="modal modal-txn" style={{ maxWidth: 860 }}>
        <div className="modal-header">
          <h3><i className="fas fa-file-signature"></i> Gia hạn hợp đồng thuê — {ten.propertyRef} · {ten.tenantName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="txn-split">
              <div className="txn-form">
                <div className="form-grid">
                  <div className="form-group"><label><i className="fas fa-money-bill-trend-up"></i> Giá thuê mới (VNĐ) *</label>
                    <input type="number" min="1" step="any" value={form.newRent} onChange={(e) => setForm({ ...form, newRent: e.target.value })} required /></div>
                  <div className="form-group"><label><i className="fas fa-calendar-day"></i> Ngày kết thúc mới</label>
                    <input type="date" value={form.newEndDate} onChange={(e) => setForm({ ...form, newEndDate: e.target.value })} /></div>
                </div>
                <div className="form-group"><label><i className="fas fa-align-left"></i> Ghi chú gia hạn</label>
                  <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Thỏa thuận tăng giá, gia hạn 1 năm…"></textarea></div>
              </div>
              <div className="txn-preview">
                <div className="txn-h"><i className="fas fa-calculator"></i> Tính toán gia hạn</div>
                <div className="txn-line"><span className="f">Giá thuê hiện tại</span><span className="v">{fmtPKR(ten.monthlyRent)}</span></div>
                <div className="txn-line"><span className="f">Giá thuê mới</span><span className="v">{fmtPKR(r2(form.newRent))}</span></div>
                <div className="txn-line total"><span className="f">Tỷ lệ điều chỉnh</span><span className="v">{inc}%</span></div>
                <div className="txn-impact"><i className="fas fa-calendar"></i> Hạn HĐ: {ten.endDate || 'không thời hạn'} → <b>{form.newEndDate || ten.endDate || 'không thời hạn'}</b></div>
                {err && <div className="txn-err">{err}</div>}
                <div className="form-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !!err}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang lưu…</> : <><i className="fas fa-save"></i> Xác nhận gia hạn</>}
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
  const err = ded > (ten.securityDeposit || 0) ? 'Khấu trừ vượt quá tiền cọc' : '';
  const submit = (e) => {
    e.preventDefault();
    if (err) return;
    setSaving(true);
    gsRun('endTenancy', ten.id, form, currentUser).then((r) => {
      setSaving(false);
      if (r && r.success) { Swal.fire({ icon: 'success', title: r.message, timer: 2000, showConfirmButton: false }); onSaved(); }
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
    }).catch(() => setSaving(false));
  };
  return (
    <div className="modal-overlay">
      <div className="modal modal-txn" style={{ maxWidth: 880 }}>
        <div className="modal-header">
          <h3><i className="fas fa-door-open"></i> Kết thúc hợp đồng thuê — {ten.propertyRef} · {ten.tenantName}</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            <div className="txn-split">
              <div className="txn-form">
                <div className="form-grid">
                  <div className="form-group"><label><i className="fas fa-scissors"></i> Khấu trừ tiền cọc (VNĐ)</label>
                    <input type="number" min="0" step="any" value={form.deductions} onChange={(e) => setForm({ ...form, deductions: e.target.value })} placeholder="Hư hỏng cơ sở vật chất, tiền điện nước…" /></div>
                </div>
                <div className="form-group"><label><i className="fas fa-align-left"></i> Ghi chú kết thúc</label>
                  <textarea rows="3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Lý do khấu trừ, tình trạng bàn giao nhà…"></textarea></div>
                {(ten.arrears || 0) > 0 && <div className="txn-err"><i className="fas fa-triangle-exclamation"></i> Người thuê còn nợ {fmtPKR(ten.arrears)} — hãy thu hoặc khấu trừ trước khi kết thúc.</div>}
              </div>
              <div className="txn-preview">
                <div className="txn-h"><i className="fas fa-calculator"></i> Quyết toán tiền cọc</div>
                <div className="txn-line"><span className="f">Tiền cọc ban đầu</span><span className="v">{fmtPKR(ten.securityDeposit)}</span></div>
                <div className="txn-line"><span className="f">Khấu trừ</span><span className="v">− {fmtPKR(ded)}</span></div>
                <div className={'txn-line total' + (refund < 0 ? ' bad' : '')}><span className="f">Hoàn trả người thuê</span><span className="v">{fmtPKR(refund)}</span></div>
                <div className="txn-impact"><i className="fas fa-arrow-right-arrow-left"></i> Bất động sản → <b>Có sẵn</b> (mở lại cho thuê)</div>
                {err && <div className="txn-err">{err}</div>}
                <div className="form-actions" style={{ marginTop: 16 }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-danger" disabled={saving || !!err}>
                    {saving ? <><i className="fas fa-spinner fa-spin"></i> Đang kết thúc…</> : <><i className="fas fa-door-open"></i> Kết thúc hợp đồng</>}
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
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
    }).catch(() => setBusy(false));
  };
  const fixIssue = (m) => {
    Swal.fire({ icon: 'question', title: 'Đánh dấu đã sửa?', input: 'number', inputLabel: 'Chi phí sửa chữa (VNĐ — đồng bộ vào chi phí bất động sản)', inputValue: m.cost || 0, showCancelButton: true, confirmButtonColor: '#001f3f', confirmButtonText: 'Đã sửa' })
      .then((r) => {
        if (r.isConfirmed) gsRun('updateMaintenance', ten.id, m.id, { status: 'Fixed', cost: r.value || 0 }, currentUser).then((res) => {
          if (res && res.success) onChanged(); else Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Thao tác thất bại' });
        });
      });
  };
  return (
    <div className="modal-overlay">
      <div className="modal modal-tenancy360">
        <div className="modal-header">
          <h3><i className="fas fa-house-user"></i> Hợp đồng thuê 360 — {ten.propertyRef}</h3>
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
  const [printDoc, setPrintDoc] = useState(null);
  const [stage, setStage] = useState('Active');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState({ search: initialSearch || '' });
  useEffect(() => { if (initialSearch) setFilters((f) => ({ ...f, search: initialSearch })); }, [initialSearch]);
  useEffect(() => { if (error) Swal.fire({ icon: 'error', title: 'Tải dữ liệu thất bại', text: String((error && error.message) || error) }); }, [error]);

  const counts = useMemo(() => { const o = {}; (rows || []).forEach((t) => { o[t.status] = (o[t.status] || 0) + 1; }); return o; }, [rows]);
  const visible = useMemo(() => {
    const q = String(filters.search || '').trim().toLowerCase();
    return (stage ? (rows || []).filter((t) => t.status === stage) : (rows || [])).filter((t) => !q || [
      t.tenantName, t.tenantPhone, t.propertyRef, t.propertyTitle, t.agent, t.status
    ].some((val) => String(val || '').toLowerCase().includes(q)));
  }, [rows, stage, filters.search]);
  const activeFiltersCount = filters.search ? 1 : 0;

  const mm = ymNow();
  const kpi = useMemo(() => {
    const r = (rows || []).filter((t) => t.status === 'Active'); return [
      [r.length, 'Hợp đồng thuê đang hoạt động', 'fa-house-user', 'bg-navy'],
      [pkrShort(r.reduce((s, t) => s + (t.monthlyRent || 0), 0)), 'Tổng tiền thuê / tháng', 'fa-sack-dollar', 'bg-info'],
      [pkrShort((rows || []).reduce((s, t) => s + (t.rentLog || []).filter((q) => q.month === mm).reduce((a, q) => a + q.amount, 0), 0)), 'Đã thu trong tháng', 'fa-circle-check', 'bg-success'],
      [r.filter((t) => t.arrears > 0).length, 'Đang có công nợ', 'fa-triangle-exclamation', 'bg-danger']
    ];
  }, [rows, mm]);

  useEffect(() => {
    const dt = () => tableRef.current;
    setPageActions([
      { icon: 'fa-file-csv', label: 'CSV', onClick: () => dt() && dt().button('.buttons-csv').trigger() },
      { icon: 'fa-file-pdf', label: 'PDF', onClick: () => dt() && dt().button('.buttons-pdf').trigger() },
      { icon: 'fa-print', label: 'In', onClick: () => dt() && dt().button('.buttons-print').trigger() }
    ]); // tenancies are BORN from completed Rent deals — no manual add/import by design
    return () => setPageActions([]);
  }, []);

  const refetch = () => { mutate();['props:all', 'dash:stats'].forEach((k) => swrMutate(k)); };
  const onAction = (action, t) => {
    if (action === 'view') setModal({ type: 'view', ten: t });
    else if (action === 'collect') setModal({ type: 'collect', ten: t });
    else if (action === 'renew') setModal({ type: 'renew', ten: t });
    else if (action === 'end') setModal({ type: 'end', ten: t });
    else if (action === 'doc') {
      Swal.fire({
        title: 'Tạo văn bản A4 — HĐ #' + t.id,
        text: 'Chọn loại tài liệu bạn muốn xuất cho hợp đồng thuê này:',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: '📄 Hợp đồng thuê',
        denyButtonText: '📋 Biên bản bàn giao',
        cancelButtonText: 'Đóng',
        confirmButtonColor: 'var(--navy-primary)',
        denyButtonColor: '#0284c7'
      }).then((res) => {
        if (res.isConfirmed) {
          Swal.showLoading();
          gsRun('buildAgreement', 'rental', t.id, currentUser).then((r) => {
            Swal.close();
            if (r && r.success) setPrintDoc({ doc: r, docType: 'rental', recId: t.id });
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Không thể tạo tài liệu' });
          });
        } else if (res.isDenied) {
          Swal.showLoading();
          gsRun('buildAgreement', 'handover', t.id, currentUser).then((r) => {
            Swal.close();
            if (r && r.success) setPrintDoc({ doc: r, docType: 'handover', recId: t.id });
            else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Không thể tạo tài liệu' });
          });
        }
      });
    }
    else if (action === 'wa') {
      const last = (t.rentLog || []).slice(-1)[0];
      const msg = 'Xin chào ' + (t.tenantName || 'Quý khách') + ', tôi liên hệ về hợp đồng thuê ' + (t.propertyRef || '') + '. Tiền thuê: ' + fmtPKR(t.monthlyRent) + '/tháng (hạn ngày ' + (t.rentDueDay || 5) + ' hàng tháng). Công nợ hiện tại: ' + (t.arrears > 0 ? fmtPKR(t.arrears) : '0 đ') + '.';
      waOpen(t.tenantPhone, msg);
    }
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
      {
        data: null, title: 'Thao tác', orderable: false, className: 'dt-actions actions-5', width: '180px', render: (d, t, x) => `<div class="table-actions slots-5">
            <button class="action-icon view-icon" data-action="doc" title="Tạo HĐ thuê / Biên bản bàn giao 1-chạm"><i class="fas fa-file-contract"></i></button>
            ${canEdit && x.status === 'Active' ? '<button class="action-icon assign-icon" data-action="collect" title="Thu tiền thuê"><i class="fas fa-money-bill-wave"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            <button class="action-icon view-icon" data-action="view" title="Chi tiết HĐ 360"><i class="fas fa-eye"></i></button>
            <button class="action-icon wa-icon" data-action="wa" title="Nhắn Zalo người thuê"><svg class="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" stroke-width="4.5"/><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5"/><text x="50.5" y="58" fill="#ffffff" font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
            ${all && x.status === 'Active' ? '<button class="action-icon edit-icon" data-action="renew" title="Gia hạn hợp đồng"><i class="fas fa-file-signature"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}
            ${all && x.status === 'Active' ? '<button class="action-icon delete-icon" data-action="end" title="Kết thúc hợp đồng"><i class="fas fa-door-open"></i></button>' : '<span class="action-slot" aria-hidden="true"></span>'}</div>`
      }
    ],
    createdRow: (row) => { row.classList.add('dblclick-row'); row.setAttribute('title', 'Nhấp đúp để mở hồ sơ khách hàng'); },
    order: []
  }), onAction, [canEdit, canDel, all], (record) => setViewingLead(record));
  useEffect(() => { const t = tableRef.current; if (t && t.search() !== (filters.search || '')) t.search(filters.search || '').draw(); }, [filters.search, visible]);

  return (
    <>
      <KpiRow items={kpi} />

      {/* 1. Desktop Pipeline */}
      <div className="desk-pipeline-block">
        <Pipeline stages={ENUMS.tenancyStatus} counts={counts} active={stage} onPick={setStage} total={(rows || []).length} />
      </div>

      {/* 2. Mobile Horizontally Scrollable Pipeline Pills */}
      <div className="mob-pipeline-bar">
        <div className="mob-pills-scroll">
          <button
            className={'mob-pill ' + (!stage ? 'active' : '')}
            onClick={() => setStage('')}
          >
            <span>Tất cả</span>
            <span className="mob-pill-badge">{(rows || []).length}</span>
          </button>
          {ENUMS.tenancyStatus.map((st) => {
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
      <div className="mob-tenancies-sub-toolbar">
        <div className="mob-sub-toolbar-left">
          <span className="mob-sub-count">
            <strong>{visible.length}</strong> Hợp đồng {stage ? `· ${viEnum(stage)}` : ''}
          </span>
        </div>
        <div className="mob-sub-toolbar-right">
          <button className={'mob-tool-btn mob-tool-filter ' + (activeFiltersCount > 0 ? 'active' : '')} onClick={() => setShowFilterDrawer(true)} title="Bộ lọc hợp đồng thuê">
            <i className="fas fa-sliders"></i>
            {activeFiltersCount > 0 && <span className="mob-filter-dot"></span>}
          </button>
        </div>
      </div>

      {/* 4. Desktop Filters Section */}
      <div className="filters-section desk-filters-section">
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

      {/* 5. Data Section: Desktop Table & Mobile Luxury Cards */}
      <div className="data-section">
        {/* Desktop Table View */}
        <div className="desk-tenancies-table-wrap">
          {loading ? <TableSkeleton rows={6} columns={8} /> : <div style={{ overflowX: 'auto' }}><table id="tenTable" className="display" style={{ width: '100%' }}></table></div>}
          {!loading && (rows || []).length === 0 && <p style={{ color: '#789', textAlign: 'center', padding: 16 }}>Chưa có hợp đồng thuê — khi hoàn thành giao dịch thuê, hệ thống sẽ tự động tạo hợp đồng.</p>}
        </div>

        {/* Mobile Luxury Cards List View */}
        <div className="mob-tenancies-cards-container">
          {loading ? (
            <div className="mob-tenancies-skeleton-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="mob-tenancy-card-skeleton">
                  <div className="sk-line w50"></div>
                  <div className="sk-line w80"></div>
                  <div className="sk-line w40"></div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="mob-tenancies-empty-state">
              <div className="empty-circle"><i className="fas fa-house-user"></i></div>
              <h4>Chưa có hợp đồng phù hợp</h4>
              <p>Hợp đồng thuê được tự động sinh ra khi hoàn thành giao dịch cho thuê</p>
            </div>
          ) : (
            visible.map((t) => {
              const initial = (t.tenantName || 'T').trim().charAt(0).toUpperCase();
              const isExpiring = expSoon(t);
              const lastPayment = (t.rentLog || []).slice(-1)[0];
              return (
                <div key={t.id} className={'mob-tenancy-card status-' + (t.status || '').toLowerCase()}>
                  {/* HÀNG 1: Mã BĐS & Trạng thái */}
                  <div className="mob-tenancy-header-row">
                    <div className="mob-tenancy-ref-box">
                      <span className="prop-ref">{t.propertyRef || '#' + (t.propertyId || '—')}</span>
                      <span className="mob-tenancy-type-badge">HĐ Thuê</span>
                      {isExpiring && <span className="mob-expiring-badge">≤ 30 ngày</span>}
                    </div>
                    <Badge s={t.status} />
                  </div>

                  {/* HÀNG 2: Khách thuê & Tiêu đề BĐS */}
                  <div className="mob-tenancy-parties-row">
                    <div className="mob-tenancy-tenant-box" onClick={() => setViewingLead(t)}>
                      <div className="mob-lead-avatar" style={{ background: getLeadAvatarColor(t.tenantName || 'Người thuê') }}>
                        {getLeadInitials(t.tenantName)}
                      </div>
                      <div className="mob-tenancy-tenant-info">
                        <div className="mob-tenancy-tenant-name">
                          <strong>{t.tenantName || 'Chưa có tên'}</strong>
                          <span className="mob-view-profile-hint"><i className="fas fa-address-card"></i> Hồ sơ</span>
                        </div>
                        <div className="mob-tenancy-tenant-phone">{t.tenantPhone || 'Chưa có SĐT'}</div>
                      </div>
                    </div>

                    <div className="mob-tenancy-prop-title">
                      <i className="fas fa-building"></i>
                      <span>{t.propertyTitle || 'Bất động sản cho thuê'}</span>
                    </div>
                  </div>

                  {/* HÀNG 3: Bảng 4 chỉ số tài chính HĐ (Financial Grid) */}
                  <div className="mob-tenancy-financial-grid">
                    <div className="mob-tenancy-fin-tile">
                      <span className="fin-label">Tiền thuê / tháng</span>
                      <span className="fin-val rent-val">
                        {pkrShort(t.monthlyRent)}
                        <small className="due-day-hint">Hạn ngày {t.rentDueDay || 5}</small>
                      </span>
                    </div>
                    <div className="mob-tenancy-fin-tile">
                      <span className="fin-label">Đã thu (Tổng)</span>
                      <span className="fin-val collected-val">
                        {pkrShort(t.collected || 0)}
                        <small className="last-pay-hint">{lastPayment ? lastPayment.month : 'Chưa thu'}</small>
                      </span>
                    </div>
                    <div className="mob-tenancy-fin-tile">
                      <span className="fin-label">Công nợ</span>
                      <span className={'fin-val arrears-val ' + (t.arrears > 0 ? 'bad' : 'good')}>
                        {t.arrears > 0 ? pkrShort(t.arrears) : '0 đ'}
                      </span>
                    </div>
                    <div className="mob-tenancy-fin-tile">
                      <span className="fin-label">Tiền đặt cọc</span>
                      <span className="fin-val deposit-val">{pkrShort(t.securityDeposit || 0)}</span>
                    </div>
                  </div>

                  {/* HÀNG 4: Thời hạn & Nhân viên */}
                  <div className="mob-tenancy-meta-info">
                    <div className="mob-tenancy-dates">
                      <i className="fas fa-calendar-days"></i> Thời hạn: <strong>{t.startDate || '—'}</strong> → <strong>{t.endDate || 'Không thời hạn'}</strong>
                    </div>
                    <div className="mob-tenancy-agent">
                      <i className="fas fa-user-tie"></i> Phụ trách: <strong>{t.agent || 'Chưa phân công'}</strong>
                    </div>
                  </div>

                  {/* HÀNG 5: Các nút hành động 1-chạm */}
                  <div className="mob-tenancy-actions">
                    <button className="mob-btn mob-btn-doc" onClick={() => onAction('doc', t)} title="Tạo HĐ thuê / Biên bản bàn giao">
                      <i className="fas fa-file-contract"></i> In HĐ
                    </button>
                    {canEdit && t.status === 'Active' && (
                      <button className="mob-btn mob-btn-collect" onClick={() => onAction('collect', t)} title="Thu tiền thuê">
                        <i className="fas fa-money-bill-wave"></i> Thu tiền
                      </button>
                    )}
                    <button className="mob-btn mob-btn-view" onClick={() => onAction('view', t)} title="Hợp đồng thuê 360">
                      <i className="fas fa-eye"></i> 360
                    </button>
                    <button className="mob-btn mob-btn-zalo" onClick={() => onAction('wa', t)} title="Nhắn Zalo khách thuê">
                      <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14, marginRight: 5 }}>
                        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" />
                        <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" />
                        <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                      </svg>
                      Zalo
                    </button>
                    {all && t.status === 'Active' && (
                      <button className="mob-btn mob-btn-renew" onClick={() => onAction('renew', t)} title="Gia hạn hợp đồng">
                        <i className="fas fa-file-signature"></i>
                      </button>
                    )}
                    {all && t.status === 'Active' && (
                      <button className="mob-btn mob-btn-end" onClick={() => onAction('end', t)} title="Kết thúc hợp đồng">
                        <i className="fas fa-door-open"></i>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Mobile Filter Drawer (Bottom Sheet) */}
      {showFilterDrawer && (
        <div className="mob-filter-sheet-overlay" onClick={() => setShowFilterDrawer(false)}>
          <div className="mob-filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mob-sheet-handle"></div>
            <div className="mob-sheet-header">
              <h4><i className="fas fa-sliders"></i> Bộ lọc hợp đồng thuê</h4>
              <button className="close-btn" onClick={() => setShowFilterDrawer(false)}>&times;</button>
            </div>
            <div className="mob-sheet-body">
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm hợp đồng</label>
                <input className="filter-input" value={filters.search} placeholder="Người thuê, mã BĐS, nhân viên…" onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
            </div>
            <div className="mob-sheet-footer">
              <button className="btn btn-secondary" onClick={() => { setFilters({ search: '' }); setStage(''); setShowFilterDrawer(false); }}>
                <i className="fas fa-rotate-left"></i> Đặt lại
              </button>
              <button className="btn btn-primary" onClick={() => setShowFilterDrawer(false)}>
                <i className="fas fa-check"></i> Áp dụng ({visible.length} Hợp đồng)
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.type === 'collect' && <CollectRentModal ten={modal.ten} currentUser={currentUser} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
      {modal && modal.type === 'renew' && <RenewTenancyModal ten={modal.ten} currentUser={currentUser} cfg={cfg} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
      {modal && modal.type === 'end' && <EndTenancyModal ten={modal.ten} currentUser={currentUser} onClose={() => setModal(null)} onSaved={() => { setModal(null); refetch(); }} />}
      {modal && modal.type === 'view' && <Tenancy360Modal ten={(visible.find((t) => t.id === modal.ten.id)) || modal.ten} currentUser={currentUser} canEdit={canEdit}
        onClose={() => setModal(null)} onChanged={() => mutate()} />}
      {viewingLead && <CrossModuleLeadModal source={viewingLead} currentUser={currentUser} role={role} perms={perms} lookups={lookups} onClose={() => setViewingLead(null)} />}
      {printDoc && (
        <A4DocModal
          doc={printDoc.doc}
          docType={printDoc.docType}
          recId={printDoc.recId}
          currentUser={currentUser}
          onClose={() => setPrintDoc(null)}
        />
      )}
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
      <div className="modal modal-feedback-form" style={{ maxWidth: 480 }}>
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
              <div className="lead360-avatar" style={{ background: typeof getLeadAvatarColor === 'function' ? getLeadAvatarColor(lead.fullName) : 'linear-gradient(135deg, #1e3a8a, #3b82f6)' }}>
                {typeof getLeadInitial === 'function' ? getLeadInitial(lead.fullName) : 'K'}
              </div>
              <div className="lead360-person">
                <div className="nm">
                  <span className="lead360-title-name">{lead.fullName}</span>
                  <Badge s={lead.status} />
                </div>
                <div className="sub">
                  {lead.phone ? (
                    <span className="lead360-phone-link">
                      <i className="fas fa-phone-volume"></i> {typeof fmtLeadPhone === 'function' ? fmtLeadPhone(lead.phone) : lead.phone}
                    </span>
                  ) : null}
                  {lead.phone && (
                    <button className="action-icon wa-icon lead360-zalo-btn" title="Nhắn Zalo" onClick={() => waOpen(lead.phone)}>
                      <svg className="zalo-logo-img" viewBox="0 0 100 100" style={{ width: 14, height: 14 }}>
                        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" />
                        <path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" />
                        <text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" textAnchor="middle" letterSpacing="-1.2">Zalo</text>
                      </svg>
                    </button>
                  )}
                  {lead.email ? <span> · {lead.email}</span> : ''}
                  {lead.source ? <span> · {viEnum(lead.source)}</span> : ''}
                  {lead.interestType ? <span> · {viEnum(lead.interestType)}</span> : ''}
                </div>
              </div>
            </div>
            <div className="id-kpis">
              <div className="id-kpi"><i className="fas fa-hourglass-half"></i><div className="v">{daysOpen}</div><div className="l">Số ngày mở</div></div>
              <div className="id-kpi"><i className="fas fa-bell"></i><div className="v">{fus.length}</div><div className="l">Chăm sóc</div></div>
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
                <button className="action-icon wa-icon" title="Chia sẻ qua Zalo" onClick={() => waOpen(lead.phone, 'Xin chào ' + lead.fullName + '! Gửi bạn thông tin bất động sản phù hợp: ' + p.title + ' (' + p.referenceCode + ') — Giá: ' + pkrShort(p.price))}><svg className="zalo-logo-img" viewBox="0 0 100 100"><circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#008fe5" strokeWidth="4.5" /><path d="M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 44.2 85 38.7 83.6 33.8 81.1 L 18 86.5 L 22.8 72.3 C 17.9 66.2 15 58.4 15 50 C 15 30.67 30.67 15 50 15 Z" fill="#008fe5" /><text x="50.5" y="58" fill="#ffffff" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="28" font-weight="900" text-anchor="middle" letter-spacing="-1.2">Zalo</text></svg></button>
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

// ============== AI Assistant — Ultra-Premium Real Estate Copilot ==============
const mdLite = (s) => {
  if (!s) return '';
  let h = esc(String(s));
  // bold & italic
  h = h.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // inline code
  h = h.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  // headers
  h = h.replace(/^### (.*$)/gm, '<div class="ai-md-h4">$1</div>');
  h = h.replace(/^## (.*$)/gm, '<div class="ai-md-h3">$1</div>');
  h = h.replace(/^# (.*$)/gm, '<div class="ai-md-h2">$1</div>');
  // bullet items
  h = h.replace(/^[-*] (.*$)/gm, '<div class="ai-md-bullet"><span class="bullet-dot">•</span><span>$1</span></div>');
  // numbered list
  h = h.replace(/^(\d+)\. (.*$)/gm, '<div class="ai-md-num"><span class="num-badge">$1.</span><span>$2</span></div>');
  // line breaks
  h = h.replace(/\n/g, '<br>');
  return h;
};

function AiChatView({ currentUser, role }) {
  const { data: cfgRes } = useSWR('ai:cfg', () => gsRun('getAiConfig', currentUser), SWR_LIVE);
  const cfg = cfgRes && cfgRes.success ? cfgRes : null;
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [cat, setCat] = useState('finance');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const endRef = useRef(null), wrapRef = useRef(null), taRef = useRef(null);

  // Viewport auto-fit
  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current;
      if (el) el.style.height = Math.max(460, window.innerHeight - el.getBoundingClientRect().top - 16) + 'px';
    };
    fit();
    const raf = requestAnimationFrame(fit);
    window.addEventListener('resize', fit);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', fit); };
  }, []);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, busy]);

  const grow = () => {
    const t = taRef.current;
    if (t) { t.style.height = 'auto'; t.style.height = Math.min(160, t.scrollHeight) + 'px'; }
  };

  const send = (text) => {
    const q = String(text || input).trim();
    if (!q || busy) return;
    const hist = [...msgs, { role: 'user', content: q, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }];
    setMsgs(hist);
    setInput('');
    setBusy(true);
    if (taRef.current) taRef.current.style.height = 'auto';

    gsRun('aiChat', hist.map(({ role: r0, content }) => ({ role: r0, content })), currentUser).then((r) => {
      setBusy(false);
      setMsgs(r && r.success
        ? [...hist, { role: 'assistant', content: r.reply, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]
        : [...hist, { role: 'assistant', content: (r && r.message) || 'Thao tác thất bại — vui lòng kiểm tra kết nối.', err: true, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    }).catch((e) => {
      setBusy(false);
      setMsgs([...hist, { role: 'assistant', content: String((e && e.message) || e), err: true, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }]);
    });
  };

  const copyText = (txt, idx) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(txt);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  };

  const speakText = (txt) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(txt.replace(/[#*`_]/g, ''));
      utter.lang = 'vi-VN';
      utter.rate = 1.05;
      window.speechSynthesis.speak(utter);
    }
  };

  // Prompt Library by Category
  const PROMPTS_BY_CAT = {
    finance: [
      ['Tóm tắt doanh số, hoa hồng và số dư còn nợ trong tháng này', 'fa-sack-dollar'],
      ['Hợp đồng thuê nào đang có công nợ quá hạn cần nhắc thu tiền?', 'fa-house-circle-exclamation'],
      ['Tổng kết các giao dịch đã hoàn tất và hoa hồng chi trả cho nhân viên', 'fa-hand-holding-dollar'],
      ['Tình hình thu tiền thuê nhà tháng này đạt bao nhiêu phần trăm?', 'fa-chart-line']
    ],
    leads: [
      ['Khách hàng nào đang có trạng thái Nóng (Hot) cần ưu tiên chăm sóc?', 'fa-fire'],
      ['Lịch chăm sóc nào đang bị quá hạn và do ai phụ trách?', 'fa-bell'],
      ['Tổng hợp các khách hàng mới để lại thông tin từ Cổng thông tin', 'fa-globe'],
      ['Những khách hàng nào đã xem nhà nhưng chưa phát sinh giao dịch?', 'fa-user-check']
    ],
    props: [
      ['BĐS nào đang có sẵn và có mức giá tốt nhất hiện nay?', 'fa-tag'],
      ['Tin đăng nào đã quá 60 ngày chưa phát sinh giao dịch hoặc lịch xem?', 'fa-hourglass-half'],
      ['Danh sách các căn hộ cho thuê còn trống sẵn sàng bàn giao', 'fa-key'],
      ['Khu vực nào đang có lượng BĐS phong phú nhất trong hệ thống?', 'fa-map-location-dot']
    ],
    copywrite: [
      ['Viết một bài đăng Facebook chuyên nghiệp để quảng cáo căn hộ cao cấp', 'fa-pen-fancy'],
      ['Soạn tin nhắn Zalo lịch sự và trang trọng nhắc khách đóng tiền thuê nhà', 'fa-comment-sms'],
      ['Soạn kịch bản gọi điện mời khách hàng tiềm năng đi xem nhà mẫu', 'fa-phone-volume'],
      ['Viết email cảm ơn khách hàng sau khi hoàn tất giao dịch mua bán BĐS', 'fa-envelope-open-text']
    ]
  };

  const QUICK_FOLLOWUPS = [
    'Tóm tắt doanh số tháng này',
    'Khách hàng nào cần chăm sóc gấp?',
    'Hợp đồng thuê đang có công nợ',
    'BĐS cho thuê còn trống'
  ];

  return (
    <div className="ai-wrap" ref={wrapRef}>
      {/* Top Bar */}
      <div className="ai-header-bar">
        <div className="ai-model-pill">
          <span className="ai-status-dot"></span>
          <span>Trợ lý AI Bất Động Sản</span>
          <span className="badge badge-info" style={{ fontSize: 11, padding: '2px 7px' }}>
            <i className="fas fa-brain"></i> {cfg && cfg.model ? cfg.model : 'OpenAI Neural Engine'}
          </span>
        </div>
        <div className="ai-top-actions">
          {msgs.length > 0 && (
            <button className="ai-top-btn" onClick={() => setMsgs([])} title="Xóa toàn bộ cuộc trò chuyện">
              <i className="fas fa-broom"></i> Xóa đoạn chat
            </button>
          )}
        </div>
      </div>

      {/* Main Scrollable Thread */}
      <div className="ai-scroll">
        <div className="ai-thread">
          {cfg && !cfg.hasKey && (
            <div className="ai-note" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              <i className="fas fa-key" style={{ marginRight: 8 }}></i>
              Chưa cấu hình khóa API OpenAI{role === 'Admin' ? ' — bạn có thể thêm khóa trong [Cài đặt → Trợ lý AI] để kích hoạt AI trực tiếp.' : ' — hãy liên hệ Quản trị viên để thiết lập khóa API.'}
            </div>
          )}

          {/* Zero state: Hero greeting + Prompt library */}
          {msgs.length === 0 && (
            <div className="ai-hello">
              <div className="ai-hero-orb">
                <i className="fas fa-wand-magic-sparkles"></i>
              </div>
              <h2>Xin chào, {currentUser}</h2>
              <p>
                Tôi là trợ lý AI chuyên biệt cho BĐS Master CRM. Bạn có thể hỏi bất kỳ điều gì về dữ liệu khách hàng, giao dịch, hợp đồng thuê và nguồn hàng {scopeAll(role) ? 'của toàn công ty' : 'được phân công cho bạn'}.
              </p>

              {/* Category Filter Tabs */}
              <div className="ai-cat-tabs">
                <button className={'ai-cat-btn ' + (cat === 'finance' ? 'active' : '')} onClick={() => setCat('finance')}>
                  <i className="fas fa-sack-dollar"></i> Tài chính & Doanh số
                </button>
                <button className={'ai-cat-btn ' + (cat === 'leads' ? 'active' : '')} onClick={() => setCat('leads')}>
                  <i className="fas fa-user-tag"></i> Khách hàng & Chăm sóc
                </button>
                <button className={'ai-cat-btn ' + (cat === 'props' ? 'active' : '')} onClick={() => setCat('props')}>
                  <i className="fas fa-building"></i> Kho Bất Động Sản
                </button>
                <button className={'ai-cat-btn ' + (cat === 'copywrite' ? 'active' : '')} onClick={() => setCat('copywrite')}>
                  <i className="fas fa-pen-nib"></i> Soạn thảo & Nội dung
                </button>
              </div>

              {/* Prompt Suggestion Cards */}
              <div className="ai-cards">
                {(PROMPTS_BY_CAT[cat] || []).map(([s, ic], i) => (
                  <button key={i} className="ai-card" onClick={() => send(s)}>
                    <span>{s}</span>
                    <i className={'fas ' + ic}></i>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Turns */}
          {msgs.map((m, i) => (
            <div className={'ai-turn ' + (m.role === 'user' ? 'me' : '')} key={i}>
              {m.role !== 'user' && (
                <div className="ai-av" title="Trợ lý AI">
                  <i className="fas fa-wand-magic-sparkles"></i>
                </div>
              )}

              {m.role === 'user' ? (
                <div>
                  <div className="ai-said">{m.content}</div>
                  <div style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{m.time}</div>
                </div>
              ) : (
                <div className="ai-msg-body">
                  <div className={'ai-reply' + (m.err ? ' err' : '')} dangerouslySetInnerHTML={{ __html: mdLite(m.content) }}></div>
                  <div className="ai-msg-actions">
                    <span>{m.time || ''}</span>
                    <span style={{ margin: '0 4px' }}>•</span>
                    <button className="ai-act-btn" onClick={() => copyText(m.content, i)} title="Sao chép nội dung">
                      <i className={`fas ${copiedIdx === i ? 'fa-check' : 'fa-copy'}`} style={{ color: copiedIdx === i ? '#16a34a' : 'inherit' }}></i>
                      {copiedIdx === i ? 'Đã chép' : 'Sao chép'}
                    </button>
                    <button className="ai-act-btn" onClick={() => speakText(m.content)} title="Đọc nội dung bằng giọng nói">
                      <i className="fas fa-volume-high"></i> Đọc
                    </button>
                  </div>
                </div>
              )}

              {m.role === 'user' && (
                <div className="ai-user-av" title={currentUser}>
                  {String(currentUser || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Typing Shimmer */}
          {busy && (
            <div className="ai-turn">
              <div className="ai-av">
                <i className="fas fa-wand-magic-sparkles"></i>
              </div>
              <div className="ai-typing-box">
                <div className="ai-typing-dots">
                  <span></span><span></span><span></span>
                </div>
                <span>AI đang tra cứu dữ liệu CRM & phân tích câu trả lời…</span>
              </div>
            </div>
          )}
          <div ref={endRef}></div>
        </div>
      </div>

      {/* Floating Composer */}
      <div className="ai-composer-wrap">
        {/* Quick Follow-up Pills */}
        <div className="ai-quick-pills">
          {QUICK_FOLLOWUPS.map((q, idx) => (
            <button key={idx} className="ai-quick-pill" onClick={() => send(q)} disabled={busy}>
              <i className="fas fa-sparkles" style={{ color: '#6366f1', marginRight: 4 }}></i> {q}
            </button>
          ))}
        </div>

        <div className="ai-composer">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder="Hỏi bất kỳ điều gì về khách hàng, BĐS, doanh số, hợp đồng… (Enter để gửi, Shift+Enter xuống dòng)"
            disabled={busy}
            onChange={(e) => { setInput(e.target.value); grow(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="ai-send" onClick={() => send()} disabled={busy || !input.trim()} title="Gửi tin nhắn">
            <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-paper-plane')}></i>
          </button>
        </div>
        <div className="ai-foot">
          Trợ lý AI phân tích theo phạm vi quyền của bạn · Hãy kiểm tra kỹ thông tin trước khi thực hiện giao dịch quan trọng
        </div>
      </div>
    </div>
  );
}

// ============== Agreements — professional A4 documents from deals & tenancies ==============
function A4DocModal({ doc, docType, recId, currentUser, autoPrint, onClose }) {
  const frameRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const printed = useRef(false);

  const injectEditStyles = (docObj) => {
    if (!docObj || !docObj.head) return;
    let style = docObj.getElementById('a4-edit-mode-style');
    if (!style) {
      style = docObj.createElement('style');
      style.id = 'a4-edit-mode-style';
      style.textContent = `
            body[contenteditable="true"] {
              cursor: text !important;
            }
            body[contenteditable="true"] p, 
            body[contenteditable="true"] td, 
            body[contenteditable="true"] span, 
            body[contenteditable="true"] strong, 
            body[contenteditable="true"] h1, 
            body[contenteditable="true"] h2, 
            body[contenteditable="true"] h3 {
              transition: background-color 0.15s ease, outline 0.15s ease;
            }
            body[contenteditable="true"] p:hover, 
            body[contenteditable="true"] td:hover,
            body[contenteditable="true"] strong:hover {
              outline: 1px dashed #0284c7 !important;
              background-color: rgba(2, 132, 199, 0.04);
            }
            body[contenteditable="true"] *:focus {
              outline: 2px solid #0284c7 !important;
              background-color: rgba(2, 132, 199, 0.08);
            }
            @media print {
              body, * { outline: none !important; background-color: transparent !important; }
            }
          `;
      docObj.head.appendChild(style);
    }
  };

  const toggleEdit = () => {
    const next = !isEditing;
    setIsEditing(next);
    const docObj = frameRef.current && (frameRef.current.contentDocument || frameRef.current.contentWindow.document);
    if (docObj && docObj.body) {
      injectEditStyles(docObj);
      docObj.body.contentEditable = next ? 'true' : 'false';
      if (next) {
        docObj.body.addEventListener('input', () => setIsEdited(true), { once: true });
        docObj.body.focus();
      }
    }
  };

  const resetDoc = () => {
    Swal.fire({
      icon: 'question',
      title: 'Khôi phục bản gốc?',
      text: 'Mọi nội dung bạn vừa chỉnh sửa sẽ được đặt lại theo dữ liệu hệ thống ban đầu.',
      showCancelButton: true,
      confirmButtonColor: 'var(--navy-primary)',
      confirmButtonText: 'Khôi phục',
      cancelButtonText: 'Hủy'
    }).then((res) => {
      if (!res.isConfirmed) return;
      const frame = frameRef.current;
      if (frame) {
        frame.srcDoc = doc.html;
        setIsEdited(false);
        setTimeout(() => {
          const docObj = frame.contentDocument || frame.contentWindow.document;
          if (docObj && docObj.body) {
            injectEditStyles(docObj);
            docObj.body.contentEditable = 'true';
            docObj.body.addEventListener('input', () => setIsEdited(true));
          }
        }, 200);
      }
    });
  };

  const doPrint = () => {
    const w = frameRef.current && frameRef.current.contentWindow;
    if (w) {
      w.focus();
      w.print();
    }
  };

  const doPdf = () => {
    if (isEdited) {
      Swal.fire({
        icon: 'info',
        title: 'Tải PDF bản đã chỉnh sửa',
        html: 'Vì bạn đã chỉnh sửa nội dung văn bản trực tiếp, vui lòng chọn <b>In văn bản (A4)</b> rồi chọn máy in <b>"Save as PDF / Lưu dưới dạng PDF"</b> để lưu trọn vẹn nội dung vừa sửa.',
        confirmButtonText: 'Mở cửa sổ in ngay',
        showCancelButton: true,
        cancelButtonText: 'Đóng'
      }).then((r) => {
        if (r.isConfirmed) doPrint();
      });
      return;
    }

    setBusy(true);
    gsRun('agreementPdf', docType, recId, currentUser).then((r) => {
      setBusy(false);
      if (r && r.success) {
        const a = document.createElement('a');
        a.href = 'data:application/pdf;base64,' + r.base64;
        a.download = r.filename;
        a.click();
      } else {
        Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Thao tác thất bại' });
      }
    }).catch(() => setBusy(false));
  };

  const handleFrameLoad = () => {
    const docObj = frameRef.current && (frameRef.current.contentDocument || frameRef.current.contentWindow.document);
    if (docObj && docObj.body) {
      injectEditStyles(docObj);
      // Tự động bật chế độ chỉnh sửa trực tiếp để người dùng có thể nhấp chuột và gõ ngay
      docObj.body.contentEditable = 'true';
      docObj.body.addEventListener('input', () => setIsEdited(true));
    }
    if (autoPrint && !printed.current) {
      printed.current = true;
      setTimeout(doPrint, 400);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal-doc-preview" style={{ maxWidth: 940 }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}><i className="fas fa-file-signature" style={{ color: 'var(--navy-accent)' }}></i> {doc.title}</h3>
            {isEditing && (
              <span className="badge badge-warning" style={{ fontSize: 11, padding: '3px 8px' }}>
                <i className="fas fa-pen-to-square"></i> Soạn thảo trực tiếp
              </span>
            )}
            {isEdited && (
              <span className="badge badge-info" style={{ fontSize: 11, padding: '3px 8px' }}>
                <i className="fas fa-check"></i> Đã có thay đổi
              </span>
            )}
          </div>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ padding: '12px 16px' }}>
          {/* Action Toolbar with Live Edit Toggle */}
          <div className="mob-doc-modal-actions" style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              className={'btn btn-sm ' + (isEditing ? 'btn-warning' : 'btn-secondary')}
              onClick={toggleEdit}
              style={{ fontWeight: 700 }}
              title="Cho phép bấm trực tiếp vào văn bản để chỉnh sửa trước khi in"
            >
              <i className={'fas ' + (isEditing ? 'fa-lock-open' : 'fa-pen-to-square')}></i>
              {isEditing ? 'Đang mở khóa soạn thảo' : 'Khóa chỉnh sửa'}
            </button>

            {isEdited && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={resetDoc}
                title="Khôi phục lại nội dung ban đầu từ cơ sở dữ liệu"
              >
                <i className="fas fa-rotate-left"></i> Đặt lại bản gốc
              </button>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={doPrint}>
                <i className="fas fa-print"></i> In văn bản (A4)
              </button>
              <button className="btn btn-secondary btn-sm" onClick={doPdf} disabled={busy}>
                <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-file-pdf')}></i>
                {busy ? 'Đang tạo PDF…' : 'Tải PDF'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={onClose}>
                Đóng
              </button>
            </div>
          </div>

          {/* Hướng dẫn soạn thảo trực quan */}
          <div style={{ fontSize: 12, color: '#475569', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 12px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-circle-info" style={{ color: '#0284c7', fontSize: 14 }}></i>
            <span><b>Mẹo:</b> Bạn có thể nhấp chuột trực tiếp vào bất kỳ dòng chữ, số tiền, tên người hoặc điều khoản nào trên trang A4 bên dưới để sửa đổi hoặc bổ sung thông tin trước khi in.</span>
          </div>

          {/* Editable Live A4 Preview Frame */}
          <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: isEditing ? '2px solid #0284c7' : '1px solid #ccd5df', transition: 'border-color .2s' }}>
            <iframe
              ref={frameRef}
              srcDoc={doc.html}
              className="a4-frame"
              title="document"
              onLoad={handleFrameLoad}
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

const DEFAULT_CONTRACT_TEMPLATES_CATALOG = [
  { key: 'rental', label: 'HĐ Thuê Bất Động Sản', shortLabel: 'HĐ Thuê', icon: 'fa-file-signature', src: 'ten', hint: 'Hợp đồng chủ nhà – người thuê gồm điều khoản thương mại, tiền cọc, số tiền bằng chữ và 6 điều khoản chuẩn' },
  { key: 'sale', label: 'HĐ Cọc Mua Bán', shortLabel: 'Cọc Mua Bán', icon: 'fa-file-contract', src: 'deal', hint: 'Hợp đồng đặt cọc chuyển nhượng — các bên, giá trị, tiến độ thanh toán, cam kết và phạt cọc' },
  { key: 'handover', label: 'Biên Bản Bàn Giao Hiện Trạng', shortLabel: 'Bàn Giao', icon: 'fa-clipboard-check', src: 'ten', hint: 'Biên bản bàn giao chìa khóa, chỉ số đồng hồ điện nước và hiện trạng trang thiết bị' },
  { key: 'exclusive', label: 'HĐ Dịch Vụ Môi Giới Độc Quyền', shortLabel: 'MG Độc Quyền', icon: 'fa-handshake-angle', src: 'deal', hint: 'Hợp đồng cam kết dịch vụ môi giới độc quyền, biểu phí hoa hồng và trách nhiệm truyền thông' },
  { key: 'receipt', label: 'Phiếu Thu Giao Dịch', shortLabel: 'Phiếu Thu', icon: 'fa-receipt', src: 'deal', hint: 'Xác nhận toàn bộ các đợt thanh toán đã thu của giao dịch, số tiền bằng chữ và số dư còn lại' },
  { key: 'rentreceipt', label: 'Bảng Kê Tiền Thuê', shortLabel: 'Kê Tiền Thuê', icon: 'fa-file-invoice', src: 'ten', hint: 'Bảng kê các kỳ tiền thuê đã thu, số phải thu đến hiện tại và tổng công nợ còn thiếu' },
  { key: 'dues', label: 'Thông Báo Công Nợ', shortLabel: 'Báo Công Nợ', icon: 'fa-triangle-exclamation', src: 'deal', hint: 'Bảng tổng hợp công nợ giao dịch với số tiền còn phải thanh toán nổi bật' },
  { key: 'invoice', label: 'Hóa Đơn Hoa Hồng', shortLabel: 'HĐ Hoa Hồng', icon: 'fa-file-invoice-dollar', src: 'deal', hint: 'Hóa đơn phí môi giới dịch vụ (mã HDHH) cho giao dịch hoàn tất' }
];

// =========================================================================
// MODAL QUẢN LÝ MẪU BIỂU MẪU & THẺ BIẾN THÔNG MINH (1-CLICK MERGE TAGS)
// =========================================================================
function ContractTemplatesManagerModal({ currentUser, onClose }) {
  const { data: tplRes, mutate } = useSWR('contractTemplates:all', () => gsRun('getContractTemplates', currentUser), SWR_LIVE);
  const templates = (tplRes && tplRes.success && tplRes.data && tplRes.data.templates) || DEFAULT_CONTRACT_TEMPLATES_CATALOG;
  const [selectedKey, setSelectedKey] = useState('rental');
  const [busy, setBusy] = useState(false);

  const curTpl = useMemo(() => {
    return templates.find((t) => t.key === selectedKey) || templates[0] || {};
  }, [templates, selectedKey]);

  const [title, setTitle] = useState(curTpl.label || '');
  const [shortLabel, setShortLabel] = useState(curTpl.shortLabel || '');
  const [hint, setHint] = useState(curTpl.hint || '');
  const [templateMode, setTemplateMode] = useState(curTpl.templateMode || 'terms');
  const [customTerms, setCustomTerms] = useState(curTpl.customTerms || '');
  const [fullTemplateHtml, setFullTemplateHtml] = useState(curTpl.fullTemplateHtml || '');

  const textareaRef = useRef(null);
  const richEditorRef = useRef(null);
  const fileInputRef = useRef(null);

  // CHỈ cập nhật lại trường form khi người dùng CHUYỂN MẪU hoặc khi dữ liệu từ máy chủ tải về lần đầu
  useEffect(() => {
    const found = templates.find((t) => t.key === selectedKey) || templates[0] || {};
    setTitle(found.label || '');
    setShortLabel(found.shortLabel || '');
    setHint(found.hint || '');
    setTemplateMode(found.templateMode || 'terms');
    setCustomTerms(found.customTerms || '');
    setFullTemplateHtml(found.fullTemplateHtml || '');
    if (richEditorRef.current) {
      richEditorRef.current.innerHTML = found.fullTemplateHtml || '';
    }
  }, [selectedKey, tplRes]);

      const [tagQuery, setTagQuery] = useState('');

      const MERGE_TAG_GROUPS = [
        {
          key: 'partyA',
          group: '👤 Bên A (Chủ sở hữu / Bên Bán)',
          icon: 'fa-user-tie',
          color: '#0284c7',
          tags: [
            { tag: '{{TEN_BEN_A}}', label: 'Tên Bên A' },
            { tag: '{{SDT_BEN_A}}', label: 'SĐT Bên A' },
            { tag: '{{CCCD_BEN_A}}', label: 'CCCD Bên A' },
            { tag: '{{DIA_CHI_BEN_A}}', label: 'Địa chỉ Bên A' }
          ]
        },
        {
          key: 'partyB',
          group: '👥 Bên B (Khách thuê / Khách Mua)',
          icon: 'fa-users',
          color: '#7c3aed',
          tags: [
            { tag: '{{TEN_BEN_B}}', label: 'Tên Bên B' },
            { tag: '{{SDT_BEN_B}}', label: 'SĐT Bên B' },
            { tag: '{{CCCD_BEN_B}}', label: 'CCCD Bên B' },
            { tag: '{{HO_KHAU_BEN_B}}', label: 'Hộ khẩu Bên B' }
          ]
        },
        {
          key: 'property',
          group: '🏠 Bất Động Sản',
          icon: 'fa-building',
          color: '#059669',
          tags: [
            { tag: '{{MA_BDS}}', label: 'Mã BĐS' },
            { tag: '{{TIEU_DE_BDS}}', label: 'Tiêu đề BĐS' },
            { tag: '{{DIA_CHI_BDS}}', label: 'Địa chỉ BĐS' },
            { tag: '{{DIEN_TICH}}', label: 'Diện tích' },
            { tag: '{{LOAI_BDS}}', label: 'Loại hình' }
          ]
        },
        {
          key: 'financial',
          group: '💰 Tài Chính & Tiền Tệ',
          icon: 'fa-coins',
          color: '#d97706',
          tags: [
            { tag: '{{GIA_GIAO_DICH}}', label: 'Giá giao dịch' },
            { tag: '{{TIEN_BANG_CHU}}', label: 'Số tiền bằng chữ' },
            { tag: '{{TIEN_THUE_THANG}}', label: 'Tiền thuê/tháng' },
            { tag: '{{TIEN_COC}}', label: 'Tiền đặt cọc' },
            { tag: '{{TIEN_CON_LAI}}', label: 'Số tiền còn lại' }
          ]
        },
        {
          key: 'company',
          group: '🗓️ Thời Gian & Sàn Giao Dịch',
          icon: 'fa-calendar-check',
          color: '#4f46e5',
          tags: [
            { tag: '{{NGAY_KY}}', label: 'Ngày ký kết' },
            { tag: '{{NGAY_BAT_DAU}}', label: 'Ngày bắt đầu' },
            { tag: '{{NGAY_KET_THUC}}', label: 'Ngày kết thúc' },
            { tag: '{{NGAY_DONG_TIEN}}', label: 'Hạn đóng tiền' },
            { tag: '{{TEN_CONG_TY}}', label: 'Tên sàn / công ty' },
            { tag: '{{HOTLINE_CONG_TY}}', label: 'Hotline sàn' }
          ]
        }
      ];

      const allVisibleTags = useMemo(() => {
        const q = (tagQuery || '').trim().toLowerCase();
        return MERGE_TAG_GROUPS.map((g) => {
          const tags = q
            ? g.tags.filter((t) => t.label.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q))
            : g.tags;
          return { ...g, tags };
        }).filter((g) => g.tags.length > 0);
      }, [tagQuery]);

      // Thực thi lệnh định dạng Rich Text
      const execCmd = (command, value = null) => {
        if (richEditorRef.current) {
          richEditorRef.current.focus();
        }
        document.execCommand(command, false, value);
        if (richEditorRef.current) {
          setFullTemplateHtml(richEditorRef.current.innerHTML);
        }
      };

      // Chèn bảng mẫu vào trình soạn thảo Rich Text
      const insertTable = (cols = 2) => {
        let tableHtml = '';
        if (cols === 2) {
          tableHtml = '<table class="tb" style="width:100%;border-collapse:collapse;margin:12px 0;">' +
            '<tr><th style="width:50%;background:#f1f5f9;padding:8px 10px;border:1px solid #94a3b8;text-align:center;"><b>ĐẠI DIỆN BÊN A</b></th><th style="width:50%;background:#f1f5f9;padding:8px 10px;border:1px solid #94a3b8;text-align:center;"><b>ĐẠI DIỆN BÊN B</b></th></tr>' +
            '<tr><td style="padding:18px 10px;border:1px solid #94a3b8;vertical-align:top;"><p>Họ tên: {{TEN_BEN_A}}</p><p>SĐT: {{SDT_BEN_A}}</p></td><td style="padding:18px 10px;border:1px solid #94a3b8;vertical-align:top;"><p>Họ tên: {{TEN_BEN_B}}</p><p>SĐT: {{SDT_BEN_B}}</p></td></tr>' +
            '</table><p><br/></p>';
        } else {
          tableHtml = '<table class="tb" style="width:100%;border-collapse:collapse;margin:12px 0;">' +
            '<tr><th style="width:8%;background:#f1f5f9;padding:8px 10px;border:1px solid #94a3b8;text-align:center;">STT</th><th style="background:#f1f5f9;padding:8px 10px;border:1px solid #94a3b8;">Hạng mục / Trang thiết bị</th><th style="width:28%;background:#f1f5f9;padding:8px 10px;border:1px solid #94a3b8;text-align:center;">Tình trạng hiện tại</th></tr>' +
            '<tr><td style="text-align:center;border:1px solid #94a3b8;padding:8px 10px;">1</td><td style="border:1px solid #94a3b8;padding:8px 10px;">Hệ thống khóa cửa chính & thẻ từ</td><td style="border:1px solid #94a3b8;padding:8px 10px;text-align:center;">Hoạt động tốt</td></tr>' +
            '<tr><td style="text-align:center;border:1px solid #94a3b8;padding:8px 10px;">2</td><td style="border:1px solid #94a3b8;padding:8px 10px;">Máy điều hòa không khí</td><td style="border:1px solid #94a3b8;padding:8px 10px;text-align:center;">Mới 100%, có remote</td></tr>' +
            '</table><p><br/></p>';
        }
        execCmd('insertHTML', tableHtml);
      };

      // Chèn ngắt trang A4
      const insertPageBreak = () => {
        const pageBreakHtml = '<div class="tpl-page-break-tag" contenteditable="false" style="page-break-after:always;break-after:page;border-top:2px dashed #0284c7;margin:24px 0;text-align:center;color:#0284c7;font-size:11.5px;font-weight:bold;letter-spacing:1px;user-select:none;">✂️ [ NGẮT SANG TRANG IN A4 MỚI ]</div><p><br/></p>';
        execCmd('insertHTML', pageBreakHtml);
      };

      // Chèn thẻ biến 1-chạm vào con trỏ
      const insertTag = (tag) => {
        if (templateMode === 'full') {
          if (richEditorRef.current) {
            richEditorRef.current.focus();
            execCmd('insertHTML', ' <b style="color:#0284c7;background:#e0f2fe;padding:2px 6px;border-radius:4px;font-weight:700;">' + tag + '</b> ');
          }
        } else {
          const el = textareaRef.current;
          if (!el) {
            setCustomTerms((prev) => (prev ? prev + '\n' + tag : tag));
            return;
          }
          const start = el.selectionStart || 0;
          const end = el.selectionEnd || 0;
          const val = customTerms;
          const newVal = val.substring(0, start) + ' ' + tag + ' ' + val.substring(end);
          setCustomTerms(newVal);
          setTimeout(() => {
            el.focus();
            const nextPos = start + tag.length + 2;
            el.setSelectionRange(nextPos, nextPos);
          }, 50);
        }
      };

      // Xử lý tải lên file mẫu (.html, .htm, .docx, .txt)
      const handleFileUpload = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const ext = file.name.split('.').pop().toLowerCase();
        const reader = new FileReader();

        if (ext === 'html' || ext === 'htm' || ext === 'txt') {
          reader.onload = (event) => {
            let resText = event.target.result;
            if (ext === 'txt') {
              resText = resText.split('\n').map((line) => '<p>' + (line.trim() || '<br/>') + '</p>').join('');
            }
            setTemplateMode('full');
            setFullTemplateHtml(resText);
            if (richEditorRef.current) {
              richEditorRef.current.innerHTML = resText;
            }
            Swal.fire({
              icon: 'success',
              title: 'Đã nạp file mẫu thành công!',
              text: 'File ' + file.name + ' đã được tải vào trang A4. Định dạng in đậm, in nghiêng và bảng được bảo toàn.',
              timer: 2200,
              showConfirmButton: false
            });
          };
          reader.readAsText(file);
        } else if (ext === 'docx') {
          reader.onload = (event) => {
            try {
              const arrayBuffer = event.target.result;
              const uintArray = new Uint8Array(arrayBuffer);
              let text = '';
              for (let i = 0; i < uintArray.length; i++) {
                if (uintArray[i] >= 32 && uintArray[i] <= 126) {
                  text += String.fromCharCode(uintArray[i]);
                }
              }
              const lines = text.split(/[\r\n]+/).filter((l) => l.trim().length > 3);
              const formattedHtml = lines.map((line) => '<p>' + line.trim() + '</p>').join('');
              setTemplateMode('full');
              setFullTemplateHtml(formattedHtml);
              if (richEditorRef.current) {
                richEditorRef.current.innerHTML = formattedHtml;
              }
              Swal.fire({
                icon: 'info',
                title: 'Đã nạp nội dung tệp Word',
                text: 'Nội dung tệp Word đã được đưa vào trang A4. Bạn có thể định dạng in đậm, in nghiêng hoặc chèn thêm thẻ biến.',
                confirmButtonText: 'Đã hiểu'
              });
            } catch (err) {
              Swal.fire({ icon: 'error', title: 'Lỗi nạp Word', text: 'Bạn có thể Copy nội dung trong Word và Dán (Paste) trực tiếp vào khung A4 để giữ nguyên 100% định dạng.' });
            }
          };
          reader.readAsArrayBuffer(file);
        } else {
          Swal.fire({ icon: 'warning', title: 'Định dạng chưa hỗ trợ', text: 'Vui lòng chọn file .html, .txt hoặc .docx, hoặc copy/paste trực tiếp từ Word vào khung A4.' });
        }
        e.target.value = '';
      };

      const handleSave = () => {
        setBusy(true);
        const currentHtml = richEditorRef.current ? richEditorRef.current.innerHTML : fullTemplateHtml;
        const payload = {
          ...curTpl,
          label: title,
          shortLabel: shortLabel,
          hint: hint,
          templateMode: templateMode,
          customTerms: customTerms,
          fullTemplateHtml: currentHtml
        };
        gsRun('saveContractTemplate', curTpl.key, payload, currentUser).then((res) => {
          setBusy(false);
          if (res && res.success) {
            mutate();
            Swal.fire({
              icon: 'success',
              title: 'Đã lưu cấu hình mẫu',
              text: 'Mẫu "' + title + '" đã được cập nhật thành công!',
              timer: 1800,
              showConfirmButton: false
            });
          } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Không thể lưu' });
          }
        }).catch((e) => {
          setBusy(false);
          Swal.fire({ icon: 'error', title: 'Lỗi', text: String((e && e.message) || e) });
        });
      };

      const handleReset = () => {
        Swal.fire({
          icon: 'warning',
          title: 'Đặt lại mẫu mặc định?',
          text: 'Toàn bộ mẫu biểu mẫu sẽ quay về định dạng pháp lý chuẩn của hệ thống.',
          showCancelButton: true,
          confirmButtonColor: 'var(--navy-primary)',
          confirmButtonText: 'Đặt lại mặc định',
          cancelButtonText: 'Hủy'
        }).then((r) => {
          if (!r.isConfirmed) return;
          setBusy(true);
          gsRun('resetContractTemplates', currentUser).then((res) => {
            setBusy(false);
            if (res && res.success) {
              mutate();
              Swal.fire({ icon: 'success', title: 'Hoàn tất', text: 'Đã khôi phục các mẫu về mặc định!' });
            }
          });
        });
      };

      return (
        <div className="modal-overlay">
          <div className="modal modal-template-studio">
            {/* Header Studio Cao Cấp */}
            <div className="modal-header tpl-studio-header">
              <div className="tpl-studio-header-left">
                <div className="tpl-studio-icon-badge">
                  <i className="fas fa-file-contract"></i>
                </div>
                <div>
                  <h3 className="tpl-studio-title">Studio Quản Lý Mẫu Biểu Mẫu &amp; Soạn Thảo Hợp Đồng A4</h3>
                  <div className="tpl-studio-subtitle">
                    Bố cục 3 Cột Chuyên Nghiệp · Thư Viện Biến Số 1-Chạm · Trực Quan Khổ Giấy In A4
                  </div>
                </div>
              </div>
              <button className="close-btn tpl-studio-close" onClick={onClose} title="Đóng">&times;</button>
            </div>

            {/* Thân Studio Bố Cục 3 Cột Độc Lập */}
            <div className="modal-body tpl-studio-body">
              <div className="tpl-studio-3col-layout">
                
                {/* =========================================================
                    CỘT 1: CHỌN MẪU BIỂU MẪU ĐỂ CẤU HÌNH (~240px)
                    ========================================================= */}
                <div className="tpl-studio-col-sidebar">
                  <div className="tpl-col-head">
                    <span><i className="fas fa-layer-group" style={{ color: 'var(--navy-accent)' }}></i> Danh mục biểu mẫu</span>
                    <span className="tpl-col-badge">{templates.length} mẫu</span>
                  </div>
                  <div className="tpl-sidebar-templates-list">
                    {templates.map((t) => (
                      <div
                        key={t.key}
                        className={'tpl-nav-item' + (selectedKey === t.key ? ' active' : '')}
                        onClick={() => setSelectedKey(t.key)}
                      >
                        <div className="tpl-nav-icon">
                          <i className={'fas ' + (t.icon || 'fa-file-lines')}></i>
                        </div>
                        <div className="tpl-nav-info">
                          <div className="tpl-nav-title">{t.label}</div>
                          <div className="tpl-nav-desc">{t.src === 'ten' ? 'HĐ Thuê BĐS' : 'Giao Dịch Mua Bán'}</div>
                        </div>
                        {t.isCustom && <span className="tpl-nav-badge">Tùy biến</span>}
                      </div>
                    ))}
                  </div>
                  <div className="tpl-sidebar-bottom-actions">
                    <button className="btn btn-secondary btn-sm tpl-reset-btn" onClick={handleReset}>
                      <i className="fas fa-rotate-left"></i> Khôi phục mặc định
                    </button>
                  </div>
                </div>

                {/* =========================================================
                    CỘT 2: THƯ VIỆN THẺ BIẾN TỰ ĐỘNG (~280px)
                    ========================================================= */}
                <div className="tpl-studio-col-tags">
                  <div className="tpl-col-head">
                    <span><i className="fas fa-wand-magic-sparkles" style={{ color: '#0284c7' }}></i> Thư viện thẻ biến</span>
                    <span className="tpl-col-badge-count">24 thẻ</span>
                  </div>
                  <div className="tpl-tags-col-search">
                    <i className="fas fa-magnifying-glass"></i>
                    <input
                      type="text"
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      placeholder="Tìm nhanh thẻ biến..."
                      className="tpl-tag-search-input"
                    />
                    {tagQuery && (
                      <button type="button" className="tpl-clear-search-btn" onClick={() => setTagQuery('')}>&times;</button>
                    )}
                  </div>

                  <div className="tpl-tags-accordion-list">
                    {allVisibleTags.map((grp) => (
                      <div key={grp.key} className="tpl-tag-group-box">
                        <div className="tpl-tag-group-header" style={{ color: grp.color }}>
                          <i className={'fas ' + grp.icon}></i>
                          <span>{grp.group}</span>
                        </div>
                        <div className="tpl-tag-group-chips">
                          {grp.tags.map((t) => (
                            <button
                              key={t.tag}
                              type="button"
                              className="tpl-tag-chip-card"
                              onClick={() => insertTag(t.tag)}
                              title={'Bấm để chèn ' + t.tag + ' vào vị trí con trỏ'}
                            >
                              <span className="tpl-chip-lbl">{t.label}</span>
                              <code className="tpl-chip-code">{t.tag}</code>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="tpl-tags-help-tip">
                    <i className="fas fa-hand-pointer" style={{ color: 'var(--navy-accent)' }}></i>
                    <span>Nhấp vào thẻ biến để tự động chèn vào vị trí con trỏ chuột trên trang A4.</span>
                  </div>
                </div>

                {/* =========================================================
                    CỘT 3: KHUNG SOẠN THẢO TRANG IN A4 STUDIO CAO CẤP (~950px+)
                    ========================================================= */}
                <div className="tpl-studio-col-canvas">
                  {/* Top metadata row */}
                  <div className="tpl-canvas-meta-bar">
                    <div className="tpl-canvas-meta-fields">
                      <div className="tpl-meta-item" style={{ flex: 2 }}>
                        <label className="tpl-field-label">
                          <i className="fas fa-heading"></i> Tiêu đề văn bản in hoa (Trang A4)
                        </label>
                        <input
                          className="tpl-meta-input"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Ví dụ: HỢP ĐỒNG THUÊ BẤT ĐỘNG SẢN"
                        />
                      </div>
                      <div className="tpl-meta-item" style={{ flex: 1 }}>
                        <label className="tpl-field-label">
                          <i className="fas fa-tag"></i> Tên nút viết tắt
                        </label>
                        <input
                          className="tpl-meta-input"
                          value={shortLabel}
                          onChange={(e) => setShortLabel(e.target.value)}
                          placeholder="Ví dụ: HĐ Thuê"
                        />
                      </div>
                    </div>

                    <div className="tpl-meta-desc-row">
                      <label className="tpl-field-label">
                        <i className="fas fa-circle-info"></i> Mô tả tóm tắt mục đích văn bản
                      </label>
                      <input
                        className="tpl-meta-input"
                        value={hint}
                        onChange={(e) => setHint(e.target.value)}
                        placeholder="Mô tả ngắn gọn mục đích sử dụng mẫu..."
                      />
                    </div>
                  </div>

                  {/* Mode switch tabs (Segmented Bar) */}
                  <div className="tpl-studio-segmented-tabs">
                    <button
                      type="button"
                      className={'tpl-segmented-btn' + (templateMode === 'terms' ? ' active' : '')}
                      onClick={() => setTemplateMode('terms')}
                    >
                      <i className="fas fa-file-pen"></i>
                      <span>Chế độ 1: Thêm điều khoản thỏa thuận bổ sung (Ghép vào khung chuẩn)</span>
                    </button>
                    <button
                      type="button"
                      className={'tpl-segmented-btn' + (templateMode === 'full' ? ' active' : '')}
                      onClick={() => setTemplateMode('full')}
                    >
                      <i className="fas fa-file-word"></i>
                      <span>Chế độ 2: Soạn toàn văn mẫu riêng biệt (Rich Text / Word Upload 100%)</span>
                    </button>
                  </div>

                  {/* Editor Workspace Canvas */}
                  <div className="tpl-canvas-workspace">
                    {templateMode === 'terms' ? (
                      <div className="tpl-terms-canvas-wrapper">
                        <div className="tpl-terms-box-header">
                          <span className="tpl-terms-box-title">
                            <i className="fas fa-file-lines" style={{ color: 'var(--navy-primary)' }}></i> Các điều khoản thỏa thuận hoặc ghi chú bổ sung riêng:
                          </span>
                          <small style={{ color: '#64748b' }}>Hệ thống sẽ tự động ghép các điều khoản này vào cuối bản in A4</small>
                        </div>
                        <div className="tpl-a4-sheet-paper-container">
                          <div className="tpl-a4-sheet-paper">
                            <div className="tpl-a4-paper-header-hint">
                              <i className="fas fa-pen-nib"></i> NỘI DUNG ĐIỀU KHOẢN BỔ SUNG CỦA CÔNG TY
                            </div>
                            <textarea
                              ref={textareaRef}
                              className="tpl-a4-terms-textarea"
                              rows={14}
                              value={customTerms}
                              onChange={(e) => setCustomTerms(e.target.value)}
                              placeholder="Nhập các điều khoản thỏa thuận riêng của công ty hoặc nhấp các thẻ biến ở CỘT 2 để chèn vào vị trí con trỏ chuột..."
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="tpl-full-canvas-wrapper">
                        {/* Rich Text Toolbar */}
                        <div className="tpl-rich-toolbar-pro">
                          <div className="tpl-tool-btn-group">
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('bold')} title="In đậm (Ctrl+B)"><b>B</b></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('italic')} title="In nghiêng (Ctrl+I)"><i>I</i></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('underline')} title="Gạch chân (Ctrl+U)"><u>U</u></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('strikeThrough')} title="Gạch ngang"><s>S</s></button>
                          </div>
                          
                          <div className="tpl-tool-divider"></div>
                          
                          <div className="tpl-tool-btn-group">
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('formatBlock', '<h2>')} title="Tiêu đề lớn">H2</button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('formatBlock', '<h3>')} title="Tiêu đề vừa">H3</button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('formatBlock', '<p>')} title="Đoạn văn">P</button>
                          </div>
                          
                          <div className="tpl-tool-divider"></div>
                          
                          <div className="tpl-tool-btn-group">
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('justifyLeft')} title="Căn trái"><i className="fas fa-align-left"></i></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('justifyCenter')} title="Căn giữa"><i className="fas fa-align-center"></i></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('justifyRight')} title="Căn phải"><i className="fas fa-align-right"></i></button>
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('justifyFull')} title="Căn đều hai bên"><i className="fas fa-align-justify"></i></button>
                          </div>
                          
                          <div className="tpl-tool-divider"></div>

                          <div className="tpl-tool-btn-group">
                            <button type="button" className="tpl-tool-btn tpl-tool-btn-text" onClick={() => insertTable(2)} title="Chèn bảng đại diện 2 bên">
                              <i className="fas fa-table-columns" style={{ color: '#0284c7' }}></i>
                              <span>Bảng 2 cột</span>
                            </button>
                            <button type="button" className="tpl-tool-btn tpl-tool-btn-text" onClick={() => insertTable(3)} title="Chèn bảng danh mục 3 cột">
                              <i className="fas fa-table-cells" style={{ color: '#059669' }}></i>
                              <span>Bảng 3 cột</span>
                            </button>
                            <button type="button" className="tpl-tool-btn tpl-tool-btn-text tpl-page-break-btn" onClick={insertPageBreak} title="Chèn ngắt sang trang A4 mới">
                              <i className="fas fa-scissors"></i>
                              <span>Ngắt trang A4</span>
                            </button>
                          </div>
                          
                          <div className="tpl-tool-divider"></div>

                          <div className="tpl-tool-btn-group" style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="tpl-upload-btn"
                              onClick={() => fileInputRef.current && fileInputRef.current.click()}
                              title="Tải tệp .docx, .html hoặc .txt từ máy tính"
                            >
                              <i className="fas fa-cloud-arrow-up"></i> Tải file Word/HTML
                            </button>
                            <input
                              type="file"
                              ref={fileInputRef}
                              style={{ display: 'none' }}
                              accept=".html,.htm,.txt,.docx"
                              onChange={handleFileUpload}
                            />
                            <button type="button" className="tpl-tool-btn" onClick={() => execCmd('removeFormat')} title="Xóa định dạng"><i className="fas fa-eraser"></i></button>
                          </div>
                        </div>

                        {/* TỜ GIẤY IN A4 SHEET THỰC TẾ (A4 CANVAS SHEET) */}
                        <div className="tpl-a4-sheet-paper-container">
                          <div className="tpl-a4-sheet-paper">
                            <div
                              ref={richEditorRef}
                              className="tpl-a4-wysiwyg-editor"
                              contentEditable="true"
                              onInput={(e) => setFullTemplateHtml(e.currentTarget.innerHTML)}
                              dangerouslySetInnerHTML={{ __html: fullTemplateHtml }}
                              placeholder="Dán (Paste) trực tiếp văn bản từ Microsoft Word / Google Docs hoặc tải file mẫu lên tại đây..."
                            />
                          </div>
                        </div>

                        <div className="tpl-editor-footnote">
                          <span>💡 <b>Mẹo soạn thảo chuẩn A4:</b> Bạn có thể copy (Ctrl+A &rarr; Ctrl+C) từ file Word trên máy tính và dán trực tiếp (Ctrl+V) vào tờ giấy A4 trên. Hệ thống bảo toàn 100% định dạng in đậm, bảng biểu, căn lề và dấu ngắt trang A4.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="tpl-studio-footer">
                    <div className="tpl-studio-footer-status">
                      <i className="fas fa-shield-check" style={{ color: '#16a34a' }}></i>
                      <span>Cấu hình mẫu được lưu bền vững trên Supabase &amp; Hệ thống</span>
                    </div>
                    <div className="tpl-studio-footer-btns">
                      <button className="btn btn-secondary" onClick={onClose}>
                        Đóng
                      </button>
                      <button className="btn btn-primary tpl-save-btn" onClick={handleSave} disabled={busy}>
                        <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-floppy-disk')}></i> {busy ? 'Đang lưu…' : 'Lưu cấu hình mẫu'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
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
      <div className="modal modal-80 modal-doc-list">
        <div className="modal-header">
          <h3><i className={'fas ' + meta.icon}></i> {meta.label} — {records.length} hồ sơ phù hợp</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '0 0 14px' }}>
            <i className="fas fa-circle-info"></i> {meta.hint}. Nhấp <b>Xem & In</b> để mở văn bản A4 hoàn chỉnh.
          </p>
          {records.length === 0 ? (
            <p className="dash-empty"><i className="fas fa-file-circle-xmark"></i>Chưa có hồ sơ phù hợp để tạo tài liệu này</p>
          ) : (
            <div className="doc-records-list">
              {records.map((r) => {
                const outstanding = (ten ? r.arrears : r.balance) || 0;
                return (
                  <div key={r.id} className="doc-record-card">
                    <div className="doc-rec-head">
                      <div className="doc-rec-prop">
                        <span className="doc-rec-ref">{r.propertyRef || '#' + r.propertyId}</span>
                        <span className="doc-rec-title" title={r.propertyTitle || '—'}>{r.propertyTitle || '—'}</span>
                      </div>
                      <Badge s={r.status} />
                    </div>

                    <div className="doc-rec-party">
                      <i className="fas fa-user-tie" style={{ color: 'var(--navy-accent)' }}></i>
                      <span className="doc-rec-name">{(ten ? r.tenantName : r.buyerName) || '—'}</span>
                      {((ten ? r.tenantPhone : r.buyerPhone)) && (
                        <span className="doc-rec-phone">· {(ten ? r.tenantPhone : r.buyerPhone)}</span>
                      )}
                    </div>

                    <div className="doc-rec-financials">
                      <div className="doc-rec-fitem">
                        <small>{ten ? 'Tiền thuê/th' : 'Giá trị HĐ'}</small>
                        <b>{pkrShort(ten ? r.monthlyRent : r.dealAmount)}</b>
                      </div>
                      <div className="doc-rec-fitem">
                        <small>{ten ? 'Đã thu' : 'Đã nộp'}</small>
                        <b style={{ color: '#16a34a' }}>{pkrShort(ten ? (r.collected || 0) : (r.paid || 0))}</b>
                      </div>
                      <div className="doc-rec-fitem">
                        <small>{ten ? 'Công nợ' : 'Còn lại'}</small>
                        <b style={{ color: outstanding > 0 ? '#dc2626' : '#16a34a' }}>{pkrShort(outstanding)}</b>
                      </div>
                    </div>

                    <div className="doc-rec-foot">
                      <button className="btn btn-primary btn-sm doc-view-btn" disabled={!!busyId} onClick={() => onView(r)}>
                        <i className={'fas ' + (busyId === r.id ? 'fa-spinner fa-spin' : 'fa-eye')}></i> {busyId === r.id ? 'Đang tải…' : 'Xem & In văn bản'}
                      </button>
                    </div>
                  </div>
                );
              })}
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
  const [tplManagerOpen, setTplManagerOpen] = useState(false); // template manager popup
  const [rowBusy, setRowBusy] = useState(0);
  const [autoPrint, setAutoPrint] = useState(false);
  useEffect(() => { setPageActions([]); return () => setPageActions([]); }, []); // generator view — no list toolbar

  const DOC_TYPES = [
    { value: 'rental', label: 'HĐ thuê BĐS', shortLabel: 'HĐ Thuê', icon: 'fa-file-signature', src: 'ten', hint: 'Hợp đồng chủ nhà – người thuê gồm điều khoản thương mại, tiền cọc, số tiền bằng chữ và 6 điều khoản chuẩn' },
    { value: 'sale', label: 'HĐ cọc mua bán', shortLabel: 'Cọc Mua Bán', icon: 'fa-file-contract', src: 'deal', hint: 'Hợp đồng đặt cọc chuyển nhượng — các bên, giá trị, tiến độ thanh toán, cam kết và phạt cọc' },
    { value: 'handover', label: 'Biên bản bàn giao', shortLabel: 'Bàn Giao', icon: 'fa-clipboard-check', src: 'ten', hint: 'Biên bản bàn giao chìa khóa, chỉ số đồng hồ điện nước và hiện trạng trang thiết bị' },
    { value: 'exclusive', label: 'HĐ môi giới độc quyền', shortLabel: 'MG Độc Quyền', icon: 'fa-handshake-angle', src: 'deal', hint: 'Hợp đồng cam kết dịch vụ môi giới độc quyền, biểu phí hoa hồng và trách nhiệm truyền thông' },
    { value: 'receipt', label: 'Phiếu thu giao dịch', shortLabel: 'Phiếu Thu', icon: 'fa-receipt', src: 'deal', hint: 'Xác nhận toàn bộ các đợt thanh toán đã thu của giao dịch, số tiền bằng chữ và số dư còn lại' },
    { value: 'rentreceipt', label: 'Bảng kê tiền thuê', shortLabel: 'Kê Tiền Thuê', icon: 'fa-file-invoice', src: 'ten', hint: 'Bảng kê các kỳ tiền thuê đã thu, số phải thu đến hiện tại và công nợ' },
    { value: 'dues', label: 'Thông báo công nợ', shortLabel: 'Báo Công Nợ', icon: 'fa-triangle-exclamation', src: 'deal', hint: 'Bảng tổng hợp công nợ giao dịch với số tiền còn phải thanh toán nổi bật' },
    { value: 'invoice', label: 'Hóa đơn hoa hồng', shortLabel: 'HĐ Hoa Hồng', icon: 'fa-file-invoice-dollar', src: 'deal', hint: 'Hóa đơn phí môi giới dịch vụ (mã HDHH) cho giao dịch hoàn tất' }
  ];
  const meta = DOC_TYPES.find((x) => x.value === docType) || DOC_TYPES[0];
  // ONE eligibility rule per type — the dropdown, the counts and the popup all read it
  const eligibleFor = useCallback((t) => {
    if (t === 'rental' || t === 'handover') return tens;
    if (t === 'rentreceipt') return tens.filter((x) => (x.rentLog || []).length);
    if (t === 'sale') return deals.filter((x) => x.dealType === 'Sale');
    if (t === 'exclusive') return deals;
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
      else Swal.fire({ icon: 'error', title: 'Lỗi', text: (r && r.message) || 'Không thể tạo văn bản' });
    }).catch((e) => { setBusy(false); Swal.fire({ icon: 'error', title: 'Lỗi', text: String((e && e.message) || e) }); });
  };

  // popup row action: build that record's document, open the A4 sheet and fire the print dialog
  const viewRecord = (r) => {
    setRowBusy(r.id);
    gsRun('buildAgreement', docType, r.id, currentUser).then((res) => {
      setRowBusy(0);
      if (!res || !res.success) return Swal.fire({ icon: 'error', title: 'Lỗi', text: (res && res.message) || 'Không thể tạo văn bản' });
      setRecId(String(r.id)); setAutoPrint(true); setDoc(res);
    }).catch((e) => { setRowBusy(0); Swal.fire({ icon: 'error', title: 'Lỗi', text: String((e && e.message) || e) }); });
  };

  const kpi = [
    [tens.filter((t) => t.status === 'Active').length, 'HĐ thuê đang hoạt động', 'fa-house-user', 'bg-navy'],
    [deals.filter((x) => x.dealType === 'Sale' && x.status !== 'Cancelled').length, 'Giao dịch mua bán', 'fa-handshake', 'bg-info'],
    [deals.filter((x) => x.status !== 'Cancelled' && x.balance > 0).length, 'Còn số dư phải thu', 'fa-triangle-exclamation', 'bg-warning'],
    [deals.filter((x) => x.status === 'Completed').length, 'Sẵn sàng xuất hóa đơn', 'fa-file-invoice-dollar', 'bg-success']
  ];

  return (
    <div className="agreements-page-wrapper">
      <KpiRow items={kpi} />

      {/* =========================================================
              1. GIAO DIỆN MÁY TÍNH (DESKTOP AGREEMENTS VIEW)
              ========================================================= */}
      <div className="desk-agreements-view">
        {/* Khối Bộ Lọc & Tạo Tài Liệu Trên Máy Tính */}
        <div className="filters-section desk-filters-section">
          <div className="filters-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><i className="fas fa-file-contract"></i> Tạo tài liệu & Biểu mẫu A4</h3>
            {['Admin', 'Manager'].includes(role) && (
              <button className="btn btn-secondary btn-sm" onClick={() => setTplManagerOpen(true)}>
                <i className="fas fa-sliders"></i> Quản lý Mẫu Biểu mẫu
              </button>
            )}
          </div>
          <div className="filters-grid">
            <SearchableDropdown label="Loại tài liệu" icon={'fas ' + meta.icon}
              options={DOC_TYPES.map((x) => ({ value: x.value, label: x.label }))}
              value={docType} onChange={setDocType} placeholder="Loại tài liệu…" />
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
          <p style={{ fontSize: 12.5, color: '#64748b', margin: '6px 2px 0' }}>
            <i className="fas fa-circle-info"></i> {meta.hint}. Xem trước bản in chuẩn A4 — có thể chỉnh sửa trực tiếp, in ngay hoặc xuất PDF.
          </p>
        </div>

        {/* Danh Mục Tài Liệu Chuẩn Trên Máy Tính */}
        <div className="data-section desk-agreements-catalog">
          <div className="section-header">
            <h2><i className="fas fa-list-check"></i> Danh mục biểu mẫu chuẩn ({DOC_TYPES.length} loại)</h2>
          </div>
          <div className="desk-doc-types-list">
            {DOC_TYPES.map((x) => {
              const n = eligibleFor(x.value).length;
              return (
                <div key={x.value} className={'tl-item' + (docType === x.value ? ' selected' : '')} style={{ cursor: 'pointer' }} onClick={() => setDocType(x.value)}>
                  <i className={'fas ' + x.icon}></i>
                  <div style={{ flex: 1 }}>
                    <div className="w"><b>{x.label}</b></div>
                    <div className="m">{x.hint}</div>
                  </div>
                  <button className={'btn btn-sm elig-btn ' + (n ? 'btn-primary' : 'btn-secondary')} disabled={!n}
                    title={n ? 'Mở ' + n + ' hồ sơ phù hợp' : 'Chưa có hồ sơ phù hợp'}
                    onClick={(e) => { e.stopPropagation(); setDocType(x.value); setListOpen(true); }}>
                    <i className="fas fa-list-check"></i> {n} hồ sơ phù hợp
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================
              2. GIAO DIỆN ĐIỆN THOẠI (MOBILE AGREEMENTS VIEW)
              ========================================================= */}
      <div className="mob-agreements-view mobile-only-section">
        {/* Dải viên thuốc loại biểu mẫu lướt ngang */}
        <div className="mob-pipeline-bar" style={{ marginBottom: 12 }}>
          <div className="mob-pills-scroll">
            {DOC_TYPES.map((x) => {
              const count = eligibleFor(x.value).length;
              return (
                <button
                  key={x.value}
                  className={'mob-pill ' + (docType === x.value ? 'active' : '')}
                  onClick={() => setDocType(x.value)}
                >
                  <i className={'fas ' + x.icon}></i>
                  <span>{x.shortLabel || x.label}</span>
                  <span className="mob-pill-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Khối Tạo Văn Bản Mẫu */}
        <div className="filters-section mob-agreement-creator-card">
          <div className="filters-header">
            <h3><i className={'fas ' + meta.icon}></i> {meta.label}</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {['Admin', 'Manager'].includes(role) && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setTplManagerOpen(true)}
                  title="Quản lý Mẫu Biểu mẫu"
                >
                  <i className="fas fa-sliders"></i> Mẫu
                </button>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setListOpen(true)}
                disabled={!records.length}
              >
                <i className="fas fa-list-check"></i> {records.length} hồ sơ
              </button>
            </div>
          </div>
          <div className="filters-grid">
            <SearchableDropdown label="Loại tài liệu" icon={'fas ' + meta.icon}
              options={DOC_TYPES.map((x) => ({ value: x.value, label: x.label }))}
              value={docType} onChange={setDocType} placeholder="Loại tài liệu…" />
            <SearchableDropdown label={meta.src === 'ten' ? 'Hợp đồng thuê' : 'Giao dịch'} icon={meta.src === 'ten' ? 'fas fa-house-user' : 'fas fa-handshake'}
              options={records.map((r) => ({ value: String(r.id), label: recLabel(r) }))}
              value={recId} onChange={setRecId}
              placeholder={records.length ? 'Chọn hồ sơ…' : 'Chưa có hồ sơ phù hợp'} />
            <div className="filter-group filter-action">
              <label>&nbsp;</label>
              <button className="btn btn-primary mob-agreement-gen-btn" onClick={generate} disabled={busy || !records.length}>
                <i className={'fas ' + (busy ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles')}></i> {busy ? 'Đang tạo…' : 'Tạo văn bản A4'}
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '6px 2px 0' }}>
            <i className="fas fa-circle-info"></i> {meta.hint}.
          </p>
        </div>

        {/* Danh mục tài liệu trực quan */}
        <div className="data-section mob-agreement-catalog">
          <div className="section-header">
            <h2><i className="fas fa-folder-open"></i> Danh mục biểu mẫu chuẩn</h2>
          </div>
          <div className="mob-doc-types-grid">
            {DOC_TYPES.map((x) => {
              const n = eligibleFor(x.value).length;
              return (
                <div
                  key={x.value}
                  className={'mob-doc-type-card' + (docType === x.value ? ' selected' : '')}
                  onClick={() => setDocType(x.value)}
                >
                  <div className="mob-doc-type-icon">
                    <i className={'fas ' + x.icon}></i>
                  </div>
                  <div className="mob-doc-type-info">
                    <div className="mob-doc-type-title">{x.label}</div>
                    <div className="mob-doc-type-desc">{x.hint}</div>
                  </div>
                  <div className="mob-doc-type-action">
                    <button
                      className={'btn btn-sm elig-btn ' + (n ? 'btn-primary' : 'btn-secondary')}
                      disabled={!n}
                      title={n ? 'Mở ' + n + ' hồ sơ phù hợp' : 'Chưa có hồ sơ phù hợp'}
                      onClick={(e) => { e.stopPropagation(); setDocType(x.value); setListOpen(true); }}
                    >
                      <i className="fas fa-list-check"></i> {n} hồ sơ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {tplManagerOpen && (
        <ContractTemplatesManagerModal
          currentUser={currentUser}
          onClose={() => setTplManagerOpen(false)}
        />
      )}
      {listOpen && <EligibleDocsModal meta={meta} records={records} busyId={rowBusy} onView={viewRecord} onClose={() => setListOpen(false)} />}
      {doc && <A4DocModal doc={doc} docType={docType} recId={parseInt(recId, 10)} currentUser={currentUser}
        autoPrint={autoPrint} onClose={() => { setDoc(null); setAutoPrint(false); }} />}
    </div>
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
    {
      key: 'sales', label: 'Mua bán và cho thuê', icon: 'fa-sack-dollar', hint: 'Các giao dịch hoàn thành trong khoảng thời gian đã chọn',
      cols: [{ data: 'closedAt', title: 'Closed', ...dt }, { data: 'propertyRef', title: 'Property', ...txt }, { data: 'dealType', title: 'Type', ...txt },
      { data: 'buyerName', title: 'Buyer', ...txt }, { data: 'agent', title: 'Agent', ...txt },
      { data: 'dealAmount', title: 'Amount', ...money }, { data: 'commissionAmt', title: 'Commission', ...money }],
      rows: closed,
      sum: [['Giao dịch đã chốt', closed.length, 'fa-handshake', 'bg-navy'],
      ['Tổng giá trị', pkrShort(closed.reduce((s, x) => s + (x.dealAmount || 0), 0)), 'fa-sack-dollar', 'bg-success'],
      ['Hoa hồng', pkrShort(closed.reduce((s, x) => s + (x.commissionAmt || 0), 0)), 'fa-percent', 'bg-info']]
    },

    {
      key: 'source', label: 'Chuyển đổi khách hàng', icon: 'fa-bullhorn', hint: 'Khách hàng được tạo trong kỳ, phân nhóm theo nguồn tiếp cận',
      cols: [{ data: 'source', title: 'Source', ...txt }, { data: 'total', title: 'Leads' }, { data: 'won', title: 'Won' },
      { data: 'lost', title: 'Lost' }, { data: 'open', title: 'Open' }, { data: 'conv', title: 'Conversion', ...pct }],
      rows: ENUMS.leadSource.map((s) => {
        const g = leads.filter((l) => l.source === s && inR(l.created));
        const won = g.filter((l) => l.status === 'Won').length, lost = g.filter((l) => l.status === 'Lost').length;
        return g.length ? { source: viEnum(s), total: g.length, won, lost, open: g.length - won - lost, conv: Math.round(won / g.length * 100) } : null;
      }).filter(Boolean)
    },

    {
      key: 'agents', label: 'Hiệu suất nhân viên', icon: 'fa-ranking-star', adminOnly: true, hint: 'Hoạt động và giá trị giao dịch đã chốt của từng nhân viên trong kỳ',
      cols: [{ data: 'agent', title: 'Agent', ...txt }, { data: 'leads', title: 'Leads (period)' }, { data: 'won', title: 'Won' },
      { data: 'viewings', title: 'Viewings' }, { data: 'value', title: 'Deal Value', ...money }, { data: 'commission', title: 'Commission', ...money }],
      rows: agents.map((a) => {
        const c = closed.filter((x) => x.agent === a);
        return {
          agent: a, leads: leads.filter((l) => l.assignedAgent === a && inR(l.created)).length,
          won: leads.filter((l) => l.assignedAgent === a && l.status === 'Won').length,
          viewings: appts.filter((x) => x.agent === a && inR(x.scheduledAt)).length,
          value: c.reduce((s, x) => s + (x.dealAmount || 0), 0), commission: c.reduce((s, x) => s + (x.commissionAmt || 0), 0)
        };
      })
    },

    {
      key: 'ageing', label: 'Tuổi nguồn hàng', icon: 'fa-hourglass-half', hint: 'Tin đang hoạt động theo số ngày trên thị trường; trên 90 ngày được tính là tồn lâu',
      cols: [{ data: 'referenceCode', title: 'Ref', ...txt }, { data: 'title', title: 'Title', ...txt }, { data: 'price', title: 'Price', ...shortMoney },
      { data: 'status', title: 'Status', render: (d, t) => (t === 'display' ? badge(d) : d) },
      { data: 'days', title: 'Số ngày đăng', render: (d, t) => (t === 'display' ? (d > 90 ? '<b style="color:#c62828">' + d + ' ⚠ tồn lâu</b>' : d) : d) }],
      rows: live.map((x) => ({ referenceCode: x.referenceCode, title: x.title, price: x.price, status: x.status, days: dom(x) })),
      sum: [['Tin đang hoạt động', live.length, 'fa-building', 'bg-navy'],
      ['Tồn lâu (90 ngày+)', live.filter((x) => dom(x) > 90).length, 'fa-hourglass-end', 'bg-danger'],
      ['Số ngày trung bình', live.length ? Math.round(live.reduce((s, x) => s + dom(x), 0) / live.length) : 0, 'fa-clock', 'bg-info']]
    },

    {
      key: 'portal', label: 'Tương tác trên cổng thông tin', icon: 'fa-eye', hint: 'So sánh lượt xem công khai và yêu cầu tư vấn của từng tin đăng',
      cols: [{ data: 'referenceCode', title: 'Ref', ...txt }, { data: 'title', title: 'Title', ...txt }, { data: 'views', title: 'Views' },
      { data: 'enq', title: 'Enquiries' }, { data: 'rate', title: 'Enquiry Rate', ...pct }],
      rows: props.map((x) => {
        const enq = leads.filter((l) => l.propertyId == x.id).length;
        return {
          referenceCode: x.referenceCode, title: x.title, views: x.viewsCount || 0, enq,
          rate: x.viewsCount ? Math.round(enq / x.viewsCount * 1000) / 10 : null
        };
      }),
      sum: [['Tổng lượt xem', props.reduce((s, x) => s + (x.viewsCount || 0), 0).toLocaleString('vi-VN'), 'fa-eye', 'bg-info'],
      ['Yêu cầu tư vấn', leads.filter((l) => l.propertyId).length, 'fa-comments', 'bg-navy']]
    },

    {
      key: 'rentroll', label: 'Bảng theo dõi tiền thuê', icon: 'fa-house-user', hint: 'Hợp đồng thuê đang hoạt động — đối chiếu số phải thu và đã thu trong tháng',
      cols: [{ data: 'propertyRef', title: 'Ref', ...txt }, { data: 'tenantName', title: 'Tenant', ...txt }, { data: 'rent', title: 'Rent / mo', ...money },
      { data: 'collected', title: 'Đã thu (' + mm + ')', ...money },
      { data: 'arrears', title: 'Công nợ', render: (d, t) => (t === 'display' ? (d > 0 ? '<b style="color:#c62828">' + fmtPKR(d) + '</b>' : '<span style="color:#2e7d32">đã thanh toán</span>') : (d || 0)) }],
      rows: tens.filter((t) => t.status === 'Active').map((t) => ({
        propertyRef: t.propertyRef, tenantName: t.tenantName, rent: t.monthlyRent,
        collected: (t.rentLog || []).filter((q) => q.month === mm).reduce((s, q) => s + q.amount, 0), arrears: t.arrears || 0
      })),
      sum: [['Hợp đồng thuê đang hoạt động', tens.filter((t) => t.status === 'Active').length, 'fa-house-user', 'bg-navy'],
      ['Dự kiến mỗi tháng', pkrShort(tens.filter((t) => t.status === 'Active').reduce((s, t) => s + (t.monthlyRent || 0), 0)), 'fa-file-invoice-dollar', 'bg-info'],
      ['Tổng công nợ', pkrShort(tens.reduce((s, t) => s + (t.arrears || 0), 0)), 'fa-triangle-exclamation', 'bg-danger']]
    },

    {
      key: 'payouts', label: 'Hoa hồng và chi trả', icon: 'fa-hand-holding-dollar', adminOnly: true, hint: 'Tổng phân chia hoa hồng của từng nhân viên và số tiền còn phải trả',
      cols: [{ data: 'agent', title: 'Agent', ...txt }, { data: 'earned', title: 'Commission Earned', ...money }, { data: 'share', title: 'Agent Share', ...money },
      { data: 'agency', title: 'Agency Share', ...money }, { data: 'paidOut', title: 'Paid Out', ...money },
      { data: 'payable', title: 'Payable', render: (d, t) => (t === 'display' ? (d > 0 ? '<b style="color:#c62828">' + fmtPKR(d) + '</b>' : fmtPKR(0)) : (d || 0)) }],
      rows: agents.map((a) => {
        const c = deals.filter((x) => x.agent === a && x.status === 'Completed');
        const earned = c.reduce((s, x) => s + (x.commissionAmt || 0), 0), share = c.reduce((s, x) => s + (x.agentShareAmt || 0), 0);
        const paidOut = c.filter((x) => x.agentPaidAt).reduce((s, x) => s + (x.agentShareAmt || 0), 0);
        return earned ? { agent: a, earned, share, agency: r2(earned - share), paidOut, payable: r2(share - paidOut) } : null;
      }).filter(Boolean)
    },

    {
      key: 'offers', label: 'Quy trình chào giá', icon: 'fa-scale-balanced', hint: 'Các chào giá được ghi nhận cho khách hàng trong khoảng thời gian đã chọn',
      cols: [{ data: 'lead', title: 'Khách hàng', ...txt }, { data: 'phone', title: 'Điện thoại', ...txt }, { data: 'by', title: 'Bên đưa giá', render: (d, t) => (t === 'display' ? viEnum(d) : d) },
      { data: 'amount', title: 'Số tiền', ...money }, { data: 'date', title: 'Ngày', ...dt },
      { data: 'status', title: 'Trạng thái', render: (d, t) => (t === 'display' ? badge(d) : d) }],
      rows: leads.reduce((acc, l) => acc.concat((l.offers || []).filter((o) => inR(o.date))
        .map((o) => ({ lead: l.fullName, phone: l.phone, by: o.by, amount: o.amount, date: o.date, status: o.status }))), [])
    },

    {
      key: 'targets', label: 'Tiến độ mục tiêu', icon: 'fa-bullseye', adminOnly: true, hint: 'Giá trị đã chốt trong tháng so với mục tiêu tháng của từng nhân viên',
      cols: [{ data: 'agent', title: 'Nhân viên', ...txt }, { data: 'target', title: 'Mục tiêu tháng', ...money }, { data: 'value', title: 'Giá trị đã chốt', ...money },
      {
        data: 'progress', title: 'Tiến độ', render: (d, t) => (t === 'display'
          ? '<div class="rep-bar"><span style="width:' + Math.min(100, d) + '%;background:' + (d >= 100 ? '#2e7d32' : d >= 50 ? '#0074D9' : '#e6a700') + '"></span></div><small>' + d + '%</small>'
          : (d || 0))
      }],
      rows: users.filter((u) => u.MonthlyTarget > 0).map((u) => {
        const v = deals.filter((x) => x.agent === u.Username && x.status === 'Completed'
          && String(x.closedAt || '').substr(0, 7) === mm).reduce((s, x) => s + (x.dealAmount || 0), 0);
        return { agent: u.Username, target: u.MonthlyTarget, value: v, progress: Math.round(v / u.MonthlyTarget * 100) };
      })
    },

    {
      key: 'dupes', label: 'Có thể trùng lặp', icon: 'fa-clone', hint: 'Cùng một bất động sản được đăng hai lần — ưu tiên trường hợp khác nhân viên để tránh tranh chấp hoa hồng',
      cols: [{ data: 'aRef', title: 'Tin A', ...txt }, { data: 'aTitle', title: 'Tiêu đề A', ...txt }, { data: 'aAgent', title: 'Nhân viên A', ...txt },
      { data: 'bRef', title: 'Tin B', ...txt }, { data: 'bTitle', title: 'Tiêu đề B', ...txt }, { data: 'bAgent', title: 'Nhân viên B', ...txt },
      {
        data: 'crossAgent', title: 'Khác nhân viên', render: (d, t) => (t === 'display'
          ? (d === 'Yes' ? '<span class="status-badge st-red">Có</span>' : '<span class="status-badge st-gray">Không</span>') : d)
      },
      { data: 'why', title: 'Trùng theo', ...txt }],
      rows: dupes,
      sum: [['Cặp nghi trùng', dupes.length, 'fa-clone', dupes.length ? 'bg-warning' : 'bg-success'],
      ['Khác nhân viên', dupes.filter((x) => x.crossAgent === 'Yes').length, 'fa-user-xmark', 'bg-danger'],
      ['Cùng nhân viên', dupes.filter((x) => x.crossAgent !== 'Yes').length, 'fa-user-check', 'bg-info']]
    }
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
  }), () => { }, [active.key, range.from, range.to]);

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
    <div className="reports-page-wrapper">
      {/* =========================================================
              1. GIAO DIỆN MÁY TÍNH (DESKTOP REPORTS VIEW)
              ========================================================= */}
      <div className="desk-reports-view">
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
      </div>

      {/* =========================================================
              2. GIAO DIỆN ĐIỆN THOẠI (MOBILE REPORTS VIEW)
              ========================================================= */}
      <div className="mob-reports-view mobile-only-section">
        {/* Thanh chọn kỳ báo cáo lướt ngang (Mobile Period Pills) */}
        <div className="mob-pipeline-bar" style={{ marginBottom: 10 }}>
          <div className="mob-pills-scroll">
            {reportPeriods.map((p) => (
              <button
                key={p.key}
                type="button"
                className={'mob-pill ' + (activePeriod && activePeriod.key === p.key ? 'active' : '')}
                onClick={() => setRange({ from: p.from, to: p.to })}
              >
                <i className="fas fa-calendar-days"></i>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bộ chọn ngày tùy chỉnh di động (Mobile Custom Date Range) */}
        <div className="mob-reports-date-box">
          <div className="mob-date-field">
            <span className="mob-date-lbl"><i className="fas fa-play"></i> Từ:</span>
            <input
              type="date"
              className="mob-date-input"
              value={range.from}
              onChange={(e) => setRange({ ...range, from: e.target.value })}
            />
          </div>
          <div className="mob-date-field">
            <span className="mob-date-lbl"><i className="fas fa-stop"></i> Đến:</span>
            <input
              type="date"
              className="mob-date-input"
              value={range.to}
              onChange={(e) => setRange({ ...range, to: e.target.value })}
            />
          </div>
        </div>

        {/* Thanh danh mục báo cáo lướt ngang (Mobile Report Tabs) */}
        <div className="mob-pipeline-bar" style={{ marginBottom: 12 }}>
          <div className="mob-pills-scroll">
            {REPORTS.map((r) => (
              <button
                key={r.key}
                className={'mob-pill ' + (r.key === active.key ? 'active' : '')}
                onClick={() => setTab(r.key)}
              >
                <i className={'fas ' + r.icon}></i>
                <span>{r.label}</span>
                <span className="mob-pill-count">{r.rows.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tổng quan chỉ số KPI (Summary Boxes) */}
        {active.sum && (
          <div className="mob-reports-kpi-grid">
            {active.sum.map(([label, value, icon, color], i) => (
              <div key={i} className={'mob-rep-kpi-card ' + color}>
                <div className="mob-rep-kpi-icon"><i className={'fas ' + icon}></i></div>
                <div className="mob-rep-kpi-info">
                  <span className="mob-rep-kpi-val">{value}</span>
                  <span className="mob-rep-kpi-lbl">{label}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Thanh tiêu đề báo cáo phụ */}
        <div className="mob-sub-toolbar mob-reports-sub-toolbar">
          <div className="mob-sub-toolbar-left">
            <span className="mob-sub-count">
              <strong>{active.rows.length}</strong> {active.label}
            </span>
          </div>
          <div className="mob-sub-toolbar-right">
            <span className="mob-reports-hint-btn" title={active.hint}>
              <i className="fas fa-circle-info"></i>
            </span>
          </div>
        </div>

        {/* Danh sách thẻ báo cáo di động (Mobile Report Cards List) */}
        <div className="mob-reports-list">
          {active.rows.length === 0 ? (
            <div className="mob-leads-empty-state" style={{ padding: '32px 16px', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0' }}>
              <div className="empty-circle"><i className={'fas ' + active.icon}></i></div>
              <h3 style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 700 }}>Chưa có dữ liệu</h3>
              <p style={{ margin: 0, fontSize: 12.5, color: '#64748b' }}>Không có dữ liệu trong khoảng thời gian đã chọn.</p>
            </div>
          ) : (
            active.rows.map((row, idx) => (
              <div key={idx} className="mob-report-card">
                {tab === 'sales' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-handshake"></i>
                        <strong>{row.propertyRef || `Giao dịch #${row.id || idx + 1}`}</strong>
                        <span className="mob-rep-type-badge">{viEnum(row.dealType) || row.dealType}</span>
                      </div>
                      <span className="mob-rep-date"><i className="fas fa-calendar-check"></i> {fmtDate(row.closedAt)}</span>
                    </div>
                    <div className="mob-rep-card-body">
                      <div className="mob-rep-row">
                        <span className="mob-rep-lbl"><i className="fas fa-user"></i> Khách mua:</span>
                        <span className="mob-rep-val font-semibold">{row.buyerName || '—'}</span>
                      </div>
                      <div className="mob-rep-row">
                        <span className="mob-rep-lbl"><i className="fas fa-user-tie"></i> Nhân viên:</span>
                        <span className="mob-rep-val">{row.agent || '—'}</span>
                      </div>
                      <div className="mob-rep-footer-finance">
                        <div className="mob-rep-fin-col">
                          <span className="mob-rep-fin-lbl">Giá trị giao dịch</span>
                          <span className="mob-rep-fin-val price">{fmtPKR(row.dealAmount)}</span>
                        </div>
                        <div className="mob-rep-fin-col">
                          <span className="mob-rep-fin-lbl">Hoa hồng</span>
                          <span className="mob-rep-fin-val comm">{fmtPKR(row.commissionAmt)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'source' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-bullhorn"></i>
                        <strong>{row.source}</strong>
                      </div>
                      <span className="mob-rep-badge-rate">{row.conv}% chuyển đổi</span>
                    </div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Tổng khách</span>
                        <span className="val">{row.total}</span>
                      </div>
                      <div className="mob-rep-stat-box won">
                        <span className="lbl">Thành công</span>
                        <span className="val">{row.won}</span>
                      </div>
                      <div className="mob-rep-stat-box lost">
                        <span className="lbl">Thất bại</span>
                        <span className="val">{row.lost}</span>
                      </div>
                      <div className="mob-rep-stat-box open">
                        <span className="lbl">Đang xử lý</span>
                        <span className="val">{row.open}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'agents' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-user-tie"></i>
                        <strong>{row.agent}</strong>
                      </div>
                      <span className="mob-rep-badge-rate">{row.won} chốt</span>
                    </div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Tiềm năng</span>
                        <span className="val">{row.leads}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Lịch xem</span>
                        <span className="val">{row.viewings}</span>
                      </div>
                      <div className="mob-rep-stat-box" style={{ gridColumn: 'span 2' }}>
                        <span className="lbl">Tổng doanh số</span>
                        <span className="val price">{fmtPKR(row.value)}</span>
                      </div>
                    </div>
                    <div className="mob-rep-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                      <span className="mob-rep-lbl"><i className="fas fa-percent"></i> Hoa hồng mang về:</span>
                      <span className="mob-rep-val font-semibold comm">{fmtPKR(row.commission)}</span>
                    </div>
                  </>
                )}

                {tab === 'ageing' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-building"></i>
                        <strong>{row.referenceCode}</strong>
                      </div>
                      <span className={'mob-ageing-badge ' + (row.days > 90 ? 'danger' : 'normal')}>
                        {row.days > 90 ? <><i className="fas fa-triangle-exclamation"></i> {row.days} ngày</> : `${row.days} ngày`}
                      </span>
                    </div>
                    <div className="mob-rep-title-row">{row.title}</div>
                    <div className="mob-rep-row">
                      <span className="mob-rep-lbl"><i className="fas fa-sack-dollar"></i> Giá:</span>
                      <span className="mob-rep-val font-semibold price">{pkrShort(row.price)}</span>
                    </div>
                  </>
                )}

                {tab === 'portal' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-globe"></i>
                        <strong>{row.referenceCode}</strong>
                      </div>
                      <span className="mob-rep-badge-rate">{row.rate != null ? `${row.rate}%` : '0%'}</span>
                    </div>
                    <div className="mob-rep-title-row">{row.title}</div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl"><i className="fas fa-eye"></i> Lượt xem</span>
                        <span className="val">{row.views}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl"><i className="fas fa-comments"></i> Yêu cầu tư vấn</span>
                        <span className="val">{row.enq}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'rentroll' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-house-user"></i>
                        <strong>{row.propertyRef}</strong>
                      </div>
                      <span className={'mob-arrears-badge ' + (row.arrears > 0 ? 'danger' : 'ok')}>
                        {row.arrears > 0 ? `Nợ: ${fmtPKR(row.arrears)}` : 'Đã thanh toán'}
                      </span>
                    </div>
                    <div className="mob-rep-row">
                      <span className="mob-rep-lbl"><i className="fas fa-user"></i> Khách thuê:</span>
                      <span className="mob-rep-val font-semibold">{row.tenantName}</span>
                    </div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Tiền thuê / tháng</span>
                        <span className="val price">{fmtPKR(row.rent)}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Đã thu ({mm})</span>
                        <span className="val comm">{fmtPKR(row.collected)}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'payouts' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-user-tie"></i>
                        <strong>{row.agent}</strong>
                      </div>
                      <span className={'mob-arrears-badge ' + (row.payable > 0 ? 'danger' : 'ok')}>
                        {row.payable > 0 ? `Còn phải trả: ${fmtPKR(row.payable)}` : 'Đã tất toán'}
                      </span>
                    </div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Tổng hoa hồng</span>
                        <span className="val">{fmtPKR(row.earned)}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Phần nhân viên</span>
                        <span className="val comm">{fmtPKR(row.share)}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Đã thanh toán</span>
                        <span className="val">{fmtPKR(row.paidOut)}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Phần công ty</span>
                        <span className="val price">{fmtPKR(row.agency)}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'offers' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-scale-balanced"></i>
                        <strong>{row.lead}</strong>
                      </div>
                      <span className="mob-rep-type-badge">{viEnum(row.status) || row.status}</span>
                    </div>
                    <div className="mob-rep-row">
                      <span className="mob-rep-lbl"><i className="fas fa-phone"></i> SĐT:</span>
                      <span className="mob-rep-val">{row.phone || '—'}</span>
                    </div>
                    <div className="mob-rep-row">
                      <span className="mob-rep-lbl"><i className="fas fa-user-tag"></i> Bên đưa giá:</span>
                      <span className="mob-rep-val">{viEnum(row.by) || row.by}</span>
                    </div>
                    <div className="mob-rep-footer-finance">
                      <div className="mob-rep-fin-col">
                        <span className="mob-rep-fin-lbl">Số tiền chào giá</span>
                        <span className="mob-rep-fin-val price">{fmtPKR(row.amount)}</span>
                      </div>
                      <div className="mob-rep-fin-col">
                        <span className="mob-rep-fin-lbl">Ngày chào</span>
                        <span className="mob-rep-fin-val"><i className="fas fa-clock"></i> {fmtDate(row.date)}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'targets' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-bullseye"></i>
                        <strong>{row.agent}</strong>
                      </div>
                      <span className={'mob-rep-badge-rate ' + (row.progress >= 100 ? 'won' : '')}>{row.progress}%</span>
                    </div>
                    <div className="mob-progress-bar-wrap" style={{ margin: '8px 0' }}>
                      <div
                        className="mob-progress-bar-fill"
                        style={{
                          width: Math.min(100, row.progress) + '%',
                          background: row.progress >= 100 ? '#16a34a' : row.progress >= 50 ? '#0284c7' : '#d97706',
                          height: 8,
                          borderRadius: 4
                        }}
                      ></div>
                    </div>
                    <div className="mob-rep-grid-stats">
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Mục tiêu tháng</span>
                        <span className="val">{fmtPKR(row.target)}</span>
                      </div>
                      <div className="mob-rep-stat-box">
                        <span className="lbl">Giá trị đã chốt</span>
                        <span className="val price">{fmtPKR(row.value)}</span>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'dupes' && (
                  <>
                    <div className="mob-rep-card-head">
                      <div className="mob-rep-card-code">
                        <i className="fas fa-clone"></i>
                        <strong>Nghi trùng: {row.aRef} & {row.bRef}</strong>
                      </div>
                      <span className={'mob-arrears-badge ' + (row.crossAgent === 'Yes' ? 'danger' : 'normal')}>
                        {row.crossAgent === 'Yes' ? 'Khác NV ⚠' : 'Cùng NV'}
                      </span>
                    </div>
                    <div className="mob-rep-title-row">Tin A: {row.aTitle} ({row.aAgent})</div>
                    <div className="mob-rep-title-row">Tin B: {row.bTitle} ({row.bAgent})</div>
                    <div className="mob-rep-row" style={{ marginTop: 6, fontSize: 11.5, color: '#64748b' }}>
                      <i className="fas fa-circle-info"></i> Trùng theo: {row.why}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ============== Trash (Admin — restore soft-deletes) ==============
function TrashView({ currentUser }) {
  const { data: res, error, mutate } = useSWR('trash:all', () => gsRun('getTrash', currentUser), SWR_LIVE);
  const rows = res ? (res.success ? res.data : []) : undefined;
  const loading = rows === undefined && !error;
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [restoringId, setRestoringId] = useState(null);
  useEffect(() => { setPageActions([]); return () => setPageActions([]); }, []);

  const TRASH_TYPES = [
    { key: '', label: 'Tất cả', icon: 'fa-list-check' },
    { key: 'Property', label: 'BĐS', icon: 'fa-building' },
    { key: 'Lead', label: 'Khách hàng', icon: 'fa-user-tag' },
    { key: 'Appointment', label: 'Lịch hẹn', icon: 'fa-calendar-check' },
    { key: 'FollowUp', label: 'Chăm sóc', icon: 'fa-bell' },
    { key: 'Deal', label: 'Giao dịch', icon: 'fa-handshake' },
    { key: 'Tenancy', label: 'HĐ Thuê', icon: 'fa-house-user' },
    { key: 'Owner', label: 'Chủ sở hữu', icon: 'fa-user-tie' },
    { key: 'Location', label: 'Khu vực', icon: 'fa-map-location-dot' },
    { key: 'Amenity', label: 'Tiện ích', icon: 'fa-list-check' }
  ];

  const TYPE_ICONS = {
    Property: 'fa-building',
    Lead: 'fa-user-tag',
    Appointment: 'fa-calendar-check',
    FollowUp: 'fa-bell',
    Deal: 'fa-handshake',
    Tenancy: 'fa-house-user',
    Owner: 'fa-user-tie',
    Location: 'fa-map-location-dot',
    Amenity: 'fa-list-check'
  };

  const counts = useMemo(() => {
    const list = rows || [];
    const o = { '': list.length };
    list.forEach((x) => {
      const t = x.type || 'Other';
      o[t] = (o[t] || 0) + 1;
    });
    return o;
  }, [rows]);

  const visible = useMemo(() => {
    const list = rows || [];
    const q = String(searchTerm || '').trim().toLowerCase();
    return list.filter((x) => {
      if (filterType && x.type !== filterType) return false;
      if (q) {
        const matchTitle = String(x.title || '').toLowerCase().includes(q);
        const matchType = String(x.type || '').toLowerCase().includes(q);
        const matchId = String(x.id || '').includes(q);
        if (!matchTitle && !matchType && !matchId) return false;
      }
      return true;
    });
  }, [rows, filterType, searchTerm]);

  const restore = (x) => {
    Swal.fire({
      icon: 'question',
      title: 'Khôi phục bản ghi?',
      text: `Bạn có chắc muốn khôi phục ${x.type} #${x.id} (${x.title || ''}) về hệ thống?`,
      showCancelButton: true,
      confirmButtonColor: '#001f3f',
      confirmButtonText: 'Khôi phục',
      cancelButtonText: 'Hủy'
    }).then((r) => {
      if (r.isConfirmed) {
        setRestoringId(x.id);
        gsRun('restoreRecord', x.sheet, x.id, currentUser).then((res2) => {
          setRestoringId(null);
          if (res2 && res2.success) {
            Swal.fire({ icon: 'success', title: 'Thành công!', text: 'Đã khôi phục bản ghi!', timer: 1600, showConfirmButton: false });
            mutate();
            swrClearAll();
          } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: (res2 && res2.message) || 'Không thể khôi phục' });
          }
        }).catch((err) => {
          setRestoringId(null);
          Swal.fire({ icon: 'error', title: 'Lỗi', text: String((err && err.message) || err) });
        });
      }
    });
  };

  return (
    <div className="trash-page-wrapper">
      {/* ================= GIAO DIỆN MÁY TÍNH (DESKTOP) ================= */}
      <div className="desk-trash-view data-section">
        <div className="section-header">
          <h2><i className="fas fa-trash-arrow-up"></i> Thùng rác — Bản ghi đã xóa</h2>
        </div>
        <div className="filters-section desk-filters-section" style={{ marginBottom: 16 }}>
          <div className="filters-grid">
            <div className="filter-group">
              <label><i className="fas fa-magnifying-glass"></i> Tìm kiếm bản ghi đã xóa</label>
              <input
                className="filter-input"
                value={searchTerm}
                placeholder="Tiêu đề, mã ID, phân hệ…"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <SearchableDropdown
              label="Phân hệ"
              icon="fas fa-list-check"
              options={TRASH_TYPES.map((t) => ({ value: t.key, label: t.label + (counts[t.key] ? ` (${counts[t.key]})` : '') }))}
              value={filterType}
              onChange={setFilterType}
              placeholder="Tất cả phân hệ"
            />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} columns={4} />
        ) : visible.length === 0 ? (
          <p style={{ color: '#789', textAlign: 'center', padding: 32 }}>
            <i className="fas fa-broom" style={{ display: 'block', fontSize: 32, marginBottom: 10, opacity: 0.5 }}></i>
            Thùng rác đang trống — không có bản ghi nào bị xóa.
          </p>
        ) : (
          visible.map((x, i) => (
            <div key={i} className="tl-item">
              <i className={'fas ' + (TYPE_ICONS[x.type] || 'fa-box-archive')}></i>
              <div style={{ flex: 1 }}>
                <div className="w">
                  <span className="role-badge role-manager" style={{ marginRight: 6 }}>{viEnum(x.type) || x.type}</span>
                  <b>#{x.id}</b> — {x.title}
                </div>
                <div className="m">Đã xóa lúc {fmtDT(x.updated)}</div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => restore(x)}
                disabled={restoringId === x.id}
              >
                <i className={'fas ' + (restoringId === x.id ? 'fa-spinner fa-spin' : 'fa-rotate-left')}></i> Khôi phục
              </button>
            </div>
          ))
        )}
      </div>

      {/* ================= GIAO DIỆN ĐIỆN THOẠI (MOBILE) ================= */}
      <div className="mob-trash-page">
        {/* Dải viên thuốc loại bản ghi đã xóa lướt ngang */}
        <div className="mob-pipeline-bar" style={{ marginBottom: 12 }}>
          <div className="mob-pills-scroll">
            {TRASH_TYPES.map((t) => (
              <button
                key={t.key}
                className={'mob-pill ' + (filterType === t.key ? 'active' : '')}
                onClick={() => setFilterType(t.key)}
              >
                <i className={'fas ' + t.icon}></i>
                <span>{t.label}</span>
                <span className="mob-pill-count">{counts[t.key] || 0}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Thanh công cụ phụ di động (Mobile Sub-Toolbar) */}
        <div className="mob-sub-toolbar mob-trash-sub-toolbar">
          <div className="mob-sub-toolbar-left">
            <span className="mob-sub-count">
              <strong>{visible.length}</strong> Bản ghi đã xóa {filterType ? `· ${TRASH_TYPES.find((x) => x.key === filterType)?.label || filterType}` : ''}
            </span>
          </div>
          <div className="mob-sub-toolbar-right">
            <span className="mob-admin-tag">
              <i className="fas fa-shield-halved"></i> Quản trị viên
            </span>
          </div>
        </div>

        {/* Thanh tìm kiếm nhanh */}
        <div className="mob-search-bar-wrap">
          <div className="mob-search-input-box">
            <i className="fas fa-magnifying-glass"></i>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên bản ghi, mã ID, phân hệ..."
              className="mob-search-input"
            />
            {searchTerm && (
              <button className="mob-search-clear-btn" onClick={() => setSearchTerm('')} title="Xóa tìm kiếm">
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>

        {/* Data Section */}
        <div className="data-section">
          {loading ? (
            <div className="mob-cards-skeleton">
              {[1, 2, 3, 4].map((i) => <div key={i} className="mob-card-skeleton"></div>)}
            </div>
          ) : visible.length === 0 ? (
            <div className="mob-trash-empty">
              <div className="mob-trash-empty-icon">
                <i className="fas fa-broom"></i>
              </div>
              <h3>Thùng rác đang trống</h3>
              <p>Không có bản ghi nào bị xóa hoặc phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="mob-trash-list">
              {visible.map((x, i) => (
                <div key={i} className="mob-trash-card">
                  {/* HÀNG 1: Loại bản ghi + Mã ID + Thời gian xóa */}
                  <div className="mob-trash-card-head">
                    <div className="mob-trash-type-badge">
                      <i className={'fas ' + (TYPE_ICONS[x.type] || 'fa-box-archive')}></i>
                      <span>{viEnum(x.type) || x.type}</span>
                      <strong className="mob-trash-id">#{x.id}</strong>
                    </div>
                    <span className="mob-trash-time">
                      <i className="fas fa-clock-rotate-left"></i> {fmtDT(x.updated)}
                    </span>
                  </div>

                  {/* HÀNG 2: Tiêu đề bản ghi */}
                  <div className="mob-trash-title">
                    {x.title || 'Không có tiêu đề'}
                  </div>

                  {/* HÀNG 3: Nút khôi phục 1-chạm */}
                  <div className="mob-trash-actions">
                    <button
                      className="btn btn-primary btn-sm mob-trash-restore-btn"
                      onClick={() => restore(x)}
                      disabled={restoringId === x.id}
                    >
                      <i className={'fas ' + (restoringId === x.id ? 'fa-spinner fa-spin' : 'fa-rotate-left')}></i>
                      <span>{restoringId === x.id ? 'Đang khôi phục...' : 'Khôi phục bản ghi'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
        {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'].map((d) => <div key={d} className="cal-head" style={{ fontWeight: 700, padding: '6px 0', color: 'var(--navy-primary)' }}>{d}</div>)}
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
  const [activeTab, setActiveTab] = useState('overview');
  const [searchRule, setSearchRule] = useState('');
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

  const filteredFormulas = useMemo(() => {
    const q = String(searchRule || '').trim().toLowerCase();
    if (!q) return FORMULAS;
    return FORMULAS.filter(([t, f, u]) => t.toLowerCase().includes(q) || f.toLowerCase().includes(q) || u.toLowerCase().includes(q));
  }, [searchRule]);

  return (
    <div className="about-page-wrapper">
      {/* ================= GIAO DIỆN MÁY TÍNH (DESKTOP) ================= */}
      <div className="about-section desk-about-view">
        <div className="about-header">
          <div className="about-logo"><BrandLogo logo={branding.logo} /></div>
          <div className="about-title">
            <h1>{branding.name || 'CRM và cổng thông tin bất động sản'}</h1>
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

      {/* ================= GIAO DIỆN ĐIỆN THOẠI (MOBILE) ================= */}
      <div className="about-section mob-about-page">
        {/* HERO CARD: Brand, System Title & Infrastructure Badges */}
        <div className="mob-about-hero-card">
          <div className="mob-about-logo-wrap">
            <BrandLogo logo={branding.logo} />
          </div>
          <div className="mob-about-hero-info">
            <h1 className="mob-about-hero-title">{branding.name || 'Hệ thống CRM Bất Động Sản'}</h1>
            <p className="mob-about-hero-sub">Nền tảng kiến trúc hai lớp: Cổng thông tin công khai &amp; CRM nội bộ</p>
            <div className="mob-about-tags">
              <span className="mob-about-tag"><i className="fas fa-database"></i> Supabase Cloud</span>
              <span className="mob-about-tag"><i className="fas fa-shield-halved"></i> RLS &amp; JWT</span>
              <span className="mob-about-tag"><i className="fas fa-bolt"></i> SWR Live Sync</span>
            </div>
          </div>
        </div>

        {/* Dải viên thuốc lướt ngang */}
        <div className="mob-pipeline-bar" style={{ marginBottom: 14 }}>
          <div className="mob-pills-scroll">
            <button
              className={'mob-pill ' + (activeTab === 'overview' ? 'active' : '')}
              onClick={() => setActiveTab('overview')}
            >
              <i className="fas fa-circle-info"></i>
              <span>Tổng quan</span>
            </button>
            <button
              className={'mob-pill ' + (activeTab === 'features' ? 'active' : '')}
              onClick={() => setActiveTab('features')}
            >
              <i className="fas fa-star"></i>
              <span>Tính năng chính</span>
            </button>
            <button
              className={'mob-pill ' + (activeTab === 'rbac' ? 'active' : '')}
              onClick={() => setActiveTab('rbac')}
            >
              <i className="fas fa-user-shield"></i>
              <span>Phân quyền</span>
            </button>
            <button
              className={'mob-pill ' + (activeTab === 'formulas' ? 'active' : '')}
              onClick={() => setActiveTab('formulas')}
            >
              <i className="fas fa-calculator"></i>
              <span>Quy tắc nghiệp vụ</span>
              <span className="mob-pill-count">{FORMULAS.length}</span>
            </button>
            <button
              className={'mob-pill ' + (activeTab === 'storage' ? 'active' : '')}
              onClick={() => setActiveTab('storage')}
            >
              <i className="fas fa-database"></i>
              <span>Hạ tầng</span>
            </button>
          </div>
        </div>

        {/* TAB 1: TỔNG QUAN */}
        {activeTab === 'overview' && (
          <div className="mob-about-card">
            <div className="mob-about-card-header">
              <div className="mob-about-header-icon blue"><i className="fas fa-circle-info"></i></div>
              <div>
                <h3>Mục tiêu &amp; Chức năng hệ thống</h3>
                <p>Tổng quan mô hình vận hành và kiến trúc nền tảng</p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6, margin: '0 0 14px' }}>
              Nền tảng quản lý toàn diện cho công ty bất động sản: khách truy cập xem tin đã công khai và gửi yêu cầu tư vấn mà không cần đăng nhập; thông tin liên hệ nhân viên được bảo vệ và mỗi yêu cầu được tạo thành một khách hàng tiềm năng. Nhân viên quản lý kho tin, quy trình khách hàng, lịch chăm sóc và lịch xem trong CRM. Hệ thống tự gửi email nhắc việc đến hạn và lịch xem ngày hôm sau theo giờ.
            </p>
            <div className="mob-about-meta-grid">
              <div className="mob-about-meta-box">
                <i className="fas fa-building"></i>
                <b>Sàn BĐS</b>
                <span>{branding.name || 'Công ty BĐS'}</span>
              </div>
              <div className="mob-about-meta-box">
                <i className="fas fa-phone"></i>
                <b>Hotline</b>
                <span>{branding.phone || '0901 234 567'}</span>
              </div>
              <div className="mob-about-meta-box">
                <i className="fas fa-location-dot"></i>
                <b>Trụ sở</b>
                <span>{branding.address || 'Việt Nam'}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TÍNH NĂNG CHÍNH */}
        {activeTab === 'features' && (
          <div className="mob-about-card">
            <div className="mob-about-card-header">
              <div className="mob-about-header-icon amber"><i className="fas fa-star"></i></div>
              <div>
                <h3>Tính năng nổi bật</h3>
                <p>12 mô-đun chức năng đồng bộ toàn diện</p>
              </div>
            </div>
            <div className="mob-about-features-grid">
              {[
                ['fa-building', 'Kho tin Bất động sản', 'Quản lý kho tin, hình ảnh HD, tiện ích và vị trí'],
                ['fa-globe', 'Cổng thông tin công khai', 'Đăng tải tin tức, tiếp nhận yêu cầu từ khách truy cập web'],
                ['fa-user-tag', 'Phễu khách hàng 360°', 'Quy trình từ Mới đến Thành công / Thất bại'],
                ['fa-bell', 'Nhắc lịch chăm sóc', 'Tự động thông báo và theo dõi lịch chăm sóc khách hàng'],
                ['fa-calendar-check', 'Đặt lịch xem BĐS', 'Kiểm tra trùng lịch thông minh và thông báo cho môi giới'],
                ['fa-map-location-dot', 'Khu vực 3 cấp', 'Thành phố → Quận/Huyện → Khu đô thị'],
                ['fa-list-check', 'Tiện ích chuẩn hóa', 'Hệ thống tiện ích phân loại trực quan'],
                ['fa-chart-line', 'Báo cáo & Tổng quan', 'Chỉ số tài chính, biểu đồ doanh thu thời gian thực'],
                ['fa-user-shield', 'Phân quyền nâng cao', 'Ma trận quyền hạn chi tiết đến từng hành động'],
                ['fa-file-csv', 'Nhập / Xuất Excel', 'Dễ dàng sao lưu và đồng bộ dữ liệu'],
                ['fa-clock-rotate-left', 'Nhật ký kiểm toán', 'Ghi vết 100% các thay đổi và người thực hiện'],
                ['fa-mobile-screen', 'Chuẩn giao diện di động', 'Trải nghiệm mượt mà, tối ưu cảm ứng trên Smartphone']
              ].map(([ic, tit, desc], i) => (
                <div key={i} className="mob-feature-item">
                  <div className="mob-feature-icon"><i className={'fas ' + ic}></i></div>
                  <div className="mob-feature-text">
                    <b>{tit}</b>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: PHÂN QUYỀN VAI TRÒ */}
        {activeTab === 'rbac' && (
          <div className="mob-about-card">
            <div className="mob-about-card-header">
              <div className="mob-about-header-icon purple"><i className="fas fa-user-shield"></i></div>
              <div>
                <h3>Vai trò &amp; Ma trận phân quyền</h3>
                <p>Quyền hạn mặc định của Quản trị viên, Quản lý và Nhân viên</p>
              </div>
            </div>
            <div className="mob-about-rbac-list">
              {RBAC_ROWS.map((r, i) => (
                <div key={i} className="mob-rbac-card">
                  <div className="mob-rbac-module-name">{r[0]}</div>
                  <div className="mob-rbac-roles-grid">
                    <div className="mob-rbac-role-col">
                      <span className="mob-rbac-role-label admin">Quản trị viên</span>
                      <div className="mob-rbac-role-val">{r[1]}</div>
                    </div>
                    <div className="mob-rbac-role-col">
                      <span className="mob-rbac-role-label manager">Quản lý</span>
                      <div className="mob-rbac-role-val">{r[2]}</div>
                    </div>
                    <div className="mob-rbac-role-col">
                      <span className="mob-rbac-role-label agent">Nhân viên</span>
                      <div className="mob-rbac-role-val">{r[3]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: QUY TẮC & CÔNG THỨC NGHIỆP VỤ */}
        {activeTab === 'formulas' && (
          <div className="mob-about-card">
            <div className="mob-about-card-header">
              <div className="mob-about-header-icon emerald"><i className="fas fa-calculator"></i></div>
              <div>
                <h3>Công thức &amp; Quy tắc nghiệp vụ</h3>
                <p>{FORMULAS.length} quy tắc bất biến đảm bảo tính toàn vẹn dữ liệu</p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={searchRule}
                onChange={(e) => setSearchRule(e.target.value)}
                placeholder="Tìm kiếm công thức, quy tắc nghiệp vụ..."
                className="filter-input"
              />
            </div>

            <div className="mob-about-formulas-list">
              {filteredFormulas.map(([t, f, u], i) => (
                <div key={i} className="mob-formula-card">
                  <div className="mob-formula-title">
                    <i className="fas fa-code"></i> {t}
                  </div>
                  <div className="mob-formula-code">{f}</div>
                  <div className="mob-formula-usage">
                    <i className="fas fa-location-arrow"></i> {u}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: LƯU TRỮ & HẠ TẦNG */}
        {activeTab === 'storage' && (
          <div className="mob-about-card">
            <div className="mob-about-card-header">
              <div className="mob-about-header-icon sky"><i className="fas fa-database"></i></div>
              <div>
                <h3>Hạ tầng &amp; Cơ sở dữ liệu</h3>
                <p>Kiến trúc Supabase Cloud &amp; Bảo mật</p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.6 }}>
              Dữ liệu nghiệp vụ, tài khoản, phân quyền và cấu hình thương hiệu được lưu tập trung trong <b>Supabase PostgreSQL</b>. Ảnh bất động sản được quản lý trong <b>Supabase Storage</b>; mọi thao tác quan trọng đều tuân theo phân quyền <b>Row Level Security (RLS)</b> và được ghi nhật ký hoạt động kiểm toán đầy đủ.
            </p>
          </div>
        )}

        <div className="about-footer">
          <strong>{branding.name || 'Hệ thống CRM Bất Động Sản'}</strong><br />
          <span style={{ fontSize: 12, color: '#94a3b8' }}>CRM và Cổng thông tin BĐS chuyên nghiệp</span>
        </div>
      </div>
    </div>
  );
}

