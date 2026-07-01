const NUMBER_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0
});

const DECIMAL_FORMAT = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1
});

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi"];

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  const absValue = Math.abs(value);

  if (absValue < 1000) {
    return NUMBER_FORMAT.format(value);
  }

  const tier = Math.min(
    Math.floor(Math.log10(absValue) / 3),
    SUFFIXES.length - 1
  );
  const scaled = value / Math.pow(1000, tier);

  return `${DECIMAL_FORMAT.format(scaled)}${SUFFIXES[tier]}`;
}

export function formatRate(value: number) {
  return `${formatNumber(value)}/s`;
}

export function formatDuration(ms: number) {
  if (ms <= 0) {
    return "Ready";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function formatDateTime(timestamp: number) {
  if (!timestamp) {
    return "Never";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(timestamp));
}
