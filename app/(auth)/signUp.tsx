import { View, Text } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScrollView } from "react-native";
import { Image } from "react-native";
import { TextInput } from "react-native";
import CustomButtom from "@/components/CustomButtom";
import { TouchableOpacity } from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const signUp = () => {
  const [textInputValue, setTextInputValue] = React.useState("");
  const [EmailInputValue, setEmailInputValue] = React.useState("");
  const [UserInputValue, setUserInputValue] = React.useState("");
  const [textInputValuePassword, setTextInputValuePassword] =
    React.useState("");
  const [textInputValueConfirmPassword, setTextInputValueConfirmPassword] =
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
            placeholder="Name"
            className="text-sm mt-62 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(text) => setUserInputValue(text)}
            value={UserInputValue}
            placeholder="Username"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(text) => setEmailInputValue(text)}
            value={EmailInputValue}
            placeholder="Email address"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={true}
            textContentType={"password"}
            onChangeText={(text) => setTextInputValuePassword(text)}
            value={textInputValuePassword}
            placeholder="Password"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray focus:border-primaryy"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={true}
            textContentType={"password"}
            onChangeText={(text) => setTextInputValueConfirmPassword(text)}
            value={textInputValueConfirmPassword}
            placeholder="Confirm password"
            className="text-sm mt-4 bg-gray/40 w-[300px] h-[40px] text-white pl-4 pb-1 rounded border-solid border border-gray focus:border-primaryy"
          />
          <CustomButtom
            text="CREATE ACCOUNT"
            handlePress={() => {}}
            containerStyles="w-[300px] mt-4 bg-primaryy"
            textStyles="text-white"
          />
          <View className="flex-row justify-center items-center w-full gap-3 mt-2">
            <View className="bg-gray w-[130px] h-[1px]"></View>
            <Text className="text-gray">OR</Text>
            <View className="bg-gray w-[130px] h-[1px]"></View>
          </View>
          <View className="mt-6 items-center justify-center">
            <TouchableOpacity
              activeOpacity={0.7}
              className={`rounded h-[40px] justify-center items-center bg-white w-[300px] flex-row`}
            >
              <View className="absolute left-3">
                <Ionicons name="logo-apple" size={20} />
              </View>
              <Text className={`text-primaryy text-base text-black font-bold`}>
                Sign up with Apple
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
                Sign up with Google
              </Text>
            </TouchableOpacity>
            <View className="mt-4 flex-row items-center justify-center">
              <Text className="text-white">Already have an account? </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/signIn")}
              >
                <Text className="text-primaryy font-bold">Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <StatusBar backgroundColor="black" style="light" />
    </SafeAreaView>
  );
};

export default signUp;
