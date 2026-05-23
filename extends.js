// 1. Tự động bơm (Inject) mã Google AdSense vào thẻ head
const adsenseScript = document.createElement('script');
adsenseScript.async = true;
adsenseScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9578687010789825';
adsenseScript.setAttribute('crossorigin', 'anonymous');
document.head.appendChild(adsenseScript);

// 2. Tự động bơm (Inject) thư viện Google Analytics (gtag.js) vào thẻ head
const gaScript = document.createElement('script');
gaScript.async = true;
gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-XMD1582SBN';
document.head.appendChild(gaScript);

// 3. Khởi tạo cấu hình Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-XMD1582SBN');
