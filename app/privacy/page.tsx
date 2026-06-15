import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy — One Read",
  description:
    "How One Read collects, uses, and protects your information. We collect only what we need to send you one curated article each morning.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="June 15, 2026">
      <p>
        One Read is built around a simple idea: one good read each morning, and
        nothing more. That restraint extends to your data. We collect only what
        we need to deliver your daily email, and we never sell it. This policy
        explains what we collect, why, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <p>When you sign up, you give us:</p>
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
      </ul>
      <p>
        We also process a limited amount of technical data needed to deliver
        email reliably — for example, delivery and bounce status. We do not run
        advertising trackers or build profiles of you across the web.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>To select and send one curated article summary each morning.</li>
        <li>To personalize that selection to your interests and languages.</li>
        <li>
          To operate, secure, and improve the service, and to respond if you
          contact us.
        </li>
      </ul>

      <h2>Email delivery</h2>
      <p>
        We use a third-party email provider (Resend) to deliver your daily
        email. They process your email address solely to send messages on our
        behalf and are not permitted to use it for any other purpose.
      </p>

      <h2>Data retention</h2>
      <p>
        We keep your information for as long as your subscription is active. If
        you unsubscribe, we retain only what is necessary to honor that request
        and to keep basic records, and we delete the rest within a reasonable
        period.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Unsubscribe anytime</strong> — every email includes a
          one-click unsubscribe link, and it takes effect immediately.
        </li>
        <li>
          <strong>Access or delete your data</strong> — you can ask us to show
          or delete the information we hold about you.
        </li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We do not sell your personal information. We share it only with the
        service providers that help us run One Read (such as our email
        provider), and only as needed to operate the service, or when required
        by law.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we make material changes, we will update the date above and, where
        appropriate, let you know by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about your privacy? Reply to any One Read email and we&apos;ll
        get back to you.
      </p>
    </LegalLayout>
  );
}
