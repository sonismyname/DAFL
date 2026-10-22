package vn.dafl.tests;

import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.nio.file.Files;
import java.nio.file.Path;

@Epic("DAFL Web Application")
@Feature("Product Detail Image Gallery")
public class ProductGalleryTest extends BaseTest {

    private boolean isImageLoaded(WebElement img) {
        Object ok = ((JavascriptExecutor) driver).executeScript(
                "return arguments[0].complete && arguments[0].naturalWidth > 0;", img);
        return Boolean.TRUE.equals(ok);
    }

    private int totalImages() {
        String counter = driver.findElement(By.cssSelector("[data-testid='product-gallery-counter']")).getText();
        return Integer.parseInt(counter.split("/")[1].trim());
    }

    @Test(description = "TC_UI_07: Product detail shows an image gallery that can be swiped through")
    @Severity(SeverityLevel.NORMAL)
    @Description("Mở chi tiết sản phẩm, kiểm tra thư viện có nhiều ảnh, lướt Tiếp/Trước và chọn ảnh thu nhỏ; mọi ảnh đều tải được (không 404)")
    public void testProductGallerySwipe() throws Exception {
        driver.get(baseUrl);

        WebElement firstCard = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector(".product-card")));
        firstCard.click();

        WebElement main = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid='product-gallery-main']")));
        int total = totalImages();
        Assert.assertTrue(total >= 2, "Sản phẩm cần có nhiều ảnh, hiện có: " + total);
        Assert.assertEquals(driver.findElement(By.cssSelector("[data-testid='product-gallery-counter']")).getText(), "1/" + total);
        Assert.assertTrue(isImageLoaded(main), "Ảnh đầu tiên không tải được (404?)");

        String firstSrc = main.getAttribute("src");

        // Lướt tới: ảnh đổi, bộ đếm 2/N, ảnh mới tải được
        driver.findElement(By.cssSelector("[data-testid='product-gallery-next']")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='product-gallery-counter']"), "2/" + total));
        WebElement second = driver.findElement(By.cssSelector("[data-testid='product-gallery-main']"));
        Assert.assertNotEquals(second.getAttribute("src"), firstSrc, "Ảnh không thay đổi sau khi bấm Tiếp");
        wait.until(d -> isImageLoaded(driver.findElement(By.cssSelector("[data-testid='product-gallery-main']"))));

        // Duyệt hết các ảnh: tất cả phải tải được
        for (int i = 3; i <= total; i++) {
            driver.findElement(By.cssSelector("[data-testid='product-gallery-next']")).click();
            wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='product-gallery-counter']"), i + "/" + total));
            wait.until(d -> isImageLoaded(driver.findElement(By.cssSelector("[data-testid='product-gallery-main']"))));
        }

        // Quay vòng về ảnh đầu, rồi chọn lại bằng thumbnail
        driver.findElement(By.cssSelector("[data-testid='product-gallery-next']")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='product-gallery-counter']"), "1/" + total));
        driver.findElement(By.cssSelector("[data-testid='product-gallery-thumb-" + (total - 1) + "']")).click();
        wait.until(ExpectedConditions.textToBe(By.cssSelector("[data-testid='product-gallery-counter']"), total + "/" + total));

        // Tuỳ chọn: lưu ảnh chụp màn hình để xem bằng mắt (-Dscreenshot.dir=...)
        String dir = System.getProperty("screenshot.dir");
        if (dir != null && !dir.isEmpty()) {
            byte[] png = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
            Files.createDirectories(Path.of(dir));
            Files.write(Path.of(dir, "product-gallery.png"), png);
        }
    }
}
