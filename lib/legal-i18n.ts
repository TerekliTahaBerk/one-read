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
 * liability. Paragraphs support a
 * small inline markup: **bold** and [text](url) — see LegalContent.tsx.
 */

const en: LegalDictionary = {
  terms: {
    title: "Terms of Service",
    lastUpdated: "July 25, 2026",
    intro: [
      "These terms govern your use of OneRead — a monthly subscription that includes OneArticle. By signing up for or using OneRead, you agree to them. If you don't agree, please don't use OneRead. Please read them alongside our [Privacy Policy](/privacy).",
    ],
    sections: [
      {
        heading: "The service",
        paragraphs: [
          "OneRead currently includes **OneArticle**, a weekday article brief delivered in your chosen reading language. We aim to deliver each email reliably around its scheduled time, but timing, frequency, and availability are provided on a best-effort basis and may change. We don't guarantee uninterrupted or error-free delivery.",
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
          "Where checkout offers a free trial, the trial length and the date of the first charge are shown before purchase. The paid subscription begins automatically when that trial ends unless you cancel through the customer portal before the stated deadline.",
          "Prices are charged in **US dollars (USD)**. If your account uses another currency, your bank or payment provider may convert the charge and apply its own exchange rate or fees. OneRead does not currently offer localized currency pricing.",
          "**Polar acts as merchant of record and authorized reseller** for the transaction. Polar collects the payment, calculates and remits applicable sales taxes, and makes the order invoice or receipt available in the customer portal. Your checkout is also subject to [Polar's Buyer Terms](https://polar.sh/legal/checkout-buyer-terms), including its cancellation, refund and dispute process.",
          "You can stop OneRead emails at any time using the one-click unsubscribe link in any email. Email unsubscribe does not cancel a paid plan or stop its renewal. To cancel future charges, use the secure subscription portal available after verifying your email on the subscription page. Paid-plan cancellation stops future renewals; unless otherwise stated or required by law, it doesn't automatically create a right to a refund for the current period.",
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
          "Each OneArticle email contains **original editorial writing** about a source article, together with a link to it. We summarize and comment — we don't reproduce source material in full and we don't publish full translations of it. The source **remains the property of its respective publisher**, and nothing in our emails should be read as OneRead claiming to be that publisher or as an endorsement by them.",
          "Our emails are provided for your **personal, non-commercial use**. The OneRead and OneArticle names, design, and the summaries and commentary we write remain ours or our licensors'. You may read and share a link to an email, but you may not copy, resell, redistribute, scrape, or archive our content on a systematic basis.",
        ],
      },
      {
        heading: "Source articles and third-party links",
        paragraphs: [
          "Our emails link to articles and other material published by third parties. We don't control those sites and aren't responsible for their availability, accuracy, content, or terms — including any paywalls. Visiting a linked page is subject to that publisher's own terms and privacy practices.",
        ],
      },
      {
        heading: "Editorial process and accuracy",
        paragraphs: [
          "OneArticle editions are selected, written, reviewed, and scheduled by a human editor. Software tools may assist research, formatting, and quality checks, but no edition is sent without explicit editorial approval. Despite that review, an edition may still contain errors, omissions, or simplifications. For anything that matters, read the linked source. Nothing we send is professional advice — legal, financial, medical, or otherwise.",
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
          "You can stop emails at any time using the one-click unsubscribe link in any email, and you can separately cancel paid renewal through the secure subscription portal. We may also modify, suspend, or discontinue the service, in whole or in part, at any time, and we may end or limit access where necessary to protect the service or comply with the law.",
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
          "These terms are governed by the laws of the **Republic of Türkiye**, without regard to conflict-of-law rules. Mandatory consumer protections that apply in your country remain unaffected. If any provision is found unenforceable, the remaining provisions stay in full effect, and these terms make up the entire agreement between you and OneRead.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Questions about these terms? Email us at [hello@oneread.email](mailto:hello@oneread.email), or reply to any OneRead email.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    lastUpdated: "July 25, 2026",
    intro: [
      "OneRead is built around a simple idea: a genuinely useful email, and nothing more. That restraint extends to your data. We collect only what we need to run OneArticle, we never sell it, and we don't track you around the web. This policy explains what we collect, why, and the choices you have.",
    ],
    sections: [
      {
        heading: "Who we are",
        paragraphs: [
          "OneRead is an independent editorial subscription operated from Türkiye. The **OneRead operator** is the data controller responsible for your information. You can reach the operator and exercise your privacy rights at [hello@oneread.email](mailto:hello@oneread.email).",
        ],
      },
      {
        heading: "Information we collect",
        paragraphs: ["When you sign up and use OneRead, we process:"],
        list: [
          "**Your email address** — so we can send your OneRead emails.",
          "**Your reading language** — the language in which you want OneArticle written.",
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
          "To deliver the correct reading-language edition.",
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
          "OneArticle editions are written and scheduled by our editorial team. We may use ordinary infrastructure providers to operate the service, but subscriber email addresses are not sent to content-generation providers.",
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
          "While your paid plan or account relationship remains active, we keep the information needed to run it, including preferences so you can resume emails without setting everything up again. Email unsubscribe creates a suppression record but does not by itself close the paid plan. After paid cancellation and account closure, we delete or anonymize preference data within a reasonable period, while retaining only records required for tax, payment, fraud prevention, legal claims, and suppression.",
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
          "Questions about your privacy, or want to exercise a right above? Email us at [hello@oneread.email](mailto:hello@oneread.email), or simply reply to any OneRead email.",
        ],
      },
    ],
  },
};

const tr: LegalDictionary = {
  terms: {
    title: "Kullanım Koşulları",
    lastUpdated: "25 Temmuz 2026",
    intro: [
      "Bu koşullar, OneArticle'ı kapsayan aylık OneRead aboneliğini kullanımınızı düzenler. OneRead'e kaydolarak veya onu kullanarak bu koşulları kabul etmiş olursunuz. Kabul etmiyorsanız lütfen OneRead'i kullanmayın. Bu koşulları [Gizlilik Politikamız](/privacy) ile birlikte okumanızı öneririz.",
    ],
    sections: [
      {
        heading: "Hizmet",
        paragraphs: [
          "OneRead şu anda seçtiğiniz okuma dilinde hafta içi gönderilen **OneArticle** makale özetini içerir. Her e-postayı planlanan zamanda güvenilir biçimde ulaştırmayı hedefliyoruz; ancak zamanlama, sıklık ve kullanılabilirlik en iyi çaba ilkesiyle sunulur ve değişebilir. Kesintisiz veya hatasız teslimat garanti etmiyoruz.",
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
          "Ödeme ekranında ücretsiz deneme sunuluyorsa deneme süresi ve ilk tahsilat tarihi satın almadan önce gösterilir. Belirtilen son tarihten önce müşteri portalından iptal etmediğiniz sürece deneme bittiğinde ücretli abonelik otomatik olarak başlar.",
          "Ücretler **ABD doları (USD)** olarak tahsil edilir. Hesabınız başka bir para birimi kullanıyorsa bankanız veya ödeme sağlayıcınız kendi döviz kuru ve ücretleriyle dönüşüm yapabilir. OneRead şu anda yerel para biriminde fiyatlandırma sunmamaktadır.",
          "İşlemde **kayıtlı satıcı ve yetkili yeniden satıcı Polar'dır**. Polar ödemeyi tahsil eder, geçerli satış vergilerini hesaplayıp aktarır ve sipariş faturasını veya makbuzunu müşteri portalında sunar. Ödeme işleminiz Polar'ın iptal, iade ve itiraz süreçlerini de içeren [Alıcı Koşulları'na](https://polar.sh/legal/checkout-buyer-terms) tabidir.",
          "Herhangi bir e-postadaki tek tıkla abonelikten çıkma bağlantısını kullanarak OneRead e-postalarını istediğiniz zaman durdurabilirsiniz. E-posta listesinden çıkmak ücretli planı iptal etmez veya yenilemeyi durdurmaz. Gelecekteki tahsilatları durdurmak için abonelik sayfasında e-posta adresinizi doğruladıktan sonra açılan güvenli abonelik portalını kullanın. Ücretli planın iptali gelecekteki yenilemeleri durdurur; aksi belirtilmedikçe veya yasa gerektirmedikçe cari dönem için otomatik bir iade hakkı doğurmaz.",
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
          "Her OneArticle e-postası, kaynak makaleye bağlantıyla birlikte **özgün editoryal yazı** içerir. Özetler ve yorumlarız; kaynak materyali tam olarak yeniden üretmeyiz ve tam çevirisini yayımlamayız. Kaynak **ilgili yayıncısının mülkiyetinde kalır** ve e-postalarımızdaki hiçbir ifade OneRead'in o yayıncı olduğu veya o yayıncı tarafından onaylandığı şeklinde yorumlanamaz.",
          "E-postalarımız **kişisel, ticari olmayan kullanımınız** için sunulur. OneRead ve OneArticle adları, tasarımı ile yazdığımız özet ve yorumlar bize veya lisans verenlerimize aittir. Bir e-postayı okuyabilir ve bağlantısını paylaşabilirsiniz; ancak içeriklerimizi sistematik biçimde kopyalayamaz, yeniden satamaz, dağıtamaz, kazıyamaz veya arşivleyemezsiniz.",
        ],
      },
      {
        heading: "Kaynak makaleler ve üçüncü taraf bağlantıları",
        paragraphs: [
          "E-postalarımız üçüncü taraflarca yayımlanan makale ve diğer içeriklere bağlantı verir. Bu siteleri kontrol etmiyoruz ve erişilebilirlikleri, doğrulukları, içerikleri veya koşulları — ücretli erişim duvarları dâhil — konusunda sorumluluk taşımıyoruz. Bağlantı verilen bir sayfayı ziyaret etmeniz, o yayıncının kendi koşullarına ve gizlilik uygulamalarına tabidir.",
        ],
      },
      {
        heading: "Editoryal süreç ve doğruluk",
        paragraphs: [
          "OneArticle gönderileri bir insan editör tarafından seçilir, yazılır, kontrol edilir ve zamanlanır. Yazılım araçları araştırma, biçimlendirme ve kalite kontrollerine yardımcı olabilir; ancak açık editoryal onay olmadan hiçbir gönderi yollanmaz. Bu incelemeye rağmen hata, eksik veya basitleştirme olabilir. Önemli konularda bağlantılı kaynağı okuyun. Gönderdiğimiz içerikler profesyonel tavsiye değildir.",
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
          "Herhangi bir e-postadaki tek tıkla abonelikten çıkma bağlantısını kullanarak e-postaları istediğiniz zaman durdurabilir, ücretli yenilemeyi ise güvenli abonelik portalından ayrıca iptal edebilirsiniz. Ayrıca hizmeti kısmen veya tamamen istediğimiz zaman değiştirebilir, askıya alabilir veya sonlandırabiliriz; hizmeti korumak veya yasaya uymak amacıyla erişimi sonlandırabilir veya sınırlandırabiliriz.",
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
          "Bu koşullar, kanunlar ihtilafı kurallarına bakılmaksızın **Türkiye Cumhuriyeti** hukukuna tabidir. Bulunduğunuz ülkede geçerli emredici tüketici hakları saklıdır. Herhangi bir hükmün uygulanamaz bulunması hâlinde, kalan hükümler tam olarak yürürlükte kalır.",
        ],
      },
      {
        heading: "İletişim",
        paragraphs: [
          "Bu koşullarla ilgili sorularınız mı var? Bize [hello@oneread.email](mailto:hello@oneread.email) adresinden e-posta gönderin veya herhangi bir OneRead e-postasını yanıtlayın.",
        ],
      },
    ],
  },
  privacy: {
    title: "Gizlilik Politikası",
    lastUpdated: "25 Temmuz 2026",
    intro: [
      "OneRead basit bir fikir üzerine kuruludur: gerçekten yararlı tek bir e-posta, fazlası değil. OneArticle'ı yürütmek için gereken en az bilgiyi topluyoruz, bunu asla satmıyoruz ve sizi internette takip etmiyoruz.",
    ],
    sections: [
      {
        heading: "Biz kimiz",
        paragraphs: [
          "OneRead, Türkiye'den işletilen bağımsız bir editoryal abonelik hizmetidir. Bilgilerinizden sorumlu veri sorumlusu **OneRead işletmecisidir**. İşletmeciye ulaşmak ve gizlilik haklarınızı kullanmak için [hello@oneread.email](mailto:hello@oneread.email) adresine yazabilirsiniz.",
        ],
      },
      {
        heading: "Topladığımız bilgiler",
        paragraphs: ["OneRead'e kaydolduğunuzda ve onu kullandığınızda şunları işleriz:"],
        list: [
          "**E-posta adresiniz** — OneRead e-postalarınızı gönderebilmemiz için.",
          "**Okuma diliniz** — OneArticle'ın yazılmasını istediğiniz dil.",
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
          "Doğru okuma dili sürümünü göndermek için.",
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
          "OneArticle gönderileri editoryal ekibimiz tarafından yazılır ve planlanır. Hizmeti işletmek için standart altyapı sağlayıcılarından yararlanabiliriz; ancak abone e-posta adresleri içerik üretim sağlayıcılarına gönderilmez.",
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
          "Ücretli planınız veya hesap ilişkiniz aktif olduğu sürece, e-postaları yeniden başlattığınızda her şeyi tekrar kurmamanız için tercihler dahil hizmeti yürütmekte gereken bilgileri saklarız. E-posta listesinden çıkmak bir baskılama kaydı oluşturur ancak ücretli planı tek başına kapatmaz. Ücretli iptal ve hesap kapatma sonrasında tercih verilerini makul bir süre içinde siler veya anonimleştirir; yalnızca vergi, ödeme, dolandırıcılığı önleme, hukuki talepler ve baskılama için gerekli kayıtları saklarız.",
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
          "Gizliliğinizle ilgili sorularınız mı var veya yukarıdaki haklardan birini mi kullanmak istiyorsunuz? Bize [hello@oneread.email](mailto:hello@oneread.email) adresinden e-posta gönderin veya herhangi bir OneRead e-postasını yanıtlayın.",
        ],
      },
    ],
  },
};

const de: LegalDictionary = {
  terms: {
    title: "Nutzungsbedingungen",
    lastUpdated: "25. Juli 2026",
    intro: [
      "Diese Bedingungen regeln Ihre Nutzung von OneRead — einem Monatsabonnement, das OneArticle umfasst. Mit der Anmeldung bei oder der Nutzung von OneRead stimmen Sie diesen Bedingungen zu. Wenn Sie nicht einverstanden sind, nutzen Sie OneRead bitte nicht. Bitte lesen Sie diese Bedingungen zusammen mit unserer [Datenschutzerklärung](/privacy).",
    ],
    sections: [
      {
        heading: "Der Dienst",
        paragraphs: [
          "OneRead umfasst derzeit **OneArticle**, ein werktägliches Artikelbriefing in Ihrer gewählten Lesesprache. Wir sind bestrebt, jede E-Mail zuverlässig zum geplanten Zeitpunkt zuzustellen; Zeitpunkt, Häufigkeit und Verfügbarkeit erfolgen jedoch nach bestem Bemühen und können sich ändern.",
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
          "Wenn der Checkout eine kostenlose Testphase anbietet, werden deren Dauer und das Datum der ersten Abbuchung vor dem Kauf angezeigt. Das kostenpflichtige Abo beginnt nach Ablauf der Testphase automatisch, sofern Sie nicht vor der angegebenen Frist im Kundenportal kündigen.",
          "Die Abrechnung erfolgt in **US-Dollar (USD)**. Bei Konten in einer anderen Währung kann Ihre Bank oder Ihr Zahlungsanbieter den Betrag zum eigenen Kurs umrechnen und Gebühren erheben. OneRead bietet derzeit keine lokalisierte Währungspreisgestaltung an.",
          "**Polar ist Merchant of Record und autorisierter Wiederverkäufer** der Transaktion. Polar zieht die Zahlung ein, berechnet und führt anwendbare Verkaufssteuern ab und stellt Rechnung oder Beleg im Kundenportal bereit. Der Checkout unterliegt außerdem den [Polar-Käuferbedingungen](https://polar.sh/legal/checkout-buyer-terms) einschließlich Kündigungs-, Erstattungs- und Streitbeilegungsverfahren.",
          "Sie können OneRead-E-Mails jederzeit über den Ein-Klick-Abmeldelink in jeder E-Mail stoppen. Die E-Mail-Abmeldung kündigt kein kostenpflichtiges Abo und stoppt keine Verlängerung. Um künftige Abbuchungen zu beenden, verwenden Sie nach Bestätigung Ihrer E-Mail-Adresse auf der Abonnementseite das sichere Abo-Portal. Die Kündigung des kostenpflichtigen Abos beendet künftige Verlängerungen; sofern nicht anders angegeben oder gesetzlich vorgeschrieben, entsteht dadurch kein automatischer Anspruch auf Erstattung für den laufenden Zeitraum.",
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
          "Jede OneArticle-E-Mail enthält eine **eigenständige redaktionelle Einordnung** eines Quellartikels samt Link dorthin. Wir fassen zusammen und ordnen ein — wir geben Quellmaterial nicht vollständig wieder und veröffentlichen keine vollständigen Übersetzungen davon. Die Quelle **bleibt Eigentum des jeweiligen Verlags**; nichts in unseren E-Mails ist so zu verstehen, dass OneRead sich als dieser Verlag ausgibt oder von ihm unterstützt wird.",
          "Unsere E-Mails sind für Ihre **persönliche, nicht kommerzielle Nutzung** bestimmt. Die Namen OneRead und OneArticle, das Design sowie die von uns verfassten Zusammenfassungen und Einordnungen bleiben unser Eigentum oder das unserer Lizenzgeber. Sie dürfen eine E-Mail lesen und einen Link dazu teilen, jedoch unsere Inhalte nicht systematisch kopieren, weiterverkaufen, verbreiten, extrahieren oder archivieren.",
        ],
      },
      {
        heading: "Quellartikel und Links zu Dritten",
        paragraphs: [
          "Unsere E-Mails verlinken auf Artikel und andere Inhalte, die von Dritten veröffentlicht werden. Wir kontrollieren diese Websites nicht und sind nicht verantwortlich für deren Verfügbarkeit, Richtigkeit, Inhalt oder Bedingungen — einschließlich etwaiger Bezahlschranken. Der Besuch einer verlinkten Seite unterliegt den eigenen Bedingungen und Datenschutzpraktiken des jeweiligen Verlags.",
        ],
      },
      {
        heading: "Redaktioneller Prozess und Genauigkeit",
        paragraphs: [
          "OneArticle-Ausgaben werden von einem menschlichen Redakteur ausgewählt, verfasst, geprüft und geplant. Software kann Recherche, Formatierung und Qualitätskontrollen unterstützen; ohne ausdrückliche redaktionelle Freigabe wird jedoch keine Ausgabe versendet. Trotz Prüfung können Fehler oder Vereinfachungen vorkommen. Lesen Sie bei wichtigen Themen die verlinkte Quelle.",
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
          "Diese Bedingungen unterliegen dem Recht der **Republik Türkiye**, ohne Berücksichtigung des Kollisionsrechts. Zwingende Verbraucherschutzrechte Ihres Landes bleiben unberührt. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen Bestimmungen wirksam.",
        ],
      },
      {
        heading: "Kontakt",
        paragraphs: [
          "Fragen zu diesen Bedingungen? Schreiben Sie uns an [hello@oneread.email](mailto:hello@oneread.email) oder antworten Sie auf eine beliebige OneRead-E-Mail.",
        ],
      },
    ],
  },
  privacy: {
    title: "Datenschutzerklärung",
    lastUpdated: "25. Juli 2026",
    intro: [
      "OneRead beruht auf einer einfachen Idee: eine wirklich nützliche E-Mail, mehr nicht. Wir erheben nur, was wir für OneArticle benötigen, verkaufen die Daten nie und verfolgen Sie nicht im Web.",
    ],
    sections: [
      {
        heading: "Wer wir sind",
        paragraphs: [
          "OneRead ist ein unabhängiges, aus Türkiye betriebenes redaktionelles Abonnement. Der **OneRead-Betreiber** ist der Verantwortliche für Ihre Daten. Sie erreichen ihn und können Ihre Datenschutzrechte unter [hello@oneread.email](mailto:hello@oneread.email) ausüben.",
        ],
      },
      {
        heading: "Welche Informationen wir erheben",
        paragraphs: ["Wenn Sie sich bei OneRead anmelden und es nutzen, verarbeiten wir:"],
        list: [
          "**Ihre E-Mail-Adresse** — damit wir Ihnen Ihre OneRead-E-Mails senden können.",
          "**Ihre Lesesprache** — die Sprache, in der OneArticle verfasst werden soll.",
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
          "Um die Ausgabe in der richtigen Lesesprache zuzustellen.",
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
          "OneArticle-Ausgaben werden von unserem Redaktionsteam geschrieben und geplant. Für den Betrieb des Dienstes können wir übliche Infrastrukturanbieter einsetzen; E-Mail-Adressen von Abonnenten werden jedoch nicht an Anbieter zur Inhaltserstellung übermittelt.",
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
          "Solange Ihr kostenpflichtiges Abo oder Ihre Kontobeziehung aktiv ist, speichern wir die dafür erforderlichen Informationen einschließlich Ihrer Präferenzen, damit Sie E-Mails ohne erneute Einrichtung fortsetzen können. Die E-Mail-Abmeldung erzeugt einen Sperrvermerk, schließt das kostenpflichtige Abo aber nicht. Nach Kündigung und Kontoschließung löschen oder anonymisieren wir Präferenzdaten innerhalb einer angemessenen Frist und bewahren nur die für Steuern, Zahlungen, Betrugsprävention, Rechtsansprüche und Sperrung erforderlichen Unterlagen auf.",
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
          "Fragen zu Ihrem Datenschutz oder möchten Sie eines der obigen Rechte ausüben? Schreiben Sie uns an [hello@oneread.email](mailto:hello@oneread.email) oder antworten Sie einfach auf eine beliebige OneRead-E-Mail.",
        ],
      },
    ],
  },
};

const fr: LegalDictionary = {
  terms: {
    title: "Conditions d'utilisation",
    lastUpdated: "25 juillet 2026",
    intro: [
      "Ces conditions régissent votre utilisation d'OneRead — un abonnement mensuel qui inclut OneArticle. En vous inscrivant à OneRead ou en l'utilisant, vous acceptez ces conditions. Si vous n'êtes pas d'accord, veuillez ne pas utiliser OneRead. Merci de les lire avec notre [politique de confidentialité](/privacy).",
    ],
    sections: [
      {
        heading: "Le service",
        paragraphs: [
          "OneRead inclut actuellement **OneArticle**, une note article envoyée en semaine dans la langue de lecture choisie. Nous nous efforçons de livrer chaque e-mail à l'heure prévue, mais l'horaire, la fréquence et la disponibilité sont fournis au mieux et peuvent évoluer.",
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
          "Lorsqu'un essai gratuit est proposé au paiement, sa durée et la date du premier prélèvement sont affichées avant l'achat. L'offre payante commence automatiquement à la fin de l'essai sauf résiliation depuis le portail avant l'échéance indiquée.",
          "Les paiements sont facturés en **dollars américains (USD)**. Si votre compte utilise une autre devise, votre banque ou prestataire peut convertir le montant à son propre taux et appliquer des frais. OneRead ne propose pas actuellement de tarification localisée.",
          "**Polar agit comme marchand officiel et revendeur autorisé** de la transaction. Polar encaisse le paiement, calcule et reverse les taxes de vente applicables et met la facture ou le reçu à disposition dans le portail client. Le paiement est également soumis aux [Conditions acheteur de Polar](https://polar.sh/legal/checkout-buyer-terms), notamment à ses procédures de résiliation, remboursement et contestation.",
          "Vous pouvez arrêter les e-mails OneRead à tout moment grâce au lien de désabonnement en un clic présent dans chaque e-mail. Le désabonnement des e-mails ne résilie pas l'offre payante et n'arrête pas son renouvellement. Pour arrêter les futurs prélèvements, utilisez le portail sécurisé accessible après vérification de votre adresse e-mail sur la page d'abonnement. La résiliation de l'offre payante met fin aux renouvellements futurs ; sauf indication contraire ou obligation légale, elle ne crée pas automatiquement de droit à un remboursement pour la période en cours.",
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
          "Chaque e-mail OneArticle contient une **rédaction éditoriale originale** sur un article source, accompagnée d'un lien vers celui-ci. Nous résumons et commentons — nous ne reproduisons pas intégralement le contenu source et n'en publions pas de traduction complète. La source **demeure la propriété de son éditeur respectif**, et rien dans nos e-mails ne doit être interprété comme le fait qu'OneRead se présente comme cet éditeur ou bénéficie de son approbation.",
          "Nos e-mails sont fournis pour votre **usage personnel et non commercial**. Les noms OneRead et OneArticle, leur design, ainsi que les résumés et commentaires que nous rédigeons demeurent notre propriété ou celle de nos concédants de licence. Vous pouvez lire un e-mail et partager un lien vers celui-ci, mais vous ne pouvez pas copier, revendre, redistribuer, collecter ou archiver notre contenu de manière systématique.",
        ],
      },
      {
        heading: "Articles sources et liens vers des tiers",
        paragraphs: [
          "Nos e-mails renvoient vers des articles et d'autres contenus publiés par des tiers. Nous ne contrôlons pas ces sites et ne sommes pas responsables de leur disponibilité, de leur exactitude, de leur contenu ou de leurs conditions — y compris d'éventuels péages numériques. La consultation d'une page liée est soumise aux propres conditions et pratiques de confidentialité de cet éditeur.",
        ],
      },
      {
        heading: "Processus éditorial et exactitude",
        paragraphs: [
          "Les éditions OneArticle sont sélectionnées, rédigées, vérifiées et programmées par un éditeur humain. Des outils logiciels peuvent aider la recherche, la mise en forme et les contrôles qualité, mais aucune édition n'est envoyée sans validation éditoriale explicite. Malgré cette vérification, des erreurs ou simplifications restent possibles.",
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
          "Ces conditions sont régies par le droit de la **République de Türkiye**, sans égard aux règles de conflit de lois. Les protections impératives des consommateurs applicables dans votre pays restent inchangées. Si une disposition est jugée inapplicable, les autres restent en vigueur.",
        ],
      },
      {
        heading: "Contact",
        paragraphs: [
          "Des questions sur ces conditions ? Écrivez-nous à [hello@oneread.email](mailto:hello@oneread.email), ou répondez à n'importe quel e-mail OneRead.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "25 juillet 2026",
    intro: [
      "OneRead repose sur une idée simple : un e-mail réellement utile, rien de plus. Nous ne collectons que ce dont nous avons besoin pour faire fonctionner OneArticle, nous ne vendons jamais ces données et nous ne vous suivons pas sur le web.",
    ],
    sections: [
      {
        heading: "Qui nous sommes",
        paragraphs: [
          "OneRead est un abonnement éditorial indépendant exploité depuis la Türkiye. L'**opérateur OneRead** est responsable du traitement de vos informations. Vous pouvez le joindre et exercer vos droits à [hello@oneread.email](mailto:hello@oneread.email).",
        ],
      },
      {
        heading: "Informations que nous collectons",
        paragraphs: ["Lorsque vous vous inscrivez et utilisez OneRead, nous traitons :"],
        list: [
          "**Votre adresse e-mail** — pour pouvoir vous envoyer vos e-mails OneRead.",
          "**Votre langue de lecture** — la langue dans laquelle vous souhaitez recevoir OneArticle.",
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
          "Pour livrer l'édition dans la bonne langue de lecture.",
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
          "Les éditions OneArticle sont rédigées et programmées par notre équipe éditoriale. Nous pouvons faire appel à des prestataires d'infrastructure courants pour exploiter le service, mais les adresses e-mail des abonnés ne sont pas transmises à des prestataires de génération de contenu.",
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
          "Tant que votre offre payante ou votre relation de compte reste active, nous conservons les informations nécessaires, y compris vos préférences afin de pouvoir reprendre les e-mails sans tout reconfigurer. Le désabonnement des e-mails crée un enregistrement de suppression mais ne ferme pas l'offre payante. Après résiliation et fermeture du compte, nous supprimons ou anonymisons les préférences dans un délai raisonnable et ne conservons que les éléments nécessaires aux obligations fiscales, aux paiements, à la prévention de la fraude, aux recours juridiques et à la suppression.",
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
          "Des questions sur votre confidentialité, ou souhaitez-vous exercer l'un des droits ci-dessus ? Écrivez-nous à [hello@oneread.email](mailto:hello@oneread.email), ou répondez simplement à n'importe quel e-mail OneRead.",
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
