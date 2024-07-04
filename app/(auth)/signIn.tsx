import { View, Text, Image, ScrollView, TextInput } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButtom from "@/components/CustomButtom";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

const signIn = () => {
  const [textInputValue, setTextInputValue] = React.useState("");
  const [textInputValuePassword, setTextInputValuePassword] =
    React.useState("");

  return (
    <SafeAreaView className="bg-black h-full">
      <ScrollView>
        <View className="w-full items-center h-full">
          <Image
            source={require("../../assets/fullLogo.png")}
            className="w-[150px] h-[150px]"
            resizeMode="contain"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(text) => setTextInputValue(text)}
            value={textInputValue}
            placeholder="Username or email address"
            className="text-sm mt-10 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={true}
            textContentType={"password"}
            onChangeText={(text) => setTextInputValuePassword(text)}
            value={textInputValuePassword}
            placeholder="Password"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray"
          />
          <Text className="text-primaryy mt-4 ml-[190px] font-light">
            Forgot password?
          </Text>
          <CustomButtom
            text="SIGN IN"
            handlePress={() => {}}
            containerStyles="w-[300px] mt-4 bg-primaryy"
            textStyles="text-white"
          />
          <View className="flex-row justify-center items-center w-full gap-3 mt-6">
            <View className="bg-gray w-[130px] h-[1px]"></View>
            <Text className="text-gray">OR</Text>
            <View className="bg-gray w-[130px] h-[1px]"></View>
          </View>
          <View className="mt-14 items-center justify-center">
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-apple" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign in with Apple
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] mt-4 flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-google" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign in with Google
              </Text>
            </TouchableOpacity>
            <View className="mt-4">
              <Text className="text-white">
                Dont have an account?{" "}
                <Text className="text-primaryy font-semibold">Sign up</Text>
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar backgroundColor="black" style="light" />
    </SafeAreaView>
  );
};

export default signIn;
