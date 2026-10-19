

export const EditorTabs = [
  {
    name: "aipicker",
    icon: "./ai.png",
    label: "AI Prompt",
  },
  {
    name: "colorpicker",
    icon: "./swatch.png",
    label: "Garment Color",
  },
  {
    name: "textpicker",
    icon: "./text.png",
    label: "Text Decal",
  },
  {
    name: "filepicker",
    icon: "./file.png",
    label: "Image Decal",
  },
];

export const FilterTabs = [
  {
    name: "logoShirt",
    icon: "./logo-tshirt.png",
  },
  {
    name: "stylishShirt",
    icon: "./stylish-tshirt.png",
  },
  {
    name: "textShirt",
    icon: "./text.png",
  },
];

export const DecalTypes = {
  logo: {
    stateProperty: "logoDecal",
    filterTab: "logoShirt",
  },
  full: {
    stateProperty: "fullDecal",
    filterTab: "stylishShirt",
  },
};