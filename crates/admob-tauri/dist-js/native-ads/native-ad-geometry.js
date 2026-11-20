import { getUnprojectedVisibility } from '@webview-native-ui/engine';
const intersectRects = (left, right) => {
    const x = Math.max(left.x, right.x);
    const y = Math.max(left.y, right.y);
    const maxX = Math.min(left.x + left.width, right.x + right.width);
    const maxY = Math.min(left.y + left.height, right.y + right.height);
    return {
        x,
        y,
        width: Math.max(0, maxX - x),
        height: Math.max(0, maxY - y),
    };
};
const toNativeRect = (rect) => ({
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
});
const clipsDescendants = (element) => {
    const style = window.getComputedStyle(element);
    return [style.overflow, style.overflowX, style.overflowY].some((value) => ['auto', 'hidden', 'scroll', 'clip'].includes(value));
};
export function* nativeAdAncestors(element) {
    let current = element;
    while (current) {
        const root = current.getRootNode();
        current =
            current.assignedSlot ?? current.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
        if (current)
            yield current;
    }
}
export const measureNativeAdSlot = (element, scrollElement) => {
    const style = window.getComputedStyle(element);
    const domRect = element.getBoundingClientRect();
    if (!element.isConnected ||
        style.display === 'none' ||
        (style.visibility === 'hidden' && getUnprojectedVisibility(element) === 'hidden') ||
        Number.parseFloat(style.opacity || '1') === 0 ||
        domRect.width <= 0 ||
        domRect.height <= 0) {
        return undefined;
    }
    const rect = toNativeRect(domRect);
    let clipRect = scrollElement
        ? rect
        : {
            x: window.visualViewport?.offsetLeft ?? 0,
            y: window.visualViewport?.offsetTop ?? 0,
            width: window.visualViewport?.width ?? window.innerWidth,
            height: window.visualViewport?.height ?? window.innerHeight,
        };
    let foundScrollElement = !scrollElement;
    for (const ancestor of nativeAdAncestors(element)) {
        if (ancestor === scrollElement) {
            foundScrollElement = true;
            break;
        }
        if (clipsDescendants(ancestor)) {
            clipRect = intersectRects(clipRect, toNativeRect(ancestor.getBoundingClientRect()));
        }
    }
    clipRect = intersectRects(rect, clipRect);
    if (!foundScrollElement || clipRect.width <= 0 || clipRect.height <= 0)
        return undefined;
    if (scrollElement) {
        const origin = scrollElement.getBoundingClientRect();
        const translate = (value) => ({
            ...value,
            x: value.x - origin.left + scrollElement.scrollLeft,
            y: value.y - origin.top + scrollElement.scrollTop,
        });
        return { rect: translate(rect), clipRect: translate(clipRect) };
    }
    return { rect, clipRect };
};
export const measureNativeAdScrollContainer = (element) => {
    const rect = toNativeRect(element.getBoundingClientRect());
    let clipRect = intersectRects(rect, {
        x: window.visualViewport?.offsetLeft ?? 0,
        y: window.visualViewport?.offsetTop ?? 0,
        width: window.visualViewport?.width ?? window.innerWidth,
        height: window.visualViewport?.height ?? window.innerHeight,
    });
    for (const ancestor of nativeAdAncestors(element)) {
        if (clipsDescendants(ancestor)) {
            clipRect = intersectRects(clipRect, toNativeRect(ancestor.getBoundingClientRect()));
        }
    }
    return { rect, clipRect, contentWidth: element.scrollWidth, contentHeight: element.scrollHeight };
};
