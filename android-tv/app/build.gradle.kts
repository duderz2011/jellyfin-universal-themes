plugins { id("com.android.application") }
android {
    namespace = "uk.co.universalthemes.tv"
    compileSdk = 35
    defaultConfig {
        applicationId = "uk.co.universalthemes.tv"
        minSdk = 23
        targetSdk = 35 // Test build: review/update target for distribution.
        versionCode = 1
        versionName = "0.1.0"
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
