import { redirect } from "next/navigation";
export default function FilmSubscribeSuccessPage() {
  redirect("/waitlist?product=onefilm");
}
