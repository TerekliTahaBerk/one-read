import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — One Read",
  description:
    "How One Read collects, uses, and protects your information. We collect only what we need to send you one curated article each morning.",
};

/*
 * INTERNAL NOTE — NOT LEGAL ADVICE.
 * This is a launch-ready draft, not final legal copy. A qualified lawyer
 * (ideally one familiar with both KVKK and GDPR) must review before launch —
 * especially the data-controller identity, legal bases, international-transfer
 * safeguards, and the KVKK aydınlatma / explicit-consent separation. Resolve
 * the [bracketed] placeholders first.
 */

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 16, 2026">
      <p>
        One Read is built around a simple idea: one good read each morning, and
        nothing more. That restraint extends to your data. We collect only what
        we need to deliver your daily email, we never sell it, and we don&apos;t
        track you around the web. This policy explains what we collect, why, and
        the choices you have.
      </p>

      <h2>Who we are</h2>
      <p>
        One Read is the service that sends you one curated article summary each
        morning. The data controller responsible for your information is{" "}
        <strong>[Insert legal entity / data controller before launch]</strong>.
        You can reach us any time at{" "}
        <a href="mailto:hello@oneread.com">hello@oneread.com</a>.
      </p>

      <h2>Information we collect</h2>
      <p>When you sign up and use One Read, we process:</p>
      <ul>
        <li>
          <strong>Your email address</strong> — so we can send your one daily
          article summary.
        </li>
        <li>
          <strong>Your interests</strong> — the topics you select, used to match
          each morning&apos;s article to you.
        </li>
        <li>
          <strong>Your language preferences</strong> — your source language and
          the language you want summaries written in.
        </li>
        <li>
          <strong>Your subscription status</strong> — whether you&apos;re active,
          and any plan details if you&apos;re on a paid plan.
        </li>
        <li>
          <strong>Feedback clicks</strong> — if you tell us a summary was useful
          or not, so we can improve what we send.
        </li>
        <li>
          <strong>Email delivery status</strong> — whether a message was sent,
          bounced, or unsubscribed, so delivery stays reliable.
        </li>
        <li>
          <strong>Minimal technical logs</strong> — the limited records needed
          to operate and secure the service.
        </li>
      </ul>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>No advertising trackers.</li>
        <li>No selling of your personal data — ever.</li>
        <li>No cross-site profiling or following you around the web.</li>
      </ul>

      <h2>How we use your information</h2>
      <ul>
        <li>To select and send one curated article summary each morning.</li>
        <li>To personalize that selection to your interests and languages.</li>
        <li>To manage your subscription and handle unsubscribe requests.</li>
        <li>To improve the quality and reliability of the service.</li>
        <li>To prevent abuse and keep the service secure.</li>
      </ul>

      <h2>Legal bases</h2>
      <p>
        Where data-protection law requires a legal basis, we rely on your{" "}
        <strong>consent</strong> to send you the subscription email; on our{" "}
        <strong>legitimate interest</strong> in operating, securing, and
        improving One Read; and on <strong>compliance with legal obligations</strong>{" "}
        where that applies. We do not use your information for automated
        decisions that produce legal or similarly significant effects.
      </p>

      <h2>Email delivery providers</h2>
      <p>
        We use a third-party email provider (Resend) to deliver your daily
        email. They process your email and delivery data solely to send messages
        on our behalf and are not permitted to use it for any other purpose.
      </p>

      <h2>AI providers</h2>
      <p>
        We use automated and AI systems to help generate summaries. Where AI
        providers are involved, the <strong>article content and metadata</strong>{" "}
        we summarize may be processed by them. We don&apos;t send subscriber
        email addresses to AI providers unless it&apos;s necessary, and we aim to
        share only what&apos;s needed to produce a summary.
      </p>

      <h2>International transfers</h2>
      <p>
        Some of our providers operate infrastructure outside your country, so
        your data may be processed abroad. Where the law requires it, we rely on
        appropriate safeguards for those transfers.
      </p>

      <h2>Data retention</h2>
      <p>
        While your subscription is active, we keep the information we need to
        send your daily email. If you unsubscribe, we retain only what&apos;s
        necessary — such as a suppression record so we don&apos;t email you again
        and minimal logs — and we delete your other preference data within a
        reasonable period.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <strong>Unsubscribe anytime</strong> — every email includes a
          one-click unsubscribe link, and it takes effect immediately.
        </li>
        <li>
          <strong>Access, correct, or delete your data</strong> — you can ask us
          to show, fix, or delete the information we hold about you.
        </li>
        <li>
          <strong>Object or withdraw consent</strong> — you can ask us to stop
          processing your information, or withdraw consent, at any time.
        </li>
        <li>
          <strong>Complain to an authority</strong> — you can lodge a complaint
          with your local data-protection authority where applicable.
        </li>
      </ul>

      <h2>KVKK / GDPR Notice</h2>
      <p>
        For users in Türkiye and the EU/EEA, this policy also serves as our
        privacy notice (in Türkiye, the <em>aydınlatma metni</em>) describing how
        we process your personal data and the rights available to you. We keep
        this notice <strong>separate from any explicit consent</strong> we ask
        for: we don&apos;t bundle the notice and a consent statement into a single
        box, and we don&apos;t ask you to consent to processing you don&apos;t
        need in order to receive your daily email. Where consent is the basis for
        something, you can withdraw it at any time without affecting the service
        you&apos;ve already received.
      </p>

      <h2>Security</h2>
      <p>
        We use reasonable technical and organizational measures to protect your
        information against loss, misuse, and unauthorized access. No method of
        transmission or storage is completely secure, but we work to keep the
        data we hold safe and to limit it to what we actually need.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        One Read is not directed to children under 13 (or the minimum age in
        your country), and we do not knowingly collect their information. If you
        believe a child has signed up, contact us and we&apos;ll remove the data.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes, we will update the date above and, where
        appropriate, let you know by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy, or want to exercise a right above? Email us
        at <a href="mailto:hello@oneread.com">hello@oneread.com</a>, or simply
        reply to any One Read email.
      </p>
    </LegalLayout>
  );
}
