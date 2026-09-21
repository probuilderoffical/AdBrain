import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { authClient } from "@/auth/client";

export default function Index() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator /></View>;
  }

  return <Redirect href={session?.user ? "/chat" : "/auth"} />;
}