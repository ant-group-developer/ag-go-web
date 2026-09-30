/**
 * `sticky` config for tables rendered directly on a page: keeps the header visible below the
 * fixed ProLayout header (56px) while the page scrolls.
 */
export const PAGE_TABLE_STICKY = { offsetHeader: 56 } as const;

/**
 * `sticky` config for tables inside drawers, modals and other scroll containers: the header
 * sticks to the top of the nearest scrolling ancestor.
 *
 * The negative offset cancels the scroll container's top padding. `position: sticky` pins the
 * header at the container's content-box top (below its padding), so with the default AntD body
 * padding (`paddingLG` = 24px) a strip of that padding stays scrollable above the pinned header
 * and lets a data row peek through. Pulling the header up by that padding keeps it flush with the
 * top of the drawer/modal body.
 */
export const CONTAINER_TABLE_STICKY = { offsetHeader: -24 } as const;
