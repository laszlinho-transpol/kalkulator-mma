// Layer (warstwa) catalog with defaults — Polish road construction.
export const LAYERS = {
  SMA:   { key: "SMA",   label: "SMA",   color: "#E67700", thickness_cm: 4, density_t_m3: 2.40, short: "SMA" },
  AC8S:  { key: "AC8S",  label: "AC8S",  color: "#F08C00", thickness_cm: 3, density_t_m3: 2.35, short: "AC8S" },
  AC11S: { key: "AC11S", label: "AC11S", color: "#D9480F", thickness_cm: 4, density_t_m3: 2.40, short: "AC11S" },
  AC11W: { key: "AC11W", label: "AC11W", color: "#C2410C", thickness_cm: 5, density_t_m3: 2.40, short: "AC11W" },
  AC16W: { key: "AC16W", label: "AC16W", color: "#9A3412", thickness_cm: 6, density_t_m3: 2.42, short: "AC16W" },
  AC22P: { key: "AC22P", label: "AC22P", color: "#6B4226", thickness_cm: 8, density_t_m3: 2.42, short: "AC22P" },
  KLSM:  { key: "KLSM",  label: "KŁSM",  color: "#5C3A21", thickness_cm: 8, density_t_m3: 2.20, short: "KŁSM" },
  INNE:  { key: "INNE",  label: "Inne",  color: "#1971C2", thickness_cm: 5, density_t_m3: 2.40, short: "Inne" },
};

export const LAYER_LIST = Object.values(LAYERS);

export const getLayer = (key) => {
  if (!key) return LAYERS.INNE;
  const k = String(key).toUpperCase();
  // KŁSM unicode normalization → ASCII KLSM
  const norm = k === "KŁSM" ? "KLSM" : k;
  return LAYERS[norm] || LAYERS.INNE;
};

export const STATUSES = {
  planned:     { key: "planned",     label: "Zaplanowany", short: "PLAN.", color: "#868E96", icon: "circle" },
  in_progress: { key: "in_progress", label: "W trakcie",   short: "TRAKT.", color: "#E67700", icon: "loader" },
  done:        { key: "done",        label: "Wykonany",    short: "WYKON.", color: "#40C057", icon: "check" },
};

export const STATUS_LIST = Object.values(STATUSES);

export const getStatus = (key) => STATUSES[key || "planned"] || STATUSES.planned;
