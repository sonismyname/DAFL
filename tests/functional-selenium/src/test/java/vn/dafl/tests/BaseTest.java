package vn.dafl.tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

import java.time.Duration;

public abstract class BaseTest {
    protected WebDriver driver;
    protected WebDriverWait wait;
    protected String baseUrl;

    protected boolean isHeadless;

    @BeforeMethod
    public void setUp() {
        String envUrl = System.getenv("APP_URL");
        String propUrl = System.getProperty("app.url");
        if (propUrl != null && !propUrl.isEmpty()) {
            baseUrl = propUrl;
        } else if (envUrl != null && !envUrl.isEmpty()) {
            baseUrl = envUrl;
        } else {
            baseUrl = "http://localhost:3000";
        }

        String headlessProp = System.getProperty("headless");
        String headlessEnv = System.getenv("HEADLESS");
        if (headlessProp != null) {
            isHeadless = Boolean.parseBoolean(headlessProp);
        } else if (headlessEnv != null) {
            isHeadless = Boolean.parseBoolean(headlessEnv);
        } else {
            isHeadless = true;
        }

        ChromeOptions options = new ChromeOptions();
        if (isHeadless) {
            options.addArguments("--headless=new");
        }
        options.addArguments("--no-sandbox");
        options.addArguments("--disable-dev-shm-usage");
        options.addArguments("--disable-gpu");
        options.addArguments("--window-size=1920,1080");
        options.addArguments("--remote-allow-origins=*");
        options.addArguments("--ignore-certificate-errors");

        String chromeBin = System.getenv("CHROME_BIN");
        if (chromeBin != null && !chromeBin.isEmpty()) {
            options.setBinary(chromeBin);
        }

        String driverProp = System.getProperty("webdriver.chrome.driver");
        if (driverProp == null || driverProp.isEmpty()) {
            java.io.File cachedDriver = new java.io.File(System.getProperty("user.home"), ".cache/selenium/chromedriver/win64/154.0.8037.92/chromedriver.exe");
            if (cachedDriver.exists()) {
                System.setProperty("webdriver.chrome.driver", cachedDriver.getAbsolutePath());
            }
        }

        driver = new ChromeDriver(options);
        if (!isHeadless) {
            driver.manage().window().maximize();
        }

        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(5));
        driver.manage().timeouts().pageLoadTimeout(Duration.ofSeconds(20));
        wait = new WebDriverWait(driver, Duration.ofSeconds(10));
    }

    protected void sleep(long millis) {
        if (!isHeadless) {
            try {
                Thread.sleep(millis);
            } catch (InterruptedException ignored) {
            }
        }
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        if (driver != null) {
            try {
                if (!isHeadless) {
                    Thread.sleep(1500);
                }
                driver.quit();
            } catch (Exception ignored) {
            }
        }
    }
}
