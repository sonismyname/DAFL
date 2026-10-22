/** Ảnh thay thế khi URL ảnh sản phẩm bị lỗi (404, mất mạng...) */
export const IMAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">' +
      '<rect width="600" height="600" fill="#f3f4f6"/>' +
      '<g fill="none" stroke="#9ca3af" stroke-width="14" stroke-linecap="round" stroke-linejoin="round">' +
      '<rect x="170" y="190" width="260" height="220" rx="24"/><circle cx="240" cy="260" r="22"/>' +
      '<path d="M185 385l85-85 55 55 40-40 60 60"/></g></svg>'
  );

/** Danh sách ảnh hiển thị: ưu tiên `images`, luôn có ảnh đại diện ở đầu, bỏ ảnh rỗng/trùng. */
export function resolveGalleryImages(imageUrl: string, images?: string[]): string[] {
  const list = [imageUrl, ...(images ?? [])].filter((u): u is string => Boolean(u));
  return list.filter((u, i) => list.indexOf(u) === i);
}
