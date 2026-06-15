import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service — One Read",
  description:
    "The terms for using One Read — one curated article summary delivered to your inbox each morning.",
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="June 15, 2026">
      <p>
        These terms govern your use of One Read. By signing up for or using the
        service, you agree to them. If you don&apos;t agree, please don&apos;t
        use One Read.
      </p>

      <h2>The service</h2>
      <p>
        One Read sends you one curated article summary by email each morning,
        chosen to match the interests and language preferences you provide. We
        aim to deliver it reliably around 7 AM, but timing, frequency, and
        availability are provided on a best-effort basis and may change.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be able to form a binding agreement to use One Read, must be at
        least the minimum age required in your country, and must provide an
        email address you are authorized to use.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t sign up using an email address that isn&apos;t yours.</li>
        <li>
          Don&apos;t attempt to disrupt, overload, reverse-engineer, or gain
          unauthorized access to the service.
        </li>
        <li>
          Don&apos;t resell, redistribute, or systematically copy the summaries
          we send.
        </li>
        <li>Don&apos;t use One Read for any unlawful purpose.</li>
      </ul>

      <h2>Content and intellectual property</h2>
      <p>
        Each daily email contains an original summary and a link to the source
        article. Summaries are provided for your personal, non-commercial use.
        The underlying articles remain the property of their respective
        publishers, and the One Read name, design, and summaries remain ours or
        our licensors&apos;.
      </p>

      <h2>Disclaimers</h2>
      <p>
        One Read is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo;
        Summaries are generated to be accurate and useful, but they may contain
        errors or omissions and are not a substitute for reading the original
        source or for professional advice. We make no warranties about the
        service&apos;s availability, accuracy, or fitness for a particular
        purpose.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, One Read is not liable for any
        indirect, incidental, special, or consequential damages, or for any loss
        arising from your reliance on a summary, resulting from your use of, or
        inability to use, the service.
      </p>

      <h2>Cancellation and changes</h2>
      <p>
        You can stop the service at any time using the one-click unsubscribe
        link in any email. We may also modify, suspend, or discontinue the
        service, in whole or in part, at any time.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. When we do, we&apos;ll
        revise the date above. Continuing to use One Read after changes take
        effect means you accept the updated terms.
      </p>

      <h2>Governing law and severability</h2>
      <p>
        These terms are governed by the laws applicable where One Read is
        operated, without regard to conflict-of-law rules. If any provision is
        found unenforceable, the remaining provisions stay in full effect, and
        these terms make up the entire agreement between you and One Read
        regarding the service.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Email us at{" "}
        <a href="mailto:hello@oneread.com">hello@oneread.com</a>, or reply to any
        One Read email.
      </p>
    </LegalLayout>
  );
}
