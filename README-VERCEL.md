# المحكمة السرية — GitHub + Vercel

1. ارفع محتويات هذا المجلد إلى GitHub.
2. اربط المستودع بـ Vercel واضغط Deploy.
3. من Vercel → Settings → Environment Variables أضف:
   - `OPENROUTER_KEY` = مفتاح OpenRouter الخاص بك
   - اختياريًا `OPENROUTER_MODEL` = اسم نموذج OpenRouter
4. أعد Deploy بعد إضافة المفتاح.

اللعبة لا تحتاج إلى `npm start` على Vercel. ملف `api/index.js` يعمل كـ Serverless Function.
