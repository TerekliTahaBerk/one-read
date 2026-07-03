import type { SiteLocale } from "@/lib/site-i18n";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalDoc = {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: LegalSection[];
};

export type LegalDictionary = {
  terms: LegalDoc;
  privacy: LegalDoc;
};

/*
 * INTERNAL NOTE — NOT LEGAL ADVICE.
 * These are launch-ready drafts, not final legal copy. A qualified lawyer
 * (ideally one familiar with both KVKK and GDPR) must review before launch —
 * especially governing law, the operating entity, and the limitation of
 * liability. Resolve the [bracketed] placeholders first. Paragraphs support a
 * small inline markup: **bold** and [text](url) — see LegalContent.tsx.
 */

const en: LegalDictionary = {
  terms: {
    title: "Terms of Service",
    lastUpdated: "July 3, 2026",
    intro: [
      "These terms govern your use of OneRead — one subscription that currently includes OneArticle and OneFilm, with more quiet products joining the same subscription over time. By signing up for or using OneRead, you agree to them. If you don't agree, please don't use OneRead. Please read them alongside our [Privacy Policy](/privacy).",
    ],
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "OneRead is one subscription that bundles the OneRead family of products: **OneArticle**, a curated article brief by email each weekday morning, and **OneFilm**, a short film note each Saturday. We may add further products to the same subscription at no extra cost as the family grows. We aim to deliver each email reliably around its usual time, but timing, frequency, and availability are provided on a best-effort basis and may change. We don't guarantee uninterrupted or error-free delivery.",
        ],
      },
      {
        heading: "Eligibility",
        paragraphs: [
          "You must be able to form a binding agreement to use OneRead, must be at least the minimum age required in your country, and must provide an email address you are authorized to use.",
        ],
      },
      {
        heading: "Account and email responsibility",
        paragraphs: [
          "You're responsible for the email address you sign up with and for keeping access to it secure. Use only an address that belongs to you or that you have permission to use. If you ever lose access to it, you can unsubscribe and sign up again with a new one.",
        ],
      },
      {
        heading: "Subscription, billing, and cancellation",
        paragraphs: [
          "OneRead is offered as a paid monthly subscription, at the price shown on our [pricing page](/pricing) at the time you subscribe. Prices may change for future billing periods, and we'll make any change clear before it applies to you.",
          "Billing is handled securely by our payment processor, **Polar**, and your purchase is also subject to Polar's own terms.",
          "You can cancel at any time using the one-click unsubscribe link in any email, or by managing your subscription through the billing portal linked in your confirmation email. Cancellation stops future emails and future renewals; unless otherwise stated or required by law, it doesn't automatically create a right to a refund for the current period.",
        ],
      },
      {
        heading: "Acceptable use",
        paragraphs: [],
        list: [
          "Don't sign up using an email address that isn't yours.",
          "Don't attempt to disrupt, overload, reverse-engineer, or gain unauthorized access to the service.",
          "Don't scrape, archive, resell, redistribute, or systematically copy the emails we send.",
          "Don't use OneRead for any unlawful purpose.",
        ],
      },
      {
        heading: "Content and intellectual property",
        paragraphs: [
          "Each email in the OneRead family contains **original summary and commentary** — for OneArticle, a summary of and commentary on a source article, together with a link to it; for OneFilm, a short note about a film. We summarize and comment — we don't reproduce source material in full and we don't publish full translations of it. Where we describe a source, such as a news article, it **remains the property of its respective publisher**, and nothing in our emails should be read as OneRead claiming to be that publisher or as an endorsement by them.",
          "Our emails are provided for your **personal, non-commercial use**. The OneRead, OneArticle, and OneFilm names, design, and the summaries and commentary we write remain ours or our licensors'. You may read and share a link to an email, but you may not copy, resell, redistribute, scrape, or archive our content on a systematic basis.",
        ],
      },
      {
        heading: "Source articles and third-party links",
        paragraphs: [
          "Our emails link to articles and other material published by third parties. We don't control those sites and aren't responsible for their availability, accuracy, content, or terms — including any paywalls. Visiting a linked page is subject to that publisher's own terms and privacy practices.",
        ],
      },
      {
        heading: "AI-generated content",
        paragraphs: [
          "Our summaries and notes are produced with the help of automated and AI systems. As a result, they may contain errors, omissions, or simplifications, and may not capture the full context or nuance of the original source or film. Treat each one as a starting point: for anything that matters, read the source article or verify film details independently. Nothing we send is professional advice — legal, financial, medical, or otherwise — and shouldn't be relied on as a substitute for it.",
        ],
      },
      {
        heading: "Disclaimers",
        paragraphs: [
          "OneRead is provided “as is” and “as available.” We work to make our emails accurate and useful, but we make no warranties about the service's availability, accuracy, reliability, or fitness for a particular purpose, to the fullest extent permitted by law.",
        ],
      },
      {
        heading: "Limitation of liability",
        paragraphs: [
          "To the fullest extent permitted by law, OneRead is not liable for any indirect, incidental, special, or consequential damages, or for any loss arising from your reliance on an email we send or from your use of, or inability to use, the service.",
        ],
      },
      {
        heading: "Changes, suspension, or termination",
        paragraphs: [
          "You can stop the service at any time using the one-click unsubscribe link in any email. We may also modify, suspend, or discontinue the service, in whole or in part, at any time, and we may end or limit access where necessary to protect the service or comply with the law.",
        ],
      },
      {
        heading: "Changes to these terms",
        paragraphs: [
          "We may update these terms from time to time. When we do, we'll revise the date above. Continuing to use OneRead after changes take effect means you accept the updated terms.",
        ],
      },
      {
        heading: "Governing law",
        paragraphs: [
          "These terms are governed by the laws of **[Insert governing jurisdiction before launch]**, without regard to conflict-of-law rules. If any provision is found unenforceable, the remaining provisions stay in full effect, and these terms make up the entire agreement between you and OneRead.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Questions about these terms? Email us at [hello@oneread.com](mailto:hello@oneread.com), or reply to any OneRead email.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "July 3, 2026",
    intro: [
      "OneRead is built around a simple idea: a few genuinely useful emails, and nothing more. That restraint extends to your data. We collect only what we need to run your subscription — currently OneArticle and OneFilm — we never sell it, and we don't track you around the web. This policy explains what we collect, why, and the choices you have.",
    ],
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "OneRead is the subscription that sends you OneArticle each weekday morning and OneFilm each Saturday, with more products joining the same subscription over time. The data controller responsible for your information is **[Insert legal entity / data controller before launch]**. You can reach us any time at [hello@oneread.com](mailto:hello@oneread.com).",
        ],
      },
      {
        heading: "Information we collect",
        paragraphs: ["When you sign up and use OneRead, we process:"],
        list: [
          "**Your email address** — so we can send your OneRead emails.",
          "**Your interests** — the topics, genres, and moods you select, used to match each email to you.",
          "**Your language preferences** — your source language and the language you want your emails written in.",
          "**Your subscription status** — whether you're active, which OneRead products you receive, and any plan details if you're on a paid plan.",
          "**Feedback clicks** — if you tell us an email was useful or not, so we can improve what we send.",
          "**Email delivery status** — whether a message was sent, bounced, or unsubscribed, so delivery stays reliable.",
          "**Minimal technical logs** — the limited records needed to operate and secure the service.",
        ],
      },
      {
        heading: "What we don't collect",
        paragraphs: [],
        list: [
          "No advertising trackers.",
          "No selling of your personal data — ever.",
          "No cross-site profiling or following you around the web.",
        ],
      },
      {
        heading: "How we use your information",
        paragraphs: [],
        list: [
          "To select and send your OneRead emails.",
          "To personalize that selection to your interests and languages.",
          "To manage your subscription and handle unsubscribe requests.",
          "To improve the quality and reliability of the service.",
          "To prevent abuse and keep the service secure.",
        ],
      },
      {
        heading: "Legal bases",
        paragraphs: [
          "Where data-protection law requires a legal basis, we rely on your **consent** to send you subscription emails; on our **legitimate interest** in operating, securing, and improving OneRead; and on **compliance with legal obligations** where that applies. We do not use your information for automated decisions that produce legal or similarly significant effects.",
        ],
      },
      {
        heading: "Email delivery providers",
        paragraphs: [
          "We use a third-party email provider (Resend) to deliver your OneRead emails. They process your email and delivery data solely to send messages on our behalf and are not permitted to use it for any other purpose.",
        ],
      },
      {
        heading: "AI providers",
        paragraphs: [
          "We use automated and AI systems to help generate summaries and notes. Where AI providers are involved, the **source content and metadata** we summarize — articles for OneArticle, film details for OneFilm — may be processed by them. We don't send subscriber email addresses to AI providers unless it's necessary, and we aim to share only what's needed to produce an email.",
        ],
      },
      {
        heading: "International transfers",
        paragraphs: [
          "Some of our providers operate infrastructure outside your country, so your data may be processed abroad. Where the law requires it, we rely on appropriate safeguards for those transfers.",
        ],
      },
      {
        heading: "Data retention",
        paragraphs: [
          "While your subscription is active, we keep the information we need to run it. If you unsubscribe, we retain only what's necessary — such as a suppression record so we don't email you again and minimal logs — and we delete your other preference data within a reasonable period.",
        ],
      },
      {
        heading: "Your rights",
        paragraphs: [],
        list: [
          "**Unsubscribe anytime** — every email includes a one-click unsubscribe link, and it takes effect immediately.",
          "**Access, correct, or delete your data** — you can ask us to show, fix, or delete the information we hold about you.",
          "**Object or withdraw consent** — you can ask us to stop processing your information, or withdraw consent, at any time.",
          "**Complain to an authority** — you can lodge a complaint with your local data-protection authority where applicable.",
        ],
      },
      {
        heading: "KVKK / GDPR Notice",
        paragraphs: [
          "For users in Türkiye and the EU/EEA, this policy also serves as our privacy notice (in Türkiye, the *aydınlatma metni*) describing how we process your personal data and the rights available to you. We keep this notice **separate from any explicit consent** we ask for: we don't bundle the notice and a consent statement into a single box, and we don't ask you to consent to processing you don't need in order to receive your OneRead emails. Where consent is the basis for something, you can withdraw it at any time without affecting the service you've already received.",
        ],
      },
      {
        heading: "Security",
        paragraphs: [
          "We use reasonable technical and organizational measures to protect your information against loss, misuse, and unauthorized access. No method of transmission or storage is completely secure, but we work to keep the data we hold safe and to limit it to what we actually need.",
        ],
      },
      {
        heading: "Children's privacy",
        paragraphs: [
          "OneRead is not directed to children under 13 (or the minimum age in your country), and we do not knowingly collect their information. If you believe a child has signed up, contact us and we'll remove the data.",
        ],
      },
      {
        heading: "Changes to this policy",
        paragraphs: [
          "If we make material changes, we will update the date above and, where appropriate, let you know by email.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Questions about your privacy, or want to exercise a right above? Email us at [hello@oneread.com](mailto:hello@oneread.com), or simply reply to any OneRead email.",
        ],
      },
    ],
  },
};

const tr: LegalDictionary = {
  terms: {
    title: "Kullanım Koşulları",
    lastUpdated: "3 Temmuz 2026",
    intro: [
      "Bu koşullar, hâlihazırda OneArticle ve OneFilm'i kapsayan ve aile büyüdükçe aynı abonelik altında yeni sakin ürünlerin katılacağı tek bir abonelik olan OneRead'i kullanımınızı düzenler. OneRead'e kaydolarak veya onu kullanarak bu koşulları kabul etmiş olursunuz. Kabul etmiyorsanız lütfen OneRead'i kullanmayın. Bu koşulları [Gizlilik Politikamız](/privacy) ile birlikte okumanızı öneririz.",
    ],
    sections: [
      {
        heading: "Hizmet",
        paragraphs: [
          "OneRead, OneRead ailesindeki ürünleri tek bir pakette birleştirir: hafta içi her sabah e-posta ile gönderilen özenle seçilmiş bir makale özeti olan **OneArticle** ve her cumartesi gönderilen kısa bir film notu olan **OneFilm**. Aile büyüdükçe aynı aboneliğe ek ücret almadan yeni ürünler ekleyebiliriz. Her e-postayı olağan saatinde güvenilir biçimde ulaştırmayı hedefliyoruz; ancak zamanlama, sıklık ve kullanılabilirlik en iyi çaba ilkesiyle sunulur ve değişebilir. Kesintisiz veya hatasız teslimat garanti etmiyoruz.",
        ],
      },
      {
        heading: "Uygunluk",
        paragraphs: [
          "OneRead'i kullanmak için bağlayıcı bir sözleşme kurabilecek durumda olmanız, ülkenizde aranan asgari yaşta bulunmanız ve kullanmaya yetkili olduğunuz bir e-posta adresi sağlamanız gerekir.",
        ],
      },
      {
        heading: "Hesap ve e-posta sorumluluğu",
        paragraphs: [
          "Kaydolduğunuz e-posta adresinden ve bu adrese erişimin güvenliğini sağlamaktan siz sorumlusunuz. Yalnızca size ait olan veya kullanma izniniz bulunan bir adres kullanın. Adrese erişiminizi kaybederseniz aboneliğinizi iptal edip yeni bir adresle yeniden kaydolabilirsiniz.",
        ],
      },
      {
        heading: "Abonelik, faturalandırma ve iptal",
        paragraphs: [
          "OneRead, kaydolduğunuz sırada [fiyatlandırma sayfamızda](/pricing) belirtilen ücret üzerinden aylık ücretli bir abonelik olarak sunulur. Fiyatlar gelecekteki faturalandırma dönemleri için değişebilir; herhangi bir değişikliği sizi etkilemeden önce açıkça bildiririz.",
          "Ödemeler, ödeme sağlayıcımız **Polar** tarafından güvenli biçimde işlenir ve satın alımınız Polar'ın kendi koşullarına da tabidir.",
          "Aboneliğinizi, herhangi bir e-postadaki tek tıkla abonelikten çıkma bağlantısını kullanarak veya onay e-postanızdaki fatura yönetim bağlantısı üzerinden istediğiniz zaman iptal edebilirsiniz. İptal, gelecekteki e-postaları ve yenilemeleri durdurur; aksi belirtilmedikçe veya yasa gerektirmedikçe, cari dönem için otomatik bir iade hakkı doğurmaz.",
        ],
      },
      {
        heading: "Kabul edilebilir kullanım",
        paragraphs: [],
        list: [
          "Size ait olmayan bir e-posta adresiyle kaydolmayın.",
          "Hizmeti aksatmaya, aşırı yüklemeye, tersine mühendislik yapmaya veya yetkisiz erişim sağlamaya çalışmayın.",
          "Gönderdiğimiz e-postaları kazımayın, arşivlemeyin, yeniden satmayın, dağıtmayın veya sistematik olarak kopyalamayın.",
          "OneRead'i herhangi bir yasa dışı amaçla kullanmayın.",
        ],
      },
      {
        heading: "İçerik ve fikri mülkiyet",
        paragraphs: [
          "OneRead ailesindeki her e-posta **özgün bir özet ve yorum** içerir — OneArticle için kaynak makalenin özeti ve yorumu, kaynağa bir bağlantıyla birlikte; OneFilm için ise bir film hakkında kısa bir not. Yalnızca özetler ve yorumlar sunarız; kaynak materyali tam olarak yeniden üretmeyiz ve tam çevirisini yayımlamayız. Bir haber makalesi gibi bir kaynaktan bahsettiğimizde, bu kaynak **ilgili yayıncısının mülkiyetinde kalır** ve e-postalarımızdaki hiçbir ifade OneRead'in o yayıncı olduğu veya o yayıncı tarafından onaylandığı şeklinde yorumlanamaz.",
          "E-postalarımız **kişisel, ticari olmayan kullanımınız** için sunulur. OneRead, OneArticle ve OneFilm adları, tasarımı ile yazdığımız özet ve yorumlar bize veya lisans verenlerimize aittir. Bir e-postayı okuyabilir ve bağlantısını paylaşabilirsiniz; ancak içeriklerimizi sistematik biçimde kopyalayamaz, yeniden satamaz, dağıtamaz, kazıyamaz veya arşivleyemezsiniz.",
        ],
      },
      {
        heading: "Kaynak makaleler ve üçüncü taraf bağlantıları",
        paragraphs: [
          "E-postalarımız üçüncü taraflarca yayımlanan makale ve diğer içeriklere bağlantı verir. Bu siteleri kontrol etmiyoruz ve erişilebilirlikleri, doğrulukları, içerikleri veya koşulları — ücretli erişim duvarları dâhil — konusunda sorumluluk taşımıyoruz. Bağlantı verilen bir sayfayı ziyaret etmeniz, o yayıncının kendi koşullarına ve gizlilik uygulamalarına tabidir.",
        ],
      },
      {
        heading: "Yapay zekâ ile üretilen içerik",
        paragraphs: [
          "Özetlerimiz ve notlarımız otomatik sistemler ve yapay zekâ yardımıyla üretilir. Bu nedenle hatalar, eksiklikler veya basitleştirmeler içerebilir ve kaynağın veya filmin tüm bağlamını ya da inceliğini yansıtmayabilirler. Her birini bir başlangıç noktası olarak değerlendirin: önemli olan konularda kaynak makaleyi okuyun veya film bilgilerini bağımsız olarak doğrulayın. Gönderdiğimiz hiçbir içerik hukuki, finansal, tıbbi veya başka herhangi bir profesyonel tavsiye niteliği taşımaz ve bunun yerine güvenilmemelidir.",
        ],
      },
      {
        heading: "Sorumluluk reddi",
        paragraphs: [
          "OneRead “olduğu gibi” ve “mevcut olduğu şekliyle” sunulur. E-postalarımızı doğru ve yararlı kılmak için çalışsak da, yasanın izin verdiği azami ölçüde, hizmetin kullanılabilirliği, doğruluğu, güvenilirliği veya belirli bir amaca uygunluğu konusunda hiçbir garanti vermeyiz.",
        ],
      },
      {
        heading: "Sorumluluğun sınırlandırılması",
        paragraphs: [
          "Yasanın izin verdiği azami ölçüde, OneRead; gönderdiğimiz bir e-postaya güvenmenizden veya hizmeti kullanmanızdan ya da kullanamamanızdan kaynaklanan dolaylı, arızi, özel veya sonuç niteliğindeki zararlardan ya da herhangi bir kayıptan sorumlu değildir.",
        ],
      },
      {
        heading: "Değişiklik, askıya alma veya sonlandırma",
        paragraphs: [
          "Herhangi bir e-postadaki tek tıkla abonelikten çıkma bağlantısını kullanarak hizmeti istediğiniz zaman durdurabilirsiniz. Ayrıca hizmeti kısmen veya tamamen istediğimiz zaman değiştirebilir, askıya alabilir veya sonlandırabiliriz; hizmeti korumak veya yasaya uymak amacıyla erişimi sonlandırabilir veya sınırlandırabiliriz.",
        ],
      },
      {
        heading: "Bu koşullardaki değişiklikler",
        paragraphs: [
          "Bu koşulları zaman zaman güncelleyebiliriz. Güncellediğimizde yukarıdaki tarihi güncelleriz. Değişiklikler yürürlüğe girdikten sonra OneRead'i kullanmaya devam etmeniz, güncellenmiş koşulları kabul ettiğiniz anlamına gelir.",
        ],
      },
      {
        heading: "Uygulanacak hukuk",
        paragraphs: [
          "Bu koşullar, kanunlar ihtilafı kurallarına bakılmaksızın **[Lansman öncesi geçerli yargı yetkisi eklenecek]** hukukuna tabidir. Herhangi bir hükmün uygulanamaz bulunması hâlinde, kalan hükümler tam olarak yürürlükte kalır ve bu koşullar sizinle OneRead arasındaki anlaşmanın tamamını oluşturur.",
        ],
      },
      {
        heading: "İletişim",
        paragraphs: [
          "Bu koşullarla ilgili sorularınız mı var? Bize [hello@oneread.com](mailto:hello@oneread.com) adresinden e-posta gönderin veya herhangi bir OneRead e-postasını yanıtlayın.",
        ],
      },
    ],
  },
  privacy: {
    title: "Gizlilik Politikası",
    lastUpdated: "3 Temmuz 2026",
    intro: [
      "OneRead basit bir fikir üzerine kuruludur: gerçekten yararlı birkaç e-posta, fazlası değil. Bu ölçülülük verilerinize de yansır. Aboneliğinizi yürütmek için — şu anda OneArticle ve OneFilm için — gereken en az bilgiyi topluyoruz, bunu asla satmıyoruz ve sizi internette takip etmiyoruz. Bu politika neyi, neden topladığımızı ve sahip olduğunuz seçenekleri açıklar.",
    ],
    sections: [
      {
        heading: "Biz kimiz",
        paragraphs: [
          "OneRead, size hafta içi her sabah OneArticle'ı ve her cumartesi OneFilm'i gönderen, aile büyüdükçe aynı aboneliğe yeni ürünlerin katılacağı abonelik hizmetidir. Bilgilerinizden sorumlu veri sorumlusu **[Lansman öncesi tüzel kişi / veri sorumlusu eklenecek]**'dir. Bize her zaman [hello@oneread.com](mailto:hello@oneread.com) adresinden ulaşabilirsiniz.",
        ],
      },
      {
        heading: "Topladığımız bilgiler",
        paragraphs: ["OneRead'e kaydolduğunuzda ve onu kullandığınızda şunları işleriz:"],
        list: [
          "**E-posta adresiniz** — OneRead e-postalarınızı gönderebilmemiz için.",
          "**İlgi alanlarınız** — her e-postayı size uygun hâle getirmek için seçtiğiniz konular, türler ve ruh hâlleri.",
          "**Dil tercihleriniz** — kaynak diliniz ve e-postalarınızın yazılmasını istediğiniz dil.",
          "**Abonelik durumunuz** — aktif olup olmadığınız, hangi OneRead ürünlerini aldığınız ve ücretli bir plandaysanız plan ayrıntıları.",
          "**Geri bildirim tıklamaları** — bir e-postanın yararlı olup olmadığını bize bildirdiğinizde, gönderdiklerimizi iyileştirebilmemiz için.",
          "**E-posta teslimat durumu** — bir mesajın gönderilip gönderilmediği, geri döndüğü veya abonelikten çıkıldığı, teslimatın güvenilir kalması için.",
          "**Asgari teknik kayıtlar** — hizmeti işletmek ve güvenliğini sağlamak için gereken sınırlı kayıtlar.",
        ],
      },
      {
        heading: "Toplamadığımız bilgiler",
        paragraphs: [],
        list: [
          "Reklam takipçisi yok.",
          "Kişisel verilerinizin satışı — asla yok.",
          "Siteler arası profilleme veya sizi internette takip etme yok.",
        ],
      },
      {
        heading: "Bilgilerinizi nasıl kullanıyoruz",
        paragraphs: [],
        list: [
          "OneRead e-postalarınızı seçmek ve göndermek için.",
          "Bu seçimi ilgi alanlarınıza ve dillerinize göre kişiselleştirmek için.",
          "Aboneliğinizi yönetmek ve abonelikten çıkma taleplerini karşılamak için.",
          "Hizmetin kalitesini ve güvenilirliğini artırmak için.",
          "Kötüye kullanımı önlemek ve hizmeti güvende tutmak için.",
        ],
      },
      {
        heading: "Hukuki dayanaklar",
        paragraphs: [
          "Veri koruma mevzuatının bir hukuki dayanak gerektirdiği durumlarda, abonelik e-postaları göndermek için **rızanıza**; OneRead'i işletmek, güvenliğini sağlamak ve iyileştirmek için **meşru menfaatimize**; ve geçerli olduğu ölçüde **yasal yükümlülüklere uyuma** dayanırız. Bilgilerinizi hukuki veya benzer şekilde önemli etkiler doğuran otomatik kararlar için kullanmıyoruz.",
        ],
      },
      {
        heading: "E-posta gönderim sağlayıcıları",
        paragraphs: [
          "OneRead e-postalarınızı iletmek için üçüncü taraf bir e-posta sağlayıcısı (Resend) kullanıyoruz. Bu sağlayıcı, e-posta ve teslimat verilerinizi yalnızca bizim adımıza mesaj göndermek amacıyla işler ve başka hiçbir amaçla kullanamaz.",
        ],
      },
      {
        heading: "Yapay zekâ sağlayıcıları",
        paragraphs: [
          "Özet ve not oluşturmaya yardımcı olması için otomatik sistemler ve yapay zekâ kullanıyoruz. Yapay zekâ sağlayıcılarının dâhil olduğu durumlarda, özetlediğimiz **kaynak içerik ve meta veriler** — OneArticle için makaleler, OneFilm için film bilgileri — bu sağlayıcılar tarafından işlenebilir. Gerekli olmadıkça abone e-posta adreslerini yapay zekâ sağlayıcılarına göndermeyiz ve yalnızca bir e-posta oluşturmak için gereken bilgiyi paylaşmayı hedefleriz.",
        ],
      },
      {
        heading: "Uluslararası aktarımlar",
        paragraphs: [
          "Bazı sağlayıcılarımız ülkeniz dışında altyapı işletir, bu nedenle verileriniz yurt dışında işlenebilir. Yasanın gerektirdiği durumlarda, bu aktarımlar için uygun güvenceler uygularız.",
        ],
      },
      {
        heading: "Veri saklama",
        paragraphs: [
          "Aboneliğiniz aktif olduğu sürece, yürütülmesi için gereken bilgileri saklarız. Abonelikten çıkarsanız, yalnızca gerekli olanı — örneğin size tekrar e-posta göndermemek için bir baskılama kaydı ve asgari kayıtları — saklarız ve diğer tercih verilerinizi makul bir süre içinde sileriz.",
        ],
      },
      {
        heading: "Haklarınız",
        paragraphs: [],
        list: [
          "**İstediğiniz zaman abonelikten çıkın** — her e-postada tek tıkla abonelikten çıkma bağlantısı bulunur ve hemen etkili olur.",
          "**Verilerinize erişin, düzeltin veya silin** — hakkınızda tuttuğumuz bilgileri göstermemizi, düzeltmemizi veya silmemizi isteyebilirsiniz.",
          "**İtiraz edin veya rızanızı geri çekin** — bilgilerinizin işlenmesini durdurmamızı isteyebilir veya rızanızı istediğiniz zaman geri çekebilirsiniz.",
          "**Bir kuruma şikâyette bulunun** — geçerli olduğu yerlerde yerel veri koruma kurumunuza şikâyette bulunabilirsiniz.",
        ],
      },
      {
        heading: "KVKK / GDPR Bildirimi",
        paragraphs: [
          "Türkiye'deki ve AB/AEA'daki kullanıcılar için bu politika, kişisel verilerinizi nasıl işlediğimizi ve sahip olduğunuz hakları açıklayan gizlilik bildirimimiz (Türkiye'de *aydınlatma metni*) olarak da hizmet eder. Bu bildirimi talep ettiğimiz herhangi bir açık rızadan **ayrı tutarız**: bildirim ile rıza beyanını tek bir kutuda birleştirmeyiz ve OneRead e-postalarınızı almanız için gerekmeyen bir işlemeye rıza göstermenizi istemeyiz. Bir işlemin dayanağı rıza olduğunda, bunu istediğiniz zaman, o ana kadar aldığınız hizmeti etkilemeden geri çekebilirsiniz.",
        ],
      },
      {
        heading: "Güvenlik",
        paragraphs: [
          "Bilgilerinizi kayıp, kötüye kullanım ve yetkisiz erişime karşı korumak için makul teknik ve idari önlemler alıyoruz. Hiçbir iletim veya saklama yöntemi tamamen güvenli değildir; ancak tuttuğumuz verileri güvende tutmak ve yalnızca gerçekten ihtiyaç duyduğumuzla sınırlamak için çalışıyoruz.",
        ],
      },
      {
        heading: "Çocukların gizliliği",
        paragraphs: [
          "OneRead, 13 yaşın altındaki (veya ülkenizdeki asgari yaşın altındaki) çocuklara yönelik değildir ve bilgilerini bilerek toplamayız. Bir çocuğun kaydolduğunu düşünüyorsanız bizimle iletişime geçin, verileri kaldıralım.",
        ],
      },
      {
        heading: "Bu politikadaki değişiklikler",
        paragraphs: [
          "Önemli değişiklikler yaparsak yukarıdaki tarihi güncelleriz ve uygun olduğunda size e-posta ile bildiririz.",
        ],
      },
      {
        heading: "İletişim",
        paragraphs: [
          "Gizliliğinizle ilgili sorularınız mı var veya yukarıdaki haklardan birini mi kullanmak istiyorsunuz? Bize [hello@oneread.com](mailto:hello@oneread.com) adresinden e-posta gönderin veya herhangi bir OneRead e-postasını yanıtlayın.",
        ],
      },
    ],
  },
};

const de: LegalDictionary = {
  terms: {
    title: "Nutzungsbedingungen",
    lastUpdated: "3. Juli 2026",
    intro: [
      "Diese Bedingungen regeln Ihre Nutzung von OneRead — einem Abonnement, das derzeit OneArticle und OneFilm umfasst und dem im Laufe der Zeit weitere ruhige Produkte im selben Abonnement hinzugefügt werden. Mit der Anmeldung bei oder der Nutzung von OneRead stimmen Sie diesen Bedingungen zu. Wenn Sie nicht einverstanden sind, nutzen Sie OneRead bitte nicht. Bitte lesen Sie diese Bedingungen zusammen mit unserer [Datenschutzerklärung](/privacy).",
    ],
    sections: [
      {
        heading: "Der Dienst",
        paragraphs: [
          "OneRead bündelt die Produkte der OneRead-Familie in einem Abonnement: **OneArticle**, ein sorgfältig ausgewähltes Artikelbriefing per E-Mail an jedem Werktagmorgen, und **OneFilm**, eine kurze Filmnotiz an jedem Samstag. Mit wachsender Familie können wir dem selben Abonnement ohne Aufpreis weitere Produkte hinzufügen. Wir sind bestrebt, jede E-Mail zuverlässig zur gewohnten Zeit zuzustellen; Zeitpunkt, Häufigkeit und Verfügbarkeit erfolgen jedoch nach bestem Bemühen und können sich ändern. Eine unterbrechungsfreie oder fehlerfreie Zustellung können wir nicht garantieren.",
        ],
      },
      {
        heading: "Berechtigung",
        paragraphs: [
          "Um OneRead zu nutzen, müssen Sie geschäftsfähig sein, mindestens das in Ihrem Land erforderliche Mindestalter haben und eine E-Mail-Adresse angeben, zu deren Nutzung Sie berechtigt sind.",
        ],
      },
      {
        heading: "Konto- und E-Mail-Verantwortung",
        paragraphs: [
          "Sie sind für die E-Mail-Adresse, mit der Sie sich anmelden, sowie für deren sichere Verwahrung verantwortlich. Verwenden Sie ausschließlich eine Adresse, die Ihnen gehört oder zu deren Nutzung Sie berechtigt sind. Sollten Sie den Zugriff darauf verlieren, können Sie sich abmelden und sich mit einer neuen Adresse erneut anmelden.",
        ],
      },
      {
        heading: "Abonnement, Abrechnung und Kündigung",
        paragraphs: [
          "OneRead wird als kostenpflichtiges Monatsabonnement zu dem Preis angeboten, der zum Zeitpunkt Ihrer Anmeldung auf unserer [Preisseite](/pricing) angegeben ist. Preise können sich für künftige Abrechnungszeiträume ändern; wir weisen auf jede Änderung deutlich hin, bevor sie für Sie wirksam wird.",
          "Die Zahlungsabwicklung erfolgt sicher über unseren Zahlungsdienstleister **Polar**; Ihr Kauf unterliegt zusätzlich dessen eigenen Bedingungen.",
          "Sie können jederzeit über den Ein-Klick-Abmeldelink in jeder E-Mail kündigen oder Ihr Abonnement über das in Ihrer Bestätigungs-E-Mail verlinkte Kundenportal verwalten. Die Kündigung beendet künftige E-Mails und Verlängerungen; sofern nicht anders angegeben oder gesetzlich vorgeschrieben, entsteht dadurch kein automatischer Anspruch auf Erstattung für den laufenden Zeitraum.",
        ],
      },
      {
        heading: "Zulässige Nutzung",
        paragraphs: [],
        list: [
          "Melden Sie sich nicht mit einer E-Mail-Adresse an, die nicht Ihnen gehört.",
          "Versuchen Sie nicht, den Dienst zu stören, zu überlasten, zurückzuentwickeln oder sich unbefugten Zugriff zu verschaffen.",
          "Extrahieren, archivieren, verkaufen, verbreiten oder kopieren Sie unsere E-Mails nicht systematisch.",
          "Nutzen Sie OneRead nicht für rechtswidrige Zwecke.",
        ],
      },
      {
        heading: "Inhalte und geistiges Eigentum",
        paragraphs: [
          "Jede E-Mail der OneRead-Familie enthält eine **eigenständige Zusammenfassung und Einordnung** — bei OneArticle eine Zusammenfassung und Einordnung eines Quellartikels samt Link dorthin, bei OneFilm eine kurze Notiz zu einem Film. Wir fassen zusammen und ordnen ein — wir geben Quellmaterial nicht vollständig wieder und veröffentlichen keine vollständigen Übersetzungen davon. Beschreiben wir eine Quelle, etwa einen Nachrichtenartikel, so **bleibt diese Eigentum des jeweiligen Verlags**; nichts in unseren E-Mails ist so zu verstehen, dass OneRead sich als dieser Verlag ausgibt oder von ihm unterstützt wird.",
          "Unsere E-Mails sind für Ihre **persönliche, nicht kommerzielle Nutzung** bestimmt. Die Namen OneRead, OneArticle und OneFilm, das Design sowie die von uns verfassten Zusammenfassungen und Einordnungen bleiben unser Eigentum oder das unserer Lizenzgeber. Sie dürfen eine E-Mail lesen und einen Link dazu teilen, jedoch unsere Inhalte nicht systematisch kopieren, weiterverkaufen, verbreiten, extrahieren oder archivieren.",
        ],
      },
      {
        heading: "Quellartikel und Links zu Dritten",
        paragraphs: [
          "Unsere E-Mails verlinken auf Artikel und andere Inhalte, die von Dritten veröffentlicht werden. Wir kontrollieren diese Websites nicht und sind nicht verantwortlich für deren Verfügbarkeit, Richtigkeit, Inhalt oder Bedingungen — einschließlich etwaiger Bezahlschranken. Der Besuch einer verlinkten Seite unterliegt den eigenen Bedingungen und Datenschutzpraktiken des jeweiligen Verlags.",
        ],
      },
      {
        heading: "KI-generierte Inhalte",
        paragraphs: [
          "Unsere Zusammenfassungen und Notizen entstehen mithilfe automatisierter und KI-gestützter Systeme. Dadurch können sie Fehler, Auslassungen oder Vereinfachungen enthalten und den vollständigen Kontext oder die Nuancen der Quelle oder des Films unter Umständen nicht wiedergeben. Betrachten Sie jede E-Mail als Ausgangspunkt: Lesen Sie bei allem, worauf es ankommt, den Quellartikel oder prüfen Sie Filmdetails eigenständig. Nichts, was wir senden, stellt eine professionelle Beratung dar — weder rechtlich, finanziell, medizinisch noch anderweitig — und darf nicht als Ersatz dafür verstanden werden.",
        ],
      },
      {
        heading: "Haftungsausschluss",
        paragraphs: [
          "OneRead wird “wie besehen” und “wie verfügbar” bereitgestellt. Wir bemühen uns um genaue und nützliche E-Mails, übernehmen jedoch im gesetzlich zulässigen Umfang keine Gewähr für die Verfügbarkeit, Richtigkeit, Zuverlässigkeit oder Eignung des Dienstes für einen bestimmten Zweck.",
        ],
      },
      {
        heading: "Haftungsbeschränkung",
        paragraphs: [
          "Im gesetzlich zulässigen Umfang haftet OneRead nicht für indirekte, zufällige, besondere oder Folgeschäden oder für Verluste, die sich daraus ergeben, dass Sie sich auf eine von uns gesendete E-Mail verlassen oder den Dienst nutzen bzw. nicht nutzen können.",
        ],
      },
      {
        heading: "Änderung, Aussetzung oder Beendigung",
        paragraphs: [
          "Sie können den Dienst jederzeit über den Ein-Klick-Abmeldelink in jeder E-Mail beenden. Wir können den Dienst ebenfalls jederzeit ganz oder teilweise ändern, aussetzen oder einstellen und den Zugang beenden oder einschränken, soweit dies zum Schutz des Dienstes oder zur Einhaltung des Gesetzes erforderlich ist.",
        ],
      },
      {
        heading: "Änderungen dieser Bedingungen",
        paragraphs: [
          "Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. In diesem Fall passen wir das oben genannte Datum an. Nutzen Sie OneRead nach Inkrafttreten von Änderungen weiter, gilt dies als Zustimmung zu den aktualisierten Bedingungen.",
        ],
      },
      {
        heading: "Anwendbares Recht",
        paragraphs: [
          "Diese Bedingungen unterliegen dem Recht von **[Vor dem Launch anzuwendende Rechtsordnung einfügen]**, ohne Berücksichtigung des Kollisionsrechts. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen in vollem Umfang wirksam; diese Bedingungen bilden die gesamte Vereinbarung zwischen Ihnen und OneRead.",
        ],
      },
      {
        heading: "Kontakt",
        paragraphs: [
          "Fragen zu diesen Bedingungen? Schreiben Sie uns an [hello@oneread.com](mailto:hello@oneread.com) oder antworten Sie auf eine beliebige OneRead-E-Mail.",
        ],
      },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    lastUpdated: "3. Juli 2026",
    intro: [
      "OneRead beruht auf einer einfachen Idee: ein paar wirklich nützliche E-Mails, mehr nicht. Diese Zurückhaltung gilt auch für Ihre Daten. Wir erheben nur, was wir für den Betrieb Ihres Abonnements benötigen — derzeit OneArticle und OneFilm —, verkaufen sie nie und verfolgen Sie nicht im Web. Diese Erklärung beschreibt, was wir erheben, warum, und welche Wahlmöglichkeiten Sie haben.",
    ],
    sections: [
      {
        heading: "Wer wir sind",
        paragraphs: [
          "OneRead ist das Abonnement, das Ihnen an jedem Werktagmorgen OneArticle und an jedem Samstag OneFilm zusendet, wobei mit der Zeit weitere Produkte demselben Abonnement hinzugefügt werden. Der für Ihre Daten verantwortliche Verantwortliche ist **[Vor dem Launch juristische Person / Verantwortlichen einfügen]**. Sie erreichen uns jederzeit unter [hello@oneread.com](mailto:hello@oneread.com).",
        ],
      },
      {
        heading: "Welche Informationen wir erheben",
        paragraphs: ["Wenn Sie sich bei OneRead anmelden und es nutzen, verarbeiten wir:"],
        list: [
          "**Ihre E-Mail-Adresse** — damit wir Ihnen Ihre OneRead-E-Mails senden können.",
          "**Ihre Interessen** — die Themen, Genres und Stimmungen, die Sie auswählen, um jede E-Mail auf Sie abzustimmen.",
          "**Ihre Sprachpräferenzen** — Ihre Quellsprache und die Sprache, in der Ihre E-Mails verfasst werden sollen.",
          "**Ihren Abonnementstatus** — ob Sie aktiv sind, welche OneRead-Produkte Sie erhalten, und etwaige Tarifdetails bei einem kostenpflichtigen Plan.",
          "**Feedback-Klicks** — wenn Sie uns mitteilen, ob eine E-Mail hilfreich war, damit wir verbessern können, was wir senden.",
          "**Zustellstatus von E-Mails** — ob eine Nachricht gesendet wurde, unzustellbar war oder abbestellt wurde, damit die Zustellung zuverlässig bleibt.",
          "**Minimale technische Protokolle** — die begrenzten Aufzeichnungen, die zum Betrieb und zur Absicherung des Dienstes erforderlich sind.",
        ],
      },
      {
        heading: "Was wir nicht erheben",
        paragraphs: [],
        list: [
          "Keine Werbe-Tracker.",
          "Kein Verkauf Ihrer personenbezogenen Daten — niemals.",
          "Kein seitenübergreifendes Profiling und kein Verfolgen im Web.",
        ],
      },
      {
        heading: "Wie wir Ihre Informationen verwenden",
        paragraphs: [],
        list: [
          "Um Ihre OneRead-E-Mails auszuwählen und zu versenden.",
          "Um diese Auswahl auf Ihre Interessen und Sprachen abzustimmen.",
          "Um Ihr Abonnement zu verwalten und Abbestellungen zu bearbeiten.",
          "Um die Qualität und Zuverlässigkeit des Dienstes zu verbessern.",
          "Um Missbrauch vorzubeugen und den Dienst sicher zu halten.",
        ],
      },
      {
        heading: "Rechtsgrundlagen",
        paragraphs: [
          "Soweit das Datenschutzrecht eine Rechtsgrundlage verlangt, stützen wir uns auf Ihre **Einwilligung**, Ihnen Abonnement-E-Mails zu senden, auf unser **berechtigtes Interesse** am Betrieb, an der Absicherung und der Verbesserung von OneRead sowie, soweit anwendbar, auf die **Erfüllung rechtlicher Verpflichtungen**. Wir nutzen Ihre Informationen nicht für automatisierte Entscheidungen mit rechtlicher oder ähnlich erheblicher Wirkung.",
        ],
      },
      {
        heading: "E-Mail-Zustelldienste",
        paragraphs: [
          "Wir nutzen einen externen E-Mail-Anbieter (Resend), um Ihre OneRead-E-Mails zuzustellen. Dieser verarbeitet Ihre E-Mail- und Zustelldaten ausschließlich, um in unserem Auftrag Nachrichten zu versenden, und darf sie zu keinem anderen Zweck verwenden.",
        ],
      },
      {
        heading: "KI-Anbieter",
        paragraphs: [
          "Wir setzen automatisierte und KI-gestützte Systeme ein, um Zusammenfassungen und Notizen zu erstellen. Sind KI-Anbieter beteiligt, können die von uns zusammengefassten **Quellinhalte und Metadaten** — Artikel für OneArticle, Filmdetails für OneFilm — von ihnen verarbeitet werden. Wir übermitteln E-Mail-Adressen von Abonnenten nur, wenn es erforderlich ist, und beschränken die Weitergabe auf das für die Erstellung einer E-Mail Notwendige.",
        ],
      },
      {
        heading: "Internationale Übermittlungen",
        paragraphs: [
          "Einige unserer Anbieter betreiben Infrastruktur außerhalb Ihres Landes, sodass Ihre Daten im Ausland verarbeitet werden können. Soweit gesetzlich erforderlich, stützen wir uns für diese Übermittlungen auf geeignete Garantien.",
        ],
      },
      {
        heading: "Speicherdauer",
        paragraphs: [
          "Solange Ihr Abonnement aktiv ist, bewahren wir die dafür erforderlichen Informationen auf. Nach einer Abbestellung behalten wir nur, was notwendig ist — etwa einen Sperrvermerk, damit wir Ihnen nicht erneut schreiben, sowie minimale Protokolle — und löschen Ihre übrigen Präferenzdaten innerhalb einer angemessenen Frist.",
        ],
      },
      {
        heading: "Ihre Rechte",
        paragraphs: [],
        list: [
          "**Jederzeit abbestellen** — jede E-Mail enthält einen Ein-Klick-Abmeldelink, der sofort wirksam wird.",
          "**Auf Ihre Daten zugreifen, sie berichtigen oder löschen** — Sie können verlangen, dass wir Ihnen die über Sie gespeicherten Informationen zeigen, berichtigen oder löschen.",
          "**Widersprechen oder Einwilligung widerrufen** — Sie können verlangen, dass wir die Verarbeitung Ihrer Daten einstellen, oder Ihre Einwilligung jederzeit widerrufen.",
          "**Bei einer Behörde beschweren** — Sie können sich, soweit anwendbar, bei Ihrer örtlichen Datenschutzbehörde beschweren.",
        ],
      },
      {
        heading: "KVKK- / DSGVO-Hinweis",
        paragraphs: [
          "Für Nutzerinnen und Nutzer in der Türkei sowie in der EU/im EWR dient diese Erklärung zugleich als unsere Datenschutzhinweis (in der Türkei die *aydınlatma metni*), der beschreibt, wie wir Ihre personenbezogenen Daten verarbeiten und welche Rechte Ihnen zustehen. Diesen Hinweis halten wir **getrennt von jeder ausdrücklichen Einwilligung**, um die wir bitten: Wir bündeln Hinweis und Einwilligungserklärung nicht in einem einzigen Kästchen und bitten Sie nicht um eine Einwilligung für eine Verarbeitung, die für den Erhalt Ihrer OneRead-E-Mails nicht erforderlich ist. Beruht etwas auf einer Einwilligung, können Sie diese jederzeit widerrufen, ohne dass dies den bereits erhaltenen Dienst beeinträchtigt.",
        ],
      },
      {
        heading: "Sicherheit",
        paragraphs: [
          "Wir setzen angemessene technische und organisatorische Maßnahmen ein, um Ihre Informationen vor Verlust, Missbrauch und unbefugtem Zugriff zu schützen. Keine Übertragungs- oder Speichermethode ist vollständig sicher; wir arbeiten jedoch daran, die von uns gehaltenen Daten sicher zu verwahren und auf das tatsächlich Notwendige zu beschränken.",
        ],
      },
      {
        heading: "Datenschutz von Kindern",
        paragraphs: [
          "OneRead richtet sich nicht an Kinder unter 13 Jahren (oder dem in Ihrem Land geltenden Mindestalter), und wir erheben deren Informationen nicht wissentlich. Wenn Sie glauben, dass sich ein Kind angemeldet hat, kontaktieren Sie uns bitte, damit wir die Daten entfernen.",
        ],
      },
      {
        heading: "Änderungen dieser Erklärung",
        paragraphs: [
          "Bei wesentlichen Änderungen aktualisieren wir das oben genannte Datum und informieren Sie, soweit angemessen, per E-Mail.",
        ],
      },
      {
        heading: "Kontakt",
        paragraphs: [
          "Fragen zu Ihrem Datenschutz oder möchten Sie eines der obigen Rechte ausüben? Schreiben Sie uns an [hello@oneread.com](mailto:hello@oneread.com) oder antworten Sie einfach auf eine beliebige OneRead-E-Mail.",
        ],
      },
    ],
  },
};

const fr: LegalDictionary = {
  terms: {
    title: "Conditions d'utilisation",
    lastUpdated: "3 juillet 2026",
    intro: [
      "Ces conditions régissent votre utilisation d'OneRead — un abonnement unique qui inclut actuellement OneArticle et OneFilm, et auquel viendront s'ajouter d'autres produits discrets au fil du temps. En vous inscrivant à OneRead ou en l'utilisant, vous acceptez ces conditions. Si vous n'êtes pas d'accord, veuillez ne pas utiliser OneRead. Merci de les lire avec notre [politique de confidentialité](/privacy).",
    ],
    sections: [
      {
        heading: "Le service",
        paragraphs: [
          "OneRead réunit dans un seul abonnement les produits de la famille OneRead : **OneArticle**, un article soigneusement choisi et résumé, envoyé par e-mail chaque matin de semaine, et **OneFilm**, une courte note cinéma chaque samedi. À mesure que la famille grandit, nous pouvons ajouter d'autres produits au même abonnement sans coût supplémentaire. Nous nous efforçons de livrer chaque e-mail de manière fiable à son heure habituelle, mais l'horaire, la fréquence et la disponibilité sont fournis au mieux et peuvent évoluer. Nous ne garantissons pas une livraison ininterrompue ou sans erreur.",
        ],
      },
      {
        heading: "Éligibilité",
        paragraphs: [
          "Vous devez être en mesure de conclure un contrat contraignant pour utiliser OneRead, avoir au moins l'âge minimum requis dans votre pays, et fournir une adresse e-mail que vous êtes autorisé(e) à utiliser.",
        ],
      },
      {
        heading: "Compte et responsabilité de l'adresse e-mail",
        paragraphs: [
          "Vous êtes responsable de l'adresse e-mail avec laquelle vous vous inscrivez et de la sécurité de son accès. N'utilisez qu'une adresse qui vous appartient ou que vous êtes autorisé(e) à utiliser. Si vous perdez l'accès à cette adresse, vous pouvez vous désabonner puis vous réinscrire avec une nouvelle adresse.",
        ],
      },
      {
        heading: "Abonnement, facturation et résiliation",
        paragraphs: [
          "OneRead est proposé sous la forme d'un abonnement mensuel payant, au tarif indiqué sur notre [page tarifs](/pricing) au moment de votre inscription. Les tarifs peuvent évoluer pour les futures périodes de facturation ; nous vous préviendrons clairement de tout changement avant qu'il ne s'applique.",
          "Les paiements sont traités de manière sécurisée par notre prestataire de paiement, **Polar**, et votre achat est également soumis aux propres conditions de Polar.",
          "Vous pouvez résilier à tout moment via le lien de désabonnement en un clic présent dans chaque e-mail, ou en gérant votre abonnement depuis le portail de facturation dont le lien figure dans votre e-mail de confirmation. La résiliation met fin aux futurs e-mails et renouvellements ; sauf indication contraire ou obligation légale, elle ne crée pas automatiquement de droit à un remboursement pour la période en cours.",
        ],
      },
      {
        heading: "Utilisation acceptable",
        paragraphs: [],
        list: [
          "Ne vous inscrivez pas avec une adresse e-mail qui ne vous appartient pas.",
          "N'essayez pas de perturber, surcharger, procéder à de l'ingénierie inverse ou accéder sans autorisation au service.",
          "Ne collectez pas, n'archivez pas, ne revendez pas, ne redistribuez pas et ne copiez pas systématiquement les e-mails que nous envoyons.",
          "N'utilisez pas OneRead à des fins illicites.",
        ],
      },
      {
        heading: "Contenu et propriété intellectuelle",
        paragraphs: [
          "Chaque e-mail de la famille OneRead contient un **résumé et un commentaire originaux** — pour OneArticle, un résumé et un commentaire d'un article source accompagnés d'un lien vers celui-ci ; pour OneFilm, une courte note sur un film. Nous résumons et commentons — nous ne reproduisons pas intégralement le contenu source et n'en publions pas de traduction complète. Lorsque nous décrivons une source, comme un article de presse, celle-ci **demeure la propriété de son éditeur respectif**, et rien dans nos e-mails ne doit être interprété comme le fait qu'OneRead se présente comme cet éditeur ou bénéficie de son approbation.",
          "Nos e-mails sont fournis pour votre **usage personnel et non commercial**. Les noms OneRead, OneArticle et OneFilm, leur design, ainsi que les résumés et commentaires que nous rédigeons demeurent notre propriété ou celle de nos concédants de licence. Vous pouvez lire un e-mail et partager un lien vers celui-ci, mais vous ne pouvez pas copier, revendre, redistribuer, collecter ou archiver notre contenu de manière systématique.",
        ],
      },
      {
        heading: "Articles sources et liens vers des tiers",
        paragraphs: [
          "Nos e-mails renvoient vers des articles et d'autres contenus publiés par des tiers. Nous ne contrôlons pas ces sites et ne sommes pas responsables de leur disponibilité, de leur exactitude, de leur contenu ou de leurs conditions — y compris d'éventuels péages numériques. La consultation d'une page liée est soumise aux propres conditions et pratiques de confidentialité de cet éditeur.",
        ],
      },
      {
        heading: "Contenu généré par IA",
        paragraphs: [
          "Nos résumés et notes sont produits à l'aide de systèmes automatisés et d'IA. Ils peuvent en conséquence contenir des erreurs, des omissions ou des simplifications, et ne pas refléter tout le contexte ou les nuances de la source ou du film. Considérez chacun d'eux comme un point de départ : pour tout ce qui compte vraiment, lisez l'article source ou vérifiez les détails du film de manière indépendante. Rien de ce que nous envoyons ne constitue un conseil professionnel — juridique, financier, médical ou autre — et ne doit pas s'y substituer.",
        ],
      },
      {
        heading: "Avertissements",
        paragraphs: [
          "OneRead est fourni « tel quel » et « selon disponibilité ». Nous nous efforçons de rendre nos e-mails exacts et utiles, mais nous n'offrons aucune garantie quant à la disponibilité, l'exactitude, la fiabilité ou l'adéquation du service à un usage particulier, dans toute la mesure permise par la loi.",
        ],
      },
      {
        heading: "Limitation de responsabilité",
        paragraphs: [
          "Dans toute la mesure permise par la loi, OneRead n'est pas responsable des dommages indirects, accessoires, particuliers ou consécutifs, ni de toute perte résultant de votre confiance dans un e-mail que nous envoyons ou de votre utilisation, ou incapacité à utiliser, le service.",
        ],
      },
      {
        heading: "Modification, suspension ou résiliation",
        paragraphs: [
          "Vous pouvez arrêter le service à tout moment via le lien de désabonnement en un clic présent dans chaque e-mail. Nous pouvons également modifier, suspendre ou interrompre le service, en tout ou partie, à tout moment, et mettre fin à l'accès ou le limiter lorsque cela est nécessaire pour protéger le service ou se conformer à la loi.",
        ],
      },
      {
        heading: "Modifications de ces conditions",
        paragraphs: [
          "Nous pouvons mettre à jour ces conditions de temps à autre. Le cas échéant, nous actualiserons la date ci-dessus. Continuer à utiliser OneRead après l'entrée en vigueur de modifications signifie que vous acceptez les conditions mises à jour.",
        ],
      },
      {
        heading: "Droit applicable",
        paragraphs: [
          "Ces conditions sont régies par le droit de **[Juridiction applicable à insérer avant le lancement]**, sans égard aux règles de conflit de lois. Si une disposition est jugée inapplicable, les autres dispositions restent pleinement en vigueur, et ces conditions constituent l'intégralité de l'accord entre vous et OneRead.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Des questions sur ces conditions ? Écrivez-nous à [hello@oneread.com](mailto:hello@oneread.com), ou répondez à n'importe quel e-mail OneRead.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "3 juillet 2026",
    intro: [
      "OneRead repose sur une idée simple : quelques e-mails réellement utiles, rien de plus. Cette sobriété s'applique aussi à vos données. Nous ne collectons que ce dont nous avons besoin pour faire fonctionner votre abonnement — actuellement OneArticle et OneFilm —, nous ne les vendons jamais, et nous ne vous suivons pas sur le web. Cette politique explique ce que nous collectons, pourquoi, et les choix qui s'offrent à vous.",
    ],
    sections: [
      {
        heading: "Qui nous sommes",
        paragraphs: [
          "OneRead est l'abonnement qui vous envoie OneArticle chaque matin de semaine et OneFilm chaque samedi, auquel viendront s'ajouter d'autres produits au fil du temps. Le responsable du traitement de vos informations est **[Entité juridique / responsable du traitement à insérer avant le lancement]**. Vous pouvez nous joindre à tout moment à [hello@oneread.com](mailto:hello@oneread.com).",
        ],
      },
      {
        heading: "Informations que nous collectons",
        paragraphs: ["Lorsque vous vous inscrivez et utilisez OneRead, nous traitons :"],
        list: [
          "**Votre adresse e-mail** — pour pouvoir vous envoyer vos e-mails OneRead.",
          "**Vos centres d'intérêt** — les sujets, genres et humeurs que vous sélectionnez, utilisés pour adapter chaque e-mail à votre profil.",
          "**Vos préférences linguistiques** — votre langue source et la langue dans laquelle vous souhaitez recevoir vos e-mails.",
          "**Votre statut d'abonnement** — si vous êtes actif ou non, quels produits OneRead vous recevez, et les détails de votre formule si vous êtes sur un plan payant.",
          "**Les clics de retour** — lorsque vous nous indiquez qu'un e-mail était utile ou non, afin d'améliorer ce que nous envoyons.",
          "**Le statut de livraison des e-mails** — si un message a été envoyé, a rebondi ou a fait l'objet d'un désabonnement, pour garantir une livraison fiable.",
          "**Des journaux techniques minimaux** — les données limitées nécessaires au fonctionnement et à la sécurité du service.",
        ],
      },
      {
        heading: "Ce que nous ne collectons pas",
        paragraphs: [],
        list: [
          "Aucun traceur publicitaire.",
          "Aucune vente de vos données personnelles — jamais.",
          "Aucun profilage intersites ni suivi sur le web.",
        ],
      },
      {
        heading: "Comment nous utilisons vos informations",
        paragraphs: [],
        list: [
          "Pour sélectionner et envoyer vos e-mails OneRead.",
          "Pour personnaliser cette sélection selon vos centres d'intérêt et vos langues.",
          "Pour gérer votre abonnement et traiter les demandes de désabonnement.",
          "Pour améliorer la qualité et la fiabilité du service.",
          "Pour prévenir les abus et assurer la sécurité du service.",
        ],
      },
      {
        heading: "Bases légales",
        paragraphs: [
          "Lorsque le droit de la protection des données exige une base légale, nous nous appuyons sur votre **consentement** pour vous envoyer les e-mails de l'abonnement, sur notre **intérêt légitime** à exploiter, sécuriser et améliorer OneRead, et sur le **respect d'obligations légales** lorsque cela s'applique. Nous n'utilisons pas vos informations pour des décisions automatisées produisant des effets juridiques ou similaires.",
        ],
      },
      {
        heading: "Prestataires de messagerie",
        paragraphs: [
          "Nous utilisons un prestataire d'e-mail tiers (Resend) pour livrer vos e-mails OneRead. Il traite vos données d'e-mail et de livraison uniquement pour envoyer des messages en notre nom, et n'est pas autorisé à les utiliser à d'autres fins.",
        ],
      },
      {
        heading: "Prestataires d'IA",
        paragraphs: [
          "Nous utilisons des systèmes automatisés et d'IA pour nous aider à générer résumés et notes. Lorsque des prestataires d'IA sont impliqués, le **contenu source et les métadonnées** que nous résumons — articles pour OneArticle, informations sur les films pour OneFilm — peuvent être traités par eux. Nous ne transmettons les adresses e-mail des abonnés aux prestataires d'IA que si nécessaire, et nous nous efforçons de ne partager que ce qui est utile à la production d'un e-mail.",
        ],
      },
      {
        heading: "Transferts internationaux",
        paragraphs: [
          "Certains de nos prestataires exploitent une infrastructure en dehors de votre pays ; vos données peuvent donc être traitées à l'étranger. Lorsque la loi l'exige, nous nous appuyons sur des garanties appropriées pour ces transferts.",
        ],
      },
      {
        heading: "Conservation des données",
        paragraphs: [
          "Tant que votre abonnement est actif, nous conservons les informations nécessaires à son fonctionnement. Si vous vous désabonnez, nous ne conservons que ce qui est nécessaire — comme un enregistrement de suppression pour ne plus vous contacter et des journaux minimaux — et nous supprimons vos autres données de préférences dans un délai raisonnable.",
        ],
      },
      {
        heading: "Vos droits",
        paragraphs: [],
        list: [
          "**Se désabonner à tout moment** — chaque e-mail comprend un lien de désabonnement en un clic, qui prend effet immédiatement.",
          "**Accéder à vos données, les corriger ou les supprimer** — vous pouvez nous demander de vous montrer, corriger ou supprimer les informations que nous détenons à votre sujet.",
          "**Vous opposer ou retirer votre consentement** — vous pouvez nous demander de cesser de traiter vos informations, ou retirer votre consentement, à tout moment.",
          "**Déposer une plainte auprès d'une autorité** — vous pouvez déposer une plainte auprès de votre autorité locale de protection des données, le cas échéant.",
        ],
      },
      {
        heading: "Avis KVKK / RGPD",
        paragraphs: [
          "Pour les utilisateurs en Türkiye et dans l'UE/EEE, cette politique fait également office d'avis de confidentialité (en Türkiye, l'*aydınlatma metni*) décrivant comment nous traitons vos données personnelles et les droits dont vous disposez. Nous conservons cet avis **distinct de tout consentement explicite** que nous sollicitons : nous ne regroupons pas l'avis et une déclaration de consentement dans une seule case, et nous ne vous demandons pas de consentir à un traitement dont vous n'avez pas besoin pour recevoir vos e-mails OneRead. Lorsque le consentement sert de base à un traitement, vous pouvez le retirer à tout moment sans affecter le service déjà reçu.",
        ],
      },
      {
        heading: "Sécurité",
        paragraphs: [
          "Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos informations contre la perte, l'utilisation abusive et l'accès non autorisé. Aucune méthode de transmission ou de stockage n'est totalement sûre, mais nous nous efforçons de protéger les données que nous détenons et de les limiter à ce dont nous avons réellement besoin.",
        ],
      },
      {
        heading: "Confidentialité des mineurs",
        paragraphs: [
          "OneRead ne s'adresse pas aux enfants de moins de 13 ans (ou l'âge minimum applicable dans votre pays), et nous ne collectons pas sciemment leurs informations. Si vous pensez qu'un enfant s'est inscrit, contactez-nous et nous supprimerons les données.",
        ],
      },
      {
        heading: "Modifications de cette politique",
        paragraphs: [
          "En cas de modifications importantes, nous mettrons à jour la date ci-dessus et, le cas échéant, vous en informerons par e-mail.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Des questions sur votre confidentialité, ou souhaitez-vous exercer l'un des droits ci-dessus ? Écrivez-nous à [hello@oneread.com](mailto:hello@oneread.com), ou répondez simplement à n'importe quel e-mail OneRead.",
        ],
      },
    ],
  },
};

export const LEGAL_DICTIONARIES: Record<SiteLocale, LegalDictionary> = {
  en,
  tr,
  de,
  fr,
};
