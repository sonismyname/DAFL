using Microsoft.EntityFrameworkCore;

namespace DAFL.Backend.Infrastructure.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AppDbContext context, ILogger logger)
    {
        try
        {
            logger.LogInformation("Ensuring database schema exists...");
            await context.Database.EnsureCreatedAsync();

            if (await context.Categories.AnyAsync())
            {
                logger.LogInformation("Database already seeded with categories.");
                return;
            }

            logger.LogInformation("Seeding 26 E-commerce Categories...");

            var categories = new List<Category>
            {
                new() { Name = "Đồ gia dụng & Đời sống", Slug = "gia-dung", Description = "Thiết bị và vật dụng gia đình tiện ích" },
                new() { Name = "Đồ ăn khô & Thực phẩm chế biến", Slug = "do-an-kho", Description = "Thực phẩm sấy khô, gia vị và đặc sản" },
                new() { Name = "Quần áo & Thời trang nam nữ", Slug = "quan-ao", Description = "Trang phục thời trang đón đầu xu hướng" },
                new() { Name = "Trang sức & Phụ kiện cao cấp", Slug = "trang-suc", Description = "Nhẫn, dây chuyền, bông tai tinh xảo" },
                new() { Name = "Cà phê nguyên chất & Dụng cụ pha chế", Slug = "ca-phe", Description = "Cà phê Robusta, Arabica và máy xay pha chế" },
                new() { Name = "Cá cảnh, Bể thủy sinh & Phụ kiện", Slug = "ca-canh", Description = "Cá cảnh, cây thủy sinh và máy lọc nước hồ cá" },
                new() { Name = "Thiết bị điện tử & Phụ kiện công nghệ", Slug = "dien-tu", Description = "Cáp sạc, tai nghe bluetooth, pin dự phòng" },
                new() { Name = "Máy tính & Thiết bị văn phòng", Slug = "may-tinh", Description = "Laptop, chuột không dây, bàn phím cơ" },
                new() { Name = "Mỹ phẩm & Chăm sóc sắc đẹp", Slug = "my-pham", Description = "Skincare, son môi, nước hoa chính hãng" },
                new() { Name = "Mẹ & Bé (Sữa, tã bỉm, đồ chơi)", Slug = "me-va-be", Description = "Sản phẩm an toàn dành riêng cho mẹ và bé" },
                new() { Name = "Sách & Văn phòng phẩm", Slug = "sach", Description = "Sách kinh tế, văn học, sổ tay và bút viết" },
                new() { Name = "Dụng cụ thể thao & Dã ngoại", Slug = "the-thao", Description = "Đồ tập gym, yoga, lều trại dã ngoại" },
                new() { Name = "Giày dép & Túi xách thời trang", Slug = "giay-dep", Description = "Giày thể thao, giày tây, balo và ví da" },
                new() { Name = "Phụ kiện ô tô & Xe máy", Slug = "xe-may-oto", Description = "Camera hành trình, mũ bảo hiểm, nhớt xe" },
                new() { Name = "Nội thất & Trang trí không gian sống", Slug = "noi-that", Description = "Bàn ghế, đèn trang trí, thảm trải sàn" },
                new() { Name = "Thiết bị âm thanh & Nhạc cụ", Slug = "am-thanh", Description = "Đàn guitar, micro thu âm, loa soundbar" },
                new() { Name = "Trà & Đồ uống thảo mộc", Slug = "tra-thao-moc", Description = "Trà shan tuyết, trà hoa cúc thanh nhiệt" },
                new() { Name = "Thực phẩm chức năng & Sức khỏe", Slug = "thuc-pham-chuc-nang", Description = "Vitamin, collagen, máy đo huyết áp" },
                new() { Name = "Đồ chơi & Mô hình sưu tầm", Slug = "do-choi", Description = "Mô hình Gundam, Lego, boardgame gia đình" },
                new() { Name = "Thú cưng & Phụ kiện chăm sóc", Slug = "thu-cung", Description = "Hạt cho chó mèo, cát vệ sinh, chuồng nệm" },
                new() { Name = "Cây cảnh & Làm vườn tại gia", Slug = "cay-canh", Description = "Sen đá, cây phong thủy để bàn, phân bón" },
                new() { Name = "Đồ thủ công mỹ nghệ & Quà tặng", Slug = "thu-cong-my-nghe", Description = "Gốm Bát Tràng, tranh thêu, nến thơm cao cấp" },
                new() { Name = "Đồng hồ thời trang & Smartwatch", Slug = "dong-ho", Description = "Đồng hồ cơ Automatic, smartwatch đo nhịp tim" },
                new() { Name = "Dụng cụ làm bánh & Đồ bếp chuyên sâu", Slug = "do-bep", Description = "Khuôn làm bánh, dao bếp Nhật, máy đánh trứng" },
                new() { Name = "Hành lý & Đồ du lịch", Slug = "du-lich", Description = "Vali kéo du lịch, túi chống nước, gối chữ U" },
                new() { Name = "Thiết bị nhà thông minh (Smart Home)", Slug = "smart-home", Description = "Khóa cửa vân tay, công tắc wifi thông minh" }
            };

            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();

            // Seed sample products across several categories
            var giaDungCat = categories.First(c => c.Slug == "gia-dung");
            var caPheCat = categories.First(c => c.Slug == "ca-phe");
            var caCanhCat = categories.First(c => c.Slug == "ca-canh");
            var dienTuCat = categories.First(c => c.Slug == "dien-tu");

            var products = new List<Product>
            {
                new()
                {
                    CategoryId = giaDungCat.Id,
                    Name = "Nồi chiên không dầu điện tử 6.5L",
                    Slug = "noi-chien-khong-dau-6-5l",
                    Description = "Công nghệ Rapid Air giảm 80% dầu mỡ, màn hình cảm ứng LED hiện đại.",
                    Price = 1250000,
                    Stock = 50,
                    ReservedStock = 0,
                    ImageUrl = "https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=600"
                },
                new()
                {
                    CategoryId = caPheCat.Id,
                    Name = "Cà phê Robusta Honey Lâm Đồng 500g",
                    Slug = "ca-phe-robusta-honey-500g",
                    Description = "Hương thơm đậm đà, vị đắng dịu hậu ngọt caramel tự nhiên.",
                    Price = 165000,
                    Stock = 100,
                    ReservedStock = 0,
                    ImageUrl = "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600"
                },
                new()
                {
                    CategoryId = caCanhCat.Id,
                    Name = "Bể cá mini để bàn thủy sinh kèm đèn LED",
                    Slug = "be-ca-mini-thuy-sinh-led",
                    Description = "Kích thước 30x15x20cm kính siêu trong, tích hợp lọc thác êm ái.",
                    Price = 450000,
                    Stock = 30,
                    ReservedStock = 0,
                    ImageUrl = "https://images.unsplash.com/photo-1522069169874-c58ec4b76be5?w=600"
                },
                new()
                {
                    CategoryId = dienTuCat.Id,
                    Name = "Tai nghe chống ồn chủ động ANC Pro",
                    Slug = "tai-nghe-chong-on-anc-pro",
                    Description = "Pin 40 giờ liên tục, âm thanh Hi-Res Audio sống động, kết nối Bluetooth 5.3.",
                    Price = 890000,
                    Stock = 40,
                    ReservedStock = 0,
                    ImageUrl = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"
                }
            };

            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();

            logger.LogInformation("Database seeding completed successfully with 26 categories and sample products.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while seeding the database: {Message}", ex.Message);
        }
    }
}
