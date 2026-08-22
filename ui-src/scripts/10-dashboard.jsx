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
      const sig = items.map((n) => `${n.page}:${n.count}:${n.text}:${n.urgent ? '1' : '0'}`).join('|');
      const unread = items.length > 0 && sig !== seen;
      const ref = useRef(null);

      useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, []);

      useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }, []);

      useEffect(() => {
        const urgentItem = items.find((n) => n.urgent);
        if (urgentItem && unread && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('BĐS MASTER CRM — Nhắc lịch hẹn', {
              body: urgentItem.text,
              icon: 'https://cdn-icons-png.flaticon.com/512/3652/3652191.png'
            });
          } catch (e) {}
        }
      }, [sig, unread]);
      
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
                <div className={'notif-item' + (n.urgent ? ' urgent' : '')} key={i} style={{ cursor: 'pointer' }} onClick={() => { setActiveMenu(n.page); setOpen(false); }}>
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
      const [mobSearchOpen, setMobSearchOpen] = useState(false);
      const ref = useRef(null);
      const inputRef = useRef(null);
      const term = q.trim().toLowerCase();
      const canU = can(perms, 'users', 'v'), canL = can(perms, 'logs', 'v');
      const canP = can(perms, 'properties', 'v'), canLd = can(perms, 'leads', 'v');

      // fetch sources only once the user types — shares cache with the list views (dedupe)
      const { data: uRes } = useSWR(term && canU ? 'users:all' : null, () => gsRun('getAllUsers', currentUser), SWR_LIVE);
      const { data: lRes } = useSWR(term && canL ? 'logs:all'  : null, () => gsRun('getLogs', currentUser), SWR_LIVE);
      const { data: pRes } = useSWR(term && canP ? 'props:all' : null, () => gsRun('getProperties', currentUser), SWR_LIVE);
      const { data: dRes } = useSWR(term && canLd ? 'leads:all' : null, () => gsRun('getLeads', currentUser), SWR_LIVE);

      useEffect(() => {
        const close = (e) => {
          if (ref.current && !ref.current.contains(e.target)) {
            setOpen(false);
            if (!q) setMobSearchOpen(false);
          }
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
      }, [q]);

      const openMobile = () => {
        setMobSearchOpen(true);
        setOpen(true);
        setTimeout(() => inputRef.current && inputRef.current.focus(), 60);
      };

      const closeMobile = () => {
        setMobSearchOpen(false);
        setOpen(false);
        setQ('');
      };

      const hit = (s) => String(s == null ? '' : s).toLowerCase().includes(term);
      const groups = [];
      if (term) {
        const pages = Object.keys(PAGE_META)
          .filter((k) => (ALWAYS_PAGES.indexOf(k) !== -1 || (k === 'permissions' ? canEditRbac : can(perms, k, 'v'))) && (hit(PAGE_META[k].label) || hit(k)))
          .map((k) => ({ icon: PAGE_META[k].icon, title: PAGE_META[k].label, sub: 'Mở trang', page: k, term: '' }));
        if (pages.length) groups.push(['Phân hệ', pages]);
        if (canP && pRes && pRes.success) {
          const ps = pRes.data.filter((p) => hit(p.title) || hit(p.referenceCode) || hit(p.locationPath) || hit(p.propertyType)).slice(0, 8)
            .map((p) => ({ icon: 'fa-building', title: p.title, sub: (p.referenceCode || '') + ' · ' + pkrShort(p.price) + ' · ' + (p.locationPath || ''), page: 'properties', term: p.referenceCode || p.title }));
          if (ps.length) groups.push(['Bất động sản', ps]);
        }
        if (canLd && dRes && dRes.success) {
          const ds = dRes.data.filter((l) => hit(l.fullName) || hit(l.phone) || hit(l.status) || hit(l.source)).slice(0, 8)
            .map((l) => ({ icon: 'fa-user-tag', title: l.fullName, sub: l.phone + ' · ' + l.status + (l.assignedAgent ? ' · ' + l.assignedAgent : ''), page: 'leads', term: l.phone }));
          if (ds.length) groups.push(['Khách hàng', ds]);
        }
        if (canU && uRes && uRes.success) {
          const us = uRes.data.filter((u) => hit(u.Username) || hit(u.Email) || hit(u.Role) || hit(u.Status)).slice(0, 8)
            .map((u) => ({ icon: 'fa-user', title: u.Username, sub: u.Email + ' · ' + u.Role, page: 'users', term: u.Username }));
          if (us.length) groups.push(['Người dùng', us]);
        }
        if (canL && lRes && lRes.success) {
          const ls = lRes.data.filter((g) => hit(g.Action) || hit(g.User) || hit(g.Details)).slice(0, 8)
            .map((g) => ({ icon: 'fa-clock-rotate-left', title: g.Action, sub: g.User + (g.Details ? ' · ' + g.Details : ''), page: 'logs', term: g.Action }));
          if (ls.length) groups.push(['Nhật ký', ls]);
        }
      }
      const count = groups.reduce((n, g) => n + g[1].length, 0);
      const pick = (r) => { setOpen(false); setMobSearchOpen(false); setQ(''); jump(r.page, r.term); };

      return (
        <div className={'gsearch' + (mobSearchOpen ? ' mob-active' : '')} ref={ref}>
          {/* Nút kính lúp tròn trên Mobile */}
          <button className="gsearch-mob-trigger" onClick={openMobile} title="Tìm kiếm">
            <i className="fas fa-magnifying-glass"></i>
          </button>

          {/* Thanh tìm kiếm desktop / overlay mobile */}
          <div className={'gs-bar-wrap' + (mobSearchOpen ? ' open' : '')}>
            {mobSearchOpen && (
              <button className="gs-mob-back" onClick={closeMobile} title="Quay lại">
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            <div className="gs-input-box">
              <i className="fas fa-magnifying-glass gs-lead"></i>
              <input
                ref={inputRef}
                className="gs-input"
                value={q}
                placeholder="Tìm kiếm BĐS, khách hàng, giao dịch…"
                onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                onFocus={() => term && setOpen(true)}
              />
              {q && (
                <button className="gs-x" onClick={() => { setQ(''); setOpen(false); }} title="Xóa">
                  <i className="fas fa-xmark"></i>
                </button>
              )}
            </div>
          </div>

          {open && term && (
            <div className="gs-menu">
              <div className="gs-scroll">
                {count === 0 ? (
                  <div className="gs-empty">
                    <i className="fas fa-magnifying-glass"></i>Không tìm thấy kết quả phù hợp cho "{q}"
                  </div>
                ) : (
                  groups.map(([name, items]) => (
                    <div className="gs-group" key={name}>
                      <div className="gs-group-h">{name}<span>{items.length}</span></div>
                      {items.map((r, i) => (
                        <div className="gs-item" key={i} onClick={() => pick(r)}>
                          <i className={'fas ' + r.icon + ' gs-ic'}></i>
                          <div className="gs-txt">
                            <div className="gs-t">{r.title}</div>
                            <div className="gs-s">{r.sub}</div>
                          </div>
                          <i className="fas fa-arrow-right-long gs-go"></i>
                        </div>
                      ))}
                    </div>
                  ))
                )}
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

