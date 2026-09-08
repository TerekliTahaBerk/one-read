/** Supported verification locales, including reading-language names and browser tags. */
const aliases: Record<string, string> = { english: "en", turkish: "tr", spanish: "es", french: "fr", german: "de" };
const supported = ["en", "tr", "es", "fr", "de"];

export function verificationLocale(value: unknown, acceptLanguage?: string | null): string {
  const normalize = (input: string) => {
    const name = input.trim().toLowerCase();
    const tag = aliases[name] ?? name.split(/[-_]/)[0];
    return supported.includes(tag) ? tag : undefined;
  };
  const explicit = typeof value === "string" ? normalize(value) : undefined;
  if (explicit) return explicit;
  const candidates = (acceptLanguage ?? "").split(",").map((part) => {
    const [tag, ...parameters] = part.trim().split(";");
    const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
    return { tag, q: quality ? Number(quality.trim().slice(2)) : 1 };
  }).filter(({ q }) => Number.isFinite(q) && q > 0 && q <= 1).sort((a, b) => b.q - a.q);
  return candidates.map(({ tag }) => normalize(tag)).find(Boolean) ?? "en";
}

export function verificationCopy(language: string | undefined, product: string, minutes: number) {
  const lang = verificationLocale(language);
  const copy = {
    en: {
      subject: `Your ${product} verification code`, heading: "Verify your email.",
      intro: "Enter this code to continue:",
      support: `Use this code to verify your email and continue with ${product}.`,
      expiry: `This code expires in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      security: "If you did not request this, you can ignore this email. Do not share this code.",
      tagline: "A quieter inbox. More room to think.",
    },
    tr: {
      subject: `${product} doğrulama kodunuz`, heading: "E-postanızı doğrulayın.",
      intro: "Devam etmek için bu kodu girin:",
      support: `E-postanızı doğrulamak ve ${product} ile devam etmek için bu kodu kullanın.`,
      expiry: `Bu kod ${minutes} dakika geçerlidir.`,
      security: "Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayabilirsiniz. Kodu kimseyle paylaşmayın.",
      tagline: "Daha sakin bir gelen kutusu. Düşünmeye daha çok alan.",
    },
    es: {
      subject: `Tu código de verificación de ${product}`, heading: "Verifica tu correo.",
      intro: "Introduce este código para continuar:",
      support: `Usa este código para verificar tu correo y continuar con ${product}.`,
      expiry: `Este código caduca en ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
      security: "Si no lo has solicitado, puedes ignorar este correo. No compartas este código.",
      tagline: "Una bandeja de entrada más tranquila. Más espacio para pensar.",
    },
    fr: {
      subject: `Votre code de vérification ${product}`, heading: "Vérifiez votre adresse e-mail.",
      intro: "Saisissez ce code pour continuer :",
      support: `Utilisez ce code pour vérifier votre adresse e-mail et continuer avec ${product}.`,
      expiry: `Ce code expire dans ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      security: "Si vous n’avez pas fait cette demande, vous pouvez ignorer cet e-mail. Ne partagez pas ce code.",
      tagline: "Une boîte de réception plus calme. Plus de place pour réfléchir.",
    },
    de: {
      subject: `Ihr Bestätigungscode für ${product}`, heading: "Bestätigen Sie Ihre E-Mail-Adresse.",
      intro: "Geben Sie diesen Code ein, um fortzufahren:",
      support: `Verwenden Sie diesen Code, um Ihre E-Mail-Adresse zu bestätigen und mit ${product} fortzufahren.`,
      expiry: `Dieser Code läuft in ${minutes} ${minutes === 1 ? "Minute" : "Minuten"} ab.`,
      security: "Falls Sie dies nicht angefordert haben, können Sie diese E-Mail ignorieren. Teilen Sie diesen Code nicht.",
      tagline: "Ein ruhigerer Posteingang. Mehr Raum zum Nachdenken.",
    },
  };
  return { lang, ...copy[lang as keyof typeof copy] };
}
