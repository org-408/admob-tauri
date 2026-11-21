# Status and roadmap

`admob-tauri` is a community port of `@capacitor-community/admob` to Tauri 2 (iOS and Android). It is not an official
Tauri plugin.

## Plan: publish to crates.io and npm

The plan is to publish the crate and the npm package, both named `admob-tauri`, and to announce it to the Tauri
community. Publishing is a deliberate step taken by the maintainer, not by CI: the tags (`v0.1.x`) exist, the registries
are not published to yet.

## Before publishing

- [ ] Run the example app on an Android emulator or device (today: builds and 84 unit tests only).
- [ ] Check on real devices: the UMP consent form, the iOS ATT prompt, rewarded and app open ads, native ads.
- [ ] Decide what to do about Xcode 26 (today the iOS build needs Xcode 27 or later).
- [ ] Check the first automatic upstream-tracking PR (see [UPSTREAM.md](UPSTREAM.md)) works end to end.

## Done

- All 29 methods and the events of upstream 8.3.0; `apiParity` guards the surface.
- iOS verified on the Xcode 27 simulator (banner, interstitial, consent info, prepare calls).
- Daily upstream tracking (`track-upstream.yml`).
