import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const EditLayout = () => {
  return (
    <>
      <Stack>
        <Stack.Screen
          name="editScreen"
          options={{
            headerShown: true,
            headerTitle: "Edit profile",
            headerStyle: {
              backgroundColor: "black",
            },
            contentStyle: {
              borderTopWidth: 0.2,
              borderTopColor: "#6D6D6D",
              backgroundColor: "black",
            },
            headerTitleStyle: {
              color: "white",
              fontWeight: "bold",
            },
          }}
        />
      </Stack>
      <StatusBar backgroundColor="black" style="light" />
    </>
  );
};

export default EditLayout;
