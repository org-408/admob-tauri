// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "admob-tauri",
    platforms: [
        .iOS(.v15),
        // SwiftPM checks every platform: left out, macOS defaults to 10.13
        .macOS(.v11),
    ],
    products: [
        .library(name: "admob-tauri", type: .static, targets: ["admob-tauri"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api"),
        // The native SDKs, as @capacitor-community/admob uses them (renovate.json keeps them in step with upstream)
        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git", exact: "13.11.0"),
        .package(url: "https://github.com/googleads/swift-package-manager-google-user-messaging-platform.git", .upToNextMinor(from: "3.1.0")),
    ],
    targets: [
        .target(
            name: "admob-tauri",
            dependencies: [
                .byName(name: "Tauri"),
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
                .product(name: "GoogleUserMessagingPlatform", package: "swift-package-manager-google-user-messaging-platform"),
            ],
            path: "Sources/AdmobTauri"),
        .testTarget(
            name: "AdmobTauriTests",
            dependencies: ["admob-tauri"],
            path: "Tests/AdmobTauriTests"),
    ]
)
