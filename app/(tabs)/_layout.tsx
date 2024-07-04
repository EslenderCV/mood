import { View, Text, Image } from "react-native";
import React, { ReactNode } from "react";
import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const TabsLayout = () => {
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: "#181818",
            borderTopColor: "#181818",
            height: 88,
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="home" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="home-outline" size={30} color="#5E17EB" />
              ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="compass" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="compass-outline" size={30} color="#5E17EB" />
              ),
          }}
        />
        <Tabs.Screen
          name="mood"
          options={{
            title: "",
            tabBarIcon: ({ focused }) => (
              <Image
                source={require("../../assets/mood.png")}
                resizeMode="contain"
                className="w-6 h-6"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="albums" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="albums-outline" size={30} color="#5E17EB" />
              ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "",
            tabBarIcon: ({ focused }) =>
              focused ? (
                <Ionicons name="close" size={30} color="#5E17EB" />
              ) : (
                <Ionicons name="menu" size={30} color="#5E17EB" />
              ),
          }}
        />
      </Tabs>
    </>
  );
};

export default TabsLayout;
