const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'local-crm-data.json');
const PORTAL_PATH = path.join(ROOT, 'data', 'portal-data.json');
const WORKBOOK_PATH = path.join(ROOT, 'data', 'F21_REAL_ESTATE_CRM.xlsx');
const SYNC_SCRIPT = path.join(ROOT, 'scripts', 'sync_local_crm_to_xlsx.py');
const PYTHON = process.env.CRM_PYTHON || path.join(
  process.env.USERPROFILE || '', '.cache', 'codex-runtimes', 'codex-primary-runtime',
  'dependencies', 'python', 'python.exe'
);

const SHEET_BY_GETTER = {
  getProperties: 'Properties', getLeads: 'Leads', getFollowUps: 'FollowUps',
  getAppointments: 'Appointments', getDeals: 'Deals', getTenancies: 'Tenancies',
  getOwners: 'Owners', getLocations: 'Locations', getAmenities: 'Amenities'
};

const ENTITY = {
  Property: 'Properties', Lead: 'Leads', FollowUp: 'FollowUps', Appointment: 'Appointments',
  Deal: 'Deals', Owner: 'Owners', Location: 'Locations', Amenity: 'Amenities'
};

const RBAC_PAGES = [
  { key:'dashboard', label:'Dashboard', group:'General' },
  { key:'ai', label:'AI Assistant', group:'General' },
  { key:'properties', label:'Properties', group:'CRM' },
  { key:'leads', label:'Leads', group:'CRM' },
  { key:'followups', label:'Follow-Ups', group:'CRM' },
  { key:'appointments', label:'Appointments', group:'CRM' },
  { key:'deals', label:'Deals', group:'Money' },
  { key:'tenancies', label:'Tenancies', group:'Money' },
  { key:'agreements', label:'Agreements', group:'Money' },
  { key:'reports', label:'Reports', group:'Money' },
  { key:'owners', label:'Owners', group:'Catalog' },
  { key:'locations', label:'Locations', group:'Catalog' },
  { key:'amenities', label:'Amenities', group:'Catalog' },
  { key:'users', label:'Users', group:'System' },
  { key:'settings', label:'Settings', group:'System' },
  { key:'logs', label:'Activity Logs', group:'System' },
  { key:'trash', label:'Trash', group:'System' }
];

function load() { return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); }
function now() { return new Date().toISOString(); }
function ok(extra = {}) { return { success: true, ...extra }; }
function fail(message, extra = {}) { return { success: false, message, ...extra }; }
function active(items) { return (items || []).filter(item => !item.deleted); }
function byId(items, id) { return items.find(item => Number(item.id) === Number(id)); }
function nextId(items) { return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1; }
function user(crm, username) { return crm.users.find(item => String(item.Username) === String(username)); }
function role(crm, username) {
  const current = user(crm, username);
  return crm.roles.find(item => item.role_key === (current && current.Role));
}
function scopeAll(crm, username) { const r = role(crm, username); return !!r && (r.is_super || r.role_key === 'Manager'); }
function permissions(crm, username) { return (role(crm, username) || {}).permissions || {}; }

function locationPath(locations, locationId) {
  const map = new Map(locations.map(item => [Number(item.id), item]));
  const out = [], seen = new Set();
  let item = map.get(Number(locationId));
  while (item && !seen.has(item.id)) { seen.add(item.id); if (item.name) out.unshift(item.name); item = map.get(Number(item.parentId)); }
  return out.join(' › ');
}

function addLog(crm, username, action, details) {
  const items = crm.sheets.Logs;
  items.push({ id: nextId(items), user: username || 'system', action, details: details || '', created: now(), updated: now() });
}

function rebuildPortal(crm) {
  const locations = active(crm.sheets.Locations);
  const amenities = active(crm.sheets.Amenities);
  const amenityMap = new Map(amenities.map(item => [Number(item.id), { name: item.name || '', icon: item.icon || '' }]));
  const properties = active(crm.sheets.Properties)
    .filter(item => item.publishedAt && ['Available', 'Reserved'].includes(item.status))
    .sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
    .map(item => ({
      id:item.id, referenceCode:item.referenceCode || '', title:item.title || '', slug:item.slug || '', description:item.description || '',
      propertyType:item.propertyType || '', listingType:item.listingType || '', status:item.status || '', price:Number(item.price || 0),
      rentFrequency:item.rentFrequency || '', areaSize:Number(item.areaSize || 0), areaUnit:item.areaUnit || '', bedrooms:item.bedrooms,
      bathrooms:item.bathrooms, locationId:item.locationId, locationPath:locationPath(locations, item.locationId), address:item.address || '',
      latitude:item.latitude, longitude:item.longitude, isFeatured:item.isFeatured ? 1 : 0, viewsCount:Number(item.viewsCount || 0),
      images:Array.isArray(item.images) ? item.images : [], amenities:(item.amenityIds || []).map(id => amenityMap.get(Number(id))).filter(Boolean),
      publishedAt:item.publishedAt
    }));
  fs.writeFileSync(PORTAL_PATH, JSON.stringify(ok({ properties, locations:locations.map(({id,parentId,name,level})=>({id,parentId:parentId||null,name,level})), amenities:amenities.map(({id,name,icon})=>({id,name,icon:icon||''})) }), null, 2), 'utf8');
}

function persist(crm) {
  const temp = DATA_PATH + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(crm, null, 2), 'utf8');
  fs.renameSync(temp, DATA_PATH);
  rebuildPortal(crm);
  if (fs.existsSync(PYTHON) && fs.existsSync(SYNC_SCRIPT) && fs.existsSync(WORKBOOK_PATH)) {
    const result = spawnSync(PYTHON, [SYNC_SCRIPT, DATA_PATH, WORKBOOK_PATH], { encoding: 'utf8', timeout: 30000 });
    if (result.status !== 0) throw new Error((result.stderr || result.stdout || 'Không thể đồng bộ XLSX').trim());
  }
}

function filtered(crm, sheet, username) {
  let items = active(crm.sheets[sheet]);
  if (!scopeAll(crm, username)) {
    if (sheet === 'Leads') items = items.filter(item => item.assignedAgent === username);
    if (sheet === 'FollowUps') items = items.filter(item => item.assignedAgent === username);
    if (sheet === 'Appointments') items = items.filter(item => item.agent === username);
    if (sheet === 'Deals') items = items.filter(item => item.agent === username);
    if (sheet === 'Tenancies') {
      const mine = new Set(crm.sheets.Properties.filter(p => p.assignedAgent === username).map(p => Number(p.id)));
      items = items.filter(item => mine.has(Number(item.propertyId)));
    }
  }
  if (sheet === 'Properties') items = items.map(item => ({ ...item, locationPath:locationPath(crm.sheets.Locations, item.locationId) }));
  if (sheet === 'Leads') items = items.map(item => ({ ...item, preferredLocationPath:locationPath(crm.sheets.Locations, item.preferredLocationId) }));
  if (sheet === 'FollowUps') items = items.map(item => { const lead=byId(crm.sheets.Leads,item.leadId)||{}; return {...item,leadName:lead.fullName||('#'+item.leadId),leadPhone:lead.phone||'',leadStatus:lead.status||''}; });
  if (sheet === 'Appointments') items = items.map(item => { const lead=byId(crm.sheets.Leads,item.leadId)||{},prop=byId(crm.sheets.Properties,item.propertyId)||{}; return {...item,leadName:lead.fullName||('#'+item.leadId),leadPhone:lead.phone||'',propertyTitle:prop.title||'',propertyRef:prop.referenceCode||''}; });
  if (sheet === 'Deals') items = items.map(item => { const lead=byId(crm.sheets.Leads,item.leadId)||{},prop=byId(crm.sheets.Properties,item.propertyId)||{}; const paid=(item.payments||[]).reduce((sum,payment)=>sum+Number(payment.amount||0),0); return {...item,leadName:lead.fullName||item.buyerName||'',leadPhone:lead.phone||item.buyerPhone||'',propertyTitle:prop.title||'',propertyRef:prop.referenceCode||'',paid,balance:Math.max(0,Number(item.dealAmount||0)-paid)}; });
  if (sheet === 'Tenancies') items = items.map(item => { const prop=byId(crm.sheets.Properties,item.propertyId)||{}; const collected=(item.rentLog||[]).reduce((s,p)=>s+Number(p.amount||0),0); const start=item.startDate?new Date(item.startDate+'T00:00:00'):new Date(); const d=new Date(); let months=(d.getFullYear()-start.getFullYear())*12+d.getMonth()-start.getMonth(); if(d.getDate()>=Number(item.rentDueDay||5))months++; months=Math.max(0,months); const expected=item.status==='Active'?months*Number(item.monthlyRent||0):collected; return {...item,propertyTitle:prop.title||'',propertyRef:prop.referenceCode||'',agent:prop.assignedAgent||'',collected,expected,arrears:Math.max(0,expected-collected)}; });
  if (sheet === 'Owners') items = items.map(item => { const props=active(crm.sheets.Properties).filter(p=>Number(p.ownerId)===Number(item.id)||(!p.ownerId&&p.ownerPhone===item.phone)); const ids=new Set(props.map(p=>Number(p.id))); const deals=active(crm.sheets.Deals).filter(d=>ids.has(Number(d.propertyId))); return {...item,propertyCount:props.length,totalBusiness:deals.filter(d=>d.status==='Completed').reduce((s,d)=>s+Number(d.dealAmount||0),0)}; });
  if (sheet === 'Locations') items = items.map(item => ({...item,fullPath:locationPath(crm.sheets.Locations,item.id),propertyCount:active(crm.sheets.Properties).filter(p=>Number(p.locationId)===Number(item.id)).length}));
  if (sheet === 'Amenities') items = items.map(item => ({...item,propertyCount:active(crm.sheets.Properties).filter(p=>(p.amenityIds||[]).map(Number).includes(Number(item.id))).length}));
  return items.slice().reverse();
}

function dashboard(crm, username) {
  const agency = scopeAll(crm, username), allProps = active(crm.sheets.Properties);
  const props = agency ? allProps : allProps.filter(p => p.assignedAgent === username);
  const leads = filtered(crm, 'Leads', username).slice().reverse();
  const followups = filtered(crm, 'FollowUps', username).slice().reverse();
  const appointments = filtered(crm, 'Appointments', username).slice().reverse();
  const deals = filtered(crm, 'Deals', username).slice().reverse();
  const tenancies = filtered(crm, 'Tenancies', username).slice().reverse();
  const countBy = (items, keys) => Object.fromEntries(keys.map(key => [key, items.filter(item => item.status === key).length]));
  const today = now().slice(0,10), month = today.slice(0,7), completed = deals.filter(d => d.status === 'Completed' && String(d.closedAt||'').slice(0,7) === month);
  const todayDate = new Date(today + 'T00:00:00');
  const seriesIndex = new Map(), leadsSeries = [];
  for (let offset = 89; offset >= 0; offset--) {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0,10);
    seriesIndex.set(key, leadsSeries.length);
    leadsSeries.push({ d:key, n:0 });
  }
  leads.forEach(lead => {
    const index = seriesIndex.get(String(lead.created || '').slice(0,10));
    if (index !== undefined) leadsSeries[index].n++;
  });
  const funnelOrder = ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won'];
  const funnelSteps = funnelOrder.map((stage, index) => ({
    stage,
    count:index === 0 ? leads.length : leads.filter(lead => funnelOrder.indexOf(lead.status) >= index).length
  }));
  const recentProperties = props.slice().sort((a,b)=>String(b.created||'').localeCompare(String(a.created||''))).slice(0,6).map(p=>({...p,locationPath:locationPath(crm.sheets.Locations,p.locationId)}));
  const currentUser = user(crm, username) || {};
  const activeUsers = crm.users.filter(u=>u.Status==='Active');
  return ok({ data: {
    scope:agency?'agency':'own', inventory:countBy(props,['Draft','Available','Reserved','Sold','Rented','Withdrawn']),
    funnel:countBy(leads,['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost']),
    activeListings:props.filter(p=>['Available','Reserved'].includes(p.status)).length, featured:props.filter(p=>p.isFeatured&&p.status==='Available').length,
    totalViews:props.reduce((s,p)=>s+Number(p.viewsCount||0),0), openLeads:leads.filter(l=>!['Won','Lost'].includes(l.status)).length,
    wonLeads:leads.filter(l=>l.status==='Won').length, totalLeads:leads.length, leadsMonth:leads.filter(l=>String(l.created||'').slice(0,7)===month).length,
    conversionRate:leads.length?Math.round(leads.filter(l=>l.status==='Won').length/leads.length*100):0,
    overdueFollowUps:followups.filter(f=>f.status==='Pending'&&f.dueAt&&new Date(f.dueAt)<new Date()).length,
    todayAppointments:appointments.filter(a=>['Scheduled','Confirmed'].includes(a.status)&&String(a.scheduledAt||'').slice(0,10)===today).length,
    recentLeads:leads.slice().sort((a,b)=>String(b.created||'').localeCompare(String(a.created||''))).slice(0,6), recentProperties,
    upcomingAppointments:appointments.filter(a=>new Date(a.scheduledAt)>=new Date()).slice(0,6), leadsSeries, funnelSteps,
    dealsMonth:completed.length, dealsMonthValue:completed.reduce((s,d)=>s+Number(d.dealAmount||0),0), commissionMonth:completed.reduce((s,d)=>s+Number(d.commissionAmt||0),0),
    collectedMonth:deals.reduce((s,d)=>s+(d.payments||[]).filter(p=>String(p.date||'').slice(0,7)===month).reduce((x,p)=>x+Number(p.amount||0),0),0),
    payable:deals.filter(d=>d.status==='Completed'&&!d.agentPaidAt).reduce((s,d)=>s+Number(d.agentShareAmt||0),0), activeAgents:activeUsers.filter(u=>u.Role==='Agent').length,
    myTarget:Number(currentUser.MonthlyTarget||0), prev:{}, unassignedLeads:agency?leads.filter(l=>!l.assignedAgent&&!['Won','Lost'].includes(l.status)).length:0,
    activeTenancies:tenancies.filter(t=>t.status==='Active').length,
    rentArrears:tenancies.filter(t=>t.status==='Active').reduce((sum,t)=>sum+Math.max(0,Number(t.arrears||0)),0),
    balanceDue:deals.filter(d=>['Token','Agreement'].includes(d.status)).reduce((sum,d)=>sum+Math.max(0,Number(d.balance||0)),0),
    leaderboard:agency?activeUsers.map(u=>({agent:u.Username,listings:props.filter(p=>p.assignedAgent===u.Username&&['Available','Reserved'].includes(p.status)).length,openLeads:leads.filter(l=>l.assignedAgent===u.Username&&!['Won','Lost'].includes(l.status)).length,won:leads.filter(l=>l.assignedAgent===u.Username&&l.status==='Won').length,overdue:0,closed:completed.filter(d=>d.agent===u.Username).length,target:Number(u.MonthlyTarget||0)})):[]
  }});
}

function validateProperty(data) {
  if (!String(data.title || '').trim()) return 'Tiêu đề là bắt buộc';
  if (!(Number(data.price) > 0)) return 'Giá là bắt buộc';
  if (!(Number(data.areaSize) > 0)) return 'Diện tích là bắt buộc';
  if (!Number(data.locationId)) return 'Khu vực là bắt buộc';
  return '';
}

function createRecord(crm, sheet, data, username) {
  const items = crm.sheets[sheet], record = { ...data, id:nextId(items), createdBy:username, created:now(), updated:now() };
  if (sheet === 'Properties') {
    const error = validateProperty(record); if (error) return fail(error);
    record.price=Number(record.price); record.areaSize=Number(record.areaSize); record.locationId=Number(record.locationId);
    record.status=record.status||'Draft'; record.viewsCount=Number(record.viewsCount||0); record.publishedAt=record.status==='Draft'?null:(record.publishedAt||now());
    record.assignedAgent=record.assignedAgent||username; record.referenceCode=record.referenceCode||'RS-LOC-'+(1000+record.id);
    record.slug=record.slug||String(record.title).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+record.id;
  }
  if (sheet === 'Leads') { if (!record.fullName || !record.phone) return fail('Tên và điện thoại là bắt buộc'); record.status=record.status||'New'; record.assignedAgent=record.assignedAgent||username; }
  if (sheet === 'FollowUps') { record.status=record.status||'Pending'; record.assignedAgent=record.assignedAgent||username; }
  if (sheet === 'Appointments') { record.status=record.status||'Scheduled'; record.agent=record.agent||username; }
  if (sheet === 'Deals') { record.status=record.status||'Token'; record.agent=record.agent||username; record.payments=record.payments||[]; const prop=byId(crm.sheets.Properties,record.propertyId); if(prop&&['Token','Agreement'].includes(record.status)){prop.status='Reserved';prop.updated=now();} }
  items.push(record); addLog(crm,username,sheet.slice(0,-1)+' Added','#'+record.id); persist(crm);
  return ok({ id:record.id, message:'Đã thêm dữ liệu thành công' });
}

function updateRecord(crm, sheet, data, username) {
  const record = byId(crm.sheets[sheet], data.id); if (!record || record.deleted) return fail('Không tìm thấy dữ liệu');
  if (sheet === 'Properties') { const error=validateProperty({...record,...data}); if(error)return fail(error); }
  const oldStatus=record.status; Object.assign(record,data,{updated:now()});
  if (sheet==='Properties'&&record.status!=='Draft'&&!record.publishedAt) record.publishedAt=now();
  if (sheet==='Deals'&&oldStatus!==record.status&&record.status==='Completed') {
    record.closedAt=record.closedAt||now(); const prop=byId(crm.sheets.Properties,record.propertyId); if(prop){prop.status=record.dealType==='Rent'?'Rented':'Sold';prop.updated=now();}
    const lead=byId(crm.sheets.Leads,record.leadId); if(lead){lead.status='Won';lead.updated=now();}
    if(record.dealType==='Rent'&&!active(crm.sheets.Tenancies).some(t=>Number(t.dealId)===Number(record.id))){crm.sheets.Tenancies.push({id:nextId(crm.sheets.Tenancies),propertyId:record.propertyId,dealId:record.id,tenantName:record.buyerName||'',tenantPhone:record.buyerPhone||'',monthlyRent:Number(record.dealAmount||0),securityDeposit:Number(record.tokenAmount||0),startDate:String(record.closedAt).slice(0,10),endDate:'',rentDueDay:5,status:'Active',rentLog:[],renewals:[],maintenance:[],depositRefund:null,notes:'',createdBy:username,created:now(),updated:now()});}
  }
  addLog(crm,username,sheet.slice(0,-1)+' Updated','#'+record.id); persist(crm); return ok({message:'Đã cập nhật dữ liệu'});
}

function deleteRecord(crm, sheet, id, username) {
  const record=byId(crm.sheets[sheet],id); if(!record||record.deleted)return fail('Không tìm thấy dữ liệu');
  record.deleted=1;record.deletedAt=now();record.deletedBy=username;record.updated=now();addLog(crm,username,sheet.slice(0,-1)+' Deleted','#'+record.id);persist(crm);return ok({message:'Đã chuyển vào thùng rác'});
}

async function run(method, args) {
  const crm=load();
  if(method==='authenticateUser'){
    const [name,password]=args,u=crm.users.find(x=>String(x.Username).toLowerCase()===String(name||'').toLowerCase());
    if(!u)return fail('Không tìm thấy tên đăng nhập');if(u.Status!=='Active')return fail('Tài khoản đã ngừng hoạt động');if(String(u.Password)!==String(password))return fail('Mật khẩu không đúng');
    return ok({username:u.Username,email:u.Email,role:u.Role,profileImage:u.ProfileImage||'',themeMode:u.ThemeMode||'light',customColors:u.CustomColors||'',permissions:permissions(crm,u.Username),canEditRbac:u.Role==='Admin'});
  }
  if(method==='getPublicPortal'){
    const locs = (crm.sheets.Locations || []).filter(x => !x.deleted);
    const locById = {};
    locs.forEach(l => { locById[l.id] = l; });
    const getPath = (id) => {
      const parts = []; let cur = locById[id], g = 0;
      while (cur && g++ < 5) { parts.unshift(cur.name); cur = cur.parentId ? locById[cur.parentId] : null; }
      return parts.join(' › ');
    };
    const amenList = (crm.sheets.Amenities || []).filter(x => !x.deleted);
    const amenById = {};
    amenList.forEach(a => { amenById[a.id] = { name: a.name, icon: a.icon || '' }; });

    const props = (crm.sheets.Properties || []).filter(p => !p.deleted && (p.status === 'Available' || p.status === 'Reserved' || !p.status || p.publishedAt)).map(p => {
      const pAmens = (p.amenities || []).map(id => amenById[id] ? { id, name: amenById[id].name, icon: amenById[id].icon } : (typeof id === 'object' ? id : null)).filter(Boolean);
      return {
        ...p,
        locationPath: getPath(p.locationId),
        amenities: pAmens
      };
    }).reverse();

    const admin = crm.users.find(u => u.Role === 'Admin' || u.Username === 'admin') || {};
    const logo = (crm.agencyBranding && crm.agencyBranding.logo) || admin.ProfileImage || '';
    const name = (crm.agencyBranding && crm.agencyBranding.name) || 'NTH CRM';

    return ok({
      properties: props,
      locations: locs.map(l => ({ id: l.id, parentId: l.parentId || null, name: l.name, level: l.level })),
      amenities: amenList.map(a => ({ id: a.id, name: a.name, icon: a.icon || '' })),
      branding: { name, logo, phone: crm.agencyBranding?.phone || '', address: crm.agencyBranding?.address || '' }
    });
  }
  if(method==='publicViewProperty'){const p=byId(crm.sheets.Properties,args[0]);if(p){p.viewsCount=Number(p.viewsCount||0)+1;persist(crm);}return ok();}
  if(method==='getDashboardStats')return dashboard(crm,args[0]);
  if(method==='getLogs'){
    const current=user(crm,args[0]),logPerm=(permissions(crm,args[0]).logs||{});
    if(!current||!logPerm.v)return fail('Từ chối truy cập');
    const cutoff=Date.now()-60*864e5;
    const data=active(crm.sheets.Logs)
      .filter(item=>{const stamp=new Date(item.created).getTime();return !Number.isFinite(stamp)||stamp>=cutoff;})
      .slice().reverse()
      .map(item=>({
        Timestamp:item.created||item.updated||'',
        User:item.user||'',
        Action:item.action||'',
        Details:item.details||'',
        Changes:Array.isArray(item.changes)?item.changes:[]
      }));
    return ok({data});
  }
  if(SHEET_BY_GETTER[method])return ok({data:filtered(crm,SHEET_BY_GETTER[method],args[0])});
  if(method==='getLookups'){
    const current=user(crm,args[0]);
    if(!current||current.Status!=='Active')return fail('Từ chối truy cập');
    const allAgents=crm.users
      .filter(u=>u.Status==='Active')
      .map(u=>({username:u.Username,role:u.Role}));
    const agents=scopeAll(crm,args[0])
      ? allAgents
      : allAgents.filter(item=>item.username===current.Username);
    return ok({
      locations:active(crm.sheets.Locations),
      amenities:active(crm.sheets.Amenities),
      agents,
      // Giữ khóa users để tương thích với các bản giao diện local cũ.
      users:agents.map(item=>({Username:item.username,Role:item.role}))
    });
  }
  if(method==='getAllUsers')return ok({data:crm.users.map(({Password,...u})=>u)});
  if(method==='getMyPermissions')return ok({perms:permissions(crm,args[0]),canEdit:(user(crm,args[0])||{}).Role==='Admin'});
  if(method==='getRbacMatrix'){
    const current=user(crm,args[0]);
    if(!current||current.Role!=='Admin')return fail('Từ chối truy cập');
    const roles=crm.roles.slice().sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0));
    return ok({
      pages:RBAC_PAGES,
      roles:roles.map(r=>({key:r.role_key,label:r.label,color:r.color,is_super:Number(r.is_super)?1:0})),
      perms:Object.fromEntries(roles.map(r=>[r.role_key,r.permissions||{}])),
      canEdit:true
    });
  }
  if(method==='toggleRbac'){
    const [roleKey,pageKey,perm,value,caller]=args;
    const current=user(crm,caller);
    if(!current||current.Role!=='Admin')return fail('Từ chối truy cập');
    if(!['v','a','e','d'].includes(perm))return fail('Quyền không hợp lệ');
    if(!RBAC_PAGES.some(page=>page.key===pageKey))return fail('Trang không hợp lệ');
    const target=crm.roles.find(r=>r.role_key===roleKey);
    if(!target)return fail('Không tìm thấy vai trò');
    if(Number(target.is_super))return fail('Quyền Admin được khóa toàn quyền');
    target.permissions=target.permissions||{};
    const cell={v:0,a:0,e:0,d:0,...(target.permissions[pageKey]||{})};
    cell[perm]=value?1:0;
    if(perm==='v'&&!value){cell.a=0;cell.e=0;cell.d=0;}
    if(perm!=='v'&&value)cell.v=1;
    target.permissions[pageKey]=cell;
    addLog(crm,caller,'Permissions Updated',`${roleKey} · ${pageKey} · ${perm}=${value?1:0}`);
    persist(crm);
    return ok({message:'Đã lưu phân quyền'});
  }
  if(method==='getAgencyBranding'){
    return ok({ branding: crm.agencyBranding || {name:'',logo:'',phone:'',address:'',slogan:''} });
  }
  if(method==='saveAgencyBranding'){
    const [b, caller] = args;
    const current = user(crm, caller);
    if(!current || current.Role !== 'Admin') return fail('Chỉ Quản trị viên mới có quyền đổi nhận diện công ty');
    crm.agencyBranding = Object.assign({name:'',logo:'',phone:'',address:'',slogan:''}, b || {});
    addLog(crm, caller, 'Agency Branding Updated', 'Đổi nhận diện: ' + crm.agencyBranding.name);
    persist(crm);
    return ok({ message: 'Đã lưu nhận diện thương hiệu công ty thành công!', branding: crm.agencyBranding });
  }
  if(method==='getUserSettings'){const u=user(crm,args[0])||{};return ok({settings:{profileImage:u.ProfileImage||'',themeMode:u.ThemeMode||'light',customColors:u.CustomColors||''}});}
  if(method==='uploadProfileImage'){
    const [base64Data, filename, username] = args;
    const u = user(crm, username);
    if(!u) return fail('Không tìm thấy người dùng');
    const fileUrl = base64Data;
    u.ProfileImage = fileUrl;
    u.UpdatedAt = now();
    if(u.Role === 'Admin' || u.Username === 'admin') {
      crm.agencyBranding = crm.agencyBranding || {};
      crm.agencyBranding.logo = fileUrl;
    }
    addLog(crm, username, 'Profile Image Uploaded', 'Cập nhật ảnh đại diện: ' + (filename || 'avatar'));
    persist(crm);
    return ok({ fileId: 'local_' + Date.now(), fileUrl: fileUrl, fileName: filename });
  }
  if(method==='updateUserSettings'){const u=user(crm,args[0]);if(!u)return fail('Không tìm thấy người dùng');const s=args[1]||{};if('profileImage'in s){
    u.ProfileImage=s.profileImage;
    if(u.Role === 'Admin' || u.Username === 'admin') {
      crm.agencyBranding = crm.agencyBranding || {};
      crm.agencyBranding.logo = s.profileImage;
    }
  }if('themeMode'in s)u.ThemeMode=s.themeMode;if('customColors'in s)u.CustomColors=s.customColors;u.UpdatedAt=now();persist(crm);return ok({message:'Đã lưu cài đặt'});}
  if(method==='getNotifications')return ok({data:[]});if(method==='getDefaultTheme')return ok({id:'',vars:''});if(method==='getAiConfig')return ok({configured:false});if(method==='getAppConfig')return ok({config:{}});
  if(method==='getTrash'){const data=[];Object.entries(crm.sheets).forEach(([sheet,items])=>items.filter(x=>x.deleted).forEach(x=>data.push({...x,sheet})));return ok({data});}
  if(method==='restoreRecord'){const sheet=ENTITY[args[0]]||args[0],r=byId(crm.sheets[sheet]||[],args[1]);if(!r)return fail('Không tìm thấy dữ liệu');delete r.deleted;delete r.deletedAt;delete r.deletedBy;r.updated=now();persist(crm);return ok({message:'Đã khôi phục'});}

  for(const [entity,sheet] of Object.entries(ENTITY)){
    if(method==='add'+entity)return createRecord(crm,sheet,args[0]||{},args[1]);
    if(method==='update'+entity)return updateRecord(crm,sheet,args[0]||{},args[1]);
    if(method==='delete'+entity)return deleteRecord(crm,sheet,args[0],args[1]);
  }
  if(method==='assignLead'){const r=byId(crm.sheets.Leads,args[0]);if(!r)return fail('Không tìm thấy khách hàng');r.assignedAgent=args[1];r.updated=now();persist(crm);return ok({message:'Đã phân công'});}
  if(method==='completeAppointment'){const r=byId(crm.sheets.Appointments,args[0]);if(!r)return fail('Không tìm thấy lịch hẹn');Object.assign(r,args[1]||{},{status:'Completed',completedAt:now(),updated:now()});persist(crm);return ok({message:'Đã hoàn tất lịch hẹn'});}
  if(method==='addDealPayment'){const r=byId(crm.sheets.Deals,args[0]);if(!r)return fail('Không tìm thấy giao dịch');r.payments=r.payments||[];r.payments.push({...args[1],date:(args[1]||{}).date||now(),receivedBy:args[2]});r.updated=now();persist(crm);return ok({message:'Đã ghi nhận thanh toán'});}
  if(method==='markAgentPaid'){const r=byId(crm.sheets.Deals,args[0]);if(!r)return fail('Không tìm thấy giao dịch');r.agentPaidAt=now();r.updated=now();persist(crm);return ok({message:'Đã ghi nhận chi trả'});}
  if(method==='collectRent'){const r=byId(crm.sheets.Tenancies,args[0]);if(!r)return fail('Không tìm thấy hợp đồng thuê');r.rentLog=r.rentLog||[];r.rentLog.push({...args[1],paidAt:(args[1]||{}).paidAt||now(),receivedBy:args[2]});r.updated=now();persist(crm);return ok({message:'Đã thu tiền thuê'});}
  if(method==='renewTenancy'){const r=byId(crm.sheets.Tenancies,args[0]);if(!r)return fail('Không tìm thấy hợp đồng thuê');r.renewals=r.renewals||[];r.renewals.push({date:now(),oldRent:r.monthlyRent,newRent:Number(args[1].newRent),newEndDate:args[1].newEndDate,notes:args[1].notes||'',byUser:args[2]});r.monthlyRent=Number(args[1].newRent);r.endDate=args[1].newEndDate;r.updated=now();persist(crm);return ok({message:'Đã gia hạn'});}
  if(method==='endTenancy'){const r=byId(crm.sheets.Tenancies,args[0]);if(!r)return fail('Không tìm thấy hợp đồng thuê');r.status='Ended';r.endDate=(args[1]||{}).endDate||now().slice(0,10);r.depositRefund=(args[1]||{}).depositRefund||null;r.updated=now();const p=byId(crm.sheets.Properties,r.propertyId);if(p){p.status='Available';p.updated=now();}persist(crm);return ok({message:'Đã kết thúc hợp đồng thuê'});}
  if(method==='addMaintenance'){const r=byId(crm.sheets.Tenancies,args[0]);if(!r)return fail('Không tìm thấy hợp đồng thuê');r.maintenance=r.maintenance||[];r.maintenance.push({...(args[1]||{}),id:nextId(r.maintenance),date:(args[1]||{}).date||now().slice(0,10),status:(args[1]||{}).status||'Open',addedBy:args[2]});r.updated=now();persist(crm);return ok({message:'Đã ghi nhận bảo trì'});}
  if(method==='updateMaintenance'){const r=byId(crm.sheets.Tenancies,args[0]),m=r&&byId(r.maintenance||[],args[1]);if(!m)return fail('Không tìm thấy bảo trì');Object.assign(m,args[2]||{}, {updated:now()});r.updated=now();persist(crm);return ok({message:'Đã cập nhật bảo trì'});}
  if(method==='addUser'){const d=args[0]||{};if(user(crm,d.Username))return fail('Tên đăng nhập đã tồn tại');crm.users.push({...d,Status:d.Status||'Active',CreatedAt:now(),CreatedBy:args[1],UpdatedAt:now(),UpdatedBy:args[1],MonthlyTarget:Number(d.MonthlyTarget||0)});persist(crm);return ok({message:'Đã thêm người dùng'});}
  if(method==='updateUser'){const u=user(crm,args[0]);if(!u)return fail('Không tìm thấy người dùng');Object.assign(u,args[1]||{}, {UpdatedAt:now(),UpdatedBy:args[2]});persist(crm);return ok({message:'Đã cập nhật người dùng'});}
  if(method==='deleteUser'){const u=user(crm,args[0]);if(!u)return fail('Không tìm thấy người dùng');u.Status='Inactive';u.UpdatedAt=now();u.UpdatedBy=args[1];persist(crm);return ok({message:'Đã vô hiệu hóa người dùng'});}
  if(method==='reassignAgentWork'){const [from,to]=args;['Properties','Leads','FollowUps'].forEach(s=>crm.sheets[s].forEach(r=>{if(r.assignedAgent===from)r.assignedAgent=to;}));crm.sheets.Appointments.forEach(r=>{if(r.agent===from)r.agent=to;});crm.sheets.Deals.forEach(r=>{if(r.agent===from)r.agent=to;});persist(crm);return ok({message:'Đã chuyển giao công việc'});}
  if(method==='publicSubmitEnquiry'){
    const d=args[0]||{};if(String(d.website||'').trim())return ok({message:'Cảm ơn bạn!'});
    const phone=String(d.phone||'').replace(/[^\d+]/g,'');if(!String(d.fullName||'').trim()||phone.replace(/\D/g,'').length<9)return fail('Vui lòng nhập tên và số điện thoại hợp lệ');
    const duplicate=active(crm.sheets.Leads).find(l=>String(l.phone)===phone&&!['Won','Lost'].includes(l.status));
    if(duplicate){crm.sheets.FollowUps.push({id:nextId(crm.sheets.FollowUps),leadId:duplicate.id,assignedAgent:duplicate.assignedAgent||'',type:'Note',notes:'Yêu cầu mới từ website: '+String(d.message||'').slice(0,500),dueAt:null,status:'Completed',completedAt:now(),reminderSent:0,createdBy:'',created:now(),updated:now()});persist(crm);return ok({message:'Cảm ơn bạn! Đội ngũ sẽ sớm liên hệ.'});}
    const agents=crm.users.filter(u=>u.Status==='Active'&&u.Role==='Agent');const assignedAgent=agents.length?agents[crm.sheets.Leads.length%agents.length].Username:'';
    crm.sheets.Leads.push({id:nextId(crm.sheets.Leads),fullName:String(d.fullName).trim().slice(0,100),phone,email:String(d.email||'').trim(),source:'Website',interestType:d.interestType||'Buy',propertyId:Number(d.propertyId)||null,preferredLocationId:null,budgetMin:null,budgetMax:null,message:String(d.message||'').slice(0,1000),status:'New',lostReason:'',assignedAgent,createdBy:'',created:now(),updated:now()});addLog(crm,'public','Enquiry Received',String(d.fullName)+' · '+phone);persist(crm);return ok({message:'Cảm ơn bạn! Đội ngũ sẽ sớm liên hệ.'});
  }
  if(method==='addOffer'){const lead=byId(crm.sheets.Leads,args[0]);if(!lead)return fail('Không tìm thấy khách hàng');lead.offers=lead.offers||[];lead.offers.push({...args[1],id:nextId(lead.offers),date:(args[1]||{}).date||now(),status:(args[1]||{}).status||'Open',addedBy:args[2]});lead.updated=now();persist(crm);return ok({message:'Đã ghi nhận chào giá'});}
  if(method==='updateOffer'){const lead=byId(crm.sheets.Leads,args[0]),offer=lead&&byId(lead.offers||[],args[1]);if(!offer)return fail('Không tìm thấy chào giá');offer.status=args[2];if(args[2]==='Accepted')(lead.offers||[]).forEach(o=>{if(o.id!==offer.id&&o.status==='Open')o.status='Rejected';});lead.updated=now();persist(crm);return ok({message:'Đã cập nhật chào giá'});}
  if(method==='addPropertyExpense'){const prop=byId(crm.sheets.Properties,args[0]);if(!prop)return fail('Không tìm thấy bất động sản');const d=args[1]||{};if(!(Number(d.amount)>0))return fail('Số tiền chi phí là bắt buộc');prop.expenses=prop.expenses||[];prop.expenses.push({date:d.date||now().slice(0,10),category:d.category||'Other',amount:Number(d.amount),notes:d.notes||'',addedBy:args[2]});prop.updated=now();persist(crm);return ok({message:'Đã ghi nhận chi phí'});}
  if(method==='convertLeadToProperty'){const lead=byId(crm.sheets.Leads,args[0]);if(!lead)return fail('Không tìm thấy khách hàng');const owner=active(crm.sheets.Owners).find(o=>o.phone===lead.phone)||null;return ok({prefill:{title:'Nguồn hàng từ '+lead.fullName,ownerName:lead.fullName,ownerPhone:lead.phone,ownerId:owner&&owner.id,locationId:lead.preferredLocationId||null,listingType:lead.interestType==='Rent Out'?'Rent':'Sale',assignedAgent:lead.assignedAgent||args[1]}});}
  if(method==='removePropertyDoc'){const prop=byId(crm.sheets.Properties,args[0]);if(!prop)return fail('Không tìm thấy bất động sản');prop.documents=(prop.documents||[]).filter(d=>d.url!==args[1]);prop.updated=now();persist(crm);return ok({message:'Đã gỡ tài liệu'});}
  if(method.startsWith('bulkImport'))return fail('Nhập hàng loạt chưa được hỗ trợ trên localhost');
  if(method.startsWith('upload')||method.includes('Pdf')||method.startsWith('email')||method.startsWith('buildAgreement'))return fail('Chức năng tệp/email cần Google Apps Script khi triển khai chính thức');
  if(method==='aiChat')return fail('Chưa cấu hình OpenAI API cho localhost');
  return fail('Chức năng chưa được hỗ trợ trên localhost: '+method);
}

module.exports = { run, refreshPortal: () => rebuildPortal(load()) };
