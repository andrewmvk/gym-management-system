import { useLayoutEffect, useRef } from 'react';

// A segmented control draws its chosen state as one marker that glides to the new option, instead of the old
// option going dark and the new one lighting up. The marker's place comes from the chosen option, found by
// `activeSelector`, and is published as --slide-x and --slide-w on the container.
//
// Until the first measurement the container has no `data-sliding`, so the options keep painting their own
// chosen state (server render, no script, a hidden panel); once it has, the marker takes over. The marker is
// `display: none` until then, so its first placement never animates in from the corner.
export function useSlidingIndicator<T extends HTMLElement>(activeSelector: string) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) return;

    const measure = () => {
      const active = container.querySelector<HTMLElement>(activeSelector);
      // A hidden control (display: none) measures as zero wide; leave it for the next resize.
      if (!active || active.offsetWidth === 0) {
        container.removeAttribute('data-sliding');
        return;
      }
      container.style.setProperty('--slide-x', `${active.offsetLeft}px`);
      container.style.setProperty('--slide-w', `${active.offsetWidth}px`);
      container.setAttribute('data-sliding', '');
    };

    const resizeObserver = new ResizeObserver(measure);
    const watchOptions = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(container);
      // The marker itself changes size while it glides; watching it would re-measure on every frame.
      for (const child of container.children) {
        if (child.getAttribute('aria-hidden') !== 'true') resizeObserver.observe(child);
      }
    };
    // The chosen option changes through an attribute (aria-checked, data-state), options come and go as children.
    const mutationObserver = new MutationObserver((records) => {
      if (records.some((record) => record.type === 'childList')) watchOptions();
      measure();
    });

    watchOptions();
    measure();
    mutationObserver.observe(container, {
      attributes: true,
      attributeFilter: ['aria-checked', 'data-state'],
      childList: true,
      subtree: true,
    });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [activeSelector]);

  return ref;
}
