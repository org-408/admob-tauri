export const NATIVE_AD_ELEMENT_NAME = 'capacitor-admob-native';
export const defineNativeAdElement = (findFeed) => {
    const runtime = globalThis;
    runtime.__capacitorAdMobNativeFeedLookup = findFeed;
    if (typeof customElements === 'undefined' || customElements.get(NATIVE_AD_ELEMENT_NAME)) {
        return;
    }
    customElements.define(NATIVE_AD_ELEMENT_NAME, class extends HTMLElement {
        attachedFeed;
        static get observedAttributes() {
            return ['feed-id', 'slot-key'];
        }
        connectedCallback() {
            this.connectToFeed();
        }
        disconnectedCallback() {
            this.disconnectFromFeed();
        }
        attributeChangedCallback() {
            if (!this.isConnected) {
                return;
            }
            this.disconnectFromFeed();
            this.connectToFeed();
        }
        connectToFeed() {
            const feedId = this.getAttribute('feed-id')?.trim();
            const slotKey = this.getAttribute('slot-key')?.trim();
            const feed = feedId ? runtime.__capacitorAdMobNativeFeedLookup?.(feedId) : undefined;
            if (!feed || !slotKey) {
                return;
            }
            try {
                feed.attach(slotKey, this);
                this.attachedFeed = feed;
            }
            catch (error) {
                this.dispatchEvent(new CustomEvent('nativeAdError', { bubbles: true, detail: error }));
            }
        }
        disconnectFromFeed() {
            this.attachedFeed?.detach(this);
            this.attachedFeed = undefined;
        }
    });
};
export const connectNativeAdElements = () => {
    document
        .querySelectorAll(NATIVE_AD_ELEMENT_NAME)
        .forEach((element) => element.connectToFeed?.());
};
