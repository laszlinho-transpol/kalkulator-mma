// Layer (warstwa) catalog — fixed list per user requirement
export const LAYERS = {
  SMA:   { key: "SMA",   label: "SMA",            color: "#E67700", short: "SMA" },
  AC_W:  { key: "AC_W",  label: "AC W (wiążąca)", color: "#D9480F", short: "AC W" },
  AC_P:  { key: "AC_P",  label: "AC P (podb.)",   color: "#5C3A21", short: "AC P" },
  BETON: { key: "BETON", label: "Beton",          color: "#495057", short: "Beton" },
  INNE:  { key: "INNE",  label: "Inne",           color: "#1971C2", short: "Inne" },
};

export const LAYER_LIST = Object.values(LAYERS);

export const getLayer = (key) => LAYERS[(key || "INNE").toUpperCase()] || LAYERS.INNE;
