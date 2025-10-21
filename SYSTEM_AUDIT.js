#!/usr/bin/env node

/**
 * فحص شامل لنظام MMC-MMS
 * يحلل التكامل بين الفرونت اند والباك اند
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 بدء الفحص الشامل للنظام...\n');

// 1. فحص نظام البن كود
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 1. نظام البن كود (PIN System)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const pinStatusBackend = 'functions/api/v1/pin/status.js';
const pinEngineFrontend = 'src/core/pin-engine.js';
const patientPage = 'src/components/PatientPage.jsx';

console.log('✓ Backend PIN API:', fs.existsSync(pinStatusBackend) ? '✅ موجود' : '❌ مفقود');
console.log('✓ Frontend PIN Engine:', fs.existsSync(pinEngineFrontend) ? '⚠️  موجود (غير مستخدم)' : '✅ محذوف');
console.log('✓ Patient Page:', fs.existsSync(patientPage) ? '✅ موجود' : '❌ مفقود');

// 2. فحص نظام الطابور
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 2. نظام الطابور (Queue System)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const queueAPIs = [
  'functions/api/v1/queue/enter.js',
  'functions/api/v1/queue/status.js',
  'functions/api/v1/queue/done.js',
  'functions/api/v1/queue/call.js'
];

queueAPIs.forEach(api => {
  console.log(`✓ ${path.basename(api)}:`, fs.existsSync(api) ? '✅' : '❌');
});

// 3. فحص نظام المسارات
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 3. نظام المسارات (Path System)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const pathAPI = 'functions/api/v1/path/choose.js';
const dynamicPathways = 'src/lib/dynamic-pathways.js';

console.log('✓ Backend Path API:', fs.existsSync(pathAPI) ? '✅' : '❌');
console.log('✓ Frontend Dynamic Pathways:', fs.existsSync(dynamicPathways) ? '✅' : '❌');

// 4. فحص نظام الإشعارات
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 4. نظام الإشعارات (Notifications)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const sseAPI = 'functions/api/v1/events/stream.js';
const notificationSystem = 'src/components/NotificationSystem.jsx';

console.log('✓ Backend SSE API:', fs.existsSync(sseAPI) ? '✅' : '❌');
console.log('✓ Frontend Notification System:', fs.existsSync(notificationSystem) ? '✅' : '❌');

// 5. فحص API Client
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📌 5. API Integration');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const apiFiles = [
  'src/lib/api.js',
  'src/lib/enhanced-api.js',
  'src/lib/api-unified.js'
];

apiFiles.forEach(api => {
  console.log(`✓ ${path.basename(api)}:`, fs.existsSync(api) ? '✅' : '❌');
});

// تحليل التكامل
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 تحليل التكامل');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// فحص استخدام API في PatientPage
if (fs.existsSync(patientPage)) {
  const content = fs.readFileSync(patientPage, 'utf8');
  
  const checks = {
    'استيراد API': content.includes('from \'../lib/api\'') || content.includes('from "../lib/api"'),
    'استخدام getPinStatus': content.includes('getPinStatus'),
    'استخدام enterQueue': content.includes('enterQueue'),
    'استخدام queueDone': content.includes('queueDone'),
    'التحقق من البن كود': content.includes('correctPin') || content.includes('clinicPins'),
    'SSE Connection': content.includes('EventSource') || content.includes('events/stream')
  };
  
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
  });
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ الفحص مكتمل');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

