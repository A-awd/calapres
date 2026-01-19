import { GiftBox, GiftItem, GiftWrap, Ribbon } from '@/types/bundleBuilder';

export const giftBoxes: GiftBox[] = [
  {
    id: 'box-1',
    name: 'Petit Box',
    nameAr: 'صندوق صغير',
    size: 'small',
    price: 45,
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400',
    maxItems: 3,
    dimensions: '15×15×10 cm',
    dimensionsAr: '15×15×10 سم',
  },
  {
    id: 'box-2',
    name: 'Elegance Box',
    nameAr: 'صندوق الأناقة',
    size: 'medium',
    price: 75,
    image: 'https://images.unsplash.com/photo-1607469256872-48074e807b0c?w=400',
    maxItems: 5,
    dimensions: '25×20×15 cm',
    dimensionsAr: '25×20×15 سم',
  },
  {
    id: 'box-3',
    name: 'Grand Luxury Box',
    nameAr: 'صندوق الفخامة الكبير',
    size: 'large',
    price: 120,
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400',
    maxItems: 8,
    dimensions: '35×30×20 cm',
    dimensionsAr: '35×30×20 سم',
  },
];

export const giftItems: GiftItem[] = [
  // Original items
  { id: 'item-1', name: 'Rose Bouquet Mini', nameAr: 'باقة ورد صغيرة', category: 'Flowers', categoryAr: 'الزهور', price: 85, image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300' },
  { id: 'item-2', name: 'Belgian Chocolates Box', nameAr: 'علبة شوكولاتة بلجيكية', category: 'Chocolate', categoryAr: 'الشوكولاتة', price: 65, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300' },
  { id: 'item-3', name: 'Oud Mini Perfume', nameAr: 'عطر عود صغير', category: 'Perfumes', categoryAr: 'العطور', price: 120, image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=300' },
  { id: 'item-4', name: 'Scented Candle', nameAr: 'شمعة معطرة', category: 'Home', categoryAr: 'المنزل', price: 45, image: 'https://images.unsplash.com/photo-1602607411766-d47d16e97303?w=300' },
  { id: 'item-5', name: 'Luxury Soap Set', nameAr: 'مجموعة صابون فاخرة', category: 'Beauty', categoryAr: 'الجمال', price: 55, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300' },
  { id: 'item-6', name: 'Gourmet Honey Jar', nameAr: 'عسل فاخر', category: 'Food', categoryAr: 'الطعام', price: 48, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300' },
  { id: 'item-7', name: 'Silk Scarf', nameAr: 'وشاح حرير', category: 'Fashion', categoryAr: 'الأزياء', price: 95, image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=300' },
  { id: 'item-8', name: 'Premium Tea Set', nameAr: 'مجموعة شاي فاخرة', category: 'Food', categoryAr: 'الطعام', price: 72, image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300' },
  { id: 'item-9', name: 'Teddy Bear', nameAr: 'دبدوب', category: 'Toys', categoryAr: 'الألعاب', price: 60, image: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?w=300' },
  { id: 'item-10', name: 'Dried Flowers Bunch', nameAr: 'باقة زهور مجففة', category: 'Flowers', categoryAr: 'الزهور', price: 68, image: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300' },
  
  // Ramadan items
  { id: 'item-11', name: 'Ramadan Lantern', nameAr: 'فانوس رمضان', category: 'Ramadan', categoryAr: 'رمضان', price: 85, image: 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=300' },
  { id: 'item-12', name: 'Prayer Mat', nameAr: 'سجادة صلاة', category: 'Ramadan', categoryAr: 'رمضان', price: 120, image: 'https://images.unsplash.com/photo-1585036156171-384164a8c465?w=300' },
  { id: 'item-13', name: 'Incense Burner', nameAr: 'مبخرة', category: 'Ramadan', categoryAr: 'رمضان', price: 75, image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=300' },
  { id: 'item-14', name: 'Tasbeeh Beads', nameAr: 'مسبحة', category: 'Ramadan', categoryAr: 'رمضان', price: 45, image: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=300' },
  { id: 'item-15', name: 'Dua Book', nameAr: 'دفتر أدعية', category: 'Ramadan', categoryAr: 'رمضان', price: 35, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300' },
  { id: 'item-16', name: 'Arabic Coffee Cups', nameAr: 'فناجين قهوة عربية', category: 'Ramadan', categoryAr: 'رمضان', price: 95, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300' },
  
  // Teacher's Day items
  { id: 'item-17', name: 'Teacher Mug', nameAr: 'كوب المعلم', category: 'Teacher', categoryAr: 'المعلم', price: 45, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300' },
  { id: 'item-18', name: 'Luxury Pen', nameAr: 'قلم فاخر', category: 'Stationery', categoryAr: 'القرطاسية', price: 85, image: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300' },
  { id: 'item-19', name: 'Elegant Notebook', nameAr: 'دفتر أنيق', category: 'Stationery', categoryAr: 'القرطاسية', price: 55, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300' },
  
  // Employee Appreciation items
  { id: 'item-20', name: 'Office Plant', nameAr: 'نبتة مكتب', category: 'Corporate', categoryAr: 'الشركات', price: 65, image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300' },
  { id: 'item-21', name: 'Thank You Card', nameAr: 'بطاقة شكر', category: 'Corporate', categoryAr: 'الشركات', price: 25, image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300' },
  { id: 'item-22', name: 'Leather Notebook', nameAr: 'دفتر جلدي', category: 'Corporate', categoryAr: 'الشركات', price: 95, image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300' },
  
  // Wellness items
  { id: 'item-23', name: 'Natural Honey', nameAr: 'عسل طبيعي', category: 'Wellness', categoryAr: 'العناية', price: 75, image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300' },
  { id: 'item-24', name: 'Premium Dates', nameAr: 'تمور فاخرة', category: 'Wellness', categoryAr: 'العناية', price: 55, image: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=300' },
  { id: 'item-25', name: 'Prayer Card', nameAr: 'بطاقة دعاء', category: 'Wellness', categoryAr: 'العناية', price: 20, image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300' },
  
  // Custom Experience items
  { id: 'item-26', name: 'Celebration Balloons', nameAr: 'بالونات احتفال', category: 'Custom', categoryAr: 'مخصص', price: 45, image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=300' },
  { id: 'item-27', name: 'Paper Filler', nameAr: 'حشو ورقي', category: 'Custom', categoryAr: 'مخصص', price: 15, image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=300' },
  { id: 'item-28', name: 'Fabric Filler', nameAr: 'حشو قماشي', category: 'Custom', categoryAr: 'مخصص', price: 25, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=300' },
  { id: 'item-29', name: 'Custom Name Card', nameAr: 'بطاقة اسم مخصصة', category: 'Custom', categoryAr: 'مخصص', price: 35, image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300' },
  { id: 'item-30', name: 'Audio QR Card', nameAr: 'بطاقة QR صوتية', category: 'Custom', categoryAr: 'مخصص', price: 55, image: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=300' },
];

export const giftWraps: GiftWrap[] = [
  { id: 'wrap-1', name: 'Classic Cream', nameAr: 'كريمي كلاسيكي', price: 15, image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=200', color: '#FDF5E6' },
  { id: 'wrap-2', name: 'Royal Gold', nameAr: 'ذهبي ملكي', price: 25, image: 'https://images.unsplash.com/photo-1607469256872-48074e807b0c?w=200', color: '#D4AF37' },
  { id: 'wrap-3', name: 'Elegant Burgundy', nameAr: 'عنابي أنيق', price: 20, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200', color: '#722F37' },
  { id: 'wrap-4', name: 'Midnight Black', nameAr: 'أسود منتصف الليل', price: 20, image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200', color: '#1C1C1C' },
  { id: 'wrap-5', name: 'Ramadan Green', nameAr: 'أخضر رمضاني', price: 25, image: 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=200', color: '#2E8B57' },
];

export const ribbons: Ribbon[] = [
  { id: 'ribbon-1', name: 'Satin Gold', nameAr: 'ساتان ذهبي', price: 10, color: '#D4AF37' },
  { id: 'ribbon-2', name: 'Velvet Burgundy', nameAr: 'مخمل عنابي', price: 12, color: '#722F37' },
  { id: 'ribbon-3', name: 'Silk White', nameAr: 'حرير أبيض', price: 10, color: '#FFFAFA' },
  { id: 'ribbon-4', name: 'Grosgrain Black', nameAr: 'جروسجرين أسود', price: 8, color: '#1C1C1C' },
  { id: 'ribbon-5', name: 'Emerald Green', nameAr: 'أخضر زمردي', price: 12, color: '#50C878' },
];

// Get items by category
export const getItemsByCategory = (category: string) =>
  giftItems.filter((item) => item.category === category);
