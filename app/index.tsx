import React from "react";
import { View } from "react-native";
import { Redirect } from "expo-router";
import { useGlobalContext } from "@/context/GlobalProvider";

/**
 * Root route ("/")
 *
 * Keep this screen extremely light.
 * Providers + Splash are handled in app/_layout.tsx.
 */
export default function Index() {
  const { loggedIn, loading } = useGlobalContext();

  // Avoid flashing the wrong screen during auth check.
  if (loading) return <View style={{ flex: 1, backgroundColor: "#000" }} />;

  return loggedIn ? <Redirect href="/home" /> : <Redirect href="/signIn" />;
}
