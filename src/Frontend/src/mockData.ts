import { Category, Product } from './types';

export const FALLBACK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Đồ gia dụng & Đời sống', slug: 'gia-dung', description: 'Thiết bị và vật dụng gia đình tiện ích' },
  { id: 'cat-2', name: 'Đồ ăn khô & Thực phẩm chế biến', slug: 'do-an-kho', description: 'Thực phẩm sấy khô, gia vị và đặc sản' },
  { id: 'cat-3', name: 'Quần áo & Thời trang nam nữ', slug: 'quan-ao', description: 'Trang phục thời trang đón đầu xu hướng' },
  { id: 'cat-4', name: 'Trang sức & Phụ kiện cao cấp', slug: 'trang-suc', description: 'Nhẫn, dây chuyền, bông tai tinh xảo' },
  { id: 'cat-5', name: 'Cà phê nguyên chất & Dụng cụ pha chế', slug: 'ca-phe', description: 'Cà phê Robusta, Arabica và máy xay pha chế' },
  { id: 'cat-6', name: 'Cá cảnh, Bể thủy sinh & Phụ kiện', slug: 'ca-canh', description: 'Cá cảnh, cây thủy sinh và máy lọc nước hồ cá' },
  { id: 'cat-7', name: 'Thiết bị điện tử & Phụ kiện công nghệ', slug: 'dien-tu', description: 'Cáp sạc, tai nghe bluetooth, pin dự phòng' },
  { id: 'cat-8', name: 'Máy tính & Thiết bị văn phòng', slug: 'may-tinh', description: 'Laptop, chuột không dây, bàn phím cơ' },
  { id: 'cat-9', name: 'Mỹ phẩm & Chăm sóc sắc đẹp', slug: 'my-pham', description: 'Skincare, son môi, nước hoa chính hãng' },
  { id: 'cat-10', name: 'Mẹ & Bé (Sữa, tã bỉm, đồ chơi)', slug: 'me-va-be', description: 'Sản phẩm an toàn dành riêng cho mẹ và bé' },
  { id: 'cat-11', name: 'Sách & Văn phòng phẩm', slug: 'sach', description: 'Sách kinh tế, văn học, sổ tay và bút viết' },
  { id: 'cat-12', name: 'Dụng cụ thể thao & Dã ngoại', slug: 'the-thao', description: 'Đồ tập gym, yoga, lều trại dã ngoại' },
  { id: 'cat-13', name: 'Giày dép & Túi xách thời trang', slug: 'giay-dep', description: 'Giày thể thao, giày tây, balo và ví da' },
  { id: 'cat-14', name: 'Phụ kiện ô tô & Xe máy', slug: 'xe-may-oto', description: 'Camera hành trình, mũ bảo hiểm, nhớt xe' },
  { id: 'cat-15', name: 'Nội thất & Trang trí không gian sống', slug: 'noi-that', description: 'Bàn ghế, đèn trang trí, thảm trải sàn' },
  { id: 'cat-16', name: 'Thiết bị âm thanh & Nhạc cụ', slug: 'am-thanh', description: 'Đàn guitar, micro thu âm, loa soundbar' },
  { id: 'cat-17', name: 'Trà & Đồ uống thảo mộc', slug: 'tra-thao-moc', description: 'Trà shan tuyết, trà hoa cúc thanh nhiệt' },
  { id: 'cat-18', name: 'Thực phẩm chức năng & Sức khỏe', slug: 'thuc-pham-chuc-nang', description: 'Vitamin, collagen, máy đo huyết áp' },
  { id: 'cat-19', name: 'Đồ chơi & Mô hình sưu tầm', slug: 'do-choi', description: 'Mô hình Gundam, Lego, boardgame gia đình' },
  { id: 'cat-20', name: 'Thú cưng & Phụ kiện chăm sóc', slug: 'thu-cung', description: 'Hạt cho chó mèo, cát vệ sinh, chuồng nệm' },
  { id: 'cat-21', name: 'Cây cảnh & Làm vườn tại gia', slug: 'cay-canh', description: 'Sen đá, cây phong thủy để bàn, phân bón' },
  { id: 'cat-22', name: 'Đồ thủ công mỹ nghệ & Quà tặng', slug: 'thu-cong-my-nghe', description: 'Gốm Bát Tràng, tranh thêu, nến thơm cao cấp' },
  { id: 'cat-23', name: 'Đồng hồ thời trang & Smartwatch', slug: 'dong-ho', description: 'Đồng hồ cơ Automatic, smartwatch đo nhịp tim' },
  { id: 'cat-24', name: 'Dụng cụ làm bánh & Đồ bếp chuyên sâu', slug: 'do-bep', description: 'Khuôn làm bánh, dao bếp Nhật, máy đánh trứng' },
  { id: 'cat-25', name: 'Hành lý & Đồ du lịch', slug: 'du-lich', description: 'Vali kéo du lịch, túi chống nước, gối chữ U' },
  { id: 'cat-26', name: 'Thiết bị nhà thông minh (Smart Home)', slug: 'smart-home', description: 'Khóa cửa vân tay, công tắc wifi thông minh' }
];

export const FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    categoryId: 'cat-1',
    categoryName: 'Đồ gia dụng & Đời sống',
    name: 'Nồi chiên không dầu điện tử 6.5L RapidAir',
    slug: 'noi-chien-khong-dau-6-5l',
    description: 'Công nghệ Rapid Air giảm 80% dầu mỡ, màn hình cảm ứng LED hiện đại 8 chế độ nấu tiện lợi.',
    price: 1250000,
    availableStock: 48,
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600'
  },
  {
    id: 'prod-2',
    categoryId: 'cat-5',
    categoryName: 'Cà phê nguyên chất & Dụng cụ pha chế',
    name: 'Cà phê Robusta Honey Lâm Đồng 500g',
    slug: 'ca-phe-robusta-honey-500g',
    description: 'Hương thơm nồng nàn, vị đắng dịu hậu ngọt caramel tự nhiên, rang mộc chuẩn gu Việt.',
    price: 165000,
    availableStock: 95,
    imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600'
  },
  {
    id: 'prod-3',
    categoryId: 'cat-6',
    categoryName: 'Cá cảnh, Bể thủy sinh & Phụ kiện',
    name: 'Bể cá mini để bàn thủy sinh kèm đèn LED & Lọc',
    slug: 'be-ca-mini-thuy-sinh-led',
    description: 'Kính siêu trong 5 ly, kích thước 30x15x20cm, trang bị hệ thống lọc thác êm ái chống ồn.',
    price: 450000,
    availableStock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600'
  },
  {
    id: 'prod-4',
    categoryId: 'cat-7',
    categoryName: 'Thiết bị điện tử & Phụ kiện công nghệ',
    name: 'Tai nghe chụp tai chống ồn chủ động ANC Studio',
    slug: 'tai-nghe-chong-on-anc-pro',
    description: 'Pin 40 giờ liên tục, âm thanh Hi-Res Audio sống động, micro đàm thoại khử ồn AI thông minh.',
    price: 890000,
    availableStock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600'
  },
  {
    id: 'prod-5',
    categoryId: 'cat-2',
    categoryName: 'Đồ ăn khô & Thực phẩm chế biến',
    name: 'Hạt điều rang muối vỏ lụa Bình Phước Hộp 500g',
    slug: 'hat-dieu-rang-muoi-500g',
    description: 'Hạt to đều loại A cùi dày, thơm ngon béo ngậy, món ăn vặt lành mạnh giàu dinh dưỡng.',
    price: 145000,
    availableStock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600'
  },
  {
    id: 'prod-6',
    categoryId: 'cat-4',
    categoryName: 'Trang sức & Phụ kiện cao cấp',
    name: 'Dây chuyền bạc Ý 925 đính đá pha lê Swarovski',
    slug: 'day-chuyen-bac-y-925',
    description: 'Thiết kế giọt nước thanh lịch, phủ bạch kim sáng bóng bền màu theo thời gian.',
    price: 520000,
    availableStock: 18,
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600'
  },
  {
    id: 'prod-7',
    categoryId: 'cat-3',
    categoryName: 'Quần áo & Thời trang nam nữ',
    name: 'Áo Polo thể thao dệt kim thoáng khí Co-Giãn 4 Chiều',
    slug: 'ao-polo-the-thao-thoang-khi',
    description: 'Chất liệu Poly-Cool siêu nhẹ, thấm hút mồ hôi nhanh, form dáng regular fit tôn dáng.',
    price: 290000,
    availableStock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600'
  },
  {
    id: 'prod-8',
    categoryId: 'cat-26',
    categoryName: 'Thiết bị nhà thông minh (Smart Home)',
    name: 'Ổ cắm điện thông minh Wifi điều khiển từ xa Tuya',
    slug: 'o-cam-thong-minh-wifi-tuya',
    description: 'Hẹn giờ bật tắt quạt, đèn, bình nóng lạnh qua smartphone và trợ lý ảo Google Assistant.',
    price: 195000,
    availableStock: 42,
    imageUrl: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600'
  }
];
