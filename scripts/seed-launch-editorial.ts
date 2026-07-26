import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const actor = "codex-launch-draft";
const reviewNote =
  "Launch draft prepared from the linked primary source. Human editor must verify every claim, add/approve a licensed hero image and credit, send a test email, and explicitly mark ready before scheduling.";

const articleTopics = [
  {
    sourceTitle: "NASA’s Webb Discovers Hidden Planet in Famous Star System",
    sourceName: "NASA Science",
    sourceUrl:
      "https://science.nasa.gov/missions/webb/nasas-webb-discovers-hidden-planet-in-famous-star-system/",
    en: {
      subject: "The planet Webb found by reading its chemical fingerprint",
      previewText: "Beta Pictoris d was hiding in a bright debris disk. Its atmosphere gave it away.",
      headline: "A planet appeared where astronomers were not looking",
      bodyText: `Astronomers pointed the James Webb Space Telescope at Beta Pictoris to study a planet they already knew. The data revealed another one.

Beta Pictoris is a young star about 63 light-years away, surrounded by a bright disk of dust and debris. Two giant planets had already been directly imaged there. The newly identified Beta Pictoris d remained difficult to see because the disk scatters so much light. Instead of trusting a bright spot in an image, researchers found a repeating pattern of carbon-monoxide absorption in Webb’s spectroscopic data. That chemical barcode, together with the object’s motion and position, showed that it was an orbiting planet.

The important part is the method. Spectroscopy did more than confirm an object: it immediately offered clues about atmosphere, temperature and movement. Webb may therefore find worlds hidden inside visually confusing systems by separating their molecular signatures from the surrounding glare. The discovery is a reminder that a better measurement can reveal what a sharper picture alone cannot.`,
      ctaLabel: "Read the NASA article",
    },
    tr: {
      subject: "Webb’in kimyasal parmak izinden bulduğu gezegen",
      previewText: "Beta Pictoris d parlak bir enkaz diskinin içinde saklanıyordu. Onu atmosferi ele verdi.",
      headline: "Gökbilimcilerin aramadığı yerde bir gezegen belirdi",
      bodyText: `Gökbilimciler James Webb Uzay Teleskobu’nu Beta Pictoris sisteminde zaten bildikleri bir gezegeni incelemek için kullandı. Verilerin içinde başka bir gezegen ortaya çıktı.

Beta Pictoris, Dünya’dan yaklaşık 63 ışık yılı uzakta bulunan genç bir yıldız. Çevresindeki parlak toz ve enkaz diski içinde daha önce iki dev gezegen doğrudan görüntülenmişti. Yeni tanımlanan Beta Pictoris d ise bu diskin saçtığı yoğun ışık nedeniyle seçilemiyordu. Araştırmacılar görüntüdeki parlak bir noktaya güvenmek yerine Webb’in tayf verilerinde tekrarlanan karbonmonoksit soğurma çizgilerini buldu. Bu kimyasal barkod, cismin hareketi ve konumuyla birleşince onun yörüngede dönen bir gezegen olduğunu gösterdi.

Asıl önemli olan kullanılan yöntem. Tayfölçüm yalnızca yeni bir cismin varlığını doğrulamadı; atmosferi, sıcaklığı ve hareketi hakkında da ilk anda bilgi sundu. Webb böylece görüntü olarak karmaşık sistemlerde saklanan dünyaları, çevredeki parıltıdan moleküler imzaları ayırarak bulabilir. Bazen daha keskin bir fotoğraftan önce daha iyi bir ölçüm gerekir.`,
      ctaLabel: "NASA yazısını oku",
    },
  },
  {
    sourceTitle: "New WHO guidelines: up to 45% of dementia risk could be prevented or delayed",
    sourceName: "World Health Organization",
    sourceUrl:
      "https://www.who.int/news/item/15-07-2026-new-who-guidelines--up-to-45--of-dementia-risk-could-be-prevented-or-delayed",
    en: {
      subject: "Dementia prevention is becoming a public-health project",
      previewText: "WHO’s new guidance shifts attention from an inevitable diagnosis to risks societies can reduce.",
      headline: "A large share of dementia risk may be changeable",
      bodyText: `Dementia is often discussed as an unavoidable consequence of ageing. New World Health Organization guidance makes a different point: a meaningful share of risk can be prevented or delayed.

The estimate does not mean that every case is preventable or that individuals are responsible for developing dementia. It means that health systems and governments have practical levers. Managing high blood pressure, diabetes and hearing loss; reducing tobacco and harmful alcohol use; supporting physical activity, education and social connection; and limiting air pollution can all form part of a prevention strategy. Many of these factors are shaped as much by access, income and public policy as by personal choice.

That changes the frame. Dementia care still requires diagnosis, treatment, support for families and respect for people already living with the condition. Prevention adds another layer: actions taken across a lifetime and across a whole population. The useful message is neither certainty nor blame. It is that brain health belongs inside ordinary public-health planning.`,
      ctaLabel: "Read the WHO guidance",
    },
    tr: {
      subject: "Demansın önlenmesi bir halk sağlığı projesine dönüşüyor",
      previewText: "DSÖ’nün yeni rehberi kaçınılmazlık yerine toplumların azaltabileceği risklere odaklanıyor.",
      headline: "Demans riskinin önemli bir bölümü değiştirilebilir olabilir",
      bodyText: `Demans çoğu zaman yaşlanmanın kaçınılmaz bir sonucu gibi anlatılıyor. Dünya Sağlık Örgütü’nün yeni rehberi daha farklı bir noktaya dikkat çekiyor: riskin anlamlı bir bölümü önlenebilir veya geciktirilebilir.

Bu tahmin her vakanın önlenebileceği ya da demans gelişen kişinin bundan sorumlu olduğu anlamına gelmiyor. Sağlık sistemleri ve yönetimler için somut araçlar bulunduğunu gösteriyor. Yüksek tansiyon, diyabet ve işitme kaybının yönetilmesi; tütün ve zararlı alkol kullanımının azaltılması; fiziksel hareket, eğitim ve sosyal bağların desteklenmesi; hava kirliliğinin sınırlandırılması birlikte bir önleme stratejisi oluşturabilir. Bu etkenlerin çoğu kişisel tercihler kadar erişim, gelir ve kamu politikalarıyla da şekilleniyor.

Bu bakış açısı çerçeveyi değiştiriyor. Tanı, tedavi, aile desteği ve bugün demansla yaşayan kişilerin hakları hâlâ vazgeçilmez. Önleme bunlara yaşam boyu ve toplum genelinde yürütülen yeni bir katman ekliyor. Yararlı mesaj kesinlik ya da suçlama değil; beyin sağlığının sıradan halk sağlığı planlamasının parçası olması gerektiği.`,
      ctaLabel: "DSÖ rehberini oku",
    },
  },
  {
    sourceTitle: "An effort recalibration framework for digital media use and cognition",
    sourceName: "Nature Human Behaviour",
    sourceUrl: "https://www.nature.com/articles/s41562-026-02500-w",
    en: {
      subject: "Maybe digital media changes what effort feels worth",
      previewText: "A new framework asks whether frictionless rewards recalibrate how we allocate attention.",
      headline: "The problem may not be lost ability, but a changed price for effort",
      bodyText: `Debates about phones and cognition often ask whether digital media is making people less capable. A perspective in Nature Human Behaviour proposes a subtler possibility: our abilities may remain, while our internal valuation of effort changes.

Many digital products offer immediate rewards with almost no friction. Focused reading, difficult practice and long projects ask for more effort before the reward arrives. Repeated exposure to that contrast could recalibrate the mind’s cost–benefit calculation. Low-effort exploration starts to feel unusually attractive, while sustained work feels overpriced. The authors present this as a framework to investigate, not a settled diagnosis of every user or platform.

That distinction matters. If the issue were simply declining capacity, the answer would be to train harder. If effort valuation is part of the mechanism, environments matter too: notifications, default choices, breaks, visible progress and the timing of rewards. The practical question becomes less moralistic. Instead of asking why people lack discipline, ask what their tools repeatedly teach them is worth the effort.`,
      ctaLabel: "Read the perspective",
    },
    tr: {
      subject: "Dijital medya hangi çabaya değeceğini değiştiriyor olabilir",
      previewText: "Yeni bir çerçeve, sürtünmesiz ödüllerin dikkati nasıl dağıttığını farklı bir açıdan ele alıyor.",
      headline: "Sorun yetenek kaybı değil, çabanın zihindeki fiyatı olabilir",
      bodyText: `Telefonlar ve biliş hakkındaki tartışmalar genellikle dijital medyanın insanları daha az yetenekli yapıp yapmadığını soruyor. Nature Human Behaviour’da yayımlanan bir perspektif daha ince bir olasılık öneriyor: yeteneklerimiz yerinde kalırken çabaya verdiğimiz değer değişiyor olabilir.

Birçok dijital ürün neredeyse hiç sürtünme olmadan anlık ödül sunuyor. Odaklanarak okumak, zor bir beceriyi çalışmak veya uzun bir projeyi bitirmek ise ödülden önce daha fazla emek istiyor. Bu farkın tekrar tekrar yaşanması, zihnin maliyet ve fayda hesabını yeniden ayarlayabilir. Düşük çabalı keşif normalden daha çekici, uzun süreli çalışma ise gereğinden pahalı hissedebilir. Yazarlar bunu herkes ve her platform için kesinleşmiş bir teşhis değil, araştırılacak bir çerçeve olarak sunuyor.

Bu ayrım önemli. Sorun yalnızca kapasite kaybı olsaydı çözüm daha çok çalışmak olurdu. Çabanın değeri de mekanizmanın parçasıysa bildirimler, varsayılan seçimler, molalar, görünür ilerleme ve ödülün zamanı gibi çevresel ayrıntılar önem kazanır. Soru “Neden irademiz yok?” olmaktan çıkar; “Kullandığımız araçlar bize tekrar tekrar neyin çabaya değer olduğunu öğretiyor?” haline gelir.`,
      ctaLabel: "Perspektifi oku",
    },
  },
  {
    sourceTitle: "A neural signature of sleep deprivation in the human brain",
    sourceName: "Nature Communications",
    sourceUrl: "https://www.nature.com/articles/s41467-026-75661-x",
    en: {
      subject: "Sleep loss leaves a recognizable pattern in the brain",
      previewText: "A connectivity signature generalized across independent datasets and natural differences in sleep.",
      headline: "The tired brain may carry a measurable network signature",
      bodyText: `Sleep deprivation is easy to describe subjectively and surprisingly difficult to measure with one biological signal. A new open-access study reports a pattern of brain connectivity that reliably tracked sleep loss across several datasets.

The researchers did not look for a single “sleep centre.” They examined how regions communicate as a network. The resulting signature appeared in experimental sleep-deprivation data and also related to ordinary variation in how long people slept. Generalization across independent samples is important because brain-imaging findings can otherwise fit one dataset without travelling well to another.

The result is not a consumer sleep test and it does not turn a scan into a diagnosis. Imaging is expensive, the pattern needs further validation, and sleepiness has many causes. Its value is conceptual and methodological: insufficient sleep may be visible in the organization of communication across the brain, not merely in one isolated area. A robust measure could eventually help researchers compare interventions and understand why the cognitive effects of lost sleep differ so much between people.`,
      ctaLabel: "Read the open-access study",
    },
    tr: {
      subject: "Uykusuzluk beyinde tanınabilir bir iz bırakıyor",
      previewText: "Bağlantı örüntüsü farklı veri setlerinde ve doğal uyku süresi farklılıklarında tekrarlandı.",
      headline: "Yorgun beynin ölçülebilir bir ağ imzası olabilir",
      bodyText: `Uyku yoksunluğunu öznel olarak anlatmak kolay, onu tek bir biyolojik işaretle ölçmek ise şaşırtıcı derecede zor. Açık erişimli yeni bir çalışma, birden fazla veri setinde uyku kaybını güvenilir biçimde izleyen bir beyin bağlantısı örüntüsü bildiriyor.

Araştırmacılar tek bir “uyku merkezi” aramadı. Beyin bölgelerinin bir ağ olarak nasıl iletişim kurduğunu inceledi. Elde edilen imza hem deneysel uyku yoksunluğu verilerinde görüldü hem de insanların normal hayatta ne kadar uyuduğundaki farklılıklarla ilişkiliydi. Sonucun bağımsız örneklemlerde tekrarlanması önemli; çünkü beyin görüntüleme bulguları bazen yalnızca geliştirildikleri veri setine iyi uyabilir.

Bu sonuç henüz tüketiciye yönelik bir uyku testi değil ve bir taramayı tanıya dönüştürmüyor. Görüntüleme pahalı, örüntünün daha fazla doğrulanması gerekiyor ve uykululuğun birçok nedeni var. Bulguyu değerli kılan şey yöntemsel yaklaşım: yetersiz uyku tek bir bölgede değil, beynin iletişim düzeninde görünür olabilir. Güvenilir bir ölçüm ileride müdahaleleri karşılaştırmaya ve uyku kaybının kişiden kişiye neden farklı etkiler yarattığını anlamaya yardımcı olabilir.`,
      ctaLabel: "Açık erişimli çalışmayı oku",
    },
  },
  {
    sourceTitle: "Digital disconnection as a self-regulatory strategy against procrastination",
    sourceName: "Scientific Reports",
    sourceUrl: "https://www.nature.com/articles/s41598-026-46218-1",
    en: {
      subject: "Disconnecting can be a strategy, not a purity test",
      previewText: "Research links deliberate digital disconnection with goal conflict, self-control and procrastination.",
      headline: "Putting the phone away works best when it serves a specific goal",
      bodyText: `“Digital detox” is often sold as a dramatic break from modern life. A Scientific Reports study treats disconnection more practically: as one tool people may use when digital media competes with something they intend to do.

The researchers examined the relationship between goal conflict, trait self-control, deliberate disconnection and procrastination. The useful idea is not that every minute online is harmful. It is that people are more likely to disconnect when they notice a conflict between an immediate digital reward and a longer-term task. Disconnection was in turn associated with less procrastination, although an observational relationship cannot by itself prove that switching off a device caused the improvement.

That caveat leaves a sensible experiment for everyday life. Define the task first, then remove the competing channel for a limited period: place the phone outside the room, block one site, or turn off a network connection until a clear stopping point. The goal is not technological purity. It is making the environment briefly agree with the intention you already chose.`,
      ctaLabel: "Read the open-access study",
    },
    tr: {
      subject: "Bağlantıyı kesmek bir arınma değil, strateji olabilir",
      previewText: "Araştırma bilinçli dijital kopuşu hedef çatışması, özdenetim ve ertelemeyle birlikte inceliyor.",
      headline: "Telefonu uzaklaştırmak belirli bir hedefe hizmet ettiğinde anlamlı",
      bodyText: `“Dijital detoks” çoğu zaman modern hayattan dramatik bir kopuş gibi pazarlanıyor. Scientific Reports’ta yayımlanan bir çalışma ise bağlantıyı kesmeyi daha pratik biçimde ele alıyor: dijital medya, yapmak istediğimiz başka bir işle yarıştığında kullanılabilecek özdenetim araçlarından biri.

Araştırmacılar hedef çatışması, kişilik düzeyindeki özdenetim, bilinçli bağlantı kesme ve erteleme arasındaki ilişkileri inceledi. Yararlı fikir internette geçirilen her dakikanın zararlı olması değil. İnsanlar anlık dijital ödülle uzun vadeli görev arasındaki çatışmayı fark ettiklerinde bağlantıyı kesmeye daha yatkın görünüyor. Bağlantıyı kesmek daha az ertelemeyle ilişkiliydi; ancak gözlemsel bir ilişki tek başına cihazı kapatmanın iyileşmeye neden olduğunu kanıtlamaz.

Bu sınırlama günlük yaşam için makul bir deneyi engellemiyor. Önce yapılacak işi tanımla, sonra rakip kanalı sınırlı bir süre için kaldır: telefonu başka odaya koy, tek bir siteyi engelle veya belirli bir bitiş noktasına kadar ağı kapat. Amaç teknolojik saflık değil; ortamı kısa süreliğine zaten seçtiğin niyetle aynı hizaya getirmek.`,
      ctaLabel: "Açık erişimli çalışmayı oku",
    },
  },
] as const;

const films = [
  {
    filmTitle: "Perfect Days",
    filmYear: 2023,
    director: "Wim Wenders",
    filmLanguage: "Japanese",
    runtimeMinutes: 124,
    sourceName: "Official film site",
    sourceUrl: "https://www.perfectdays-movie.jp/en/",
    en: {
      subject: "One quiet film for Saturday: Perfect Days",
      previewText: "A patient film about routine, attention and the richness hidden inside repetition.",
      bodyText: `Hirayama cleans public toilets in Tokyo. He wakes early, folds his bedding, waters his plants, chooses a cassette for the drive and begins the same careful work. Perfect Days could turn that routine into either misery or a lesson. Wim Wenders does neither. He watches closely enough for repetition to become a way of noticing difference.

The film is quiet but not empty. A changing patch of light, a song heard at the right moment, a brief game with a stranger or an awkward family visit alters the texture of a day. Kōji Yakusho’s performance keeps Hirayama private without making him blank; small changes in his face carry histories the screenplay refuses to overexplain.

Choose this when you want a film that lowers the volume without pretending life is simple. It rewards patience, a good screen and the willingness to let ordinary gestures accumulate. The pleasure is not in finding out what happens next. It is in learning how much can happen when someone truly pays attention.`,
    },
    tr: {
      subject: "Cumartesi için sakin bir film: Perfect Days",
      previewText: "Rutin, dikkat ve tekrarın içinde saklanan zenginlik üzerine sabırlı bir film.",
      bodyText: `Hirayama Tokyo’da umumi tuvaletleri temizliyor. Erken kalkıyor, yatağını topluyor, bitkilerini suluyor, yol için bir kaset seçiyor ve aynı özenli işe başlıyor. Perfect Days bu rutini kolayca sefalet ya da hayat dersi haline getirebilirdi. Wim Wenders ikisini de yapmıyor. Tekrarın içindeki farklılıkları görebilecek kadar yakından bakıyor.

Film sessiz ama boş değil. Değişen bir ışık parçası, doğru anda duyulan bir şarkı, yabancıyla oynanan kısa bir oyun veya gergin bir aile ziyareti günün dokusunu değiştiriyor. Kōji Yakusho, Hirayama’yı ifadesizleştirmeden içine kapalı tutuyor; yüzündeki küçük değişimler senaryonun açıklamayı reddettiği geçmişleri taşıyor.

Hayatın basit olduğunu iddia etmeden sesini kısan bir film istediğin akşam bunu seç. Sabır, iyi bir ekran ve sıradan hareketlerin birikmesine izin verme isteğini ödüllendiriyor. Haz, biraz sonra ne olacağını öğrenmekte değil; biri gerçekten dikkat ettiğinde ne kadar çok şey yaşanabildiğini görmekte.`,
    },
  },
  {
    filmTitle: "The Lunchbox",
    filmYear: 2013,
    director: "Ritesh Batra",
    filmLanguage: "Hindi",
    runtimeMinutes: 104,
    sourceName: "Sony Pictures Classics",
    sourceUrl: "https://www.sonyclassics.com/thelunchbox/",
    en: {
      subject: "One warm film for Saturday: The Lunchbox",
      previewText: "A misdelivered lunch opens a correspondence between two lonely people in Mumbai.",
      bodyText: `Mumbai’s lunchbox delivery system is famous for putting the right meal on the right desk. In Ritesh Batra’s film, one mistake sends Ila’s cooking to Saajan, a widowed office worker nearing retirement. A note travels back in the empty tins, then another. Their correspondence becomes a private room inside two constrained lives.

The Lunchbox is romantic without depending on grand declarations. Irrfan Khan and Nimrat Kaur build intimacy through handwriting, pauses, food and the things their characters cannot say to the people around them. The city is not a decorative backdrop; trains, offices, kitchens and delivery routes shape what is possible and what remains out of reach.

Watch it when you want warmth with a slight ache underneath. It is gentle, funny in small places and careful about loneliness. The film understands that being noticed can change a day before it changes a life. Keep the ending unspoiled: its restraint is part of what makes the correspondence feel real.`,
    },
    tr: {
      subject: "Cumartesi için sıcak bir film: The Lunchbox",
      previewText: "Yanlış teslim edilen bir öğle yemeği Mumbai’de yalnız iki insan arasında mektuplaşma başlatıyor.",
      bodyText: `Mumbai’nin yemek kutusu dağıtım sistemi doğru yemeği doğru masaya ulaştırmasıyla ünlü. Ritesh Batra’nın filminde tek bir hata, Ila’nın hazırladığı yemeği emekliliğe yaklaşan dul memur Saajan’a götürüyor. Boş kapların içinde bir not geri geliyor, sonra bir başkası. Bu yazışma, sınırları daralmış iki hayatın içinde özel bir oda açıyor.

The Lunchbox büyük ilanlara ihtiyaç duymadan romantik olabiliyor. Irrfan Khan ve Nimrat Kaur yakınlığı el yazısı, duraksamalar, yemek ve karakterlerin çevrelerindeki insanlara söyleyemediği şeylerle kuruyor. Şehir yalnızca dekor değil; trenler, ofisler, mutfaklar ve teslimat güzergâhları neyin mümkün olduğunu, neyin uzakta kaldığını belirliyor.

Altında hafif bir sızı taşıyan sıcak bir film istediğin akşam izle. Nazik, küçük yerlerde komik ve yalnızlık konusunda dikkatli. Film, fark edilmenin bir hayatı değiştirmeden önce tek bir günü değiştirebileceğini biliyor. Finali öğrenmeden başla; hikâyenin ölçülü kalışı bu yazışmayı gerçek hissettiren şeylerden biri.`,
    },
  },
] as const;

async function main() {
  let articleCreated = 0;
  let filmCreated = 0;

  for (const topic of articleTopics) {
    for (const readingLanguage of ["English", "Turkish"] as const) {
      const content = readingLanguage === "English" ? topic.en : topic.tr;
      const existing = await prisma.oneArticleIssue.findFirst({
        where: { readingLanguage, sourceUrl: topic.sourceUrl, createdBy: actor },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.oneArticleIssue.create({
        data: {
          readingLanguage,
          subject: content.subject,
          previewText: content.previewText,
          headline: content.headline,
          bodyText: content.bodyText,
          sourceTitle: topic.sourceTitle,
          sourceName: topic.sourceName,
          sourceUrl: topic.sourceUrl,
          ctaLabel: content.ctaLabel,
          adminNotes: reviewNote,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      articleCreated++;
    }
  }

  for (const film of films) {
    for (const emailLanguage of ["English", "Turkish"] as const) {
      const content = emailLanguage === "English" ? film.en : film.tr;
      const existing = await prisma.oneFilmIssue.findFirst({
        where: { emailLanguage, filmTitle: film.filmTitle, createdBy: actor },
        select: { id: true },
      });
      if (existing) continue;
      await prisma.oneFilmIssue.create({
        data: {
          emailLanguage,
          subject: content.subject,
          previewText: content.previewText,
          filmTitle: film.filmTitle,
          bodyText: content.bodyText,
          filmYear: film.filmYear,
          director: film.director,
          filmLanguage: film.filmLanguage,
          runtimeMinutes: film.runtimeMinutes,
          sourceName: film.sourceName,
          sourceUrl: film.sourceUrl,
          ctaLabel: emailLanguage === "English" ? "Open the official film page" : "Resmî film sayfasını aç",
          adminNotes: reviewNote,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      filmCreated++;
    }
  }

  console.log(JSON.stringify({ articleCreated, filmCreated }));
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
