import jenkins.model.*
import hudson.security.*

def instance = Jenkins.get()
def username = "admin"
def password = "adminpassword123"

// 1. Cấu hình Security Realm & tạo tài khoản admin
def realm = instance.getSecurityRealm()
if (!(realm instanceof HudsonPrivateSecurityRealm)) {
    realm = new HudsonPrivateSecurityRealm(false)
    instance.setSecurityRealm(realm)
}

def user = realm.getUser(username)
if (user == null || realm.allUsers.find { it.id == username } == null) {
    user = realm.createAccount(username, password)
    println "--> [Init] Đã tạo thành công tài khoản admin: ${username}"
} else {
    user.addProperty(hudson.security.HudsonPrivateSecurityRealm.Details.fromPlainPassword(password))
    println "--> [Init] Đã cập nhật mật khẩu cho tài khoản admin: ${username}"
}

// 2. Cấu hình quyền: Đăng nhập để sử dụng, chặn Anonymous
def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
strategy.setAllowAnonymousRead(false)
instance.setAuthorizationStrategy(strategy)

// 3. Cấu hình CSP để hỗ trợ xem báo cáo HTML
System.setProperty("hudson.model.DirectoryBrowserSupport.CSP", "default-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval';")

instance.save()
println "--> [Init] Cấu hình bảo mật và tài khoản admin hoàn tất!"
