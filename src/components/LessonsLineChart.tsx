import { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop } from "react-native-svg";
import { useAppTheme } from "../theme/app-theme";
import { palette } from "../theme/palette";

type LessonsPerDayPoint = {
  date: string;
  lessons_completed: number;
};

type LessonsLineChartProps = {
  data: LessonsPerDayPoint[];
  height?: number;
};

function dayInitial(dateValue: string): string {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "-";

  const label = new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(parsed).replace(".", "");
  return label.charAt(0).toUpperCase();
}

export function LessonsLineChart({ data, height = 150 }: LessonsLineChartProps) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const yAxisWidth = 26;
  const plotWidth = Math.max(1, width - yAxisWidth);

  const points = useMemo(() => {
    if (!data.length || plotWidth <= 0) {
      return {
        labels: [] as string[],
        values: [] as number[],
        coords: [] as Array<{ x: number; y: number }>,
        maxValue: 1,
        chartHeight: 0,
        chartBottom: 0,
      };
    }

    const labels = data.map((item) => dayInitial(item.date));
    const values = data.map((item) => Math.max(0, item.lessons_completed));
    const maxValue = Math.max(1, ...values);

    const paddingHorizontal = 10;
    const chartTop = 14;
    const chartBottom = height - 28;
    const chartHeight = chartBottom - chartTop;
    const usableWidth = Math.max(1, plotWidth - paddingHorizontal * 2);
    const stepX = values.length > 1 ? usableWidth / (values.length - 1) : usableWidth;

    const coords = values.map((value, index) => {
      const ratio = maxValue > 0 ? value / maxValue : 0;
      const x = paddingHorizontal + index * stepX;
      const y = chartBottom - ratio * chartHeight;

      return { x, y };
    });

    return {
      labels,
      values,
      coords,
      maxValue,
      chartHeight,
      chartBottom,
    };
  }, [data, plotWidth, height]);

  const linePath = useMemo(() => {
    if (points.coords.length === 0) return "";

    return points.coords
      .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
      .join(" ");
  }, [points.coords]);

  const areaPath = useMemo(() => {
    if (points.coords.length === 0) return "";

    const first = points.coords[0];
    const last = points.coords[points.coords.length - 1];
    const path = points.coords
      .map((coord, index) => `${index === 0 ? "M" : "L"} ${coord.x} ${coord.y}`)
      .join(" ");

    return `${path} L ${last.x} ${points.chartBottom} L ${first.x} ${points.chartBottom} Z`;
  }, [points.coords, points.chartBottom]);

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth !== width) {
      setWidth(nextWidth);
    }
  };

  return (
    <View style={styles.wrapper} onLayout={handleLayout}>
      <View style={styles.chartRow}>
        <View style={[styles.yAxis, { width: yAxisWidth }]}>
          <Text style={[styles.axisTickText, { color: colors.textMuted }]}>{points.maxValue}</Text>
          <Text style={[styles.axisTickText, { color: colors.textMuted }]}>{Math.round(points.maxValue / 2)}</Text>
          <Text style={[styles.axisTickText, { color: colors.textMuted }]}>0</Text>
        </View>

        {plotWidth > 0 ? (
          <Svg width={plotWidth} height={height}>
            <Defs>
              <SvgGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={colors.primary} stopOpacity={0.35} />
                <Stop offset="100%" stopColor={colors.primary} stopOpacity={0.04} />
              </SvgGradient>
            </Defs>

            <Line x1={0} y1={height - 28} x2={plotWidth} y2={height - 28} stroke={colors.border} strokeWidth={1} />
            <Line x1={0} y1={14} x2={plotWidth} y2={14} stroke={colors.border} strokeWidth={1} opacity={0.5} />
            <Line x1={0} y1={(height - 28 + 14) / 2} x2={plotWidth} y2={(height - 28 + 14) / 2} stroke={colors.border} strokeWidth={1} opacity={0.35} />

            {areaPath ? <Path d={areaPath} fill="url(#lineArea)" /> : null}
            {linePath ? <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" /> : null}

            {points.coords.map((coord, index) => (
              <Circle key={`point-${index}`} cx={coord.x} cy={coord.y} r={4.2} fill={colors.primary} stroke={colors.cardBackground} strokeWidth={2} />
            ))}
          </Svg>
        ) : null}
      </View>

      <View style={[styles.labelsRow, { marginLeft: yAxisWidth }]}>
        {points.labels.map((label, index) => (
          <View key={`label-${index}`} style={styles.labelWrap}>
            <Text style={[styles.labelText, { color: colors.textSecondary }]}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  yAxis: {
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 28,
    alignItems: "flex-start",
  },
  axisTickText: {
    fontSize: 10,
    fontWeight: "700",
  },
  labelsRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  labelWrap: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  labelText: {
    fontSize: 11,
    fontWeight: "700",
    color: palette.slate700,
  },
});
