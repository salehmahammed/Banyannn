import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safety check for browser capabilities
const checkCapabilities = () => {
  const issues = [];
  if (!window.indexedDB) issues.push("بما أن متصفحك لا يدعم IndexedDB، فلن يتمكن النظام من حفظ البيانات.");
  if (!window.localStorage) issues.push("التخزين المحلي (LocalStorage) غير متاح.");
  return issues;
};

const rootElement = document.getElementById('root');

if (rootElement) {
  // Global catch-all for debugging in restricted environments
  window.onerror = (message) => {
    console.error("Global Error:", message);
    if (!rootElement.innerHTML || rootElement.innerHTML.includes('loading')) {
       rootElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: sans-serif; direction: rtl;">
          <h2 style="color: #e11d48;">حدث خطأ في تحميل البرنامج</h2>
          <p>قد يكون السبب ضعف الاتصال أو متصفح قديم.</p>
          <p style="font-size: 10px; color: #666;">${message}</p>
          <button onclick="window.location.reload()" style="background: #1A1A1A; color: white; padding: 10px 20px; border: none; cursor: pointer;">إعادة المحاولة</button>
        </div>
      `;
    }
  };

  const issues = checkCapabilities();
  if (issues.length > 0) {
    rootElement.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; font-family: sans-serif; direction: rtl; background: #F9F7F2; min-height: 100vh;">
        <div style="max-width: 400px; margin: 0 auto; border: 2px solid #1A1A1A; background: white; padding: 30px; box-shadow: 20px 20px 0px rgba(0,0,0,0.05);">
          <h2 style="color: #e11d48; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em;">تنبيه: المتصفح غير مدعوم</h2>
          <div style="text-align: right; margin: 20px 0; font-size: 14px; line-height: 1.6;">
            ${issues.map(i => `<p style="margin-bottom: 10px;">• ${i}</p>`).join('')}
          </div>
          <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; text-align: right; font-size: 12px; color: #92400e;">
            <strong>لمستخدمي السودان:</strong> إذا كنت تواجه صعوبة في الدخول، يرجى استخدام متصفح Google Chrome وتأكد من استخدام <strong>رابط المشاركة العام</strong> وليس رابط التطوير.
          </div>
          <button onclick="window.location.reload()" style="margin-top: 20px; width: 100%; background: #1A1A1A; color: white; padding: 15px; border: none; font-weight: 900; cursor: pointer; text-transform: uppercase;">تحديث الصفحة</button>
        </div>
      </div>
    `;
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}
