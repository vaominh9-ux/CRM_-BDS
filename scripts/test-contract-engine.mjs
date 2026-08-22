import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const localBackend = require('../local-backend.js');

async function main() {
  console.log('=== KIỂM TRA CONTRACT TEMPLATE ENGINE TRÊN LOCAL BACKEND ===');

  const mockUser = 'admin';
  const tplRes1 = await localBackend.run('getContractTemplates', [], mockUser);
  console.log(`- getContractTemplates: success = ${tplRes1.success}, total templates = ${tplRes1.data?.templates?.length}`);

  const saveRes = await localBackend.run('saveContractTemplate', [
    'rental',
    {
      key: 'rental',
      label: 'HỢP ĐỒNG THUÊ NHÀ CAO CẤP',
      shortLabel: 'HĐ Thuê VIP',
      hint: 'Mẫu hợp đồng tùy biến riêng',
      customTerms: 'Điều khoản đặc biệt: Bàn giao nguyên trạng vào ngày {{NGAY_KET_THUC}}.'
    }
  ], mockUser);
  console.log(`- saveContractTemplate: success = ${saveRes.success}, message = "${saveRes.message}"`);

  const tplRes2 = await localBackend.run('getContractTemplates', [], mockUser);
  const savedTpl = tplRes2.data?.templates?.find(t => t.key === 'rental');
  console.log(`- Mẫu rental sau khi lưu: label = "${savedTpl?.label}", isCustom = ${savedTpl?.isCustom}`);

  const resetRes = await localBackend.run('resetContractTemplates', [], mockUser);
  console.log(`- resetContractTemplates: success = ${resetRes.success}, message = "${resetRes.message}"`);

  const tplRes3 = await localBackend.run('getContractTemplates', [], mockUser);
  const resetTpl = tplRes3.data?.templates?.find(t => t.key === 'rental');
  console.log(`- Mẫu rental sau khi reset: label = "${resetTpl?.label}", isCustom = ${resetTpl?.isCustom}`);

  if (tplRes1.success && saveRes.success && savedTpl?.isCustom === true && resetRes.success && resetTpl?.isCustom === false) {
    console.log('\n🎉 TOÀN BỘ CÁC BÀI KIỂM THỬ ĐỘNG CƠ HỢP ĐỒNG TRÊN LOCAL BACKEND ĐỀU ĐẠT 100%!');
  } else {
    console.error('❌ Kiểm thử không đạt như kỳ vọng');
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
