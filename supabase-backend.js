const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const IMAGE_BUCKET = 'property-images';
const enabled = Boolean(SUPABASE_URL && PUBLISHABLE_KEY && SERVICE_KEY);
const ok = (data = {}) => ({ success: true, ...data });
const fail = (message) => ({ success: false, message });

async function request(path, { method = 'GET', body, jwt, admin = false, headers: extraHeaders = {} } = {}) {
  const key = admin ? SERVICE_KEY : PUBLISHABLE_KEY;
  const headers = { apikey: key, 'Content-Type': 'application/json', ...extraHeaders };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  else if (admin) headers.Authorization = `Bearer ${SERVICE_KEY}`;
  const response = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload && (payload.message || payload.msg || payload.error_description || payload.error) || `Supabase HTTP ${response.status}`;
    const error = new Error(message); error.status = response.status; throw error;
  }
  return payload;
}

const enc = (value) => encodeURIComponent(String(value));
const select = (table, columns, jwt, extra = '') => request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, { jwt });
const adminSelect = (table, columns, extra = '') => request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, { admin:true });
async function selectAll(table, columns, jwt, extra = '') {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const page = await request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, {
      jwt,
      headers: { Range: `${start}-${start + pageSize - 1}` }
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
async function adminSelectAll(table, columns, extra = '') {
  const rows = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const page = await request(`/rest/v1/${table}?select=${enc(columns || '*')}${extra}`, {
      admin: true,
      headers: { Range: `${start}-${start + pageSize - 1}` }
    });
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function jwtSubject(jwt) {
  try {
    const part = String(jwt || '').split('.')[1];
    return part ? JSON.parse(Buffer.from(part, 'base64url').toString('utf8')).sub || '' : '';
  } catch { return ''; }
}

async function currentProfile(jwt) {
  const subject = jwtSubject(jwt);
  if (!subject) throw new Error('Phiên đăng nhập Supabase không hợp lệ');
  const rows = await select('profiles','id,username,email,role_key,status,profile_image,theme_mode,custom_colors,monthly_target_vnd',jwt,`&id=eq.${enc(subject)}&limit=1`);
  if (!rows.length || rows[0].status !== 'Active') throw new Error('Tài khoản không hoạt động');
  return rows[0];
}

async function permissionsFor(roleKey,jwt) {
  const rows = await select('role_permissions','page_key,can_view,can_add,can_edit,can_delete',jwt,`&role_key=eq.${enc(roleKey)}`);
  return Object.fromEntries(rows.map((r) => [r.page_key,{v:r.can_view?1:0,a:r.can_add?1:0,e:r.can_edit?1:0,d:r.can_delete?1:0}]));
}

async function authenticateUser(args) {
  const [login,password] = args;
  let email = String(login || '').trim().toLowerCase();
  if (!email.includes('@')) {
    const rows = await adminSelect('profiles','email',`&username=eq.${enc(email)}&limit=1`);
    if (!rows.length) return fail('Không tìm thấy tên đăng nhập');
    email = rows[0].email;
  }
  let auth;
  try { auth = await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}}); }
  catch (error) { return fail(error.status === 400 ? 'Tên đăng nhập hoặc mật khẩu không đúng' : error.message); }
  const p = await currentProfile(auth.access_token), perms = await permissionsFor(p.role_key,auth.access_token);
  return ok({username:p.username,email:p.email,role:p.role_key,profileImage:p.profile_image||'',themeMode:p.theme_mode||'light',
    customColors:JSON.stringify(p.custom_colors||{}),permissions:perms,canEditRbac:p.role_key==='Admin',
    authSession:{accessToken:auth.access_token,refreshToken:auth.refresh_token,expiresAt:Date.now()+Number(auth.expires_in||3600)*1000}});
}
async function refreshAuthSession(args) {
  const refreshToken = String(args[0] || '').trim();
  if (!refreshToken) return fail('Phiên đăng nhập đã hết hạn');
  let auth;
  try { auth = await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refreshToken}}); }
  catch (error) { return fail('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại'); }
  return ok({authSession:{accessToken:auth.access_token,refreshToken:auth.refresh_token||refreshToken,expiresAt:Date.now()+Number(auth.expires_in||3600)*1000}});
}

const mapProperty = (r) => ({id:r.id,referenceCode:r.reference_code,title:r.title,slug:r.slug,description:r.description||'',propertyType:r.property_type,
  listingType:r.listing_type,status:r.status,price:Number(r.price_vnd||0),rentFrequency:r.rent_frequency||'',areaSize:Number(r.area_size||0),areaUnit:r.area_unit||'m²',
  bedrooms:r.bedrooms,bathrooms:r.bathrooms,locationId:r.location_id,address:r.address||'',latitude:r.latitude,longitude:r.longitude,
  ownerName:r.owner_name_snapshot||'',ownerPhone:r.owner_phone_snapshot||'',assignedAgent:r.profiles?.username||'',isFeatured:r.is_featured?1:0,
  viewsCount:Number(r.views_count||0),publishedAt:r.published_at,created:r.created_at,updated:r.updated_at});
const mapLead = (r) => ({id:r.id,fullName:r.full_name,phone:r.phone,email:r.email||'',source:r.source,interestType:r.interest_type,propertyId:r.property_id,
  preferredLocationId:r.preferred_location_id,budgetMin:r.budget_min_vnd===null?null:Number(r.budget_min_vnd),budgetMax:r.budget_max_vnd===null?null:Number(r.budget_max_vnd),
  message:r.message||'',status:r.status,lostReason:r.lost_reason||'',assignedAgent:r.profiles?.username||'',created:r.created_at,updated:r.updated_at});

async function getProperties(jwt){
  const [rows,images,links]=await Promise.all([
    select('properties','*,profiles!properties_assigned_agent_id_fkey(username)',jwt,'&deleted_at=is.null&order=created_at.desc'),
    select('property_images','id,property_id,storage_path,sort_order',jwt,'&order=sort_order.asc'),
    select('property_amenities','property_id,amenity_id',jwt)
  ]);
  const imagesBy=new Map(),amenitiesBy=new Map();
  images.forEach(image=>{const list=imagesBy.get(Number(image.property_id))||[];list.push({id:image.id,url:image.storage_path,isPrimary:list.length===0?1:0,sortOrder:Number(image.sort_order||0)});imagesBy.set(Number(image.property_id),list);});
  links.forEach(link=>{const list=amenitiesBy.get(Number(link.property_id))||[];list.push(Number(link.amenity_id));amenitiesBy.set(Number(link.property_id),list);});
  return ok({data:rows.map(row=>({...mapProperty(row),ownerId:row.owner_id,images:imagesBy.get(Number(row.id))||[],amenityIds:amenitiesBy.get(Number(row.id))||[]}))});
}
async function getLeads(jwt){const rows=await select('leads','*,profiles!leads_assigned_agent_id_fkey(username)',jwt,'&deleted_at=is.null&order=created_at.desc');return ok({data:rows.map(mapLead)});}
async function getLocations(jwt){await currentProfile(jwt);const rows=await adminSelectAll('locations','*','&deleted_at=is.null&order=id.asc');return ok({data:rows.map(r=>({id:r.id,name:r.name,level:r.level,parentId:r.parent_id,slug:r.slug,created:r.created_at,updated:r.updated_at}))});}
async function getAmenities(jwt){const rows=await select('amenities','*',jwt,'&deleted_at=is.null&order=name.asc');return ok({data:rows.map(r=>({id:r.id,name:r.name,icon:r.icon||'',created:r.created_at,updated:r.updated_at}))});}
async function getOwners(jwt){const rows=await select('owners','*',jwt,'&deleted_at=is.null&order=created_at.desc');return ok({data:rows.map(r=>({id:r.id,name:r.name,phone:r.phone,email:r.email||'',cnic:r.identity_number||'',address:r.address||'',notes:r.notes||'',created:r.created_at,updated:r.updated_at}))});}
async function getAllUsers(jwt){const rows=await select('profiles','*',jwt,'&order=created_at.desc');return ok({data:rows.map(r=>({Username:r.username,Email:r.email,Role:r.role_key,Status:r.status,ProfileImage:r.profile_image||'',ThemeMode:r.theme_mode||'light',CustomColors:JSON.stringify(r.custom_colors||{}),CreatedAt:r.created_at,MonthlyTarget:Number(r.monthly_target_vnd||0)}))});}
async function getFollowUps(jwt){const rows=await select('follow_ups','*,profiles!follow_ups_assigned_agent_id_fkey(username),leads(full_name,phone)',jwt,'&deleted_at=is.null&order=created_at.desc');return ok({data:rows.map(r=>({id:r.id,leadId:r.lead_id,assignedAgent:r.profiles?.username||'',type:r.type,notes:r.notes||'',dueAt:r.due_at,status:r.status,completedAt:r.completed_at,reminderSent:r.reminder_sent_at?1:0,leadName:r.leads?.full_name||'',leadPhone:r.leads?.phone||'',created:r.created_at,updated:r.updated_at}))});}
async function getAppointments(jwt){const rows=await select('appointments','*,profiles!appointments_agent_id_fkey(username),leads(full_name,phone),properties(title,reference_code)',jwt,'&deleted_at=is.null&order=scheduled_at.desc');return ok({data:rows.map(r=>({id:r.id,leadId:r.lead_id,propertyId:r.property_id,agent:r.profiles?.username||'',scheduledAt:r.scheduled_at,durationMinutes:r.duration_minutes,status:r.status,notes:r.notes||'',cancellationReason:r.cancellation_reason||'',reminderSent:r.reminder_sent_at?1:0,interestLevel:r.interest_level,feedback:r.feedback||'',leadName:r.leads?.full_name||'',leadPhone:r.leads?.phone||'',propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',created:r.created_at,updated:r.updated_at}))});}
async function getDeals(jwt){const [rows,payments]=await Promise.all([select('deal_financials','*,profiles!deals_agent_id_fkey(username),properties(title,reference_code)',jwt,'&deleted_at=is.null&order=created_at.desc'),select('deal_payments','*,profiles!deal_payments_received_by_fkey(username)',jwt,'&order=paid_at.desc')]);const by=new Map();payments.forEach(x=>{const list=by.get(Number(x.deal_id))||[];list.push({id:x.id,date:x.paid_at,amount:Number(x.amount_vnd||0),method:x.method,reference:x.reference||'',notes:x.notes||'',receivedBy:x.profiles?.username||''});by.set(Number(x.deal_id),list);});return ok({data:rows.map(r=>({id:r.id,dealType:r.deal_type,propertyId:r.property_id,leadId:r.lead_id,buyerName:r.buyer_name,buyerPhone:r.buyer_phone,agent:r.profiles?.username||'',dealAmount:Number(r.deal_amount_vnd||0),commissionPct:Number(r.commission_pct||0),commissionAmt:Number(r.commission_amount_vnd||0),agentSharePct:Number(r.agent_share_pct||0),agentShareAmt:Number(r.agent_share_amount_vnd||0),agentPaidAt:r.agent_paid_at,tokenAmount:Number(r.token_amount_vnd||0),status:r.status,closedAt:r.closed_at,cancellationReason:r.cancellation_reason||'',notes:r.notes||'',payments:by.get(Number(r.id))||[],paid:Number(r.paid_vnd||0),balance:Number(r.balance_vnd||0),propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',created:r.created_at,updated:r.updated_at}))});}
async function getTenancies(jwt){
  const [rows,payments,renewals,maintenance,refunds]=await Promise.all([
    select('tenancy_financials','*,properties(title,reference_code,profiles!properties_assigned_agent_id_fkey(username))',jwt,'&deleted_at=is.null&order=created_at.desc'),
    select('rent_payments','*,profiles!rent_payments_received_by_fkey(username)',jwt,'&order=paid_at.desc'),
    select('tenancy_renewals','*,profiles!tenancy_renewals_created_by_fkey(username)',jwt,'&order=renewed_at.desc'),
    select('maintenance_items','*,profiles!maintenance_items_created_by_fkey(username)',jwt,'&order=issue_date.desc'),
    select('deposit_refunds','*',jwt)
  ]);
  const by=(items,key)=>{const map=new Map();items.forEach(item=>{const list=map.get(Number(item[key]))||[];list.push(item);map.set(Number(item[key]),list);});return map;},payBy=by(payments,'tenancy_id'),renewBy=by(renewals,'tenancy_id'),maintBy=by(maintenance,'tenancy_id'),refundBy=new Map(refunds.map(item=>[Number(item.tenancy_id),item]));
  return ok({data:rows.map(r=>{const refund=refundBy.get(Number(r.id));return {id:r.id,propertyId:r.property_id,dealId:r.deal_id,tenantName:r.tenant_name,tenantPhone:r.tenant_phone,monthlyRent:Number(r.monthly_rent_vnd||0),securityDeposit:Number(r.security_deposit_vnd||0),startDate:r.start_date,endDate:r.end_date,rentDueDay:r.rent_due_day,status:r.status,notes:r.notes||'',propertyTitle:r.properties?.title||'',propertyRef:r.properties?.reference_code||'',agent:r.properties?.profiles?.username||'',collected:Number(r.collected_vnd||0),expected:Number(r.collected_vnd||0)+Number(r.arrears_vnd||0),arrears:Number(r.arrears_vnd||0),rentLog:(payBy.get(Number(r.id))||[]).map(x=>({month:String(x.rent_month||'').slice(0,7),amount:Number(x.amount_vnd||0),paidAt:x.paid_at,method:x.method,ref:x.reference||'',receivedBy:x.profiles?.username||''})),renewals:(renewBy.get(Number(r.id))||[]).map(x=>({date:x.renewed_at,oldRent:Number(x.old_rent_vnd||0),newRent:Number(x.new_rent_vnd||0),newEndDate:x.new_end_date,notes:x.notes||'',byUser:x.profiles?.username||''})),maintenance:(maintBy.get(Number(r.id))||[]).map(x=>({id:x.id,date:x.issue_date,issue:x.issue,status:x.status,cost:Number(x.cost_vnd||0),fixedAt:x.fixed_at,addedBy:x.profiles?.username||''})),depositRefund:refund?{amount:Number(refund.refund_vnd||0),deductions:Number(refund.deductions_vnd||0),notes:refund.notes||'',refundedAt:refund.refunded_at}:null,created:r.created_at,updated:r.updated_at};})});
}
async function getLogs(jwt){const rows=await select('activity_logs','*',jwt,'&order=created_at.desc&limit=500');return ok({data:rows.map(r=>({Timestamp:r.created_at,User:r.actor_username,Action:r.action,Details:r.details||'',Changes:r.changes||[]}))});}
async function getMyPermissions(jwt){const p=await currentProfile(jwt);return ok({perms:await permissionsFor(p.role_key,jwt),canEdit:p.role_key==='Admin'});}
async function getLookups(jwt){
  const [profile,u,l,a]=await Promise.all([currentProfile(jwt),getAllUsers(jwt),getLocations(jwt),getAmenities(jwt)]);
  const users=u.data.filter(x=>x.Status==='Active');
  const staff=users.map(x=>({username:x.Username,role:x.Role}));
  const agents=['Admin','Manager'].includes(profile.role_key)?staff:staff.filter(x=>x.username===profile.username);
  return ok({users,agents,locations:l.data,amenities:a.data});
}
async function getAppConfig(jwt){const rows=await select('app_settings','setting_value',jwt,'&setting_key=eq.crm&limit=1');return ok({cfg:rows[0]?.setting_value||{},config:rows[0]?.setting_value||{}});}
async function getUserSettings(jwt){const p=await currentProfile(jwt);return ok({settings:{profileImage:p.profile_image||'',themeMode:p.theme_mode||'light',customColors:JSON.stringify(p.custom_colors||{})}});}
async function updateUserSettings(args,jwt){const p=await currentProfile(jwt),settings=args[1]||args[0]||{};let colors;if(has(settings,'customColors')){if(!settings.customColors)colors={};else if(typeof settings.customColors==='string'){try{colors=JSON.parse(settings.customColors);}catch{colors={};}}else colors=settings.customColors;}await patchRow('profiles',p.id,{profile_image:settings.profileImage,theme_mode:settings.themeMode,custom_colors:colors,updated_at:new Date().toISOString()},jwt);await audit(jwt,'Settings Updated','Cập nhật tùy chọn tài khoản');return ok({message:'Đã lưu cài đặt tài khoản'});}

const PAGE_META = [
  ['dashboard','Tổng quan','TỔNG QUAN'],['ai','Trợ lý AI','TỔNG QUAN'],
  ['properties','Bất động sản','CRM'],['leads','Khách hàng tiềm năng','CRM'],['followups','Chăm sóc khách hàng','CRM'],['appointments','Lịch hẹn','CRM'],
  ['deals','Giao dịch','TÀI CHÍNH'],['tenancies','Hợp đồng thuê','TÀI CHÍNH'],['agreements','Hợp đồng','TÀI CHÍNH'],['reports','Báo cáo','TÀI CHÍNH'],
  ['owners','Chủ sở hữu','DANH MỤC'],['locations','Khu vực','DANH MỤC'],['amenities','Tiện ích','DANH MỤC'],
  ['users','Người dùng','HỆ THỐNG'],['settings','Cài đặt','HỆ THỐNG'],['logs','Nhật ký hoạt động','HỆ THỐNG'],['trash','Thùng rác','HỆ THỐNG']
];
async function getRbacMatrix(jwt){const p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');const [roles,rows]=await Promise.all([select('roles','role_key,label,color,is_super,sort_order',jwt,'&order=sort_order.asc'),select('role_permissions','role_key,page_key,can_view,can_add,can_edit,can_delete',jwt)]);const perms={};rows.forEach(r=>{perms[r.role_key]??={};perms[r.role_key][r.page_key]={v:r.can_view?1:0,a:r.can_add?1:0,e:r.can_edit?1:0,d:r.can_delete?1:0};});return ok({roles:roles.map(r=>({key:r.role_key,label:r.label,color:r.color,is_super:r.is_super})),pages:PAGE_META.map(([key,label,group])=>({key,label,group})),perms});}
async function toggleRbac(args,jwt){const [roleKey,pageKey,perm,value]=args,p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');if(roleKey==='Admin')return fail('Quyền Admin được khóa');const column={v:'can_view',a:'can_add',e:'can_edit',d:'can_delete'}[perm];if(!column)return fail('Quyền không hợp lệ');const rows=await select('role_permissions','can_view,can_add,can_edit,can_delete',jwt,`&role_key=eq.${enc(roleKey)}&page_key=eq.${enc(pageKey)}&limit=1`);if(!rows.length)return fail('Không tìm thấy quyền');const body={[column]:Boolean(Number(value))};if(perm==='v'&&!Number(value))Object.assign(body,{can_add:false,can_edit:false,can_delete:false});if(perm!=='v'&&Number(value))body.can_view=true;await request(`/rest/v1/role_permissions?role_key=eq.${enc(roleKey)}&page_key=eq.${enc(pageKey)}`,{method:'PATCH',jwt,body});await audit(jwt,'RBAC Updated',`${roleKey}.${pageKey}.${perm}=${Number(value)?1:0}`);return ok({message:'Đã cập nhật phân quyền'});}
async function setAppConfig(args,jwt){const p=await currentProfile(jwt);if(p.role_key!=='Admin')return fail('Từ chối truy cập');const cfg=args[0]||{};await request('/rest/v1/app_settings?setting_key=eq.crm',{method:'PATCH',jwt,body:{setting_value:cfg,updated_at:new Date().toISOString(),updated_by:p.id}});await audit(jwt,'App Config Updated','Cập nhật cấu hình CRM');return ok({message:'Đã lưu cấu hình'});}

function locationPath(locations, id) {
  const map = new Map(locations.map(item => [Number(item.id),item])), parts = [], seen = new Set();
  let current = map.get(Number(id));
  while (current && !seen.has(current.id)) { seen.add(current.id); parts.unshift(current.name); current = map.get(Number(current.parent_id)); }
  return parts.join(' › ');
}

async function getPublicPortal() {
  const [properties,locations,amenities,links,images] = await Promise.all([
    adminSelect('properties','id,reference_code,title,slug,description,property_type,listing_type,status,price_vnd,rent_frequency,area_size,area_unit,bedrooms,bathrooms,location_id,address,latitude,longitude,is_featured,views_count,published_at','&deleted_at=is.null&published_at=not.is.null&status=in.(Available,Reserved)&order=published_at.desc'),
    adminSelect('locations','id,name,level,parent_id','&deleted_at=is.null&order=id.asc'),
    adminSelect('amenities','id,name,icon','&deleted_at=is.null&order=name.asc'),
    adminSelect('property_amenities','property_id,amenity_id'),
    adminSelect('property_images','property_id,storage_path,sort_order','&order=sort_order.asc')
  ]);
  const amenityMap = new Map(amenities.map(item=>[Number(item.id),{name:item.name,icon:item.icon||''}]));
  const linksByProperty = new Map(), imagesByProperty = new Map();
  links.forEach(link=>{const list=linksByProperty.get(Number(link.property_id))||[];const amenity=amenityMap.get(Number(link.amenity_id));if(amenity)list.push(amenity);linksByProperty.set(Number(link.property_id),list);});
  images.forEach(image=>{const list=imagesByProperty.get(Number(image.property_id))||[];list.push({url:image.storage_path,isPrimary:list.length===0?1:0,sortOrder:image.sort_order});imagesByProperty.set(Number(image.property_id),list);});
  return ok({
    properties:properties.map(item=>({id:item.id,referenceCode:item.reference_code,title:item.title,slug:item.slug,description:item.description||'',propertyType:item.property_type,listingType:item.listing_type,status:item.status,price:Number(item.price_vnd||0),rentFrequency:item.rent_frequency||'',areaSize:Number(item.area_size||0),areaUnit:item.area_unit||'m²',bedrooms:item.bedrooms,bathrooms:item.bathrooms,locationId:item.location_id,locationPath:locationPath(locations,item.location_id),address:item.address||'',latitude:item.latitude,longitude:item.longitude,isFeatured:item.is_featured?1:0,viewsCount:Number(item.views_count||0),images:imagesByProperty.get(Number(item.id))||[],amenities:linksByProperty.get(Number(item.id))||[],publishedAt:item.published_at})),
    locations:locations.map(item=>({id:item.id,parentId:item.parent_id||null,name:item.name,level:item.level})),
    amenities:amenities.map(item=>({id:item.id,name:item.name,icon:item.icon||''}))
  });
}

async function publicViewProperty(args) {
  const id = Number(args[0]); if (!id) return fail('Bất động sản không hợp lệ');
  const rows = await adminSelect('properties','views_count',`&id=eq.${id}&deleted_at=is.null&limit=1`);
  if (!rows.length) return fail('Không tìm thấy bất động sản');
  await request(`/rest/v1/properties?id=eq.${id}`,{method:'PATCH',body:{views_count:Number(rows[0].views_count||0)+1},admin:true});
  return ok();
}

async function publicSubmitEnquiry(args) {
  const data = args[0] || {};
  if (String(data.website || '').trim()) return ok({message:'Yêu cầu đã được ghi nhận.'});
  if (!String(data.fullName||'').trim() || !String(data.phone||'').trim()) return fail('Vui lòng nhập họ tên và số điện thoại');
  await request('/rest/v1/leads',{method:'POST',admin:true,body:{full_name:String(data.fullName).trim(),phone:String(data.phone).trim(),email:String(data.email||'').trim()||null,source:'Website',interest_type:['Buy','Rent','Sell','Rent Out'].includes(data.interestType)?data.interestType:'Buy',property_id:Number(data.propertyId)||null,message:String(data.message||'').trim(),status:'New'}});
  return ok({message:'Chúng tôi đã nhận được yêu cầu và sẽ liên hệ với bạn sớm.'});
}

const clean = (object) => Object.fromEntries(Object.entries(object).filter(([,value]) => value !== undefined));
const nullableNumber = (value) => value === undefined ? undefined : (value === '' || value === null ? null : Number(value));
const nullableText = (value) => value === undefined ? undefined : (value === '' || value === null ? null : String(value));
const has = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const slugify = (value) => String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

async function profileId(username,jwt,fallback) {
  if (!username) return fallback || null;
  const rows = await select('profiles','id',jwt,`&username=eq.${enc(username)}&status=eq.Active&limit=1`);
  return rows[0]?.id || fallback || null;
}
async function audit(jwt, action, details) {
  const p = await currentProfile(jwt);
  const body={actor_id:p.id,actor_username:p.username,action,details:details||''};
  try {
    await request('/rest/v1/activity_logs',{method:'POST',jwt,body});
  } catch (error) {
    // Dữ liệu nhập từ hệ thống cũ có ID tường minh nên sequence có thể chưa bắt kịp.
    if (!/activity_logs_pkey|duplicate key/i.test(String(error.message||''))) throw error;
    const latest=await adminSelect('activity_logs','id','&order=id.desc&limit=1');
    await request('/rest/v1/activity_logs',{method:'POST',admin:true,body:{...body,id:Number(latest[0]?.id||0)+1}});
  }
}

function brochurePythonPath() {
  const candidates = [
    process.env.CRM_PYTHON,
    process.env.PYTHON,
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe'),
    process.platform === 'win32' ? 'python.exe' : 'python3'
  ].filter(Boolean);
  return candidates.find(candidate => candidate.indexOf(path.sep) === -1 || fs.existsSync(candidate)) || candidates[candidates.length - 1];
}

function renderBrochurePdf(payload) {
  const script = path.join(__dirname, 'scripts', 'generate-property-brochure.py');
  if (!fs.existsSync(script)) throw new Error('Thiếu bộ tạo tờ giới thiệu PDF');
  const result = spawnSync(brochurePythonPath(), [script], {
    input: Buffer.from(JSON.stringify(payload), 'utf8'),
    maxBuffer: 24 * 1024 * 1024,
    windowsHide: true
  });
  if (result.error) throw new Error(`Không thể khởi động bộ tạo PDF: ${result.error.message}`);
  if (result.status !== 0 || !result.stdout?.length) {
    throw new Error(String(result.stderr || 'Không thể tạo tờ giới thiệu PDF').trim());
  }
  return result.stdout;
}

async function brochurePdf(args, jwt) {
  const propertyId = Number(args[0]);
  if (!propertyId) return fail('Bất động sản không hợp lệ');
  const [propertiesResult, locationsResult, amenitiesResult] = await Promise.all([
    getProperties(jwt), getLocations(jwt), getAmenities(jwt)
  ]);
  const property = (propertiesResult.data || []).find(item => Number(item.id) === propertyId);
  if (!property) return fail('Không tìm thấy bất động sản hoặc bạn không có quyền xem');
  const locations = locationsResult.data || [];
  const amenityMap = new Map((amenitiesResult.data || []).map(item => [Number(item.id), item.name]));
  const statusMap = { Draft:'Bản nháp', Available:'Còn trống', Reserved:'Đã giữ chỗ', Sold:'Đã bán', Rented:'Đã cho thuê', Withdrawn:'Đã rút' };
  const listingMap = { Sale:'Bán', Rent:'Thuê' };
  const rentMap = { Monthly:'tháng', Quarterly:'quý', Yearly:'năm' };
  const cover = (property.images || []).find(item => item.isPrimary) || (property.images || [])[0];
  const payload = {
    title: property.title,
    referenceCode: property.referenceCode,
    propertyType: property.propertyType,
    listingType: listingMap[property.listingType] || property.listingType,
    status: statusMap[property.status] || property.status,
    price: property.price,
    rentFrequency: rentMap[property.rentFrequency] || property.rentFrequency,
    areaSize: property.areaSize,
    areaUnit: property.areaUnit,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    assignedAgent: property.assignedAgent,
    location: [locationPath(locations.map(item => ({...item, parent_id:item.parentId})), property.locationId), property.address].filter(Boolean).join(' - '),
    description: property.description,
    amenities: (property.amenityIds || []).map(id => amenityMap.get(Number(id))).filter(Boolean),
    coverImage: cover?.url || '',
    portalUrl: `${String(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/?p=${encodeURIComponent(property.slug || property.id)}`
  };
  const pdf = renderBrochurePdf(payload);
  await audit(jwt, 'Brochure Generated', property.referenceCode || `#${property.id}`);
  return ok({base64:pdf.toString('base64'),filename:`${property.referenceCode || 'bat-dong-san'}.pdf`});
}
async function insertRow(table,body,jwt) {
  const payload=clean(body);
  try {
    const rows=await request(`/rest/v1/${table}`,{method:'POST',jwt,body:payload,headers:{Prefer:'return=representation'}});
    return Array.isArray(rows)?rows[0]:null;
  } catch (error) {
    // Các bảng được nhập từ hệ thống cũ có ID tường minh; identity sequence trên
    // Supabase có thể thấp hơn ID hiện có. Cấp ID an toàn từ dữ liệu thực tế để
    // mọi phân hệ tạo mới tiếp tục hoạt động cho đến khi sequence tự bắt kịp.
    if (!new RegExp(`${table}_pkey|duplicate key`, 'i').test(String(error.message||''))) throw error;
    for (let attempt=0;attempt<3;attempt++) {
      const latest=await adminSelect(table,'id','&order=id.desc&limit=1');
      const explicitId=Number(latest[0]?.id||0)+1;
      try {
        const rows=await request(`/rest/v1/${table}`,{method:'POST',jwt,body:{...payload,id:explicitId},headers:{Prefer:'return=representation'}});
        return Array.isArray(rows)?rows[0]:null;
      } catch (retryError) {
        if (attempt===2 || !/duplicate key/i.test(String(retryError.message||''))) throw retryError;
      }
    }
  }
}

async function syncPropertyRelations(propertyId,data,jwt) {
  const p=await currentProfile(jwt),id=Number(propertyId);
  if(has(data,'amenityIds')){
    await request(`/rest/v1/property_amenities?property_id=eq.${id}`,{method:'DELETE',jwt});
    const ids=[...new Set((data.amenityIds||[]).map(Number).filter(Boolean))];
    if(ids.length)await request('/rest/v1/property_amenities',{method:'POST',jwt,body:ids.map(amenityId=>({property_id:id,amenity_id:amenityId}))});
  }
  if(has(data,'images')){
    await request(`/rest/v1/property_images?property_id=eq.${id}`,{method:'DELETE',jwt});
    const normalized=(data.images||[]).slice(0,15).sort((a,b)=>Number(Boolean(b.isPrimary))-Number(Boolean(a.isPrimary))||Number(a.sortOrder||0)-Number(b.sortOrder||0));
    if(normalized.length)await request('/rest/v1/property_images',{method:'POST',jwt,body:normalized.map((image,index)=>({property_id:id,storage_path:String(image.url||''),sort_order:index,created_by:p.id}))});
  }
}
async function patchRow(table,id,body,jwt) {
  const rows = await request(`/rest/v1/${table}?id=eq.${Number(id)}`,{method:'PATCH',jwt,body:clean(body),headers:{Prefer:'return=representation'}});
  return Array.isArray(rows)?rows[0]:null;
}
async function softDelete(table,id,jwt,label) {
  const p=await currentProfile(jwt), body={deleted_at:new Date().toISOString(),deleted_by:p.id,updated_at:new Date().toISOString()};
  if (!['locations','amenities'].includes(table)) body.updated_by=p.id;
  await patchRow(table,id,body,jwt);
  await audit(jwt,`${label} Deleted`,`#${id}`); return ok({message:'Đã chuyển dữ liệu vào thùng rác'});
}

async function propertyBody(data,jwt,isNew=false) {
  const p=await currentProfile(jwt), assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined, stamp=Date.now();
  return clean({reference_code:data.referenceCode||(isNew?`RS-WEB-${stamp}`:undefined),title:data.title,slug:data.slug||(isNew?`${slugify(data.title)}-${stamp}`:undefined),description:data.description,property_type:data.propertyType,listing_type:data.listingType,status:data.status,price_vnd:data.price===undefined?undefined:Number(data.price),rent_frequency:nullableText(data.rentFrequency),area_size:nullableNumber(data.areaSize),area_unit:data.areaUnit,bedrooms:nullableNumber(data.bedrooms),bathrooms:nullableNumber(data.bathrooms),location_id:nullableNumber(data.locationId),address:data.address,latitude:nullableNumber(data.latitude),longitude:nullableNumber(data.longitude),owner_id:nullableNumber(data.ownerId),owner_name_snapshot:data.ownerName,owner_phone_snapshot:data.ownerPhone,assigned_agent_id:assigned,is_featured:data.isFeatured===undefined?undefined:Boolean(Number(data.isFeatured)||data.isFeatured===true),views_count:data.viewsCount===undefined?undefined:Number(data.viewsCount||0),published_at:data.status==='Draft'?null:(data.publishedAt||new Date().toISOString()),created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});
}
async function addProperty(args,jwt){const data=args[0]||{},row=await insertRow('properties',await propertyBody(data,jwt,true),jwt);await syncPropertyRelations(row.id,data,jwt);await audit(jwt,'Property Added',`#${row.id}`);return ok({id:row.id,message:'Đã thêm bất động sản'});}
async function updateProperty(args,jwt){const d=args[0]||{};await patchRow('properties',d.id,await propertyBody(d,jwt,false),jwt);await syncPropertyRelations(d.id,d,jwt);await audit(jwt,'Property Updated',`#${d.id}`);return ok({message:'Đã cập nhật bất động sản'});}
async function deleteProperty(args,jwt){return softDelete('properties',args[0],jwt,'Property');}

let imageBucketReady;
async function ensureImageBucket(){
  if(imageBucketReady)return imageBucketReady;
  imageBucketReady=(async()=>{const headers={apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`};const check=await fetch(`${SUPABASE_URL}/storage/v1/bucket/${IMAGE_BUCKET}`,{headers});if(check.ok)return true;const checkText=await check.text();let missing=check.status===404;try{const payload=JSON.parse(checkText);missing=missing||payload?.statusCode==='404'||payload?.code==='NoSuchBucket';}catch{}if(!missing)throw new Error(`Không thể kiểm tra kho ảnh (${check.status})`);const create=await fetch(`${SUPABASE_URL}/storage/v1/bucket`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:IMAGE_BUCKET,name:IMAGE_BUCKET,public:true,file_size_limit:5242880,allowed_mime_types:['image/jpeg','image/png','image/webp','image/gif']})});if(!create.ok){const body=await create.text();throw new Error(`Không thể tạo kho ảnh: ${body}`);}return true;})();
  return imageBucketReady;
}
async function uploadPropertyImage(args,jwt){
  const [dataUrl,filename]=args,p=await currentProfile(jwt),perms=await permissionsFor(p.role_key,jwt);
  if(!perms.properties?.a&&!perms.properties?.e)return fail('Bạn không có quyền tải ảnh bất động sản');
  const match=String(dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i);
  if(!match)return fail('Chỉ hỗ trợ ảnh JPG, PNG, WEBP hoặc GIF');
  const bytes=Buffer.from(match[2].replace(/\s/g,''),'base64');
  if(!bytes.length||bytes.length>5*1024*1024)return fail('Ảnh phải có dung lượng từ 1 byte đến 5 MB');
  await ensureImageBucket();
  const ext={jpeg:'jpg',png:'png',webp:'webp',gif:'gif'}[match[1].split('/')[1].toLowerCase()]||'jpg';
  const base=String(filename||'image').replace(/\.[^.]+$/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,80)||'image';
  const storagePath=`${p.id}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${base}.${ext}`;
  const encoded=storagePath.split('/').map(enc).join('/');
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${encoded}`,{method:'POST',headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':match[1],'x-upsert':'false'},body:bytes});
  if(!response.ok)throw new Error(`Tải ảnh thất bại: ${await response.text()}`);
  return ok({url:`${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${encoded}`,path:storagePath});
}

async function leadBody(data,jwt,isNew=false){const p=await currentProfile(jwt),assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined;return clean({full_name:data.fullName,phone:data.phone,email:nullableText(data.email),source:data.source,interest_type:data.interestType,property_id:nullableNumber(data.propertyId),preferred_location_id:nullableNumber(data.preferredLocationId),budget_min_vnd:nullableNumber(data.budgetMin),budget_max_vnd:nullableNumber(data.budgetMax),message:data.message,status:data.status||(isNew?'New':undefined),lost_reason:nullableText(data.lostReason),assigned_agent_id:assigned,created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addLead(args,jwt){const row=await insertRow('leads',await leadBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Lead Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm khách hàng'});}
async function updateLead(args,jwt){const d=args[0]||{};await patchRow('leads',d.id,await leadBody(d,jwt,false),jwt);await audit(jwt,'Lead Updated',`#${d.id}`);return ok({message:'Đã cập nhật khách hàng'});}
async function deleteLead(args,jwt){return softDelete('leads',args[0],jwt,'Lead');}
async function assignLead(args,jwt){const [id,username]=args;const p=await currentProfile(jwt),assigned=await profileId(username,jwt,p.id);await patchRow('leads',id,{assigned_agent_id:assigned,updated_at:new Date().toISOString(),updated_by:p.id},jwt);await audit(jwt,'Lead Assigned',`#${id} → ${username}`);return ok({message:'Đã phân công khách hàng'});}

async function followUpBody(data,jwt,isNew=false){const p=await currentProfile(jwt),assigned=(isNew||has(data,'assignedAgent'))?await profileId(data.assignedAgent,jwt,p.id):undefined,status=data.status||(isNew?'Pending':undefined);return clean({lead_id:data.leadId===undefined?undefined:Number(data.leadId),assigned_agent_id:assigned,type:data.type||(isNew?'Call':undefined),notes:data.notes,due_at:nullableText(data.dueAt),status,completed_at:status==='Completed'?(data.completedAt||new Date().toISOString()):(has(data,'status')?null:undefined),created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addFollowUp(args,jwt){const row=await insertRow('follow_ups',await followUpBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Follow-up Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm lịch chăm sóc'});}
async function updateFollowUp(args,jwt){const d=args[0]||{};await patchRow('follow_ups',d.id,await followUpBody(d,jwt,false),jwt);await audit(jwt,'Follow-up Updated',`#${d.id}`);return ok({message:'Đã cập nhật lịch chăm sóc'});}
async function deleteFollowUp(args,jwt){return softDelete('follow_ups',args[0],jwt,'Follow-up');}

async function appointmentBody(data,jwt,isNew=false){const p=await currentProfile(jwt),agent=(isNew||has(data,'agent'))?await profileId(data.agent,jwt,p.id):undefined;return clean({lead_id:data.leadId===undefined?undefined:Number(data.leadId),property_id:data.propertyId===undefined?undefined:Number(data.propertyId),agent_id:agent,scheduled_at:data.scheduledAt,duration_minutes:data.durationMinutes===undefined?undefined:Number(data.durationMinutes),status:data.status||(isNew?'Scheduled':undefined),notes:data.notes,cancellation_reason:nullableText(data.cancellationReason),interest_level:nullableText(data.interestLevel),feedback:data.feedback,created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addAppointment(args,jwt){const row=await insertRow('appointments',await appointmentBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Appointment Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm lịch hẹn'});}
async function updateAppointment(args,jwt){const d=args[0]||{};await patchRow('appointments',d.id,await appointmentBody(d,jwt,false),jwt);await audit(jwt,'Appointment Updated',`#${d.id}`);return ok({message:'Đã cập nhật lịch hẹn'});}
async function deleteAppointment(args,jwt){return softDelete('appointments',args[0],jwt,'Appointment');}

async function dealBody(data,jwt,isNew=false){const p=await currentProfile(jwt),agent=(isNew||has(data,'agent'))?await profileId(data.agent,jwt,p.id):undefined,status=data.status||(isNew?'Token':undefined);return clean({deal_type:data.dealType,property_id:data.propertyId===undefined?undefined:Number(data.propertyId),lead_id:nullableNumber(data.leadId),buyer_name:data.buyerName,buyer_phone:data.buyerPhone,agent_id:agent,deal_amount_vnd:data.dealAmount===undefined?undefined:Number(data.dealAmount),commission_pct:data.commissionPct===undefined?undefined:Number(data.commissionPct),agent_share_pct:data.agentSharePct===undefined?undefined:Number(data.agentSharePct),agent_paid_at:nullableText(data.agentPaidAt),token_amount_vnd:data.tokenAmount===undefined?undefined:Number(data.tokenAmount||0),status,closed_at:status==='Completed'?(data.closedAt||new Date().toISOString()):nullableText(data.closedAt),cancellation_reason:nullableText(data.cancellationReason),notes:data.notes,created_by:isNew?p.id:undefined,updated_at:new Date().toISOString(),updated_by:p.id});}
async function addDeal(args,jwt){const row=await insertRow('deals',await dealBody(args[0]||{},jwt,true),jwt);await audit(jwt,'Deal Added',row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm giao dịch'});}
async function updateDeal(args,jwt){const d=args[0]||{};await patchRow('deals',d.id,await dealBody(d,jwt,false),jwt);await audit(jwt,'Deal Updated',`#${d.id}`);return ok({message:'Đã cập nhật giao dịch'});}
async function deleteDeal(args,jwt){return softDelete('deals',args[0],jwt,'Deal');}
async function addDealPayment(args,jwt){const [dealId,data]=args;await request('/rest/v1/rpc/record_deal_payment',{method:'POST',jwt,body:{target_deal_id:Number(dealId),payment_amount_vnd:Number(data.amount),payment_method:data.method||'Cash',payment_reference:data.reference||'',payment_notes:data.notes||'',payment_time:data.date||data.paidAt||new Date().toISOString()}});await audit(jwt,'Deal Payment Added',`#${dealId}`);return ok({message:'Đã ghi nhận thanh toán'});}
async function markAgentPaid(args,jwt){const id=args[0],p=await currentProfile(jwt);await patchRow('deals',id,{agent_paid_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:p.id},jwt);await audit(jwt,'Agent Commission Paid',`#${id}`);return ok({message:'Đã ghi nhận thanh toán hoa hồng'});}

const simpleBody={owners:d=>({name:d.name,phone:d.phone,email:nullableText(d.email),identity_number:nullableText(d.cnic||d.identityNumber),address:d.address,notes:d.notes}),locations:d=>({name:d.name,level:d.level,parent_id:nullableNumber(d.parentId),slug:d.slug||slugify(d.name)}),amenities:d=>({name:d.name,icon:d.icon})};
async function simpleAdd(table,label,args,jwt){const p=await currentProfile(jwt),row=await insertRow(table,{...simpleBody[table](args[0]||{}),created_by:table==='owners'?p.id:undefined},jwt);await audit(jwt,`${label} Added`,row?`#${row.id}`:'');return ok({id:row?.id,message:'Đã thêm dữ liệu'});}
async function simpleUpdate(table,label,args,jwt){const p=await currentProfile(jwt),d=args[0]||{};await patchRow(table,d.id,{...simpleBody[table](d),updated_at:new Date().toISOString(),updated_by:table==='owners'?p.id:undefined},jwt);await audit(jwt,`${label} Updated`,`#${d.id}`);return ok({message:'Đã cập nhật dữ liệu'});}
const addOwner=(a,j)=>simpleAdd('owners','Owner',a,j),updateOwner=(a,j)=>simpleUpdate('owners','Owner',a,j),deleteOwner=(a,j)=>softDelete('owners',a[0],j,'Owner');
const addLocation=(a,j)=>simpleAdd('locations','Location',a,j),updateLocation=(a,j)=>simpleUpdate('locations','Location',a,j),deleteLocation=(a,j)=>softDelete('locations',a[0],j,'Location');
const addAmenity=(a,j)=>simpleAdd('amenities','Amenity',a,j),updateAmenity=(a,j)=>simpleUpdate('amenities','Amenity',a,j),deleteAmenity=(a,j)=>softDelete('amenities',a[0],j,'Amenity');

async function getDashboardStats(jwt) {
  const profile = await currentProfile(jwt);
  const [propertiesResult, leadsResult, followUpsResult, appointmentsResult, dealsResult, tenanciesResult, usersResult, activeAgentRows] = await Promise.all([
    getProperties(jwt), getLeads(jwt), getFollowUps(jwt), getAppointments(jwt), getDeals(jwt), getTenancies(jwt), getAllUsers(jwt),
    adminSelect('profiles','id','&status=eq.Active&role_key=eq.Agent')
  ]);
  const properties = propertiesResult.data, leads = leadsResult.data, followUps = followUpsResult.data;
  const appointments = appointmentsResult.data, deals = dealsResult.data, tenancies = tenanciesResult.data;
  const users = usersResult.data || [], now = new Date();
  const vnDateKey = (value) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const today = vnDateKey(now), month = today.slice(0,7);
  const countBy = (items, keys) => Object.fromEntries(keys.map(key => [key,items.filter(item => item.status === key).length]));
  const completed = deals.filter(item => item.status === 'Completed' && String(item.closedAt || '').slice(0,7) === month);
  const seriesIndex = new Map(), leadsSeries = [];
  const todayDate = new Date(`${today}T00:00:00`);
  for (let offset = 89; offset >= 0; offset--) {
    const date = new Date(todayDate); date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0,10); seriesIndex.set(key,leadsSeries.length); leadsSeries.push({d:key,n:0});
  }
  leads.forEach(lead => { const index = seriesIndex.get(String(lead.created || '').slice(0,10)); if (index !== undefined) leadsSeries[index].n++; });
  const funnelOrder = ['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won'];
  const activeUsers = users.filter(user => user.Status === 'Active');
  const agency = profile.role_key === 'Admin' || profile.role_key === 'Manager';
  return ok({data:{
    scope:agency?'agency':'own', inventory:countBy(properties,['Draft','Available','Reserved','Sold','Rented','Withdrawn']),
    funnel:countBy(leads,['New','Contacted','Qualified','Viewing Scheduled','Negotiating','Won','Lost']),
    activeListings:properties.filter(item=>['Available','Reserved'].includes(item.status)).length,
    featured:properties.filter(item=>item.isFeatured&&item.status==='Available').length,
    totalViews:properties.reduce((sum,item)=>sum+Number(item.viewsCount||0),0),
    openLeads:leads.filter(item=>!['Won','Lost'].includes(item.status)).length,
    wonLeads:leads.filter(item=>item.status==='Won').length,totalLeads:leads.length,
    leadsMonth:leads.filter(item=>String(item.created||'').slice(0,7)===month).length,
    conversionRate:leads.length?Math.round(leads.filter(item=>item.status==='Won').length/leads.length*1000)/10:0,
    overdueFollowUps:followUps.filter(item=>item.status==='Pending'&&item.dueAt&&new Date(item.dueAt)<now).length,
    todayAppointments:appointments.filter(item=>['Scheduled','Confirmed'].includes(item.status)&&item.scheduledAt&&vnDateKey(item.scheduledAt)===today).length,
    recentLeads:leads.slice(0,6),recentProperties:properties.slice(0,6),
    upcomingViewings:appointments.filter(item=>['Scheduled','Confirmed'].includes(item.status)&&item.scheduledAt&&new Date(item.scheduledAt)>=now)
      .sort((a,b)=>new Date(a.scheduledAt)-new Date(b.scheduledAt)).slice(0,6).map(item=>{
        const property=properties.find(p=>String(p.id)===String(item.propertyId));
        const image=property&&property.images&&property.images.length?(property.images.find(x=>x.isPrimary)||property.images[0]).url:'';
        return {id:item.id,when:item.scheduledAt,status:item.status,title:property?.title||item.propertyTitle||`Bất động sản #${item.propertyId}`,
          address:property?.address||property?.locationPath||'',image,lead:item.leadName||'',agent:item.agent||''};
      }),
    leadsSeries,funnelSteps:funnelOrder.map((stage,index)=>({stage,count:index===0?leads.length:leads.filter(lead=>funnelOrder.indexOf(lead.status)>=index).length})),
    dealsMonth:completed.length,dealsMonthValue:completed.reduce((sum,item)=>sum+Number(item.dealAmount||0),0),
    commissionMonth:completed.reduce((sum,item)=>sum+Number(item.commissionAmt||0),0),
    collectedMonth:deals.reduce((sum,item)=>sum+(item.payments||[]).filter(payment=>String(payment.date||'').slice(0,7)===month).reduce((part,payment)=>part+Number(payment.amount||0),0),0),
    payable:deals.filter(item=>item.status==='Completed'&&!item.agentPaidAt).reduce((sum,item)=>sum+Number(item.agentShareAmt||0),0),
    activeAgents:activeAgentRows.length,myTarget:Number(profile.monthly_target_vnd||0),prev:{},
    unassignedLeads:agency?leads.filter(item=>!item.assignedAgent&&!['Won','Lost'].includes(item.status)).length:0,
    activeTenancies:tenancies.filter(item=>item.status==='Active').length,
    rentArrears:tenancies.filter(item=>item.status==='Active').reduce((sum,item)=>sum+Math.max(0,Number(item.arrears||0)),0),
    balanceDue:deals.filter(item=>['Token','Agreement'].includes(item.status)).reduce((sum,item)=>sum+Math.max(0,Number(item.balance||0)),0),
    leaderboard:agency?activeUsers.map(user=>({agent:user.Username,listings:properties.filter(item=>item.assignedAgent===user.Username&&['Available','Reserved'].includes(item.status)).length,openLeads:leads.filter(item=>item.assignedAgent===user.Username&&!['Won','Lost'].includes(item.status)).length,won:leads.filter(item=>item.assignedAgent===user.Username&&item.status==='Won').length,overdue:followUps.filter(item=>item.assignedAgent===user.Username&&item.status==='Pending'&&item.dueAt&&new Date(item.dueAt)<now).length,closed:completed.filter(item=>item.agent===user.Username).length,target:Number(user.MonthlyTarget||0)})):[]
  }});
}

async function getNotifications(jwt) {
  const profile = await currentProfile(jwt);
  const agency = profile.role_key === 'Admin' || profile.role_key === 'Manager';
  const [leadsResult,followUpsResult,appointmentsResult,dealsResult,tenanciesResult] = await Promise.all([
    getLeads(jwt),getFollowUps(jwt),getAppointments(jwt),getDeals(jwt),getTenancies(jwt)
  ]);
  const leads=leadsResult.data||[],followUps=followUpsResult.data||[],appointments=appointmentsResult.data||[];
  const deals=dealsResult.data||[],tenancies=tenanciesResult.data||[],now=new Date();
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
  const todayStart=new Date(`${today}T00:00:00+07:00`),items=[];
  const add=(count,icon,text,page)=>{if(count>0)items.push({icon,text:`${count} ${text}`,page,count});};

  if(agency)add(leads.filter(x=>!x.assignedAgent&&!['Won','Lost'].includes(x.status)).length,'fa-user-plus','khách hàng chưa được phân công','leads');
  add(followUps.filter(x=>x.status==='Pending'&&x.dueAt&&new Date(x.dueAt)<now).length,'fa-triangle-exclamation','lịch chăm sóc đã quá hạn','followups');
  add(appointments.filter(x=>['Scheduled','Confirmed'].includes(x.status)&&String(x.scheduledAt||'').slice(0,10)===today).length,'fa-calendar-check','lịch xem trong hôm nay','appointments');
  add(deals.filter(x=>['Token','Agreement'].includes(x.status)).length,'fa-handshake','giao dịch đang xử lý','deals');
  if(agency)add(deals.filter(x=>x.status==='Completed'&&!x.agentPaidAt).length,'fa-money-bill-wave','khoản hoa hồng chưa thanh toán','deals');
  const activeTenancies=tenancies.filter(x=>x.status==='Active');
  add(activeTenancies.filter(x=>Number(x.arrears||0)>0).length,'fa-house-circle-exclamation','hợp đồng thuê đang có công nợ','tenancies');
  add(activeTenancies.filter(x=>{if(!x.endDate)return false;const end=new Date(`${String(x.endDate).slice(0,10)}T00:00:00+07:00`),days=(end-todayStart)/864e5;return days>=0&&days<=30;}).length,'fa-file-signature','hợp đồng thuê sẽ hết hạn trong 30 ngày','tenancies');
  return ok({items});
}

async function run(method,args=[],authorization=''){
  if(!enabled) throw new Error('Supabase chưa được cấu hình trên máy chủ');
  if(method==='authenticateUser') return authenticateUser(args);
  if(method==='refreshAuthSession') return refreshAuthSession(args);
  if(method==='getPublicPortal') return getPublicPortal();
  if(method==='publicViewProperty') return publicViewProperty(args);
  if(method==='publicSubmitEnquiry') return publicSubmitEnquiry(args);
  const jwt=String(authorization||'').replace(/^Bearer\s+/i,'');
  if(!jwt) return fail('Phiên đăng nhập Supabase không hợp lệ');
  if(method==='brochurePdf') return brochurePdf(args,jwt);
  const readHandlers={
    getDashboardStats,getNotifications,getProperties,getLeads,getFollowUps,getAppointments,getDeals,getTenancies,getOwners,getLocations,getAmenities,getAllUsers,getLogs,getMyPermissions,getLookups,getAppConfig,getUserSettings,getRbacMatrix
  };
  const mutationHandlers={
    updateUserSettings,toggleRbac,setAppConfig,
    addProperty,updateProperty,deleteProperty,uploadPropertyImage,addLead,updateLead,deleteLead,assignLead,
    addFollowUp,updateFollowUp,deleteFollowUp,addAppointment,updateAppointment,deleteAppointment,
    addDeal,updateDeal,deleteDeal,addDealPayment,markAgentPaid,
    addOwner,updateOwner,deleteOwner,addLocation,updateLocation,deleteLocation,addAmenity,updateAmenity,deleteAmenity
  };
  if(readHandlers[method]) return readHandlers[method](jwt);
  if(mutationHandlers[method]) return mutationHandlers[method](args,jwt);
  if(method==='getDefaultTheme') return ok({id:'',vars:''});
  if(method==='getAiConfig') return ok({configured:false});
  if(method==='getTrash') return ok({data:[]});
  return fail(`Phân hệ ${method} đang được chuyển sang Supabase`);
}

module.exports={enabled,run};
