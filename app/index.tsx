import React from "react";
import { View, Image, ImageBackground, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Redirect, router } from "expo-router";
import CustomButtom from "@/components/CustomButtom";
import { useGlobalContext } from "@/context/GlobalProvider";
import * as Animatable from "react-native-animatable";
import { useLanguage } from "@/context/LanguageContext";

const AnimatableView = Animatable.View as any;

const Index = () => {
  const { loading, loggedIn } = useGlobalContext();
  const { t } = useLanguage();

  if (loading)
    return (
      <View className="w-full h-full bg-black justify-center items-center">
        <Image
          source={require("@/assets/fullLogo.png")}
          className="w-[200px]"
          resizeMode="contain"
        />
      </View>
    );

  if (!loading && loggedIn) return <Redirect href="/home" />;

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />
      <ImageBackground
        source={require("@/assets/onBoardingBG.jpg")}
        className="flex-1"
        resizeMode="cover"
      >
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute bottom-0 w-full h-[60%] bg-gradient-to-t from-black via-black/80 to-transparent" />
        <SafeAreaView className="flex-1 px-6">
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="w-full h-full justify-between py-6">
              <AnimatableView
                animation="zoomIn"
                duration={800}
                className="items-center mt-12"
              >
                <Image
                  source={require("@/assets/fullLogo.png")}
                  className="w-[160px] h-[90px]"
                  resizeMode="contain"
                />
              </AnimatableView>
              <View className="w-full mb-10">
                <AnimatableView animation="fadeInUp" delay={500} duration={500}>
                  <Text className="text-5xl text-white font-bold text-center tracking-tighter leading-[1.1]">
                    {t("onboarding.titleLine1")} {"\n"}
                    <Text className="text-[#5E17EB]">
                      {t("onboarding.titleLine2")}
                    </Text>
                  </Text>
                </AnimatableView>
                <AnimatableView animation="fadeIn" delay={700} duration={500}>
                  <Text className="text-zinc-300 text-center text-base font-medium mt-5 px-2 leading-6">
                    {t("onboarding.subtitle")}
                  </Text>
                </AnimatableView>
                <AnimatableView animation="bounceIn" delay={700} duration={800}>
                  <CustomButtom
                    text={t("onboarding.startButton")}
                    containerStyles="w-full mt-10 bg-[#5E17EB] rounded-2xl py-4 border border-white/10 shadow-xl shadow-[#5E17EB]/50"
                    textStyles="text-white font-bold text-lg tracking-wider"
                    handlePress={() => router.push("/signIn")}
                    loading={false}
                  />
                </AnimatableView>
                <AnimatableView animation="fadeIn" delay={2000}>
                  <Text className="text-zinc-500 text-[10px] mt-8 text-center uppercase tracking-widest opacity-60">
                    {t("onboarding.footer")}
                  </Text>
                </AnimatableView>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

export default Index;
