import { View, Text, Image, ScrollView, TextInput } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButtom from "@/components/CustomButtom";

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
          <View className="flex-row gap-x-14 mt-5">
            <View className="border-solid border-b-2  border-primaryy">
              <Text className="text-primaryy font-bold text-xl ">SIGN IN</Text>
            </View>
            <Text className="text-gray text-xl">SIGN UP</Text>
          </View>
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            onChangeText={(text) => setTextInputValue(text)}
            value={textInputValue}
            placeholder="Username or email address"
            className="text-lg mt-12 bg-gray/40 w-[80%] w-[300px] text-gray  p-3 pb-4 rounded"
          />
          <TextInput
            autoCapitalize={"none"}
            autoCorrect={false}
            secureTextEntry={true}
            textContentType={"password"}
            onChangeText={(text) => setTextInputValuePassword(text)}
            value={textInputValuePassword}
            placeholder="Password"
            className="text-lg mt-4 bg-gray/40 w-[80%]  w-[300px] text-gray p-3 pb-4 rounded"
          />
          <Text className="text-primaryy mt-3 mr-[190px] font-light">
            Forgot password?
          </Text>
          <CustomButtom
            text="SIGN IN"
            handlePress={() => {}}
            containerStyles="w-[300px] mt-3"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default signIn;
