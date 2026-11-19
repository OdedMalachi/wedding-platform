import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const tokenMatch = envContent.match(/WHATSAPP_ACCESS_TOKEN=["']?([^"'\r\n]+)["']?/);
const idMatch = envContent.match(/WHATSAPP_PHONE_NUMBER_ID=["']?([^"'\r\n]+)["']?/);
const token = tokenMatch?.[1]?.trim();
const currentId = idMatch?.[1]?.trim();

if (!token) {
  console.error('❌ No WHATSAPP_ACCESS_TOKEN found in .env');
  process.exit(1);
}

async function main() {
  console.log('🔍 Checking your token & ID against Meta Graph API...');

  // 1. Check token permissions via debug_token
  const debugRes = await fetch(
    `https://graph.facebook.com/v21.0/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(token)}`
  );
  const debugJson = await debugRes.json();

  if (!debugRes.ok || debugJson.error) {
    console.error('❌ Invalid Access Token:', debugJson.error?.message || debugJson);
    process.exit(1);
  }

  const scopes = debugJson?.data?.scopes || [];
  console.log('🔑 Token App ID:', debugJson?.data?.app_id);
  console.log('🔑 Token Permissions (Scopes):', scopes.join(', ') || '(none)');

  const granular = debugJson?.data?.granular_scopes || [];
  const candidateWabaIds = new Set();
  if (currentId) candidateWabaIds.add(currentId);
  for (const s of granular) {
    for (const id of s.target_ids || []) {
      candidateWabaIds.add(id);
    }
  }

  for (const wabaId of candidateWabaIds) {
    const phonesRes = await fetch(
      `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const phonesJson = await phonesRes.json();
    if (phonesRes.ok && phonesJson?.data?.length > 0) {
      for (const phone of phonesJson.data) {
        console.log(
          `\n✅ Found WhatsApp Sender Number: ${phone.display_phone_number} (${phone.verified_name})`
        );
        console.log(`🎯 REAL WHATSAPP_PHONE_NUMBER_ID="${phone.id}"`);

        const updatedEnv = envContent.replace(
          /WHATSAPP_PHONE_NUMBER_ID=["']?[^"'\r\n]*["']?/,
          `WHATSAPP_PHONE_NUMBER_ID="${phone.id}"`
        );
        fs.writeFileSync(envPath, updatedEnv, 'utf8');
        console.log('✅ Automatically updated WHATSAPP_PHONE_NUMBER_ID in .env!');
        return;
      }
    }
  }

  if (!scopes.includes('whatsapp_business_messaging')) {
    console.log('\n❌ WHY IT FAILED:');
    console.log(
      'Your token only has permissions: [' +
        scopes.join(', ') +
        '] — it is missing "whatsapp_business_messaging"!'
    );
    console.log('\n👉 HOW TO FIX IT IN 30 SECONDS:');
    console.log(
      '1. Open: https://developers.facebook.com/tools/explorer/?method=GET&path=me%3Ffields%3Did%2Cname&version=v21.0'
    );
    console.log('2. On the right panel under "Permissions" (Add a Permission):');
    console.log('   - Select: whatsapp_business_messaging');
    console.log('   - Select: whatsapp_business_management');
    console.log('3. Click the blue button "Generate Access Token" and approve the popup.');
    console.log('4. Copy that new token into WHATSAPP_ACCESS_TOKEN in .env and run this script again!');
  }
}

main();
