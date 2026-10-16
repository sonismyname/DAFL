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
@Feature("Authentication & Account Navigation")
public class AuthModalTest extends BaseTest {

    @Test(description = "TC_UI_05: Verify opening Auth Modal and fields on Login and Register tabs")
    @Severity(SeverityLevel.CRITICAL)
    @Description("Kiểm tra mở cửa sổ Đăng nhập/Đăng ký từ Header và xác thực trường Nhập lại mật khẩu")
    public void testAuthModalAndConfirmPassword() {
        driver.get(baseUrl);

        // Click Account Toggle button
        WebElement accountBtn = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='account-toggle-btn']")));
        accountBtn.click();

        // Click Login/Register button in dropdown
        WebElement openAuthBtn = wait.until(ExpectedConditions.elementToBeClickable(By.cssSelector("[data-testid='dropdown-login-btn']")));
        openAuthBtn.click();

        // Verify Auth modal is displayed
        WebElement authModal = wait.until(ExpectedConditions.visibilityOfElementLocated(By.cssSelector("[data-testid='auth-modal']")));
        Assert.assertTrue(authModal.isDisplayed(), "Cửa sổ đăng nhập/đăng ký không hiển thị");

        // Verify login fields
        WebElement loginEmail = driver.findElement(By.cssSelector("[data-testid='login-email-input']"));
        WebElement loginPassword = driver.findElement(By.cssSelector("[data-testid='login-password-input']"));
        Assert.assertTrue(loginEmail.isDisplayed(), "Trường email đăng nhập không hiển thị");
        Assert.assertTrue(loginPassword.isDisplayed(), "Trường mật khẩu đăng nhập không hiển thị");

        // Switch to Register tab
        WebElement registerTab = driver.findElement(By.cssSelector("[data-testid='auth-tab-register']"));
        registerTab.click();

        // Verify register confirm password field is present
        WebElement confirmPasswordInput = wait.until(ExpectedConditions.visibilityOfElementLocated(
                By.cssSelector("[data-testid='register-confirm-password-input']")));
        Assert.assertTrue(confirmPasswordInput.isDisplayed(), "Trường Nhập lại mật khẩu không hiển thị trên tab Đăng ký");
    }
}
