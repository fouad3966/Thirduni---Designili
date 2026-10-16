export const GARMENTS = [
  { id: 'tshirt', label: 'T-shirt', color: '#EFBD48' },
  { id: 'dress', label: 'Dress', color: '#141416' },
  { id: 'hoodie', label: 'Hoodie', color: '#ffffff' },
  { id: 'hat', label: 'Hat', color: '#2b2b30' },
  // White shows the shoe's own design; any other colour tints it.
  { id: 'shoes', label: 'Shoes', color: '#ffffff' },
];

export const isGarment = id => GARMENTS.some(garment => garment.id === id);
export const getGarment = id => GARMENTS.find(garment => garment.id === id) || GARMENTS[0];
