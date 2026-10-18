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

@Epic("DAFL Web Application")
@Feature("Home Page & Header Verification")
public class HomePageTest extends BaseTest {

    @Test(description = "TC_UI_01: Verify home page loads and brand header is displayed")
    @Severity(SeverityLevel.BLOCKER)
    @Description("Kiểm tra trang chủ tải thành công và hiển thị logo thương hiệu DAFL Store")
    public void testHomePageLoadsSuccessfully() {
        driver.get(baseUrl);

        WebElement brandLogo = wait
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='brand-logo']")));
        Assert.assertNotNull(brandLogo, "Logo thương hiệu không tìm thấy");
        Assert.assertTrue(brandLogo.getText().contains("DAFL"), "Tên thương hiệu không chứa DAFL");
    }

    @Test(description = "TC_UI_02: Verify search input and theme toggle are interactive")
    @Severity(SeverityLevel.NORMAL)
    @Description("Kiểm tra thanh tìm kiếm sản phẩm và nút chuyển đổi giao diện sáng/tối")
    public void testSearchInputAndThemeToggle() {
        driver.get(baseUrl);

        WebElement searchInput = wait
                .until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='search-input']")));
        Assert.assertTrue(searchInput.isDisplayed(), "Thanh tìm kiếm không hiển thị");

        searchInput.sendKeys("Áo");
        Assert.assertEquals(searchInput.getAttribute("value"), "Áo");

        WebElement themeBtn = driver.findElement(By.cssSelector("[data-testid='theme-toggle-btn']"));
        Assert.assertTrue(themeBtn.isDisplayed(), "Nút chuyển theme không hiển thị");
    }
}
