export interface DarkStoreProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  stock: number;
  category: string;
  popularity: number;
}

export const DARK_STORE_PRODUCTS: DarkStoreProduct[] = [
  {
    id: 'p1',
    name: 'Lay\'s Classic Salted Chips 52g',
    price: 20.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a486cad8-1768508028054.png",
    alt: 'Yellow packet of Lays classic salted potato chips on white background',
    stock: 15,
    category: 'snacks',
    popularity: 95
  },
  {
    id: 'p2',
    name: 'Coca-Cola 600ml Pet Bottle',
    price: 40.00,
    image: "https://images.unsplash.com/photo-1565071490860-6b5d94161623",
    alt: 'Red Coca-Cola plastic bottle with condensation droplets on dark surface',
    stock: 20,
    category: 'beverages',
    popularity: 92
  },
  {
    id: 'p3',
    name: 'Classmate Spiral Notebook A4',
    price: 65.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_167e22848-1764767023868.png",
    alt: 'Blue spiral bound notebook with ruled pages on wooden desk',
    stock: 12,
    category: 'stationery',
    popularity: 88
  },
  {
    id: 'p4',
    name: 'Colgate MaxFresh Toothpaste 150g',
    price: 85.00,
    image: "https://images.unsplash.com/photo-1604708194645-4c0f5a958b56",
    alt: 'Blue and white Colgate toothpaste tube standing upright on white surface',
    stock: 8,
    category: 'essentials',
    popularity: 85
  },
  {
    id: 'p5',
    name: 'Parle-G Gold Biscuits 200g',
    price: 25.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1f45b93f0-1764867893118.png",
    alt: 'Yellow packet of Parle-G glucose biscuits with iconic girl logo',
    stock: 25,
    category: 'snacks',
    popularity: 98
  },
  {
    id: 'p6',
    name: 'Red Bull Energy Drink 250ml',
    price: 125.00,
    image: "https://images.unsplash.com/photo-1612635901022-20ae4c268753",
    alt: 'Silver and blue Red Bull energy drink can with logo on ice',
    stock: 10,
    category: 'beverages',
    popularity: 82
  },
  {
    id: 'p7',
    name: 'Reynolds Trimax Pen Pack of 10',
    price: 50.00,
    image: "https://images.unsplash.com/photo-1607316071469-e39010715604",
    alt: 'Pack of blue ballpoint pens arranged in row on white background',
    stock: 18,
    category: 'stationery',
    popularity: 90
  },
  {
    id: 'p8',
    name: 'Dettol Handwash Pump 200ml',
    price: 95.00,
    image: "https://images.unsplash.com/photo-1648127098017-7dd8c6832bd4",
    alt: 'Green Dettol liquid handwash bottle with pump dispenser',
    stock: 0,
    category: 'essentials',
    popularity: 87
  },
  {
    id: 'p9',
    name: 'Kurkure Masala Munch 90g',
    price: 30.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_11196000b-1765367841523.png",
    alt: 'Orange packet of Kurkure spicy masala flavored snacks',
    stock: 22,
    category: 'snacks',
    popularity: 91
  },
  {
    id: 'p10',
    name: 'Tropicana Orange Juice 1L',
    price: 110.00,
    image: "https://images.unsplash.com/photo-1599360889420-da1afaba9edc",
    alt: 'Orange Tropicana juice carton with fresh orange slice illustration',
    stock: 14,
    category: 'beverages',
    popularity: 86
  },
  {
    id: 'p11',
    name: 'Fevicol MR 50g Tube',
    price: 35.00,
    image: "https://images.unsplash.com/photo-1643648552339-45e9295e1489",
    alt: 'White Fevicol adhesive tube with red cap on craft supplies',
    stock: 16,
    category: 'stationery',
    popularity: 84
  },
  {
    id: 'p12',
    name: 'Vim Dishwash Bar 200g',
    price: 28.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_18b29fd45-1766903134981.png",
    alt: 'Green rectangular Vim dishwashing bar soap in wrapper',
    stock: 20,
    category: 'essentials',
    popularity: 89
  },
  {
    id: 'p13',
    name: 'Haldiram\'s Aloo Bhujia 200g',
    price: 55.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1351eab91-1765369362524.png",
    alt: 'Yellow packet of Haldirams crispy potato sev snack mix',
    stock: 3,
    category: 'snacks',
    popularity: 93
  },
  {
    id: 'p14',
    name: 'Bisleri Mineral Water 1L',
    price: 20.00,
    image: "https://images.unsplash.com/photo-1729926677747-1fa3f52c7452",
    alt: 'Clear plastic Bisleri water bottle with blue label',
    stock: 30,
    category: 'beverages',
    popularity: 96
  },
  {
    id: 'p15',
    name: 'Apsara Platinum Pencil Box',
    price: 45.00,
    image: "https://images.unsplash.com/photo-1599652301647-d5ee6100b577",
    alt: 'Box of graphite pencils with erasers on wooden surface',
    stock: 11,
    category: 'stationery',
    popularity: 83
  },
  {
    id: 'p16',
    name: 'Lizol Floor Cleaner 500ml',
    price: 105.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1a16f6f92-1768475728568.png",
    alt: 'Purple Lizol disinfectant floor cleaner bottle with handle',
    stock: 7,
    category: 'essentials',
    popularity: 81
  },
  {
    id: 'p17',
    name: 'Britannia Good Day Cookies 100g',
    price: 35.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_139b64c2c-1764919655481.png",
    alt: 'Red packet of Britannia butter cookies with chocolate chips',
    stock: 19,
    category: 'snacks',
    popularity: 94
  },
  {
    id: 'p18',
    name: 'Frooti Mango Drink 200ml',
    price: 20.00,
    image: "https://images.unsplash.com/photo-1623252142788-82b5c024aeb1",
    alt: 'Yellow Frooti mango juice tetra pack with straw',
    stock: 24,
    category: 'beverages',
    popularity: 97
  },
  {
    id: 'p19',
    name: 'Camlin Whiteboard Marker Set',
    price: 75.00,
    image: "https://images.unsplash.com/photo-1704136815966-67bb81862166",
    alt: 'Set of colorful whiteboard markers in plastic case',
    stock: 9,
    category: 'stationery',
    popularity: 80
  },
  {
    id: 'p20',
    name: 'Harpic Toilet Cleaner 500ml',
    price: 95.00,
    image: "https://images.unsplash.com/photo-1513169310-1d06d8e21812",
    alt: 'Blue Harpic toilet bowl cleaner bottle with angled nozzle',
    stock: 12,
    category: 'essentials',
    popularity: 79
  },
  {
    id: 'p21',
    name: 'Uncle Chips Spicy Treat 60g',
    price: 20.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1040ff953-1771531661213.png",
    alt: 'Red packet of Uncle Chips spicy potato wafers',
    stock: 17,
    category: 'snacks',
    popularity: 88
  },
  {
    id: 'p22',
    name: 'Maaza Mango Drink 600ml',
    price: 40.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_19737a672-1767173731714.png",
    alt: 'Orange Maaza mango juice bottle with fruit illustration',
    stock: 15,
    category: 'beverages',
    popularity: 90
  },
  {
    id: 'p23',
    name: 'Stapler with 1000 Pins',
    price: 85.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_197573b92-1770364219938.png",
    alt: 'Black metal stapler with box of staple pins on desk',
    stock: 6,
    category: 'stationery',
    popularity: 77
  },
  {
    id: 'p24',
    name: 'Surf Excel Detergent 500g',
    price: 115.00,
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_1aadd29ae-1771952093587.png",
    alt: 'Blue Surf Excel washing powder packet with stain removal formula',
    stock: 10,
    category: 'essentials',
    popularity: 85
  }];
