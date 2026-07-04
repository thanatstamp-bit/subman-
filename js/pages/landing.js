// Marketing landing page (shown when logged out)
import { formatMoney } from '../format.js';

const FEATURES = [
  {
    icon: 'layers',
    title: 'All-in-One Dashboard',
    subtitle: 'รวมทุกยอดจ่ายในที่เดียว',
    desc: 'เชื่อมต่อบัญชีธนาคารหรือเพิ่มรายการด้วยตนเอง เพื่อดูว่าเงินของคุณหายไปไหนในแต่ละเดือน',
  },
  {
    icon: 'bell',
    title: 'Smart Billing Alerts',
    subtitle: 'แจ้งเตือนก่อนหักเงิน',
    desc: 'ไม่ต้องตกใจกับยอดหักเงินอีกต่อไป รับการแจ้งเตือน 3 วันก่อนครบรอบบิลสมาชิกใดๆ',
  },
  {
    icon: 'bar-chart-2',
    title: 'Spending Reports',
    subtitle: 'สรุปยอดใช้จ่ายรายเดือน',
    desc: 'แจกแจงรายละเอียดตามหมวดหมู่ แนวโน้ม และคำแนะนำเพื่อการประหยัดเงินตามข้อมูลการใช้งานจริง',
  },
];

const INSIGHT_BARS = [
  { label: 'ความบันเทิง', pct: 45, color: 'var(--landing-primary)' },
  { label: 'ซอฟต์แวร์', pct: 30, color: 'var(--landing-chart-purple)' },
  { label: 'การใช้ชีวิต', pct: 25, color: 'var(--landing-chart-blue)' },
];

const PLANS = [
  {
    name: 'Free', price: 0,
    features: ['สูงสุด 5 สมาชิก', 'ติดตามด้วยตนเอง', 'แจ้งเตือนมาตรฐาน', 'สรุปยอดรายเดือน'],
    featured: false,
  },
  {
    name: 'Pro', price: 99,
    features: ['ไม่จำกัดสมาชิก', 'เชื่อมต่อธนาคารอัตโนมัติ', 'แจ้งเตือนล่วงหน้า 3 วัน', 'ไอคอนหมวดหมู่กำหนดเอง', 'ส่งออกรายงาน PDF'],
    featured: true,
    comingSoon: true,
  },
  {
    name: 'Business', price: 299,
    features: ['สำหรับองค์กร', 'แดชบอร์ดทีม', 'ประมวลผลผ่าน AI', 'การจัดการใบแจ้งหนี้', 'รองรับผู้ใช้ไม่จำกัด'],
    featured: false,
    comingSoon: true,
  },
];

const TESTIMONIALS = [
  {
    quote: 'Subman! ช่วยเตือนก่อน Netflix จะหักเงิน ทำให้ฉันประหยัดไปได้หลายพันบาทเลยค่ะ',
    avatar: 'assets/testimonial-som.png',
    name: 'คุณส้ม',
    role: 'Digital Designer',
  },
  {
    quote: 'ไม่เคยรู้เลยว่าเสียเงินไปกับค่าสมาชิกรวมๆ กันเยอะขนาดนี้จนกระทั่งเห็นแดชบอร์ด เปลี่ยนชีวิตมากครับ',
    avatar: 'assets/testimonial-thanachot.png',
    name: 'ธนโชติ',
    role: 'Entrepreneur',
  },
];

function conicGradient() {
  let acc = 0;
  const stops = INSIGHT_BARS.map(b => {
    const from = acc;
    acc += b.pct;
    return `${b.color} ${from}% ${acc}%`;
  });
  return `conic-gradient(${stops.join(', ')})`;
}

export function render(root) {
  root.innerHTML = `
    <div class="landing">
      <header class="landing-nav">
        <div class="landing-nav__brand">
          <img src="assets/logo-full.png" alt="Subman!" />
        </div>
        <nav class="landing-nav__links">
          <a href="#features">ฟีเจอร์</a>
          <a href="#pricing">ราคา</a>
          <a href="#testimonials">บล็อก</a>
          <a href="#footer">ติดต่อเรา</a>
        </nav>
        <div class="landing-nav__actions">
          <a class="landing-btn landing-btn--outline" href="#/login">เข้าสู่ระบบ</a>
          <a class="landing-btn landing-btn--primary" href="#/register">สมัครสมาชิก</a>
        </div>
      </header>

      <section class="landing-hero">
        <div class="landing-hero__copy">
          <h1 class="landing-hero__heading">จัดการทุกการสมัครสมาชิก<br />อย่างง่ายดาย</h1>
          <p class="landing-hero__tagline">ติดตาม Subscription ของคุณได้ง่ายๆ</p>
          <p class="landing-hero__desc">หยุดเสียเงินให้กับบริการที่คุณไม่ได้ใช้ Subman! ช่วยคุณติดตามทุกบาท ทุกสตางค์ แจ้งเตือนก่อนหักเงิน และช่วยวางแผนงบประมาณรายเดือนของคุณ <strong>หยุดจ่ายให้กับสิ่งที่คุณไม่ได้ใช้</strong></p>
        </div>
        <div class="landing-hero__actions">
          <a class="landing-btn landing-btn--primary" href="#/register">เริ่มติดตามเลยตอนนี้</a>
          <a class="landing-btn landing-btn--outline" href="#features">ชมวิดีโอสาธิต</a>
        </div>
        <div class="landing-hero__mockup">
          <img src="assets/hero-mockup.png" alt="ตัวอย่างแดชบอร์ด Subman!" />
        </div>
      </section>

      <section class="landing-section" id="features">
        <div class="landing-section-header">
          <span class="landing-eyebrow">ฟีเจอร์หลัก</span>
          <h2 class="landing-section-title">ทุกสิ่งที่คุณต้องการเพื่อประหยัดเงิน</h2>
          <p class="landing-section-desc">จัดการทุกอย่างตั้งแต่ Netflix ไปจนถึงสมาชิกยิมรายเดือนของคุณได้อย่างง่ายดาย</p>
        </div>
        <div class="landing-features__grid">
          ${FEATURES.map(f => `
            <div class="landing-feature-card">
              <div class="landing-feature-card__icon"><i data-lucide="${f.icon}"></i></div>
              <div>
                <p class="landing-feature-card__title">${f.title}</p>
                <p class="landing-feature-card__subtitle">${f.subtitle}</p>
              </div>
              <p class="landing-feature-card__desc">${f.desc}</p>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="landing-section landing-section--brand landing-insights">
        <div class="landing-insights__col">
          <div class="landing-section-header landing-section-header--left">
            <span class="landing-eyebrow">ข้อมูลเชิงลึก</span>
            <h2 class="landing-section-title">เห็นภาพรวมไลฟ์สไตล์ของคุณ</h2>
            <p class="landing-section-desc">เข้าใจพฤติกรรมการใช้จ่ายที่ชัดเจนด้วยระบบแยกหมวดหมู่อัตโนมัติของเรา</p>
          </div>
          <div class="landing-insights__bars">
            ${INSIGHT_BARS.map(b => `
              <div class="landing-bar-row">
                <div class="landing-bar-row__top">
                  <span class="landing-bar-row__label">${b.label}</span>
                  <span class="landing-bar-row__pct">${b.pct}%</span>
                </div>
                <div class="landing-bar-track">
                  <div class="landing-bar-fill" style="width:${b.pct}%; background:${b.color};"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="landing-insights__figure">
          <div class="landing-donut-card">
            <div class="landing-donut" style="background:${conicGradient()};">
              <div class="landing-donut__hole">
                <span class="landing-donut__value">${formatMoney(84250)}</span>
                <span class="landing-donut__label">ใช้จ่ายเดือนนี้</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="landing-section" id="pricing">
        <div class="landing-section-header">
          <span class="landing-eyebrow">แผนราคา</span>
          <h2 class="landing-section-title">เริ่มต้นฟรี อัปเกรดเมื่อพร้อม</h2>
          <p class="landing-section-desc">ราคาที่โปร่งใสและยุติธรรมสำหรับทั้งบุคคลทั่วไปและครอบครัว</p>
        </div>
        <div class="landing-pricing__grid">
          ${PLANS.map(p => `
            <div class="landing-pricing-card ${p.featured ? 'landing-pricing-card--featured' : ''}">
              <div>
                <p class="landing-pricing-card__plan">${p.name}</p>
                <div class="landing-pricing-card__price">
                  <span class="landing-pricing-card__price-value">${formatMoney(p.price)}</span>
                  <span class="landing-pricing-card__price-period">/เดือน</span>
                </div>
              </div>
              <div class="landing-pricing-card__features">
                ${p.features.map(f => `
                  <div class="landing-pricing-card__feature"><i data-lucide="check"></i><span>${f}</span></div>
                `).join('')}
              </div>
              ${p.comingSoon
                ? `<button type="button" class="landing-btn ${p.featured ? 'landing-btn--inverse' : 'landing-btn--primary'}" disabled>เปิดใช้งานเร็วๆนี้</button>`
                : `<a class="landing-btn ${p.featured ? 'landing-btn--inverse' : 'landing-btn--primary'}" href="#/register">เริ่มต้นใช้งาน</a>`}
            </div>
          `).join('')}
        </div>
      </section>

      <section class="landing-section landing-section--brand" id="testimonials">
        <h2 class="landing-testimonials__heading">ที่รักของนักออมเงินตัวจริง</h2>
        <div class="landing-testimonials__grid">
          ${TESTIMONIALS.map(t => `
            <div class="landing-testimonial">
              <p class="landing-testimonial__quote">"${t.quote}"</p>
              <div class="landing-testimonial__author">
                <img class="landing-testimonial__avatar" src="${t.avatar}" alt="" />
                <div>
                  <p class="landing-testimonial__name">${t.name}</p>
                  <p class="landing-testimonial__role">${t.role}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="landing-final-cta">
        <div>
          <h2 class="landing-final-cta__heading">พร้อมจัดการงบประมาณของคุณแล้วหรือยัง?</h2>
          <p class="landing-final-cta__desc">เข้าร่วมกับผู้ใช้กว่า 50,000 คนที่เริ่มประหยัดเงินกับ Subman!</p>
        </div>
        <div class="landing-final-cta__actions">
          <a class="landing-btn landing-btn--inverse" href="#/register">เริ่มต้นใช้งานฟรี</a>
          <a class="landing-btn landing-btn--primary" href="#pricing">ดูแผนราคา</a>
        </div>
      </section>

      <footer class="landing-footer" id="footer">
        <div class="landing-footer__top">
          <div class="landing-footer__brand">
            <div class="landing-footer__brand-row">
              <img src="assets/logo.png" alt="" />
              <span>Subman!</span>
            </div>
            <p class="landing-footer__brand-desc">เราทำให้การจัดการค่าสมาชิกเป็นเรื่องง่ายสำหรับทุกคน ติดตาม ประหยัด และสนุกกับชีวิตดิจิทัลของคุณ</p>
          </div>
          <div class="landing-footer__col">
            <p class="landing-footer__col-title">ผลิตภัณฑ์</p>
            <div class="landing-footer__links">
              <a href="#">ลิงก์ 1</a><a href="#">ลิงก์ 2</a><a href="#">ลิงก์ 3</a>
            </div>
          </div>
          <div class="landing-footer__col">
            <p class="landing-footer__col-title">บริษัท</p>
            <div class="landing-footer__links">
              <a href="#">ลิงก์ 1</a><a href="#">ลิงก์ 2</a><a href="#">ลิงก์ 3</a>
            </div>
          </div>
          <div class="landing-footer__col">
            <p class="landing-footer__col-title">กฎหมาย</p>
            <div class="landing-footer__links">
              <a href="#">ลิงก์ 1</a><a href="#">ลิงก์ 2</a><a href="#">ลิงก์ 3</a>
            </div>
          </div>
        </div>
        <hr class="landing-footer__divider" />
        <div class="landing-footer__bottom">
          <span class="landing-footer__copyright">© 2026 Subman! Co., Ltd. สงวนลิขสิทธิ์</span>
          <div class="landing-footer__social">
            <a href="#">Twitter</a><a href="#">Facebook</a><a href="#">Instagram</a>
          </div>
        </div>
        <div class="landing-footer__watermark"><span>SUBMAN!</span></div>
      </footer>
    </div>
  `;
}
