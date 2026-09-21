import { PropsWithChildren } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleProp, useWindowDimensions, View, ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isNarrow = width < 360;
  const isCompactHeight = height < 700;
  const isLarge = width >= 700;
  const gutter = isNarrow ? 14 : width < 430 ? 18 : 20;
  const contentWidth = isLarge ? 720 : width;
  return { width, height, insets, isNarrow, isCompactHeight, isLarge, gutter, contentWidth };
}

export function ResponsiveScreen({
  children,
  keyboard = false,
  style
}: PropsWithChildren<{ keyboard?: boolean; style?: StyleProp<ViewStyle> }>) {
  const { colors } = useTheme();
  const content = (
    <SafeAreaView edges={["top", "left", "right", "bottom"]} style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
  if (!keyboard) return content;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {content}
    </KeyboardAvoidingView>
  );
}

export function ResponsiveContent({
  children,
  scroll = true,
  bottomPadding = 40,
  style
}: PropsWithChildren<{ scroll?: boolean; bottomPadding?: number; style?: StyleProp<ViewStyle> }>) {
  const { gutter, contentWidth } = useResponsiveLayout();
  const innerStyle: StyleProp<ViewStyle> = [
    {
      width: "100%",
      maxWidth: contentWidth,
      alignSelf: "center",
      paddingHorizontal: gutter,
      paddingBottom: bottomPadding
    },
    style
  ];
  if (!scroll) return <View style={innerStyle}>{children}</View>;
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={innerStyle}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
