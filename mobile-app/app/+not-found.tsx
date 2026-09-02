import { router } from "expo-router";
import { Screen } from "@/components/Screen";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";

export default function NotFound() {
  return <Screen><AppText variant="display" style={{ marginTop: 72 }}>That page isn’t here.</AppText><AppText style={{ marginTop: 12, marginBottom: 24 }}>OneRead only opens known, internal destinations.</AppText><Button onPress={() => router.replace("/")}>Return to OneRead</Button></Screen>;
}
