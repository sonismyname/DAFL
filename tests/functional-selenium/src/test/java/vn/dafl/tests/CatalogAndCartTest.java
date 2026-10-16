package vn.dafl.tests;

import io.qameta.allure.Description;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.openqa.selenium.By;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.util.List;

@Epic("DAFL Web Application")
@Feature("Product Catalog and Shopping Cart")
public class CatalogAndCartTest extends BaseTest {

    @Test(description = "TC_UI_03: Verify product catalog displays product cards")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Kiểm tra danh mục sản phẩm tải và hiển thị danh sách thẻ sản phẩm trên giao diện")
    public void testProductCatalogDisplaysCards() {
        driver.get(baseUrl);

        wait.until(ExpectedConditions.presenceOfElementLocated(By.cssSelector(".product-card, [data-testid='product-card']")));
        List<WebElement> cards = driver.findElements(By.cssSelector(".product-card, [data-testid='product-card']"));
        Assert.assertTrue(cards.size() > 0, "Không có sản phẩm nào được hiển thị");
    }

    @Test(description = "TC_UI_04: Verify clicking cart button opens Cart Drawer")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Kiểm tra nút Giỏ hàng trên Header mở ngăn giỏ hàng thành công")
    public void testOpenCartDrawer() {
        driver.get(baseUrl);

        WebElement cartBtn = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='cart-btn']")));
        cartBtn.click();

        WebElement drawer = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector(".cart-drawer, [data-testid='cart-drawer'], .modal-content, .drawer")));
        Assert.assertTrue(drawer.isDisplayed(), "Ngăn giỏ hàng không hiển thị sau khi click");
    }
}
