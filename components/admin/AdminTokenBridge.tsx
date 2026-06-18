"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Keeps token-based admin sessions usable across client navigation. Browser
 * login still uses the signed session cookie; this only helps the explicit
 * /admin?token=... fallback by appending the token to admin links and GET forms.
 */
export function AdminTokenBridge() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) return;

    const applyToken = () => {
      for (const link of document.querySelectorAll<HTMLAnchorElement>('a[href^="/admin"]')) {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("/admin/logout")) continue;
        const url = new URL(href, window.location.origin);
        if (!url.searchParams.has("token")) {
          url.searchParams.set("token", token);
          link.setAttribute("href", `${url.pathname}${url.search}${url.hash}`);
        }
      }

      for (const form of document.querySelectorAll<HTMLFormElement>('form[method="get"], form:not([method])')) {
        const action = form.getAttribute("action") ?? window.location.pathname;
        if (!action.startsWith("/admin") && !window.location.pathname.startsWith("/admin")) continue;
        let input = form.querySelector<HTMLInputElement>('input[name="token"]');
        if (!input) {
          input = document.createElement("input");
          input.type = "hidden";
          input.name = "token";
          form.appendChild(input);
        }
        input.value = token;
      }
    };

    applyToken();
    const observer = new MutationObserver(applyToken);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [token]);

  return null;
}
