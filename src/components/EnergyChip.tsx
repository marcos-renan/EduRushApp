import LottieView from "lottie-react-native";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/app-theme";

type EnergyChipProps = {
  value: number;
};

const SLOT_HEIGHT = 16;

export const EnergyChip = memo(function EnergyChip({ value }: EnergyChipProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const { colors } = useAppTheme();

  const [displayValue, setDisplayValue] = useState(safeValue);
  const [incomingValue, setIncomingValue] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const committedValueRef = useRef(safeValue);
  const targetValueRef = useRef(safeValue);
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(true);
  const pulseRef = useRef<LottieView>(null);

  const slide = useRef(new Animated.Value(0)).current;

  const animateToLatestValue = useCallback(() => {
    if (isAnimatingRef.current || !isMountedRef.current) {
      return;
    }

    const from = committedValueRef.current;
    const to = targetValueRef.current;
    if (from === to) {
      return;
    }

    isAnimatingRef.current = true;
    const nextDirection: 1 | -1 = to > from ? 1 : -1;
    setDisplayValue(from);
    setDirection(nextDirection);
    setIncomingValue(to);
    slide.setValue(0);

    Animated.timing(slide, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isMountedRef.current) {
        return;
      }

      committedValueRef.current = to;
      setDisplayValue(to);
      setIncomingValue(null);
      slide.setValue(0);

      pulseRef.current?.reset();
      pulseRef.current?.play();

      isAnimatingRef.current = false;
      if (targetValueRef.current !== to) {
        animateToLatestValue();
      }
    });
  }, [slide]);

  useEffect(() => {
    targetValueRef.current = safeValue;
    animateToLatestValue();
  }, [animateToLatestValue, safeValue]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      slide.stopAnimation();
    };
  }, [slide]);

  const outgoingTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, direction === 1 ? -SLOT_HEIGHT : SLOT_HEIGHT],
  });

  const incomingTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 1 ? SLOT_HEIGHT : -SLOT_HEIGHT, 0],
  });

  return (
    <View style={[styles.chip, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
      <View style={styles.iconWrap}>
        <Image source={require("../../assets/icons/energy.png")} style={styles.icon} />
        <View pointerEvents="none" style={styles.pulseWrap}>
          <LottieView
            ref={pulseRef}
            source={require("../../assets/animations/energy.json")}
            autoPlay={false}
            loop={false}
            cacheComposition
            renderMode="HARDWARE"
            hardwareAccelerationAndroid
            style={styles.pulse}
          />
        </View>
      </View>

      <View style={styles.slotViewport}>
        {incomingValue === null ? (
          <Text style={[styles.valueText, { color: colors.primary }]}>{displayValue}</Text>
        ) : (
          <>
            <Animated.Text
              style={[
                styles.valueText,
                { color: colors.primary, transform: [{ translateY: outgoingTranslateY }] },
              ]}
            >
              {displayValue}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.valueText,
                styles.incomingValue,
                { color: colors.primary, transform: [{ translateY: incomingTranslateY }] },
              ]}
            >
              {incomingValue}
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    height: 30,
    minWidth: 66,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 15,
    height: 15,
    resizeMode: "contain",
  },
  pulseWrap: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  pulse: {
    width: 36,
    height: 36,
  },
  slotViewport: {
    height: SLOT_HEIGHT,
    minWidth: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: SLOT_HEIGHT,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  incomingValue: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
});
