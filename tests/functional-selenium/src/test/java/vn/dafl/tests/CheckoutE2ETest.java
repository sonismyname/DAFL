package vn.dafl.tests;

import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.testng.Assert;
import org.testng.annotations.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Epic("DAFL Web Application")
@Feature("End-to-End Shopping & Checkout Flow")
public class CheckoutE2ETest extends BaseTest {

    private static final String PAYOS_CHECKSUM_KEY = "3a3ea89ceb36ac6477f7e5dc49e3b0abc8951ab1a932760ca78151670d19ef1f";

    @Test(description = "TC_UI_06: Full E2E Flow - Search, Add to Cart, Fake PayOS Checkout, Confirm Success and Back to Home")
    @Severity(SeverityLevel.BLOCKER)
    @Description("Kiểm thử toàn trình E2E: Tìm kiếm sản phẩm, thêm vào giỏ hàng, điền form thanh toán, kích hoạt giả lập PayOS thành công và quay trở lại trang chủ")
    public void testFullCheckoutE2EFlow() {
        // ==========================================
        // Bước 1: Mở trang chủ DAFL Store
        // ==========================================
        driver.get(baseUrl);
        sleep(1000);

        // ==========================================
        // Bước 2: Tìm kiếm sản phẩm
        // ==========================================
        WebElement searchInput = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='search-input']")));
        searchInput.clear();
        searchInput.sendKeys("Áo");
        sleep(1000);

        // ==========================================
        // Bước 3: Thêm sản phẩm vào giỏ hàng
        // ==========================================
        WebElement addToCartBtn = wait.until(
                ExpectedConditions.elementToBeClickable(By.cssSelector("button[data-testid^='add-to-cart-btn-']")));
        Assert.assertTrue(addToCartBtn.isDisplayed(), "Không tìm thấy nút Thêm vào giỏ hàng");
        addToCartBtn.click();
        sleep(1000);

        // ==========================================
        // Bước 4: Kiểm tra Giỏ hàng tự động mở ra
        // ==========================================
        WebElement cartDrawer = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='cart-drawer']")));
        Assert.assertTrue(cartDrawer.isDisplayed(), "Ngăn giỏ hàng không tự động mở sau khi thêm sản phẩm");

        // Điền thông tin giao hàng
        WebElement nameInput = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='checkout-name-input']")));
        nameInput.clear();
        nameInput.sendKeys("Nguyễn Văn Test");

        WebElement emailInput = driver.findElement(By.cssSelector("[data-testid='checkout-email-input']"));
        emailInput.clear();
        emailInput.sendKeys("tester@dafl.vn");

        WebElement phoneInput = driver.findElement(By.cssSelector("[data-testid='checkout-phone-input']"));
        phoneInput.clear();
        phoneInput.sendKeys("0987654321");

        WebElement addressInput = driver.findElement(By.cssSelector("[data-testid='checkout-address-input']"));
        addressInput.clear();
        addressInput.sendKeys("123 Đường Test E2E, Phường Bến Nghé, Quận 1, TP.HCM");
        sleep(1000);

        // ==========================================
        // Bước 4.1: Nhấn Thanh toán khi chưa đăng nhập -> Phải điều hướng về màn hình Đăng nhập (Auth Guard)
        // ==========================================
        WebElement submitBtn = driver.findElement(By.cssSelector("[data-testid='checkout-submit-btn']"));
        Assert.assertTrue(submitBtn.isEnabled(), "Nút thanh toán bị vô hiệu hóa");
        submitBtn.click();

        // Xác nhận điều hướng về màn hình Đăng nhập
        WebElement authModal = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='auth-modal']")));
        Assert.assertTrue(authModal.isDisplayed(), "Không điều hướng về màn hình Đăng nhập khi thanh toán không có Auth");
        sleep(1000);

        // Đăng nhập bằng tài khoản Demo để hoàn tất xác thực (Auth)
        WebElement demoBtn = wait.until(
                ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='demo-account-btn']")));
        demoBtn.click();
        sleep(500);

        WebElement loginSubmitBtn = driver.findElement(By.cssSelector("[data-testid='login-submit-btn']"));
        loginSubmitBtn.click();

        // ==========================================
        // Bước 4.2: Sau khi đăng nhập thành công, quay trở lại Giỏ hàng và tiến hành Thanh toán
        // ==========================================
        WebElement cartDrawerAfterAuth = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='cart-drawer']")));
        Assert.assertTrue(cartDrawerAfterAuth.isDisplayed(), "Không quay lại giỏ hàng sau khi đăng nhập thành công");
        sleep(1000);

        WebElement submitBtnAuth = wait.until(
                ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='checkout-submit-btn']")));
        submitBtnAuth.click();

        // ==========================================
        // Bước 5: Cổng thanh toán PayOS hiển thị
        // ==========================================
        WebElement paymentView = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='checkout-payment-view']")));
        Assert.assertTrue(paymentView.isDisplayed(), "Giao diện thanh toán PayOS không hiển thị");
        sleep(1500);

        // Lấy mã đơn hàng và số tiền từ giao diện
        WebElement orderCodeElem = driver.findElement(By.cssSelector("[data-testid='checkout-order-code']"));
        String orderCodeText = orderCodeElem.getText();
        long orderCode = extractOrderCode(orderCodeText);
        Assert.assertTrue(orderCode > 0, "Không nhận diện được mã đơn hàng hợp lệ");

        WebElement amountElem = driver.findElement(By.cssSelector("[data-testid='payment-total-amount']"));
        long amount = parseAmount(amountElem.getText());

        // ==========================================
        // Bước 6: Giả lập thanh toán PayOS thành công (Fake Webhook)
        // ==========================================
        simulatePayOSWebhookSuccess(orderCode, amount);
        sleep(1500);

        // Bấm nút kiểm tra nếu còn hiển thị
        try {
            List<WebElement> checkBtns = driver.findElements(By.cssSelector("[data-testid='simulate-payos-success-btn']"));
            if (!checkBtns.isEmpty() && checkBtns.get(0).isDisplayed()) {
                ((JavascriptExecutor) driver).executeScript("arguments[0].click();", checkBtns.get(0));
            }
        } catch (Exception ignored) {
        }

        // ==========================================
        // Bước 7: Xác nhận màn hình Thanh toán thành công!
        // ==========================================
        WebElement paidSuccessView = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='order-paid-view']")));
        Assert.assertTrue(paidSuccessView.isDisplayed(), "Màn hình thông báo thanh toán thành công không hiển thị");
        Assert.assertTrue(paidSuccessView.getText().contains("Thanh toán thành công"), "Nội dung xác nhận không chính xác");
        sleep(2000);

        // ==========================================
        // Bước 8: Bấm "Tiếp tục mua sắm" quay về trang chủ
        // ==========================================
        WebElement continueShoppingBtn = driver.findElement(By.cssSelector("[data-testid='continue-shopping-btn']"));
        continueShoppingBtn.click();
        sleep(1500);

        // Kiểm tra đã quay về trang chủ và logo thương hiệu hiển thị
        WebElement brandLogo = wait.until(
                ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='brand-logo']")));
        Assert.assertTrue(brandLogo.isDisplayed(), "Không quay lại được trang chủ sau khi hoàn tất đơn hàng");
    }

    /**
     * Bắn webhook giả lập thanh toán PayOS hợp lệ vào backend với chữ ký HMAC-SHA256
     */
    private void simulatePayOSWebhookSuccess(long orderCode, long amount) {
        String reference = "TEST_E2E_" + System.currentTimeMillis();
        String description = "DH " + orderCode;
        String dataString = "amount=" + amount + "&description=" + description + "&orderCode=" + orderCode + "&reference=" + reference;

        String signature = computeHmacSha256(dataString, PAYOS_CHECKSUM_KEY);

        String jsScript = String.format(
            "fetch('/api/payments/payos-webhook', {" +
            "  method: 'POST'," +
            "  headers: { 'Content-Type': 'application/json' }," +
            "  body: JSON.stringify({" +
            "    code: '00'," +
            "    desc: 'success'," +
            "    data: {" +
            "      orderCode: %d," +
            "      amount: %d," +
            "      description: '%s'," +
            "      accountNumber: '9999888877'," +
            "      reference: '%s'" +
            "    }," +
            "    signature: '%s'" +
            "  })" +
            "}).catch(console.warn);",
            orderCode, amount, description, reference, signature
        );

        ((JavascriptExecutor) driver).executeScript(jsScript);
    }

    private static String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Lỗi tính HMAC-SHA256 webhook PayOS", e);
        }
    }

    private static long extractOrderCode(String text) {
        Matcher matcher = Pattern.compile("(\\d+)").matcher(text);
        if (matcher.find()) {
            return Long.parseLong(matcher.group(1));
        }
        return 0;
    }

    private static long parseAmount(String text) {
        String clean = text.replaceAll("[^0-9]", "");
        return clean.isEmpty() ? 0 : Long.parseLong(clean);
    }
}
