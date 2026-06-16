import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — One Read",
  description:
    "The terms for using One Article, a One Read product — one curated article summary delivered to your inbox each morning.",
};

/*
 * INTERNAL NOTE — NOT LEGAL ADVICE.
 * This is a launch-ready draft, not final legal copy. A qualified lawyer
 * (ideally one familiar with both KVKK and GDPR) must review before launch —
 * especially governing law, the operating entity, payment-processor terms, and
 * the limitation of liability. Resolve the [bracketed] placeholders first.
 */

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="June 16, 2026">
      <p>
        These terms govern your use of One Article, a One Read product. By
        signing up for or using the service, you agree to them. If you
        don&apos;t agree, please don&apos;t use One Article. Please read them
        alongside our{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>The service</h2>
      <p>
        One Article, a One Read product, sends you one curated article summary
        by email each morning, chosen to match the interests and language
        preferences you provide. We aim to deliver it reliably around 7 AM, but
        timing, frequency, and availability are provided on a best-effort basis
        and may change. We don&apos;t guarantee uninterrupted or error-free
        delivery.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be able to form a binding agreement to use One Article, must be
        at least the minimum age required in your country, and must provide an
        email address you are authorized to use.
      </p>

      <h2>Account and email responsibility</h2>
      <p>
        You&apos;re responsible for the email address you sign up with and for
        keeping access to it secure. Use only an address that belongs to you or
        that you have permission to use. If you ever lose access to it, you can
        unsubscribe and sign up again with a new one.
      </p>

      <h2>Subscription, billing, and cancellation</h2>
      <p>
        One Article may be offered as a paid subscription. If you subscribe to a
        paid plan, the current options are a monthly plan and a yearly plan, at
        the prices shown on our <a href="/article/pricing">pricing page</a> at
        the time you subscribe. Prices may change for future billing periods, and
        we&apos;ll make any change clear before it applies to you.
      </p>
      <p>
        You can cancel at any time using the one-click unsubscribe link in any
        email. Cancellation stops future emails and future renewals; unless
        otherwise stated or required by law, it doesn&apos;t automatically
        create a right to a refund for the current period.
      </p>
      <p>
        {/* Placeholder — wire in before paid plans go live. */}
        Payments, if and when enabled, will be handled by a third-party payment
        processor, and your purchase will also be subject to that
        processor&apos;s terms.{" "}
        <strong>
          [Payment processor terms — e.g. Stripe / Lemon Squeezy — to be added
          before paid plans launch]
        </strong>
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t sign up using an email address that isn&apos;t yours.</li>
        <li>
          Don&apos;t attempt to disrupt, overload, reverse-engineer, or gain
          unauthorized access to the service.
        </li>
        <li>
          Don&apos;t scrape, archive, resell, redistribute, or systematically
          copy the summaries we send.
        </li>
        <li>Don&apos;t use One Article for any unlawful purpose.</li>
      </ul>

      <h2>Content and intellectual property</h2>
      <p>
        Each daily email contains an{" "}
        <strong>original summary and commentary</strong> written for One Article,
        together with a link to the source article. We summarize and comment —
        we don&apos;t reproduce articles in full and we don&apos;t publish full
        translations of them. The underlying articles{" "}
        <strong>remain the property of their respective publishers</strong>, and
        nothing in our emails should be read as One Article claiming to be the
        publisher of a source article or as an endorsement by that publisher.
      </p>
      <p>
        Summaries are provided for your <strong>personal, non-commercial use</strong>.
        The One Read and One Article names, design, and the summaries and
        commentary we write remain ours or our licensors&apos;. You may read and
        share a link to a summary, but you may not copy, resell, redistribute,
        scrape, or archive our summaries on a systematic basis.
      </p>

      <h2>Source articles and third-party links</h2>
      <p>
        Our emails link to articles published by third parties. We don&apos;t
        control those sites and aren&apos;t responsible for their availability,
        accuracy, content, or terms — including any paywalls. Visiting a linked
        article is subject to that publisher&apos;s own terms and privacy
        practices.
      </p>

      <h2>AI-generated summaries</h2>
      <p>
        Our summaries are produced with the help of automated and AI systems. As
        a result, they may contain errors, omissions, or simplifications, and
        they may not capture the full context or nuance of the original. Treat
        each summary as a starting point: for anything that matters, read the
        source article. Summaries are not professional advice — legal,
        financial, medical, or otherwise — and shouldn&apos;t be relied on as a
        substitute for it.
      </p>

      <h2>Disclaimers</h2>
      <p>
        One Article is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
        We work to make summaries accurate and useful, but we make no warranties
        about the service&apos;s availability, accuracy, reliability, or fitness
        for a particular purpose, to the fullest extent permitted by law.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, One Article is not liable for any
        indirect, incidental, special, or consequential damages, or for any loss
        arising from your reliance on a summary or from your use of, or
        inability to use, the service.
      </p>

      <h2>Changes, suspension, or termination</h2>
      <p>
        You can stop the service at any time using the one-click unsubscribe
        link in any email. We may also modify, suspend, or discontinue the
        service, in whole or in part, at any time, and we may end or limit access
        where necessary to protect the service or comply with the law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we do, we&apos;ll
        revise the date above. Continuing to use One Article after changes take
        effect means you accept the updated terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of{" "}
        <strong>[Insert governing jurisdiction before launch]</strong>, without
        regard to conflict-of-law rules. If any provision is found
        unenforceable, the remaining provisions stay in full effect, and these
        terms make up the entire agreement between you and One Read regarding
        One Article.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email us at{" "}
        <a href="mailto:hello@oneread.com">hello@oneread.com</a>, or reply to
        any One Article email.
      </p>
    </LegalLayout>
  );
}
